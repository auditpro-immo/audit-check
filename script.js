let donneesAudit = null;
let idRapport = "";
let chartInstance = null;
let loyerMensuelSaisi = 0;
let profilActuel = "particulier";

let agenceNom = localStorage.getItem('auditpro_agence_nom') || 'AuditPro';
let agenceCouleur = localStorage.getItem('auditpro_agence_couleur') || '#00d632';

// 1. ANIMATION DU PORTAIL D'ENTRÉE ET CONFIGURATION DU PROFIL
function entrerSurLeSite(profil) {
    const portal = document.getElementById('welcome-portal');
    const mainApp = document.getElementById('main-app');
    
    // Animation de disparition douce
    portal.style.opacity = '0';
    setTimeout(() => {
        portal.style.display = 'none';
        mainApp.style.display = 'block';
        setTimeout(() => { mainApp.style.opacity = '1'; }, 50);
        
        // Applique le bon profil dans le formulaire interne
        changerProfilInterne(profil);
    }, 500);
}

// 2. CHANGEMENT DE PROFIL DEPUIS LE FORMULAIRE INTERNE
function changerProfilInterne(profil) {
    profilActuel = profil;
    document.getElementById('btn-particulier').classList.remove('active');
    document.getElementById('btn-pro').classList.remove('active');
    
    let btnActif = document.getElementById('btn-' + (profil === 'particulier' ? 'particulier' : 'pro'));
    btnActif.classList.add('active');
    btnActif.style.borderColor = agenceCouleur;
    btnActif.style.color = agenceCouleur;

    if(profil === "professionnel") {
        document.getElementById('hero-badge').innerText = "Espace Professionnels (B2B)";
        document.getElementById('hero-title').innerText = "Justifiez vos estimations et sécurisez vos transactions.";
        document.getElementById('hero-desc').innerText = "Notre technologie d'analyse traduit instantanément les PDF de diagnostics en rapports chiffrés. Un outil pensé pour rassurer vos acquéreurs et obtenir l'exclusivité auprès des vendeurs.";
        document.getElementById('form-title').innerText = "Simulateur pour les agences";
        document.getElementById('nav-pro').style.display = "inline-block";
    } else {
        document.getElementById('hero-badge').innerText = "Espace Particulier (B2C)";
        document.getElementById('hero-title').innerText = "Sécurisez votre achat en chiffrant les travaux cachés.";
        document.getElementById('hero-desc').innerText = "Notre outil analyse l'ensemble des diagnostics obligatoires de la maison que vous visitez. Obtenez en 2 minutes le vrai coût des remises aux normes.";
        document.getElementById('form-title').innerText = "Configuration de l'analyse";
        document.getElementById('nav-pro').style.display = "none";
    }
}

// 3. GESTION DES COULEURS ET DE LA MARQUE BLANCHE
function appliquerCouleurMarqueBlanche() {
    document.getElementById('header-logo-text').innerText = agenceNom === 'AuditPro' ? 'Audit' : agenceNom;
    document.getElementById('header-logo-color').innerText = agenceNom === 'AuditPro' ? 'Pro' : 'Immo';
    document.getElementById('header-logo-color').style.color = agenceCouleur;
    
    document.querySelectorAll('.btn-dynamic-color').forEach(btn => { btn.style.backgroundColor = agenceCouleur; });
    document.querySelectorAll('.text-dynamic-color').forEach(txt => { txt.style.color = agenceCouleur; });
    document.querySelectorAll('.border-dynamic-color').forEach(b => { b.style.borderTopColor = agenceCouleur; });
    document.querySelector('.form-container').style.borderTopColor = agenceCouleur;
    
    // Met à jour la couleur du bouton profil si déjà sélectionné
    const activeBtn = document.querySelector('.profile-btn.active');
    if(activeBtn) {
        activeBtn.style.borderColor = agenceCouleur;
        activeBtn.style.color = agenceCouleur;
    }
}

function sauvegarderParametresPro() {
    if (!localStorage.getItem('auditpro_cookies')) {
        return showToast("Veuillez accepter la sauvegarde locale (bandeau en bas) pour activer cette fonction.", "error");
    }
    const inputNom = document.getElementById('nomAgenceInput').value.trim();
    const inputCouleur = document.getElementById('couleurAgenceInput').value;
    
    agenceNom = inputNom !== "" ? inputNom : "AuditPro";
    agenceCouleur = inputCouleur;
    
    localStorage.setItem('auditpro_agence_nom', agenceNom);
    localStorage.setItem('auditpro_agence_couleur', agenceCouleur);
    
    appliquerCouleurMarqueBlanche();
    showToast("Paramètres Agence sauvegardés localement avec succès !");
}

// 4. GESTION DU CLOUD LOCAL ET RGPD
function accepterCookies() {
    localStorage.setItem('auditpro_cookies', 'true');
    document.getElementById('cookie-banner').style.display = 'none';
    showToast("Mode de sauvegarde locale activé.");
}

function chargerHistorique() {
    const historiqueTable = document.getElementById('historiqueTableBody');
    if(!historiqueTable) return;
    
    const historique = JSON.parse(localStorage.getItem('auditpro_historique')) || [];
    historiqueTable.innerHTML = '';
    
    if(historique.length === 0) {
        historiqueTable.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666; padding: 20px;">Aucun dossier généré pour le moment.</td></tr>';
        return;
    }
    
    historique.reverse().forEach(dossier => {
        historiqueTable.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td>${dossier.date}</td>
                <td><strong>${dossier.ville}</strong></td>
                <td>${formatNumber(dossier.prixInitial)} €</td>
                <td style="color: #cc0000; font-weight: bold;">-${formatNumber(dossier.coutTravaux)} €</td>
            </tr>
        `;
    });
}

function ajouterAuHistorique(ville, prixInitial, coutTravaux) {
    if (!localStorage.getItem('auditpro_cookies')) return;
    
    const historique = JSON.parse(localStorage.getItem('auditpro_historique')) || [];
    historique.push({
        date: new Date().toLocaleDateString('fr-FR'),
        ville: ville,
        prixInitial: prixInitial,
        coutTravaux: coutTravaux
    });
    localStorage.setItem('auditpro_historique', JSON.stringify(historique));
    chargerHistorique();
}

function viderHistorique() {
    if(confirm("Êtes-vous sûr de vouloir supprimer définitivement tout l'historique de cet appareil ?")) {
        localStorage.removeItem('auditpro_historique');
        chargerHistorique();
        showToast("Historique local effacé avec succès.");
    }
}

// 5. FONCTIONS UTILITAIRES
const formatNumber = (num) => { return Number(num).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' '); };

function formatInputNumber(e) {
    let value = e.target.value.replace(/\s+/g, '');
    if (!isNaN(value) && value !== "") {
        e.target.value = formatNumber(value);
    }
}

function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    if(type === "success") { toast.style.borderLeft = `5px solid ${agenceCouleur}`; }
    toast.innerHTML = `<strong>${type === "success" ? "SUCCÈS :" : "ATTENTION :"}</strong> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.4s forwards";
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function copierScript() {
    const texte = document.getElementById('texteScript').innerText;
    navigator.clipboard.writeText(texte).then(() => { showToast("Texte copié dans le presse-papier."); });
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

// 6. MOTEUR D'ANALYSE
function lancerDemo() {
    document.getElementById('prixInitial').value = "245 000";
    document.getElementById('loyerMensuel').value = "950";
    document.getElementById('codePostal').value = "35000";
    
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
        solutions: [ "Sécurisation du tableau électrique recommandée.", "Amélioration de la performance énergétique requise (Classe F)." ],
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
    const prixInputBrut = document.getElementById('prixInitial').value.replace(/\s+/g, '');
    const prixInput = Number(prixInputBrut) || 0;
    const loyerInputBrut = document.getElementById('loyerMensuel').value.replace(/\s+/g, '');
    const loyerInput = Number(loyerInputBrut) || 0;
    const cpInput = document.getElementById('codePostal').value || "";
    
    if (prixInput <= 0) return showToast("Veuillez indiquer le prix de vente.", "error");
    if (!input.files.length) return showToast("Veuillez charger le fichier PDF.", "error");
    
    loyerMensuelSaisi = loyerInput;
    document.getElementById('loading-overlay').style.display = "flex";

    const messagesIA = [
        "Lecture et structuration du document PDF...",
        "Recherche de données réglementaires...",
        "Calcul des devis moyens pour le département...",
        "Génération de l'argumentaire stratégique..."
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
        if (!reponse.ok) throw new Error("Erreur serveur");
        donneesAudit = await reponse.json();
        donneesAudit.cp = cpInput;
        idRapport = "AUDIT-" + Math.floor(Math.random() * 90000 + 10000);
        
        clearInterval(loadInterval);
        document.getElementById('loading-overlay').style.display = "none";
        
        ajouterAuHistorique(donneesAudit.localisation_exacte, prixInput, donneesAudit.total_decote);

        showToast("Analyse effectuée avec succès.");
        document.getElementById('result-wrapper').style.display = "block";
        document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
        afficherEcran();

    } catch (e) {
        clearInterval(loadInterval);
        document.getElementById('loading-overlay').style.display = "none";
        showToast("Erreur de traitement serveur.", "error");
    }
}

function afficherEcran() {
    let anomalies = donneesAudit.diagnostics.filter(d => d.cout > 0);
    
    let kpiRentabiliteHtml = "";
    if (loyerMensuelSaisi > 0) {
        let prixInitial = Number(document.getElementById('prixInitial').value.replace(/\s+/g, ''));
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
            <div class="kpi-box main" style="background: ${agenceCouleur}; color: #fff;">
                <div class="kpi-label" style="color: #fff;">Rendement Réel Après Travaux</div>
                <div class="kpi-value">${rentaFinale.toFixed(2)} %</div>
            </div>
        </div>`;
    }

    let scriptNegoTxt = "";
    let titreSectionNego = "";
    let nomOnglet3 = "";
    let defautsFormate = anomalies.length > 0 ? anomalies.map(a => a.titre).join(', ') : "aucun défaut critique";
    
    if (profilActuel === "particulier") {
        nomOnglet3 = "3. Formuler son Offre";
        titreSectionNego = "Proposition Transparente (Acquéreur)";
        scriptNegoTxt = `Madame, Monsieur, suite à la visite de votre bien situé au ${donneesAudit.cp} et à l'analyse objective du Dossier de Diagnostics Techniques, je vous confirme mon vif intérêt.

Cependant, l'étude technique met en évidence un budget de mise en conformité évalué à ${formatNumber(donneesAudit.total_decote)} €, notamment concernant les points suivants : ${defautsFormate}. 

Afin de réaliser cette transaction dans des conditions équitables et sécurisées pour nos deux parties, en tenant compte des réalités du marché à ${donneesAudit.localisation_exacte}, je vous soumets une offre d'achat ferme au prix de ${formatNumber(donneesAudit.prix_net)} €. Cette proposition intègre les travaux nécessaires tout en respectant la valeur réelle de votre bien.`;
    } else {
        nomOnglet3 = "3. Argumentaire d'Agence";
        titreSectionNego = "Approche Conseil & Transparence (Professionnel)";
        scriptNegoTxt = `POUR CONSEILLER LE VENDEUR SUR SON PRIX :
"Cher client, l'analyse réglementaire de votre bien a mis en évidence plusieurs points nécessitant une mise aux normes pour un budget estimé à ${formatNumber(donneesAudit.total_decote)} €. Pour que votre bien reste attractif face aux exigences actuelles des acheteurs et de leurs banques, je vous conseille d'ajuster le prix de présentation à ${formatNumber(donneesAudit.prix_net)} €. Cette transparence technique nous permettra de vendre plus rapidement et sans négociation de dernière minute."

POUR RASSURER L'ACQUÉREUR DURANT LA VISITE :
"Sachez que nous avons anticipé les conclusions des diagnostics. L'enveloppe de mise en conformité de ${formatNumber(donneesAudit.total_decote)} € est parfaitement transparente et peut être intégrée dans votre plan de financement. Vous achetez ainsi en parfaite connaissance de cause, sans surprise."`;
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
        <button class="report-tab-btn" onclick="switchReportTab('paneStrategie')" style="background-color: #f8f9fa;">${nomOnglet3}</button>
    </div>
    
    <div id="paneFinancier" class="report-pane active">
        <h3 style="text-transform: uppercase; font-size: 14px; color: #0b1a14; margin-bottom: 15px;">Évaluation de la Balance Financière</h3>
        <div class="kpi-grid">
            <div class="kpi-box">
                <div class="kpi-label">Prix de vente initial</div>
                <div class="kpi-value">${formatNumber(document.getElementById('prixInitial').value.replace(/\s+/g, ''))} €</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label" style="color: #cc0000;">Enveloppe Travaux Globale</div>
                <div class="kpi-value" style="color: #cc0000;">-${formatNumber(donneesAudit.total_decote)} €</div>
            </div>
            <div class="kpi-box main" style="background-color: ${agenceCouleur};">
                <div class="kpi-label" style="color: #fff;">Prix Équitable Recommandé</div>
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
                    <td style="padding: 15px; border-left: 4px solid ${a.cout > 0 ? '#cc0000' : agenceCouleur};"><b>${a.titre}</b></td>
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
        <div class="script-box" style="border-left-color: ${agenceCouleur};">
            <button class="btn-copy" onclick="copierScript()">Copier</button>
            <div id="texteScript">${scriptNegoTxt}</div>
        </div>
    </div>
    
    <div style="font-size: 10px; color: #adb5bd; text-align: justify; border-top: 1px solid #eaeaea; padding-top: 15px; margin-top: 40px;">
        <b>CADRE D'APPLICATION :</b> Cette étude est une simulation macro-économique informatisée d'aide à la décision. Document non contractuel.
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
    
    let prixInitFormate = formatNumber(document.getElementById('prixInitial').value.replace(/\s+/g, '')) + ' €';
    let decoteFormate = '-' + formatNumber(donneesAudit.total_decote) + ' €';
    let prixNetFormate = formatNumber(donneesAudit.prix_net) + ' €';

    let tableBody = [
        [
            { text: 'DOMAINE CONTRÔLÉ', style: 'tableHeader', fillColor: agenceCouleur },
            { text: 'ÉTAT', style: 'tableHeader', alignment: 'center', fillColor: agenceCouleur },
            { text: 'EXPLICATION & STRATÉGIE TECHNIQUE', style: 'tableHeader', fillColor: agenceCouleur },
            { text: 'BUDGET', style: 'tableHeader', alignment: 'right', fillColor: agenceCouleur }
        ]
    ];

    donneesAudit.diagnostics.forEach(a => {
        let isAnomalie = a.cout > 0;
        tableBody.push([
            { text: a.titre, bold: true, fontSize: 10, color: '#0b1a14' },
            { text: isAnomalie ? 'ANOMALIE' : 'CONFORME', bold: true, fontSize: 9, color: isAnomalie ? '#cc0000' : agenceCouleur, alignment: 'center' },
            { text: `Constat : ${a.detail}\n` + (isAnomalie ? `Action : ${a.action}` : ''), fontSize: 9, lineHeight: 1.3 },
            { text: isAnomalie ? '-' + formatNumber(a.cout) + ' €' : '0 €', bold: true, fontSize: 11, color: isAnomalie ? '#cc0000' : '#0b1a14', alignment: 'right' }
        ]);
    });

    let docDefinition = {
        pageSize: 'A4',
        pageMargins: [ 40, 70, 40, 60 ],
        header: function(currentPage) {
            if (currentPage > 1) {
                return {
                    columns: [
                        { text: agenceNom.toUpperCase() + ' CERTIFICATION', bold: true, color: agenceCouleur, fontSize: 11 },
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
            { text: agenceNom.toUpperCase(), fontSize: 38, bold: true, color: '#0b1a14', alignment: 'center', margin: [0, 40, 0, 5] },
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
                layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: (r, n, c) => r === 0 ? (c === 2 ? agenceCouleur : '#f8f9fa') : (c === 2 ? agenceCouleur : '#ffffff'), paddingTop: () => 12, paddingBottom: () => 12 },
                margin: [0, 0, 0, 20]
            }
        ],
        styles: {
            coverTableTitle: { fontSize: 11, bold: true, color: '#0b1a14', alignment: 'center', fillColor: '#eaf9f0', margin: [0, 6, 0, 6] },
            coverLabel: { fontSize: 10, bold: true, color: '#555', alignment: 'right' },
            coverValue: { fontSize: 10, color: '#000' },
            sectionTitle: { fontSize: 12, bold: true, color: '#0b1a14', margin: [0, 25, 0, 12] },
            kpiHeader: { alignment: 'center', fontSize: 9, color: '#666', bold: true },
            kpiHeaderRed: { alignment: 'center', fontSize: 9, color: '#cc0000', bold: true },
            kpiHeaderDark: { alignment: 'center', fontSize: 9, color: '#fff', bold: true },
            kpiValue: { alignment: 'center', fontSize: 16, bold: true },
            kpiValueRed: { alignment: 'center', fontSize: 16, bold: true, color: '#cc0000' },
            kpiValueDark: { alignment: 'center', fontSize: 18, bold: true, color: '#fff' },
            tableHeader: { bold: true, fontSize: 10, color: '#ffffff' },
            footerTitle: { fontSize: 9, bold: true, color: '#0b1a14' },
            footerText: { fontSize: 8, color: '#888', alignment: 'justify' }
        }
    };

    pdfMake.createPdf(docDefinition).download(agenceNom + '_Bilan_Global_' + idRapport + '.pdf');
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
    
    // VERIFICATION DU CONSENTEMENT LOCAL STORAGE
    if (!localStorage.getItem('auditpro_cookies')) {
        document.getElementById('cookie-banner').style.display = 'block';
    }

    // APPLICATION DE LA MARQUE BLANCHE AU DÉMARRAGE
    document.getElementById('nomAgenceInput').value = agenceNom !== 'AuditPro' ? agenceNom : '';
    document.getElementById('couleurAgenceInput').value = agenceCouleur;
    appliquerCouleurMarqueBlanche();

    // CHARGEMENT DE L'HISTORIQUE
    chargerHistorique();

    document.querySelectorAll('.price-input').forEach(input => {
        input.addEventListener('input', formatInputNumber);
    });

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
        if (lienActif) {
            lienActif.classList.add('active');
            lienActif.style.color = agenceCouleur;
            lienActif.style.borderBottomColor = agenceCouleur;
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
                dropZone.style.borderColor = agenceCouleur;
                dropZone.style.background = "#f4fbf7";
            }
        });
    }
});
