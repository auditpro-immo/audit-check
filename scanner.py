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
    return {"status": "API AuditPro-Immo opérationnelle", "version": "1.1", "message": "Moteur d'IA prêt."}

def get_modulateur_marche(cp: str):
    mois_ecoules = (datetime.now().year - 2024) * 12 + datetime.now().month
    inflation = 1.0 + (mois_ecoules * 0.0025)
    
    indice = 1.0
    ville = "Secteur Standard Français"
    impact = "Marché équilibré. Les coûts de rénovation et de mise aux normes suivent strictement les moyennes nationales du bâtiment, sans surcote logistique particulière."
    
    if cp:
        if cp.startswith(("75", "92", "93", "94", "77", "78", "91", "95")): 
            indice = 1.35
            ville = "Île-de-France (Région Parisienne)"
            impact = "Zone d'extrême tension immobilière. Les contraintes lourdes de livraison des matériaux, les frais d'accès/stationnement des chantiers et la pénurie d'artisans majorent réglementairement le prix global des devis de 35%."
            
        elif cp.startswith("35"): 
            indice = 1.18
            ville = "Rennes (Secteur Ille-et-Vilaine)"
            impact = "Métropole régionale en forte croissance économique. La très haute demande locative et le durcissement du calendrier de la Loi Climat créent un goulot d'étranglement sur le carnet de commandes des artisans qualifiés RGE, haussant le coût des interventions de 18%."
            
        elif cp.startswith("69"): 
            indice = 1.18
            ville = "Lyon (Métropole Lyonnaise)"
            impact = "Grande métropole à forte tension foncière. Les réglementations environnementales urbaines et le coût élevé de la main-d'œuvre locale appliquent une hausse de 18% sur l'enveloppe de rénovation thermique."
            
        elif cp.startswith("33"): 
            indice = 1.18
            ville = "Bordeaux (Secteur Gironde)"
            impact = "Bassin de vie très attractif. La forte demande sur la réhabilitation du bâti ancien en pierre de taille engendre une surcote systématique sur les prestations de rénovation (+18%)."
            
        elif cp.startswith("44"): 
            indice = 1.18
            ville = "Nantes (Secteur Loire-Atlantique)"
            impact = "Dynamisme démographique de l'arc Atlantique très soutenu. Les entreprises générales du bâtiment affichent des délais longs et des tarifs indexés en hausse (+18%)."
            
        elif cp.startswith(("23", "36", "15", "48", "52", "55", "09", "58", "04", "05", "46", "70")): 
            indice = 0.82
            ville = "Secteur Rural / Zone à faible densité"
            impact = "Zone à faible tension concurrentielle. La disponibilité de proximité des corps de métier locaux et l'absence de contraintes de transport permettent d'abaisser significativement l'enveloppe globale des travaux (-18%)."
            
        elif cp.startswith(("34", "67", "49", "56", "29", "74", "38", "14", "37", "45", "76")): 
            indice = 1.08
            ville = "Zone Régionale Intermédiaire"
            impact = "Secteur provincial actif. Légère tension économique constatée sur les devis (+8%) liée à l'attractivité du littoral ou à la proximité des grands axes de transport."
            
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
            "detail": f"Défaut de mise à la terre ou matériel ancien. En clair : l'installation ne sautera pas en cas de problème, ce qui crée un grand risque d'électrocution.{mention_surface}", 
            "action": "Il faut faire venir un électricien pour remplacer le tableau électrique et ajouter les sécurités obligatoires."
        })
        total_decote += c
        securite_critique = True
        
    if re.search(r"(anomalie de type A2|DGI|danger grave et immédiat|fuite.*gaz|conduite vétuste)", texte_global, re.IGNORECASE):
        c = int(3000 * indice)
        checklist["gaz"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": "Danger Grave et Immédiat (DGI). En clair : il y a un risque imminent de fuite ou d'explosion.", 
            "action": "Coupure de l'alimentation obligatoire. Un professionnel doit changer d'urgence les conduites défectueuses."
        })
        total_decote += c
        securite_critique = True

    if re.search(r"(amiante|fibro-ciment|matériaux de la liste A|matériaux de la liste B)", texte_global, re.IGNORECASE):
        c = int((100 * surface) * indice)
        checklist["amiante"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Présence d'amiante dans le toit, les conduits ou le sol. En clair : l'amiante est cancérigène si on perce ces matériaux lors de travaux.{mention_surface}", 
            "action": "Une entreprise spécialisée devra retirer l'amiante en toute sécurité avant d'engager d'autres travaux."
        })
        total_decote += c

    if re.search(r"(plomb|saturnisme|peinture.*dégradée|classe 3)", texte_global, re.IGNORECASE):
        c = int((50 * surface) * indice)
        checklist["plomb"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Peintures au plomb qui s'écaillent. En clair : les poussières de plomb sont très toxiques (saturnisme) si des jeunes enfants les avalent.{mention_surface}", 
            "action": "Il faudra décaper ces murs ou les recouvrir totalement avec une nouvelle toile ou du placo."
        })
        total_decote += c

    if re.search(r"(mérule|champignon.*lignivore)", texte_global, re.IGNORECASE):
        c = int((200 * surface) * indice)
        checklist["parasite"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Présence de Mérule. En clair : c'est un champignon redoutable qui ronge et détruit les poutres de la maison à grande vitesse.{mention_surface}", 
            "action": "Traitement chimique lourd très coûteux indispensable. Attention à la structure du toit."
        })
        total_decote += c
        securite_critique = True
    elif re.search(r"(termites|xylophages)", texte_global, re.IGNORECASE):
        c = int((60 * surface) * indice)
        checklist["parasite"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Présence de Termites. En clair : ces insectes dévorent le bois et fragilisent la charpente ou les planchers.{mention_surface}", 
            "action": "Il faut injecter un produit chimique dans le bois pour tuer la colonie."
        })
        total_decote += c

    if re.search(r"(dpe.*g\b|dpe.*f\b|passoire thermique)", texte_global, re.IGNORECASE):
        c = int((700 * surface) * indice)
        checklist["dpe"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Logement classé F ou G (Passoire thermique). En clair : vos factures de chauffage seront très élevées car la chaleur s'échappe.{mention_surface}", 
            "action": "Rénovation globale indispensable (isolation des murs/toit + nouvelle chaudière) pour avoir le droit de louer ce bien."
        })
        total_decote += c
        bloquant_location = True
        
    if re.search(r"(inondation|zone inondable|ppri|sismicité.*forte|séisme)", texte_global, re.IGNORECASE):
        c = int(4000 * indice)
        checklist["erp"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": "Bien situé en zone rouge (inondation ou séisme). En clair : il y a un fort risque naturel autour de la maison.", 
            "action": "Votre assureur risque de vous demander une prime d'assurance plus chère chaque année."
        })
        total_decote += c

    if securite_critique:
        solutions.append("ALERTE SÉCURITÉ : La maison présente des dangers immédiats (électricité, gaz ou mérule). Vous devrez faire des travaux avant même d'y habiter.")
    if bloquant_location:
        solutions.append("MISE EN LOCATION IMPOSSIBLE : Le bien est classé F ou G. La loi interdit de le louer en l'état. Vous devrez faire une rénovation thermique massive.")
    if total_decote > 0:
        solutions.append(f"STRATÉGIE DE NÉGOCIATION : Montrez ce document au vendeur. Le total des travaux à prévoir est un excellent argument pour demander une baisse de prix.")
        solutions.append("CONSEIL EXPERT : Ne signez pas chez le notaire sans avoir fait faire de vrais devis par des artisans pour confirmer ces montants.")
    else:
        solutions.append("RÉSULTAT : Le diagnostic est excellent. La maison est saine. Cela justifie pleinement le prix demandé par le vendeur.")

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
        "securite": "Vos données sont privées : Le PDF a été supprimé de nos serveurs."
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
        details.append({"point": "Isolation Murs", "loi": "Loi Climat & Résilience", "analyse": "CONSTAT DÉTAILLÉ :\nAbsence d'isolation. En clair, les murs laissent totalement s'échapper la chaleur.\n\nRISQUES IDENTIFIÉS :\nFactures d'énergie colossales et sensation de froid en hiver.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Isoler les murs (par l'intérieur ou l'extérieur) -> env. 8 000 €.", "provision": "-8 000 €"})
    else:
        details.append({"point": "Isolation Murs", "loi": "Loi Climat & Résilience", "analyse": "CONSTAT DÉTAILLÉ :\nL'isolation semble bonne.\n\nACTIONS RECOMMANDÉES :\n- Nettoyez simplement les bouches d'aération pour éviter l'humidité.", "provision": "0 €"})

    if donnees.get("elec_differentiel") == "non" or donnees.get("elec_prises_terre") == "non" or donnees.get("elec_vetuste") == "oui": 
        decote += 2500
        details.append({"point": "Sécurité Électrique", "loi": "Norme NF C 15-100", "analyse": "CONSTAT DÉTAILLÉ :\nL'électricité est vieille. En clair, il n'y a pas les sécurités modernes de base.\n\nRISQUES IDENTIFIÉS :\nFort danger d'électrocution si un appareil ménager a un défaut.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Faire changer le tableau et ajouter des prises de terre -> env. 2 500 €.", "provision": "-2 500 €"})

    if heating_vetuste == "oui" or chauffage_vetuste == "oui":
        decote += 12000; malus_dpe += 2
        details.append({"point": "Chauffage", "loi": "Transition Énergétique", "analyse": "CONSTAT DÉTAILLÉ :\nLa chaudière ou les radiateurs sont d'une ancienne génération.\n\nRISQUES IDENTIFIÉS :\nRisque de panne en plein hiver et consommation de gaz/fioul très chère.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Acheter et faire poser une Pompe à Chaleur moderne -> env. 12 000 €.", "provision": "-12 000 €"})

    if vitrage_simple == "oui":
        decote += 6000; malus_dpe += 1
        details.append({"point": "Menuiseries", "loi": "Performance Thermique", "analyse": "CONSTAT DÉTAILLÉ :\nLes fenêtres sont encore en simple vitrage ou très abîmées.\n\nRISQUES IDENTIFIÉS :\nLe bruit de la rue rentre facilement et vous perdez beaucoup de chaleur.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Faire installer de nouvelles fenêtres double vitrage -> env. 6 000 €.", "provision": "-6 000 €"})

    if donnees.get("structure_amiante") == "non": 
        decote += 3000
        details.append({"point": "Amiante", "loi": "Code Santé Publique", "analyse": "CONSTAT DÉTAILLÉ :\nVous avez repéré des matériaux anciens (faux plafond, dalles) pouvant contenir de l'amiante.\n\nRISQUES IDENTIFIÉS :\nL'amiante est cancérigène. Il ne faut surtout pas y toucher soi-même.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Faire venir une équipe spécialisée pour retirer ces éléments -> env. 3 000 €.", "provision": "-3 000 €"})
    
    if fissures == "oui":
        decote += 15000
        details.append({"point": "Structure & Fissures", "loi": "Garantie de Solidité", "analyse": "CONSTAT DÉTAILLÉ :\nDe grandes fissures traversent les murs de la façade.\n\nRISQUES IDENTIFIÉS :\nLa maison est en train de bouger. C'est le défaut le plus grave en immobilier.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Faire venir un ingénieur béton pour consolider les fondations de la maison -> env. 15 000 €.", "provision": "-15 000 €"})
    
    if etat_toiture == "oui":
        decote += 12000
        details.append({"point": "Toiture", "loi": "Clos et Couvert", "analyse": "CONSTAT DÉTAILLÉ :\nLe toit fait des vagues ou il manque beaucoup de tuiles.\n\nRISQUES IDENTIFIÉS :\nL'eau de pluie va s'infiltrer et pourrir le bois de la charpente.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Un couvreur devra refaire une grande partie de la toiture -> env. 12 000 €.", "provision": "-12 000 €"})

    if parasites_bois == "oui":
        decote += 3500
        details.append({"point": "Parasites Bois", "loi": "Loi Termites", "analyse": "CONSTAT DÉTAILLÉ :\nVous avez vu des petits trous dans les poutres avec de la sciure de bois au sol.\n\nRISQUES IDENTIFIÉS :\nDes insectes mangent la charpente qui risque de s'effondrer à terme.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Traitement chimique puissant injecté au cœur du bois -> env. 3 500 €.", "provision": "-3 500 €"})

    if assainissement == "non":
        decote += 8000
        details.append({"point": "Assainissement", "loi": "SPANC", "analyse": "CONSTAT DÉTAILLÉ :\nLa maison n'est pas reliée aux égouts de la ville ou la fosse septique est vieille.\n\nRISQUES IDENTIFIÉS :\nLa mairie vous obligera légalement à faire les travaux dans l'année qui suit votre achat.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Installer une micro-station d'épuration neuve dans le jardin -> env. 8 000 €.", "provision": "-8 000 €"})

    if fuites_plomberie == "oui":
        decote += 2500
        details.append({"point": "Plomberie", "loi": "Normes DTU", "analyse": "CONSTAT DÉTAILLÉ :\nDes taches d'eau ou de la rouille sont visibles sous les éviers.\n\nRISQUES IDENTIFIÉS :\nRisque très important de dégât des eaux qui ruinera vos sols.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Refaire la tuyauterie de la salle de bain ou cuisine -> env. 2 500 €.", "provision": "-2 500 €"})

    if garde_corps_hs == "oui":
        decote += 1500
        details.append({"point": "Sécurité Extérieure", "loi": "Réglementation Chutes", "analyse": "CONSTAT DÉTAILLÉ :\nLes rambardes des balcons ou de l'escalier bougent ou sont rouillés.\n\nRISQUES IDENTIFIÉS :\nUn enfant ou un invité pourrait tomber.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Un serrurier devra poser de nouvelles rambardes solides -> env. 1 500 €.", "provision": "-1 500 €"})

    lettres_dpe = ["A", "B", "C", "D", "E", "F", "G"]
    index = min(malus_dpe, 6)
    dpe_estime = lettres_dpe[index]

    etat = "Vigilance : Gros budget travaux requis" if decote > 0 else "Maison saine : Aucun gros travaux"
    strategie = f"Bilan financier : L'application estime un total de {decote} € de travaux à prévoir. Vous pouvez utiliser ce document pour justifier une baisse du prix d'achat." if decote > 0 else "Bilan financier : La maison est en excellent état. Le vendeur n'acceptera pas facilement de baisser son prix."

    return {"success": True, "resultat": {"etat": etat, "decote_totale": decote, "details": details, "strategie": strategie, "dpe": dpe_estime}}
