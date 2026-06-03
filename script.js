let donneesAudit = null;
let idRapport = "";
let chartInstance = null;
let loyerMensuelSaisi = 0; // Pour le calcul de rentabilité

// Formatage des prix
const formatNumber = (num) => {
    return Number(num).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ');
};

// SYSTÈME DE NOTIFICATIONS (SANS EMOJIS)
function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let prefix = type === "success" ? "SUCCÈS : " : "ERREUR : ";
    toast.innerHTML = `<strong>${prefix}</strong> ${message}`;
    
    container.appendChild(toast);
    
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
    
    if (prixInput <= 0) return showToast("Veuillez indiquer le prix de vente du bien.", "error");
    if (!input.files.length) return showToast("Veuillez charger le diagnostic technique au format PDF.", "error");
    
    loyerMensuelSaisi = Number(loyerInput);

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
        
        showToast("Audit généré avec succès.");
        document.getElementById('result-wrapper').style.display = "block";
        document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
        afficherEcran();

    } catch (e) {
        document.getElementById('loading-overlay').style.display = "none";
        showToast("Impossible de se connecter au moteur d'analyse.", "error");
    }
}

// Affichage HTML sur le site
function afficherEcran() {
    let anomalies = donneesAudit.diagnostics.filter(d => d.cout > 0);
    
    let kpiRentabiliteHtml = "";
    if (loyerMensuelSaisi > 0) {
        let prixInitial = Number(document.getElementById('prixInitial').value);
        let rentaInitiale = ((loyerMensuelSaisi * 12) / prixInitial) * 100;
        let coutTotalReel = prixInitial + donneesAudit.total_decote;
        let rentaFinale = ((loyerMensuelSaisi * 12) / coutTotalReel) * 100;

        kpiRentabiliteHtml = `
        <h3 style="text-transform: uppercase; font-size: 16px; color: #0b1a14; margin-top: 30px; margin-bottom: 15px;">Simulation de Rentabilité Locative</h3>
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
    
    <h3 style="text-transform: uppercase; font-size: 16px; color: #0b1a14; margin-bottom: 15px;">Valorisation Vénale Conseillée</h3>
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

    html += `
    <h3 style="text-transform: uppercase; font-size: 16px; color: #0b1a14; margin-bottom: 15px;">Checklist Intégrale des Non-Conformités et Points Forts</h3>
    <div class="table-responsive">
        <table>
            <tr>
                <th style="width: 25%;">Point Réglementaire</th>
                <th style="width: 15%; text-align: center;">Statut</th>
                <th style="width: 45%;">Analyse de l'Expert & Préconisations</th>
                <th style="text-align: right; width: 15%;">Provision</th>
            </tr>
         ${donneesAudit.diagnostics.map(a => `
        <tr style="border-bottom: 1px solid #ecf0f1;">
            <td style="padding: 15px; border-left: 4px solid ${a.cout > 0 ? '#cc0000' : '#00d632'};">
                <b>${a.titre}</b><br><span style="font-size:11px; color:#6c757d;">${a.loi}</span>
            </td>
            <td style="padding: 15px; color: ${a.cout > 0 ? '#cc0000' : '#000000'}; font-weight: bold; text-align: center;">
                ${a.cout > 0 ? 'ANOMALIE' : 'CONFORME'}
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

// ==============================================================================
// GESTION DU NOUVEAU PDF PREMIUM (Correction du grand blanc)
// ==============================================================================
function exporterPDF() {
    if (!donneesAudit) return;
    
    const btn = document.getElementById('btnExport');
    btn.innerText = "Génération PDF en cours...";
    
    let prixInitFormate = formatNumber(document.getElementById('prixInitial').value) + ' €';
    let decoteFormate = '-' + formatNumber(donneesAudit.total_decote) + ' €';
    let prixNetFormate = formatNumber(donneesAudit.prix_net) + ' €';

    let listSolutions = [];
    donneesAudit.solutions.forEach(s => { listSolutions.push({ text: s, margin: [0, 5, 0, 5] }); });

    let tableBody = [
        [
            { text: 'POINT RÉGLEMENTAIRE', style: 'tableHeader' },
            { text: 'STATUT', style: 'tableHeader', alignment: 'center' },
            { text: 'ANALYSE DE L\'EXPERT & PRÉCONISATIONS', style: 'tableHeader' },
            { text: 'PROVISION', style: 'tableHeader', alignment: 'right' }
        ]
    ];

    donneesAudit.diagnostics.forEach(a => {
        let isAnomalie = a.cout > 0;
        let statusText = isAnomalie ? 'ANOMALIE' : 'CONFORME';
        let statusColor = isAnomalie ? '#cc0000' : '#00d632';
        
        let analyseCell = [
            { text: 'Constat : ', bold: true, color: '#333' },
            { text: a.detail, color: '#555' }
        ];
        
        if (isAnomalie) {
            analyseCell.push({ text: '\nAction requise : ', bold: true, color: '#0b1a14' });
            analyseCell.push({ text: a.action, color: '#555' });
        }

        tableBody.push([
            { text: a.titre + '\n\n', bold: true, fontSize: 10, color: '#0b1a14' },
            { text: statusText, bold: true, fontSize: 9, color: statusColor, alignment: 'center', margin: [0, 5, 0, 0] },
            { text: analyseCell, fontSize: 9, lineHeight: 1.4 },
            { text: isAnomalie ? '-' + formatNumber(a.cout) + ' €' : '0 €', bold: true, fontSize: 12, color: isAnomalie ? '#cc0000' : '#0b1a14', alignment: 'right' }
        ]);
    });

    let anomalies = donneesAudit.diagnostics.filter(d => d.cout > 0);
    
    // NOUVELLE MISE EN PAGE : Stratégie à gauche, Graphique à droite !
    let strategyContainer = {
        table: {
            widths: ['*'],
            body: [ [ { ul: listSolutions, fontSize: 10, lineHeight: 1.6, color: '#333333', margin: [10, 10, 10, 10] } ] ]
        },
        layout: { hLineWidth: () => 0, vLineWidth: (i) => i === 0 ? 4 : 0, vLineColor: () => '#00d632', fillColor: () => '#f4fbf7' }
    };

    let strategyRow = {
        columns: [
            { width: anomalies.length > 0 ? '55%' : '100%', stack: [strategyContainer] }
        ],
        margin: [0, 0, 0, 30]
    };

    if (anomalies.length > 0) {
        let chartCanvas = document.getElementById('coutChart');
        if (chartCanvas) {
            strategyRow.columns.push({
                width: '45%',
                stack: [
                    { text: 'RÉPARTITION DU BUDGET', fontSize: 10, bold: true, alignment: 'center', color: '#0b1a14', margin: [0, 0, 0, 10] },
                    { image: chartCanvas.toDataURL('image/png', 1.0), width: 180, alignment: 'center' }
                ]
            });
        }
    }
    
    let rentaBlock = [];
    if (loyerMensuelSaisi > 0) {
        let prixInitial = Number(document.getElementById('prixInitial').value);
        let rentaInitiale = ((loyerMensuelSaisi * 12) / prixInitial) * 100;
        let coutTotalReel = prixInitial + donneesAudit.total_decote;
        let rentaFinale = ((loyerMensuelSaisi * 12) / coutTotalReel) * 100;
        
        rentaBlock = [
            { text: '2. SIMULATION DE RENTABILITÉ LOCATIVE', style: 'sectionTitle' },
            {
                table: {
                    widths: ['*', '*', '*'],
                    body: [
                        [ 
                            { text: 'Loyer Annuel Estimé', style: 'kpiHeader' }, 
                            { text: 'Renta. Brute (Sans Travaux)', style: 'kpiHeader' }, 
                            { text: 'Renta. Réelle (Avec Travaux)', style: 'kpiHeaderGreen' } 
                        ],
                        [ 
                            { text: formatNumber(loyerMensuelSaisi * 12) + ' €', style: 'kpiValue' }, 
                            { text: rentaInitiale.toFixed(2) + ' %', style: 'kpiValue' }, 
                            { text: rentaFinale.toFixed(2) + ' %', style: 'kpiValueGreen' } 
                        ]
                    ]
                },
                layout: {
                    hLineWidth: () => 0, vLineWidth: () => 0,
                    fillColor: function (rowIndex, node, columnIndex) {
                        if (rowIndex === 0) return '#f8f9fa';
                        if (rowIndex === 1) return '#ffffff';
                        return null;
                    },
                    paddingLeft: () => 15, paddingRight: () => 15, paddingTop: () => 15, paddingBottom: () => 15
                },
                margin: [0, 0, 0, 30]
            }
        ];
    }

    let docDefinition = {
        pageSize: 'A4',
        pageMargins: [ 40, 70, 40, 60 ],
        defaultStyle: { font: 'Roboto', color: '#333333' },
        
        header: function(currentPage) {
            if (currentPage > 1) {
                return {
                    columns: [
                        { text: 'AUDITPRO', bold: true, color: '#00d632', fontSize: 13 },
                        { text: 'Réf. ' + idRapport + ' | ' + donneesAudit.cp, alignment: 'right', color: '#888888', fontSize: 9, margin: [0, 4, 0, 0] }
                    ],
                    margin: [40, 25, 40, 0]
                };
            }
        },
        
        footer: function(currentPage, pageCount) {
            return {
                columns: [
                    { text: 'Document certifié AuditPro IA © 2026', fontSize: 8, color: '#999999' },
                    { text: 'Page ' + currentPage.toString() + ' sur ' + pageCount, alignment: 'right', fontSize: 8, color: '#999999' }
                ],
                margin: [40, 20, 40, 0]
            };
        },
        
        content: [
            { text: 'AUDITPRO', fontSize: 44, bold: true, color: '#0b1a14', alignment: 'center', margin: [0, 80, 0, 0] },
            { text: 'L\'expertise immobilière propulsée par l\'IA', fontSize: 14, color: '#00d632', alignment: 'center', margin: [0, 5, 0, 50] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 3, lineColor: '#00d632' }], alignment: 'center', margin: [0, 0, 0, 50] },
            
            { text: 'RAPPORT D\'EXPERTISE TECHNIQUE', fontSize: 26, bold: true, color: '#0b1a14', alignment: 'center', margin: [0, 0, 0, 15] },
            { text: 'Analyse réglementaire approfondie & Chiffrage macro-économique des anomalies', fontSize: 12, color: '#666666', alignment: 'center', margin: [0, 0, 0, 80] },
            
            {
                table: {
                    widths: ['50%', '50%'],
                    body: [
                        [ { text: 'DÉTAILS DU DOSSIER', colSpan: 2, style: 'coverTableTitle' }, {} ],
                        [ { text: 'Référence Unique :', style: 'coverLabel' }, { text: idRapport, style: 'coverValue' } ],
                        [ { text: 'Date de l\'audit :', style: 'coverLabel' }, { text: donneesAudit.date_audit, style: 'coverValue' } ],
                        [ { text: 'Secteur géographique :', style: 'coverLabel' }, { text: donneesAudit.cp, style: 'coverValue' } ]
                    ]
                },
                layout: 'lightHorizontalLines',
                margin: [80, 0, 80, 0]
            },
            { text: '', pageBreak: 'after' },

            { text: '1. VALORISATION VÉNALE CONSEILLÉE', style: 'sectionTitle' },
            {
                table: {
                    widths: ['*', '*', '*'],
                    body: [
                        [
                            { text: 'Valeur Vénale Initiale', style: 'kpiHeader' },
                            { text: 'Provisions Travaux', style: 'kpiHeaderRed' },
                            { text: 'Valeur Nette Conseillée', style: 'kpiHeaderDark' }
                        ],
                        [
                            { text: prixInitFormate, style: 'kpiValue' },
                            { text: decoteFormate, style: 'kpiValueRed' },
                            { text: prixNetFormate, style: 'kpiValueDark' }
                        ]
                    ]
                },
                layout: {
                    hLineWidth: () => 0, vLineWidth: () => 0,
                    fillColor: function (rowIndex, node, columnIndex) {
                        if (rowIndex === 0) return (columnIndex === 2) ? '#0b1a14' : '#f8f9fa';
                        if (rowIndex === 1) return (columnIndex === 2) ? '#0b1a14' : '#ffffff';
                        return null;
                    },
                    paddingLeft: () => 15, paddingRight: () => 15, paddingTop: () => 15, paddingBottom: () => 15
                },
                margin: [0, 0, 0, 10]
            },
            { text: 'Coefficients économiques appliqués : ' + donneesAudit.analyse_secteur, fontSize: 8, italics: true, color: '#888', alignment: 'center', margin: [0, 0, 0, 30] },
            
            ...rentaBlock,
            
            { text: (loyerMensuelSaisi > 0 ? '3.' : '2.') + ' STRATÉGIE & PLAN D\'ACTION', style: 'sectionTitle' },
            
            // On affiche le conteneur scindé (Texte à gauche, Graphique à droite) et plus de saut de page gâché !
            strategyRow,

            { text: (loyerMensuelSaisi > 0 ? '4.' : '3.') + ' INVENTAIRE DÉTAILLÉ DES POINTS DE CONTRÔLE (DDT)', style: 'sectionTitle' },
            {
                table: {
                    headerRows: 1,
                    widths: ['25%', '15%', '45%', '15%'],
                    body: tableBody
                },
                layout: {
                    hLineWidth: function (i, node) { return (i === 0 || i === 1 || i === node.table.body.length) ? 2 : 1; },
                    vLineWidth: function (i, node) { return 0; },
                    hLineColor: function (i, node) { return (i === 0 || i === 1 || i === node.table.body.length) ? '#0b1a14' : '#eeeeee'; },
                    paddingTop: function(i, node) { return 15; },
                    paddingBottom: function(i, node) { return 15; },
                    fillColor: function (i, node) {
                        if (i === 0) return '#0b1a14';
                        return (i % 2 === 0) ? '#fafafa' : '#ffffff';
                    }
                }
            },
            
            { text: 'AVERTISSEMENTS ET LIMITES DE RESPONSABILITÉ JURIDIQUE', style: 'footerTitle', margin: [0, 50, 0, 5] },
            { text: 'Ce rapport est une analyse macro-économique générée informatiquement à partir des données textuelles extraites du Dossier de Diagnostic Technique (DDT). Il est fourni exclusivement à titre d\'aide à la décision et de levier de négociation commerciale. Les chiffrages sont des estimations statistiques nationales ajustées par secteur géographique, et ne peuvent en aucun cas se substituer à la réalisation de devis contradictoires par des entreprises certifiées RGE. ' + donneesAudit.securite, style: 'footerText' }
        ],
        styles: {
            coverTableTitle: { fontSize: 12, bold: true, color: '#0b1a14', alignment: 'center', margin: [0, 10, 0, 10], fillColor: '#eaf9f0' },
            coverLabel: { fontSize: 11, bold: true, color: '#555', alignment: 'right', margin: [0, 10, 10, 10] },
            coverValue: { fontSize: 11, color: '#000', alignment: 'left', margin: [10, 10, 0, 10] },
            sectionTitle: { fontSize: 14, bold: true, color: '#0b1a14', margin: [0, 20, 0, 15], textTransform: 'uppercase' },
            kpiHeader: { alignment: 'center', fontSize: 10, color: '#666', bold: true },
            kpiHeaderRed: { alignment: 'center', fontSize: 10, color: '#cc0000', bold: true },
            kpiHeaderDark: { alignment: 'center', fontSize: 10, color: '#ffffff', bold: true },
            kpiHeaderGreen: { alignment: 'center', fontSize: 10, color: '#00923E', bold: true },
            kpiValue: { alignment: 'center', fontSize: 18, bold: true, color: '#333' },
            kpiValueRed: { alignment: 'center', fontSize: 18, bold: true, color: '#cc0000' },
            kpiValueDark: { alignment: 'center', fontSize: 20, bold: true, color: '#00d632' },
            kpiValueGreen: { alignment: 'center', fontSize: 20, bold: true, color: '#00923E' },
            tableHeader: { bold: true, fontSize: 10, color: '#ffffff', alignment: 'left' },
            footerTitle: { fontSize: 9, bold: true, color: '#0b1a14' },
            footerText: { fontSize: 8, color: '#888', alignment: 'justify', lineHeight: 1.4 }
        }
    };

    pdfMake.createPdf(docDefinition).download('AuditPro_Expertise_' + idRapport + '.pdf');
    setTimeout(() => { btn.innerText = "Télécharger le rapport PDF Officiel"; }, 1500);
}

// Fonction Avis (sans Emojis)
function ajouterAvis() {
    const nom = document.getElementById('nomAvis').value;
    const texte = document.getElementById('texteAvis').value;
    
    if (!nom || !texte) return showToast("Veuillez remplir votre nom et votre avis.", "error");

    const nouvelAvis = document.createElement('div');
    nouvelAvis.className = 'avis-card';
    nouvelAvis.style.cssText = 'flex: 1; min-width: 300px; background: #fff; padding: 25px; border-radius: 10px; border: 1px solid #eee;';
    nouvelAvis.innerHTML = `<div style="color: #f39c12; font-size: 20px; margin-bottom: 10px;">&#9733;&#9733;&#9733;&#9733;&#9733;</div><p style="font-size: 14px; font-style: italic; color: #495057;">"${texte}"</p><div style="font-weight: 700; font-size: 14px; margin-top: 10px;">- ${nom}</div>`;

    document.getElementById('listeAvis').prepend(nouvelAvis);

    const avisSauvegardes = JSON.parse(localStorage.getItem('auditpro_avis')) || [];
    avisSauvegardes.push({ nom: nom, texte: texte });
    localStorage.setItem('auditpro_avis', JSON.stringify(avisSauvegardes));

    document.getElementById('nomAvis').value = '';
    document.getElementById('texteAvis').value = '';
    showToast("Votre avis a bien été publié !");
}

document.addEventListener("DOMContentLoaded", () => {
    
    const avisSauvegardes = JSON.parse(localStorage.getItem('auditpro_avis')) || [];
    const listeAvis = document.getElementById('listeAvis');
    avisSauvegardes.forEach(avis => {
        const nouvelAvis = document.createElement('div');
        nouvelAvis.className = 'avis-card';
        nouvelAvis.style.cssText = 'flex: 1; min-width: 300px; background: #fff; padding: 25px; border-radius: 10px; border: 1px solid #eee;';
        nouvelAvis.innerHTML = `<div style="color: #f39c12; font-size: 20px; margin-bottom: 10px;">&#9733;&#9733;&#9733;&#9733;&#9733;</div><p style="font-size: 14px; font-style: italic; color: #495057;">"${avis.texte}"</p><div style="font-weight: 700; font-size: 14px; margin-top: 10px;">- ${avis.nom}</div>`;
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
            document.querySelector('.drop-zone-text').innerHTML = "Glissez-déposez votre PDF ici ou cliquez";
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
                dropZoneText.innerHTML = `Fichier chargé : <b style="color:#0b1a14;">${this.files[0].name}</b>`;
                dropZone.style.borderColor = "#00d632";
                dropZone.style.background = "#eaf9f0";
            }
        });
    }
});
