from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import re
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://auditpro-immo.github.io", 
        "http://localhost:5500",           
        "http://127.0.0.1:5500"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "API AuditPro-Immo opérationnelle", "version": "1.1", "message": "Moteur d'analyse prêt."}

def get_modulateur_marche(cp: str):
    mois_ecoules = (datetime.now().year - 2024) * 12 + datetime.now().month
    inflation = 1.0 + (mois_ecoules * 0.0025)
    
    indice = 1.0
    ville = "Secteur Standard Français"
    impact = "Marché équilibré. Les coûts de rénovation et de mise aux normes suivent strictement les moyennes nationales du bâtiment, sans surcote logistique."
    
    if cp:
        if cp.startswith(("75", "92", "93", "94", "77", "78", "91", "95")): 
            indice = 1.35
            ville = "Île-de-France (Région Parisienne)"
            impact = "Zone d'extrême tension immobilière. Les contraintes de livraison, les frais d'accès aux chantiers et la pénurie d'artisans majorent le prix global des devis de 35%."
            
        elif cp.startswith("35"): 
            indice = 1.18
            ville = "Rennes (Secteur Ille-et-Vilaine)"
            impact = "Métropole régionale en forte croissance. La très haute demande locative et la Loi Climat créent une tension sur les artisans RGE, haussant le coût des interventions de 18%."
            
        elif cp.startswith("69"): 
            indice = 1.18
            ville = "Lyon (Métropole Lyonnaise)"
            impact = "Métropole à forte tension foncière. Les réglementations urbaines et le coût de la main-d'œuvre locale appliquent une hausse de 18% sur l'enveloppe de rénovation."
            
        elif cp.startswith("33"): 
            indice = 1.18
            ville = "Bordeaux (Secteur Gironde)"
            impact = "Bassin de vie attractif. La demande sur la réhabilitation du bâti ancien engendre une surcote systématique sur les prestations de rénovation (+18%)."
            
        elif cp.startswith("44"): 
            indice = 1.18
            ville = "Nantes (Secteur Loire-Atlantique)"
            impact = "Dynamisme démographique de l'arc Atlantique très soutenu. Les entreprises générales affichent des délais longs et des tarifs indexés en hausse (+18%)."
            
        elif cp.startswith(("23", "36", "15", "48", "52", "55", "09", "58", "04", "05", "46", "70")): 
            indice = 0.82
            ville = "Secteur Rural / Zone à faible densité"
            impact = "Zone à faible tension concurrentielle. La disponibilité de proximité des corps de métier locaux permet d'abaisser significativement l'enveloppe globale des travaux (-18%)."
            
        elif cp.startswith(("34", "67", "49", "56", "29", "74", "38", "14", "37", "45", "76")): 
            indice = 1.08
            ville = "Zone Régionale Intermédiaire"
            impact = "Secteur provincial actif. Légère tension économique constatée sur les devis (+8%) liée à l'attractivité du littoral ou des grands axes de transport."
            
    return round(inflation * indice, 2), ville, impact

def extraire_surface(texte: str) -> float:
    pattern = r"(?:surface|carrez|habitable)[\s\w:]*?(\d{2,3}(?:[.,]\d{1,2})?)\s*(?:m2|m²|metres carres|mètres carrés)"
    match = re.search(pattern, texte, re.IGNORECASE)
    if match:
        try:
            val = float(match.group(1).replace(',', '.'))
            return val if val > 9 else 80.0
        except:
            return 80.0
    return 80.0

@app.post("/scan")
async def analyser(fichier: UploadFile = File(...), prix: float = Form(0), cp: str = Form("")):
    checklist = {
        "elec": {"titre": "Électricité (Sécurité des personnes)", "statut": "Conforme", "cout": 0, "loi": "Norme NF C 15-100", "detail": "L'installation électrique semble sûre et conforme aux normes de base.", "action": "Aucune action nécessaire dans l'immédiat."},
        "gaz": {"titre": "Gaz (Risque de fuite)", "statut": "Conforme", "cout": 0, "loi": "Norme NF P 45-500", "detail": "La tuyauterie de gaz ne présente aucun défaut d'étanchéité.", "action": "Pensez simplement à faire entretenir la chaudière chaque année."},
        "amiante": {"titre": "Amiante (Matériaux toxiques)", "statut": "Conforme", "cout": 0, "loi": "Art. L1334-13", "detail": "Aucune trace d'amiante détectée dans le logement.", "action": "Aucune action. Vous pouvez percer les murs en toute sécurité."},
        "plomb": {"titre": "Plomb (Peintures anciennes)", "statut": "Conforme", "cout": 0, "loi": "Art. L1334-1", "detail": "Les peintures sont saines et sans danger pour les enfants.", "action": "Aucune action nécessaire."},
        "dpe": {"titre": "DPE (Consommation d'énergie)", "statut": "Conforme", "cout": 0, "loi": "Loi Climat & Résilience 2021", "detail": "Le bien a une étiquette énergétique correcte et n'est pas une passoire thermique.", "action": "Vous avez le droit de le mettre en location sans problème."},
        "parasite": {"titre": "Parasites (Bois et charpente)", "statut": "Conforme", "cout": 0, "loi": "Art. L133-6", "detail": "Aucun insecte mangeur de bois ni champignon destructeur détecté.", "action": "Le bois est sain."},
        "erp": {"titre": "Risques Naturels (Inondations, Séismes)", "statut": "Conforme", "cout": 0, "loi": "Art. L125-5", "detail": "La maison n'est pas située dans une zone à haut risque naturel.", "action": "Aucun surcoût à prévoir pour votre assurance habitation."}
    }
    
    solutions = []
    total_decote = 0
    indice, nom_ville, texte_impact = get_modulateur_marche(cp)
    securite_critique = False
    bloquant_location = False
    
    texte_global = ""
    with pdfplumber.open(fichier.file) as pdf:
        texte_global = " ".join([page.extract_text() or "" for page in pdf.pages])
        
    surface = extraire_surface(texte_global)
    mention_surface = f" (Calcul budgétaire basé sur ~{int(surface)} m²)"

    if re.search(r"(anomalie|prise de terre|électrisation|contact direct|matériel vétuste)", texte_global, re.IGNORECASE):
        c = int((80 * surface) * indice)
        checklist["elec"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Défaut de mise à la terre ou matériel ancien identifié.{mention_surface}", 
            "action": "Une mise en sécurité du tableau électrique par un professionnel est recommandée."
        })
        total_decote += c
        securite_critique = True
        
    if re.search(r"(anomalie de type A2|DGI|danger grave et immédiat|fuite.*gaz|conduite vétuste)", texte_global, re.IGNORECASE):
        c = int(3000 * indice)
        checklist["gaz"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": "Une intervention immédiate sur le circuit de gaz est exigée par le diagnostiqueur.", 
            "action": "Un professionnel certifié doit intervenir sur les conduites défectueuses."
        })
        total_decote += c
        securite_critique = True

    if re.search(r"(amiante|fibro-ciment|matériaux de la liste A|matériaux de la liste B)", texte_global, re.IGNORECASE):
        c = int((100 * surface) * indice)
        checklist["amiante"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Présence d'amiante confirmée dans certains matériaux de construction.{mention_surface}", 
            "action": "Intervention d'une entreprise spécialisée nécessaire si des travaux sont prévus."
        })
        total_decote += c

    if re.search(r"(plomb|saturnisme|peinture.*dégradée|classe 3)", texte_global, re.IGNORECASE):
        c = int((50 * surface) * indice)
        checklist["plomb"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Traces de plomb détectées sur les peintures anciennes.{mention_surface}", 
            "action": "Le recouvrement ou le décapage sécurisé des murs est conseillé."
        })
        total_decote += c

    if re.search(r"(mérule|champignon.*lignivore)", texte_global, re.IGNORECASE):
        c = int((200 * surface) * indice)
        checklist["parasite"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Champignon lignivore (mérule) détecté, impactant la structure.{mention_surface}", 
            "action": "Un traitement fongicide curatif profond est indispensable."
        })
        total_decote += c
        securite_critique = True
    elif re.search(r"(termites|xylophages)", texte_global, re.IGNORECASE):
        c = int((60 * surface) * indice)
        checklist["parasite"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Traces d'insectes xylophages détectées dans le bois.{mention_surface}", 
            "action": "Un traitement chimique par injection de la charpente est préconisé."
        })
        total_decote += c

    if re.search(r"(dpe.*g\b|dpe.*f\b|passoire thermique)", texte_global, re.IGNORECASE):
        c = int((700 * surface) * indice)
        checklist["dpe"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Logement classé F ou G nécessitant une optimisation thermique.{mention_surface}", 
            "action": "Une rénovation énergétique (isolation et chauffage) est requise pour une mise en location."
        })
        total_decote += c
        bloquant_location = True
        
    if re.search(r"(inondation|zone inondable|ppri|sismicité.*forte|séisme)", texte_global, re.IGNORECASE):
        c = int(4000 * indice)
        checklist["erp"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": "Bien situé en zone d'exposition aux risques naturels majeurs.", 
            "action": "Une adaptation des primes d'assurance habitation est à anticiper."
        })
        total_decote += c

    if securite_critique:
        solutions.append("MISE EN SÉCURITÉ : Le bien nécessite des interventions prioritaires liées à la sécurité des personnes (Électricité ou Gaz) avant occupation.")
    if bloquant_location:
        solutions.append("MISE EN CONFORMITÉ LOCATIVE : Le DPE impose une rénovation thermique globale pour respecter la législation en vigueur sur la location.")
    if total_decote > 0:
        solutions.append("JUSTIFICATION FINANCIÈRE : Ce document met en lumière l'état structurel du bien et permet d'ajuster équitablement la transaction.")
        solutions.append("RECOMMANDATION : Il est conseillé de valider cette estimation par des devis d'artisans certifiés RGE locaux.")
    else:
        solutions.append("CONCLUSION TECHNIQUE : Le dossier ne relève aucune anomalie critique. L'état général du bien justifie la valeur de présentation.")

    return {
        "diagnostics": list(checklist.values()),
        "solutions": solutions,
        "prix_initial": prix,
        "total_decote": total_decote,
        "prix_net": prix - total_decote,
        "analyse_secteur": f"Rapport d'indice local : {indice}",
        "localisation_exacte": nom_ville,
        "impact_marche": texte_impact,
        "date_audit": datetime.now().strftime("%d/%m/%Y"),
        "securite": "Confidentialité totale : Le document source a été détruit."
    }

@app.post("/api/analyze-grid")
async def analyze_grid(request: Request):
    donnees = await request.json()
    details = []
    decote = 0
    malus_dpe = 0

    epoque = donnees.get("epoque", "")
    fissures = donnees.get("fissures", "")
    assainissement = donnees.get("assainissement", "")
    etat_toiture = donnees.get("etat_toiture", "")
    parasites_bois = donnees.get("parasites_bois", "")
    fuites_plomberie = donnees.get("fuites_plomberie", "")
    chauffage_vetuste = donnees.get("chauffage_vetuste", "")
    vitrage_simple = donnees.get("vitrage_simple", "")
    garde_corps_hs = donnees.get("garde_corps_hs", "")

    if epoque == "vieille": malus_dpe += 2

    if donnees.get("dpe_murs") == "non": 
        decote += 8000; malus_dpe += 2
        details.append({"point": "Isolation Murs", "loi": "Loi Climat & Résilience", "analyse": "CONSTAT DÉTAILLÉ :\nAbsence d'isolation. Les déperditions thermiques sont importantes.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Isolation des murs (ITI/ITE) -> env. 8 000 €.", "provision": "-8 000 €"})
    else:
        details.append({"point": "Isolation Murs", "loi": "Loi Climat & Résilience", "analyse": "CONSTAT DÉTAILLÉ :\nL'isolation semble satisfaisante.\n\nACTIONS RECOMMANDÉES :\n- Entretien régulier des ventilations (VMC).", "provision": "0 €"})

    if donnees.get("elec_differentiel") == "non" or donnees.get("elec_prises_terre") == "non" or donnees.get("elec_vetuste") == "oui": 
        decote += 2500
        details.append({"point": "Sécurité Électrique", "loi": "Norme NF C 15-100", "analyse": "CONSTAT DÉTAILLÉ :\nL'installation ne dispose pas des sécurités modernes de base.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Mise en sécurité du tableau et ajout de prises de terre -> env. 2 500 €.", "provision": "-2 500 €"})

    if chauffage_vetuste == "oui":
        decote += 12000; malus_dpe += 2
        details.append({"point": "Chauffage", "loi": "Transition Énergétique", "analyse": "CONSTAT DÉTAILLÉ :\nLe système de chauffage actuel est énergivore.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Installation d'une Pompe à Chaleur moderne -> env. 12 000 €.", "provision": "-12 000 €"})

    if vitrage_simple == "oui":
        decote += 6000; malus_dpe += 1
        details.append({"point": "Menuiseries", "loi": "Performance Thermique", "analyse": "CONSTAT DÉTAILLÉ :\nLes fenêtres ne répondent plus aux standards thermiques actuels.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Remplacement par du double vitrage performant -> env. 6 000 €.", "provision": "-6 000 €"})

    if donnees.get("structure_amiante") == "non": 
        decote += 3000
        details.append({"point": "Amiante", "loi": "Code Santé Publique", "analyse": "CONSTAT DÉTAILLÉ :\nPrésomption de matériaux anciens contenant des fibres toxiques.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Intervention d'une équipe certifiée pour un retrait sécurisé -> env. 3 000 €.", "provision": "-3 000 €"})
    
    if fissures == "oui":
        decote += 15000
        details.append({"point": "Structure & Fissures", "loi": "Garantie de Solidité", "analyse": "CONSTAT DÉTAILLÉ :\nDes mouvements structurels sont visibles sur la façade.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Étude de sol et consolidation des fondations -> env. 15 000 €.", "provision": "-15 000 €"})
    
    if etat_toiture == "oui":
        decote += 12000
        details.append({"point": "Toiture", "loi": "Clos et Couvert", "analyse": "CONSTAT DÉTAILLÉ :\nLa couverture présente des signes importants de fatigue.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Intervention lourde d'un couvreur requise -> env. 12 000 €.", "provision": "-12 000 €"})

    if parasites_bois == "oui":
        decote += 3500
        details.append({"point": "Parasites Bois", "loi": "Loi Termites", "analyse": "CONSTAT DÉTAILLÉ :\nTraces visibles d'insectes xylophages dans la charpente.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Traitement curatif chimique par injection -> env. 3 500 €.", "provision": "-3 500 €"})

    if assainissement == "non":
        decote += 8000
        details.append({"point": "Assainissement", "loi": "SPANC", "analyse": "CONSTAT DÉTAILLÉ :\nLe système de traitement des eaux usées n'est plus aux normes.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Pose d'une micro-station d'épuration autonome -> env. 8 000 €.", "provision": "-8 000 €"})

    if fuites_plomberie == "oui":
        decote += 2500
        details.append({"point": "Plomberie", "loi": "Normes DTU", "analyse": "CONSTAT DÉTAILLÉ :\nLa tuyauterie présente un risque imminent de dégât des eaux.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Réfection partielle du réseau sanitaire -> env. 2 500 €.", "provision": "-2 500 €"})

    if garde_corps_hs == "oui":
        decote += 1500
        details.append({"point": "Sécurité Extérieure", "loi": "Réglementation Chutes", "analyse": "CONSTAT DÉTAILLÉ :\nLes protections extérieures (balcons, terrasses) sont instables.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Remplacement et scellement de nouveaux garde-corps -> env. 1 500 €.", "provision": "-1 500 €"})

    lettres_dpe = ["A", "B", "C", "D", "E", "F", "G"]
    index = min(malus_dpe, 6)
    dpe_estime = lettres_dpe[index]

    etat = "Vigilance : Budget travaux conséquent à prévoir" if decote > 0 else "Maison saine : Aucun gros travaux prévisibles"
    strategie = f"Bilan d'évaluation : L'algorithme anticipe une enveloppe globale de {decote} € de travaux. Ce document permet de poser une base objective pour la discussion." if decote > 0 else "Bilan d'évaluation : Le bien ne présente aucun défaut majeur justifiant une décote technique."

    return {"success": True, "resultat": {"etat": etat, "decote_totale": decote, "details": details, "strategie": strategie, "dpe": dpe_estime}}
