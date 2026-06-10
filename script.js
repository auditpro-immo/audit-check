// --- SÉCURITÉ : SYSTÈME D'ABONNEMENT SÉCURISÉ ---
function lireAcces() {
    try {
        let tk = localStorage.getItem('_ap_xtk_');
        if (!tk) return 'gratuit';
        return atob(tk).split('|')[0]; 
    } catch(e) { return 'gratuit'; }
}

function definirAcces(niveau) {
    localStorage.setItem('_ap_xtk_', btoa(niveau + '|' + Date.now()));
    userPlan = niveau;
}

let userPlan = lireAcces(); 
let analysesCount = parseInt(localStorage.getItem('_ap_cnt_')) || 0;
let logoClicks = 0;
// --------------------------------------------------

let donneesAudit = null;
let idRapport = "";
let chartInstance = null;
let loyerMensuelSaisi = 0;
let profilActuel = localStorage.getItem('auditpro_profil') || "particulier";

let comparateur = JSON.parse(localStorage.getItem('auditpro_comparateur')) || [];

let agenceNom = localStorage.getItem('auditpro_agence_nom') || 'AuditPro';
let agenceCouleur = localStorage.getItem('auditpro_agence_couleur') || '#3B82F6';
let agenceLogoBase64 = localStorage.getItem('auditpro_agence_logo') || null;

let fraisNotaireEstimes = parseFloat(localStorage.getItem('auditpro_frais_notaire')) || 8.0;
let margeSecuriteTravaux = parseFloat(localStorage.getItem('auditpro_marge_secu')) || 10.0;

const colorConfigDPE = { "A": "#00923E", "B": "#52B153", "C": "#A5D700", "D": "#FDF200", "E": "#F39611", "F": "#EB3223", "G": "#D30F1F", "N/A": "#888888" };
const colorConfigGES = { "A": "#F2E8FA", "B": "#E1C9F2", "C": "#D0AAEA", "D": "#BF8BE2", "E": "#AE6CD9", "F": "#9D4DD1", "G": "#7A35A3", "N/A": "#888888" };

function getSvgArrow(lettre, type) {
    lettre = lettre ? lettre.toUpperCase() : "N/A";
    const color = type === "DPE" ? (colorConfigDPE[lettre] || "#888888") : (colorConfigGES[lettre] || "#888888");
    let txtCol = (lettre === "C" || lettre === "D" || lettre === "N/A" || (type === "GES" && ["A","B","C"].includes(lettre))) ? "#000000" : "#ffffff";
    return `
    <svg width="80" height="30" viewBox="0 0 100 35" xmlns="http://www.w3.org/2000/svg">
        <polygon points="0,0 80,0 100,17.5 80,35 0,35" fill="${color}" />
        <text x="45" y="24" font-family="Helvetica, sans-serif" font-size="18" font-weight="bold" fill="${txtCol}" text-anchor="middle">${lettre}</text>
    </svg>`;
}

function getCleanPdfSvg(lettre, type) {
    lettre = lettre ? lettre.toUpperCase() : "N/A";
    const color = type === "DPE" ? (colorConfigDPE[lettre] || "#888888") : (colorConfigGES[lettre] || "#888888");
    const txtCol = (lettre === "C" || lettre === "D" || lettre === "N/A" || (type === "GES" && ["A","B","C"].includes(lettre))) ? "#000000" : "#ffffff";
    return `<svg width="65" height="26" viewBox="0 0 70 30" xmlns="http://www.w3.org/2000/svg">
        <polygon points="0,0 55,0 70,15 55,30 0,30" fill="${color}" />
        <text x="30" y="21" font-family="Helvetica, sans-serif" font-size="15" font-weight="bold" fill="${txtCol}" text-anchor="middle">${lettre}</text>
    </svg>`;
}

function entrerSurLeSite(profil) {
    const portal = document.getElementById('welcome-portal');
    const mainApp = document.getElementById('main-app');
    portal.style.opacity = '0';
    setTimeout(() => {
        portal.style.display = 'none';
        mainApp.style.display = 'block';
        mainApp.style.opacity = '1';
        changerProfilInterne(profil);
    }, 600);
}

function updateNavLocks() {
    const lockComparateur = document.querySelector('#nav-comparateur .lock-icon');
    const lockParam = document.querySelector('#nav-param-particulier .lock-icon');
    const lockPro = document.querySelector('#nav-pro .lock-icon');

    if(lockComparateur) lockComparateur.style.display = userPlan === 'gratuit' ? 'inline' : 'none';
    if(lockParam) lockParam.style.display = userPlan === 'gratuit' ? 'inline' : 'none';
    if(lockPro) lockPro.style.display = userPlan !== 'pro' ? 'inline' : 'none';
}

function changerProfilInterne(profil) {
    profilActuel = profil;
    localStorage.setItem('auditpro_profil', profilActuel);
    
    document.getElementById('btn-particulier').classList.remove('active');
    document.getElementById('btn-pro').classList.remove('active');
    
    let targetId = profil === 'professionnel' ? 'btn-pro' : 'btn-particulier';
    let btnActif = document.getElementById(targetId);
    if(btnActif) btnActif.classList.add('active');

    document.getElementById('bloc-renov').style.display = profil === 'particulier' ? 'block' : 'none';
    document.getElementById('nav-comparateur').style.display = profil === 'particulier' ? 'inline-block' : 'none';
    document.getElementById('nav-param-particulier').style.display = profil === 'particulier' ? 'inline-block' : 'none';
    document.getElementById('nav-pro').style.display = profil === 'professionnel' ? 'inline-block' : 'none';

    updateNavLocks();

    if(profil === "professionnel") {
        document.getElementById('hero-badge').innerText = "Espace Professionnels (B2B)";
        document.getElementById('hero-title').innerText = "Justifiez vos estimations et sécurisez vos transactions.";
        document.getElementById('hero-desc').innerText = "Notre technologie d'analyse traduit instantanément les PDF de diagnostics en rapports chiffrés pour convaincre vos clients.";
        document.getElementById('form-title').innerText = "Simulateur pour les agences";
    } else {
        document.getElementById('hero-badge').innerText = "L'intelligence au service de l'immo";
        document.getElementById('hero-title').innerText = "Sécurisez votre achat en chiffrant les travaux cachés.";
        document.getElementById('hero-desc').innerText = "Notre outil analyse l'ensemble des diagnostics obligatoires de la maison que vous visitez. Obtenez le coût estimatif des remises aux normes.";
        document.getElementById('form-title').innerText = "Configuration de l'analyse";
        renderComparateur(); 
    }
    
    chargerHistorique(); 
    if(donneesAudit) afficherEcran(); 
}

document.getElementById('logoUploadInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const nomFichierSpan = document.getElementById('logo-file-name');
    if (file) {
        nomFichierSpan.innerText = file.name;
        nomFichierSpan.style.color = "#0F172A";
        nomFichierSpan.style.fontWeight = "bold";
        const reader = new FileReader();
        reader.onload = function(e) {
            agenceLogoBase64 = e.target.result;
            document.getElementById('logo-preview').src = agenceLogoBase64;
            document.getElementById('logo-preview').style.display = 'block';
        }
        reader.readAsDataURL(file);
    } else {
        nomFichierSpan.innerText = "Aucun fichier";
        nomFichierSpan.style.color = "#64748B";
        nomFichierSpan.style.fontWeight = "normal";
    }
});

function appliquerCouleurMarqueBlanche() {
    document.getElementById('header-logo-text').innerText = agenceNom === 'AuditPro' ? 'Audit' : agenceNom;
    
    // Injection propre des variables CSS
    document.documentElement.style.setProperty('--theme-color', agenceCouleur);
    
    let hex = agenceCouleur.replace('#', '');
    if(hex.length === 3) hex = hex.split('').map(x => x+x).join('');
    let r = parseInt(hex.substring(0,2), 16), g = parseInt(hex.substring(2,4), 16), b = parseInt(hex.substring(4,6), 16);
    
    document.documentElement.style.setProperty('--theme-color-light', `rgba(${r}, ${g}, ${b}, 0.1)`);
}

function changerCouleurParticulierTemporaire(couleur) {
    agenceCouleur = couleur;
    appliquerCouleurMarqueBlanche();
}

function sauvegarderParametresParticulier() {
    if (!localStorage.getItem('auditpro_cookies')) {
        return showToast("Veuillez accepter la sauvegarde locale (bandeau en bas) pour activer cette fonction.", "error");
    }
    fraisNotaireEstimes = parseFloat(document.getElementById('fraisNotaireInput').value) || 0;
    margeSecuriteTravaux = parseFloat(document.getElementById('margeSecuriteInput').value) || 0;
    let couleurChoisie = document.getElementById('couleurParticulierInput').value;

    if (userPlan === 'gratuit' && couleurChoisie !== '#3B82F6') {
        localStorage.setItem('auditpro_frais_notaire', fraisNotaireEstimes);
        localStorage.setItem('auditpro_marge_secu', margeSecuriteTravaux);
        document.getElementById('couleurParticulierInput').value = '#3B82F6';
        changerCouleurParticulierTemporaire('#3B82F6');
        if(donneesAudit) afficherEcran();
        return showToast("Le thème visuel nécessite l'abonnement Particulier. Vos autres réglages (Notaire, Matelas) ont été sauvegardés.", "error");
    }

    agenceCouleur = couleurChoisie;
    localStorage.setItem('auditpro_frais_notaire', fraisNotaireEstimes);
    localStorage.setItem('auditpro_marge_secu', margeSecuriteTravaux);
    localStorage.setItem('auditpro_agence_couleur', agenceCouleur);
    
    appliquerCouleurMarqueBlanche();
    if(donneesAudit) afficherEcran();
    if(comparateur.length > 0) renderComparateur();
    showToast("Paramètres sauvegardés avec succès !");
}

function reinitialiserParametresParticulier() {
    localStorage.removeItem('auditpro_frais_notaire');
    localStorage.removeItem('auditpro_marge_secu');
    localStorage.removeItem('auditpro_agence_couleur');

    fraisNotaireEstimes = 8.0;
    margeSecuriteTravaux = 10.0;
    agenceCouleur = '#3B82F6';

    document.getElementById('fraisNotaireInput').value = '8';
    document.getElementById('margeSecuriteInput').value = '10';
    document.getElementById('couleurParticulierInput').value = '#3B82F6';

    let inputPro = document.getElementById('couleurAgenceInput');
    if(inputPro) inputPro.value = '#3B82F6';

    appliquerCouleurMarqueBlanche();
    if(donneesAudit) afficherEcran();
    if(comparateur.length > 0) renderComparateur();
    showToast("Réinitialisation effectuée.");
}

function sauvegarderParametresPro() {
    if (userPlan !== 'pro') {
        document.querySelector('nav a[href="#abonnements"]').click();
        return showToast("Verrouillé. L'espace Agence nécessite l'abonnement Premium Pro.", "error");
    }
    if (!localStorage.getItem('auditpro_cookies')) {
        return showToast("Veuillez accepter la sauvegarde locale (bandeau en bas) pour activer cette fonction.", "error");
    }
    const inputNom = document.getElementById('nomAgenceInput').value.trim();
    agenceNom = inputNom !== "" ? inputNom : "AuditPro";
    agenceCouleur = document.getElementById('couleurAgenceInput').value;
    
    localStorage.setItem('auditpro_agence_nom', agenceNom);
    localStorage.setItem('auditpro_agence_couleur', agenceCouleur);
    localStorage.setItem('auditpro_crm_webhook', document.getElementById('webhookCrmInput').value);
    if(agenceLogoBase64) {
        localStorage.setItem('auditpro_agence_logo', agenceLogoBase64);
    }
    
    let inputPart = document.getElementById('couleurParticulierInput');
    if(inputPart) inputPart.value = agenceCouleur;

    appliquerCouleurMarqueBlanche();
    chargerHistorique(); 
    if(donneesAudit) afficherEcran(); 
    showToast("Paramètres Agence sauvegardés localement avec succès !");
}

function reinitialiserMarqueBlanche() {
    localStorage.removeItem('auditpro_agence_nom');
    localStorage.removeItem('auditpro_agence_couleur');
    localStorage.removeItem('auditpro_agence_logo');
    localStorage.removeItem('auditpro_crm_webhook');
    localStorage.removeItem('auditpro_frais_notaire');
    localStorage.removeItem('auditpro_marge_secu');
    
    agenceNom = 'AuditPro';
    agenceCouleur = '#3B82F6';
    agenceLogoBase64 = null;
    fraisNotaireEstimes = 8.0;
    margeSecuriteTravaux = 10.0;
    
    document.getElementById('nomAgenceInput').value = '';
    document.getElementById('couleurAgenceInput').value = '#3B82F6';
    document.getElementById('couleurParticulierInput').value = '#3B82F6';
    document.getElementById('fraisNotaireInput').value = '8';
    document.getElementById('margeSecuriteInput').value = '10';
    document.getElementById('webhookCrmInput').value = '';
    document.getElementById('logo-preview').style.display = 'none';
    document.getElementById('logo-preview').src = '';
    document.getElementById('logo-file-name').innerText = "Aucun fichier";
    document.getElementById('logo-file-name').style.color = "#64748B";
    document.getElementById('logo-file-name').style.fontWeight = "normal";
    
    appliquerCouleurMarqueBlanche(); 
    chargerHistorique(); 
    
    if(donneesAudit) afficherEcran(); 
    if(comparateur.length > 0) renderComparateur();
    showToast("L'interface a retrouvé ses paramètres par défaut.");
}

function accepterCookies() {
    localStorage.setItem('auditpro_cookies', 'true');
    document.getElementById('cookie-banner').style.display = 'none';
    showToast("Mode de sauvegarde locale activé.");
}

function getHistoriqueKey() {
    return profilActuel === "professionnel" ? 'auditpro_historique_pro' : 'auditpro_historique_particulier';
}

function chargerHistorique() {
    const historiqueTable = document.getElementById('historiqueTableBody');
    if(!historiqueTable) return;
    
    const histKey = getHistoriqueKey();
    const historique = JSON.parse(localStorage.getItem(histKey)) || [];
    historiqueTable.innerHTML = '';
    
    if(historique.length === 0) {
        historiqueTable.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94A3B8; padding: 20px;">Aucun historique de simulation enregistré dans cet espace.</td></tr>';
        return;
    }
    
    historique.reverse().forEach((dossier, index) => {
        let realIndex = historique.length - 1 - index;
        historiqueTable.innerHTML += `
            <tr class="history-row">
                <td style="font-size: 13px; font-weight: 500;">${dossier.date}</td>
                <td style="font-size: 13px; font-weight: 600; color: #0F172A;">${dossier.ville}</td>
                <td style="font-size: 13px; font-weight: 600;">${formatNumber(dossier.prixInitial)} €</td>
                <td style="text-align: right;">
                    <div style="display:flex; justify-content:flex-end; gap:8px;">
                        <button class="btn-voir" onclick="voirPDFDirect(event, ${realIndex})">Voir</button>
                        <button class="btn-pdf" onclick="telechargerDirect(event, ${realIndex})">PDF</button>
                    </div>
                </td>
            </tr>
        `;
    });
}

function ajouterAuHistorique(ville, prixInitial, donneesCompletes) {
    if (!localStorage.getItem('auditpro_cookies')) return;
    const histKey = getHistoriqueKey();
    const historique = JSON.parse(localStorage.getItem(histKey)) || [];
    historique.push({
        id: "AUDIT-" + Math.floor(Math.random() * 90000 + 10000),
        date: new Date().toLocaleDateString('fr-FR'),
        ville: ville,
        prixInitial: prixInitial,
        data: donneesCompletes,
        loyer: loyerMensuelSaisi
    });
    localStorage.setItem(histKey, JSON.stringify(historique));
    chargerHistorique();
}

function chargerDossierHistorique(index) {
    const histKey = getHistoriqueKey();
    const historique = JSON.parse(localStorage.getItem(histKey)) || [];
    const dossier = historique[index];
    donneesAudit = dossier.data;
    idRapport = dossier.id;
    loyerMensuelSaisi = dossier.loyer || 0;
    
    document.getElementById('prixInitial').value = formatNumber(dossier.prixInitial);
    if(loyerMensuelSaisi > 0) document.getElementById('loyerMensuel').value = formatNumber(loyerMensuelSaisi);
    
    document.getElementById('result-wrapper').style.display = "block";
    if (document.getElementById('audit-tab').classList.contains('active')) {
        document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
    }
    afficherEcran();
}

function voirPDFDirect(event, index) {
    event.stopPropagation();
    chargerDossierHistorique(index);
    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
        pdfWindow.document.write(`
            <html lang='fr'>
            <head>
                <title>Rapport d'Analyse - ${agenceNom}</title>
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
    exporterPDF('view', pdfWindow);
}

function telechargerDirect(event, index) {
    event.stopPropagation();
    if (userPlan === 'gratuit' && index > 0) {
        document.querySelector('nav a[href="#abonnements"]').click();
        return showToast("L'exportation illimitée de l'historique nécessite un abonnement.", "error");
    }
    chargerDossierHistorique(index); 
    showToast("Génération du PDF en cours...");
    exporterPDF('download'); 
}

function viderHistorique() {
    if(confirm("Êtes-vous sûr de vouloir supprimer définitivement tout l'historique de cet espace ?")) {
        localStorage.removeItem(getHistoriqueKey());
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
    if(type === "error") { toast.classList.add('error'); }
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

// LOGIQUE DES ONGLETS CORRIGEE
function changerOnglet(targetId) {
    const blocsOnglets = document.querySelectorAll('.tab-content');
    blocsOnglets.forEach(onglet => {
        onglet.style.display = 'none';
        onglet.classList.remove('active');
    });

    const cleanId = targetId.replace('#', '') + '-tab';
    const ongletCible = document.getElementById(cleanId);
    
    if (ongletCible) {
        ongletCible.style.display = 'block';
        void ongletCible.offsetWidth; // Force le reflow pour l'animation
        ongletCible.classList.add('active');
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Mise à jour de l'apparence des liens de menu
    document.querySelectorAll('nav a').forEach(l => {
        l.classList.remove('active');
    });
    
    const lienActif = document.querySelector(`nav a[href="${targetId}"]`);
    if (lienActif) {
        lienActif.classList.add('active');
    }
}

function switchReportTab(tabId) {
    document.querySelectorAll('.report-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.report-pane').forEach(pane => pane.classList.remove('active'));
    
    let activeBtn = document.querySelector(`[onclick="switchReportTab('${tabId}')"]`);
    if(activeBtn) activeBtn.classList.add('active');
    
    document.getElementById(tabId).classList.add('active');
}

function switchProTab(tabId) {
    document.querySelectorAll('.pro-pane').forEach(pane => {
        pane.style.display = 'none';
        pane.classList.remove('active');
    });
    document.querySelectorAll('.btn-pro-tab').forEach(btn => {
        btn.classList.remove('active');
    });

    const activePane = document.getElementById(tabId);
    if(activePane) {
        if(tabId === 'pro-parametres') {
            activePane.style.display = 'flex';
        } else {
            activePane.style.display = 'block';
        }
        activePane.classList.add('active');
    }

    const activeBtn = document.querySelector(`[onclick="switchProTab('${tabId}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

function ajouterComparateur() {
    if (userPlan === 'gratuit') {
        changerOnglet('#abonnements');
        return showToast("Le comparateur est réservé aux abonnements Premium et Particulier.", "error");
    }

    if (!donneesAudit) return;
    if (comparateur.length >= 6) {
        return showToast("Le comparateur est plein (6 biens max). Supprimez-en un dans l'onglet 'Mon Comparateur'.", "error");
    }
    
    const inputLoyerTxt = document.getElementById('loyerMensuel').value.replace(/\s+/g, '');
    const loyer = Number(inputLoyerTxt) || loyerMensuelSaisi || 0;
    const prix = Number(document.getElementById('prixInitial').value.replace(/\s+/g, '')) || donneesAudit.prix_initial;
    
    let taux = parseFloat(document.getElementById('tauxRenov')?.value || 0);
    let resteACharge = donneesAudit.total_decote * (1 - taux);
    let travauxSecurises = resteACharge * (1 + (margeSecuriteTravaux / 100)); 

    let bien = {
        id: idRapport,
        ville: donneesAudit.localisation_exacte,
        prix: prix,
        travaux: travauxSecurises,
        loyer: loyer,
        dpe: donneesAudit.dpe_lettre || "N/A",
        ges: donneesAudit.ges_lettre || "N/A"
    };
    
    comparateur.push(bien);
    localStorage.setItem('auditpro_comparateur', JSON.stringify(comparateur));
    
    renderComparateur();
    showToast(`Bien sauvegardé dans le comparateur (${comparateur.length}/6) !`);
}

function supprimerComparateur(index) {
    comparateur.splice(index, 1);
    localStorage.setItem('auditpro_comparateur', JSON.stringify(comparateur));
    renderComparateur();
    showToast("Bien supprimé du comparateur.");
}

function renderComparateur() {
    const grid = document.getElementById('comparateur-grid');
    if (!grid) return;
    
    if (comparateur.length === 0) {
        grid.innerHTML = `<div class="comparateur-empty">Aucun bien dans le comparateur pour le moment.<br><br>Lancez une analyse et cliquez sur "Sauvegarder dans le comparateur".</div>`;
        return;
    }
    
    grid.innerHTML = comparateur.map((bien, index) => {
        let fraisNotaireActuels = bien.prix * (fraisNotaireEstimes / 100);
        let budgetReelTotal = bien.prix + bien.travaux + fraisNotaireActuels;
        
        let rentaBrute = bien.loyer > 0 ? (((bien.loyer * 12) / bien.prix) * 100).toFixed(2) + " %" : "N/A";
        let rentaNette = bien.loyer > 0 ? (((bien.loyer * 12) / budgetReelTotal) * 100).toFixed(2) + " %" : "N/A";

        return `
        <div class="compare-card theme-border-top">
            <h3>Bien à ${bien.ville.split(' ')[0]}</h3>
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <div style="width: 50%;">${getSvgArrow(bien.dpe, "DPE")}</div>
                <div style="width: 50%;">${getSvgArrow(bien.ges, "GES")}</div>
            </div>
            
            <div class="compare-data-row"><span>Prix affiché</span> <span>${formatNumber(bien.prix)} €</span></div>
            <div class="compare-data-row"><span>Frais notaire (~${fraisNotaireEstimes}%)</span> <span>+ ${formatNumber(fraisNotaireActuels)} €</span></div>
            <div class="compare-data-row"><span>Travaux (Sécurisés)</span> <span style="color:#EF4444;">+ ${formatNumber(bien.travaux)} €</span></div>
            <div class="compare-data-row" style="background:#F8FAFC; padding:12px; border-radius: 8px;"><span>BUDGET GLOBAL</span> <span class="theme-text">${formatNumber(budgetReelTotal)} €</span></div>
            
            <div class="compare-data-row" style="margin-top:15px;"><span>Rendement Brut</span> <span>${rentaBrute}</span></div>
            <div class="compare-data-row"><span>Rendement Réel (Post-tvx)</span> <span style="color:#0F172A;">${rentaNette}</span></div>
            
            <div class="compare-action" style="text-align: center;">
                <button class="btn-remove-compare" onclick="supprimerComparateur(${index})">Retirer ce bien</button>
            </div>
        </div>
        `;
    }).join('');
    appliquerCouleurMarqueBlanche(); 
}

function genererAnnonceLeBonCoin() {
    if (!donneesAudit) return;
    
    let prixBase = Number(document.getElementById('prixInitial').value.replace(/\s+/g, ''));
    let ville = donneesAudit.localisation_exacte.split(' ')[0];
    let dpe = donneesAudit.dpe_lettre || "Non spécifié";
    
    let texteAnnonce = `🚀 NOUVEAUTÉ - Opportunité à ${ville} !

Idéal investisseur ou premier achat. Nous vous proposons ce bien avec un fort potentiel, proposé au prix de ${formatNumber(prixBase)} €.

📊 DPE : Classe ${dpe}
Dans une démarche de transparence totale, notre agence a pré-chiffré l'évaluation technique du bien. Un budget d'environ ${formatNumber(donneesAudit.total_decote)} € est à anticiper pour une remise aux normes complète et/ou optimisation énergétique (dossier technique complet disponible sur demande après visite).

Pourquoi c'est une affaire ? 
Une fois les travaux réalisés à votre goût, ce bien révèlera toute sa valeur sur le marché de ${ville}. 

📞 Contactez l'agence ${agenceNom} dès aujourd'hui pour organiser une visite et consulter notre dossier d'accompagnement !`;

    document.getElementById('texteAnnonceAgenerer').innerText = texteAnnonce;
    document.getElementById('modalAnnonce').style.display = 'flex';
}

async function envoyer() {
    if (userPlan === 'gratuit' && analysesCount >= 3) {
        changerOnglet('#abonnements');
        return showToast("Vous avez atteint votre limite de 3 analyses gratuites. Veuillez souscrire à une offre.", "error");
    }

    const input = document.getElementById('fichierPdf');
    const prixInputBrut = document.getElementById('prixInitial').value.replace(/\s+/g, '');
    const prixInput = Number(prixInputBrut) || 0;
    const loyerInputBrut = document.getElementById('loyerMensuel').value.replace(/\s+/g, '');
    const loyerInput = Number(loyerInputBrut) || 0;
    const cpInput = document.getElementById('codePostal').value || "";
    
    if (prixInput <= 0) return showToast("Veuillez indiquer le prix de vente.", "error");
    if (!input.files.length) return showToast("Veuillez charger le fichier PDF.", "error");

    const maxSizeMB = 15;
    if (input.files[0].size > maxSizeMB * 1024 * 1024) {
        return showToast("Le fichier est trop lourd (Maximum 15 Mo).", "error");
    }
    
    loyerMensuelSaisi = loyerInput;
    document.getElementById('loading-overlay').style.display = "flex";

    const messagesIA = [
        "Lecture sécurisée et extraction du document...",
        "Analyse réglementaire des diagnostics...",
        "Calcul des devis moyens pour le département...",
        "Suppression des données et finalisation du rapport..."
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
        if (!reponse.ok) throw new Error("Erreur de connexion au serveur");
        donneesAudit = await reponse.json();
        donneesAudit.cp = cpInput;
        idRapport = "AUDIT-" + Math.floor(Math.random() * 90000 + 10000);
        
        clearInterval(loadInterval);
        document.getElementById('loading-overlay').style.display = "none";
        
        ajouterAuHistorique(donneesAudit.localisation_exacte, prixInput, donneesAudit);

        analysesCount++;
        localStorage.setItem('_ap_cnt_', analysesCount);

        showToast("Analyse effectuée avec succès.");
        document.getElementById('result-wrapper').style.display = "block";
        document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
        afficherEcran();

    } catch (e) {
        clearInterval(loadInterval);
        document.getElementById('loading-overlay').style.display = "none";
        showToast("Le document est illisible ou la connexion a échoué.", "error");
    }
}

function afficherEcran() {
    let anomalies = donneesAudit.diagnostics.filter(d => d.cout > 0);
    let prixInitialClean = Number(document.getElementById('prixInitial').value.replace(/\s+/g, ''));
    if(prixInitialClean === 0 && donneesAudit.prix_initial > 0) prixInitialClean = donneesAudit.prix_initial;
    
    let taux = parseFloat(document.getElementById('tauxRenov')?.value || 0);
    let resteACharge = donneesAudit.total_decote * (1 - taux);
    let travauxSecurises = profilActuel === 'particulier' ? resteACharge * (1 + (margeSecuriteTravaux / 100)) : resteACharge;

    let kpiRentabiliteHtml = "";
    if (loyerMensuelSaisi > 0) {
        let rentaInitiale = ((loyerMensuelSaisi * 12) / prixInitialClean) * 100;
        let fraisNotaireActuels = prixInitialClean * (fraisNotaireEstimes / 100);
        
        let coutTotalReel = profilActuel === 'particulier' 
                            ? prixInitialClean + travauxSecurises + fraisNotaireActuels 
                            : prixInitialClean + resteACharge; 
                            
        let rentaFinale = ((loyerMensuelSaisi * 12) / coutTotalReel) * 100;
        let titreRenta = profilActuel === 'particulier' ? "Rendement Réel (Travaux + Notaire)" : "Rendement Net (Post-Travaux)";

        kpiRentabiliteHtml = `
        <h3 style="text-transform: uppercase; font-size: 13px; font-weight: 800; color: #0F172A; margin-top: 30px; margin-bottom: 15px; letter-spacing: 0.05em;">Performance Locative Estimée (Budget Global)</h3>
        <div class="kpi-grid">
            <div class="kpi-box">
                <div class="kpi-label">Loyer Annuel Théorique</div>
                <div class="kpi-value" style="color: #0F172A;" id="anim-loyer">0 €</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label">Rendement Brut Hors Travaux</div>
                <div class="kpi-value" id="anim-renta-brute">0.00 %</div>
            </div>
            <div class="kpi-box main">
                <div class="kpi-label" style="color: #fff;">${titreRenta}</div>
                <div class="kpi-value" id="anim-renta-nette">0.00 %</div>
            </div>
        </div>`;
    }

    let dpeLet = donneesAudit.dpe_lettre || "N/A";
    let gesLet = donneesAudit.ges_lettre || "N/A";

    let badgesVisuelsHtml = `
    <div style="display: flex; gap: 20px; align-items: center;">
        <div style="text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #64748B; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">Énergie (DPE)</div>
            ${getSvgArrow(dpeLet, "DPE")}
        </div>
        <div style="text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #64748B; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">Climat (GES)</div>
            ${getSvgArrow(gesLet, "GES")}
        </div>
    </div>`;

    let scriptNegoTxt = "";
    let titreSectionNego = "";
    let defautsFormate = anomalies.length > 0 ? anomalies.map(a => "- " + a.titre).join('\n') : "- L'algorithme ne détecte aucun défaut technique justifiant une décote.";
    
    if (profilActuel === "particulier") {
        titreSectionNego = "Aide à la Décision (Acquéreur)";
        scriptNegoTxt = `RÉSUMÉ FACTUEL POUR VOTRE DÉCISION :

> VALEURS DE RÉFÉRENCE :
- Prix affiché par le vendeur : ${formatNumber(prixInitialClean)} €
- Total estimé des travaux de mise aux normes : ${formatNumber(donneesAudit.total_decote)} €
- Juste valeur technique indicative : ${formatNumber(donneesAudit.prix_net)} €

> JUSTIFICATION ESTIMATIVE DES TRAVAUX :
L'enveloppe de travaux s'appuie sur la lecture du rapport de diagnostic. Les points suivants nécessiteraient potentiellement une remise aux normes :
${defautsFormate}

L'évaluation prend également en compte la zone de localisation (${donneesAudit.localisation_exacte}). Ce document n'a pas de valeur légale et ne remplace pas l'avis d'un artisan certifié.`;
    } else {
        titreSectionNego = "Éléments Factuels pour la Transaction (Professionnel)";
        scriptNegoTxt = `SYNTHÈSE FACTUELLE DU DOSSIER :

> DONNÉES FINANCIÈRES :
- Écart technique calculé (estimatif) : ${formatNumber(donneesAudit.total_decote)} €
- Valeur nette recommandée pour positionnement : ${formatNumber(donneesAudit.prix_net)} €

> POINTS TECHNIQUES MAJEURS (ISSU DU DDT) :
${defautsFormate}

> IMPACT DU MARCHÉ LOCAL (${donneesAudit.localisation_exacte}) :
${donneesAudit.impact_marche}

NOTE D'UTILISATION :
Ces données constituent une base indicative. Face au vendeur, elles appuient mathématiquement un ajustement du prix de présentation. Face à l'acquéreur, cette transparence permet de l'aider à anticiper son financement. Le client reste libre et responsable de confirmer ces données via des devis artisanaux.`;
    }

    let libelleCoutTravaux = profilActuel === 'particulier' && margeSecuriteTravaux > 0 ? "Travaux à charge (Sécurisés)" : "Enveloppe Travaux (Est.)";

    let html = `
    <div style="border-bottom: 2px solid #F1F5F9; padding-bottom: 30px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 20px;">
        <div>
            <h2 style="font-size: 28px; color: #0F172A; font-weight: 800; margin: 0; letter-spacing: -0.02em;">Rapport d'Analyse Technique</h2>
            <div style="font-size: 15px; color: #64748B; margin-top: 8px; font-weight: 500;">Secteur analysé : <span style="color: #0F172A; font-weight: 700;">${donneesAudit.localisation_exacte}</span></div>
        </div>
        ${badgesVisuelsHtml}
        <div style="text-align: right; font-size: 13px; color: #94A3B8; font-weight: 600;">
            Dossier : <span style="color: #475569;">${idRapport}</span><br>Date : <span style="color: #475569;">${donneesAudit.date_audit}</span>
        </div>
    </div>
    
    <div class="report-tabs">
        <button class="report-tab-btn active" onclick="switchReportTab('paneFinancier')">1. Synthèse Financière</button>
        <button class="report-tab-btn" onclick="switchReportTab('paneTechnique')">2. Bilan Technique (DDT)</button>
        <button class="report-tab-btn" onclick="switchReportTab('paneStrategie')">3. Données d'Appui</button>
    </div>
    
    <div id="paneFinancier" class="report-pane active">
        <h3 style="text-transform: uppercase; font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 15px; letter-spacing: 0.05em;">Évaluation de la Balance Financière</h3>
        <div class="kpi-grid">
            <div class="kpi-box">
                <div class="kpi-label">Prix de vente initial</div>
                <div class="kpi-value" id="anim-prix-initial">0 €</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label" style="color: #EF4444;">${libelleCoutTravaux}</div>
                <div class="kpi-value" style="color: #EF4444;" id="anim-cout-travaux">-0 €</div>
            </div>
            <div class="kpi-box main">
                <div class="kpi-label" style="color: #fff;">Valeur Nette Recommandée</div>
                <div class="kpi-value" id="anim-prix-net">0 €</div>
            </div>
        </div>
        ${kpiRentabiliteHtml}
        <div style="background: #F8FAFC; padding: 24px; border-radius: 12px; margin-top: 30px; border: 1px solid #E2E8F0; text-align: left;">
            <h4 style="margin: 0 0 10px 0; color: #0F172A; text-transform: uppercase; font-size: 12px; font-weight: 800; letter-spacing: 0.05em;">Contexte du secteur géographique</h4>
            <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.6;">${donneesAudit.impact_marche}</p>
        </div>
    </div>
    
    <div id="paneTechnique" class="report-pane">
        ${anomalies.length > 0 ? `<div class="chart-container" style="display:flex; justify-content:center; margin-bottom: 30px;"><canvas id="coutChart" width="250" height="250" style="max-width:250px;"></canvas></div>` : ''}
        <div class="table-responsive">
            <table>
                <tr>
                    <th style="width: 25%;">Domaine Contrôlé</th>
                    <th style="width: 15%; text-align: center;">État Indicatif</th>
                    <th style="width: 45%;">Détails & Préconisations</th>
                    <th style="text-align: right; width: 15%;">Budget Est.</th>
                </tr>
                ${donneesAudit.diagnostics.map(a => `
                <tr>
                    <td style="font-weight: 700; color: #0F172A;">${a.titre}</td>
                    <td style="color: ${a.cout > 0 ? '#EF4444' : '#0F172A'}; font-weight: 700; text-align: center;">${a.cout > 0 ? 'ANOMALIE' : (a.statut === "Information" ? "INFO" : "SANS DÉFAUT")}</td>
                    <td style="font-size: 14px; color: #475569; line-height: 1.6;"><strong style="color: #334155;">Constat :</strong> ${a.detail}<br>${a.cout > 0 ? `<strong style="color: #334155;">Action recommandée :</strong> ${a.action}` : ''}</td>
                    <td style="font-weight:800; text-align: right; font-size: 16px; color: ${a.cout > 0 ? '#EF4444' : '#0F172A'};">${a.cout > 0 ? `-${formatNumber(a.cout)} €` : '0 €'}</td>
                </tr>`).join('')}
            </table>
        </div>
        <p style="font-size: 12px; color: #94A3B8; margin-top: 20px; font-weight: 500;">*Ces budgets sont issus d'une moyenne statistique nationale indexée sur votre code postal et ne valent en aucun cas devis ferme.</p>
    </div>
    
    <div id="paneStrategie" class="report-pane">
        <h3 style="text-transform: uppercase; font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 15px; letter-spacing: 0.05em;">${titreSectionNego}</h3>
        <p style="font-size: 15px; color: #475569; margin-bottom: 20px; text-align: left; line-height: 1.6;">Voici la synthèse chiffrée extraite de l'analyse, prête à appuyer vos arguments :</p>
        <div class="script-box theme-border-left">
            <button class="btn-copy" onclick="copierScript('texteScript')">Copier les données</button>
            <div id="texteScript">${scriptNegoTxt}</div>
        </div>
    </div>
    
    <div style="font-size: 11px; color: #94A3B8; text-align: justify; border-top: 1px solid #F1F5F9; padding-top: 20px; margin-top: 50px; line-height: 1.5;">
        <b>CADRE D'APPLICATION :</b> Cette étude est une simulation algorithmique d'aide à la décision. Elle est purement indicative et n'a aucune valeur juridique devant notaire.
    </div>`;

    document.getElementById('contenu-ecran').innerHTML = html;
    
    appliquerCouleurMarqueBlanche();

    animateValue(document.getElementById('anim-prix-initial'), 0, prixInitialClean, 1500);
    animateValue(document.getElementById('anim-cout-travaux'), 0, travauxSecurises, 1500, "-");
    animateValue(document.getElementById('anim-prix-net'), 0, donneesAudit.prix_net, 1500);

    if (loyerMensuelSaisi > 0) {
        let rentaInitiale = ((loyerMensuelSaisi * 12) / prixInitialClean) * 100;
        let fraisNotaireActuels = prixInitialClean * (fraisNotaireEstimes / 100);
        let coutTotalReel = profilActuel === 'particulier' ? prixInitialClean + travauxSecurises + fraisNotaireActuels : prixInitialClean + resteACharge;
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
                    backgroundColor: ['#0F172A', '#EF4444', '#334155', '#64748B', '#94A3B8', '#E2E8F0'] 
                }]
            },
            options: { 
                animation: false, 
                responsive: false, 
                plugins: { legend: { position: 'bottom' } },
                cutout: '70%'
            }
        });
    }

    const actionContainer = document.getElementById('action-buttons-container');
    if (profilActuel === 'professionnel') {
        if (userPlan === 'pro') {
            actionContainer.innerHTML = `
                <button class="btn-demo" onclick="exporterFicheVitrine()" style="flex: 1; border-color:#0F172A!important; color:#0F172A;">📄 Exporter Fiche Vitrine</button>
                <button class="btn-demo" onclick="genererAnnonceLeBonCoin()" style="flex: 1; border-color:#0F172A!important; color:#0F172A;">📝 Générer texte d'annonce</button>
            `;
        } else {
            actionContainer.innerHTML = `
                <div style="width: 100%; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; border-radius: 12px; font-size: 14px; color: #475569;">
                    <strong style="color: #0F172A;">🔒 Outils Premium Verrouillés :</strong> Souscrivez à l'abonnement Premium Pro pour débloquer ces options.
                </div>
            `;
        }
    } else {
        actionContainer.innerHTML = `
            <button class="btn-demo" onclick="ajouterComparateur()" style="flex: 1; border-color: #0F172A!important; color:#0F172A; font-weight: 700;">⭐ Sauvegarder dans le comparateur</button>
        `;
    }
}

function exporterPDF(action = 'download', targetWindow = null) {
    if (!donneesAudit) return;
    const btn = document.getElementById('btnExport');
    if(btn && action !== 'view') btn.innerText = "Édition du PDF en cours...";
    
    let dpeBadgeBlock = { stack: [ {text: 'ÉNERGIE (DPE)', fontSize: 7, bold:true, color:'#64748B', margin:[0,0,0,2]}, {svg: getCleanPdfSvg(donneesAudit.dpe_lettre, "DPE"), width: 60} ], margin: [0, 5, 5, 15] };
    let gesBadgeBlock = { stack: [ {text: 'CLIMAT (GES)', fontSize: 7, bold:true, color:'#64748B', margin:[0,0,0,2]}, {svg: getCleanPdfSvg(donneesAudit.ges_lettre, "GES"), width: 60} ], margin: [0, 5, 0, 15] };

    let prixInitFormate = formatNumber(document.getElementById('prixInitial').value.replace(/\s+/g, '')) + ' €';
    let taux = parseFloat(document.getElementById('tauxRenov')?.value || 0);
    let resteACharge = donneesAudit.total_decote * (1 - taux);
    let travauxSecurises = profilActuel === 'particulier' ? resteACharge * (1 + (margeSecuriteTravaux / 100)) : resteACharge;
    
    let decoteFormate = '-' + formatNumber(travauxSecurises) + ' €';
    if (taux > 0) decoteFormate += "\n(Après aides ANAH)";
    if (profilActuel === 'particulier' && margeSecuriteTravaux > 0) decoteFormate += `\n(+${margeSecuriteTravaux}% sécurité)`;

    let prixNetFormate = formatNumber(donneesAudit.prix_net) + ' €';

    let tableBody = [
        [
            { text: 'DOMAINE CONTRÔLÉ', style: 'tableHeader' },
            { text: 'ÉTAT', style: 'tableHeader', alignment: 'center' },
            { text: 'DÉTAILS TECHNIQUES & ACTIONS', style: 'tableHeader' },
            { text: 'BUDGET EST.', style: 'tableHeader', alignment: 'right' }
        ]
    ];

    donneesAudit.diagnostics.forEach((a, index) => {
        let isAnomalie = a.cout > 0;
        let rowColor = (index % 2 === 0) ? '#F8FAFC' : '#ffffff'; 
        
        tableBody.push([
            { text: a.titre, bold: true, fontSize: 9, color: '#0F172A', fillColor: rowColor, margin: [0, 10, 0, 10] },
            { text: isAnomalie ? 'ANOMALIE' : (a.statut === "Information" ? 'INFO' : 'SANS DÉFAUT'), bold: true, fontSize: 8, color: isAnomalie ? '#EF4444' : agenceCouleur, alignment: 'center', fillColor: rowColor, margin: [0, 10, 0, 10] },
            { text: `Constat : ${a.detail}\n` + (isAnomalie ? `Action recommandée : ${a.action}` : ''), fontSize: 9, lineHeight: 1.4, color: '#334155', fillColor: rowColor, margin: [0, 10, 0, 10] },
            { text: isAnomalie ? '-' + formatNumber(a.cout) + ' €' : '0 €', bold: true, fontSize: 10, color: isAnomalie ? '#EF4444' : '#0F172A', alignment: 'right', fillColor: rowColor, margin: [0, 10, 0, 10] }
        ]);
    });

    let logoBlock = agenceLogoBase64 
        ? { image: agenceLogoBase64, fit: [150, 55], alignment: 'left' }
        : { text: agenceNom.toUpperCase(), fontSize: 24, bold: true, color: agenceCouleur, alignment: 'left', letterSpacing: 1 };

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
        margin: [0, 0, 0, 40]
    };

    let anomalies = donneesAudit.diagnostics.filter(d => d.cout > 0);
    let chartImageBlock = {};
    if (anomalies.length > 0) {
        let chartCanvas = document.getElementById('coutChart');
        if (chartCanvas) {
            let dataUrl = chartCanvas.toDataURL('image/png', 1.0);
            if (dataUrl && dataUrl.length > 20) {
                chartImageBlock = { image: dataUrl, width: 130, alignment: 'center', margin: [0, 10, 0, 0] };
            }
        }
    }

    let rentaBlock = [];
    if (loyerMensuelSaisi > 0) {
        let prixInitial = Number(document.getElementById('prixInitial').value.replace(/\s+/g, ''));
        let rentaInitiale = ((loyerMensuelSaisi * 12) / prixInitial) * 100;
        let fraisNotaireActuels = prixInitial * (fraisNotaireEstimes / 100);
        
        let coutTotalReel = profilActuel === 'particulier' ? prixInitial + travauxSecurises + fraisNotaireActuels : prixInitial + resteACharge; 
        let rentaFinale = ((loyerMensuelSaisi * 12) / coutTotalReel) * 100;
        
        let headerRentaReel = profilActuel === 'particulier' ? 'Rendement Réel (Tvx + Notaire)' : 'Rendement Net (Post-Tvx)';

        rentaBlock = [
            { text: 'PERFORMANCE LOCATIVE (Budget Global inclus)', style: 'sectionTitle', color: agenceCouleur, margin: [0, 15, 0, 10] },
            {
                table: {
                    widths: ['*', '*', '*'],
                    body: [
                        [ { text: 'Loyer Annuel Théorique', style: 'kpiHeader' }, { text: 'Rendement Brut', style: 'kpiHeader' }, { text: headerRentaReel, style: 'kpiHeader' } ],
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
                return { canvas: [ { type: 'rect', x: 0, y: 0, w: 15, h: 842, color: agenceCouleur } ] };
            },
            header: function(currentPage) {
                if (currentPage > 1) {
                    return {
                        columns: [
                            { text: agenceNom.toUpperCase() + ' - DOSSIER ÉVALUATIF', bold: true, color: '#64748B', fontSize: 9 },
                            { text: 'Réf. ' + idRapport, alignment: 'right', color: '#64748B', fontSize: 9 }
                        ], margin: [50, 20, 40, 0]
                    };
                }
            },
            footer: function(currentPage, pageCount) {
                return {
                    columns: [
                        { text: 'Document d\'aide à la décision. Ne se substitue pas à l\'avis d\'un artisan RGE.', fontSize: 8, color: '#94A3B8', italics: true },
                        { text: 'Page ' + currentPage.toString() + ' / ' + pageCount, alignment: 'right', fontSize: 8, color: '#94A3B8', bold: true }
                    ], margin: [50, 20, 40, 0]
                };
            },
            content: [
                headerTop,
                { text: 'RAPPORT D\'ANALYSE INDICATIVE', fontSize: 18, color: '#0F172A', bold: true, margin: [0, 0, 0, 5] },
                { text: 'Évaluation algorithmique des coûts de remise aux normes basée sur le DDT.', fontSize: 11, color: '#475569', margin: [0, 0, 0, 25], italics: true },
                
                {
                    columns: [
                        {
                            width: '60%',
                            stack: [
                                { text: '1. SYNTHÈSE DES VALORISATIONS', style: 'sectionTitle', color: agenceCouleur },
                                { columns: [dpeBadgeBlock, gesBadgeBlock], margin: [0, 5, 0, 15] },
                                {
                                    table: {
                                        widths: ['*', '*'],
                                        body: [
                                            [ { text: 'Prix de Vente Initial', style: 'kpiHeaderLeft' }, { text: prixInitFormate, style: 'kpiValueLeft' } ],
                                            [ { text: 'Travaux à charge (Est.)', style: 'kpiHeaderLeft', color: '#EF4444' }, { text: decoteFormate, style: 'kpiValueLeft', color: '#EF4444', fontSize: 10 } ],
                                            [ { text: 'Valeur Nette Recommandée', style: 'kpiHeaderLeft', bold: true }, { text: prixNetFormate, style: 'kpiValueNetLeft', color: agenceCouleur } ]
                                        ]
                                    },
                                    layout: { hLineWidth: function() { return 1; }, vLineWidth: function() { return 0; }, hLineColor: function() { return '#E2E8F0'; }, paddingBottom: function() { return 8; }, paddingTop: function() { return 8; } },
                                    margin: [0, 0, 0, 20]
                                }
                            ]
                        },
                        {
                            width: '40%',
                            stack: [
                                anomalies.length > 0 ? { text: 'RÉPARTITION DU BUDGET ESTIMATIF', fontSize: 10, bold: true, alignment: 'center', color: '#475569', margin: [0, 0, 0, 5] } : {},
                                chartImageBlock
                            ]
                        }
                    ],
                    columnGap: 20
                },
                
                ...rentaBlock,

                {
                    table: { widths: ['*'], body: [ [ { stack: [ { text: 'CONTEXTE MACRO-ÉCONOMIQUE', fontSize: 10, bold: true, color: '#fff', margin: [0, 0, 0, 4] }, { text: donneesAudit.impact_marche, fontSize: 9, color: '#F8FAFC', lineHeight: 1.4 } ], padding: 12, fillColor: '#0F172A' } ] ] },
                    layout: 'noBorders', margin: [0, 10, 0, 30]
                },
                
                { text: '2. LECTURE ALGORITHMIQUE DU DDT', style: 'sectionTitle', color: agenceCouleur, margin: [0, 10, 0, 10] },
                {
                    table: { headerRows: 1, widths: ['25%', '15%', '45%', '15%'], body: tableBody },
                    layout: { 
                        hLineWidth: function (i, node) { return (i === 0 || i === 1 || i === node.table.body.length) ? 2 : 1; }, 
                        vLineWidth: function () { return 0; }, 
                        hLineColor: function (i, node) { return (i === 0 || i === node.table.body.length) ? agenceCouleur : '#E2E8F0'; },
                        paddingTop: function() { return 6; }, 
                        paddingBottom: function() { return 6; } 
                    }
                },

                { text: 'AVERTISSEMENT LÉGAL ET CADRE D\'UTILISATION', fontSize: 10, bold: true, color: '#0F172A', margin: [0, 30, 0, 5] },
                { text: 'Cette analyse est le résultat d\'une lecture automatisée des documents fournis. Les tarifs indiqués sont des moyennes statistiques régionales pondérées par notre algorithme et n\'engagent en rien la responsabilité de l\'éditeur. Ce document n\'a pas de force probante chez le notaire et ne constitue pas une véritable expertise de bâtiment. Il incombe à l\'acquéreur ou au vendeur de faire confirmer ces estimations techniques par des devis formels délivrés par des artisans compétents et assurés.', fontSize: 8, color: '#64748B', alignment: 'justify', lineHeight: 1.4 }
            ],
            styles: {
                coverTableTitle: { fontSize: 10, bold: true, color: '#0F172A', alignment: 'right', margin: [0, 6, 0, 6], letterSpacing: 1 },
                coverLabel: { fontSize: 9, bold: true, color: '#64748B', alignment: 'right', margin: [0, 2, 10, 2] },
                coverValue: { fontSize: 9, color: '#0F172A', margin: [10, 2, 0, 2], bold: true },
                sectionTitle: { fontSize: 13, bold: true, color: '#0F172A', margin: [0, 0, 0, 15], textTransform: 'uppercase' },
                
                kpiHeaderLeft: { fontSize: 10, color: '#475569', margin: [0, 5, 0, 5] },
                kpiValueLeft: { fontSize: 14, bold: true, color: '#0F172A', alignment: 'right', margin: [0, 5, 0, 5] },
                kpiValueNetLeft: { fontSize: 14, bold: true, alignment: 'right', margin: [0, 5, 0, 5] },
                
                kpiHeader: { alignment: 'center', fontSize: 8, color: '#64748B', bold: true, margin: [0, 5, 0, 5], textTransform: 'uppercase' },
                kpiValue: { alignment: 'center', fontSize: 12, bold: true, color: '#0F172A', margin: [0, 10, 0, 10] },
                kpiValueNet: { alignment: 'center', fontSize: 12, bold: true, margin: [0, 10, 0, 10] },
                tableHeader: { bold: true, fontSize: 8, color: '#ffffff', fillColor: agenceCouleur, margin: [0, 8, 0, 8] }
            }
        };

        let pdf = pdfMake.createPdf(docDefinition);
        
        if (action === 'view' && targetWindow) {
            pdf.getBlob((blob) => {
                const blobUrl = URL.createObjectURL(blob);
                targetWindow.document.body.innerHTML = `<iframe src="${blobUrl}#view=FitH" style="width:100vw; height:100vh; border:none; margin:0; padding:0; display:block;"></iframe>`;
            });
            if(btn) btn.innerText = "Télécharger le rapport détaillé (PDF)";
        } else {
            pdf.download(agenceNom.replace(/\s+/g, '_') + '_Bilan_Technique_' + idRapport + '.pdf');
            if(btn) {
                setTimeout(() => { btn.innerText = "Télécharger le rapport détaillé (PDF)"; }, 1500);
            }
        }
    } catch(err) {
        console.error("Erreur PDF:", err);
        showToast("Erreur lors de la génération du PDF.", "error");
        if (targetWindow) {
            targetWindow.document.body.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100vh; color:white; font-family:sans-serif; background-color:#EF4444;"><h3>Erreur. Veuillez fermer cet onglet et réessayer.</h3></div>`;
        }
        if(btn && action !== 'view') btn.innerText = "Télécharger le rapport détaillé (PDF)";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem('auditpro_cookies')) {
        document.getElementById('cookie-banner').style.display = 'block';
    }

    if (localStorage.getItem('auditpro_profil')) {
        changerProfilInterne(localStorage.getItem('auditpro_profil'));
    } else {
        changerProfilInterne("particulier");
    }

    document.getElementById('nomAgenceInput').value = agenceNom !== 'AuditPro' ? agenceNom : '';
    document.getElementById('couleurAgenceInput').value = agenceCouleur;
    document.getElementById('couleurParticulierInput').value = agenceCouleur;
    document.getElementById('fraisNotaireInput').value = fraisNotaireEstimes;
    document.getElementById('margeSecuriteInput').value = margeSecuriteTravaux;
    document.getElementById('webhookCrmInput').value = localStorage.getItem('auditpro_crm_webhook') || '';
    if(agenceLogoBase64) {
        document.getElementById('logo-preview').src = agenceLogoBase64;
        document.getElementById('logo-preview').style.display = 'block';
        document.getElementById('logo-file-name').innerText = "Logo enregistré";
    }
    appliquerCouleurMarqueBlanche();

    document.querySelectorAll('.price-input').forEach(input => {
        input.addEventListener('input', formatInputNumber);
    });

    // ÉCOUTEUR SUR LES ONGLETS PRINCIPAUX (MENU HAUT)
    const liensMenu = document.querySelectorAll('nav a[href^="#"]');
    
    liensMenu.forEach(lien => {
        lien.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');

            // VERIFICATION SECURITE (PAYWALL)
            if (userPlan === 'gratuit' && (targetId === '#comparateur' || targetId === '#parametres-particulier')) {
                changerOnglet('#abonnements');
                return showToast("🔒 Cette fonctionnalité est verrouillée. Veuillez choisir une offre.", "error");
            }
            if (userPlan !== 'pro' && targetId === '#pro') {
                changerOnglet('#abonnements');
                return showToast("🔒 L'Espace Agence nécessite l'abonnement Premium Pro.", "error");
            }

            changerOnglet(targetId);
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
                dropZoneText.innerHTML = `Document prêt : <b style="color: #0F172A;">${this.files[0].name}</b>`;
                dropZone.style.borderColor = agenceCouleur;
                dropZone.style.background = "#fff";
                document.querySelector('.drop-icon').style.color = agenceCouleur;
            }
        });
    }

    // ACCÈS GOD MODE (ADMIN) - Reste appuyé sur MAJ (Shift) + clique sur le Logo
    const headerLogo = document.querySelector('.logo');
    if (headerLogo) {
        headerLogo.addEventListener('click', function(e) {
            if (!e.shiftKey) { logoClicks = 0; return; }
            logoClicks++;
            if (logoClicks === 5) {
                definirAcces('pro');
                updateNavLocks();
                showToast("🔓 MODE ADMIN ACTIVÉ : Accès total illimité débloqué !", "success");
            } else if (logoClicks === 10) {
                definirAcces('gratuit');
                updateNavLocks();
                showToast("🔒 MODE ADMIN DÉSACTIVÉ : Retour au compte gratuit.", "error");
                logoClicks = 0; 
            }
        });
    }
});
