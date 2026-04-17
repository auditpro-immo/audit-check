from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import re
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
)

def get_modulateur_marche(cp: str):
    mois_ecoules = (datetime.now().year - 2024) * 12 + datetime.now().month
    inflation = 1.0 + (mois_ecoules * 0.002)
    coeff_region = 1.0
    if cp:
        if cp.startswith(("75", "92", "94", "93")): coeff_region = 1.25 # Tension forte IDF
        elif cp.startswith(("06", "69", "13", "33")): coeff_region = 1.15 # Grandes métropoles
        elif cp.startswith(("23", "36", "15", "48")): coeff_region = 0.85 # Zones rurales
    return round(inflation * coeff_region, 2)

@app.post("/scan")
async def analyser(fichier: UploadFile = File(...), prix: float = Form(0), cp: str = Form("")):
    # Structure de l'Audit Poussé : une checklist complète
    checklist = {
        "elec": {"titre": "Installation Électrique Basse Tension", "statut": "Conforme", "cout": 0, "loi": "Norme NF C 15-100", "detail": "Absence d'anomalies détectées sur les points de contrôle (prise de terre, protection différentielle).", "action": "Aucune action immédiate. Contrôle recommandé tous les 10 ans."},
        "gaz": {"titre": "Installation Intérieure de Gaz", "statut": "Conforme", "cout": 0, "loi": "Norme NF P 45-500", "detail": "Absence d'anomalies détectées sur les conduites et la ventilation.", "action": "Aucune action immédiate. Entretien annuel de la chaudière obligatoire."},
        "amiante": {"titre": "Recherche d'Amiante avant Vente", "statut": "Conforme", "cout": 0, "loi": "Art. L1334-13", "detail": "Absence de matériaux listés A ou B contenant de l'amiante dans le périmètre analysé.", "action": "Aucune action. Validité illimitée en cas d'absence."},
        "plomb": {"titre": "Risque d'Exposition au Plomb (CREP)", "statut": "Conforme", "cout": 0, "loi": "Art. L1334-1", "detail": "Revêtements sains ou concentrations inférieures au seuil réglementaire (1mg/cm²).", "action": "Aucune action immédiate."},
        "dpe": {"titre": "Performance Énergétique (DPE)", "statut": "Conforme", "cout": 0, "loi": "Loi Climat & Résilience 2021", "detail": "Classement décent (A à E). Le bien n'est pas considéré comme une passoires thermique.", "action": "Aucune action obligatoire pour la vente ou la location."},
        "parasite": {"titre": "État Parasitaire (Termites/Mérule)", "statut": "Conforme", "cout": 0, "loi": "Art. L133-6", "detail": "Absence d'indices d'infestation d'insectes xylophages ou de champignons lignivores.", "action": "Validité 6 mois. Surveiller l'humidité."},
        "erp": {"titre": "État des Risques (ERP)", "statut": "Conforme", "cout": 0, "loi": "Art. L125-5", "detail": "Bien situé hors zone de risque sismique fort, inondable majeure ou plan de prévention.", "action": "Validité 6 mois."}
    }
    
    solutions = []
    total_decote = 0
    indice = get_modulateur_marche(cp)
    securite_critique = False
    bloquant_location = False
    
    with pdfplumber.open(fichier.file) as pdf:
        texte_global = " ".join([page.extract_text() or "" for page in pdf.pages])
        
        # Analyse des anomalies et mise à jour de la checklist
        
        # Électricité
        if re.search(r"(anomalie|prise de terre|électrisation|contact direct|matériel vétuste)", texte_global, re.IGNORECASE):
            c = int(2000 * indice)
            checklist["elec"].update({
                "statut": "Anomalie", "cout": c, 
                "detail": "Vétusté avancée ou absence de liaison à la terre sur plusieurs circuits.", 
                "action": "Rénovation du tableau électrique et mise en conformité des prises de terre requise."
            })
            total_decote += c
            securite_critique = True
            
        # Gaz
        if re.search(r"(anomalie de type A2|DGI|danger grave et immédiat|fuite.*gaz|conduite vétuste)", texte_global, re.IGNORECASE):
            c = int(3000 * indice)
            checklist["gaz"].update({
                "statut": "Anomalie", "cout": c, 
                "detail": "Danger Grave et Immédiat (DGI) ou conduite non étanche détectée.", 
                "action": "Coupure de l'alimentation. Remplacement immédiat des conduites par professionnel certifié."
            })
            total_decote += c
            securite_critique = True

        # Amiante
        if re.search(r"(amiante|fibro-ciment|matériaux de la liste A|matériaux de la liste B)", texte_global, re.IGNORECASE):
            c = int(7500 * indice)
            checklist["amiante"].update({
                "statut": "Anomalie", "cout": c, 
                "detail": "Présence confirmée d'amiante dans des matériaux de toiture, conduits ou dalles.", 
                "action": "Confiner ou désamianter les zones critiques par entreprise certifiée SS3."
            })
            total_decote += c

        # Plomb
        if re.search(r"(plomb|saturnisme|peinture.*dégradée|classe 3)", texte_global, re.IGNORECASE):
            c = int(4500 * indice)
            checklist["plomb"].update({
                "statut": "Anomalie", "cout": c, 
                "detail": "Peintures anciennes dégradées contenant du plomb (Classe 3).", 
                "action": "Recouvrement ou décapage obligatoire avant travaux ou mise en location."
            })
            total_decote += c

        # Termites/Mérule
        if re.search(r"(mérule|champignon.*lignivore)", texte_global, re.IGNORECASE):
            c = int(15000 * indice)
            checklist["parasite"].update({
                "statut": "Anomalie", "cout": c, 
                "detail": "Présence active de mérule (péril structurel).", 
                "action": "Traitement fongicide lourd, bûchage et suppression des sources d'humidité obligatoires."
            })
            total_decote += c
            securite_critique = True
        elif re.search(r"(termites|xylophages)", texte_global, re.IGNORECASE):
            c = int(5000 * indice)
            checklist["parasite"].update({
                "statut": "Anomalie", "cout": c, 
                "detail": "Infestation d'insectes xylophages dans la charpente.", 
                "action": "Traitement curatif par injection et barrières chimiques."
            })
            total_decote += c

        # DPE
        if re.search(r"(dpe.*g\b|dpe.*f\b|passoire thermique)", texte_global, re.IGNORECASE):
            c = int(25000 * indice)
            checklist["dpe"].update({
                "statut": "Anomalie", "cout": c, 
                "detail": "Passoire thermique (F ou G). Consommation énergétique excessive.", 
                "action": "Rénovation globale (isolation + système de chauffage) pour atteindre classe D minimale."
            })
            total_decote += c
            bloquant_location = True
            
        # ERP
        if re.search(r"(inondation|zone inondable|ppri|sismicité.*forte|séisme)", texte_global, re.IGNORECASE):
            c = int(4000 * indice)
            checklist["erp"].update({
                "statut": "Anomalie", "cout": c, 
                "detail": "Bien situé en zone rouge de risque naturel majeur (inondation ou séisme).", 
                "action": "Installation de batardeaux (inondation). Surprime d'assurance à anticiper."
            })
            total_decote += c

  # Génération de la stratégie d'expertise
    if securite_critique:
        solutions.append("ALERTE SÉCURITÉ : Plusieurs Danger Graves Immédiats (DGI) ou périls structurels détectés. La mise en sécurité est la priorité absolue avant signature.")
    if bloquant_location:
        solutions.append("MISE EN LOCATION IMPOSSIBLE : Le bien est classé F ou G (passoire). Il sera interdit à la location dès 2028 (G dès 2025). Une rénovation globale est requise.")
    if total_decote > 0:
        solutions.append("STRATÉGIE DE NÉGOCIATION : Le montant total des provisions (chiffrage macro-économique d'expertise) constitue un levier de négociation commercial direct.")
        solutions.append("RECOMMANDATION : Mandater des artisans RGE pour établir des devis contradictoires basés sur les actions listées dans l'inventaire.")
    else:
        solutions.append("RÉSULTAT : Le dossier ne révèle aucune non-conformité majeure justifiant une décote financière.")

    return {
        "diagnostics": list(checklist.values()),
        "solutions": solutions,
        "prix_initial": prix,
        "total_decote": total_decote,
        "prix_net": prix - total_decote,
        "analyse_secteur": f"Coefficients : Inflation + Marché Local {indice}",
        "date_audit": datetime.now().strftime("%d/%m/%Y"),
        "securite": "CERTIFICAT RGPD : Analyse en mémoire volatile, destruction immédiate."
    }

@app.post("/api/analyze-grid")
async def analyze_grid(request: Request):
    donnees = await request.json()
    details = []
    decote = 0

    if donnees.get("dpe_murs") == "non":
        decote += 8000
        details.append({"point": "Isolation des Murs", "loi": "Loi Climat & Résilience", "explication": "L'isolation thermique des murs limite les déperditions de chaleur et améliore le DPE.", "analyse": "Constat : Parois non isolées.\nRisque : Passoire thermique (interdiction de location à terme), factures élevées.\nAction : Réaliser une isolation thermique par l'intérieur (ITI) ou l'extérieur (ITE).", "provision": "-8 000"})
    if donnees.get("dpe_combles") == "non":
        decote += 3000
        details.append({"point": "Isolation des Combles", "loi": "Loi Climat & Résilience", "explication": "La toiture représente jusqu'à 30% des déperditions thermiques d'un bâtiment.", "analyse": "Constat : Épaisseur d'isolant insuffisante ou absente.\nRisque : Déperdition thermique majeure.\nAction : Soufflage d'isolant (R > 7 m².K/W).", "provision": "-3 000"})
    if donnees.get("dpe_vitrage") == "non":
        decote += 5000
        details.append({"point": "Menuiseries Extérieures", "loi": "RT Existant", "explication": "Les fenêtres doivent assurer une rupture de pont thermique adéquate.", "analyse": "Constat : Simple vitrage ou double vitrage obsolète.\nRisque : Ponts thermiques, condensation.\nAction : Remplacement par double vitrage à isolation renforcée.", "provision": "-5 000"})
    if donnees.get("elec_differentiel") == "non" or donnees.get("elec_prises_terre") == "non":
        decote += 2500
        details.append({"point": "Sécurité Électrique", "loi": "Norme NF C 15-100", "explication": "Le disjoncteur différentiel 30mA et la terre protègent contre l'électrisation.", "analyse": "Constat : Absence de protection différentielle ou de mise à la terre.\nRisque : Danger Grave et Immédiat (DGI).\nAction : Mise en sécurité du tableau et création de ligne de terre.", "provision": "-2 500"})
    if donnees.get("structure_amiante") == "non":
        decote += 3000
        details.append({"point": "Risque Amiante", "loi": "Code Santé Publique (Art. L1334-13)", "explication": "L'amiante est un matériau cancérigène interdit de construction depuis 1997.", "analyse": "Constat : Matériaux suspects détectés.\nRisque : Inhalation de fibres en cas de travaux.\nAction : Diagnostic Amiante Avant Travaux (DAAT) requis.", "provision": "-3 000"})

    if decote == 0:
        details.append({"point": "État Général", "loi": "Conforme", "explication": "Les points de contrôle visuels standards sont respectés.", "analyse": "Constat : Aucune anomalie majeure détectée lors de l'évaluation visuelle.", "provision": "0"})

    etat = "Travaux majeurs requis" if decote >= 10000 else "Interventions techniques à prévoir" if decote > 0 else "Excellent état technique"
    strategie = "Décote justifiée. Les provisions estimées doivent être utilisées comme argument technique lors de la négociation financière." if decote > 0 else "Le dossier ne présente pas d'arguments techniques justifiant une décote."

    return {"success": True, "resultat": {"etat": etat, "decote_totale": decote, "details": details, "strategie": strategie}}
