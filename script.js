// ==========================================================================
// 1. VARIABLES GLOBALES & SÉCURITÉ
// ==========================================================================
let donneesAudit = null;
let currentProfile = 'acheteur';
let logoClicks = 0;
let chartInstance = null;
let loyerMensuelSaisi = 0;
let prixNegoActuel = 0;

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
// 2. INTELLIGENCE GÉOGRAPHIQUE (ANALYSE DU CODE POSTAL)
// ==========================================================================
function analyserSecteurLocal(cp) {
    let dep = String(cp).substring(0, 2);
    let data = { nom: "France (Moyenne Nationale)", majo: 1.0, texte: "Marché standard. L'algorithme applique la médiane tarifaire nationale de la FFB sans surcoût particulier." };
    
    const zonesTendues = ["75", "92", "93", "94", "74", "06"];
    const zonesLittoralesBZH = ["35", "56", "29", "22", "44"];
    const zonesSud = ["13", "83", "84", "34"];

    if (zonesTendues.includes(dep)) {
        data = { nom: "Zone Ultra-Tendue", majo: 1.25, texte: "Forte pénurie d'artisans RGE dans ce département ("+dep+"). L'algorithme a majoré les prix standards de +25% pour coller à la réalité du terrain." };
    } else if (zonesLittoralesBZH.includes(dep)) {
        data = { nom: "Secteur Ouest / Bretagne", majo: 1.12, texte: "Département "+dep+" très dynamique. La tension sur les artisans qualifiés impose une majoration de +12% sur les devis d'isolation et d'électricité." };
    } else if (zonesSud.includes(dep)) {
        data = { nom: "Bassin Méditerranéen", majo: 1.15, texte: "Forte tension artisanale dans le "+dep+", spécifiquement sur l'installation de PAC/Climatisation. Majoration globale de +15% appliquée." };
    } else if (dep === "33" || dep === "69" || dep === "31") {
        data = { nom: "Métropole Attractive", majo: 1.10, texte: "Agglomération en forte croissance ("+dep+"). Les prix du BTP locaux sont environ 10% plus chers que la province classique." };
    } else if (dep) {
        data = { nom: "Province Continentale", majo: 1.0, texte: "Marché équilibré (Département "+dep+"). L'outil applique les tarifs médians nationaux sans surcoût." };
    }
    return data;
}

// ==========================================================================
// 3. INITIALISATION & ÉCOUTEURS
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
                
                updateCopilot(2);
            }
        });
    }

    document.querySelectorAll('.price-input').forEach(input => {
        input.addEventListener('input', formatInputNumber);
    });

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
// 4. UTILITAIRES DE CALCUL ET D'AFFICHAGE
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
        navigator.clipboard.writeText(el.innerText).then(() => { 
            showToast("Texte copié dans le presse-papier."); 
        });
    }
}

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
// 5. NAVIGATION ET PROFILS
// ==========================================================================
function changerOnglet(targetId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });

    const cleanId = targetId.replace('#', '') + '-tab';
    const targetTab = document.getElementById(cleanId);
    
    if (targetTab) {
        targetTab.style.display = 'block';
        targetTab.classList.add('active');
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.querySelectorAll('nav a').forEach(l => l.classList.remove('active'));
    const lienActif = document.querySelector(`nav a[href="${targetId}"]`);
    if (lienActif) lienActif.classList.add('active');
    
    if(targetId === '#finance') {
        updateCopilot(4);
    }
}

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
    chargerHistorique(); 
    if(donneesAudit) {
        afficherEcran(); 
        genererFiscalite();
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
// 6. PARAMÈTRES ET MARQUE BLANCHE
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
    if(inpNotairePart) inpNotairePart.value = appSettings.fraisNotaire;
    if(inpMargePart) inpMargePart.value = appSettings.margeSecurite;
    
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
    
    localStorage.setItem('ap_notaire', appSettings.fraisNotaire);
    localStorage.setItem('ap_marge', appSettings.margeSecurite);
    
    appliquerSettings();
    
    if(donneesAudit) {
        calculerTotalDevis();
        afficherEcran();
        genererFiscalite();
    }
    showToast("Paramètres sauvegardés avec succès.");
}

function sauvegarderParametresPro() {
    const inputNom = document.getElementById('nomAgenceInput').value.trim();
    appSettings.nomAgence = inputNom !== "" ? inputNom : "AuditPro";
    appSettings.couleur = document.getElementById('couleurAgenceInput').value;
    
    localStorage.setItem('ap_nom', appSettings.nomAgence);
    localStorage.setItem('ap_couleur', appSettings.couleur);
    
    appliquerSettings();
    showToast("Design Marque Blanche appliqué.");
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

// ==========================================================================
// 7. HISTORIQUE LOCAL
// ==========================================================================
function chargerHistorique() {
    const historiqueTable = document.getElementById('historiqueTableBody');
    if(!historiqueTable) return;
    
    const historique = JSON.parse(localStorage.getItem('auditpro_historique_particulier')) || [];
    historiqueTable.innerHTML = '';
    
    if(historique.length === 0) {
        historiqueTable.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94A3B8; padding: 20px;">Aucun historique de simulation.</td></tr>';
        return;
    }
    
    historique.reverse().forEach((dossier, index) => {
        let realIndex = historique.length - 1 - index;
        historiqueTable.innerHTML += `
            <tr class="history-row">
                <td style="font-size: 13px; font-weight: 500; padding:12px;">${dossier.date}</td>
                <td style="font-size: 13px; font-weight: 600; color: #0F172A; padding:12px;">${dossier.ville} <br><span style="font-size:11px; color:#64748B;">${formatNumber(dossier.prixInitial)} €</span></td>
                <td style="text-align: right; padding:12px;">
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
    if(confirm("Êtes-vous sûr de vouloir supprimer définitivement tout l'historique ?")) {
        localStorage.removeItem('auditpro_historique_particulier');
        chargerHistorique();
        showToast("Historique local effacé avec succès.");
    }
}

// ==========================================================================
// 8. MOTEUR D'EXTRACTION ET D'ANALYSE
// ==========================================================================
function lancerDemo() {
    document.getElementById('prixInitial').value = "320 000";
    document.getElementById('codePostal').value = "56120"; 
    document.getElementById('loyerMensuel').value = "1 300";
    loyerMensuelSaisi = 1300;
    
    let secteur = analyserSecteurLocal("56120");

    donneesAudit = {
        cp: "56120",
        localisation_exacte: "Josselin ("+secteur.nom+")",
        impact_marche: secteur.texte,
        date_audit: new Date().toLocaleDateString('fr-FR'),
        prix_initial: 320000,
        dpe_lettre: "F",
        ges_lettre: "F",
        diagnostics: [
            {titre: "Électricité (Sécurité)", cout: Math.round(4500 * secteur.majo), detail: "Défaut de mise à la terre identifié.", action: "Mise en sécurité par un professionnel.", statut: "Anomalie"},
            {titre: "DPE (Loi Climat)", cout: Math.round(24200 * secteur.majo), detail: "Passoire thermique F.", action: "Isolation des combles et PAC.", statut: "Anomalie"},
            {titre: "Amiante", cout: 0, detail: "Aucune trace d'amiante.", action: "Aucune intervention.", statut: "Conforme"},
            {titre: "Plomb", cout: 0, detail: "Pas de plomb détecté.", action: "Aucune intervention.", statut: "Conforme"}
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
        changerOnglet('#espace');
        return showToast("Vous avez atteint votre limite de 3 analyses gratuites.", "error");
    }

    const input = document.getElementById('fichierPdf');
    const prixInput = parseInputNumber(document.getElementById('prixInitial').value);
    const loyerInput = parseInputNumber(document.getElementById('loyerMensuel').value);
    const cpInput = document.getElementById('codePostal').value || "75000";
    
    if (prixInput <= 0) return showToast("Veuillez indiquer le prix de vente.", "error");
    if (!cpInput) return showToast("Veuillez indiquer le Code Postal pour l'algorithme.", "error");
    if (!input || !input.files.length) return showToast("Veuillez charger le fichier PDF.", "error");

    const maxSizeMB = 15;
    if (input.files[0].size > maxSizeMB * 1024 * 1024) {
        return showToast("Le fichier est trop lourd (Maximum 15 Mo).", "error");
    }
    
    loyerMensuelSaisi = loyerInput;
    document.getElementById('loading-overlay').style.display = "flex";

    const formData = new FormData();
    formData.append("fichier", input.files[0]);
    formData.append("prix", prixInput);
    formData.append("cp", cpInput);

    try {
        const reponse = await fetch("https://audit-check-ktny.onrender.com/scan", { method: "POST", body: formData });
        if (!reponse.ok) throw new Error("Erreur de connexion au serveur");
        
        donneesAudit = await reponse.json();
        donneesAudit.cp = cpInput;
        
        let secteur = analyserSecteurLocal(cpInput);
        donneesAudit.impact_marche = secteur.texte;
        
        // Application de la majoration géographique sur les résultats renvoyés par l'API
        if(donneesAudit.diagnostics) {
            donneesAudit.diagnostics.forEach(diag => {
                if(diag.cout > 0) diag.cout = Math.round(diag.cout * secteur.majo);
            });
        }
        
        currentDossierId = "AUDIT-" + Math.floor(Math.random() * 90000 + 10000);
        document.getElementById('loading-overlay').style.display = "none";
        
        ajouterAuHistorique("Audit " + cpInput, prixInput, donneesAudit);

        analysesCount++;
        localStorage.setItem('_ap_cnt_', analysesCount);

        afficherEcran();
        renderEditeurDevis();
        genererFiscalite();
        showToast("Analyse géographique effectuée avec succès.");

    } catch (e) {
        document.getElementById('loading-overlay').style.display = "none";
        showToast("Le document est illisible ou la connexion a échoué.", "error");
    }
}

// ==========================================================================
// 9. AFFICHAGE DES RÉSULTATS (L'ÉCRAN D'AUDIT)
// ==========================================================================
function afficherEcran() {
    if(!donneesAudit) return;
    
    const wrapper = document.getElementById('result-wrapper');
    const ecran = document.getElementById('contenu-ecran');
    wrapper.style.display = 'block';
    
    let dataDiagnostics = donneesAudit.lignesDevis || donneesAudit.diagnostics;
    let anomalies = dataDiagnostics.filter(d => d.cout > 0);
    
    let prixInitialClean = parseInputNumber(document.getElementById('prixInitial').value) || donneesAudit.prix_initial;
    
    let tRen = document.getElementById('tauxRenov');
    let taux = parseFloat(tRen ? tRen.value : 0);
    
    let totalBrutTvx = dataDiagnostics.reduce((sum, d) => sum + d.cout, 0);
    let resteACharge = totalBrutTvx * (1 - taux);
    let travauxSecurises = resteACharge * (1 + (appSettings.margeSecurite / 100));
    
    prixNegoActuel = prixInitialClean;
    const slider = document.getElementById('nego-slider');
    if(slider) {
        slider.max = prixInitialClean;
        slider.value = prixInitialClean;
    }

    let anomaliesHtml = dataDiagnostics.map(a => `
        <tr>
            <td style="font-weight:700; color:#0F172A; padding:12px; border-bottom:1px solid #E2E8F0;">${a.titre}</td>
            <td style="color:${a.cout > 0 ? '#DC2626' : '#16A34A'}; font-weight:800; text-align:center; padding:12px; border-bottom:1px solid #E2E8F0;">${a.cout > 0 ? 'ANOMALIE' : 'CONFORME'}</td>
            <td style="font-size:14px; color:#475569; padding:12px; border-bottom:1px solid #E2E8F0;"><strong>Constat :</strong> ${a.detail || 'Saisi manuellement'}<br>${a.cout > 0 && a.action ? `<i><strong>Recommandation :</strong> ${a.action}</i>` : ''}</td>
            <td style="font-weight:800; font-size:16px; color:${a.cout > 0 ? '#DC2626' : '#0F172A'}; text-align:right; padding:12px; border-bottom:1px solid #E2E8F0;">${a.cout > 0 ? `-${formatNumber(a.cout)} €` : '0 €'}</td>
        </tr>
    `).join('');

    let graphiqueHtml = anomalies.length > 0 ? `
        <div style="position: relative; height: 350px; width: 100%; max-width: 500px; margin: 0 auto 40px auto; display: flex; justify-content: center;">
            <canvas id="coutChart"></canvas>
        </div>` : '';

    ecran.innerHTML = `
        <div style="border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; margin-bottom: 30px; display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:20px;">
            <div>
                <h2 style="margin:0; font-family:'Merriweather', serif; font-size:28px; color:#0F172A; font-weight:900;">Rapport d'Analyse : ${donneesAudit.localisation_exacte || 'Projet Immo'}</h2>
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
                <div class="kpi-value">${formatNumber(prixInitialClean)} €</div>
            </div>
            <div class="kpi-box" style="border-color:#FCA5A5; background:#FEF2F2;">
                <div class="kpi-label" style="color:#DC2626;">Enveloppe Travaux (Sécurisée)</div>
                <div class="kpi-value" style="color:#DC2626;">-${formatNumber(travauxSecurises)} €</div>
            </div>
            <div class="kpi-box main">
                <div class="kpi-label" style="color:#fff;">Valeur Nette Stratégique</div>
                <div class="kpi-value" style="color:#fff;">${formatNumber(prixInitialClean - travauxSecurises)} €</div>
            </div>
        </div>
        
        <div style="background:#F8FAFC; padding:25px; border-radius:12px; border-left:4px solid var(--theme-color); font-size:14px; color:#475569; margin-bottom:40px; line-height:1.6;">
            <strong style="color:#0F172A; font-size:15px; display:block; margin-bottom:5px;">Intelligence du Secteur :</strong> 
            ${donneesAudit.impact_marche}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="font-size:20px; color:#0F172A; margin:0; font-weight:800;">Extraction de la matrice réglementaire</h3>
        </div>
        
        ${graphiqueHtml}

        <div class="table-responsive">
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#F8FAFC;">
                        <th style="width:20%; padding:12px; border-bottom:1px solid #E2E8F0; text-align:left;">Domaine</th>
                        <th style="width:15%; text-align:center; padding:12px; border-bottom:1px solid #E2E8F0;">Statut</th>
                        <th style="width:50%; padding:12px; border-bottom:1px solid #E2E8F0; text-align:left;">Constat & Préconisations</th>
                        <th style="text-align:right; width:15%; padding:12px; border-bottom:1px solid #E2E8F0;">Provision Est.</th>
                    </tr>
                </thead>
                <tbody>${anomaliesHtml}</tbody>
            </table>
        </div>
        <p style="font-size:12px; color:#94A3B8; margin-top:15px; font-style:italic;">Avertissement : L'algorithme a ajusté les tarifs médians (FFB) en fonction de la tension immobilière du code postal fourni.</p>
    `;
    
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
                        animation: false, 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        plugins: { 
                            legend: { 
                                position: 'bottom',
                                labels: { padding: 15, font: { size: 11, family: "'Inter', sans-serif" } }
                            } 
                        },
                        cutout: '65%'
                    }
                });
            }
        }, 100);
    }
    
    updateCopilot(3);
}

// ==========================================================================
// 10. MODÉLISATION FISCALE & STRESS-TEST HCSF
// ==========================================================================
function updateSimulationFinance() {
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
    
    const prixFai = prixNegoActuel > 0 ? prixNegoActuel : parseInputNumber(document.getElementById('prixInitial').value);
    const travaux = calculerTotalDevis(); 
    const fraisNotaire = prixFai * (appSettings.fraisNotaire / 100);
    const budgetGlobal = prixFai + travaux + fraisNotaire;
    
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

    const revenusMois = parseInputNumber(document.getElementById('hcsf-revenus').value) || 1; 
    const autresCredits = parseInputNumber(document.getElementById('hcsf-credits').value) || 0;
    const loyerMensuel = parseInputNumber(document.getElementById('loyerMensuel').value); 
    
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
    
    const impotLmnpEstime = 0; 
    const cashFlowLmnp = (revenusReelsAnnuels - chargesAnnuelles - (mensualiteCredit * 12) - impotLmnpEstime) / 12;

    const resultDisplay = document.getElementById('finance-results-display');
    if(!resultDisplay) return;

    resultDisplay.innerHTML = `
        <div style="background:#fff; padding:35px; border-radius:16px; border:1px solid #E2E8F0; box-shadow:0 10px 30px rgba(0,0,0,0.03); margin-top:40px;">
            <h3 style="color:#0F172A; margin-top:0; border-bottom:2px solid #F1F5F9; padding-bottom:15px;"><i class="fa-solid fa-chart-pie theme-text"></i> Bilan Bancaire Global</h3>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:15px;">
                <span style="color:#64748B;">Acquisition (Négociée)</span> 
                <strong style="color:#0F172A;">${formatNumber(prixFai)} €</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:15px;">
                <span style="color:#64748B;">Frais Notaire (~${appSettings.fraisNotaire}%)</span> 
                <strong style="color:#0F172A;">+ ${formatNumber(fraisNotaire)} €</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:15px;">
                <span style="color:#64748B;">Travaux (Sécurisés par code postal)</span> 
                <strong style="color:#DC2626;">+ ${formatNumber(travaux)} €</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:20px; padding-top:20px; border-top:1px solid #F1F5F9;">
                <span style="font-weight:900; color:var(--theme-color); font-size:16px;">COÛT TOTAL DU PROJET</span> 
                <strong style="font-size:24px; color:var(--theme-color);">${formatNumber(budgetGlobal)} €</strong>
            </div>
            
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
            <h3 style="color:#fff; margin-top:0; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:15px;">
                <i class="fa-solid fa-scale-balanced"></i> Fiscalité : Micro-Foncier vs LMNP (Au Réel)
            </h3>
            
            <div style="display:flex; margin-top:30px; gap:30px; flex-wrap:wrap;">
                <div style="flex:1; border-right:1px dashed rgba(255,255,255,0.2); padding-right:20px; min-width:250px;">
                    <h4 style="color:#93C5FD; font-size:18px; margin-top:0;">Location Nue <span style="font-size:13px; font-weight:500;">(Micro-Foncier)</span></h4>
                    <p style="font-size:13px; color:#CBD5E1; line-height:1.6;">Les travaux chiffrés par l'audit (${formatNumber(travaux)}€) ne sont pas amortissables dans ce régime simple.</p>
                    <div style="margin-top:25px; font-size:15px; background:rgba(0,0,0,0.2); padding:15px; border-radius:8px;">
                        Impôt mensuel est. : <strong style="color:#FCA5A5;">${formatNumber(impotNuEstime / 12)} €</strong>
                    </div>
                    <div style="margin-top:15px; font-size:16px;">
                        CASH-FLOW NET / MOIS : <strong style="display:block; font-size:24px; color:${cashFlowNu >= 0 ? '#86EFAC' : '#FCA5A5'}">${formatNumber(cashFlowNu)} €</strong>
                    </div>
                </div>
                
                <div style="flex:1; min-width:250px;">
                    <h4 style="color:#60A5FA; font-size:18px; margin-top:0;">LMNP au Réel <span style="font-size:13px; font-weight:500;">(Idéal ici)</span></h4>
                    <p style="font-size:13px; color:#CBD5E1; line-height:1.6;">L'audit confirme ${formatNumber(travaux)}€ de travaux qui génèrent un déficit massif et s'amortissent comptablement avec le bâti.</p>
                    <div style="margin-top:25px; font-size:15px; background:rgba(22, 163, 74, 0.2); border:1px solid rgba(34, 197, 94, 0.3); padding:15px; border-radius:8px;">
                        Impôt mensuel est. : <strong style="color:#86EFAC;">0 € <span style="font-size:12px; font-weight:500;">(Gommé)</span></strong>
                    </div>
                    <div style="margin-top:15px; font-size:16px;">
                        CASH-FLOW NET / MOIS : <strong style="color:${cashFlowLmnp >= 0 ? '#86EFAC' : '#FCA5A5'}; display:block; font-size:28px;">${formatNumber(cashFlowLmnp)} €</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==========================================================================
// 11. OUTILS ET PIPELINE (COMPARATEUR ET KANBAN)
// ==========================================================================
function ajouterComparateur() {
    if (userPlan === 'gratuit') {
        changerOnglet('#espace');
        return showToast("Le comparateur est réservé aux abonnés.", "error");
    }

    if (!donneesAudit) return;
    if (comparateur.length >= 6) return showToast("Le comparateur est plein (6 biens max).", "error");
    
    const loyerMensuel = parseInputNumber(document.getElementById('loyerMensuel').value);
    const prixFai = parseInputNumber(document.getElementById('prixInitial').value);

    let bien = {
        id: currentDossierId,
        ville: donneesAudit.localisation_exacte.split(' ')[0],
        prix: prixFai,
        travaux: calculerTotalDevis(),
        loyer: loyerMensuel,
        dpe: donneesAudit.dpe_lettre || "N/A"
    };
    
    comparateur.push(bien);
    localStorage.setItem('auditpro_comparateur', JSON.stringify(comparateur));
    renderComparateur();
    showToast(`Bien sauvegardé dans le comparateur !`);
}

function supprimerComparateur(index) {
    comparateur.splice(index, 1);
    localStorage.setItem('auditpro_comparateur', JSON.stringify(comparateur));
    renderComparateur();
}

function renderComparateur() {
    const grid = document.getElementById('comparateur-grid');
    if (!grid) return;
    if (comparateur.length === 0) {
        grid.innerHTML = `<div style="text-align:center; padding: 40px; color: #64748B; background: #fff; border-radius: 12px; border: 1px dashed #CBD5E1; width:100%;">Épingle une analyse ici pour la comparer avec d'autres biens.</div>`;
        return;
    }
    
    grid.innerHTML = comparateur.map((bien, index) => {
        let budgetReelTotal = bien.prix + bien.travaux + (bien.prix * 0.08);
        let rentaNette = bien.loyer > 0 ? (((bien.loyer * 12) / budgetReelTotal) * 100).toFixed(2) + " %" : "N/A";

        return `
        <div style="background: #fff; border: 1px solid #E2E8F0; border-top: 4px solid var(--theme-color); border-radius: 16px; padding: 25px; width: 300px; box-shadow: 0 10px 20px rgba(0,0,0,0.03);">
            <h3 style="margin-top: 0; color: #0F172A; border-bottom: 1px solid #F1F5F9; padding-bottom: 15px; font-size: 16px;">${bien.ville}</h3>
            <div style="margin-bottom: 15px;"><span style="background:#F1F5F9; font-size:12px; padding:4px 8px; border-radius:6px; font-weight:bold;">DPE ${bien.dpe}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px;"><span>Prix FAI</span> <strong>${formatNumber(bien.prix)} €</strong></div>
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px;"><span>Travaux</span> <strong style="color:#DC2626;">+ ${formatNumber(bien.travaux)} €</strong></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-top:15px; padding-top:15px; border-top:1px solid #F1F5F9;"><span>Rendement Net</span> <strong style="color:var(--theme-color);">${rentaNette}</strong></div>
            <button class="btn-delete" style="width:100%; margin-top:20px;" onclick="supprimerComparateur(${index})"><i class="fa-solid fa-trash"></i> Retirer</button>
        </div>`;
    }).join('');
}

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
                    <button class="btn-icon" style="width:24px; height:24px; border:none; background:transparent; padding:0; cursor:pointer;" onclick="supprimerDuPipeline('${dossier.id}')">
                        <i class="fa-solid fa-xmark text-danger" style="color:#DC2626;"></i>
                    </button>
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
        return showToast("Le Suivi de dossier est réservé aux abonnés.", "error");
    }
    if (!donneesAudit) return;
    
    const existe = pipelineDossiers.find(d => d.id === currentDossierId);
    if (existe) return showToast("Cet audit est déjà dans ton Pipeline.", "error");

    const loyerMensuel = parseInputNumber(document.getElementById('loyerMensuel').value);

    const nouveauDossier = {
        id: currentDossierId,
        ville: donneesAudit.localisation_exacte.split(' ')[0],
        prix: donneesAudit.prix_initial,
        travaux: calculerTotalDevis(),
        loyer: loyerMensuel,
        dpe: donneesAudit.dpe_lettre,
        status: "zone-etude", 
        date: new Date().toLocaleDateString('fr-FR')
    };

    pipelineDossiers.push(nouveauDossier);
    localStorage.setItem('auditpro_pipeline', JSON.stringify(pipelineDossiers));
    chargerKanban();
    
    showToast("Audit sauvegardé dans ton Suivi (Kanban) !");
    changerOnglet('#outils');
}

function supprimerDuPipeline(id) {
    if(confirm("Supprimer ce dossier du suivi ?")) {
        pipelineDossiers = pipelineDossiers.filter(d => d.id !== id);
        localStorage.setItem('auditpro_pipeline', JSON.stringify(pipelineDossiers));
        chargerKanban();
    }
}

function viderPipeline() {
    if(confirm("Êtes-vous sûr de vouloir vider tout votre tableau de suivi ?")) {
        pipelineDossiers = [];
        localStorage.setItem('auditpro_pipeline', JSON.stringify(pipelineDossiers));
        chargerKanban();
    }
}

// ==========================================================================
// 12. EXPORT PDF PROFESSIONNEL (MODE SANS ÉCHEC)
// ==========================================================================
function exporterPDF() {
    if (!donneesAudit) return showToast("Veuillez générer une analyse d'abord.", "error");

    let btn = document.getElementById('btnExport');
    if(btn) btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Création du PDF...";
    showToast("Génération du document en cours...");

    setTimeout(() => {
        try {
            if (typeof pdfMake === 'undefined') throw new Error("La librairie pdfMake n'est pas chargée.");
            if (typeof pdfFonts !== 'undefined') pdfMake.vfs = pdfFonts.pdfMake.vfs;

            const valPrix = document.getElementById('prixInitial') ? document.getElementById('prixInitial').value : "0";
            const prixInit = parseInputNumber(valPrix) || 0;
            const travaux = calculerTotalDevis() || 0; 
            const valeurNette = prixInit - travaux;

            let tableBody = [
                [
                    { text: 'DOMAINE CONTRÔLÉ', bold: true, fontSize: 8, color: '#ffffff', fillColor: appSettings.couleur || '#1E3A8A', margin: [0, 10, 0, 10] },
                    { text: 'ÉTAT', bold: true, fontSize: 8, color: '#ffffff', fillColor: appSettings.couleur || '#1E3A8A', margin: [0, 10, 0, 10], alignment: 'center' },
                    { text: 'CONSTAT RÉGLEMENTAIRE & ACTION', bold: true, fontSize: 8, color: '#ffffff', fillColor: appSettings.couleur || '#1E3A8A', margin: [0, 10, 0, 10] },
                    { text: 'BUDGET EST.', bold: true, fontSize: 8, color: '#ffffff', fillColor: appSettings.couleur || '#1E3A8A', margin: [0, 10, 0, 10], alignment: 'right' }
                ]
            ];

            let lignesDdt = donneesAudit.lignesDevis || [];
            if (!lignesDdt.length && donneesAudit.diagnostics) {
                lignesDdt = donneesAudit.diagnostics.filter(d => d.cout > 0);
            }

            if (lignesDdt.length === 0) {
                tableBody.push([{ text: "Aucune anomalie technique repérée.", colSpan: 4, alignment: 'center', margin: [0, 10, 0, 10] }, {}, {}, {}]);
            } else {
                lignesDdt.forEach((ligne, index) => {
                    let isAnomalie = ligne.cout > 0;
                    let rowColor = (index % 2 === 0) ? '#F8FAFC' : '#ffffff'; 
                    tableBody.push([
                        { text: ligne.titre || 'Manuel', bold: true, fontSize: 10, color: '#0F172A', fillColor: rowColor, margin: [0, 10, 0, 10] },
                        { text: isAnomalie ? 'ANOMALIE' : 'CONFORME', bold: true, fontSize: 9, color: isAnomalie ? '#DC2626' : '#16A34A', alignment: 'center', fillColor: rowColor, margin: [0, 10, 0, 10] },
                        { text: String(ligne.detail || "Ajustement manuel"), fontSize: 9, color: '#334155', fillColor: rowColor, margin: [0, 10, 0, 10] },
                        { text: isAnomalie ? '-' + formatNumber(ligne.cout) + ' €' : '0 €', bold: true, fontSize: 10, color: isAnomalie ? '#DC2626' : '#0F172A', alignment: 'right', fillColor: rowColor, margin: [0, 10, 0, 10] }
                    ]);
                });
            }

            let nomAgenceStr = (appSettings.nomAgence || "AuditPro").toUpperCase();
            let logoBlock = { text: nomAgenceStr, fontSize: 24, bold: true, color: appSettings.couleur || '#1E3A8A', alignment: 'left', letterSpacing: 1 };

            let chartBlock = [];
            try {
                let canvasElement = document.getElementById('coutChart');
                if (canvasElement && lignesDdt.length > 0) {
                    chartBlock = [
                        { text: 'RÉPARTITION DES COÛTS DE REMISE AUX NORMES', fontSize: 13, bold: true, color: appSettings.couleur || '#1E3A8A', margin: [0, 20, 0, 10] },
                        { image: canvasElement.toDataURL("image/png"), width: 300, alignment: 'center', margin: [0, 0, 0, 30] }
                    ];
                }
            } catch (canvasError) {
                console.warn("Impossible de capturer le graphique.");
            }

            let docDefinition = {
                pageSize: 'A4',
                pageMargins: [ 40, 40, 40, 40 ], 
                defaultStyle: { font: 'Helvetica' },
                background: function() { return { canvas: [ { type: 'rect', x: 0, y: 0, w: 15, h: 842, color: appSettings.couleur || '#1E3A8A' } ] }; },
                header: function(currentPage) {
                    if (currentPage > 1) {
                        return { columns: [ { text: nomAgenceStr, bold: true, color: '#64748B', fontSize: 9 }, { text: 'Réf. ' + (currentDossierId || 'MANUEL'), alignment: 'right', color: '#64748B', fontSize: 9 } ], margin: [40, 20, 40, 0] };
                    }
                },
                footer: function(currentPage, pageCount) {
                    return { columns: [ { text: 'Étude d\'aide à la décision. Ne remplace pas un devis d\'artisan.', fontSize: 8, color: '#94A3B8', italics: true }, { text: 'Page ' + currentPage.toString() + ' / ' + pageCount, alignment: 'right', fontSize: 8, color: '#94A3B8', bold: true } ], margin: [40, 20, 40, 0] };
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
                                        [ { text: 'DÉTAILS DU DOSSIER', colSpan: 2, fontSize: 10, bold: true, color: '#0F172A', alignment: 'right', margin: [0, 6, 0, 6] }, {} ],
                                        [ { text: 'Date :', fontSize: 9, bold: true, color: '#64748B', alignment: 'right' }, { text: String(donneesAudit.date_audit || 'N/A'), fontSize: 9, color: '#0F172A', bold: true } ],
                                        [ { text: 'Lieu :', fontSize: 9, bold: true, color: '#64748B', alignment: 'right' }, { text: String(donneesAudit.localisation_exacte || 'Non défini'), fontSize: 9, color: '#0F172A', bold: true } ]
                                    ]
                                },
                                layout: 'lightHorizontalLines'
                            }
                        ], margin: [0, 0, 0, 40]
                    },
                    { text: 'RAPPORT D\'ANALYSE FINANCIÈRE', fontSize: 20, color: '#0F172A', bold: true, margin: [0, 0, 0, 5] },
                    { text: '1. SYNTHÈSE DES VALORISATIONS', fontSize: 13, bold: true, color: appSettings.couleur || '#1E3A8A', margin: [0, 20, 0, 10] },
                    {
                        table: {
                            widths: ['*', '*'],
                            body: [
                                [ { text: 'Prix de présentation FAI', fontSize: 11 }, { text: formatNumber(prixInit) + ' €', fontSize: 14, bold: true, alignment: 'right' } ],
                                [ { text: 'Enveloppe Travaux (Sécurisée)', fontSize: 11, color: '#DC2626' }, { text: '-' + formatNumber(travaux) + ' €', fontSize: 14, bold: true, color: '#DC2626', alignment: 'right' } ],
                                [ { text: 'Valeur Nette Stratégique', fontSize: 11, bold: true }, { text: formatNumber(valeurNette) + ' €', fontSize: 16, bold: true, color: appSettings.couleur || '#1E3A8A', alignment: 'right' } ]
                            ]
                        }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 30]
                    },
                    ...chartBlock,
                    { text: '2. MATRICE RÉGLEMENTAIRE (DDT)', fontSize: 13, bold: true, color: appSettings.couleur || '#1E3A8A', margin: [0, 10, 0, 10] },
                    { table: { headerRows: 1, widths: ['25%', '15%', '45%', '15%'], body: tableBody }, margin: [0, 0, 0, 40] }
                ]
            };

            let nomDossier = donneesAudit.localisation_exacte ? donneesAudit.localisation_exacte.split(' ')[0] : 'Audit';
            pdfMake.createPdf(docDefinition).download(`AuditPro_Synthese_${nomDossier}.pdf`);
            
            showToast("PDF téléchargé avec succès !", "success");
            if(btn) btn.innerHTML = "<i class=\"fa-solid fa-file-pdf\"></i> Télécharger le Bilan Pro (PDF)";

        } catch (error) {
            console.error(">>> ERREUR FATALE PDFMAKE :", error);
            showToast("Erreur PDF: L'image bloque la génération.", "error");
            if(btn) btn.innerHTML = "<i class=\"fa-solid fa-triangle-exclamation\"></i> Échec (Erreur Image)";
        }
    }, 150);
}

// ==========================================================================
// 13. COPILOTE (ASSISTANT ONBOARDING)
// ==========================================================================
function toggleCopilot() {
    const widget = document.getElementById('copilot-widget');
    const icon = document.getElementById('copilot-toggle-icon');
    if(widget.classList.contains('minimized')) {
        widget.classList.remove('minimized');
        icon.innerText = "▼";
    } else {
        widget.classList.add('minimized');
        icon.innerText = "▲";
    }
}

function updateCopilot(step) {
    const text = document.getElementById('copilot-text');
    const bar = document.getElementById('copilot-progress-bar');
    if(!text || !bar) return;

    if(step === 2) {
        text.innerHTML = "<b>Étape 2/4 : Fichier détecté !</b><br>N'oubliez pas d'indiquer votre Code Postal pour que l'algorithme ajuste les prix des travaux, puis lancez l'audit.";
        bar.style.width = "50%";
    } else if(step === 3) {
        text.innerHTML = "<b>Étape 3/4 : Analyse réussie !</b><br>Les prix ont été majorés/minotés selon la tension du marché de votre région. Allez dans l'onglet <b>Finance & Stratégie</b>.";
        bar.style.width = "75%";
    } else if(step === 4) {
        text.innerHTML = "<b>Étape 4/4 : Ingénierie Financière</b><br>Ajustez le curseur de négociation ou simulez le LMNP. N'oubliez pas d'épingler le bien dans l'onglet <b>Comparateur & Suivi</b>.";
        bar.style.width = "100%";
        setTimeout(() => {
            const widget = document.getElementById('copilot-widget');
            if(widget && !widget.classList.contains('minimized')) toggleCopilot();
        }, 8000); 
    }
}
