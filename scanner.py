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
    return {"status": "API AuditPro opérationnelle", "version": "1.7", "message": "Moteur d'analyse prédictive avec IA DPE prêt."}

def get_modulateur_marche(cp: str):
    mois_ecoules = (datetime.now().year - 2024) * 12 + datetime.now().month
    inflation = 1.0 + (mois_ecoules * 0.0025)
    
    indice = 1.0
    ville = "Secteur Standard Français"
    impact = "Marché équilibré. Les estimations de rénovation suivent les moyennes nationales du bâtiment."
    
    if cp:
        if cp.startswith(("75", "92", "93", "94", "77", "78", "91", "95")): 
            indice = 1.35
            ville = "Île-de-France (Région Parisienne)"
            impact = "Zone d'extrême tension immobilière. Les contraintes logistiques et la main-d'œuvre majorent les estimations de 35%."
            
        elif cp.startswith("35"): 
            indice = 1.18
            ville = "Rennes (Secteur Ille-et-Vilaine)"
            impact = "Métropole régionale en forte croissance. La tension sur les artisans RGE justifie une hausse estimée des coûts de 18%."
            
        elif cp.startswith("69"): 
            indice = 1.18
            ville = "Lyon (Métropole Lyonnaise)"
            impact = "Métropole à forte tension foncière. Les réglementations urbaines appliquent une hausse de 18% sur l'enveloppe estimative."
            
        elif cp.startswith("33"): 
            indice = 1.18
            ville = "Bordeaux (Secteur Gironde)"
            impact = "Bassin de vie attractif. La demande sur la réhabilitation engendre une surcote d'environ 18% sur les prestations."
            
        elif cp.startswith("44"): 
            indice = 1.18
            ville = "Nantes (Secteur Loire-Atlantique)"
            impact = "Dynamisme démographique de l'arc Atlantique. Les entreprises affichent des tarifs indexés en hausse (+18%)."
            
        elif cp.startswith(("23", "36", "15", "48", "52", "55", "09", "58", "04", "05", "46", "70")): 
            indice = 0.82
            ville = "Secteur Rural / Zone à faible densité"
            impact = "Zone à faible tension concurrentielle. La disponibilité locale permet de modérer l'enveloppe globale des travaux (-18%)."
            
        elif cp.startswith(("34", "67", "49", "56", "29", "74", "38", "14", "37", "45", "76")): 
            indice = 1.08
            ville = "Zone Régionale Intermédiaire"
            impact = "Secteur provincial actif. Légère tension économique constatée (+8%) liée à l'attractivité locale."
            
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
        "elec": {"titre": "Électricité (Sécurité des personnes)", "statut": "Conforme", "cout": 0, "loi": "Norme NF C 15-100", "detail": "L'installation électrique ne présente aucune anomalie signalée.", "action": "Préconisation : Aucune intervention requise."},
        "gaz": {"titre": "Gaz (Risque de fuite)", "statut": "Conforme", "cout": 0, "loi": "Norme NF P 45-500", "detail": "L'installation de gaz est jugée conforme par le diagnostiqueur.", "action": "Préconisation : Entretien annuel classique."},
        "amiante": {"titre": "Amiante (Matériaux toxiques)", "statut": "Conforme", "cout": 0, "loi": "Art. L1334-13", "detail": "Aucun matériau contenant de l'amiante n'a été repéré.", "action": "Préconisation : Aucune action spécifique."},
        "plomb": {"titre": "Plomb (Peintures anciennes)", "statut": "Conforme", "cout": 0, "loi": "Art. L1334-1", "detail": "Absence de revêtements contenant du plomb au-delà des seuils.", "action": "Préconisation : Aucune action spécifique."},
        "dpe": {"titre": "DPE (Consommation d'énergie)", "statut": "Information", "cout": 0, "loi": "Loi Climat & Résilience", "detail": "Le classement actuel n'implique pas de blocage locatif immédiat.", "action": "Préconisation : Améliorations possibles mais non obligatoires."},
        "parasite": {"titre": "Parasites (Bois et charpente)", "statut": "Conforme", "cout": 0, "loi": "Art. L133-6", "detail": "Aucune trace d'infestation active repérée.", "action": "Préconisation : La structure semble saine."},
        "erp": {"titre": "Risques Naturels (Inondations, Séismes)", "statut": "Conforme", "cout": 0, "loi": "Art. L125-5", "detail": "Le bien est hors zone de risques majeurs déclarés.", "action": "Préconisation : Conditions standard d'assurance."}
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
    mention_surface = f" (Base de calcul estimative : ~{int(surface)} m²)"

    dpe_letter = "?"
    ges_letter = "?"
    
    match_dpe = re.search(r"(?:dpe|classe(?:ment)?(?:\s+énergétique)?)\s*:\s*([A-G])\b", texte_global, re.IGNORECASE)
    if not match_dpe:
        match_dpe = re.search(r"class[ée]\s+([A-G])\b", texte_global, re.IGNORECASE)
    match_ges = re.search(r"(?:ges|effet de serre).*?class[ée]?\s+([A-G])\b", texte_global, re.IGNORECASE)
    
    if match_dpe: 
        dpe_letter = match_dpe.group(1).upper()
    elif re.search(r"(passoire thermique|classe énergétique F|classe énergétique G)", texte_global, re.IGNORECASE):
        dpe_letter = "F"
        
    if match_ges:
        ges_letter = match_ges.group(1).upper()
        
    if re.search(r"(B\.3\.3\.6|B\.4\.3|B\.5\.2|défaut de mise à la terre|électrisation|contact direct|matériel vétuste|anomalie électrique)", texte_global, re.IGNORECASE):
        c = int((80 * surface) * indice)
        checklist["elec"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Anomalies électriques relevées dans le document.{mention_surface}", 
            "action": "À prévoir : Faire chiffrer la mise en sécurité par un électricien."
        })
        total_decote += c
        securite_critique = True
        
    if re.search(r"(31c|32c|DGI|danger grave et immédiat|fuite.*gaz|conduite vétuste|anomalie gaz)", texte_global, re.IGNORECASE):
        c = int(3000 * indice)
        checklist["gaz"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": "Anomalie majeure signalée (type 31c/32c ou DGI) sur le circuit de gaz.", 
            "action": "À prévoir : L'installation nécessite une révision avant utilisation."
        })
        total_decote += c
        securite_critique = True

    if re.search(r"(amiante|fibro-ciment|matériaux de la liste A|matériaux de la liste B|score 3)", texte_global, re.IGNORECASE):
        c = int((100 * surface) * indice)
        checklist["amiante"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Présence de matériaux amiantés mentionnée.{mention_surface}", 
            "action": "À prévoir : Consultation d'une entreprise de désamiantage si travaux."
        })
        total_decote += c

    if re.search(r"(plomb|saturnisme|peinture.*dégradée|classe 3|concentration.*supérieure)", texte_global, re.IGNORECASE):
        c = int((50 * surface) * indice)
        checklist["plomb"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Concentration en plomb au-dessus des seuils sur certains éléments.{mention_surface}", 
            "action": "À prévoir : Budget potentiel pour recouvrement/décapage."
        })
        total_decote += c

    if re.search(r"(mérule|champignon.*lignivore|coniophora)", texte_global, re.IGNORECASE):
        c = int((200 * surface) * indice)
        checklist["parasite"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Présence signalée de champignons lignivores.{mention_surface}", 
            "action": "À prévoir : Traitement curatif lourd conseillé."
        })
        total_decote += c
        securite_critique = True
    elif re.search(r"(termites|xylophages|vrillettes|capricornes)", texte_global, re.IGNORECASE):
        c = int((60 * surface) * indice)
        checklist["parasite"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Indices d'infestation d'insectes xylophages détectés.{mention_surface}", 
            "action": "À prévoir : Traitement chimique des bois de charpente."
        })
        total_decote += c

    # IA de Déduction DPE si non trouvé
    if dpe_letter == "?" or dpe_letter == "N/A":
        ratio_cout = (total_decote / surface) if surface > 0 else 0
        if ratio_cout > 350: dpe_letter = "G"
        elif ratio_cout > 250: dpe_letter = "F"
        elif ratio_cout > 150: dpe_letter = "E"
        elif ratio_cout > 70: dpe_letter = "D"
        else: dpe_letter = "C"

    if ges_letter == "?" or ges_letter == "N/A":
        ges_letter = dpe_letter 

    if dpe_letter in ["F", "G"]:
        c = int((700 * surface) * indice)
        checklist["dpe"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": f"Classement évalué {dpe_letter} (Passoire thermique).{mention_surface}", 
            "action": "À prévoir : Rénovation globale (isolation + chauffage) pour louer à terme."
        })
        total_decote += c
        bloquant_location = True
    else:
        checklist["dpe"]["detail"] = f"Le bien est estimé ou classé {dpe_letter}."
        
    if re.search(r"(inondation|zone inondable|ppri|sismicité.*forte|séisme)", texte_global, re.IGNORECASE):
        c = int(4000 * indice)
        checklist["erp"].update({
            "statut": "Anomalie", "cout": c, 
            "detail": "Exposition à des risques naturels ou technologiques.", 
            "action": "À prévoir : Majoration probable sur la prime d'assurance habitation."
        })
        total_decote += c

    if securite_critique:
        solutions.append("SÉCURITÉ : Le diagnostic relève des points (électricité, gaz ou structure) pouvant nécessiter une sécurisation avant occupation.")
    if bloquant_location:
        solutions.append("LÉGISLATION : La performance énergétique actuelle expose à des contraintes réglementaires (ex: gel des loyers).")
    
    if re.search(r"date de réalisation.*(201[0-9]|202[0-3])", texte_global, re.IGNORECASE):
        solutions.append("⚠️ ALERTE VALIDITÉ : Un document semble antérieur à 2024. Pensez à faire vérifier sa validité juridique chez le notaire.")

    if total_decote > 0:
        solutions.append("BILAN ESTIMATIF : Cette extraction algorithmique propose une enveloppe indicative pour nourrir votre réflexion.")
        solutions.append("RECOMMANDATION LÉGALE : Il est de votre responsabilité de faire confirmer ces montants par les devis de vrais artisans RGE.")
    else:
        solutions.append("CONCLUSION INDICATIVE : Le dossier ne relève pas d'anomalie majeure dans le texte. L'état général semble cohérent.")

    return {
        "diagnostics": list(checklist.values()),
        "solutions": solutions,
        "prix_initial": prix,
        "total_decote": total_decote,
        "prix_net": prix - total_decote,
        "analyse_secteur": f"Rapport d'indice local : {indice}",
        "localisation_exacte": nom_ville,
        "impact_marche": texte_impact,
        "dpe_lettre": dpe_letter,
        "ges_lettre": ges_letter,
        "date_audit": datetime.now().strftime("%d/%m/%Y"),
        "securite": "Confidentialité totale : Le document a été traité dans la mémoire vive et détruit."
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
        details.append({"point": "Isolation Murs", "loi": "Loi Climat", "analyse": "CONSTAT DÉTAILLÉ :\nAbsence d'isolation repérée.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Isolation des murs (ITI/ITE) -> env. 8 000 €.", "provision": "-8 000 €"})
    else:
        details.append({"point": "Isolation Murs", "loi": "Loi Climat", "analyse": "CONSTAT DÉTAILLÉ :\nIsolation jugée satisfaisante.\n\nACTIONS RECOMMANDÉES :\n- Entretien régulier des ventilations.", "provision": "0 €"})

    if donnees.get("elec_differentiel") == "non" or donnees.get("elec_prises_terre") == "non" or donnees.get("elec_vetuste") == "oui": 
        decote += 2500
        details.append({"point": "Sécurité Électrique", "loi": "Norme Électrique", "analyse": "CONSTAT DÉTAILLÉ :\nL'installation ne dispose pas des sécurités modernes de base.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Mise en sécurité par un pro -> env. 2 500 €.", "provision": "-2 500 €"})

    if chauffage_vetuste == "oui":
        decote += 12000; malus_dpe += 2
        details.append({"point": "Chauffage", "loi": "Transition Énergétique", "analyse": "CONSTAT DÉTAILLÉ :\nSystème de chauffage ancien.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Remplacement par système performant -> env. 12 000 €.", "provision": "-12 000 €"})

    if vitrage_simple == "oui":
        decote += 6000; malus_dpe += 1
        details.append({"point": "Menuiseries", "loi": "Performance Thermique", "analyse": "CONSTAT DÉTAILLÉ :\nFenêtres obsolètes thermiquement.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Remplacement double vitrage -> env. 6 000 €.", "provision": "-6 000 €"})

    if donnees.get("structure_amiante") == "non": 
        decote += 3000
        details.append({"point": "Amiante", "loi": "Code Santé", "analyse": "CONSTAT DÉTAILLÉ :\nPrésomption de matériaux amiantés.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- En cas de travaux, retrait sécurisé -> env. 3 000 €.", "provision": "-3 000 €"})
    
    if fissures == "oui":
        decote += 15000
        details.append({"point": "Structure & Fissures", "loi": "Structure", "analyse": "CONSTAT DÉTAILLÉ :\nMouvements structurels visibles.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Étude et consolidation -> env. 15 000 €.", "provision": "-15 000 €"})
    
    if etat_toiture == "oui":
        decote += 12000
        details.append({"point": "Toiture", "loi": "Couverture", "analyse": "CONSTAT DÉTAILLÉ :\nCouverture fatiguée.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Intervention couvreur requise -> env. 12 000 €.", "provision": "-12 000 €"})

    if parasites_bois == "oui":
        decote += 3500
        details.append({"point": "Parasites Bois", "loi": "Termites", "analyse": "CONSTAT DÉTAILLÉ :\nTraces d'insectes dans la charpente.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Traitement curatif -> env. 3 500 €.", "provision": "-3 500 €"})

    if assainissement == "non":
        decote += 8000
        details.append({"point": "Assainissement", "loi": "SPANC", "analyse": "CONSTAT DÉTAILLÉ :\nTraitement des eaux non conforme.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Pose d'une micro-station -> env. 8 000 €.", "provision": "-8 000 €"})

    if fuites_plomberie == "oui":
        decote += 2500
        details.append({"point": "Plomberie", "loi": "Sanitaire", "analyse": "CONSTAT DÉTAILLÉ :\nRisque de dégât des eaux.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Réfection réseau -> env. 2 500 €.", "provision": "-2 500 €"})

    if garde_corps_hs == "oui":
        decote += 1500
        details.append({"point": "Sécurité Extérieure", "loi": "Chutes", "analyse": "CONSTAT DÉTAILLÉ :\nProtections instables.\n\nACTIONS & CHIFFRAGE PRÉCIS :\n- Remplacement garde-corps -> env. 1 500 €.", "provision": "-1 500 €"})

    lettres_dpe = ["A", "B", "C", "D", "E", "F", "G"]
    index = min(malus_dpe, 6)
    dpe_estime = lettres_dpe[index]

    etat = "Vigilance : Budget travaux indicatif à prévoir" if decote > 0 else "Aucun gros travaux décelés via cette grille"
    strategie = f"Bilan : L'analyse indique une enveloppe de ~{decote} € de travaux. Ceci permet de poser une base de discussion, à valider impérativement par des artisans." if decote > 0 else "Bilan : L'évaluation ne détecte aucun défaut justifiant une décote technique."

    return {"success": True, "resultat": {"etat": etat, "decote_totale": decote, "details": details, "strategie": strategie, "dpe": dpe_estime, "ges": dpe_estime}}
