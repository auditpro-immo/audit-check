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
    } catch(e) { 
        return 'gratuit'; 
    }
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
// 2. INDEXATION GÉOGRAPHIQUE & FINANCIÈRE
// ==========================================================================
function analyserSecteurLocal(codePostal) {
    if (!codePostal || codePostal.length < 2) {
        return { 
            dep: "France", 
            majo: 1.0, 
            texte: "Traitement fondé sur la moyenne tarifaire nationale (Indice FFB). Code postal non renseigné." 
        };
    }

    let dep = String(codePostal).substring(0, 2);
    
    const baseGeographique = {
        "75": { nom: "Paris", tension: 1.30, msg: "Secteur Paris intra-muros. Application d'une majoration de tension de marché de +30% sur les bordereaux standards." },
        "92": { nom: "Hauts-de-Seine", tension: 1.25, msg: "Zone métropolitaine dense. Indice d'intervention majoré de +25%." },
        "93": { nom: "Seine-Saint-Denis", tension: 1.15, msg: "Périphérie parisienne. Coefficient de tension appliqué sur l'offre d'intervention : +15%." },
        "94": { nom: "Val-de-Marne", tension: 1.18, msg: "Tissu urbain dense impliquant une majoration structurelle des coûts d'intervention évaluée à +18%." },
        "35": { nom: "Ille-et-Vilaine", tension: 1.15, msg: "Bassin économique dynamique. Niveau de disponibilité des corps de métier générant une surcote de +15%." },
        "56": { nom: "Morbihan", tension: 1.12, msg: "Zone littorale sous tension immobilière. Barème de chiffrage réévalué de +12%." },
        "29": { nom: "Finistère", tension: 1.08, msg: "Secteur actif présentant une légère tension sur les disponibilités d'intervention (+8%)." },
        "22": { nom: "Côtes-d'Armor", tension: 1.05, msg: "Marché relativement stable. Ajustement technique de +5% sur la moyenne nationale." },
        "33": { nom: "Gironde", tension: 1.20, msg: "Métropole attractive. Indexation géographique imposant une majoration tarifaire de +20%." },
        "69": { nom: "Rhône", tension: 1.18, msg: "Bassin économique lyonnais. Ajustement des barèmes à hauteur de +18%." },
        "13": { nom: "Bouches-du-Rhône", tension: 1.15, msg: "Forte dynamique régionale. Ajustement sectoriel requis à +15%." },
        "06": { nom: "Alpes-Maritimes", tension: 1.25, msg: "Marché sous contrainte tarifaire notable. Coefficient de régulation appliqué : +25%." },
        "31": { nom: "Haute-Garonne", tension: 1.12, msg: "Secteur métropolitain. Les opérations de rénovation énergétique observent un surcoût local de +12%." },
        "44": { nom: "Loire-Atlantique", tension: 1.15, msg: "Bassin sous pression démographique. Application d'une revalorisation des chiffrages de l'ordre de +15%." },
        "59": { nom: "Nord", tension: 1.05, msg: "Secteur équilibré nécessitant un ajustement minimal (+5%)." }
    };

    if (baseGeographique[dep]) {
        return {
            dep: baseGeographique[dep].nom,
            majo: baseGeographique[dep].tension,
            texte: baseGeographique[dep].msg
        };
    } else {
        return {
            dep: `Département ${dep}`,
            majo: 1.0,
            texte: `Marché continental équilibré. Application stricte du barème médian national (FFB).`
        };
    }
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
            dropZone.addEventListener(eventName, (e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
            }, false);
        });
        
        dropZone.addEventListener('dragover', () => dropZone.style.borderColor = "var(--theme-accent)");
        dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = "#CBD5E1");
        
        dropZone.addEventListener('drop', (e) => { 
            fileInput.files = e.dataTransfer.files; 
            fileInput.dispatchEvent(new Event('change')); 
        });
        
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                dropText.innerHTML = `<strong style="color:#0F172A;">Document validé :</strong> ${fileInput.files[0].name}`;
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
            if (!e.shiftKey) { 
                logoClicks = 0; 
                return; 
            }
            logoClicks++;
            if (logoClicks === 5) {
                definirAcces('pro');
                showToast("Désactivation des restrictions : Accès de gestion autorisé.", "success");
            } else if (logoClicks === 10) {
                definirAcces('gratuit');
                showToast("Fermeture de l'accès gestion. Retour au niveau utilisateur standard.", "error");
                logoClicks = 0; 
            }
        });
    }
});

// ==========================================================================
// 4. UTILITAIRES DE CALCUL
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
            showToast("Extraction vers le presse-papier effectuée."); 
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
        if(lP) { 
            lP.src = appSettings.logoBase64; 
            lP.style.display = 'block'; 
        }
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
    showToast("Application des variables validée.");
}

function sauvegarderParametresPro() {
    const inputNom = document.getElementById('nomAgenceInput').value.trim();
    appSettings.nomAgence = inputNom !== "" ? inputNom : "AuditPro";
    appSettings.couleur = document.getElementById('couleurAgenceInput').value;
    
    localStorage.setItem('ap_nom', appSettings.nomAgence);
    localStorage.setItem('ap_couleur', appSettings.couleur);
    
    appliquerSettings();
    showToast("Paramètres d'export validés.");
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
    showToast("Réinitialisation de l'identité visuelle.");
}

document.getElementById('logoUploadInput')?.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            appSettings.logoBase64 = e.target.result;
            localStorage.setItem('ap_logo', appSettings.logoBase64);
            let preview = document.getElementById('logo-preview');
            if(preview) { 
                preview.src = appSettings.logoBase64; 
                preview.style.display = 'block'; 
            }
        }
        reader.readAsDataURL(file);
    }
});

// ==========================================================================
// 7. HISTORIQUE LOCAL
// ==========================================================================
function chargerHistorique() {
    const historiqueTable = document.getElementById('historiqueTableBody');
    if(!historiqueTable) return;
    
    const historique = JSON.parse(localStorage.getItem('auditpro_historique_particulier')) || [];
    historiqueTable.innerHTML = '';
    
    if(historique.length === 0) {
        historiqueTable.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94A3B8; padding: 20px;">Registre vide.</td></tr>';
        return;
    }
    
    historique.reverse().forEach((dossier, index) => {
        let realIndex = historique.length - 1 - index;
        historiqueTable.innerHTML += `
            <tr class="history-row">
                <td style="font-size: 13px; font-weight: 500; padding:12px;">${dossier.date}</td>
                <td style="font-size: 13px; font-weight: 600; color: #0F172A; padding:12px;">${dossier.ville} <br><span style="font-size:11px; color:#64748B;">${formatNumber(dossier.prixInitial)} €</span></td>
                <td style="text-align: right; padding:12px;">
                    <button class="btn-outline" style="padding:6px 12px; font-size:12px;" onclick="chargerDossierHistorique(${realIndex})">Consulter</button>
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
    if(confirm("Confirmer la suppression irréversible du registre d'analyses ?")) {
        localStorage.removeItem('auditpro_historique_particulier');
        chargerHistorique();
        showToast("Purge du registre exécutée.");
    }
}

// ==========================================================================
// 8. MOTEUR D'EXTRACTION & CONNEXION AU SERVEUR
// ==========================================================================
function lancerDemo() {
    let cpInput = document.getElementById('codePostal').value || "56120";
    document.getElementById('prixInitial').value = "320 000";
    document.getElementById('loyerMensuel').value = "1 300";
    loyerMensuelSaisi = 1300;
    
    let secteur = analyserSecteurLocal(cpInput);

    donneesAudit = {
        cp: cpInput,
        localisation_exacte: `Exemple Bien (${secteur.dep})`,
        impact_marche: secteur.texte,
        date_audit: new Date().toLocaleDateString('fr-FR'),
        prix_initial: 320000,
        dpe_lettre: "F",
        ges_lettre: "F",
        diagnostics: [
            {titre: "Électricité (Sécurité)", cout: Math.round(4500 * secteur.majo), detail: "Défaut de mise à la terre détecté sur l'installation principale.", action: "Mise en sécurité à planifier.", statut: "Anomalie"},
            {titre: "DPE (Loi Climat)", cout: Math.round(24200 * secteur.majo), detail: "Étiquette F constatée. Pertes d'énergie évaluées.", action: "Traitement de l'enveloppe thermique et système de chauffage.", statut: "Anomalie"},
            {titre: "Amiante", cout: 0, detail: "Absence de matériaux incriminés.", action: "Sans objet.", statut: "Conforme"},
            {titre: "Plomb", cout: 0, detail: "Seuils réglementaires respectés.", action: "Sans objet.", statut: "Conforme"}
        ]
    };
    
    currentDossierId = "DEMO-" + Math.floor(Math.random() * 90000 + 10000);
    
    afficherEcran();
    renderEditeurDevis();
    genererFiscalite();
    showToast("Génération du rapport d'exemple effectuée.");
}

async function envoyer() {
    if (userPlan === 'gratuit' && analysesCount >= 3) {
        changerOnglet('#espace');
        return showToast("Plafond de licence gratuite atteint.", "error");
    }

    const input = document.getElementById('fichierPdf');
    const prixInput = parseInputNumber(document.getElementById('prixInitial').value);
    const loyerInput = parseInputNumber(document.getElementById('loyerMensuel').value);
    const cpInput = document.getElementById('codePostal').value;
    
    if (prixInput <= 0) return showToast("Saisie du prix de vente requise.", "error");
    if (!cpInput) return showToast("Saisie du code postal requise pour l'indexation.", "error");
    if (!input || !input.files.length) return showToast("Document d'analyse manquant.", "error");

    const maxSizeMB = 15;
    if (input.files[0].size > maxSizeMB * 1024 * 1024) {
        return showToast("Limite de poids du fichier dépassée (Max: 15 Mo).", "error");
    }
    
    loyerMensuelSaisi = loyerInput;
    document.getElementById('loading-overlay').style.display = "flex";

    const formData = new FormData();
    formData.append("fichier", input.files[0]);
    formData.append("prix", prixInput);
    formData.append("cp", cpInput);

    try {
        const reponse = await fetch("https://audit-check-ktny.onrender.com/scan", { method: "POST", body: formData });
        if (!reponse.ok) throw new Error("Échec de la connexion distante.");
        
        donneesAudit = await reponse.json();
        donneesAudit.cp = cpInput;
        
        let secteur = analyserSecteurLocal(cpInput);
        donneesAudit.impact_marche = secteur.texte;
        
        if(donneesAudit.diagnostics) {
            donneesAudit.diagnostics.forEach(diag => {
                if(diag.cout > 0) {
                    diag.cout = Math.round(diag.cout * secteur.majo);
                }
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
        showToast("Traitement des données achevé.");

    } catch (e) {
        document.getElementById('loading-overlay').style.display = "none";
        showToast("Échec de la procédure de scan.", "error");
    }
}

// ==========================================================================
// 9. AFFICHAGE DES RÉSULTATS 
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
            <td style="font-size:14px; color:#475569; padding:12px; border-bottom:1px solid #E2E8F0;"><strong>Constat :</strong> ${a.detail || 'Saisie manuelle'}<br>${a.cout > 0 && a.action ? `<i><strong>Cible :</strong> ${a.action}</i>` : ''}</td>
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
                <h2 style="margin:0; font-family:'Merriweather', serif; font-size:28px; color:#0F172A; font-weight:900;">Bilan d'Analyse : ${donneesAudit.localisation_exacte || 'Projet Immo'}</h2>
                <div style="color:#64748B; font-size:14px; margin-top:5px; font-weight:600;">Date de calcul : ${donneesAudit.date_audit} | Réf : ${currentDossierId}</div>
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
                <div class="kpi-label" style="color:#fff;">Valeur Nette Opérationnelle</div>
                <div class="kpi-value" style="color:#fff;">${formatNumber(prixInitialClean - travauxSecurises)} €</div>
            </div>
        </div>
        
        <div style="background:#F8FAFC; padding:25px; border-radius:12px; border-left:4px solid var(--theme-color); font-size:14px; color:#475569; margin-bottom:40px; line-height:1.6;">
            <strong style="color:#0F172A; font-size:15px; display:block; margin-bottom:5px;">Avis d'indexation locale :</strong> 
            ${donneesAudit.impact_marche}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="font-size:20px; color:#0F172A; margin:0; font-weight:800;">Matrice Réglementaire (DDT)</h3>
        </div>
        
        ${graphiqueHtml}

        <div class="table-responsive">
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#F8FAFC;">
                        <th style="width:20%; padding:12px; border-bottom:1px solid #E2E8F0; text-align:left;">Secteur</th>
                        <th style="width:15%; text-align:center; padding:12px; border-bottom:1px solid #E2E8F0;">Statut</th>
                        <th style="width:50%; padding:12px; border-bottom:1px solid #E2E8F0; text-align:left;">Évaluations</th>
                        <th style="text-align:right; width:15%; padding:12px; border-bottom:1px solid #E2E8F0;">Provision</th>
                    </tr>
                </thead>
                <tbody>${anomaliesHtml}</tbody>
            </table>
        </div>
        <p style="font-size:12px; color:#94A3B8; margin-top:15px; font-style:italic;">Les montants indiqués résultent d'une pondération de la base tarifaire FFB.</p>
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
// 10. ÉDITEUR DE DEVIS MANUEL
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
    donneesAudit.lignesDevis.push({ id: Date.now(), titre: "Saisie libre", cout: 0, detail: "", action: "" });
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
    
    let tRen = document.getElementById('tauxRenov');
    let taux = parseFloat(tRen ? tRen.value : 0);
    let resteACharge = totalBrut * (1 - taux);
    
    let totalSecurise = resteACharge * (1 + (appSettings.margeSecurite / 100));
    
    document.getElementById('marge-display').innerText = appSettings.margeSecurite;
    document.getElementById('devis-total').innerText = formatNumber(totalSecurise) + " €";
    return totalSecurise;
}

function sauvegarderDevisManuel() {
    donneesAudit.total_decote = calculerTotalDevis();
    donneesAudit.prix_net = parseInputNumber(document.getElementById('prixInitial').value) - donneesAudit.total_decote;
    afficherEcran();
    genererFiscalite();
    showToast("Ajustement de l'enveloppe budgétaire validé.");
}

// ==========================================================================
// 11. MODÉLISATION FISCALE & STRESS-TEST HCSF
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
        statutHcsf.innerText = "Finançable (Risque faible)"; statutHcsf.style.color = "#16A34A";
    } else if (tauxEndettement <= 35) {
        jauge.style.width = tauxEndettement + "%"; jauge.style.background = "#F59E0B";
        statutHcsf.innerText = "Limite HCSF (Tolérance requise)"; statutHcsf.style.color = "#F59E0B";
    } else {
        jauge.style.width = "100%"; jauge.style.background = "#DC2626";
        statutHcsf.innerText = "Risque d'irrecevabilité (> 35%)"; statutHcsf.style.color = "#DC2626";
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
            <h3 style="color:#0F172A; margin-top:0; border-bottom:2px solid #F1F5F9; padding-bottom:15px;"><i class="fa-solid fa-chart-pie theme-text"></i> Synthèse Financière Globale</h3>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:15px;">
                <span style="color:#64748B;">Valeur d'Acquisition (Estimée)</span> 
                <strong style="color:#0F172A;">${formatNumber(prixFai)} €</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:15px;">
                <span style="color:#64748B;">Emoluments notariaux (~${appSettings.fraisNotaire}%)</span> 
                <strong style="color:#0F172A;">+ ${formatNumber(fraisNotaire)} €</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:15px;">
                <span style="color:#64748B;">Provisions pour travaux</span> 
                <strong style="color:#DC2626;">+ ${formatNumber(travaux)} €</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:20px; padding-top:20px; border-top:1px solid #F1F5F9;">
                <span style="font-weight:900; color:var(--theme-color); font-size:16px;">MONTANT TOTAL OPÉRATIONNEL</span> 
                <strong style="font-size:24px; color:var(--theme-color);">${formatNumber(budgetGlobal)} €</strong>
            </div>
            
            <div class="kpi-grid" style="margin-top: 30px;">
                <div class="kpi-box">
                    <div class="kpi-label">Charge de Prêt Mensuelle</div>
                    <div class="kpi-value" style="color:#DC2626;">-${formatNumber(mensualiteCredit)} €</div>
                </div>
                <div class="kpi-box">
                    <div class="kpi-label">Taux de Rentabilité Brute</div>
                    <div class="kpi-value" style="color:#16A34A;">${rentaBrute} %</div>
                </div>
                <div class="kpi-box">
                    <div class="kpi-label">Taux de Rentabilité Nette</div>
                    <div class="kpi-value" style="color:#16A34A;">${rentaNette} %</div>
                </div>
            </div>
        </div>

        <div style="background:var(--theme-color); color:#fff; padding:40px; border-radius:16px; margin-top:30px; box-shadow:0 20px 40px rgba(30, 58, 138, 0.25);">
            <h3 style="color:#fff; margin-top:0; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:15px;">
                <i class="fa-solid fa-scale-balanced"></i> Projection Fiscale (Nue vs LMNP)
            </h3>
            
            <div style="display:flex; margin-top:30px; gap:30px; flex-wrap:wrap;">
                <div style="flex:1; border-right:1px dashed rgba(255,255,255,0.2); padding-right:20px; min-width:250px;">
                    <h4 style="color:#93C5FD; font-size:18px; margin-top:0;">Location Nue <span style="font-size:13px; font-weight:500;">(Micro-Foncier)</span></h4>
                    <p style="font-size:13px; color:#CBD5E1; line-height:1.6;">L'imputation comptable des travaux identifiés (${formatNumber(travaux)}€) n'est pas applicable sous ce régime.</p>
                    <div style="margin-top:25px; font-size:15px; background:rgba(0,0,0,0.2); padding:15px; border-radius:8px;">
                        Impact fiscal mensuel estimé : <strong style="color:#FCA5A5;">${formatNumber(impotNuEstime / 12)} €</strong>
                    </div>
                    <div style="margin-top:15px; font-size:16px;">
                        CASH-FLOW NET : <strong style="display:block; font-size:24px; color:${cashFlowNu >= 0 ? '#86EFAC' : '#FCA5A5'}">${formatNumber(cashFlowNu)} €</strong>
                    </div>
                </div>
                
                <div style="flex:1; min-width:250px;">
                    <h4 style="color:#60A5FA; font-size:18px; margin-top:0;">LMNP Réel <span style="font-size:13px; font-weight:500;">(Recommandation)</span></h4>
                    <p style="font-size:13px; color:#CBD5E1; line-height:1.6;">Les travaux évalués permettent un déficit imputable et la création d'amortissements comptables.</p>
                    <div style="margin-top:25px; font-size:15px; background:rgba(22, 163, 74, 0.2); border:1px solid rgba(34, 197, 94, 0.3); padding:15px; border-radius:8px;">
                        Impact fiscal mensuel estimé : <strong style="color:#86EFAC;">0 € <span style="font-size:12px; font-weight:500;">(Neutralisation)</span></strong>
                    </div>
                    <div style="margin-top:15px; font-size:16px;">
                        CASH-FLOW NET : <strong style="color:${cashFlowLmnp >= 0 ? '#86EFAC' : '#FCA5A5'}; display:block; font-size:28px;">${formatNumber(cashFlowLmnp)} €</strong>
                    </div>
                </div>
            </div>
            <div style="text-align:center; margin-top: 30px;">
                <button class="btn-solid" style="background:#fff; color:var(--theme-color);" onclick="ajouterAuPipeline()">
                    ⭐ Transfert des données vers le tableau de suivi
                </button>
            </div>
        </div>
    `;
}

// ==========================================================================
// 12. OUTILS ET PIPELINE (COMPARATEUR ET KANBAN)
// ==========================================================================
function ajouterComparateur() {
    if (userPlan === 'gratuit') {
        changerOnglet('#espace');
        return showToast("Accès restreint. Option soumise à souscription.", "error");
    }

    if (!donneesAudit) return showToast("Analyse préalable requise.", "error");
    if (comparateur.length >= 6) return showToast("Capacité d'affichage maximale atteinte (6 dossiers).", "error");
    
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
    showToast(`Enregistrement du bien dans le système de comparaison.`);
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
        grid.innerHTML = `<div style="text-align:center; padding: 40px; color: #64748B; background: #fff; border-radius: 12px; border: 1px dashed #CBD5E1; width:100%;">Base de données comparative vide.</div>`;
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
            <button class="btn-delete" style="width:100%; margin-top:20px;" onclick="supprimerComparateur(${index})"><i class="fa-solid fa-trash"></i> Retrait</button>
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
            card.setAttribute('draggable', 'true');
            card.id = dossier.id;
            
            // Fix drag and drop: pointer-events: none sur les enfants pour ne pas interférer
            card.innerHTML = `
                <div class="k-card-title" style="display:flex; justify-content:space-between; align-items:center; pointer-events: none;">
                    <span>${dossier.ville}</span>
                    <button class="btn-icon" style="pointer-events: auto; width:24px; height:24px; border:none; background:transparent; padding:0; cursor:pointer;" onclick="supprimerDuPipeline('${dossier.id}')">
                        <i class="fa-solid fa-xmark text-danger" style="color:#DC2626;"></i>
                    </button>
                </div>
                <div style="font-size:16px; font-weight:800; color:var(--text-dark); margin-bottom:10px; pointer-events: none;">${formatNumber(dossier.prix)} €</div>
                <div class="k-card-data" style="pointer-events: none;">
                    <span>Tvx: <strong style="color:#DC2626;">${formatNumber(dossier.travaux)} €</strong></span>
                    <span class="badge" style="background:#F1F5F9; color:#0F172A; border:1px solid #CBD5E1; padding:2px 6px; border-radius:6px; font-size:11px; font-weight:700;">DPE ${dossier.dpe}</span>
                </div>
            `;

            card.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', dossier.id);
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => this.style.opacity = '0.5', 0);
            });
            
            card.addEventListener('dragend', function() {
                this.style.opacity = '1';
            });

            container.appendChild(card);
        });

        container.addEventListener('dragover', function(e) { 
            e.preventDefault(); 
            e.dataTransfer.dropEffect = 'move';
            this.style.background = "#EFF6FF"; 
        });
        
        container.addEventListener('dragleave', function() {
            this.style.background = "transparent";
        });
        
        container.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.background = "transparent";
            const draggedId = e.dataTransfer.getData('text/plain');
            if(!draggedId) return;
            
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
        return showToast("Option de gestion de flux réservée aux comptes étendus.", "error");
    }

    if (!donneesAudit) return showToast("Analyse préalable requise.", "error");
    
    const existe = pipelineDossiers.find(d => d.id === currentDossierId);
    if (existe) return showToast("Dossier déjà intégré au système de suivi.", "error");

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
    
    showToast("Inscription du dossier dans le flux.");
    changerOnglet('#outils');
}

function supprimerDuPipeline(id) {
    if(confirm("Validation de la suppression du dossier ?")) {
        pipelineDossiers = pipelineDossiers.filter(d => d.id !== id);
        localStorage.setItem('auditpro_pipeline', JSON.stringify(pipelineDossiers));
        chargerKanban();
    }
}

function viderPipeline() {
    if(confirm("Confirmation requise pour la réinitialisation complète du flux de suivi.")) {
        pipelineDossiers = [];
        localStorage.setItem('auditpro_pipeline', JSON.stringify(pipelineDossiers));
        chargerKanban();
    }
}

// ==========================================================================
// 13. GÉNÉRATEURS DE TEXTES
// ==========================================================================
function genererClause() {
    if(!donneesAudit) return showToast("Analyse préalable requise.", "error");
    
    const box = document.getElementById('box-outil-genere');
    const texte = document.getElementById('texte-outil-genere');
    
    document.getElementById('titre-outil-genere').innerText = "Modèle : Clause de Condition Suspensive";
    
    texte.innerText = `La présente offre est formulée sous la condition suspensive stricte de réalisation d'une évaluation technique contradictoire.
Les montants de remise aux normes identifiés dans le Dossier de Diagnostic Technique devant être entérinés par des devis d'artisans certifiés RGE. 

L'acquéreur se réserve le droit d'invoquer la non-réalisation de la présente condition sans application de pénalités si l'évaluation financière des travaux de performance énergétique et de conformité globale excède l'enveloppe budgétaire de ${formatNumber(calculerTotalDevis())} Euros TTC.`;

    box.style.display = 'block';
}

function genererEmailBaisse() {
    if(!donneesAudit) return showToast("Analyse préalable requise.", "error");
    
    const box = document.getElementById('box-outil-genere');
    const texte = document.getElementById('texte-outil-genere');
    
    document.getElementById('titre-outil-genere').innerText = "Modèle : Argumentaire de révision tarifaire";
    
    let lDdt = donneesAudit.lignesDevis || donneesAudit.diagnostics.filter(a => a.cout > 0);
    let anomaliesTxt = lDdt.map(a => `- ${a.titre} : ${a.detail || 'Nécessite intervention technique'}`).join('\n');
    let prixNetEstime = parseInputNumber(document.getElementById('prixInitial').value) - calculerTotalDevis();
    
    texte.innerText = `Concerne : Bilan technique de l'acquisition - ${donneesAudit.localisation_exacte}

Faisant suite à nos échanges, l'analyse approfondie du Dossier de Diagnostic Technique (DDT) révèle plusieurs éléments structurels nécessitant une intervention.

Dans une logique de transparence et en adéquation avec les contraintes actuelles de financement bancaire (normes HCSF), le provisionnement nécessaire à la mise en conformité est évalué à : ${formatNumber(calculerTotalDevis())} €.

L'évaluation porte principalement sur :
${anomaliesTxt}

L'intégration comptable de ces ajustements dans le plan de financement induit mécaniquement une réévaluation de l'offre. Afin de garantir la solidité du dossier auprès des établissements de crédit, il convient d'étudier un ajustement du prix net vendeur autour de ${formatNumber(prixNetEstime)} €.

Disponibilité confirmée pour une analyse conjointe de ces éléments.`;

    box.style.display = 'block';
}

// ==========================================================================
// 14. EXPORT PDF PROFESSIONNEL (Exécution directe)
// ==========================================================================
function exporterPDF() {
    if (!donneesAudit) return showToast("Traitement initial requis.", "error");

    let btn = document.getElementById('btnExport');
    let originalText = btn ? btn.innerHTML : '';
    if(btn) btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Édition en cours...";

    // Contournement du blocage de pop-up via une requête d'animation immédiate
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            try {
                if (typeof pdfMake === 'undefined') throw new Error("Erreur de liaison PDF.");
                if (typeof pdfFonts !== 'undefined') pdfMake.vfs = pdfFonts.pdfMake.vfs;

                const valPrix = document.getElementById('prixInitial') ? document.getElementById('prixInitial').value : "0";
                const prixInit = parseInputNumber(valPrix) || 0;
                const travaux = calculerTotalDevis() || 0; 
                const valeurNette = prixInit - travaux;

                let tableBody = [
                    [
                        { text: 'DOMAINE CONTRÔLÉ', bold: true, fontSize: 8, color: '#ffffff', fillColor: appSettings.couleur || '#1E3A8A', margin: [0, 10, 0, 10] },
                        { text: 'STATUT', bold: true, fontSize: 8, color: '#ffffff', fillColor: appSettings.couleur || '#1E3A8A', margin: [0, 10, 0, 10], alignment: 'center' },
                        { text: 'CONSTAT RÉGLEMENTAIRE & ACTION', bold: true, fontSize: 8, color: '#ffffff', fillColor: appSettings.couleur || '#1E3A8A', margin: [0, 10, 0, 10] },
                        { text: 'BUDGET', bold: true, fontSize: 8, color: '#ffffff', fillColor: appSettings.couleur || '#1E3A8A', margin: [0, 10, 0, 10], alignment: 'right' }
                    ]
                ];

                let lignesDdt = donneesAudit.lignesDevis || [];
                if (!lignesDdt.length && donneesAudit.diagnostics) {
                    lignesDdt = donneesAudit.diagnostics.filter(d => d.cout > 0);
                }

                if (lignesDdt.length === 0) {
                    tableBody.push([{ text: "Aucune non-conformité relevée.", colSpan: 4, alignment: 'center', margin: [0, 10, 0, 10] }, {}, {}, {}]);
                } else {
                    lignesDdt.forEach((ligne, index) => {
                        let isAnomalie = ligne.cout > 0;
                        let rowColor = (index % 2 === 0) ? '#F8FAFC' : '#ffffff'; 
                        tableBody.push([
                            { text: ligne.titre || 'Saisie Manuelle', bold: true, fontSize: 10, color: '#0F172A', fillColor: rowColor, margin: [0, 10, 0, 10] },
                            { text: isAnomalie ? 'ANOMALIE' : 'CONFORME', bold: true, fontSize: 9, color: isAnomalie ? '#DC2626' : '#16A34A', alignment: 'center', fillColor: rowColor, margin: [0, 10, 0, 10] },
                            { text: String(ligne.detail || "Validation d'ajustement"), fontSize: 9, color: '#334155', fillColor: rowColor, margin: [0, 10, 0, 10] },
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
                    console.warn("Échec d'intégration visuelle.");
                }

                let docDefinition = {
                    pageSize: 'A4',
                    pageMargins: [ 40, 40, 40, 40 ], 
                    defaultStyle: { font: 'Helvetica' },
                    background: function() { return { canvas: [ { type: 'rect', x: 0, y: 0, w: 15, h: 842, color: appSettings.couleur || '#1E3A8A' } ] }; },
                    header: function(currentPage) {
                        if (currentPage > 1) {
                            return { columns: [ { text: nomAgenceStr, bold: true, color: '#64748B', fontSize: 9 }, { text: 'Réf. ' + (currentDossierId || 'EXT'), alignment: 'right', color: '#64748B', fontSize: 9 } ], margin: [40, 20, 40, 0] };
                        }
                    },
                    footer: function(currentPage, pageCount) {
                        return { columns: [ { text: 'Document généré à titre indicatif. Ne constitue pas un avis d\'expert.', fontSize: 8, color: '#94A3B8', italics: true }, { text: 'Page ' + currentPage.toString() + ' / ' + pageCount, alignment: 'right', fontSize: 8, color: '#94A3B8', bold: true } ], margin: [40, 20, 40, 0] };
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
                                            [ { text: 'DONNÉES DU DOSSIER', colSpan: 2, fontSize: 10, bold: true, color: '#0F172A', alignment: 'right', margin: [0, 6, 0, 6] }, {} ],
                                            [ { text: 'Édition :', fontSize: 9, bold: true, color: '#64748B', alignment: 'right' }, { text: String(donneesAudit.date_audit || 'N/A'), fontSize: 9, color: '#0F172A', bold: true } ],
                                            [ { text: 'Localisation :', fontSize: 9, bold: true, color: '#64748B', alignment: 'right' }, { text: String(donneesAudit.localisation_exacte || 'N/D'), fontSize: 9, color: '#0F172A', bold: true } ]
                                        ]
                                    },
                                    layout: 'lightHorizontalLines'
                                }
                            ], margin: [0, 0, 0, 40]
                        },
                        { text: 'RAPPORT D\'ÉVALUATION FINANCIÈRE', fontSize: 20, color: '#0F172A', bold: true, margin: [0, 0, 0, 5] },
                        { text: '1. SYNTHÈSE DES VALORISATIONS', fontSize: 13, bold: true, color: appSettings.couleur || '#1E3A8A', margin: [0, 20, 0, 10] },
                        {
                            table: {
                                widths: ['*', '*'],
                                body: [
                                    [ { text: 'Valeur de présentation (FAI)', fontSize: 11 }, { text: formatNumber(prixInit) + ' €', fontSize: 14, bold: true, alignment: 'right' } ],
                                    [ { text: 'Provision de travaux', fontSize: 11, color: '#DC2626' }, { text: '-' + formatNumber(travaux) + ' €', fontSize: 14, bold: true, color: '#DC2626', alignment: 'right' } ],
                                    [ { text: 'Valeur Nette Opérationnelle', fontSize: 11, bold: true }, { text: formatNumber(valeurNette) + ' €', fontSize: 16, bold: true, color: appSettings.couleur || '#1E3A8A', alignment: 'right' } ]
                                ]
                            }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 30]
                        },
                        ...chartBlock,
                        { text: '2. MATRICE RÉGLEMENTAIRE', fontSize: 13, bold: true, color: appSettings.couleur || '#1E3A8A', margin: [0, 10, 0, 10] },
                        { table: { headerRows: 1, widths: ['25%', '15%', '45%', '15%'], body: tableBody }, margin: [0, 0, 0, 40] }
                    ]
                };

                let nomDossier = donneesAudit.localisation_exacte ? donneesAudit.localisation_exacte.split(' ')[0] : 'Audit';
                pdfMake.createPdf(docDefinition).download(`AuditPro_Synthese_${nomDossier}.pdf`);
                showToast("Procédure d'export validée.", "success");
                
            } catch (error) {
                console.error("Erreur de traitement d'édition.", error);
                showToast("Erreur d'édition système.", "error");
            } finally {
                if(btn) btn.innerHTML = originalText;
            }
        });
    });
}

// ==========================================================================
// 15. ASSISTANCE UTILISATEUR
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
        text.innerHTML = "<b>Document détecté.</b><br>Saisie du prix de présentation requise et validation pour extraction.";
        bar.style.width = "50%";
    } else if(step === 3) {
        text.innerHTML = "<b>Analyse complétée.</b><br>Coûts indexés sur le secteur géographique. Accès possible à l'onglet Finance & Stratégie pour la modélisation.";
        bar.style.width = "75%";
    } else if(step === 4) {
        text.innerHTML = "<b>Modélisation financière.</b><br>Données opérationnelles disponibles. Transfert des données dans le tableau de suivi recommandé.";
        bar.style.width = "100%";
        setTimeout(() => {
            const widget = document.getElementById('copilot-widget');
            if(widget && !widget.classList.contains('minimized')) toggleCopilot();
        }, 8000); 
    }
}
