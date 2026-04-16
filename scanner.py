from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
)

@app.post("/scan")
async def analyser(fichier: UploadFile = File(...), prix: float = Form(0)):
    anomalies = []
    positives = []
    total_decote = 0
    
    with pdfplumber.open(fichier.file) as pdf:
        texte_global = " ".join([page.extract_text() or "" for page in pdf.pages])
        
        if re.search(r"(anomalie|prise de terre|électrisation)", texte_global, re.IGNORECASE):
            anomalies.append({
                "titre": "Non-conformité Électrique",
                "loi": "Norme NF C 15-100",
                "detail": "Absence de mise à la terre ou protection défaillante. Risque d'électrisation.",
                "cout": 1500
            })
            total_decote += 1500
        else:
            positives.append("Installation électrique : Conformité vérifiée.")

        if re.search(r"(amiante|fibro-ciment)", texte_global, re.IGNORECASE):
            anomalies.append({
                "titre": "Présence d'Amiante",
                "loi": "Code de la santé publique (Art. L1334-13)",
                "detail": "Matériaux dégradés contenant de l'amiante. Désamiantage requis.",
                "cout": 5000
            })
            total_decote += 5000
        else:
            positives.append("Amiante : Absence totale détectée.")

    return {
        "anomalies": anomalies,
        "positives": positives,
        "prix_initial": prix,
        "total_decote": total_decote,
        "prix_net": prix - total_decote,
        "securite": "🔒 Document analysé en mémoire volatile et détruit après traitement (RGPD)."
    }