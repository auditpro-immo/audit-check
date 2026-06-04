let donneesAudit = null;
let idRapport = "";
let chartInstance = null;
let loyerMensuelSaisi = 0;
let profilActuel = "particulier";

let agenceNom = localStorage.getItem('auditpro_agence_nom') || 'AuditPro';
let agenceCouleur = localStorage.getItem('auditpro_agence_couleur') || '#00d632';
let agenceLogoBase64 = localStorage.getItem('auditpro_agence_logo') || null;

function entrerSurLeSite(profil) {
    document.getElementById('welcome-portal').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    setTimeout(() => { document.getElementById('main-app').style.opacity = '1'; }, 50);
    changerProfilInterne(profil);
}

function changerProfilInterne(profil) {
    profilActuel = profil;
    document.querySelectorAll('.profile-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-' + profil).classList.add('active');
    
    if(profil === "professionnel") {
        document.getElementById('nav-pro').style.display = 'inline-block';
        document.getElementById('hero-badge').innerText = "Espace Professionnels (B2B)";
    } else {
        document.getElementById('nav-pro').style.display = 'none';
        document.getElementById('hero-badge').innerText = "Espace Particulier (B2C)";
    }
}

document.getElementById('logoUploadInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            agenceLogoBase64 = e.target.result;
        }
        reader.readAsDataURL(file);
    }
});

function appliquerCouleurMarqueBlanche() {
    document.getElementById('header-logo-color').style.color = agenceCouleur;
    document.querySelectorAll('.btn-dynamic-color').forEach(btn => btn.style.backgroundColor = agenceCouleur);
    document.querySelectorAll('.text-dynamic-color').forEach(txt => txt.style.color = agenceCouleur);
    document.querySelectorAll('.border-dynamic-color').forEach(b => b.style.borderColor = agenceCouleur);
    document.querySelector('.form-container').style.borderTopColor = agenceCouleur;
    document.querySelectorAll('.btn-pdf').forEach(btn => btn.style.backgroundColor = agenceCouleur);
}

function sauvegarderParametresPro() {
    if (!localStorage.getItem('auditpro_cookies')) return showToast("Acceptez les cookies pour sauvegarder.", "error");
    agenceNom = document.getElementById('nomAgenceInput').value.trim() || "AuditPro";
    agenceCouleur = document.getElementById('couleurAgenceInput').value;
    localStorage.setItem('auditpro_agence_nom', agenceNom);
    localStorage.setItem('auditpro_agence_couleur', agenceCouleur);
    if(agenceLogoBase64) localStorage.setItem('auditpro_agence_logo', agenceLogoBase64);
    appliquerCouleurMarqueBlanche();
    chargerHistorique(); 
    showToast("Paramètres sauvegardés !");
}

function reinitialiserMarqueBlanche() {
    localStorage.clear();
    agenceNom = 'AuditPro';
    agenceCouleur = '#00d632'; 
    agenceLogoBase64 = null;
    document.getElementById('nomAgenceInput').value = '';
    document.getElementById('couleurAgenceInput').value = '#00d632';
    appliquerCouleurMarqueBlanche();
    chargerHistorique();
    showToast("Réinitialisation effectuée.");
}

function accepterCookies() {
    localStorage.setItem('auditpro_cookies', 'true');
    document.getElementById('cookie-banner').style.display = 'none';
}

// CORRECTION ABSOLUE DE L'HISTORIQUE (Les boutons fonctionnent à 100%)
function chargerHistorique() {
    const table = document.getElementById('historiqueTableBody');
    if(!table) return;
    const hist = JSON.parse(localStorage.getItem('auditpro_hist_v5')) || [];
    table.innerHTML = '';
    
    if(hist.length === 0) {
        table.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666; padding: 20px;">Aucun dossier généré.</td></tr>';
        return;
    }
    
    hist.reverse().forEach((dossier, index) => {
        let realIndex = hist.length - 1 - index;
        table.innerHTML += `
            <tr class="history-row">
                <td>${dossier.date}</td>
                <td><strong>${dossier.ville}</strong></td>
                <td>${formatNumber(dossier.prixInitial)} €</td>
                <td style="text-align: right;">
                    <button class="btn-voir" onclick="voirHistorique(${realIndex})">Voir</button>
                    <button class="btn-pdf" style="background-color:${agenceCouleur}; color:#fff;" onclick="pdfHistorique(${realIndex})">PDF</button>
                </td>
            </tr>
        `;
    });
}

// OUVRE LE DOSSIER DANS L'ECRAN (Onglet Le Diagnostic)
window.voirHistorique = function(index) {
    const hist = JSON.parse(localStorage.getItem('auditpro_hist_v5')) || [];
    const dossier = hist[index];
    donneesAudit = dossier.data;
    idRapport = dossier.id;
    loyerMensuelSaisi = dossier.loyer || 0;
    
    document.getElementById('prixInitial').value = formatNumber(dossier.prixInitial);
    if(loyerMensuelSaisi > 0) document.getElementById('loyerMensuel').value = formatNumber(loyerMensuelSaisi);
    
    document.querySelector('nav a[href="#audit"]').click();
    document.getElementById('result-wrapper').style.display = "block";
    document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
    afficherEcran();
    showToast("Dossier chargé avec succès.");
};

// TELECHARGE LE DOSSIER DIRECTEMENT EN PDF
window.pdfHistorique = function(index) {
    const hist = JSON.parse(localStorage.getItem('auditpro_hist_v5')) || [];
    const dossier = hist[index];
    donneesAudit = dossier.data;
    idRapport = dossier.id;
    loyerMensuelSaisi = dossier.loyer || 0;
    showToast("Génération du PDF en cours...");
    exporterPDF('download');
};

function ajouterAuHistorique(ville, prixInitial, donneesCompletes) {
    if (!localStorage.getItem('auditpro_cookies')) return;
    const hist = JSON.parse(localStorage.getItem('auditpro_hist_v5')) || [];
    hist.push({
        id: "AUDIT-" + Math.floor(Math.random() * 90000 + 10000),
        date: new Date().toLocaleDateString('fr-FR'),
        ville: ville,
        prixInitial: prixInitial,
        data: donneesCompletes,
        loyer: loyerMensuelSaisi
    });
    localStorage.setItem('auditpro_hist_v5', JSON.stringify(hist));
    chargerHistorique();
}

function viderHistorique() {
    if(confirm("Êtes-vous sûr de vouloir supprimer tout l'historique ?")) {
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
    toast.innerHTML = `<strong>${type === "success" ? "SUCCÈS :" : "ATTENTION :"}</strong> ${message}`;
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

function lancerDemo() {
    document.getElementById('prixInitial').value = "450 000";
    document.getElementById('loyerMensuel').value = "1 200";
    document.getElementById('codePostal').value = "35000";
    loyerMensuelSaisi = 1200;
    idRapport = "DEMO-PRO-" + Math.floor(Math.random() * 90000 + 10000);
    
    donneesAudit = {
        cp: "35000",
        localisation_exacte: "Rennes Métropole",
        impact_marche: "Secteur en tension. Majoration des coûts liée à la demande sur les artisans RGE.",
        date_audit: new Date().toLocaleDateString('fr-FR'),
        prix_initial: 450000,
        total_decote: 28700,
        prix_net: 421300,
        analyse_secteur: "Indice de marché local : 1.18",
        diagnostics: [
            {titre: "Électricité", cout: 4500, loi: "NF C 15-100", detail: "Défaut de mise à la terre.", action: "Mise en sécurité du tableau."},
            {titre: "DPE", cout: 20000, loi: "Loi Climat", detail: "Logement classé F.", action: "Isolation et installation Pompe à Chaleur."},
            {titre: "Amiante", cout: 4200, loi: "Santé Publique", detail: "Conduits en amiante-ciment.", action: "Retrait par société spécialisée."},
            {titre: "Plomb", cout: 0, loi: "Santé Publique", detail: "Aucune trace.", action: "Aucune action."},
            {titre: "Gaz", cout: 0, loi: "Sécurité", detail: "Installation étanche.", action: "Entretien annuel."}
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
    const loyerInputBrut = document.getElementById('loyerMensuel').value.replace(/\s+/g, '');
    const loyerInput = Number(loyerInputBrut) || 0;
    const cpInput = document.getElementById('codePostal').value || "";
    
    if (prixInput <= 0) return showToast("Veuillez indiquer le prix de vente.", "error");
    if (!input.files.length) return showToast("Veuillez charger le fichier PDF.", "error");
    
    loyerMensuelSaisi = loyerInput;
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
    </div>
    
    <div id="paneFinancier" class="report-pane active">
        <h3 style="text-transform: uppercase; font-size: 14px; color: #0b1a14; margin-bottom: 15px;">Évaluation de la Balance Financière</h3>
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
                    backgroundColor: ['#1a1a1a', '#cc0000', '#555555', '#888888', '#aaaaaa', '#dddddd'] 
                }]
            },
            options: { animation: false, plugins: { legend: { position: 'bottom' } } }
        });
    }
}

// PDF MCKINSEY STYLE : SOBRE, DENSIFIÉ ET CLINIQUE (ZÉRO FLUO)
function exporterPDF(action = 'download') {
    if (!donneesAudit) return;
    const btn = document.getElementById('btnExport');
    if(btn) btn.innerText = "Édition du PDF en cours...";
    
    let prixInitFormate = formatNumber(document.getElementById('prixInitial').value.replace(/\s+/g, '')) + ' €';
    let decoteFormate = '-' + formatNumber(donneesAudit.total_decote) + ' €';
    let prixNetFormate = formatNumber(donneesAudit.prix_net) + ' €';

    let tableBody = [
        [
            { text: 'DOMAINE CONTRÔLÉ', style: 'tableHeader' },
            { text: 'ÉTAT', style: 'tableHeader', alignment: 'center' },
            { text: 'DÉTAILS TECHNIQUES', style: 'tableHeader' },
            { text: 'BUDGET', style: 'tableHeader', alignment: 'right' }
        ]
    ];

    donneesAudit.diagnostics.forEach((a, index) => {
        let isAnomalie = a.cout > 0;
        let rowColor = (index % 2 === 0) ? '#fbfbfb' : '#ffffff'; 
        
        tableBody.push([
            { text: a.titre, bold: true, fontSize: 10, color: '#1a1a1a', fillColor: rowColor, margin: [0, 8, 0, 8] },
            { text: isAnomalie ? 'ANOMALIE' : 'CONFORME', bold: true, fontSize: 9, color: isAnomalie ? '#cc0000' : '#555555', alignment: 'center', fillColor: rowColor, margin: [0, 8, 0, 8] },
            { text: `Constat : ${a.detail}\n` + (isAnomalie ? `Action requise : ${a.action}` : ''), fontSize: 9, lineHeight: 1.4, color: '#444444', fillColor: rowColor, margin: [0, 8, 0, 8] },
            { text: isAnomalie ? '-' + formatNumber(a.cout) + ' €' : '0 €', bold: true, fontSize: 11, color: isAnomalie ? '#cc0000' : '#1a1a1a', alignment: 'right', fillColor: rowColor, margin: [0, 8, 0, 8] }
        ]);
    });

    let logoBlock = agenceLogoBase64 
        ? { image: agenceLogoBase64, fit: [140, 50], alignment: 'left' }
        : { text: agenceNom.toUpperCase(), fontSize: 24, bold: true, color: '#1a1a1a', alignment: 'left', letterSpacing: 1 };

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
    
    let anomalies = donneesAudit.diagnostics.filter(d => d.cout > 0);
    let chartBlock = [];
    if (anomalies.length > 0) {
        let chartCanvas = document.getElementById('coutChart');
        if (chartCanvas) {
            chartBlock = [
                { text: 'RÉPARTITION DU BUDGET TRAVAUX', fontSize: 11, bold: true, alignment: 'center', color: '#1a1a1a', margin: [0, 30, 0, 15] },
                { image: chartCanvas.toDataURL('image/png', 1.0), fit: [200, 200], alignment: 'center', margin: [0, 0, 0, 30] }
            ];
        }
    }

    try {
        let docDefinition = {
            pageSize: 'A4',
            pageMargins: [ 40, 60, 40, 60 ],
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
                
                ...chartBlock,
                
                { text: '2. INVENTAIRE TECHNIQUE DÉTAILLÉ (DDT)', style: 'sectionTitle', margin: [0, 20, 0, 10], pageBreak: chartBlock.length > 0 ? 'before' : 'auto' },
                {
                    table: { headerRows: 1, widths: ['25%', '15%', '45%', '15%'], body: tableBody },
                    layout: { 
                        hLineWidth: function (i, node) { return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 1; }, 
                        vLineWidth: function (i, node) { return 0; }, 
                        hLineColor: function (i, node) { return (i === 0 || i === node.table.body.length) ? '#1a1a1a' : '#eeeeee'; }, 
                        paddingTop: function(i, node) { return 10; }, 
                        paddingBottom: function(i, node) { return 10; } 
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
                sectionTitle: { fontSize: 12, bold: true, color: '#1a1a1a', margin: [0, 25, 0, 15], textTransform: 'uppercase' },
                kpiHeader: { alignment: 'center', fontSize: 9, color: '#888', bold: true, margin: [0, 5, 0, 5], textTransform: 'uppercase' },
                kpiHeaderRed: { alignment: 'center', fontSize: 9, color: '#cc0000', bold: true, margin: [0, 5, 0, 5], textTransform: 'uppercase' },
                kpiValue: { alignment: 'center', fontSize: 16, bold: true, color: '#1a1a1a', margin: [0, 10, 0, 10] },
                kpiValueRed: { alignment: 'center', fontSize: 16, bold: true, color: '#cc0000', margin: [0, 10, 0, 10] },
                kpiValueNet: { alignment: 'center', fontSize: 20, bold: true, margin: [0, 10, 0, 10] },
                tableHeader: { bold: true, fontSize: 9, color: '#ffffff', fillColor: '#1a1a1a', margin: [0, 6, 0, 6] },
                footerTitle: { fontSize: 9, bold: true, color: '#1a1a1a' },
                footerText: { fontSize: 8, color: '#666', alignment: 'justify', lineHeight: 1.4 }
            }
        };

        let pdf = pdfMake.createPdf(docDefinition);
        if (action === 'open') {
            pdf.open();
        } else {
            pdf.download(agenceNom + '_Bilan_Technique_' + idRapport + '.pdf');
        }
        if(btn) setTimeout(() => { btn.innerText = "Télécharger le rapport PDF Officiel"; }, 1500);
    } catch(err) {
        showToast("Erreur lors de la génération du PDF.", "error");
        if(btn) btn.innerText = "Télécharger le rapport PDF Officiel";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('nomAgenceInput').value = agenceNom !== 'AuditPro' ? agenceNom : '';
    document.getElementById('couleurAgenceInput').value = agenceCouleur;
    appliquerCouleurMarqueBlanche();
    chargerHistorique();
    
    const liensMenu = document.querySelectorAll('nav a[href^="#"]');
    const blocsOnglets = document.querySelectorAll('.tab-content');

    liensMenu.forEach(lien => {
        lien.addEventListener('click', function(e) {
            e.preventDefault();
            liensMenu.forEach(l => { l.classList.remove('active'); l.style.color = '#fff'; l.style.borderBottomColor = 'transparent'; });
            blocsOnglets.forEach(onglet => onglet.classList.remove('active'));
            this.classList.add('active');
            this.style.color = agenceCouleur;
            this.style.borderBottom = `2px solid ${agenceCouleur}`;
            document.getElementById(`${this.getAttribute('href').substring(1)}-tab`).classList.add('active');
        });
    });
});
