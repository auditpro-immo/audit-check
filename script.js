let donneesAudit = null;
let idRapport = "";
let chartInstance = null;
let loyerMensuelSaisi = 0;
let profilActuel = "particulier";

// VARIABLES MARQUE BLANCHE
let agenceNom = localStorage.getItem('auditpro_agence_nom') || 'AuditPro';
let agenceCouleur = localStorage.getItem('auditpro_agence_couleur') || '#10b981'; 
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

document.getElementById('logoUploadInput').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = (ev) => { agenceLogoBase64 = ev.target.result; }
    reader.readAsDataURL(e.target.files[0]);
});

function appliquerCouleurMarqueBlanche() {
    document.getElementById('header-logo-color').style.color = agenceCouleur;
    document.querySelectorAll('.btn-dynamic-color').forEach(b => b.style.backgroundColor = agenceCouleur);
    document.querySelectorAll('.text-dynamic-color').forEach(t => t.style.color = agenceCouleur);
    document.querySelectorAll('.border-dynamic-color').forEach(b => b.style.borderColor = agenceCouleur);
    document.querySelectorAll('.border-dynamic-top, .card-pro, .info-card, .avis-card').forEach(b => b.style.borderTopColor = agenceCouleur);
    document.querySelector('.form-container').style.borderTopColor = agenceCouleur;
    
    const activeBtn = document.querySelector('.profile-btn.active');
    if(activeBtn) { activeBtn.style.color = agenceCouleur; activeBtn.style.borderColor = agenceCouleur; }
}

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
    agenceCouleur = '#10b981'; 
    agenceLogoBase64 = null;
    document.getElementById('nomAgenceInput').value = '';
    document.getElementById('couleurAgenceInput').value = '#10b981';
    document.getElementById('logo-preview').style.display = 'none';
    appliquerCouleurMarqueBlanche();
    chargerHistorique();
    showToast("Réinitialisation effectuée.");
}

// CORRECTION BUG PAGE BLANCHE (HISTORIQUE)
function chargerHistorique() {
    const table = document.getElementById('historiqueTableBody');
    const hist = JSON.parse(localStorage.getItem('auditpro_hist_v4')) || [];
    table.innerHTML = hist.length ? '' : '<tr><td colspan="4" style="text-align:center; padding:20px">Aucun dossier.</td></tr>';
    
    hist.reverse().forEach((d, i) => {
        let idx = hist.length - 1 - i;
        table.innerHTML += `
        <tr class="history-row">
            <td>${d.date}</td>
            <td><strong>${d.ville}</strong></td>
            <td>${formatNumber(d.prix)} €</td>
            <td style="text-align:right">
                <button type="button" class="btn-voir" onclick="voirHistorique(${idx})">Voir</button>
                <button type="button" class="btn-pdf" onclick="telechargerHistorique(${idx})" style="background:${agenceCouleur}">PDF</button>
            </td>
        </tr>`;
    });
}

// LE BOUTON VOIR OUVRE DÉSORMAIS L'ÉCRAN (SANS BUG)
function voirHistorique(idx) {
    const d = JSON.parse(localStorage.getItem('auditpro_hist_v4'))[idx];
    donneesAudit = d.data; 
    idRapport = d.id;
    loyerMensuelSaisi = d.loyer || 0;
    
    document.getElementById('prixInitial').value = formatNumber(d.prix);
    if(loyerMensuelSaisi > 0) document.getElementById('loyerMensuel').value = formatNumber(loyerMensuelSaisi);
    
    document.querySelector('nav a[href="#audit"]').click();
    document.getElementById('result-wrapper').style.display = 'block';
    document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
    afficherEcran();
    showToast("Le dossier a été chargé à l'écran.");
}

// LE BOUTON PDF TELECHARGE DIRECTEMENT
function telechargerHistorique(idx) {
    voirHistorique(idx); 
    showToast("Génération du PDF en cours...");
    setTimeout(() => exporterPDF('download'), 800);
}

function ajouterAuHistorique(ville, prixInitial, donneesCompletes) {
    const hist = JSON.parse(localStorage.getItem('auditpro_hist_v4')) || [];
    hist.push({
        id: "AUDIT-" + Math.floor(Math.random() * 90000 + 10000),
        date: new Date().toLocaleDateString('fr-FR'),
        ville: ville,
        prix: prixInitial,
        data: donneesCompletes,
        loyer: loyerMensuelSaisi
    });
    localStorage.setItem('auditpro_hist_v4', JSON.stringify(hist));
    chargerHistorique();
}

function viderHistorique() {
    if(confirm("Supprimer l'historique ?")) {
        localStorage.removeItem('auditpro_hist_v4');
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
    else { toast.style.borderLeftColor = '#cc0000'; }
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

function copierScript(idElement) {
    const texte = document.getElementById(idElement).innerText;
    navigator.clipboard.writeText(texte).then(() => { showToast("Données copiées dans le presse-papier."); });
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
    
    let defautsFormate = anomalies.length > 0 ? anomalies.map(a => "- " + a.titre).join('\n') : "- Aucun défaut technique majeur justifiant une décote.";
    
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
        <button class="report-tab-btn" onclick="switchReportTab('paneStrategie')">3. Données d'Appui</button>
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
        <h3 style="text-transform: uppercase; font-size: 14px; color: #0b1a14; margin-bottom: 10px;">Données Factuelles pour la Transaction</h3>
        <p style="font-size: 14px; color: #495057; margin-bottom: 15px; text-align: left;">Copiez ces éléments factuels générés par le système pour appuyer votre argumentation :</p>
        <div class="script-box" style="border-left-color: ${agenceCouleur}; font-style: normal; font-family: 'Inter', sans-serif;">
            <button class="btn-copy" onclick="copierScript('texteScript')">Copier les données</button>
            <div id="texteScript">SYNTHÈSE FACTUELLE DU DOSSIER :

> DONNÉES FINANCIÈRES :
- Écart technique calculé : ${formatNumber(donneesAudit.total_decote)} €
- Valeur nette recommandée pour positionnement : ${formatNumber(donneesAudit.prix_net)} €

> POINTS TECHNIQUES MAJEURS (ISSU DU DDT) :
${defautsFormate}</div>
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

// MOTEUR PDF ELITE (MCKINSEY STYLE)
function exporterPDF(action = 'download') {
    if (!donneesAudit) return;
    
    let prixInitFormate = formatNumber(document.getElementById('prixInitial').value.replace(/\s+/g, '')) + ' €';
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
        let rowColor = (index % 2 === 0) ? '#fbfbfb' : '#ffffff'; 
        
        tableBody.push([
            { text: a.titre, bold: true, fontSize: 10, color: '#1a1a1a', fillColor: rowColor, margin: [0, 8, 0, 8] },
            { text: isAnomalie ? 'ANOMALIE' : 'CONFORME', bold: true, fontSize: 9, color: isAnomalie ? '#cc0000' : '#555555', alignment: 'center', fillColor: rowColor, margin: [0, 8, 0, 8] },
            { text: `Constat : ${a.detail}\n` + (isAnomalie ? `Action requise : ${a.action}` : ''), fontSize: 9, lineHeight: 1.4, color: '#444444', fillColor: rowColor, margin: [0, 8, 0, 8] },
            { text: isAnomalie ? '-' + formatNumber(a.cout) + ' €' : '0 €', bold: true, fontSize: 11, color: isAnomalie ? '#cc0000' : '#1a1a1a', alignment: 'right', fillColor: rowColor, margin: [0, 8, 0, 8] }
        ]);
    });

    let logoBlock = agenceLogoBase64 
        ? { image: agenceLogoBase64, fit: [120, 50], alignment: 'left' }
        : { text: agenceNom.toUpperCase(), fontSize: 22, bold: true, color: agenceCouleur, alignment: 'left' };

    const docDefinition = {
        pageSize: 'A4', pageMargins: [40, 50, 40, 50],
        content: [
            { columns: [
                logoBlock,
                { table: { widths:['*', '*'], body:[ 
                    [{text:'ID Dossier :', fontSize:8, color:'#888', alignment:'right'}, {text:idRapport, fontSize:8, bold:true, alignment:'left'}],
                    [{text:'Date :', fontSize:8, color:'#888', alignment:'right'}, {text:donneesAudit.date_audit, fontSize:8, bold:true, alignment:'left'}],
                    [{text:'Secteur :', fontSize:8, color:'#888', alignment:'right'}, {text:donneesAudit.localisation_exacte, fontSize:8, bold:true, alignment:'left'}]
                ]}, layout:'noBorders', width:'*' }
            ], margin:[0,0,0,30]},
            
            { text: 'RAPPORT D\'EXPERTISE TECHNIQUE ET FINANCIÈRE', fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 30] },
            
            { table: { widths: ['*', '*', '*'], body: [ 
                [{text:'VALEUR INITIALE', style:'lbl'}, {text:'ENVELOPPE TRAVAUX', style:'lbl'}, {text:'VALEUR NETTE CONSEILLÉE', style:'lbl'}],
                [{text:prixInitFormate, style:'val'}, {text:decoteFormate, color:'#cc0000', style:'val'}, {text:prixNetFormate, color:agenceCouleur, style:'val'}]
            ]}, layout: 'lightHorizontalLines', margin: [0, 0, 0, 30] },
            
            { text: 'DÉTAILS DES NON-CONFORMITÉS DÉTECTÉES', fontSize: 11, bold: true, margin: [0, 0, 0, 10] },
            { table: { headerRows: 1, widths: ['25%', '15%', '45%', '15%'], body: tableBody }, layout: { hLineWidth:()=>0.5, vLineWidth:()=>0, hLineColor:()=>'#eee' } },
            
            { text: 'ANALYSE RÉGLEMENTAIRE ET MÉTHODOLOGIE', fontSize: 11, bold: true, margin: [0, 40, 0, 10] },
            { text: 'Ce document synthétise les données réglementaires du DDT (Art. L271-4 du CCH). Les coûts sont calculés sur une base macro-économique locale. Toute anomalie critique doit être confirmée par un artisan certifié RGE.', fontSize: 9, color: '#555', alignment: 'justify' }
        ],
        styles: {
            th: { fillColor: '#000', color: '#fff', bold: true, fontSize: 8, margin: [0, 5, 0, 5] },
            lbl: { fontSize: 8, color: '#888', alignment: 'center' },
            val: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 5, 0, 5] }
        }
    };

    pdfMake.createPdf(docDefinition).download(agenceNom + '_Bilan_Technique_' + idRapport + '.pdf');
}

// Initialisation et Event Listeners pour la navigation HTML (FAQ etc)
document.addEventListener('DOMContentLoaded', () => {
    chargerHistorique();
    appliquerCouleurMarqueBlanche();
    
    document.querySelectorAll('.price-input').forEach(input => {
        input.addEventListener('input', formatInputNumber);
    });

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
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
        });
        dropZone.addEventListener('dragover', () => dropZone.style.background = "#eaf9f0");
        dropZone.addEventListener('dragleave', () => dropZone.style.background = "#f8f9fa");
        document.getElementById('fichierPdf').addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                document.querySelector('.drop-zone-text').innerHTML = `Document chargé : <b>${this.files[0].name}</b>`;
                dropZone.style.borderColor = agenceCouleur;
            }
        });
    }
});
