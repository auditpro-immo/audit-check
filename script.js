let donneesAudit = null;
let idRapport = "";
let chartInstance = null;
let loyerMensuelSaisi = 0;
let profilActuel = "particulier";

// VARIABLES MARQUE BLANCHE
let agenceNom = localStorage.getItem('auditpro_agence_nom') || 'AuditPro';
let agenceCouleur = localStorage.getItem('auditpro_agence_couleur') || '#00d632';
let agenceLogoBase64 = localStorage.getItem('auditpro_agence_logo') || null;

function entrerSurLeSite(profil) {
    const portal = document.getElementById('welcome-portal');
    const mainApp = document.getElementById('main-app');
    
    portal.style.opacity = '0';
    setTimeout(() => {
        portal.style.display = 'none';
        mainApp.style.display = 'block';
        setTimeout(() => { mainApp.style.opacity = '1'; }, 50);
        changerProfilInterne(profil);
    }, 500);
}

function changerProfilInterne(profil) {
    profilActuel = profil;
    document.getElementById('btn-particulier').classList.remove('active');
    document.getElementById('btn-pro').classList.remove('active');
    
    let btnActif = document.getElementById('btn-' + (profil === 'particulier' ? 'particulier' : 'pro'));
    btnActif.classList.add('active');
    btnActif.style.borderColor = agenceCouleur;
    btnActif.style.color = agenceCouleur;

    if(profil === "professionnel") {
        document.getElementById('hero-badge').innerText = "Espace Professionnels (B2B)";
        document.getElementById('hero-title').innerText = "Justifiez vos estimations et sécurisez vos transactions.";
        document.getElementById('hero-desc').innerText = "Notre technologie d'analyse traduit instantanément les PDF de diagnostics en rapports chiffrés. Un outil pensé pour rassurer vos acquéreurs et obtenir l'exclusivité auprès des vendeurs.";
        document.getElementById('form-title').innerText = "Simulateur pour les agences";
        document.getElementById('nav-pro').style.display = "inline-block";
    } else {
        document.getElementById('hero-badge').innerText = "Espace Particulier (B2C)";
        document.getElementById('hero-title').innerText = "Sécurisez votre achat en chiffrant les travaux cachés.";
        document.getElementById('hero-desc').innerText = "Notre outil analyse l'ensemble des diagnostics obligatoires de la maison que vous visitez. Obtenez en 2 minutes le vrai coût des remises aux normes.";
        document.getElementById('form-title').innerText = "Configuration de l'analyse";
        document.getElementById('nav-pro').style.display = "none";
    }
    
    if(donneesAudit) {
        afficherEcran(); 
    }
}

document.getElementById('logoUploadInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            agenceLogoBase64 = e.target.result;
            document.getElementById('logo-preview').src = agenceLogoBase64;
            document.getElementById('logo-preview').style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
});

function appliquerCouleurMarqueBlanche() {
    document.getElementById('header-logo-text').innerText = agenceNom === 'AuditPro' ? 'Audit' : agenceNom;
    document.getElementById('header-logo-color').innerText = agenceNom === 'AuditPro' ? 'Pro' : 'Immo';
    document.getElementById('header-logo-color').style.color = agenceCouleur;
    
    document.querySelectorAll('.btn-dynamic-color').forEach(btn => { 
        btn.style.backgroundColor = agenceCouleur; 
        btn.style.boxShadow = `0 4px 15px ${agenceCouleur}40`;
    });
    
    document.querySelectorAll('.text-dynamic-color').forEach(txt => { txt.style.color = agenceCouleur; });
    document.querySelectorAll('.border-dynamic-color').forEach(b => { b.style.borderTopColor = agenceCouleur; });
    document.querySelectorAll('.border-left-dynamic-color').forEach(b => { b.style.borderLeftColor = agenceCouleur; });
    document.querySelectorAll('.border-dynamic-color-top').forEach(b => { b.style.borderTopColor = agenceCouleur; });
    
    document.querySelectorAll('nav a').forEach(a => {
        a.style.color = '#fff';
        a.style.borderBottomColor = 'transparent';
    });
    const lienActif = document.querySelector('nav a.active');
    if (lienActif) {
        lienActif.style.color = agenceCouleur;
        lienActif.style.borderBottom = `2px solid ${agenceCouleur}`;
    }
    
    document.querySelectorAll('.profile-btn').forEach(btn => {
        btn.style.borderColor = 'transparent';
        btn.style.color = '#6c757d';
    });
    const activeBtn = document.querySelector('.profile-btn.active');
    if(activeBtn) {
        activeBtn.style.borderColor = agenceCouleur;
        activeBtn.style.color = agenceCouleur;
    }
    
    const dropIcon = document.querySelector('.drop-icon');
    if(dropIcon) dropIcon.style.color = agenceCouleur;
    
    document.querySelectorAll('.btn-pdf').forEach(btn => {
        btn.style.backgroundColor = agenceCouleur;
    });
}

function sauvegarderParametresPro() {
    if (!localStorage.getItem('auditpro_cookies')) {
        return showToast("Veuillez accepter la sauvegarde locale (bandeau en bas) pour activer cette fonction.", "error");
    }
    const inputNom = document.getElementById('nomAgenceInput').value.trim();
    const inputCouleur = document.getElementById('couleurAgenceInput').value;
    
    agenceNom = inputNom !== "" ? inputNom : "AuditPro";
    agenceCouleur = inputCouleur;
    
    localStorage.setItem('auditpro_agence_nom', agenceNom);
    localStorage.setItem('auditpro_agence_couleur', agenceCouleur);
    if(agenceLogoBase64) {
        localStorage.setItem('auditpro_agence_logo', agenceLogoBase64);
    }
    
    appliquerCouleurMarqueBlanche();
    chargerHistorique(); 
    
    if(donneesAudit) {
        afficherEcran(); 
    }
    
    showToast("Paramètres Agence sauvegardés localement avec succès !");
}

function reinitialiserMarqueBlanche() {
    localStorage.removeItem('auditpro_agence_nom');
    localStorage.removeItem('auditpro_agence_couleur');
    localStorage.removeItem('auditpro_agence_logo');
    
    agenceNom = 'AuditPro';
    agenceCouleur = '#00d632'; 
    agenceLogoBase64 = null;
    
    document.getElementById('nomAgenceInput').value = '';
    document.getElementById('couleurAgenceInput').value = '#00d632';
    document.getElementById('logo-preview').style.display = 'none';
    document.getElementById('logo-preview').src = '';
    
    appliquerCouleurMarqueBlanche(); 
    chargerHistorique(); 
    
    if(donneesAudit) {
        afficherEcran(); 
    }
    
    showToast("L'interface a retrouvé ses couleurs par défaut.");
}

function accepterCookies() {
    localStorage.setItem('auditpro_cookies', 'true');
    document.getElementById('cookie-banner').style.display = 'none';
    showToast("Mode de sauvegarde locale activé.");
}

function chargerHistorique() {
    const historiqueTable = document.getElementById('historiqueTableBody');
    if(!historiqueTable) return;
    
    const historique = JSON.parse(localStorage.getItem('auditpro_historique_v2')) || [];
    historiqueTable.innerHTML = '';
    
    if(historique.length === 0) {
        historiqueTable.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666; padding: 20px;">Aucun dossier généré pour le moment.</td></tr>';
        return;
    }
    
    historique.reverse().forEach((dossier, index) => {
        let realIndex = historique.length - 1 - index;
        historiqueTable.innerHTML += `
            <tr class="history-row">
                <td>${dossier.date}</td>
                <td><strong>${dossier.ville}</strong></td>
                <td>${formatNumber(dossier.prixInitial)} €</td>
                <td style="text-align: right;">
                    <div style="display:flex; justify-content:flex-end; gap:5px;">
                        <button class="btn-voir" onmouseover="this.style.color='${agenceCouleur}'; this.style.borderColor='${agenceCouleur}'" onmouseout="this.style.color='#0b1a14'; this.style.borderColor='#ced4da'" onclick="voirPDFDirect(event, ${realIndex})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Voir
                        </button>
                        <button class="btn-pdf" style="background-color: ${agenceCouleur}; color: #fff;" onclick="telechargerDirect(event, ${realIndex})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> PDF
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

function ajouterAuHistorique(ville, prixInitial, donneesCompletes) {
    if (!localStorage.getItem('auditpro_cookies')) return;
    
    const historique = JSON.parse(localStorage.getItem('auditpro_historique_v2')) || [];
    historique.push({
        id: "AUDIT-" + Math.floor(Math.random() * 90000 + 10000),
        date: new Date().toLocaleDateString('fr-FR'),
        ville: ville,
        prixInitial: prixInitial,
        data: donneesCompletes,
        loyer: loyerMensuelSaisi
    });
    localStorage.setItem('auditpro_historique_v2', JSON.stringify(historique));
    chargerHistorique();
}

function chargerDossierHistorique(index) {
    const historique = JSON.parse(localStorage.getItem('auditpro_historique_v2')) || [];
    const dossier = historique[index];
    
    donneesAudit = dossier.data;
    idRapport = dossier.id;
    loyerMensuelSaisi = dossier.loyer || 0;
    
    document.getElementById('prixInitial').value = formatNumber(dossier.prixInitial);
    if(loyerMensuelSaisi > 0) document.getElementById('loyerMensuel').value = formatNumber(loyerMensuelSaisi);
    
    document.getElementById('result-wrapper').style.display = "block";
    // Évite de scroller vers le bas automatiquement si on est sur l'onglet Pro
    if (document.getElementById('audit-tab').classList.contains('active')) {
        document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
    }
    afficherEcran();
}

// CORRECTION BUG PAGE BLANCHE / PLANTAGE : SYNCHRONE ET SECURISÉ
function voirPDFDirect(event, index) {
    event.stopPropagation();
    chargerDossierHistorique(index); 
    
    // On ouvre l'onglet AVANT que le bloqueur de pop-up ne panique
    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
        pdfWindow.document.write(`
            <html lang='fr'>
            <head>
                <title>Rapport d'Expertise - ${agenceNom}</title>
                <style>body, html { margin: 0; padding: 0; background-color: #525659; height: 100vh; overflow: hidden; }</style>
            </head>
            <body>
                <div id="loader" style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; color:white; font-family:sans-serif;">
                    <h3>Génération du document en cours...</h3>
                    <p style="color:#ccc; font-size:14px;">Veuillez patienter.</p>
                </div>
            </body>
            </html>
        `);
    } else {
        showToast("Veuillez autoriser les pop-ups pour voir le rapport.", "error");
        return;
    }

    showToast("Ouverture du rapport PDF en cours...");
    exporterPDF('view', pdfWindow);
}

function telechargerDirect(event, index) {
    event.stopPropagation();
    chargerDossierHistorique(index); 
    showToast("Génération du PDF en cours...");
    exporterPDF('download'); 
}

function viderHistorique() {
    if(confirm("Êtes-vous sûr de vouloir supprimer définitivement tout l'historique de cet appareil ?")) {
        localStorage.removeItem('auditpro_historique_v2');
        chargerHistorique();
        showToast("Historique local effacé avec succès.");
    }
}

const formatNumber = (num) => { return Number(num).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' '); };

function formatInputNumber(e) {
    let value = e.target.value.replace(/\s+/g, '');
    if (!isNaN(value) && value !== "") {
        e.target.value = formatNumber(value);
    }
}

function animateValue(obj, start, end, duration, prefix = "") {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(easeProgress * (end - start) + start);
        obj.innerHTML = prefix + formatNumber(currentVal) + " €";
        if (progress < 1) { window.requestAnimationFrame(step); } 
        else { obj.innerHTML = prefix + formatNumber(end) + " €"; }
    };
    window.requestAnimationFrame(step);
}

function animateValuePercent(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentVal = easeProgress * (end - start) + start;
        obj.innerHTML = currentVal.toFixed(2) + " %";
        if (progress < 1) { window.requestAnimationFrame(step); } 
        else { obj.innerHTML = end.toFixed(2) + " %"; }
    };
    window.requestAnimationFrame(step);
}

function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    if(type === "success") { toast.style.borderLeftColor = agenceCouleur; }
    else { toast.style.borderLeftColor = '#cc0000'; }
    toast.innerHTML = `<strong>${type === "success" ? "SUCCÈS :" : "ATTENTION :"}</strong> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.4s forwards";
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function copierScript(idElement) {
    const texte = document.getElementById(idElement).innerText;
    navigator.clipboard.writeText(texte).then(() => { showToast("Texte copié dans le presse-papier."); });
}

function switchReportTab(tabId) {
    document.querySelectorAll('.report-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = '#6c757d';
        btn.style.borderBottomColor = 'transparent';
    });
    document.querySelectorAll('.report-pane').forEach(pane => pane.classList.remove('active'));
    
    let activeBtn = document.querySelector(`[onclick="switchReportTab('${tabId}')"]`);
    activeBtn.classList.add('active');
    activeBtn.style.color = agenceCouleur;
    activeBtn.style.borderBottomColor = agenceCouleur;
    
    document.getElementById(tabId).classList.add('active');
}

function lancerDemo() {
    document.getElementById('prixInitial').value = "450 000";
    document.getElementById('loyerMensuel').value = "1 200";
    document.getElementById('codePostal').value = "35000";
    
    loyerMensuelSaisi = 1200;
    idRapport = "DEMO-PRO-" + Math.floor(Math.random() * 90000 + 10000);
    
    donneesAudit = {
        cp: "35000",
        localisation_exacte: "Rennes (Secteur Ille-et-Vilaine)",
        impact_marche: "Métropole régionale en forte croissance économique. La forte demande sur le locatif et le durcissement de la Loi Climat créent une tension sur les artisans certifiés RGE, justifiant un ajustement automatique des devis locaux à la hausse (+18%).",
        date_audit: new Date().toLocaleDateString('fr-FR'),
        prix_initial: 450000,
        total_decote: 28700,
        prix_net: 421300,
        analyse_secteur: "Indice de marché local : 1.18",
        securite: "Vos données sont privées : Le PDF a été supprimé de nos serveurs.",
        diagnostics: [
            {titre: "Électricité (Sécurité)", cout: 4500, loi: "Norme NF C 15-100", detail: "Défaut de mise à la terre ou matériel ancien identifié.", action: "Mise en sécurité du tableau électrique par un professionnel."},
            {titre: "DPE (Énergie)", cout: 20000, loi: "Loi Climat & Résilience", detail: "Logement classé F (Passoire thermique). Pertes de chaleur majeures identifiées.", action: "Isolation des combles et installation d'une Pompe à Chaleur."},
            {titre: "Amiante (Matériaux)", cout: 4200, loi: "Art. L1334-13", detail: "Présence de conduits en amiante-ciment dans la cave.", action: "Retrait et traitement des déchets par une société spécialisée."},
            {titre: "Plomb (Peintures)", cout: 0, loi: "Art. L1334-1", detail: "Aucune trace de plomb au-dessus des seuils réglementaires détectée.", action: "Aucune intervention nécessaire sur les murs."},
            {titre: "Gaz (Risque fuite)", cout: 0, loi: "Norme NF P 45-500", detail: "Installation étanche et valves de sécurité fonctionnelles.", action: "Entretien annuel classique de la chaudière suffisant."}
        ]
    };
    
    showToast("Simulation de Démonstration générée avec succès.");
    document.getElementById('result-wrapper').style.display = "block";
    document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
    afficherEcran();
}

async function envoyer() {
    const input = document.getElementById('fichierPdf');
    const prixInputBrut = document.getElementById('prixInitial').value.replace(/\s+/g, '');
    const prixInput = Number(prixInputBrut) || 0;
    const loyerInputBrut = document.getElementById('loyerMensuel').value.replace(/\s+/g, '');
    const loyerInput = Number(loyerInputBrut) || 0;
    const cpInput = document.getElementById('codePostal').value || "";
    
    if (prixInput <= 0) return showToast("Veuillez indiquer le prix de vente.", "error");
    if (!input.files.length) return showToast("Veuillez charger le fichier PDF.", "error");
    
    loyerMensuelSaisi = loyerInput;
    document.getElementById('loading-overlay').style.display = "flex";

    const messagesIA = [
        "Lecture et structuration du document PDF...",
        "Recherche de données réglementaires...",
        "Calcul des devis moyens pour le département...",
        "Génération de la synthèse d'évaluation..."
    ];
    let msgIndex = 0;
    const textElement = document.getElementById('loading-text');
    const loadInterval = setInterval(() => {
        textElement.innerText = messagesIA[msgIndex];
        msgIndex = (msgIndex + 1) % messagesIA.length;
    }, 1200);

    const formData = new FormData();
    formData.append("fichier", input.files[0]);
    formData.append("prix", prixInput);
    formData.append("cp", cpInput);

    try {
        const reponse = await fetch("https://audit-check-ktny.onrender.com/scan", { method: "POST", body: formData });
        if (!reponse.ok) throw new Error("Erreur serveur");
        donneesAudit = await reponse.json();
        donneesAudit.cp = cpInput;
        idRapport = "AUDIT-" + Math.floor(Math.random() * 90000 + 10000);
        
        clearInterval(loadInterval);
        document.getElementById('loading-overlay').style.display = "none";
        
        ajouterAuHistorique(donneesAudit.localisation_exacte, prixInput, donneesAudit);

        showToast("Analyse effectuée avec succès.");
        document.getElementById('result-wrapper').style.display = "block";
        document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
        afficherEcran();

    } catch (e) {
        clearInterval(loadInterval);
        document.getElementById('loading-overlay').style.display = "none";
        showToast("Erreur de traitement serveur.", "error");
    }
}

function afficherEcran() {
    let anomalies = donneesAudit.diagnostics.filter(d => d.cout > 0);
    let prixInitialClean = Number(document.getElementById('prixInitial').value.replace(/\s+/g, ''));
    if(prixInitialClean === 0 && donneesAudit.prix_initial > 0) prixInitialClean = donneesAudit.prix_initial;
    
    let kpiRentabiliteHtml = "";
    if (loyerMensuelSaisi > 0) {
        let rentaInitiale = ((loyerMensuelSaisi * 12) / prixInitialClean) * 100;
        let coutTotalReel = prixInitialClean + donneesAudit.total_decote;
        let rentaFinale = ((loyerMensuelSaisi * 12) / coutTotalReel) * 100;

        kpiRentabiliteHtml = `
        <h3 style="text-transform: uppercase; font-size: 14px; color: #0b1a14; margin-top: 30px; margin-bottom: 15px;">Performance Locative Estimée</h3>
        <div class="kpi-grid">
            <div class="kpi-box">
                <div class="kpi-label">Loyer Annuel Théorique</div>
                <div class="kpi-value" style="color: #0b1a14;" id="anim-loyer">0 €</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label">Rendement Brut Hors Travaux</div>
                <div class="kpi-value" id="anim-renta-brute">0.00 %</div>
            </div>
            <div class="kpi-box main" style="background: ${agenceCouleur}; color: #fff;">
                <div class="kpi-label" style="color: #fff;">Rendement Net (Post-Travaux)</div>
                <div class="kpi-value" id="anim-renta-nette">0.00 %</div>
            </div>
        </div>`;
    }

    let scriptNegoTxt = "";
    let titreSectionNego = "";
    let nomOnglet3 = "";
    let defautsFormate = anomalies.length > 0 ? anomalies.map(a => "- " + a.titre).join('\n') : "- Aucun défaut technique majeur justifiant une décote.";
    
    if (profilActuel === "particulier") {
        nomOnglet3 = "3. Données d'Appui";
        titreSectionNego = "Aide à la Décision (Acquéreur)";
        scriptNegoTxt = `RÉSUMÉ FACTUEL POUR VOTRE DÉCISION :

> VALEURS DE RÉFÉRENCE :
- Prix affiché par le vendeur : ${formatNumber(prixInitialClean)} €
- Total estimé des travaux de mise aux normes : ${formatNumber(donneesAudit.total_decote)} €
- Juste valeur technique du bien : ${formatNumber(donneesAudit.prix_net)} €

> JUSTIFICATION DES TRAVAUX :
L'enveloppe de travaux s'appuie sur le rapport de diagnostic. Les points suivants nécessitent une mise en sécurité ou une remise aux normes :
${defautsFormate}

L'évaluation prend également en compte la zone de localisation (${donneesAudit.localisation_exacte}), ce qui permet de justifier la cohérence du budget travaux calculé.`;
    } else {
        nomOnglet3 = "3. Données d'Appui";
        titreSectionNego = "Éléments Factuels pour la Transaction (Professionnel)";
        scriptNegoTxt = `SYNTHÈSE FACTUELLE DU DOSSIER :

> DONNÉES FINANCIÈRES :
- Écart technique calculé : ${formatNumber(donneesAudit.total_decote)} €
- Valeur nette recommandée pour positionnement : ${formatNumber(donneesAudit.prix_net)} €

> POINTS TECHNIQUES MAJEURS (ISSU DU DDT) :
${defautsFormate}

> IMPACT DU MARCHÉ LOCAL (${donneesAudit.localisation_exacte}) :
${donneesAudit.impact_marche}

NOTE D'UTILISATION :
Ces données constituent une base objective. Face au vendeur, elles justifient mathématiquement un ajustement du prix de présentation. Face à l'acquéreur, cette transparence permet d'anticiper le financement global et de sécuriser la vente.`;
    }

    let html = `
    <div style="border-bottom: 3px solid #0b1a14; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
            <h2 style="font-size: 24px; color: #0b1a14; font-weight: 800; margin: 0;">Rapport d'Analyse Technique</h2>
            <div style="font-size: 14px; color: #6c757d; margin-top: 5px; font-weight: 600;">Secteur : ${donneesAudit.localisation_exacte}</div>
        </div>
        <div style="text-align: right; font-size: 13px; color: #6c757d; font-weight: bold;">
            Dossier : ${idRapport}<br>Date : ${donneesAudit.date_audit}
        </div>
    </div>
    
    <div class="report-tabs">
        <button class="report-tab-btn active" onclick="switchReportTab('paneFinancier')" style="color: ${agenceCouleur}; border-bottom-color: ${agenceCouleur};">1. Synthèse Financière</button>
        <button class="report-tab-btn" onclick="switchReportTab('paneTechnique')">2. Bilan Technique (DDT)</button>
        <button class="report-tab-btn" onclick="switchReportTab('paneStrategie')">${nomOnglet3}</button>
    </div>
    
    <div id="paneFinancier" class="report-pane active">
        <h3 style="text-transform: uppercase; font-size: 14px; color: #0b1a14; margin-bottom: 15px;">Évaluation de la Balance Financière</h3>
        <div class="kpi-grid">
            <div class="kpi-box">
                <div class="kpi-label">Prix de vente initial</div>
                <div class="kpi-value" id="anim-prix-initial">0 €</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label" style="color: #cc0000;">Enveloppe Travaux Globale</div>
                <div class="kpi-value" style="color: #cc0000;" id="anim-cout-travaux">-0 €</div>
            </div>
            <div class="kpi-box main" style="background-color: ${agenceCouleur};">
                <div class="kpi-label" style="color: #fff;">Valeur Nette Recommandée</div>
                <div class="kpi-value" id="anim-prix-net">0 €</div>
            </div>
        </div>
        ${kpiRentabiliteHtml}
        <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-top: 20px; border: 1px solid #ced4da; text-align: left;">
            <h4 style="margin: 0 0 8px 0; color: #0b1a14; text-transform: uppercase; font-size: 12px;">Contexte du secteur géographique</h4>
            <p style="margin: 0; font-size: 14px; color: #495057; line-height: 1.5;">${donneesAudit.impact_marche}</p>
        </div>
    </div>
    
    <div id="paneTechnique" class="report-pane">
        ${anomalies.length > 0 ? `<div class="chart-container" style="display:flex; justify-content:center;"><canvas id="coutChart" width="250" height="250" style="max-width:250px;"></canvas></div>` : ''}
        <div class="table-responsive">
            <table>
                <tr>
                    <th style="width: 25%;">Domaine Contrôlé</th>
                    <th style="width: 15%; text-align: center;">État</th>
                    <th style="width: 45%;">Détails & Préconisations</th>
                    <th style="text-align: right; width: 15%;">Budget</th>
                </tr>
                ${donneesAudit.diagnostics.map(a => `
                <tr style="border-bottom: 1px solid #ecf0f1;">
                    <td style="padding: 15px; border-left: 4px solid ${a.cout > 0 ? '#cc0000' : agenceCouleur};"><b>${a.titre}</b></td>
                    <td style="padding: 15px; color: ${a.cout > 0 ? '#cc0000' : '#000000'}; font-weight: bold; text-align: center;">${a.cout > 0 ? 'ANOMALIE' : 'CONFORME'}</td>
                    <td style="padding: 15px; font-size: 13px; color: #333; line-height: 1.5;"><b>Constat :</b> ${a.detail}<br>${a.cout > 0 ? `<b>Action requise :</b> ${a.action}` : ''}</td>
                    <td style="padding: 15px; font-weight:bold; text-align: right; font-size: 16px;">${a.cout > 0 ? `-${formatNumber(a.cout)} €` : '0 €'}</td>
                </tr>`).join('')}
            </table>
        </div>
    </div>
    
    <div id="paneStrategie" class="report-pane">
        <h3 style="text-transform: uppercase; font-size: 14px; color: #0b1a14; margin-bottom: 10px;">${titreSectionNego}</h3>
        <p style="font-size: 14px; color: #495057; margin-bottom: 15px; text-align: left;">Voici la synthèse chiffrée extraite de l'analyse, prête à appuyer vos arguments :</p>
        <div class="script-box" style="border-left-color: ${agenceCouleur}; font-style: normal; font-family: 'Inter', sans-serif;">
            <button class="btn-copy" onclick="copierScript('texteScript')">Copier les données</button>
            <div id="texteScript">${scriptNegoTxt}</div>
        </div>
    </div>
    
    <div style="font-size: 10px; color: #adb5bd; text-align: justify; border-top: 1px solid #eaeaea; padding-top: 15px; margin-top: 40px;">
        <b>CADRE D'APPLICATION :</b> Cette étude est une simulation macro-économique informatisée d'aide à la décision. Document non contractuel.
    </div>`;

    document.getElementById('contenu-ecran').innerHTML = html;

    animateValue(document.getElementById('anim-prix-initial'), 0, prixInitialClean, 1500);
    animateValue(document.getElementById('anim-cout-travaux'), 0, donneesAudit.total_decote, 1500, "-");
    animateValue(document.getElementById('anim-prix-net'), 0, donneesAudit.prix_net, 1500);

    if (loyerMensuelSaisi > 0) {
        let rentaInitiale = ((loyerMensuelSaisi * 12) / prixInitialClean) * 100;
        let coutTotalReel = prixInitialClean + donneesAudit.total_decote;
        let rentaFinale = ((loyerMensuelSaisi * 12) / coutTotalReel) * 100;
        animateValue(document.getElementById('anim-loyer'), 0, (loyerMensuelSaisi * 12), 1500);
        animateValuePercent(document.getElementById('anim-renta-brute'), 0, rentaInitiale, 1500);
        animateValuePercent(document.getElementById('anim-renta-nette'), 0, rentaFinale, 1500);
    }

    if (anomalies.length > 0) {
        const ctx = document.getElementById('coutChart').getContext('2d');
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: anomalies.map(a => a.titre),
                datasets: [{ 
                    data: anomalies.map(a => a.cout), 
                    backgroundColor: ['#1a1a1a', '#cc0000', '#555555', '#888888', '#aaaaaa', '#dddddd'] 
                }]
            },
            options: { 
                animation: false, 
                responsive: false, // CRUCIAL : Force la taille du graphique même sur un onglet caché !
                plugins: { legend: { position: 'bottom' } } 
            }
        });
    }
}

// FONCTION EXPORT PDF SÉCURISÉE
function exporterPDF(action = 'download', targetWindow = null) {
    if (!donneesAudit) return;
    const btn = document.getElementById('btnExport');
    if(btn && action !== 'view') btn.innerText = "Édition du PDF en cours...";
    
    function getDpeSvg(lettre) {
        const dpeColors = { "A": "#00923E", "B": "#52B153", "C": "#A5D700", "D": "#FDF200", "E": "#F39611", "F": "#EB3223", "G": "#D30F1F" };
        const color = dpeColors[lettre] || "#888888";
        const textColor = (lettre === "D" || lettre === "C") ? "#000000" : "#ffffff";
        return `
        <svg width="100" height="35" viewBox="0 0 100 35" xmlns="http://www.w3.org/2000/svg">
            <polygon points="0,0 80,0 100,17.5 80,35 0,35" fill="${color}" />
            <text x="45" y="24" font-family="Helvetica, sans-serif" font-size="18" font-weight="bold" fill="${textColor}" text-anchor="middle">Classe ${lettre}</text>
        </svg>`;
    }

    let dpeMatch = donneesAudit.diagnostics.find(d => d.titre.toUpperCase().includes("DPE"));
    let dpeBadgeBlock = {};
    if (dpeMatch) {
        let matchLettre = dpeMatch.detail.match(/classé\s([A-G])/i);
        if (matchLettre) {
            dpeBadgeBlock = { svg: getDpeSvg(matchLettre[1].toUpperCase()), width: 80, margin: [0, 5, 0, 15] };
        }
    }

    let prixInitFormate = formatNumber(document.getElementById('prixInitial').value.replace(/\s+/g, '')) + ' €';
    let decoteFormate = '-' + formatNumber(donneesAudit.total_decote) + ' €';
    let prixNetFormate = formatNumber(donneesAudit.prix_net) + ' €';

    let tableBody = [
        [
            { text: 'DOMAINE CONTRÔLÉ', style: 'tableHeader' },
            { text: 'ÉTAT', style: 'tableHeader', alignment: 'center' },
            { text: 'DÉTAILS TECHNIQUES & ACTIONS', style: 'tableHeader' },
            { text: 'BUDGET', style: 'tableHeader', alignment: 'right' }
        ]
    ];

    donneesAudit.diagnostics.forEach((a, index) => {
        let isAnomalie = a.cout > 0;
        let rowColor = (index % 2 === 0) ? '#f8f9fa' : '#ffffff'; 
        
        tableBody.push([
            { text: a.titre, bold: true, fontSize: 10, color: '#1a1a1a', fillColor: rowColor, margin: [0, 10, 0, 10] },
            { text: isAnomalie ? 'ANOMALIE' : 'CONFORME', bold: true, fontSize: 9, color: isAnomalie ? '#cc0000' : '#00d632', alignment: 'center', fillColor: rowColor, margin: [0, 10, 0, 10] },
            { text: `Constat : ${a.detail}\n` + (isAnomalie ? `Action : ${a.action}` : ''), fontSize: 9, lineHeight: 1.4, color: '#4a4a4a', fillColor: rowColor, margin: [0, 10, 0, 10] },
            { text: isAnomalie ? '-' + formatNumber(a.cout) + ' €' : '0 €', bold: true, fontSize: 11, color: isAnomalie ? '#cc0000' : '#1a1a1a', alignment: 'right', fillColor: rowColor, margin: [0, 10, 0, 10] }
        ]);
    });

    let logoBlock = agenceLogoBase64 
        ? { image: agenceLogoBase64, fit: [150, 55], alignment: 'left' }
        : { text: agenceNom.toUpperCase(), fontSize: 22, bold: true, color: agenceCouleur, alignment: 'left', letterSpacing: 1 };

    let headerTop = {
        columns: [
            { width: '45%', stack: [logoBlock], margin: [0, 5, 0, 0] },
            {
                width: '55%',
                table: {
                    widths: ['*', '*'],
                    body: [
                        [ { text: 'DÉTAILS DU DOSSIER', colSpan: 2, style: 'coverTableTitle' }, {} ],
                        [ { text: 'Identifiant Unique :', style: 'coverLabel' }, { text: idRapport, style: 'coverValue' } ],
                        [ { text: 'Date de l\'évaluation :', style: 'coverLabel' }, { text: donneesAudit.date_audit, style: 'coverValue' } ],
                        [ { text: 'Localisation :', style: 'coverLabel' }, { text: donneesAudit.localisation_exacte, style: 'coverValue' } ]
                    ]
                },
                layout: 'lightHorizontalLines'
            }
        ],
        margin: [0, 0, 0, 30]
    };

    let anomalies = donneesAudit.diagnostics.filter(d => d.cout > 0);
    let chartImageBlock = {};
    if (anomalies.length > 0) {
        let chartCanvas = document.getElementById('coutChart');
        if (chartCanvas) {
            let dataUrl = chartCanvas.toDataURL('image/png', 1.0);
            // SÉCURITÉ : Vérifie que le canvas n'a pas rendu une image vide à cause du display: none
            if (dataUrl && dataUrl.length > 20) {
                chartImageBlock = {
                    image: dataUrl,
                    width: 190,
                    alignment: 'center',
                    margin: [0, 10, 0, 0]
                };
            }
        }
    }

    let rentaBlock = [];
    if (loyerMensuelSaisi > 0) {
        let prixInitial = Number(document.getElementById('prixInitial').value.replace(/\s+/g, ''));
        let rentaInitiale = ((loyerMensuelSaisi * 12) / prixInitial) * 100;
        let coutTotalReel = prixInitial + donneesAudit.total_decote;
        let rentaFinale = ((loyerMensuelSaisi * 12) / coutTotalReel) * 100;
        
        rentaBlock = [
            { text: 'PERFORMANCE LOCATIVE ESTIMÉE', style: 'sectionTitle', color: agenceCouleur, margin: [0, 15, 0, 10] },
            {
                table: {
                    widths: ['*', '*', '*'],
                    body: [
                        [ { text: 'Loyer Annuel', style: 'kpiHeader' }, { text: 'Rendement Brut', style: 'kpiHeader' }, { text: 'Rendement Net (Post-Travaux)', style: 'kpiHeader' } ],
                        [ { text: formatNumber(loyerMensuelSaisi * 12) + ' €', style: 'kpiValue' }, { text: rentaInitiale.toFixed(2) + ' %', style: 'kpiValue' }, { text: rentaFinale.toFixed(2) + ' %', style: 'kpiValueNet', color: agenceCouleur } ]
                    ]
                },
                layout: 'lightHorizontalLines',
                margin: [0, 0, 0, 20]
            }
        ];
    }

    try {
        let docDefinition = {
            pageSize: 'A4',
            pageMargins: [ 50, 50, 40, 50 ], 
            background: function() {
                return { canvas: [ { type: 'rect', x: 0, y: 0, w: 12, h: 842, color: agenceCouleur } ] };
            },
            header: function(currentPage) {
                if (currentPage > 1) {
                    return {
                        columns: [
                            { text: agenceNom.toUpperCase() + ' - DOSSIER TECHNIQUE', bold: true, color: '#888', fontSize: 9 },
                            { text: 'Réf. ' + idRapport, alignment: 'right', color: '#888', fontSize: 9 }
                        ], margin: [50, 20, 40, 0]
                    };
                }
            },
            footer: function(currentPage, pageCount) {
                return {
                    columns: [
                        { text: 'Document d\'aide à la décision. Ne se substitue pas à l\'expertise d\'un artisan RGE.', fontSize: 8, color: '#aaa', italics: true },
                        { text: 'Page ' + currentPage.toString() + ' / ' + pageCount, alignment: 'right', fontSize: 8, color: '#aaa', bold: true }
                    ], margin: [50, 20, 40, 0]
                };
            },
            content: [
                headerTop,
                { text: 'RAPPORT D\'ANALYSE TECHNIQUE & FINANCIÈRE', fontSize: 18, color: '#1a1a1a', bold: true, margin: [0, 0, 0, 5] },
                { text: 'Évaluation algorithmique des coûts de remise aux normes basée sur le DDT.', fontSize: 11, color: '#666', margin: [0, 0, 0, 25], italics: true },
                
                {
                    columns: [
                        {
                            width: '55%',
                            stack: [
                                { text: '1. SYNTHÈSE DES VALORISATIONS', style: 'sectionTitle', color: agenceCouleur },
                                dpeBadgeBlock,
                                {
                                    table: {
                                        widths: ['*', '*'],
                                        body: [
                                            [ { text: 'Prix de Vente Initial', style: 'kpiHeaderLeft' }, { text: prixInitFormate, style: 'kpiValueLeft' } ],
                                            [ { text: 'Enveloppe Travaux', style: 'kpiHeaderLeft', color: '#cc0000' }, { text: decoteFormate, style: 'kpiValueLeft', color: '#cc0000' } ],
                                            [ { text: 'Valeur Nette Estimée', style: 'kpiHeaderLeft', bold: true }, { text: prixNetFormate, style: 'kpiValueNetLeft', color: agenceCouleur } ]
                                        ]
                                    },
                                    layout: { hLineWidth: function() { return 1; }, vLineWidth: function() { return 0; }, hLineColor: function() { return '#eee'; }, paddingBottom: function() { return 8; }, paddingTop: function() { return 8; } },
                                    margin: [0, 0, 0, 20]
                                }
                            ]
                        },
                        {
                            width: '45%',
                            stack: [
                                anomalies.length > 0 ? { text: 'RÉPARTITION DU BUDGET', fontSize: 10, bold: true, alignment: 'center', color: '#666', margin: [0, 0, 0, 5] } : {},
                                chartImageBlock
                            ]
                        }
                    ],
                    columnGap: 20
                },
                
                ...rentaBlock,

                {
                    table: { widths: ['*'], body: [ [ { stack: [ { text: 'CONTEXTE MACRO-ÉCONOMIQUE', fontSize: 10, bold: true, color: '#fff', margin: [0, 0, 0, 4] }, { text: donneesAudit.impact_marche, fontSize: 9, color: '#eef2f5', lineHeight: 1.4 } ], padding: 12, fillColor: '#0b1a14' } ] ] },
                    layout: 'noBorders', margin: [0, 10, 0, 30]
                },
                
                { text: '2. INVENTAIRE TECHNIQUE DÉTAILLÉ (DDT)', style: 'sectionTitle', color: agenceCouleur, margin: [0, 10, 0, 10] },
                {
                    table: { headerRows: 1, widths: ['25%', '15%', '45%', '15%'], body: tableBody },
                    layout: { 
                        hLineWidth: function (i, node) { return (i === 0 || i === 1 || i === node.table.body.length) ? 2 : 1; }, 
                        vLineWidth: function () { return 0; }, 
                        hLineColor: function (i, node) { return (i === 0 || i === node.table.body.length) ? agenceCouleur : '#e0e0e0'; },
                        paddingTop: function() { return 6; }, 
                        paddingBottom: function() { return 6; } 
                    }
                },

                { text: 'MÉTHODOLOGIE ET CADRE D\'APPLICATION', fontSize: 10, bold: true, color: '#1a1a1a', margin: [0, 30, 0, 5] },
                { text: 'L\'estimation s\'appuie sur une analyse des anomalies répertoriées dans le Dossier de Diagnostic Technique (Art. L271-4 du CCH). Les tarifs sont pondérés selon l\'indice régional des coûts de construction. Clause de non-substitution : Cette simulation statistique a valeur d\'aide indicative. Les montants chiffrés ne se substituent en aucun cas à la passation de devis contradictoires établis par des artisans certifiés RGE.', fontSize: 8, color: '#666', alignment: 'justify', lineHeight: 1.4 }
            ],
            styles: {
                coverTableTitle: { fontSize: 10, bold: true, color: '#1a1a1a', alignment: 'right', margin: [0, 6, 0, 6], letterSpacing: 1 },
                coverLabel: { fontSize: 9, bold: true, color: '#888', alignment: 'right', margin: [0, 2, 10, 2] },
                coverValue: { fontSize: 9, color: '#1a1a1a', margin: [10, 2, 0, 2], bold: true },
                sectionTitle: { fontSize: 13, bold: true, color: '#1a1a1a', margin: [0, 0, 0, 15], textTransform: 'uppercase' },
                
                kpiHeaderLeft: { fontSize: 10, color: '#555', margin: [0, 5, 0, 5] },
                kpiValueLeft: { fontSize: 14, bold: true, color: '#1a1a1a', alignment: 'right', margin: [0, 5, 0, 5] },
                kpiValueNetLeft: { fontSize: 14, bold: true, alignment: 'right', margin: [0, 5, 0, 5] },
                
                kpiHeader: { alignment: 'center', fontSize: 9, color: '#888', bold: true, margin: [0, 5, 0, 5], textTransform: 'uppercase' },
                kpiValue: { alignment: 'center', fontSize: 14, bold: true, color: '#1a1a1a', margin: [0, 10, 0, 10] },
                kpiValueNet: { alignment: 'center', fontSize: 14, bold: true, margin: [0, 10, 0, 10] },
                tableHeader: { bold: true, fontSize: 9, color: '#ffffff', fillColor: agenceCouleur, margin: [0, 8, 0, 8] }
            }
        };

        let pdf = pdfMake.createPdf(docDefinition);
        
        if (action === 'view' && targetWindow) {
            pdf.getBlob((blob) => {
                const blobUrl = URL.createObjectURL(blob);
                targetWindow.document.body.innerHTML = `<iframe src="${blobUrl}#view=FitH" style="width:100vw; height:100vh; border:none; margin:0; padding:0; display:block;"></iframe>`;
            });
        } else {
            pdf.download(agenceNom.replace(/\s+/g, '_') + '_Bilan_Technique_' + idRapport + '.pdf');
            if(btn) {
                setTimeout(() => { btn.innerText = "Télécharger le rapport PDF Officiel"; }, 1500);
            }
        }
    } catch(err) {
        console.error("Erreur PDF:", err);
        showToast("Erreur lors de la génération du PDF.", "error");
        if (targetWindow) {
            targetWindow.document.body.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100vh; color:white; font-family:sans-serif; background-color:#cc0000;"><h3>Erreur. Veuillez fermer cet onglet et réessayer.</h3></div>`;
        }
        if(btn && action !== 'view') btn.innerText = "Télécharger le rapport PDF Officiel";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem('auditpro_cookies')) {
        document.getElementById('cookie-banner').style.display = 'block';
    }

    document.getElementById('nomAgenceInput').value = agenceNom !== 'AuditPro' ? agenceNom : '';
    document.getElementById('couleurAgenceInput').value = agenceCouleur;
    if(agenceLogoBase64) {
        document.getElementById('logo-preview').src = agenceLogoBase64;
        document.getElementById('logo-preview').style.display = 'block';
    }
    appliquerCouleurMarqueBlanche();
    chargerHistorique();

    document.querySelectorAll('.price-input').forEach(input => {
        input.addEventListener('input', formatInputNumber);
    });

    const liensMenu = document.querySelectorAll('nav a[href^="#"]');
    const blocsOnglets = document.querySelectorAll('.tab-content');

    function changerOnglet(targetId) {
        liensMenu.forEach(lien => lien.classList.remove('active'));
        blocsOnglets.forEach(onglet => onglet.classList.remove('active'));

        const lienActif = document.querySelector(`nav a[href="${targetId}"]`);
        if (lienActif) {
            lienActif.classList.add('active');
            lienActif.style.color = agenceCouleur;
            lienActif.style.borderBottomColor = agenceCouleur;
        }

        const ongletCible = document.getElementById(`${targetId.substring(1)}-tab`);
        if (ongletCible) ongletCible.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    liensMenu.forEach(lien => {
        lien.addEventListener('click', function(e) {
            e.preventDefault();
            liensMenu.forEach(l => { l.style.color = '#fff'; l.style.borderBottomColor = 'transparent'; });
            changerOnglet(this.getAttribute('href'));
        });
    });

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('fichierPdf');
    const dropZoneText = document.querySelector('.drop-zone-text');

    if (dropZone && fileInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => { dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false); });
        ['dragleave', 'drop'].forEach(eventName => { dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false); });
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                dropZoneText.innerHTML = `Document chargé : <b>${this.files[0].name}</b>`;
                dropZone.style.borderColor = agenceCouleur;
                dropZone.style.background = "#f4fbf7";
                document.querySelector('.drop-icon').style.color = agenceCouleur;
            }
        });
    }
});
