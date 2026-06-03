let donneesAudit = null;
let idRapport = "";
let chartInstance = null;
let loyerMensuelSaisi = 0; // Pour le calcul de rentabilité

// Formatage des prix
const formatNumber = (num) => {
    return Number(num).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ');
};

// --- NOUVEAU : SYSTÈME DE NOTIFICATIONS (TOASTS) ---
function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = type === "success" ? `✅ ${message}` : `⚠️ ${message}`;
    
    container.appendChild(toast);
    
    // Fait disparaître le Toast après 4 secondes
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.4s forwards";
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Envoi API
async function envoyer() {
    const input = document.getElementById('fichierPdf');
    const prixInput = document.getElementById('prixInitial').value || 0;
    const loyerInput = document.getElementById('loyerMensuel').value || 0;
    const cpInput = document.getElementById('codePostal').value || "Non renseigné";
    
    // 1. Remplacement des alerts basiques par nos Toasts !
    if (prixInput <= 0) return showToast("Veuillez indiquer le prix de vente du bien.", "error");
    if (!input.files.length) return showToast("Veuillez charger le diagnostic technique au format PDF.", "error");
    
    loyerMensuelSaisi = Number(loyerInput);

    // 2. Affichage du bel écran de chargement (Overlay)
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
        
        // Cache l'écran de chargement
        document.getElementById('loading-overlay').style.display = "none";
        
        showToast("Audit généré avec succès !");
        document.getElementById('result-wrapper').style.display = "block";
        document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
        afficherEcran();

    } catch (e) {
        document.getElementById('loading-overlay').style.display = "none";
        showToast("Erreur de connexion à l'Intelligence Artificielle.", "error");
    }
}

// Affichage HTML
function afficherEcran() {
    let anomalies = donneesAudit.diagnostics.filter(d => d.cout > 0);
    
    // --- NOUVEAU : CALCUL DE RENTABILITÉ ---
    let kpiRentabiliteHtml = "";
    if (loyerMensuelSaisi > 0) {
        let prixInitial = Number(document.getElementById('prixInitial').value);
        let rentaInitiale = ((loyerMensuelSaisi * 12) / prixInitial) * 100;
        let coutTotalReel = prixInitial + donneesAudit.total_decote;
        let rentaFinale = ((loyerMensuelSaisi * 12) / coutTotalReel) * 100;

        kpiRentabiliteHtml = `
        <h3 style="text-transform: uppercase; font-size: 16px; color: #0b1a14; margin-top: 30px; margin-bottom: 15px;">📊 Simulation de Rentabilité Locative</h3>
        <div class="kpi-grid" style="margin-bottom: 40px;">
            <div class="kpi-box" style="background: #eaf9f0; border-color: #00d632;">
                <div class="kpi-label">Loyer Annuel Estimé</div>
                <div class="kpi-value" style="color: #0b1a14;">${formatNumber(loyerMensuelSaisi * 12)} €</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label">Renta. Brute (Sans Travaux)</div>
                <div class="kpi-value">${rentaInitiale.toFixed(2)} %</div>
            </div>
            <div class="kpi-box main" style="background: #00d632; color: #0b1a14;">
                <div class="kpi-label" style="color: #0b1a14;">Renta. Réelle (Avec Travaux)</div>
                <div class="kpi-value">${rentaFinale.toFixed(2)} %</div>
            </div>
        </div>`;
    }
    
    let html = `
    <div style="border-bottom: 3px solid #0b1a14; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
            <h2 style="font-size: 28px; color: #0b1a14; font-weight: 800; margin: 0;">Dossier d'Expertise Technique</h2>
            <div style="font-size: 15px; color: #6c757d; margin-top: 5px; font-weight: 600;">Checklist Exhaustive & Synthèse Financière</div>
        </div>
        <div style="text-align: right; font-size: 13px; color: #6c757d;">
            <b>Réf. Dossier :</b> ${idRapport}<br>
            <b>Date :</b> ${donneesAudit.date_audit}<br>
            <b>Secteur :</b> ${donneesAudit.cp}
        </div>
    </div>
    
    <h3 style="text-transform: uppercase; font-size: 16px; color: #0b1a14; margin-bottom: 15px;">💰 Valorisation Vénale Conseillée</h3>
    <div class="kpi-grid">
        <div class="kpi-box">
            <div class="kpi-label">Valeur Vénale Initiale</div>
            <div class="kpi-value">${formatNumber(document.getElementById('prixInitial').value)} €</div>
        </div>
        <div class="kpi-box">
            <div class="kpi-label" style="color: #cc0000;">Décote Technique Totale</div>
            <div class="kpi-value" style="color: #cc0000;">-${formatNumber(donneesAudit.total_decote)} €</div>
        </div>
        <div class="kpi-box main">
            <div class="kpi-label">Valeur Nette Conseillée</div>
            <div class="kpi-value">${formatNumber(donneesAudit.prix_net)} €</div>
        </div>
    </div>
    
    ${kpiRentabiliteHtml}
    
    <div style="background: #f8f9fa; border-left: 4px solid #00d632; padding: 20px; border-radius: 4px; margin-bottom: 40px;">
        <h3 style="margin-top: 0; font-size: 16px; text-transform: uppercase; color: #0b1a14;">Plan d'Action & Stratégie d'Expertise</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #495057; line-height: 1.6;">
            ${donneesAudit.solutions.map(s => `<li style="margin-bottom:8px;">${s}</li>`).join('')}
        </ul>
    </div>`;

    if (anomalies.length > 0) {
        html += `
        <h3 style="text-align: center; text-transform: uppercase; font-size: 16px; color: #0b1a14; margin-bottom: 20px;">Répartition du Budget de Rénovation</h3>
        <div class="chart-container"><canvas id="coutChart"></canvas></div>`;
    }

    // Le wrapper table-responsive est ici pour le mobile
    html += `
    <h3 style="text-transform: uppercase; font-size: 16px; color: #0b1a14; margin-bottom: 15px;">Checklist Intégrale des Non-Conformités et Points Forts</h3>
    <div class="table-responsive">
        <table>
            <tr>
                <th style="width: 25%;">Point Réglementaire</th>
                <th style="width: 15%;">Statut</th>
                <th style="width: 45%;">Analyse de l'Expert & Préconisations</th>
                <th style="text-align: right; width: 15%;">Provision</th>
            </tr>
         ${donneesAudit.diagnostics.map(a => `
        <tr style="border-bottom: 1px solid #ecf0f1;">
            <td style="padding: 15px; border-left: 4px solid ${a.cout > 0 ? '#cc0000' : '#00d632'};">
                <b>${a.titre}</b><br><span style="font-size:11px; color:#6c757d;">${a.loi}</span>
            </td>
            <td style="padding: 15px; color: ${a.cout > 0 ? '#cc0000' : '#000000'}; font-weight: bold;">
                ${a.cout > 0 ? 'Anomalie' : 'Conforme'}
            </td>
            <td style="padding: 15px; font-size: 13px; color: #333; line-height: 1.5;">
                <b>Constat :</b> ${a.detail}<br>
                ${a.cout > 0 ? `<b>Action requise :</b> ${a.action}` : ''}
            </td>
            <td style="padding: 15px; font-weight:bold; color: #000000; text-align: right; font-size: 16px;">
                ${a.cout > 0 ? `-${formatNumber(a.cout)} €` : '0 €'}
            </td>
        </tr>`).join('')}
        </table>
    </div>

    <div style="font-size: 10px; color: #adb5bd; text-align: justify; border-top: 1px solid #eaeaea; padding-top: 15px;">
        <b>MENTIONS LÉGALES :</b> Ce document est généré informatiquement par algorithme (modulateur: ${donneesAudit.analyse_secteur}). Il ne se substitue pas à un devis d'artisan certifié RGE ni à un acte notarié. ${donneesAudit.securite}
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
                    backgroundColor: ['#cc0000', '#e67e22', '#3498db', '#9b59b6', '#34495e', '#f1c40f'] 
                }]
            },
            options: { animation: false, plugins: { legend: { position: 'bottom' } } }
        });
    }
}

// Export du PDF complet
function exporterPDF() {
    if (!donneesAudit) return;
    
    const btn = document.getElementById('btnExport');
    btn.innerText = "⏳ Génération PDF natif en cours...";
    
    let prixInitFormate = formatNumber(document.getElementById('prixInitial').value) + ' €';
    let decoteFormate = '-' + formatNumber(donneesAudit.total_decote) + ' €';
    let prixNetFormate = formatNumber(donneesAudit.prix_net) + ' €';

    let listSolutions = [];
    donneesAudit.solutions.forEach(s => { listSolutions.push({ text: s, margin: [0, 0, 0, 8] }); });

    let tableBody = [
        [
            { text: 'Point Réglementaire', style: 'tableHeader' },
            { text: 'Statut', style: 'tableHeader' },
            { text: 'Analyse & Préconisations', style: 'tableHeader' },
            { text: 'Provision', style: 'tableHeader', alignment: 'right' }
        ]
    ];

   donneesAudit.diagnostics.forEach(a => {
    let isAnomalie = a.cout > 0;
    let analyseCell = [ { text: 'Constat : ', bold: true }, { text: a.detail } ];
    if (isAnomalie) {
        analyseCell.push({ text: '\nAction : ', bold: true });
        analyseCell.push({ text: a.action });
    }

    tableBody.push([
        { text: a.titre + '\n' + a.loi, color: '#000000', bold: true, fontSize: 10 },
        { text: isAnomalie ? 'Anomalie' : 'Conforme', color: isAnomalie ? '#cc0000' : '#000000', bold: true, fontSize: 10 },
        { text: analyseCell, fontSize: 10, color: '#333' },
        { text: isAnomalie ? '-' + formatNumber(a.cout) + ' €' : '0 €', color: '#000000', bold: true, alignment: 'right', fontSize: 12 }
    ]);
    });

    let anomalies = donneesAudit.diagnostics.filter(d => d.cout > 0);
    let chartBlock = [];
    if (anomalies.length > 0) {
        let chartCanvas = document.getElementById('coutChart');
        if (chartCanvas) {
            chartBlock = [
                { text: 'RÉPARTITION DU BUDGET DE RÉNOVATION', style: 'sectionTitle', alignment: 'center', margin: [0, 20, 0, 15] },
                { image: chartCanvas.toDataURL('image/png', 1.0), width: 300, alignment: 'center', margin: [0, 0, 0, 30] }
            ];
        }
    }
    
    // Ajout bloc PDF Rentabilité
    let rentaBlock = [];
    if (loyerMensuelSaisi > 0) {
        let prixInitial = Number(document.getElementById('prixInitial').value);
        let rentaInitiale = ((loyerMensuelSaisi * 12) / prixInitial) * 100;
        let coutTotalReel = prixInitial + donneesAudit.total_decote;
        let rentaFinale = ((loyerMensuelSaisi * 12) / coutTotalReel) * 100;
        
        rentaBlock = [
            { text: '1.BIS SIMULATION DE RENTABILITÉ', style: 'sectionTitle' },
            {
                table: {
                    widths: ['*', '*', '*'],
                    body: [
                        [ { text: 'Loyer Annuel', style: 'kpiLabel' }, { text: 'Renta. Brute (Sans Travaux)', style: 'kpiLabel' }, { text: 'Renta. Réelle (Avec Travaux)', style: 'kpiLabelDark' } ],
                        [ { text: formatNumber(loyerMensuelSaisi * 12) + ' €', style: 'kpiValue' }, { text: rentaInitiale.toFixed(2) + ' %', style: 'kpiValue' }, { text: rentaFinale.toFixed(2) + ' %', style: 'kpiValueDark' } ]
                    ]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 20]
            }
        ];
    }

    let docDefinition = {
        pageSize: 'A4',
        pageMargins: [ 40, 40, 40, 60 ],
        footer: function(currentPage, pageCount) {
            return {
                columns: [
                    { text: 'AuditPro Diagnostics © 2026', fontSize: 8, color: '#888', alignment: 'left', margin: [40, 10] },
                    { text: 'Page ' + currentPage.toString() + ' sur ' + pageCount, fontSize: 8, color: '#888', alignment: 'right', margin: [40, 10] }
                ]
            };
        },
        content: [
            {
                columns: [
                    { text: 'AUDITPRO', style: 'header', width: '50%' },
                    { text: 'Réf. Dossier : ' + idRapport + '\nÉdité le : ' + donneesAudit.date_audit + '\nLocalisation : ' + donneesAudit.cp, alignment: 'right', style: 'meta', width: '50%' }
                ]
            },
            { text: 'Dossier d\'Expertise Technique et Synthèse Financière', style: 'subheader' },
            
            { text: '1. VALORISATION VÉNALE CONSEILLÉE', style: 'sectionTitle' },
            {
                table: {
                    widths: ['*', '*', '*'],
                    body: [
                        [ { text: 'Valeur Vénale Initiale', style: 'kpiLabel' }, { text: 'Provisions Travaux', style: 'kpiLabelRed' }, { text: 'Valeur Nette Recommandée', style: 'kpiLabelDark' } ],
                        [ { text: prixInitFormate, style: 'kpiValue' }, { text: decoteFormate, style: 'kpiValueRed' }, { text: prixNetFormate, style: 'kpiValueDark' } ]
                    ]
                },
                layout: 'noBorders'
            },
            { text: '\nCoefficients économiques appliqués : ' + donneesAudit.analyse_secteur + '\n\n', fontSize: 9, italics: true, color: '#777', alignment: 'center', margin: [0, 0, 0, 20] },
            
            ...rentaBlock,
            
            { text: '2. PLAN D\'ACTION & STRATÉGIE', style: 'sectionTitle' },
            { ul: listSolutions, fontSize: 11, color: '#333', margin: [15, 0, 0, 25] },
            
            ...chartBlock,
            
            { text: '3. CHECKLIST INTÉGRALE DES CONTRÔLES (DDT)', style: 'sectionTitle' },
            {
                table: {
                    headerRows: 1,
                    widths: ['25%', '15%', '45%', '15%'],
                    body: tableBody
                },
                layout: {
                    hLineWidth: function (i, node) { return (i === 0 || i === node.table.body.length) ? 2 : 1; },
                    vLineWidth: function (i, node) { return 0; },
                    hLineColor: function (i, node) { return (i === 0 || i === node.table.body.length) ? '#0b1a14' : '#ddd'; },
                    paddingTop: function(i, node) { return 12; },
                    paddingBottom: function(i, node) { return 12; },
                    fillColor: function (i, node) { return (i > 0 && node.table.body[i][1].text === 'Conforme') ? '#f9fff9' : null; }
                }
            },
            
            { text: '\nAVERTISSEMENTS ET LIMITES DE RESPONSABILITÉ JURIDIQUE\n', style: 'footerTitle' },
            { text: 'Ce rapport est une analyse macro-économique informatisée des données textuelles du Dossier de Diagnostic Technique (DDT). Il est fourni à titre indicatif pour la négociation commerciale. Les montants sont des estimations nationales et ne sauraient remplacer l\'établissement de devis contradictoires par des artisans certifiés RGE. ' + donneesAudit.securite, style: 'footerText' }
        ],
        styles: {
            header: { fontSize: 24, bold: true, color: '#0b1a14' },
            subheader: { fontSize: 14, color: '#555', marginBottom: 25 },
            meta: { fontSize: 10, color: '#666', lineHeight: 1.4 },
            sectionTitle: { fontSize: 13, bold: true, color: '#0b1a14', margin: [0, 20, 0, 10] },
            kpiLabel: { alignment: 'center', fontSize: 10, color: '#666', bold: true, margin: [0, 10, 0, 5] },
            kpiLabelRed: { alignment: 'center', fontSize: 10, color: '#cc0000', bold: true, margin: [0, 10, 0, 5] },
            kpiLabelDark: { alignment: 'center', fontSize: 10, color: '#fff', fillColor: '#0b1a14', bold: true, margin: [0, 10, 0, 5] },
            kpiValue: { alignment: 'center', fontSize: 16, bold: true, color: '#333', margin: [0, 0, 0, 10] },
            kpiValueRed: { alignment: 'center', fontSize: 16, bold: true, color: '#cc0000', margin: [0, 0, 0, 10] },
            kpiValueDark: { alignment: 'center', fontSize: 20, bold: true, color: '#00d632', fillColor: '#0b1a14', margin: [0, 0, 0, 10] },
            tableHeader: { bold: true, fontSize: 10, color: '#0b1a14', fillColor: '#f8f9fa', margin: [0, 4, 0, 4] },
            footerTitle: { fontSize: 10, bold: true, color: '#0b1a14', margin: [0, 40, 0, 5] },
            footerText: { fontSize: 8, color: '#666', alignment: 'justify', lineHeight: 1.4 }
        }
    };

    pdfMake.createPdf(docDefinition).download('AuditPro_Expertise_' + idRapport + '.pdf');
    setTimeout(() => { btn.innerText = "📥 Télécharger le rapport PDF Officiel"; }, 1000);
}

// Fonction Avis avec Toasts
function ajouterAvis() {
    const nom = document.getElementById('nomAvis').value;
    const texte = document.getElementById('texteAvis').value;
    
    if (!nom || !texte) return showToast("Veuillez remplir votre nom et votre avis.", "error");

    const nouvelAvis = document.createElement('div');
    nouvelAvis.className = 'avis-card';
    nouvelAvis.style.cssText = 'flex: 1; min-width: 300px; background: #fff; padding: 25px; border-radius: 10px; border: 1px solid #eee;';
    nouvelAvis.innerHTML = `<div style="color: #f39c12; font-size: 20px; margin-bottom: 10px;">★★★★★</div><p style="font-size: 14px; font-style: italic; color: #495057;">"${texte}"</p><div style="font-weight: 700; font-size: 14px; margin-top: 10px;">- ${nom}</div>`;

    document.getElementById('listeAvis').prepend(nouvelAvis);

    const avisSauvegardes = JSON.parse(localStorage.getItem('auditpro_avis')) || [];
    avisSauvegardes.push({ nom: nom, texte: texte });
    localStorage.setItem('auditpro_avis', JSON.stringify(avisSauvegardes));

    document.getElementById('nomAvis').value = '';
    document.getElementById('texteAvis').value = '';
    showToast("Votre avis a bien été publié !");
}

document.addEventListener("DOMContentLoaded", () => {
    
    // Chargement des avis au démarrage
    const avisSauvegardes = JSON.parse(localStorage.getItem('auditpro_avis')) || [];
    const listeAvis = document.getElementById('listeAvis');
    avisSauvegardes.forEach(avis => {
        const nouvelAvis = document.createElement('div');
        nouvelAvis.className = 'avis-card';
        nouvelAvis.style.cssText = 'flex: 1; min-width: 300px; background: #fff; padding: 25px; border-radius: 10px; border: 1px solid #eee;';
        nouvelAvis.innerHTML = `<div style="color: #f39c12; font-size: 20px; margin-bottom: 10px;">★★★★★</div><p style="font-size: 14px; font-style: italic; color: #495057;">"${avis.texte}"</p><div style="font-weight: 700; font-size: 14px; margin-top: 10px;">- ${avis.nom}</div>`;
        listeAvis.prepend(nouvelAvis);
    });

    const liensMenu = document.querySelectorAll('nav a[href^="#"]');
    const blocsOnglets = document.querySelectorAll('.tab-content');
    const btnNouveauDiag = document.querySelector('header .btn-solid');

    function changerOnglet(targetId) {
        liensMenu.forEach(lien => lien.classList.remove('active'));
        blocsOnglets.forEach(onglet => onglet.classList.remove('active'));

        const lienActif = document.querySelector(`nav a[href="${targetId}"]`);
        if (lienActif) lienActif.classList.add('active');

        const ongletCible = document.getElementById(`${targetId.substring(1)}-tab`);
        if (ongletCible) ongletCible.classList.add('active');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    liensMenu.forEach(lien => {
        lien.addEventListener('click', function(e) {
            e.preventDefault();
            changerOnglet(this.getAttribute('href'));
        });
    });

    if (btnNouveauDiag) {
        btnNouveauDiag.addEventListener('click', () => {
            document.getElementById('prixInitial').value = '';
            document.getElementById('loyerMensuel').value = '';
            document.getElementById('codePostal').value = '';
            document.getElementById('fichierPdf').value = '';
            document.querySelector('.drop-zone-text').innerHTML = "📂 Glissez-déposez votre PDF ici ou cliquez";
            document.getElementById('drop-zone').style.borderColor = "#ced4da";
            document.getElementById('drop-zone').style.background = "#f8f9fa";
            document.getElementById('result-wrapper').style.display = 'none';
            document.getElementById('contenu-ecran').innerHTML = '';
            changerOnglet('#audit');
        });
    }

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('fichierPdf');
    const dropZoneText = document.querySelector('.drop-zone-text');

    if (dropZone && fileInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

        ['dragenter', 'dragover'].forEach(eventName => { dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false); });
        ['dragleave', 'drop'].forEach(eventName => { dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false); });

        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                dropZoneText.innerHTML = `✅ Fichier prêt : <b style="color:#0b1a14;">${this.files[0].name}</b>`;
                dropZone.style.borderColor = "#00d632";
                dropZone.style.background = "#eaf9f0";
            }
        });
    }
});
