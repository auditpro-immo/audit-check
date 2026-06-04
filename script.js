let donneesAudit = null;
let idRapport = "";
let chartInstance = null;
let loyerMensuelSaisi = 0;
let profilActuel = "particulier";

const formatNumber = (num) => {
    return Number(num).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ');
};

function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let prefix = type === "success" ? "SUCCÈS : " : "ATTENTION : ";
    toast.innerHTML = `<strong>${prefix}</strong> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.4s forwards";
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// FONCTION PORTAIL : Adapte le site au clic sur l'écran d'accueil
function choisirProfil(profil) {
    profilActuel = profil;
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // Adaptation des textes de la page d'accueil
    if(profil === "professionnel") {
        document.getElementById('hero-badge').innerText = "Espace Professionnels (B2B)";
        document.getElementById('hero-title').innerText = "Justifiez vos estimations et sécurisez vos transactions.";
        document.getElementById('hero-desc').innerText = "Notre technologie d'analyse traduit instantanément les PDF de diagnostics en rapports chiffrés. Un outil pensé pour rassurer vos acquéreurs et obtenir l'exclusivité auprès des vendeurs.";
        document.getElementById('form-title').innerText = "Simulateur pour les agences";
        document.getElementById('nav-pro').style.display = "inline-block";
    } else {
        document.getElementById('hero-badge').innerText = "Espace Particuliers (B2C)";
        document.getElementById('hero-title').innerText = "Sécurisez votre achat en chiffrant les travaux cachés.";
        document.getElementById('hero-desc').innerText = "Notre outil analyse l'ensemble des diagnostics obligatoires de la maison que vous visitez. Obtenez en 2 minutes le vrai coût des remises aux normes.";
        document.getElementById('form-title').innerText = "Mon analyse technique";
        document.getElementById('nav-pro').style.display = "none";
    }
}

function ouvrirModalPro() { document.getElementById('modalPro').style.display = 'flex'; }
function fermerModalPro() { document.getElementById('modalPro').style.display = 'none'; }
function soumettrePro(event) {
    event.preventDefault(); 
    fermerModalPro();
    showToast("Demande envoyée avec succès. Notre équipe vous contactera sous 24h.");
}

function copierScript() {
    const texte = document.getElementById('texteScript').innerText;
    navigator.clipboard.writeText(texte).then(() => {
        showToast("Texte copié dans le presse-papier.");
    });
}

function switchReportTab(tabId) {
    document.querySelectorAll('.report-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.report-pane').forEach(pane => pane.classList.remove('active'));
    document.querySelector(`[onclick="switchReportTab('${tabId}')"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function lancerDemo() {
    document.getElementById('prixInitial').value = 245000;
    document.getElementById('loyerMensuel').value = 950;
    document.getElementById('codePostal').value = 35000;
    
    loyerMensuelSaisi = 950;
    idRapport = "DEMO-" + Math.floor(Math.random() * 90000 + 10000);
    
    donneesAudit = {
        cp: "35000",
        localisation_exacte: "Rennes (Secteur Ille-et-Vilaine)",
        impact_marche: "Métropole régionale en forte croissance économique. La forte demande sur le locatif et le durcissement de la Loi Climat créent une tension sur les artisans certifiés RGE, justifiant un ajustement des devis locaux de 18%.",
        date_audit: new Date().toLocaleDateString('fr-FR'),
        prix_initial: 245000,
        total_decote: 24500,
        prix_net: 220500,
        analyse_secteur: "Indice de marché local : 1.18",
        securite: "Vos données sont privées : Le PDF a été supprimé de nos serveurs.",
        solutions: [
            "Sécurisation du tableau électrique recommandée.",
            "Amélioration de la performance énergétique requise (Classe F)."
        ],
        diagnostics: [
            {titre: "Électricité (Sécurité des personnes)", cout: 4500, loi: "Norme NF C 15-100", detail: "Matériel ancien ou absence de mise à la terre.", action: "Mise en sécurité du tableau électrique par un professionnel."},
            {titre: "DPE (Consommation d'énergie)", cout: 20000, loi: "Loi Climat & Résilience", detail: "Logement classé F (Nécessite une optimisation énergétique).", action: "Isolation et amélioration du système de chauffage."}
        ]
    };
    
    showToast("Simulation Démo activée.");
    document.getElementById('result-wrapper').style.display = "block";
    document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
    afficherEcran();
}

async function envoyer() {
    const input = document.getElementById('fichierPdf');
    const prixInput = document.getElementById('prixInitial').value || 0;
    const loyerInput = document.getElementById('loyerMensuel').value || 0;
    const cpInput = document.getElementById('codePostal').value || "";
    
    if (prixInput <= 0) return showToast("Veuillez indiquer le prix de vente.", "error");
    if (!input.files.length) return showToast("Veuillez charger le fichier PDF.", "error");
    
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
        showToast("Analyse effectuée avec succès.");
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
    
    let kpiRentabiliteHtml = "";
    if (loyerMensuelSaisi > 0) {
        let prixInitial = Number(document.getElementById('prixInitial').value);
        let rentaInitiale = ((loyerMensuelSaisi * 12) / prixInitial) * 100;
        let coutTotalReel = prixInitial + donneesAudit.total_decote;
        let rentaFinale = ((loyerMensuelSaisi * 12) / coutTotalReel) * 100;

        kpiRentabiliteHtml = `
        <h3 style="text-transform: uppercase; font-size: 14px; color: #0b1a14; margin-top: 30px; margin-bottom: 15px;">Performance Locative Estimée</h3>
        <div class="kpi-grid">
            <div class="kpi-box">
                <div class="kpi-label">Loyer Annuel Théorique</div>
                <div class="kpi-value" style="color: #0b1a14;">${formatNumber(loyerMensuelSaisi * 12)} €</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label">Rendement Brut Hors Travaux</div>
                <div class="kpi-value">${rentaInitiale.toFixed(2)} %</div>
            </div>
            <div class="kpi-box main" style="background: #00d632; color: #0b1a14;">
                <div class="kpi-label" style="color: #0b1a14;">Rendement Réel Après Travaux</div>
                <div class="kpi-value">${rentaFinale.toFixed(2)} %</div>
            </div>
        </div>`;
    }

    // TEXTES PROFESSIONNELS ET OBJECTIFS (FINI L'EFFET VAUTOUR)
    let scriptNegoTxt = "";
    let titreSectionNego = "";
    let nomOnglet3 = "";
    
    if (profilActuel === "particulier") {
        nomOnglet3 = "3. Formuler son Offre";
        titreSectionNego = "Proposition Transparente (Acquéreur)";
        scriptNegoTxt = `Madame, Monsieur, suite à la visite de votre bien situé au ${donneesAudit.cp} et à l'analyse objective du Dossier de Diagnostics Techniques, je vous confirme mon vif intérêt.

Cependant, l'étude technique met en évidence un budget de mise en conformité évalué à ${formatNumber(donneesAudit.total_decote)} €, notamment concernant les points suivants : ${anomalies.map(a => a.titre).join(', ')}. 

Afin de réaliser cette transaction dans des conditions équitables et sécurisées pour nos deux parties, en tenant compte des réalités du marché à ${donneesAudit.localisation_exacte}, je vous soumets une offre d'achat ferme au prix de ${formatNumber(donneesAudit.prix_net)} €. Cette proposition intègre les travaux nécessaires tout en respectant la valeur réelle de votre bien.`;
    } else {
        nomOnglet3 = "3. Argumentaire d'Agence";
        titreSectionNego = "Approche Conseil & Transparence (Professionnel)";
        scriptNegoTxt = `POUR CONSEILLER LE VENDEUR SUR SON PRIX :
"Cher client, l'analyse réglementaire de votre bien a mis en évidence plusieurs points nécessitant une mise aux normes pour un budget estimé à ${formatNumber(donneesAudit.total_decote)} €. Pour que votre bien reste attractif face aux exigences actuelles des acheteurs et de leurs banques, je vous conseille d'ajuster le prix de présentation à ${formatNumber(donneesAudit.prix_net)} €. Cette transparence technique nous permettra de vendre plus rapidement et sans négociation agressive de dernière minute."

POUR RASSURER L'ACQUÉREUR DURANT LA VISITE :
"Sachez que nous avons anticipé les conclusions des diagnostics. L'enveloppe de mise en conformité de ${formatNumber(donneesAudit.total_decote)} € est parfaitement transparente et peut être intégrée dans votre plan de financement. Vous achetez ainsi en parfaite connaissance de cause, sans surprise post-acquisition."`;
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
        <button class="report-tab-btn active" onclick="switchReportTab('paneFinancier')">1. Synthèse Financière</button>
        <button class="report-tab-btn" onclick="switchReportTab('paneTechnique')">2. Bilan Technique</button>
        <button class="report-tab-btn" onclick="switchReportTab('paneStrategie')" style="background-color: #f4fbf7; color: #00d632; border-radius: 4px;">${nomOnglet3}</button>
    </div>
    
    <div id="paneFinancier" class="report-pane active">
        <h3 style="text-transform: uppercase; font-size: 14px; color: #0b1a14; margin-bottom: 15px;">Évaluation de la Balance Financière</h3>
        <div class="kpi-grid">
            <div class="kpi-box">
                <div class="kpi-label">Prix de vente initial</div>
                <div class="kpi-value">${formatNumber(document.getElementById('prixInitial').value)} €</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label" style="color: #cc0000;">Enveloppe Travaux Globale</div>
                <div class="kpi-value" style="color: #cc0000;">-${formatNumber(donneesAudit.total_decote)} €</div>
            </div>
            <div class="kpi-box main">
                <div class="kpi-label">Prix Équitable Recommandé</div>
                <div class="kpi-value">${formatNumber(donneesAudit.prix_net)} €</div>
            </div>
        </div>
        ${kpiRentabiliteHtml}
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
                    <td style="padding: 15px; border-left: 4px solid ${a.cout > 0 ? '#cc0000' : '#00d632'};"><b>${a.titre}</b></td>
                    <td style="padding: 15px; color: ${a.cout > 0 ? '#cc0000' : '#000000'}; font-weight: bold; text-align: center;">${a.cout > 0 ? 'ANOMALIE' : 'CONFORME'}</td>
                    <td style="padding: 15px; font-size: 13px; color: #333; line-height: 1.5;"><b>Impact :</b> ${a.detail}<br>${a.cout > 0 ? `<b>Action requise :</b> ${a.action}` : ''}</td>
                    <td style="padding: 15px; font-weight:bold; text-align: right; font-size: 16px;">${a.cout > 0 ? `-${formatNumber(a.cout)} €` : '0 €'}</td>
                </tr>`).join('')}
            </table>
        </div>
    </div>
    
    <div id="paneStrategie" class="report-pane">
        <h3 style="text-transform: uppercase; font-size: 14px; color: #0b1a14; margin-bottom: 10px;">${titreSectionNego}</h3>
        <p style="font-size: 14px; color: #495057; margin-bottom: 15px; text-align: left;">Cet outil de rédaction vous aide à aborder le volet financier de manière factuelle et rassurante :</p>
        <div class="script-box">
            <button class="btn-copy" onclick="copierScript()">Copier</button>
            <div id="texteScript">${scriptNegoTxt}</div>
        </div>
    </div>
    
    <div style="font-size: 10px; color: #adb5bd; text-align: justify; border-top: 1px solid #eaeaea; padding-top: 15px; margin-top: 40px;">
        <b>CADRE D'APPLICATION :</b> Cette étude est une simulation macro-économique informatisée d'aide à la décision. Elle s'appuie sur la surface détectée et les coefficients de pondération régionaux. Document non contractuel.
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
                    backgroundColor: ['#0b1a14', '#cc0000', '#3498db', '#9b59b6', '#e67e22', '#f1c40f'] 
                }]
            },
            options: { animation: false, plugins: { legend: { position: 'bottom' } } }
        });
    }
}

function exporterPDF() {
    if (!donneesAudit) return;
    const btn = document.getElementById('btnExport');
    btn.innerText = "Édition du PDF en cours...";
    
    let prixInitFormate = formatNumber(document.getElementById('prixInitial').value) + ' €';
    let decoteFormate = '-' + formatNumber(donneesAudit.total_decote) + ' €';
    let prixNetFormate = formatNumber(donneesAudit.prix_net) + ' €';

    let tableBody = [
        [
            { text: 'DOMAINE CONTRÔLÉ', style: 'tableHeader' },
            { text: 'ÉTAT', style: 'tableHeader', alignment: 'center' },
            { text: 'EXPLICATION & STRATÉGIE TECHNIQUE', style: 'tableHeader' },
            { text: 'BUDGET', style: 'tableHeader', alignment: 'right' }
        ]
    ];

    donneesAudit.diagnostics.forEach(a => {
        let isAnomalie = a.cout > 0;
        tableBody.push([
            { text: a.titre, bold: true, fontSize: 10, color: '#0b1a14' },
            { text: isAnomalie ? 'ANOMALIE' : 'CONFORME', bold: true, fontSize: 9, color: isAnomalie ? '#cc0000' : '#00d632', alignment: 'center' },
            { text: `Constat : ${a.detail}\n` + (isAnomalie ? `Action : ${a.action}` : ''), fontSize: 9, lineHeight: 1.3 },
            { text: isAnomalie ? '-' + formatNumber(a.cout) + ' €' : '0 €', bold: true, fontSize: 11, color: isAnomalie ? '#cc0000' : '#0b1a14', alignment: 'right' }
        ]);
    });

    let anomalies = donneesAudit.diagnostics.filter(d => d.cout > 0);
    let chartColumn = [];
    if (anomalies.length > 0) {
        let chartCanvas = document.getElementById('coutChart');
        if (chartCanvas) {
            chartColumn = [
                { text: 'RÉPARTITION TECHNIQUE', fontSize: 10, bold: true, alignment: 'center', color: '#0b1a14', margin: [0, 0, 0, 10] },
                { image: chartCanvas.toDataURL('image/png', 1.0), width: 160, alignment: 'center' }
            ];
        }
    }

    let listSolutions = donneesAudit.solutions.map(s => ({ text: s, margin: [0, 4, 0, 4] }));

    let rentaBlock = [];
    if (loyerMensuelSaisi > 0) {
        let prixInitial = Number(document.getElementById('prixInitial').value);
        let rentaInitiale = ((loyerMensuelSaisi * 12) / prixInitial) * 100;
        let coutTotalReel = prixInitial + donneesAudit.total_decote;
        let rentaFinale = ((loyerMensuelSaisi * 12) / coutTotalReel) * 100;
        
        rentaBlock = [
            { text: '2. PERFORMANCE RENDEMENT LOCATIF', style: 'sectionTitle' },
            {
                table: {
                    widths: ['*', '*', '*'],
                    body: [
                        [ { text: 'Loyer Annuel Théorique', style: 'kpiHeader' }, { text: 'Rendement Brut', style: 'kpiHeader' }, { text: 'Rendement Net Après Travaux', style: 'kpiHeaderGreen' } ],
                        [ { text: formatNumber(loyerMensuelSaisi * 12) + ' €', style: 'kpiValue' }, { text: rentaInitiale.toFixed(2) + ' %', style: 'kpiValue' }, { text: rentaFinale.toFixed(2) + ' %', style: 'kpiValueGreen' } ]
                    ]
                },
                layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: (i) => i === 0 ? '#f8f9fa' : '#ffffff', paddingTop: () => 12, paddingBottom: () => 12 }
            }
        ];
    }

    let docDefinition = {
        pageSize: 'A4',
        pageMargins: [ 40, 70, 40, 60 ],
        header: function(currentPage) {
            if (currentPage > 1) {
                return {
                    columns: [
                        { text: 'AUDITPRO IMMOBILIER', bold: true, color: '#00d632', fontSize: 11 },
                        { text: 'Réf. ' + idRapport, alignment: 'right', color: '#888', fontSize: 9 }
                    ], margin: [40, 25, 40, 0]
                };
            }
        },
        footer: function(currentPage, pageCount) {
            return {
                columns: [
                    { text: 'Rapport d\'analyse financière macro-économique standardisé', fontSize: 8, color: '#999' },
                    { text: 'Page ' + currentPage.toString() + ' / ' + pageCount, alignment: 'right', fontSize: 8, color: '#999' }
                ], margin: [40, 20, 40, 0]
            };
        },
        content: [
            { text: 'AUDITPRO', fontSize: 38, bold: true, color: '#0b1a14', alignment: 'center', margin: [0, 40, 0, 5] },
            { text: 'RAPPORT D\'EXPERTISE TECHNIQUE IMMOBILIÈRE', fontSize: 13, color: '#666', alignment: 'center', margin: [0, 0, 0, 40] },
            
            {
                table: {
                    widths: ['50%', '50%'],
                    body: [
                        [ { text: 'DÉTAILS DU DOSSIER', colSpan: 2, style: 'coverTableTitle' }, {} ],
                        [ { text: 'Identifiant Unique :', style: 'coverLabel' }, { text: idRapport, style: 'coverValue' } ],
                        [ { text: 'Date de l\'évaluation :', style: 'coverLabel' }, { text: donneesAudit.date_audit, style: 'coverValue' } ],
                        [ { text: 'Cible / Localisation :', style: 'coverLabel' }, { text: donneesAudit.localisation_exacte, style: 'coverValue' } ]
                    ]
                },
                layout: 'lightHorizontalLines', margin: [0, 0, 0, 40]
            },
            
            { text: '1. SYNTHÈSE DES VALORISATIONS', style: 'sectionTitle' },
            {
                table: {
                    widths: ['*', '*', '*'],
                    body: [
                        [ { text: 'Prix de Vente Initial', style: 'kpiHeader' }, { text: 'Enveloppe Travaux', style: 'kpiHeaderRed' }, { text: 'Prix Équitable Recommandé', style: 'kpiHeaderDark' } ],
                        [ { text: prixInitFormate, style: 'kpiValue' }, { text: decoteFormate, style: 'kpiValueRed' }, { text: prixNetFormate, style: 'kpiValueDark' } ]
                    ]
                },
                layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: (r, n, c) => r === 0 ? (c === 2 ? '#0b1a14' : '#f8f9fa') : (c === 2 ? '#0b1a14' : '#ffffff'), paddingTop: () => 12, paddingBottom: () => 12 },
                margin: [0, 0, 0, 20]
            },
            
            {
                table: { widths: ['*'], body: [ [ { stack: [ { text: 'NOTE MACRO-ÉCONOMIQUE LOCALE', fontSize: 9, bold: true, color: '#0b1a14', margin: [0, 0, 0, 4] }, { text: donneesAudit.impact_marche, fontSize: 9, color: '#495057', lineHeight: 1.4 } ], padding: 10 } ] ] },
                layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#ced4da', vLineColor: () => '#ced4da' }, margin: [0, 0, 0, 25]
            },
            
            ...rentaBlock,
            
            { text: '3. RECOMMANDATIONS TECHNIQUES', style: 'sectionTitle' },
            {
                columns: [
                    { width: anomalies.length > 0 ? '60%' : '100%', stack: [ { ul: listSolutions, fontSize: 10, lineHeight: 1.5, color: '#333' } ] },
                    ...chartColumn
                ], margin: [0, 0, 0, 30]
            },
            
            { text: '4. INVENTAIRE TECHNIQUE DÉTAILLÉ (DDT)', style: 'sectionTitle', pageBreak: 'before' },
            {
                table: { headerRows: 1, widths: ['25%', '15%', '45%', '15%'], body: tableBody },
                layout: { hLineWidth: (i, n) => (i === 0 || i === 1 || i === n.table.body.length) ? 2 : 1, vLineWidth: () => 0, hLineColor: (i, n) => (i === 0 || i === 1 || i === n.table.body.length) ? '#0b1a14' : '#eeeeee', paddingLeft: () => 10, paddingRight: () => 10, paddingTop: () => 12, paddingBottom: () => 12, fillColor: (i) => i === 0 ? '#0b1a14' : (i % 2 === 0 ? '#fafafa' : '#ffffff') }
            },
            
            { text: 'CLAUSE DE NON-SUBSTITUTION LÉGALE', style: 'footerTitle', margin: [0, 40, 0, 5] },
            { text: 'Ce rapport constitue une simulation statistique à valeur d\'aide indicative pour une transaction équitable. Les chiffrages ne se substituent pas à la passation de devis contradictoires par des corps de métier certifiés RGE.', style: 'footerText' }
        ],
        styles: {
            coverTableTitle: { fontSize: 11, bold: true, color: '#0b1a14', alignment: 'center', fillColor: '#eaf9f0', margin: [0, 6, 0, 6] },
            coverLabel: { fontSize: 10, bold: true, color: '#555', alignment: 'right' },
            coverValue: { fontSize: 10, color: '#000' },
            sectionTitle: { fontSize: 12, bold: true, color: '#0b1a14', margin: [0, 25, 0, 12] },
            kpiHeader: { alignment: 'center', fontSize: 9, color: '#666', bold: true },
            kpiHeaderRed: { alignment: 'center', fontSize: 9, color: '#cc0000', bold: true },
            kpiHeaderDark: { alignment: 'center', fontSize: 9, color: '#fff', bold: true },
            kpiHeaderGreen: { alignment: 'center', fontSize: 9, color: '#00923E', bold: true },
            kpiValue: { alignment: 'center', fontSize: 16, bold: true },
            kpiValueRed: { alignment: 'center', fontSize: 16, bold: true, color: '#cc0000' },
            kpiValueDark: { alignment: 'center', fontSize: 18, bold: true, color: '#00d632' },
            kpiValueGreen: { alignment: 'center', fontSize: 18, bold: true, color: '#00923E' },
            tableHeader: { bold: true, fontSize: 10, color: '#ffffff' },
            footerTitle: { fontSize: 9, bold: true, color: '#0b1a14' },
            footerText: { fontSize: 8, color: '#888', alignment: 'justify' }
        }
    };

    pdfMake.createPdf(docDefinition).download('AuditPro_Bilan_Global_' + idRapport + '.pdf');
    setTimeout(() => { btn.innerText = "Télécharger le rapport PDF Officiel"; }, 1500);
}

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
                dropZone.style.borderColor = "#00d632";
                dropZone.style.background = "#eaf9f0";
            }
        });
    }
});
