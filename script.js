// ==========================================================================
// 1. VARIABLES GLOBALES & SÉCURITÉ (GOD MODE)
// ==========================================================================
let donneesAudit = null;
let currentProfile = 'acheteur';
let logoClicks = 0;
let chartInstance = null;
let loyerMensuelSaisi = 0;

// Variables pour le "What-If" (Curseur de Négociation)
let prixNegoActuel = 0;

// Base de données locale (LocalStorage)
let comparateur = JSON.parse(localStorage.getItem('auditpro_comparateur')) || [];
let pipelineDossiers = JSON.parse(localStorage.getItem('auditpro_pipeline')) || [];
let currentDossierId = null;

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
    updateNavLocks();
}

let userPlan = lireAcces(); 
let analysesCount = parseInt(localStorage.getItem('_ap_cnt_')) || 0;

let appSettings = {
    nomAgence: localStorage.getItem('ap_nom') || "AuditPro",
    couleur: localStorage.getItem('ap_couleur') || "#1E3A8A",
    margeSecurite: parseFloat(localStorage.getItem('ap_marge')) || 10,
    fraisNotaire: parseFloat(localStorage.getItem('ap_notaire')) || 8,
    logoBase64: localStorage.getItem('ap_logo') || null
};

// ==========================================================================
// 2. INITIALISATION & ÉCOUTEURS D'ÉVÉNEMENTS
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    verifierCookies();
    appliquerSettings();
    chargerKanban();
    renderComparateur();
    chargerHistorique();
    updateNavLocks();
    
    if (localStorage.getItem('auditpro_profil')) {
        changerProfilInterne(localStorage.getItem('auditpro_profil'));
    } else {
        changerProfilInterne("particulier");
    }

    // Gestion du Drag & Drop pour le PDF
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('fichierPdf');
    const dropText = document.querySelector('.drop-zone-text');

    if (dropZone && fileInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
        });
        dropZone.addEventListener('dragover', () => dropZone.style.borderColor = "var(--theme-accent)");
        dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = "#CBD5E1");
        dropZone.addEventListener('drop', (e) => { 
            fileInput.files = e.dataTransfer.files; 
            fileInput.dispatchEvent(new Event('change')); 
        });
        
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                dropText.innerHTML = `<strong style="color:#0F172A;">Fichier prêt :</strong> ${fileInput.files[0].name}`;
                dropZone.style.borderColor = "#16A34A";
                dropZone.style.background = "#F0FDF4";
                document.querySelector('.drop-icon').classList.replace('fa-cloud-arrow-up', 'fa-file-circle-check');
                document.querySelector('.drop-icon').style.color = "#16A34A";
            }
        });
    }

    document.querySelectorAll('.price-input').forEach(input => {
        input.addEventListener('input', formatInputNumber);
    });

    // GOD MODE (ADMIN) - 5 Clics sur le logo en maintenant Shift
    const headerLogo = document.querySelector('.logo');
    if (headerLogo) {
        headerLogo.addEventListener('click', function(e) {
            if (!e.shiftKey) { logoClicks = 0; return; }
            logoClicks++;
            if (logoClicks === 5) {
                definirAcces('pro');
                showToast("🔓 MODE ADMIN ACTIVÉ : Accès total débloqué !", "success");
            } else if (logoClicks === 10) {
                definirAcces('gratuit');
                showToast("🔒 MODE ADMIN DÉSACTIVÉ : Retour au compte gratuit.", "error");
                logoClicks = 0; 
            }
        });
    }
});

// ==========================================================================
// 3. UTILITAIRES DE CALCUL ET D'AFFICHAGE
// ==========================================================================
function formatNumber(num) {
    return Number(num).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/[\u202F\u00A0]/g, ' ');
}

function parseInputNumber(str) {
    if(!str) return 0;
    return Number(str.toString().replace(/\s+/g, '').replace(',', '.')) || 0;
}

function formatInputNumber(e) {
    let value = e.target.value.replace(/\s+/g, '');
    if (!isNaN(value) && value !== "") {
        e.target.value = formatNumber(value);
    }
}

function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}" style="color:${type === 'success' ? '#16A34A' : '#DC2626'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function copierScript(idElement) {
    const el = document.getElementById(idElement);
    if(el) {
        navigator.clipboard.writeText(el.innerText).then(() => { showToast("Texte copié dans le presse-papier."); });
    }
}

function animateValue(obj, start, end, duration, prefix = "") {
    if(!obj) return;
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

// Dessin des étiquettes DPE pour l'interface web
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

// ==========================================================================
// 4. NAVIGATION, CADENAS ET PROFILS
// ==========================================================================
function updateNavLocks() {
    const lockFinance = document.querySelector('#nav-finance .lock-icon');
    const lockPipeline = document.querySelector('#nav-pipeline .lock-icon');
    const lockPro = document.querySelector('#nav-pro .lock-icon');

    if(lockFinance) lockFinance.style.display = userPlan === 'gratuit' ? 'inline' : 'none';
    if(lockPipeline) lockPipeline.style.display = userPlan === 'gratuit' ? 'inline' : 'none';
    if(lockPro) lockPro.style.display = userPlan !== 'pro' ? 'inline' : 'none';

    const tabsToCheck = [
        { id: 'finance', requires: ['particulier', 'pro'] },
        { id: 'pipeline', requires: ['particulier', 'pro'] },
        { id: 'pro', requires: ['pro'] }
    ];

    tabsToCheck.forEach(tab => {
        const content = document.getElementById(`content-${tab.id}`);
        const paywall = document.getElementById(`paywall-${tab.id}`);
        if(content && paywall) {
            if (!tab.requires.includes(userPlan)) {
                content.classList.add('locked-blur');
                paywall.style.display = 'flex';
            } else {
                content.classList.remove('locked-blur');
                paywall.style.display = 'none';
            }
        }
    });
}

function changerProfilInterne(profil) {
    profilActuel = profil;
    localStorage.setItem('auditpro_profil', profilActuel);
    
    let btnPart = document.getElementById('btn-particulier');
    let btnPro = document.getElementById('btn-pro');
    if(btnPart) btnPart.classList.remove('active');
    if(btnPro) btnPro.classList.remove('active');
    
    let targetId = profil === 'professionnel' ? 'btn-pro' : 'btn-particulier';
    let btnActif = document.getElementById(targetId);
    if(btnActif) btnActif.classList.add('active');

    let blocRenov = document.getElementById('bloc-renov');
    if(blocRenov) blocRenov.style.display = profil === 'particulier' ? 'block' : 'none';
    
    updateNavLocks();

    if(profil === "professionnel") {
        document.getElementById('hero-badge').innerText = "Espace Professionnels (B2B)";
        document.getElementById('hero-title').innerText = "Justifiez vos estimations et sécurisez vos transactions.";
        document.getElementById('hero-desc').innerText = "Notre technologie d'analyse traduit instantanément les PDF de diagnostics en rapports chiffrés pour convaincre vos clients.";
        document.getElementById('form-title').innerText = "Simulateur pour les agences";
    } else {
        document.getElementById('hero-badge').innerText = "L'intelligence au service de l'immo";
        document.getElementById('hero-title').innerText = "Sécurisez votre achat en chiffrant les travaux cachés.";
        document.getElementById('hero-desc').innerText = "Notre outil analyse l'ensemble des diagnostics obligatoires de la maison que vous visitez. Obtenez le coût estimatif des remises aux normes instantanément.";
        document.getElementById('form-title').innerText = "Configuration de l'analyse";
    }
    
    chargerHistorique(); 
    if(donneesAudit) {
        afficherEcran(); 
        genererFiscalite();
    }
}

function setProfile(profile, element) {
    currentProfile = profile;
    document.querySelectorAll('.profile-pill').forEach(p => p.classList.remove('active'));
    if(element) element.classList.add('active');

    const blocLoyer = document.getElementById('bloc-loyer');
    if(profile === 'investisseur' || profile === 'promoteur' || profile === 'agent') {
        blocLoyer.style.display = 'block';
    } else {
        blocLoyer.style.display = 'none';
    }
}

function entrerSurLeSite(profil) {
    const portal = document.getElementById('welcome-portal');
    const mainApp = document.getElementById('main-app');
    if(portal) portal.style.opacity = '0';
    setTimeout(() => {
        if(portal) portal.style.display = 'none';
        if(mainApp) {
            mainApp.style.display = 'block';
            mainApp.style.opacity = '1';
        }
        changerProfilInterne(profil);
    }, 600);
}

// ==========================================================================
// 5. PARAMÈTRES ET MARQUE BLANCHE
// ==========================================================================
function verifierCookies() {
    if (!localStorage.getItem('auditpro_cookies')) {
        document.getElementById('cookie-banner').style.display = 'block';
    }
}
function accepterCookies() {
    localStorage.setItem('auditpro_cookies', 'true');
    document.getElementById('cookie-banner').style.display = 'none';
}

function appliquerSettings() {
    document.documentElement.style.setProperty('--theme-color', appSettings.couleur);
    
    let headerLogo = document.getElementById('header-logo-color');
    if(headerLogo && appSettings.nomAgence !== 'AuditPro') {
        headerLogo.innerText = ' ' + appSettings.nomAgence.replace('Audit', '');
    }
    
    const inpNotairePart = document.getElementById('fraisNotaireInput');
    const inpMargePart = document.getElementById('margeSecuriteInput');
    const inpColorPart = document.getElementById('couleurParticulierInput');
    if(inpNotairePart) inpNotairePart.value = appSettings.fraisNotaire;
    if(inpMargePart) inpMargePart.value = appSettings.margeSecurite;
    if(inpColorPart) inpColorPart.value = appSettings.couleur;
    
    const inpNomPro = document.getElementById('nomAgenceInput');
    const inpColorPro = document.getElementById('couleurAgenceInput');
    if(inpNomPro) inpNomPro.value = appSettings.nomAgence !== 'AuditPro' ? appSettings.nomAgence : '';
    if(inpColorPro) inpColorPro.value = appSettings.couleur;
    
    if(appSettings.logoBase64) {
        let lP = document.getElementById('logo-preview');
        if(lP) { lP.src = appSettings.logoBase64; lP.style.display = 'block'; }
    }
}

function changerCouleurParticulierTemporaire(couleur) {
    document.documentElement.style.setProperty('--theme-color', couleur);
}

function sauvegarderParametresParticulier() {
    appSettings.fraisNotaire = parseFloat(document.getElementById('fraisNotaireInput').value) || 8;
    appSettings.margeSecurite = parseFloat(document.getElementById('margeSecuriteInput').value) || 10;
    appSettings.couleur = document.getElementById('couleurParticulierInput').value;

    localStorage.setItem('ap_notaire', appSettings.fraisNotaire);
    localStorage.setItem('ap_marge', appSettings.margeSecurite);
    localStorage.setItem('ap_couleur', appSettings.couleur);
    
    appliquerSettings();
    if(donneesAudit) {
        calculerTotalDevis();
        afficherEcran();
        genererFiscalite();
    }
    showToast("Paramètres de calcul sauvegardés avec succès.");
}

function sauvegarderParametresPro() {
    const inputNom = document.getElementById('nomAgenceInput').value.trim();
    appSettings.nomAgence = inputNom !== "" ? inputNom : "AuditPro";
    appSettings.couleur = document.getElementById('couleurAgenceInput').value;
    
    localStorage.setItem('ap_nom', appSettings.nomAgence);
    localStorage.setItem('ap_couleur', appSettings.couleur);
    
    appliquerSettings();
    showToast("Marque Blanche activée. Vos PDF seront à vos couleurs.");
}

function reinitialiserParametresParticulier() {
    localStorage.removeItem('ap_notaire');
    localStorage.removeItem('ap_marge');
    localStorage.removeItem('ap_couleur');
    appSettings.fraisNotaire = 8;
    appSettings.margeSecurite = 10;
    appSettings.couleur = '#1E3A8A';
    appliquerSettings();
    showToast("Paramètres réinitialisés par défaut.");
}

function reinitialiserMarqueBlanche() {
    localStorage.removeItem('ap_nom');
    localStorage.removeItem('ap_couleur');
    localStorage.removeItem('ap_logo');
    appSettings.nomAgence = 'AuditPro';
    appSettings.couleur = '#1E3A8A';
    appSettings.logoBase64 = null;
    document.getElementById('logo-preview').style.display = 'none';
    appliquerSettings();
    showToast("Marque blanche désactivée.");
}

document.getElementById('logoUploadInput')?.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            appSettings.logoBase64 = e.target.result;
            localStorage.setItem('ap_logo', appSettings.logoBase64);
            let preview = document.getElementById('logo-preview');
            if(preview) { preview.src = appSettings.logoBase64; preview.style.display = 'block'; }
        }
        reader.readAsDataURL(file);
    }
});

// ==========================================================================
// 6. HISTORIQUE LOCAL (TABLEAU DE BORD)
// ==========================================================================
function chargerHistorique() {
    const historiqueTable = document.getElementById('historiqueTableBody');
    if(!historiqueTable) return;
    
    const historique = JSON.parse(localStorage.getItem('auditpro_historique_particulier')) || [];
    historiqueTable.innerHTML = '';
    
    if(historique.length === 0) {
        historiqueTable.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94A3B8; padding: 20px;">Aucun historique de simulation enregistré dans cet espace.</td></tr>';
        return;
    }
    
    historique.reverse().forEach((dossier, index) => {
        let realIndex = historique.length - 1 - index;
        historiqueTable.innerHTML += `
            <tr class="history-row">
                <td style="font-size: 13px; font-weight: 500;">${dossier.date}</td>
                <td style="font-size: 13px; font-weight: 600; color: #0F172A;">${dossier.ville} <br><span style="font-size:11px; color:#64748B;">${formatNumber(dossier.prixInitial)} €</span></td>
                <td style="text-align: right;">
                    <button class="btn-outline" style="padding:6px 12px; font-size:12px;" onclick="chargerDossierHistorique(${realIndex})">Ouvrir</button>
                </td>
            </tr>
        `;
    });
}

function ajouterAuHistorique(ville, prixInitial, donneesCompletes) {
    if (!localStorage.getItem('auditpro_cookies')) return;
    const historique = JSON.parse(localStorage.getItem('auditpro_historique_particulier')) || [];
    historique.push({
        id: currentDossierId,
        date: new Date().toLocaleDateString('fr-FR'),
        ville: ville,
        prixInitial: prixInitial,
        data: donneesCompletes,
        loyer: loyerMensuelSaisi
    });
    localStorage.setItem('auditpro_historique_particulier', JSON.stringify(historique));
    chargerHistorique();
}

function chargerDossierHistorique(index) {
    const historique = JSON.parse(localStorage.getItem('auditpro_historique_particulier')) || [];
    const dossier = historique[index];
    if(!dossier) return;
    
    donneesAudit = dossier.data;
    currentDossierId = dossier.id;
    loyerMensuelSaisi = dossier.loyer || 0;
    
    document.getElementById('prixInitial').value = formatNumber(dossier.prixInitial);
    if(loyerMensuelSaisi > 0) document.getElementById('loyerMensuel').value = formatNumber(loyerMensuelSaisi);
    
    changerOnglet('#audit');
    afficherEcran();
    renderEditeurDevis();
    genererFiscalite();
}

function viderHistorique() {
    if(confirm("Êtes-vous sûr de vouloir supprimer définitivement tout l'historique de cet espace ?")) {
        localStorage.removeItem('auditpro_historique_particulier');
        chargerHistorique();
        showToast("Historique local effacé avec succès.");
    }
}

// ==========================================================================
// 7. MOTEUR D'EXTRACTION (DÉMO ET API BACKEND)
// ==========================================================================
function lancerDemo() {
    document.getElementById('prixInitial').value = "320 000";
    document.getElementById('codePostal').value = "35000"; 
    document.getElementById('loyerMensuel').value = "1 300";
    loyerMensuelSaisi = 1300;
    
    donneesAudit = {
        cp: "35000",
        localisation_exacte: "Rennes (Secteur Ille-et-Vilaine)",
        impact_marche: "Métropole régionale en forte croissance économique. La forte demande sur le locatif et le durcissement de la Loi Climat créent une tension sur les artisans certifiés RGE, justifiant un ajustement automatique des devis locaux à la hausse (+18%).",
        date_audit: new Date().toLocaleDateString('fr-FR'),
        prix_initial: 320000,
        total_decote: 28700,
        prix_net: 291300,
        dpe_lettre: "F",
        ges_lettre: "F",
        diagnostics: [
            {titre: "Électricité (Sécurité)", cout: 4500, detail: "Défaut de mise à la terre ou matériel ancien identifié.", action: "Mise en sécurité du tableau électrique par un professionnel.", statut: "Anomalie"},
            {titre: "DPE (Loi Climat)", cout: 24200, detail: "Logement classé F (Passoire thermique). Pertes de chaleur majeures identifiées.", action: "Isolation des combles et installation d'une Pompe à Chaleur.", statut: "Anomalie"},
            {titre: "Amiante (Matériaux)", cout: 0, detail: "Aucune trace d'amiante sur les éléments visibles.", action: "Aucune intervention nécessaire.", statut: "Conforme"},
            {titre: "Plomb (Peintures)", cout: 0, detail: "Aucune trace de plomb au-dessus des seuils réglementaires détectée.", action: "Aucune intervention nécessaire sur les murs.", statut: "Conforme"}
        ]
    };
    
    currentDossierId = "DEMO-" + Math.floor(Math.random() * 90000 + 10000);
    
    afficherEcran();
    renderEditeurDevis();
    genererFiscalite();
    showToast("Dossier de démonstration complet généré.");
}

async function envoyer() {
    if (userPlan === 'gratuit' && analysesCount >= 3) {
        changerOnglet('#abonnements');
        return showToast("Vous avez atteint votre limite de 3 analyses gratuites. Veuillez souscrire à une offre.", "error");
    }

    const input = document.getElementById('fichierPdf');
    const prixInput = parseInputNumber(document.getElementById('prixInitial').value);
    const loyerInput = parseInputNumber(document.getElementById('loyerMensuel').value);
    const cpInput = document.getElementById('codePostal').value || "";
    
    if (prixInput <= 0) return showToast("Veuillez indiquer le prix de vente.", "error");
    if (!input || !input.files.length) return showToast("Veuillez charger le fichier PDF.", "error");

    const maxSizeMB = 15;
    if (input.files[0].size > maxSizeMB * 1024 * 1024) {
        return showToast("Le fichier est trop lourd (Maximum 15 Mo).", "error");
    }
    
    loyerMensuelSaisi = loyerInput;
    document.getElementById('loading-overlay').style.display = "flex";

    const messagesIA = [
        "Lecture sécurisée et extraction OCR...",
        "Analyse réglementaire des diagnostics...",
        "Calcul des devis moyens pour le département...",
        "Génération de la matrice financière..."
    ];
    let msgIndex = 0;
    const textElement = document.getElementById('loading-text');
    const loadInterval = setInterval(() => {
        if(textElement) textElement.innerText = messagesIA[msgIndex];
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
        currentDossierId = "AUDIT-" + Math.floor(Math.random() * 90000 + 10000);
        
        clearInterval(loadInterval);
        document.getElementById('loading-overlay').style.display = "none";
        
        ajouterAuHistorique(donneesAudit.localisation_exacte, prixInput, donneesAudit);

        analysesCount++;
        localStorage.setItem('_ap_cnt_', analysesCount);

        afficherEcran();
        renderEditeurDevis();
        genererFiscalite();
        showToast("Analyse effectuée avec succès.");

    } catch (e) {
        clearInterval(loadInterval);
        document.getElementById('loading-overlay').style.display = "none";
        showToast("Le document est illisible ou la connexion a échoué.", "error");
    }
}

// ==========================================================================
// 8. AFFICHAGE DES RÉSULTATS (L'ÉCRAN D'AUDIT)
// ==========================================================================
function afficherEcran() {
    if(!donneesAudit) return;
    
    const wrapper = document.getElementById('result-wrapper');
    const ecran = document.getElementById('contenu-ecran');
    wrapper.style.display = 'block';
    
    let dataDiagnostics = donneesAudit.lignesDevis || donneesAudit.diagnostics;
    let anomalies = dataDiagnostics.filter(d => d.cout > 0);
    
    let prixInitialClean = parseInputNumber(document.getElementById('prixInitial').value) || donneesAudit.prix_initial;
    
    let totalBrutTvx = dataDiagnostics.reduce((sum, d) => sum + d.cout, 0);
    let travauxSecurises = totalBrutTvx * (1 + (appSettings.margeSecurite / 100));
    
    prixNegoActuel = prixInitialClean; // Initialise le What-If Slider
    document.getElementById('nego-slider').max = prixInitialClean;
    document.getElementById('nego-slider').value = prixInitialClean;

    let anomaliesHtml = dataDiagnostics.map(a => `
        <tr>
            <td style="font-weight:700; color:#0F172A;">${a.titre}</td>
            <td style="color:${a.cout > 0 ? '#DC2626' : '#16A34A'}; font-weight:800; text-align:center;">${a.cout > 0 ? 'ANOMALIE' : 'CONFORME'}</td>
            <td style="font-size:14px; color:#475569;"><strong>Constat :</strong> ${a.detail || 'Saisi manuellement'}<br>${a.cout > 0 && a.action ? `<i><strong>Recommandation :</strong> ${a.action}</i>` : ''}</td>
            <td style="font-weight:800; font-size:16px; color:${a.cout > 0 ? '#DC2626' : '#0F172A'}; text-align:right;">${a.cout > 0 ? `-${formatNumber(a.cout)} €` : '0 €'}</td>
        </tr>
    `).join('');

    ecran.innerHTML = `
        <div style="border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; margin-bottom: 30px; display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:20px;">
            <div>
                <h2 style="margin:0; font-family:'Merriweather', serif; font-size:28px; color:#0F172A; font-weight:900;">Rapport d'Analyse : ${donneesAudit.localisation_exacte}</h2>
                <div style="color:#64748B; font-size:14px; margin-top:5px; font-weight:600;">Date d'évaluation : ${donneesAudit.date_audit} | Réf : ${currentDossierId}</div>
            </div>
            <div style="display:flex; gap:15px;">
                <div style="text-align:center;">
                    <div style="font-size:11px; font-weight:800; color:#64748B; text-transform:uppercase; margin-bottom:5px;">DPE</div>
                    ${getSvgArrow(donneesAudit.dpe_lettre, "DPE")}
                </div>
                <div style="text-align:center;">
                    <div style="font-size:11px; font-weight:800; color:#64748B; text-transform:uppercase; margin-bottom:5px;">GES</div>
                    ${getSvgArrow(donneesAudit.ges_lettre, "GES")}
                </div>
            </div>
        </div>
        
        <div class="kpi-grid">
            <div class="kpi-box">
                <div class="kpi-label">Prix de présentation FAI</div>
                <div class="kpi-value" id="anim-prix-initial">${formatNumber(prixInitialClean)} €</div>
            </div>
            <div class="kpi-box" style="border-color:#FCA5A5; background:#FEF2F2;">
                <div class="kpi-label" style="color:#DC2626;">Enveloppe Travaux (Sécurisée)</div>
                <div class="kpi-value" style="color:#DC2626;" id="anim-cout-travaux">-${formatNumber(travauxSecurises)} €</div>
            </div>
            <div class="kpi-box main">
                <div class="kpi-label" style="color:#fff;">Valeur Nette Stratégique</div>
                <div class="kpi-value" style="color:#fff;" id="anim-prix-net">${formatNumber(prixInitialClean - travauxSecurises)} €</div>
            </div>
        </div>
        
        <div style="background:#F8FAFC; padding:25px; border-radius:12px; border-left:4px solid var(--theme-color); font-size:14px; color:#475569; margin-bottom:40px; line-height:1.6;">
            <strong style="color:#0F172A; font-size:15px; display:block; margin-bottom:5px;">Impact de la conjoncture locale :</strong> 
            ${donneesAudit.impact_marche}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="font-size:20px; color:#0F172A; margin:0; font-weight:800;">Extraction de la matrice réglementaire</h3>
        </div>
        
        ${anomalies.length > 0 ? `<div style="display:flex; justify-content:center; margin-bottom: 30px;"><canvas id="coutChart" width="250" height="250" style="max-width:250px;"></canvas></div>` : ''}

        <div class="table-responsive">
            <table>
                <thead>
                    <tr><th style="width:20%;">Domaine</th><th style="width:15%; text-align:center;">Statut</th><th style="width:50%;">Constat & Préconisations</th><th style="text-align:right; width:15%;">Provision Est.</th></tr>
                </thead>
                <tbody>${anomaliesHtml}</tbody>
            </table>
        </div>
        <p style="font-size:12px; color:#94A3B8; margin-top:15px; font-style:italic;">Avertissement légal : Ces chiffrages statistiques FFB ne se substituent en aucun cas au devis d'un artisan certifié RGE.</p>
    `;
    
    // Animation de Chart.js si anomalies
    if (anomalies.length > 0) {
        setTimeout(() => {
            let canvas = document.getElementById('coutChart');
            if(canvas) {
                const ctx = canvas.getContext('2d');
                if (chartInstance) chartInstance.destroy();
                chartInstance = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: anomalies.map(a => a.titre),
                        datasets: [{ 
                            data: anomalies.map(a => a.cout), 
                            backgroundColor: ['#1E3A8A', '#DC2626', '#3B82F6', '#64748B', '#94A3B8', '#E2E8F0'] 
                        }]
                    },
                    options: { 
                        animation: { animateScale: true }, 
                        responsive: false, 
                        plugins: { legend: { position: 'bottom' } },
                        cutout: '70%'
                    }
                });
            }
        }, 100);
    }
}

// ==========================================================================
// 9. ÉDITEUR DE DEVIS MANUEL
// ==========================================================================
function renderEditeurDevis() {
    const area = document.getElementById('editeur-devis-area');
    if(!area) return;
    area.style.display = 'block';
    
    if (!donneesAudit.lignesDevis) {
        donneesAudit.lignesDevis = donneesAudit.diagnostics.filter(d => d.cout > 0).map(d => ({
            id: Date.now() + Math.random(),
            titre: d.titre,
            cout: d.cout,
            detail: d.detail,
            action: d.action
        }));
    }
    
    const tbody = document.getElementById('devis-tbody');
    tbody.innerHTML = '';

    donneesAudit.lignesDevis.forEach((ligne, index) => {
        tbody.innerHTML += `
            <tr>
                <td style="padding:10px;"><input type="text" class="form-control" value="${ligne.titre}" onchange="updateLigneDevis(${index}, 'titre', this.value)" style="background:#fff;"></td>
                <td style="padding:10px;"><input type="text" class="form-control price-input" style="text-align:right; font-weight:700; background:#fff;" value="${formatNumber(ligne.cout)}" onchange="updateLigneDevis(${index}, 'cout', this.value)"></td>
                <td style="padding:10px; text-align:center;"><button class="btn-delete" style="padding:8px 12px;" onclick="supprimerLigneDevis(${index})"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `;
    });
    
    calculerTotalDevis();
}

function ajouterLigneDevis() {
    donneesAudit.lignesDevis.push({ id: Date.now(), titre: "Nouveau poste manuel", cout: 0, detail: "", action: "" });
    renderEditeurDevis();
}

function supprimerLigneDevis(index) {
    donneesAudit.lignesDevis.splice(index, 1);
    renderEditeurDevis();
}

function updateLigneDevis(index, champ, valeur) {
    if (champ === 'cout') {
        donneesAudit.lignesDevis[index].cout = parseInputNumber(valeur);
    } else {
        donneesAudit.lignesDevis[index][champ] = valeur;
    }
    calculerTotalDevis();
}

function calculerTotalDevis() {
    let totalBrut = donneesAudit.lignesDevis.reduce((sum, ligne) => sum + ligne.cout, 0);
    let totalSecurise = totalBrut * (1 + (appSettings.margeSecurite / 100));
    
    document.getElementById('marge-display').innerText = appSettings.margeSecurite;
    document.getElementById('devis-total').innerText = formatNumber(totalSecurise) + " €";
    return totalSecurise;
}

function sauvegarderDevisManuel() {
    donneesAudit.total_decote = calculerTotalDevis();
    donneesAudit.prix_net = parseInputNumber(document.getElementById('prixInitial').value) - donneesAudit.total_decote;
    afficherEcran();
    genererFiscalite();
    showToast("Le montant des travaux a été réajusté avec succès.");
}

// ==========================================================================
// 10. MODÉLISATION FISCALE & STRESS-TEST HCSF
// ==========================================================================
function updateSimulationFinance() {
    // Règle le Slider What-If
    const slider = document.getElementById('nego-slider');
    const prixInitClean = parseInputNumber(document.getElementById('prixInitial').value);
    
    if(slider && prixInitClean > 0) {
        prixNegoActuel = parseInt(slider.value);
        let rabais = prixInitClean - prixNegoActuel;
        document.getElementById('prix-nego-display').innerText = formatNumber(prixNegoActuel) + " €";
        document.getElementById('rabais-display').innerText = "-" + formatNumber(rabais) + " €";
    }

    calculerFinancePro();
}

function genererFiscalite() {
    const loyerTxt = document.getElementById('loyerMensuel').value.replace(/\s+/g, '');
    const loyer = Number(loyerTxt);
    const container = document.getElementById('finance-calculator-area');
    const emptyState = document.getElementById('finance-empty-state');
    
    if (loyer <= 0 || !donneesAudit) {
        if(container) container.style.display = 'none';
        if(emptyState) emptyState.style.display = 'block';
        return;
    }

    if(container) container.style.display = 'block';
    if(emptyState) emptyState.style.display = 'none';

    updateSimulationFinance(); 
}

function calculerFinancePro() {
    if(!donneesAudit) return;
    
    // 1. Données du Projet
    const prixFai = prixNegoActuel > 0 ? prixNegoActuel : parseInputNumber(document.getElementById('prixInitial').value);
    const travaux = calculerTotalDevis(); 
    const fraisNotaire = prixFai * (appSettings.fraisNotaire / 100);
    const budgetGlobal = prixFai + travaux + fraisNotaire;
    
    // 2. Crédit
    const apport = parseInputNumber(document.getElementById('fin-apport').value);
    const montantEmprunte = Math.max(0, budgetGlobal - apport);
    const dureeAnnees = parseFloat(document.getElementById('fin-duree').value) || 20;
    const tauxAnnuel = parseFloat(document.getElementById('fin-taux').value) || 3.5;
    const tauxAssurance = parseFloat(document.getElementById('fin-assurance').value) || 0.3;

    let mensualiteCredit = 0;
    if (montantEmprunte > 0 && dureeAnnees > 0) {
        const tauxMensuel = (tauxAnnuel / 100) / 12;
        const nbMois = dureeAnnees * 12;
        if (tauxMensuel > 0) {
            mensualiteCredit = (montantEmprunte * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nbMois));
        } else {
            mensualiteCredit = montantEmprunte / nbMois;
        }
        mensualiteCredit += (montantEmprunte * (tauxAssurance / 100)) / 12;
    }

    // 3. Stress-Test HCSF (Taux d'endettement)
    const revenusMois = parseInputNumber(document.getElementById('hcsf-revenus').value) || 1; // Eviter div/0
    const autresCredits = parseInputNumber(document.getElementById('hcsf-credits').value) || 0;
    const loyerMensuel = parseInputNumber(document.getElementById('loyerMensuel').value); 
    
    // Calcul HCSF strict (Mensualités Prêts / (Revenus Pros + 70% Loyers))
    const revenusPonderes = revenusMois + (loyerMensuel * 0.70);
    const chargesTotalesCredits = autresCredits + mensualiteCredit;
    const tauxEndettement = (chargesTotalesCredits / revenusPonderes) * 100;

    const jauge = document.getElementById('hcsf-jauge');
    const statutHcsf = document.getElementById('hcsf-statut');
    document.getElementById('hcsf-valeur').innerText = tauxEndettement.toFixed(1) + " %";

    if (tauxEndettement <= 33) {
        jauge.style.width = tauxEndettement + "%"; jauge.style.background = "#16A34A";
        statutHcsf.innerText = "Excellent (Finançable)"; statutHcsf.style.color = "#16A34A";
    } else if (tauxEndettement <= 35) {
        jauge.style.width = tauxEndettement + "%"; jauge.style.background = "#F59E0B";
        statutHcsf.innerText = "Limite HCSF (Dossier juste)"; statutHcsf.style.color = "#F59E0B";
    } else {
        jauge.style.width = "100%"; jauge.style.background = "#DC2626";
        statutHcsf.innerText = "Risque de Refus (> 35%)"; statutHcsf.style.color = "#DC2626";
    }

    // 4. Exploitation & Fiscalité (LMNP vs Nu)
    const vacancePct = parseFloat(document.getElementById('fin-vacance').value) || 0;
    const revenusReelsAnnuels = (loyerMensuel * 12) * (1 - (vacancePct / 100));

    const tf = parseInputNumber(document.getElementById('fin-tf').value);
    const copro = parseInputNumber(document.getElementById('fin-copro').value);
    const pno = parseInputNumber(document.getElementById('fin-pno').value);
    const chargesAnnuelles = tf + copro + pno;

    const rentaBrute = ((revenusReelsAnnuels / prixFai) * 100).toFixed(2);
    const rentaNette = (((revenusReelsAnnuels - chargesAnnuelles) / budgetGlobal) * 100).toFixed(2);

    const baseImposableNu = revenusReelsAnnuels * 0.70; 
    const impotNuEstime = baseImposableNu * 0.30; 
    const cashFlowNu = (revenusReelsAnnuels - chargesAnnuelles - (mensualiteCredit * 12) - impotNuEstime) / 12;
    
    const impotLmnpEstime = 0; // Amortissement comptable gomme l'impôt
    const cashFlowLmnp = (revenusReelsAnnuels - chargesAnnuelles - (mensualiteCredit * 12) - impotLmnpEstime) / 12;

    const resultDisplay = document.getElementById('finance-results-display');
    if(!resultDisplay) return;

    resultDisplay.innerHTML = `
        <div style="background:#fff; padding:35px; border-radius:16px; border:1px solid #E2E8F0; box-shadow:0 10px 30px rgba(0,0,0,0.03); margin-top:40px;">
            <h3 style="color:#0F172A; margin-top:0; border-bottom:2px solid #F1F5F9; padding-bottom:15px;"><i class="fa-solid fa-chart-pie theme-text"></i> Bilan Bancaire Global</h3>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:15px;"><span style="color:#64748B;">Acquisition (Négociée)</span> <strong style="color:#0F172A;">${formatNumber(prixFai)} €</strong></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:15px;"><span style="color:#64748B;">Frais Notaire (~${appSettings.fraisNotaire}%)</span> <strong style="color:#0F172A;">+ ${formatNumber(fraisNotaire)} €</strong></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:15px;"><span style="color:#64748B;">Travaux (Sécurisés)</span> <strong style="color:#DC2626;">+ ${formatNumber(travaux)} €</strong></div>
            <div style="display:flex; justify-content:space-between; margin-top:20px; padding-top:20px; border-top:1px solid #F1F5F9;"><span style="font-weight:900; color:var(--theme-color); font-size:16px;">COÛT TOTAL DU PROJET</span> <strong style="font-size:24px; color:var(--theme-color);">${formatNumber(budgetGlobal)} €</strong></div>
            
            <div class="kpi-grid" style="margin-top: 30px;">
                <div class="kpi-box">
                    <div class="kpi-label">Mensualité Prêt</div>
                    <div class="kpi-value" style="color:#DC2626;">-${formatNumber(mensualiteCredit)} €</div>
                </div>
                <div class="kpi-box">
                    <div class="kpi-label">Rentabilité Brute</div>
                    <div class="kpi-value" style="color:#16A34A;">${rentaBrute} %</div>
                </div>
                <div class="kpi-box">
                    <div class="kpi-label">Renta Nette (Avant Impôts)</div>
                    <div class="kpi-value" style="color:#16A34A;">${rentaNette} %</div>
                </div>
            </div>
        </div>

        <div style="background:var(--theme-color); color:#fff; padding:40px; border-radius:16px; margin-top:30px; box-shadow:0 20px 40px rgba(30, 58, 138, 0.25);">
            <h3 style="color:#fff; margin-top:0; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:15px;"><i class="fa-solid fa-scale-balanced"></i> Fiscalité : Micro-Foncier vs LMNP (Au Réel)</h3>
            
            <div style="display:flex; margin-top:30px; gap:30px; flex-wrap:wrap;">
                <div style="flex:1; border-right:1px dashed rgba(255,255,255,0.2); padding-right:20px; min-width:250px;">
                    <h4 style="color:#93C5FD; font-size:18px; margin-top:0;">Location Nue <span style="font-size:13px; font-weight:500;">(Micro-Foncier)</span></h4>
                    <p style="font-size:13px; color:#CBD5E1; line-height:1.6;">Les travaux chiffrés par l'audit (${formatNumber(travaux)}€) ne sont pas amortissables dans ce régime simple.</p>
                    <div style="margin-top:25px; font-size:15px; background:rgba(0,0,0,0.2); padding:15px; border-radius:8px;">
                        Impôt mensuel est. : <strong style="color:#FCA5A5;">${formatNumber(impotNuEstime / 12)} €</strong>
                    </div>
                    <div style="margin-top:15px; font-size:16px;">CASH-FLOW NET / MOIS : <strong style="display:block; font-size:24px; color:${cashFlowNu >= 0 ? '#86EFAC' : '#FCA5A5'}">${formatNumber(cashFlowNu)} €</strong></div>
                </div>
                
                <div style="flex:1; min-width:250px;">
                    <h4 style="color:#60A5FA; font-size:18px; margin-top:0;">LMNP au Réel <span style="font-size:13px; font-weight:500;">(Idéal ici)</span></h4>
                    <p style="font-size:13px; color:#CBD5E1; line-height:1.6;">L'audit confirme ${formatNumber(travaux)}€ de travaux qui génèrent un déficit massif et s'amortissent comptablement avec le bâti.</p>
                    <div style="margin-top:25px; font-size:15px; background:rgba(22, 163, 74, 0.2); border:1px solid rgba(34, 197, 94, 0.3); padding:15px; border-radius:8px;">
                        Impôt mensuel est. : <strong style="color:#86EFAC;">0 € <span style="font-size:12px; font-weight:500;">(Gommé)</span></strong>
                    </div>
                    <div style="margin-top:15px; font-size:16px;">CASH-FLOW NET / MOIS : <strong style="color:${cashFlowLmnp >= 0 ? '#86EFAC' : '#FCA5A5'}; display:block; font-size:28px;">${formatNumber(cashFlowLmnp)} €</strong></div>
                </div>
            </div>
            <div style="text-align:center; margin-top: 30px;">
                <button class="btn-solid" style="background:#fff; color:var(--theme-color);" onclick="ajouterAuPipeline()">⭐ Sauvegarder dans mon Pipeline Kanban</button>
            </div>
        </div>
    `;
}

// ==========================================================================
// 11. PIPELINE KANBAN (DRAG & DROP)
// ==========================================================================
function chargerKanban() {
    const zones = ['zone-etude', 'zone-visite', 'zone-offre', 'zone-compromis'];
    
    zones.forEach(zoneId => {
        const container = document.getElementById(zoneId);
        const countSpan = document.getElementById(zoneId.replace('zone', 'count'));
        if (!container) return;

        container.innerHTML = '';
        const dossiersCol = pipelineDossiers.filter(d => d.status === zoneId);
        if(countSpan) countSpan.innerText = dossiersCol.length;

        dossiersCol.forEach(dossier => {
            const card = document.createElement('div');
            card.className = 'k-card';
            card.draggable = true;
            card.id = dossier.id;
            
            card.innerHTML = `
                <div class="k-card-title" style="display:flex; justify-content:space-between;">
                    <span>${dossier.ville}</span>
                    <button class="btn-icon" style="width:24px; height:24px; border:none; background:transparent; padding:0; cursor:pointer;" onclick="supprimerDuPipeline('${dossier.id}')"><i class="fa-solid fa-xmark text-danger" style="color:#DC2626;"></i></button>
                </div>
                <div style="font-size:16px; font-weight:800; color:var(--text-dark); margin-bottom:10px;">${formatNumber(dossier.prix)} €</div>
                <div class="k-card-data">
                    <span>Tvx: <strong style="color:#DC2626;">${formatNumber(dossier.travaux)} €</strong></span>
                    <span class="badge" style="background:#F1F5F9; color:#0F172A; border:1px solid #CBD5E1; padding:2px 6px; border-radius:6px; font-size:11px; font-weight:700;">DPE ${dossier.dpe}</span>
                </div>
            `;

            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', dossier.id);
                setTimeout(() => card.style.opacity = '0.5', 0);
            });
            card.addEventListener('dragend', () => card.style.opacity = '1');

            container.appendChild(card);
        });

        // Setup Drag&Drop listeners
        container.addEventListener('dragover', (e) => { e.preventDefault(); container.style.background = "#EFF6FF"; });
        container.addEventListener('dragleave', () => container.style.background = "transparent");
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.style.background = "transparent";
            const draggedId = e.dataTransfer.getData('text/plain');
            
            const dossierIndex = pipelineDossiers.findIndex(d => d.id === draggedId);
            if (dossierIndex > -1) {
                pipelineDossiers[dossierIndex].status = zoneId;
                localStorage.setItem('auditpro_pipeline', JSON.stringify(pipelineDossiers));
                chargerKanban();
            }
        });
    });
}

function ajouterAuPipeline() {
    if (userPlan === 'gratuit') {
        changerOnglet('#espace');
        return showToast("Le Pipeline Kanban est réservé aux abonnements Premium.", "error");
    }

    if (!donneesAudit) return;
    
    const existe = pipelineDossiers.find(d => d.id === currentDossierId);
    if (existe) return showToast("Ce dossier est déjà dans votre Pipeline.", "error");

    const loyerMensuel = parseInputNumber(document.getElementById('loyerMensuel').value);

    const nouveauDossier = {
        id: currentDossierId,
        ville: donneesAudit.localisation_exacte.split(' ')[0],
        prix: donneesAudit.prix_initial,
        travaux: donneesAudit.total_decote,
        loyer: loyerMensuel,
        dpe: donneesAudit.dpe_lettre,
        status: "zone-etude", 
        date: new Date().toLocaleDateString('fr-FR')
    };

    pipelineDossiers.push(nouveauDossier);
    localStorage.setItem('auditpro_pipeline', JSON.stringify(pipelineDossiers));
    chargerKanban();
    
    showToast("Projet ajouté au Pipeline !");
    changerOnglet('#outils');
}

function supprimerDuPipeline(id) {
    if(confirm("Supprimer ce dossier du pipeline ?")) {
        pipelineDossiers = pipelineDossiers.filter(d => d.id !== id);
        localStorage.setItem('auditpro_pipeline', JSON.stringify(pipelineDossiers));
        chargerKanban();
        showToast("Dossier supprimé.");
    }
}

function viderPipeline() {
    if(confirm("Êtes-vous sûr de vouloir vider tout votre pipeline ? Cette action est irréversible.")) {
        pipelineDossiers = [];
        localStorage.setItem('auditpro_pipeline', JSON.stringify(pipelineDossiers));
        chargerKanban();
        showToast("Pipeline purgé avec succès.");
    }
}

// ==========================================================================
// 12. GÉNÉRATEURS DE TEXTES (CLAUSES & EMAILS)
// ==========================================================================
function genererClause() {
    if(!donneesAudit) return showToast("Veuillez d'abord analyser un bien.", "error");
    const box = document.getElementById('box-outil-genere');
    const texte = document.getElementById('texte-outil-genere');
    
    document.getElementById('titre-outil-genere').innerText = "Clause Suspensive pour l'Offre d'Achat :";
    
    texte.innerText = `[À copier dans la section "Conditions Suspensives" de votre Offre d'Achat]

La présente offre d'achat est formulée sous la condition suspensive de la réalisation d'une contre-visite par des artisans qualifiés RGE, visant à valider techniquement et financièrement les montants de remise aux normes identifiés dans le Dossier de Diagnostic Technique. 

L'acquéreur se réserve le droit de se rétracter sans pénalité si les devis finaux obtenus pour les travaux d'économie d'énergie et de sécurisation électrique/gaz excèdent l'enveloppe prévisionnelle totale de ${formatNumber(donneesAudit.total_decote)} Euros TTC.`;

    box.style.display = 'block';
    box.scrollIntoView({ behavior: 'smooth' });
}

function genererEmailBaisse() {
    if(!donneesAudit) return showToast("Veuillez d'abord analyser un bien.", "error");
    const box = document.getElementById('box-outil-genere');
    const texte = document.getElementById('texte-outil-genere');
    
    document.getElementById('titre-outil-genere').innerText = "Brouillon Email - Négociation Vendeur :";
    
    let lDdt = donneesAudit.lignesDevis || donneesAudit.diagnostics.filter(a => a.cout > 0);
    let anomaliesTxt = lDdt.map(a => `- ${a.titre} : ${a.detail || 'Reprise technique requise'}`).join('\n');
    
    texte.innerText = `Objet : Suite à l'analyse technique du bien situé à ${donneesAudit.localisation_exacte}

Bonjour,

Je fais suite à notre rendez-vous et à la lecture approfondie du Dossier de Diagnostic Technique (DDT) de votre bien. 

Afin de garantir une transaction transparente et finançable par les futurs acquéreurs (au regard des exigences bancaires strictes sur le taux d'endettement HCSF), nous avons fait chiffrer les éléments réglementaires à reprendre. Le budget de mise aux normes sécurisé s'élève à : ${formatNumber(donneesAudit.total_decote)} €.

Les points majeurs à corriger identifiés par l'audit concernent :
${anomaliesTxt}

Dans le contexte du marché actuel, les acheteurs déduisent systématiquement ces montants de leur plan de financement. Pour éviter de subir un refus de prêt, je vous recommande d'ajuster le prix de présentation net vendeur autour de ${formatNumber(donneesAudit.prix_net)} €.

Je suis à votre disposition pour en discuter de vive voix et affiner ensemble notre stratégie.

Bien cordialement,`;

    box.style.display = 'block';
    box.scrollIntoView({ behavior: 'smooth' });
}

// ==========================================================================
// 13. EXPORT PDF PROFESSIONNEL (pdfMake) - COMPLET ET INTACT
// ==========================================================================
function exporterPDF(action = 'download', targetWindow = null) {
    if (!donneesAudit) return showToast("Veuillez générer une analyse d'abord.", "error");
    showToast("Génération du document professionnel en cours...");

    const prixInit = parseInputNumber(document.getElementById('prixInitial').value);
    const travaux = calculerTotalDevis(); 
    const valeurNette = prixInit - travaux;

    let tableBody = [
        [
            { text: 'DOMAINE CONTRÔLÉ', style: 'tableHeader' },
            { text: 'ÉTAT', style: 'tableHeader', alignment: 'center' },
            { text: 'CONSTAT RÉGLEMENTAIRE & ACTION', style: 'tableHeader' },
            { text: 'BUDGET EST.', style: 'tableHeader', alignment: 'right' }
        ]
    ];

    let lignesDdt = donneesAudit.lignesDevis || donneesAudit.diagnostics.filter(d => d.cout > 0);

    if (lignesDdt.length === 0) {
        tableBody.push([{ text: "Aucune anomalie technique majeure repérée dans le rapport.", colSpan: 4, alignment: 'center', margin: [0, 10, 0, 10], color: '#64748B' }, {}, {}, {}]);
    } else {
        lignesDdt.forEach((ligne, index) => {
            let isAnomalie = ligne.cout > 0;
            let rowColor = (index % 2 === 0) ? '#F8FAFC' : '#ffffff'; 
            tableBody.push([
                { text: ligne.titre, bold: true, fontSize: 10, color: '#0F172A', fillColor: rowColor, margin: [0, 10, 0, 10] },
                { text: isAnomalie ? 'ANOMALIE' : 'CONFORME', bold: true, fontSize: 9, color: isAnomalie ? '#DC2626' : '#16A34A', alignment: 'center', fillColor: rowColor, margin: [0, 10, 0, 10] },
                { text: ligne.detail || "Travaux / Ajustement manuel", fontSize: 9, color: '#334155', fillColor: rowColor, margin: [0, 10, 0, 10] },
                { text: isAnomalie ? '-' + formatNumber(ligne.cout) + ' €' : '0 €', bold: true, fontSize: 10, color: isAnomalie ? '#DC2626' : '#0F172A', alignment: 'right', fillColor: rowColor, margin: [0, 10, 0, 10] }
            ]);
        });
    }

    let logoBlock = appSettings.logoBase64 
        ? { image: appSettings.logoBase64, fit: [150, 55], alignment: 'left' }
        : { text: appSettings.nomAgence.toUpperCase(), fontSize: 24, bold: true, color: appSettings.couleur, alignment: 'left', letterSpacing: 1 };

    let docDefinition = {
        pageSize: 'A4',
        pageMargins: [ 40, 40, 40, 40 ], 
        defaultStyle: { font: 'Helvetica' },
        background: function() {
            return { canvas: [ { type: 'rect', x: 0, y: 0, w: 15, h: 842, color: appSettings.couleur } ] };
        },
        header: function(currentPage) {
            if (currentPage > 1) {
                return {
                    columns: [
                        { text: appSettings.nomAgence.toUpperCase(), bold: true, color: '#64748B', fontSize: 9 },
                        { text: 'Réf. ' + currentDossierId, alignment: 'right', color: '#64748B', fontSize: 9 }
                    ], margin: [40, 20, 40, 0]
                };
            }
        },
        footer: function(currentPage, pageCount) {
            return {
                columns: [
                    { text: 'Étude d\'aide à la décision algorithmique. Ne remplace pas le devis d\'un artisan RGE.', fontSize: 8, color: '#94A3B8', italics: true },
                    { text: 'Page ' + currentPage.toString() + ' / ' + pageCount, alignment: 'right', fontSize: 8, color: '#94A3B8', bold: true }
                ], margin: [40, 20, 40, 0]
            };
        },
        content: [
            {
                columns: [
                    { width: '45%', stack: [logoBlock], margin: [0, 5, 0, 0] },
                    {
                        width: '55%',
                        table: {
                            widths: ['*', '*'],
                            body: [
                                [ { text: 'DÉTAILS DU DOSSIER', colSpan: 2, style: 'coverTableTitle' }, {} ],
                                [ { text: 'Date de l\'évaluation :', style: 'coverLabel' }, { text: donneesAudit.date_audit, style: 'coverValue' } ],
                                [ { text: 'Localisation :', style: 'coverLabel' }, { text: donneesAudit.localisation_exacte, style: 'coverValue' } ],
                                [ { text: 'Classe Énergétique :', style: 'coverLabel' }, { text: donneesAudit.dpe_lettre, style: 'coverValue', color: appSettings.couleur } ]
                            ]
                        },
                        layout: 'lightHorizontalLines'
                    }
                ],
                margin: [0, 0, 0, 40]
            },

            { text: 'RAPPORT D\'ANALYSE FINANCIÈRE', fontSize: 20, color: '#0F172A', bold: true, margin: [0, 0, 0, 5] },
            { text: 'Synthèse du Document de Diagnostic Technique (DDT)', fontSize: 11, color: '#64748B', margin: [0, 0, 0, 30], italics: true },

            { text: '1. SYNTHÈSE DES VALORISATIONS', style: 'sectionTitle', color: appSettings.couleur },
            {
                table: {
                    widths: ['*', '*'],
                    body: [
                        [ { text: 'Prix de présentation FAI', style: 'kpiLabel' }, { text: formatNumber(prixInit) + ' €', style: 'kpiValue' } ],
                        [ { text: 'Enveloppe Travaux (Sécurisée)', style: 'kpiLabel', color: '#DC2626' }, { text: '-' + formatNumber(travaux) + ' €', style: 'kpiValue', color: '#DC2626' } ],
                        [ { text: 'Valeur Nette Stratégique', style: 'kpiLabel', bold: true }, { text: formatNumber(valeurNette) + ' €', style: 'kpiValue', color: appSettings.couleur, fontSize: 16 } ]
                    ]
                },
                layout: { hLineWidth: function() { return 1; }, vLineWidth: function() { return 0; }, hLineColor: function() { return '#E2E8F0'; }, paddingBottom: function() { return 8; }, paddingTop: function() { return 8; } },
                margin: [0, 0, 0, 30]
            },
            
            {
                table: { widths: ['*'], body: [ [ { stack: [ { text: 'CONTEXTE MACRO-ÉCONOMIQUE', fontSize: 10, bold: true, color: '#fff', margin: [0, 0, 0, 6] }, { text: donneesAudit.impact_marche, fontSize: 9, color: '#F8FAFC', lineHeight: 1.4 } ], padding: 15, fillColor: appSettings.couleur, borderRadius: 8 } ] ] },
                layout: 'noBorders', margin: [0, 0, 0, 40]
            },
            
            { text: '2. MATRICE RÉGLEMENTAIRE (DDT)', style: 'sectionTitle', color: appSettings.couleur, margin: [0, 10, 0, 10] },
            {
                table: { headerRows: 1, widths: ['25%', '15%', '45%', '15%'], body: tableBody },
                layout: { 
                    hLineWidth: function (i, node) { return (i === 0 || i === 1 || i === node.table.body.length) ? 2 : 1; }, 
                    vLineWidth: function () { return 0; }, 
                    hLineColor: function (i, node) { return (i === 0 || i === node.table.body.length) ? appSettings.couleur : '#E2E8F0'; },
                    paddingTop: function() { return 8; }, 
                    paddingBottom: function() { return 8; } 
                },
                margin: [0, 0, 0, 40]
            },

            { text: 'AVERTISSEMENT LÉGAL', fontSize: 11, bold: true, color: '#0F172A', margin: [0, 10, 0, 5] },
            { text: 'Les tarifs indiqués sont des moyennes statistiques régionales pondérées et n\'engagent en rien la responsabilité de l\'éditeur. Ce document n\'a pas de force probante et ne constitue pas une expertise de bâtiment. Il incombe à l\'acquéreur ou au vendeur de faire confirmer ces estimations techniques par des devis formels délivrés par des artisans compétents et assurés.', fontSize: 9, color: '#64748B', alignment: 'justify', lineHeight: 1.4 }
        ],
        styles: {
            coverTableTitle: { fontSize: 10, bold: true, color: '#0F172A', alignment: 'right', margin: [0, 6, 0, 6], letterSpacing: 1 },
            coverLabel: { fontSize: 9, bold: true, color: '#64748B', alignment: 'right', margin: [0, 2, 10, 2] },
            coverValue: { fontSize: 9, color: '#0F172A', margin: [10, 2, 0, 2], bold: true },
            sectionTitle: { fontSize: 13, bold: true, margin: [0, 0, 0, 10], textTransform: 'uppercase' },
            kpiLabel: { fontSize: 11, color: '#475569', margin: [0, 5, 0, 5] },
            kpiValue: { fontSize: 14, bold: true, color: '#0F172A', alignment: 'right', margin: [0, 5, 0, 5] },
            tableHeader: { bold: true, fontSize: 8, color: '#ffffff', fillColor: appSettings.couleur, margin: [0, 10, 0, 10] }
        }
    };

    let pdf = pdfMake.createPdf(docDefinition);
    
    if (action === 'view' && targetWindow) {
        pdf.getBlob((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            targetWindow.document.body.innerHTML = `<iframe src="${blobUrl}#view=FitH" style="width:100vw; height:100vh; border:none; margin:0; padding:0; display:block;"></iframe>`;
        });
        if(btn) btn.innerText = "Éditer le Bilan Officiel (PDF)";
    } else {
        pdf.download(`AuditPro_Synthese_${donneesAudit.localisation_exacte.split(' ')[0]}.pdf`);
        if(btn) setTimeout(() => { btn.innerText = "Éditer le Bilan Officiel (PDF)"; }, 1500);
    }

}
