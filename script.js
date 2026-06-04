let donneesAudit = null;
let idRapport = "";
let chartInstance = null;
let loyerMensuelSaisi = 0;
let profilActuel = "particulier";

// VARIABLES MARQUE BLANCHE (VERT PAR DÉFAUT #00d632)
let agenceNom = localStorage.getItem('auditpro_agence_nom') || 'AuditPro';
let agenceCouleur = localStorage.getItem('auditpro_agence_couleur') || '#00d632'; 
let agenceLogoBase64 = localStorage.getItem('auditpro_agence_logo') || null;

function entrerSurLeSite(profil) {
    document.getElementById('welcome-portal').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    setTimeout(() => document.getElementById('main-app').style.opacity = '1', 50);
    changerProfilInterne(profil);
}

function changerProfilInterne(profil) {
    profilActuel = profil;
    document.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + profil).classList.add('active');
    
    if(profil === 'professionnel') {
        document.getElementById('nav-pro').style.display = 'inline-block';
        document.getElementById('hero-badge').innerText = 'Espace Pro';
    } else {
        document.getElementById('nav-pro').style.display = 'none';
        document.getElementById('hero-badge').innerText = 'Espace Particulier';
    }
}

// MISE À JOUR DYNAMIQUE GLOBALE DES COULEURS
function appliquerCouleurMarqueBlanche() {
    document.getElementById('header-logo-color').style.color = agenceCouleur;
    
    document.querySelectorAll('.btn-dynamic-color').forEach(b => b.style.backgroundColor = agenceCouleur);
    document.querySelectorAll('.text-dynamic-color').forEach(t => t.style.color = agenceCouleur);
    document.querySelectorAll('.border-dynamic-color').forEach(b => b.style.borderColor = agenceCouleur);
    
    // Les fameuses "petites barres" dynamiques au dessus de chaque bloc
    document.querySelectorAll('.border-dynamic-top, .card-pro, .info-card, .avis-card, .card-info').forEach(b => b.style.borderTopColor = agenceCouleur);
    document.querySelector('.form-container').style.borderTopColor = agenceCouleur;
    
    const activeBtn = document.querySelector('.profile-btn.active');
    if(activeBtn) { activeBtn.style.color = agenceCouleur; activeBtn.style.borderColor = agenceCouleur; }
    
    document.querySelectorAll('.btn-pdf').forEach(b => b.style.backgroundColor = agenceCouleur);
}

document.getElementById('logoUploadInput').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = (ev) => { agenceLogoBase64 = ev.target.result; }
    reader.readAsDataURL(e.target.files[0]);
});

function sauvegarderParametresPro() {
    agenceNom = document.getElementById('nomAgenceInput').value || 'AuditPro';
    agenceCouleur = document.getElementById('couleurAgenceInput').value;
    localStorage.setItem('auditpro_agence_nom', agenceNom);
    localStorage.setItem('auditpro_agence_couleur', agenceCouleur);
    if(agenceLogoBase64) localStorage.setItem('auditpro_agence_logo', agenceLogoBase64);
    
    appliquerCouleurMarqueBlanche();
    chargerHistorique();
    showToast("Paramètres sauvegardés localement.");
}

function reinitialiserMarqueBlanche() {
    localStorage.clear();
    agenceNom = 'AuditPro'; 
    agenceCouleur = '#00d632'; // On force le retour au vert vif
    agenceLogoBase64 = null;
    
    document.getElementById('nomAgenceInput').value = '';
    document.getElementById('couleurAgenceInput').value = '#00d632';
    
    appliquerCouleurMarqueBlanche();
    chargerHistorique();
    showToast("Réinitialisation effectuée (Couleur verte d'origine).");
}

function accepterCookies() {
    localStorage.setItem('auditpro_cookies', 'true');
    document.getElementById('cookie-banner').style.display = 'none';
}

// CORRECTION HISTORIQUE : LES BOUTONS "VOIR" ET "PDF"
function chargerHistorique() {
    const table = document.getElementById('historiqueTableBody');
    if(!table) return;
    const hist = JSON.parse(localStorage.getItem('auditpro_hist_v5')) || [];
    table.innerHTML = hist.length ? '' : '<tr><td colspan="4" style="text-align:center; padding:20px">Aucun dossier.</td></tr>';
    
    hist.reverse().forEach((d, i) => {
        let idx = hist.length - 1 - i;
        table.innerHTML += `
        <tr class="history-row">
            <td>${d.date}</td>
            <td><strong>${d.ville}</strong></td>
            <td>${formatNumber(d.prix)} €</td>
            <td style="text-align:right">
                <button type="button" class="btn-voir" onclick="window.voirDossier(${idx})">Voir</button>
                <button type="button" class="btn-pdf" onclick="window.telechargerDossier(${idx})" style="background:${agenceCouleur}">PDF</button>
            </td>
        </tr>`;
    });
}

// LE BOUTON "VOIR" AFFICHE LE DOSSIER SUR LE SITE (FINI LA PAGE BLANCHE)
window.voirDossier = function(idx) {
    const hist = JSON.parse(localStorage.getItem('auditpro_hist_v5')) || [];
    const d = hist[idx];
    donneesAudit = d.data; 
    idRapport = d.id;
    
    document.getElementById('prixInitial').value = formatNumber(d.prix);
    document.querySelector('nav a[href="#audit"]').click();
    document.getElementById('result-wrapper').style.display = 'block';
    
    afficherEcran();
    document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
    showToast("Dossier chargé à l'écran.");
};

// LE BOUTON "PDF" TELECHARGE DIRECTEMENT
window.telechargerDossier = function(idx) {
    const hist = JSON.parse(localStorage.getItem('auditpro_hist_v5')) || [];
    const d = hist[idx];
    donneesAudit = d.data; 
    idRapport = d.id;
    
    showToast("Génération du PDF en cours...");
    setTimeout(() => exporterPDF('download'), 500);
};

function ajouterAuHistorique(ville, prixInitial, donneesCompletes) {
    const hist = JSON.parse(localStorage.getItem('auditpro_hist_v5')) || [];
    hist.push({
        id: "AUDIT-" + Math.floor(Math.random() * 90000 + 10000),
        date: new Date().toLocaleDateString('fr-FR'),
        ville: ville,
        prix: prixInitial,
        data: donneesCompletes
    });
    localStorage.setItem('auditpro_hist_v5', JSON.stringify(hist));
    chargerHistorique();
}

function viderHistorique() {
    if(confirm("Supprimer l'historique ?")) {
        localStorage.removeItem('auditpro_hist_v5');
        chargerHistorique();
        showToast("Historique effacé.");
    }
}

const formatNumber = (num) => { return Number(num).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' '); };

function formatInputNumber(e) {
    let value = e.target.value.replace(/\s+/g, '');
    if (!isNaN(value) && value !== "") e.target.value = formatNumber(value);
}

function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    if(type === "success") { toast.style.borderLeftColor = agenceCouleur; }
    toast.innerHTML = `<strong>INFO :</strong> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
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

function copierScript(idElement) {
    const texte = document.getElementById(idElement).innerText;
    navigator.clipboard.writeText(texte).then(() => { showToast("Données copiées !"); });
}

function lancerDemo() {
    document.getElementById('prixInitial').value = "450 000";
    idRapport = "DEMO-" + Math.floor(Math.random() * 90000 + 10000);
    
    donneesAudit = {
        cp: "35000",
        localisation_exacte: "Zone Régionale Intermédiaire",
        impact_marche: "Secteur provincial actif. Tension économique constatée sur les devis liés aux artisans certifiés RGE (+8%).",
        date_audit: new Date().toLocaleDateString('fr-FR'),
        prix_initial: 450000,
        total_decote: 16700,
        prix_net: 433300,
        diagnostics: [
            {titre: "Électricité", cout: 8128, loi: "NF C 15-100", detail: "Défaut de mise à la terre ou matériel ancien.", action: "Mise en sécurité du tableau."},
            {titre: "Gaz", cout: 0, loi: "Norme NF P 45-500", detail: "Installation étanche.", action: "Entretien annuel."},
            {titre: "Amiante", cout: 8572, loi: "Santé Publique", detail: "Présence d'amiante confirmée dans la toiture.", action: "Intervention entreprise spécialisée."}
        ]
    };
    
    document.getElementById('result-wrapper').style.display = "block";
    document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
    afficherEcran();
}

async function envoyer() {
    const input = document.getElementById('fichierPdf');
    const prixInputBrut = document.getElementById('prixInitial').value.replace(/\s+/g, '');
    const prixInput = Number(prixInputBrut) || 0;
    const cpInput = document.getElementById('codePostal').value || "";
    
    if (prixInput <= 0) return showToast("Veuillez indiquer le prix de vente.", "error");
    if (!input.files.length) return showToast("Veuillez charger le fichier PDF.", "error");
    
    document.getElementById('loading-overlay').style.display = "flex";

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
        
        document.getElementById('loading-overlay').style.display = "none";
        ajouterAuHistorique(donneesAudit.localisation_exacte, prixInput, donneesAudit);

        document.getElementById('result-wrapper').style.display = "block";
        document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
        afficherEcran();

    } catch (e) {
        document.getElementById('loading-overlay').style.display = "none";
        showToast("Erreur de traitement serveur.", "error");
    }
}

function afficherEcran() {
    let anomalies = donneesAudit.diagnostics.filter(d => d.cout > 0);
    let prixInitialClean = Number(document.getElementById('prixInitial').value.replace(/\s+/g, ''));
    if(prixInitialClean === 0 && donneesAudit.prix_initial > 0) prixInitialClean = donneesAudit.prix_initial;
    
    let defautsFormate = anomalies.length > 0 ? anomalies.map(a => "- " + a.titre).join('\n') : "- Aucun défaut technique majeur.";
    
    let scriptNegoTxt = "";
    let nomOnglet3 = "3. Données Factuelles";
    
    if (profilActuel === "particulier") {
        scriptNegoTxt = `RÉSUMÉ POUR VOTRE PROPOSITION D'ACHAT :

- Prix affiché : ${formatNumber(prixInitialClean)} €
- Total estimé des travaux : ${formatNumber(donneesAudit.total_decote)} €
- Valeur technique justifiée : ${formatNumber(donneesAudit.prix_net)} €

JUSTIFICATION :
L'enveloppe de travaux s'appuie sur le rapport technique. Les points suivants nécessitent une intervention :
${defautsFormate}`;
    } else {
        scriptNegoTxt = `DONNÉES POUR STRUCTURER LA VENTE :

- Écart technique calculé : ${formatNumber(donneesAudit.total_decote)} €
- Valeur nette recommandée (Base Mandat) : ${formatNumber(donneesAudit.prix_net)} €

DÉTAILS (DDT) :
${defautsFormate}

IMPACT MARCHÉ (${donneesAudit.localisation_exacte}) :
${donneesAudit.impact_marche}`;
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
        <button class="report-tab-btn" onclick="switchReportTab('paneTechnique')">2. Bilan Technique</button>
        <button class="report-tab-btn" onclick="switchReportTab('paneStrategie')">${nomOnglet3}</button>
    </div>
    
    <div id="paneFinancier" class="report-pane active">
        <div class="kpi-grid">
            <div class="kpi-box">
                <div class="kpi-label">Prix de vente initial</div>
                <div class="kpi-value">${formatNumber(prixInitialClean)} €</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label" style="color: #cc0000;">Enveloppe Travaux Globale</div>
                <div class="kpi-value" style="color: #cc0000;">-${formatNumber(donneesAudit.total_decote)} €</div>
            </div>
            <div class="kpi-box main" style="background-color: ${agenceCouleur};">
                <div class="kpi-label" style="color: #fff;">Valeur Nette Recommandée</div>
                <div class="kpi-value">${formatNumber(donneesAudit.prix_net)} €</div>
            </div>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-top: 20px; border: 1px solid #ced4da; text-align: left;">
            <h4 style="margin: 0 0 8px 0; color: #0b1a14; text-transform: uppercase; font-size: 12px;">Contexte du secteur géographique</h4>
            <p style="margin: 0; font-size: 14px; color: #495057; line-height: 1.5;">${donneesAudit.impact_marche}</p>
        </div>
    </div>
    
    <div id="paneTechnique" class="report-pane">
        ${anomalies.length > 0 ? `<div class="chart-container"><canvas id="coutChart"></canvas></div>` : ''}
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
                    <td style="padding: 15px; font-size: 13px; color: #333; line-height: 1.5;"><b>Constat :</b> ${a.detail}<br>${a.cout > 0 ? `<b>Action :</b> ${a.action}` : ''}</td>
                    <td style="padding: 15px; font-weight:bold; text-align: right; font-size: 16px;">${a.cout > 0 ? `-${formatNumber(a.cout)} €` : '0 €'}</td>
                </tr>`).join('')}
            </table>
        </div>
    </div>

    <div id="paneStrategie" class="report-pane">
        <h3 style="text-transform: uppercase; font-size: 14px; color: #0b1a14; margin-bottom: 10px;">Données Clés de l'Évaluation</h3>
        <p style="font-size: 14px; color: #495057; margin-bottom: 15px; text-align: left;">Copiez ces éléments factuels pour appuyer votre argumentation :</p>
        <div class="script-box" style="border-left-color: ${agenceCouleur}; font-style: normal;">
            <button class="btn-copy" onclick="copierScript('texteScript')">Copier</button>
            <div id="texteScript">${scriptNegoTxt}</div>
        </div>
    </div>`;

    document.getElementById('contenu-ecran').innerHTML = html;

    if (anomalies.length > 0) {
        const ctx = document.getElementById('coutChart').getContext('2d');
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: anomalies.map(a => a.titre),
                datasets: [{ 
                    data: anomalies.map(a => a.cout), 
                    backgroundColor: ['#1a1a1a', '#cc0000', '#555555', '#888888', '#aaaaaa'] 
                }]
            },
            options: { animation: false, plugins: { legend: { position: 'bottom' } } }
        });
    }
}

// PDF EXPORT (MCKINSEY STYLE) - AUCUN FLUO, ALIGNEMENT PARFAIT
function exporterPDF(action = 'download') {
    if (!donneesAudit) return;
    
    let prixInitFormate = formatNumber(donneesAudit.prix_initial) + ' €';
    let decoteFormate = '-' + formatNumber(donneesAudit.total_decote) + ' €';
    let prixNetFormate = formatNumber(donneesAudit.prix_net) + ' €';

    let tableBody = [
        [
            { text: 'DOMAINE CONTRÔLÉ', style: 'th' },
            { text: 'ÉTAT', style: 'th', alignment: 'center' },
            { text: 'DÉTAILS TECHNIQUES', style: 'th' },
            { text: 'BUDGET', style: 'th', alignment: 'right' }
        ]
    ];

    donneesAudit.diagnostics.forEach((a, index) => {
        let isAnomalie = a.cout > 0;
        let rowColor = (index % 2 === 0) ? '#f9f9f9' : '#ffffff'; 
        
        tableBody.push([
            { text: a.titre, bold: true, fontSize: 10, color: '#1a1a1a', fillColor: rowColor, margin: [0, 8, 0, 8] },
            { text: isAnomalie ? 'ANOMALIE' : 'CONFORME', bold: true, fontSize: 9, color: isAnomalie ? '#cc0000' : '#555555', alignment: 'center', fillColor: rowColor, margin: [0, 8, 0, 8] },
            { text: `Constat : ${a.detail}\n` + (isAnomalie ? `Action requise : ${a.action}` : ''), fontSize: 9, lineHeight: 1.4, color: '#444444', fillColor: rowColor, margin: [0, 8, 0, 8] },
            { text: isAnomalie ? '-' + formatNumber(a.cout) + ' €' : '0 €', bold: true, fontSize: 11, color: isAnomalie ? '#cc0000' : '#1a1a1a', alignment: 'right', fillColor: rowColor, margin: [0, 8, 0, 8] }
        ]);
    });

    // HEADER PRO (LOGO A GAUCHE, DETAILS A DROITE)
    let logoBlock = agenceLogoBase64 
        ? { image: agenceLogoBase64, fit: [140, 50], alignment: 'left' }
        : { text: agenceNom.toUpperCase(), fontSize: 24, bold: true, color: agenceCouleur, alignment: 'left', letterSpacing: 1 };

    let headerTop = {
        columns: [
            { width: '40%', stack: [logoBlock] },
            {
                width: '60%',
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

    let docDefinition = {
        pageSize: 'A4', pageMargins: [40, 50, 40, 50],
        header: function(currentPage) {
            if (currentPage > 1) {
                return {
                    columns: [
                        { text: agenceNom.toUpperCase() + ' - DOSSIER TECHNIQUE', bold: true, color: '#888', fontSize: 9 },
                        { text: 'Réf. ' + idRapport, alignment: 'right', color: '#888', fontSize: 9 }
                    ], margin: [40, 20, 40, 0]
                };
            }
        },
        footer: function(currentPage, pageCount) {
            return {
                columns: [
                    { text: 'Rapport d\'analyse financière macro-économique standardisé', fontSize: 8, color: '#aaa' },
                    { text: 'Page ' + currentPage.toString() + ' / ' + pageCount, alignment: 'right', fontSize: 8, color: '#aaa' }
                ], margin: [40, 20, 40, 0]
            };
        },
        content: [
            headerTop,
            { text: 'RAPPORT D\'ANALYSE TECHNIQUE & FINANCIÈRE', fontSize: 16, color: '#1a1a1a', bold:true, alignment: 'center', margin: [0, 0, 0, 15] },
            { text: 'Synthèse Exécutive : Ce document regroupe les données extraites du Dossier de Diagnostic Technique (DDT). Il présente une évaluation objective des coûts de remise aux normes pour sécuriser et justifier la transaction immobilière face aux exigences réglementaires.', fontSize: 10, color: '#555', alignment: 'justify', margin: [0, 0, 0, 40], italics: true },
            
            { text: '1. SYNTHÈSE DES VALORISATIONS', style: 'sectionTitle' },
            {
                table: {
                    widths: ['*', '*', '*'],
                    body: [
                        [ { text: 'Prix de Vente Initial', style: 'kpiHeader' }, { text: 'Enveloppe Travaux', style: 'kpiHeaderRed' }, { text: 'Valeur Nette Recommandée', style: 'kpiHeader' } ],
                        [ { text: prixInitFormate, style: 'kpiValue' }, { text: decoteFormate, style: 'kpiValueRed' }, { text: prixNetFormate, style: 'kpiValueNet', color: agenceCouleur } ]
                    ]
                },
                layout: 'lightHorizontalLines',
                margin: [0, 0, 0, 20]
            },
            
            {
                table: { widths: ['*'], body: [ [ { stack: [ { text: 'CONTEXTE MACRO-ÉCONOMIQUE LOCAL', fontSize: 9, bold: true, color: '#1a1a1a', margin: [0, 0, 0, 4] }, { text: donneesAudit.impact_marche, fontSize: 9, color: '#4a4a4a', lineHeight: 1.4 } ], padding: 10 } ] ] },
                layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#e0e0e0', vLineColor: () => '#e0e0e0' }, margin: [0, 0, 0, 25]
            },
            
            { text: '2. INVENTAIRE TECHNIQUE DÉTAILLÉ (DDT)', style: 'sectionTitle', margin: [0, 20, 0, 10] },
            {
                table: { headerRows: 1, widths: ['25%', '15%', '45%', '15%'], body: tableBody },
                layout: { 
                    hLineWidth: function (i, node) { return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 1; }, 
                    vLineWidth: function () { return 0; }, 
                    hLineColor: function (i, node) { return (i === 0 || i === node.table.body.length) ? '#1a1a1a' : '#eeeeee'; }, 
                    paddingTop: function() { return 10; }, 
                    paddingBottom: function() { return 10; } 
                }
            },

            { text: '3. MÉTHODOLOGIE ET IMPACT RÉGLEMENTAIRE', style: 'sectionTitle', margin: [0, 40, 0, 10] },
            { text: 'L\'estimation des travaux s\'appuie sur une analyse algorithmique des anomalies répertoriées dans le Dossier de Diagnostic Technique (Art. L271-4 du Code de la construction et de l\'habitation). Les tarifs sont pondérés selon l\'indice des coûts de construction local.\n\nIl est rappelé que la responsabilité du vendeur peut être engagée au titre des vices cachés (Art. 1641 du Code civil) si des informations cruciales concernant la structure du bien ou la sécurité des personnes (plomb, amiante, électricité, gaz) venaient à être dissimulées lors de la transaction.', fontSize: 9, color: '#444', lineHeight: 1.5, margin: [0, 0, 0, 40] },
            
            { text: 'CLAUSE DE NON-SUBSTITUTION LÉGALE', style: 'footerTitle', margin: [0, 40, 0, 5] },
            { text: 'Cette simulation statistique a valeur d\'aide indicative pour structurer une transaction immobilière. Les montants chiffrés ne se substituent en aucun cas à la passation de devis contradictoires établis par des artisans certifiés RGE.', style: 'footerText' }
        ],
        styles: {
            coverTableTitle: { fontSize: 10, bold: true, color: '#1a1a1a', alignment: 'center', margin: [0, 6, 0, 6], letterSpacing: 1 },
            coverLabel: { fontSize: 9, bold: true, color: '#888', alignment: 'right', margin: [0, 2, 10, 2] },
            coverValue: { fontSize: 9, color: '#1a1a1a', margin: [10, 2, 0, 2], bold: true },
            sectionTitle: { fontSize: 12, bold: true, color: '#1a1a1a', margin: [0, 25, 0, 15] },
            kpiHeader: { alignment: 'center', fontSize: 9, color: '#888', bold: true, margin: [0, 5, 0, 5] },
            kpiHeaderRed: { alignment: 'center', fontSize: 9, color: '#cc0000', bold: true, margin: [0, 5, 0, 5] },
            kpiValue: { alignment: 'center', fontSize: 16, bold: true, color: '#1a1a1a', margin: [0, 10, 0, 10] },
            kpiValueRed: { alignment: 'center', fontSize: 16, bold: true, color: '#cc0000', margin: [0, 10, 0, 10] },
            kpiValueNet: { alignment: 'center', fontSize: 20, bold: true, margin: [0, 10, 0, 10] },
            th: { bold: true, fontSize: 9, color: '#ffffff', fillColor: '#1a1a1a', margin: [0, 6, 0, 6] },
            footerTitle: { fontSize: 9, bold: true, color: '#1a1a1a' },
            footerText: { fontSize: 8, color: '#666', alignment: 'justify', lineHeight: 1.4 }
        }
    };

    pdfMake.createPdf(docDefinition).download(agenceNom + '_Bilan_Technique_' + idRapport + '.pdf');
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('nomAgenceInput').value = agenceNom !== 'AuditPro' ? agenceNom : '';
    document.getElementById('couleurAgenceInput').value = agenceCouleur;
    if(agenceLogoBase64) {
        document.getElementById('logo-preview').src = agenceLogoBase64;
        document.getElementById('logo-preview').style.display = 'block';
    }
    
    const faq = document.getElementById('faq-list');
    if(faq) {
        const faqs = [
            ["1. Qu'est-ce qu'un audit technique pré-acquisition ?", "C'est une analyse détaillée de la santé d'un bâtiment. Notre programme interprète les documents obligatoires du vendeur pour en déduire les risques financiers."],
            ["2. Le rapport d'AuditPro a-t-il une valeur légale chez le notaire ?", "Non. Le rapport généré est un outil d'aide à la décision visant la transparence commerciale. Chez le notaire, seul le DDT a une valeur juridique."],
            ["3. Puis-je utiliser ce chiffrage pour discuter du prix de vente ?", "Absolument, c'est l'objectif principal. Vous disposez d'une base objective et neutre pour trouver un accord équitable avec le vendeur."],
            ["4. L'outil remplace-t-il le devis d'un artisan professionnel ?", "Non. L'application calcule une enveloppe budgétaire moyenne basée sur des statistiques régionales. Il est toujours conseillé de faire des devis."],
            ["5. Quels sont les diagnostics immobiliers obligatoires ?", "Le DPE, le constat plomb (avant 1949), l'amiante (avant 1997), l'électricité et le gaz (plus de 15 ans), l'ERP, et l'état parasitaire."],
            ["6. Quelle est la durée de validité du DPE ?", "Un DPE est valable 10 ans. Les DPE réalisés avant juillet 2021 ne sont plus valables."],
            ["7. Qu'est-ce qu'une passoire thermique ?", "C'est un logement classé F ou G sur le DPE. Il consomme énormément de chauffage."],
            ["8. Durée de validité des diagnostics Électricité et Gaz ?", "Ils sont valables 3 ans dans le cadre d'une vente immobilière."],
            ["9. Faut-il refaire le diagnostic Amiante si négatif ?", "Non, sauf s'il a été réalisé avant le 1er avril 2013."],
            ["10. Quelle est la différence entre l'amiante et le plomb ?", "L'amiante est une fibre cancérigène (respiration). Le plomb est dans les vieilles peintures (saturnisme si ingestion)."],
            ["11. Qu'est-ce qu'un DGI ?", "Danger Grave et Immédiat. Le diagnostiqueur a l'obligation de condamner l'installation gaz sur le champ."],
            ["12. Suis-je obligé de faire les travaux si anomalie ?", "Le vendeur n'a aucune obligation (sauf DGI). L'acheteur n'est pas obligé, mais les banques l'exigent souvent pour le prêt."],
            ["13. Le calcul prend-il en compte MaPrimeRénov' ?", "Non. L'outil vous indique le coût global brut des travaux."],
            ["14. Le rapport est-il adapté aux tarifs de ma région ?", "Oui. L'algorithme lit le code postal et applique un coefficient multiplicateur local."],
            ["15. Comment le programme calcule-t-il les prix ?", "Il croise la surface du bien et le type de problème avec le coût moyen au mètre carré pratiqué."],
            ["16. Mes données sont-elles conservées ?", "Non. Règle stricte du 'Zéro Stockage'. Le PDF est scanné puis détruit. Les historiques sont locaux sur votre navigateur."],
            ["17. Le programme peut-il lire un PDF de 100 pages ?", "Oui. L'algorithme scanne instantanément le document pour extraire les tableaux de synthèses."],
            ["18. S'il manque un diagnostic obligatoire ?", "Le notaire bloquera la vente le jour de la signature."],
            ["19. Fonctionne-t-il pour les locaux commerciaux ?", "Actuellement non. Exclusivement pour l'immobilier d'habitation."],
            ["20. Un professionnel peut-il utiliser la plateforme ?", "Oui. L'Espace Professionnel permet de justifier factuellement les estimations."]
        ];
        faqs.forEach(q => {
            faq.innerHTML += `<details><summary>${q[0]}</summary><p>${q[1]}</p></details>`;
        });
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
            lienActif.style.borderBottom = `2px solid ${agenceCouleur}`;
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
});
