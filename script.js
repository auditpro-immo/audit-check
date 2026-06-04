let donneesAudit = null;
let idRapport = "";
let chartInstance = null;
let loyerMensuelSaisi = 0;
let profilActuel = "particulier";

// VARIABLES MARQUE BLANCHE
let agenceNom = localStorage.getItem('auditpro_agence_nom') || 'AuditPro';
let agenceCouleur = localStorage.getItem('auditpro_agence_couleur') || '#00d632'; 
let agenceLogoBase64 = localStorage.getItem('auditpro_agence_logo') || null;

function entrerSurLeSite(profil) {
    document.getElementById('welcome-portal').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    setTimeout(() => { document.getElementById('main-app').style.opacity = '1'; }, 50);
    changerProfilInterne(profil);
    appliquerCouleurMarqueBlanche();
}

function changerProfilInterne(profil) {
    profilActuel = profil;
    document.querySelectorAll('.profile-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.borderColor = 'transparent';
        btn.style.color = '#666';
    });
    
    let btnActif = document.getElementById('btn-' + profil);
    btnActif.classList.add('active');
    btnActif.style.borderColor = agenceCouleur;
    btnActif.style.color = agenceCouleur;

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
        reader.onload = function(e) { agenceLogoBase64 = e.target.result; }
        reader.readAsDataURL(file);
    }
});

function appliquerCouleurMarqueBlanche() {
    document.getElementById('header-logo-color').style.color = agenceCouleur;
    document.querySelectorAll('.btn-dynamic-color').forEach(btn => { btn.style.backgroundColor = agenceCouleur; });
    document.querySelectorAll('.text-dynamic-color').forEach(txt => { txt.style.color = agenceCouleur; });
    document.querySelectorAll('.border-dynamic-top, .card-pro, .info-card, .avis-card, .form-container').forEach(b => b.style.borderTopColor = agenceCouleur);
    document.querySelectorAll('.border-dynamic-color').forEach(b => b.style.borderColor = agenceCouleur);
    
    document.querySelectorAll('nav a').forEach(a => {
        a.style.color = '#fff'; a.style.borderBottomColor = 'transparent';
    });
    const lienActif = document.querySelector('nav a.active');
    if (lienActif) {
        lienActif.style.color = agenceCouleur;
        lienActif.style.borderBottom = `2px solid ${agenceCouleur}`;
    }
    
    const pBtn = document.querySelector('.profile-btn.active');
    if(pBtn) { pBtn.style.color = agenceCouleur; pBtn.style.borderColor = agenceCouleur; }
    
    document.querySelectorAll('.btn-pdf').forEach(b => b.style.backgroundColor = agenceCouleur);
}

function sauvegarderParametresPro() {
    agenceNom = document.getElementById('nomAgenceInput').value.trim() || "AuditPro";
    agenceCouleur = document.getElementById('couleurAgenceInput').value;
    localStorage.setItem('auditpro_agence_nom', agenceNom);
    localStorage.setItem('auditpro_agence_couleur', agenceCouleur);
    if(agenceLogoBase64) localStorage.setItem('auditpro_agence_logo', agenceLogoBase64);
    
    appliquerCouleurMarqueBlanche();
    chargerHistorique();
    if(donneesAudit) { afficherEcran(); } 
    showToast("Paramètres sauvegardés localement.");
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
    if(donneesAudit) afficherEcran();
    showToast("Réinitialisation effectuée.");
}

// ==========================================
// FIXATION ABSOLUE DES BOUTONS DE L'HISTORIQUE
// ==========================================
function chargerHistorique() {
    const table = document.getElementById('historiqueTableBody');
    if(!table) return;
    const hist = JSON.parse(localStorage.getItem('auditpro_hist_final_v1')) || [];
    table.innerHTML = hist.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px">Aucun dossier généré pour le moment.</td></tr>' : '';
    
    hist.reverse().forEach((d, i) => {
        let realIndex = hist.length - 1 - i;
        table.innerHTML += `
        <tr class="history-row">
            <td>${d.date}</td>
            <td><strong>${d.ville}</strong></td>
            <td>${formatNumber(d.prix)} €</td>
            <td style="text-align:right">
                <button type="button" class="btn-voir" onclick="window.voirHistorique(${realIndex})">Voir</button>
                <button type="button" class="btn-pdf" style="background:${agenceCouleur}; color:#fff;" onclick="window.pdfHistorique(${realIndex})">PDF</button>
            </td>
        </tr>`;
    });
}

window.voirHistorique = function(idx) {
    const hist = JSON.parse(localStorage.getItem('auditpro_hist_final_v1')) || [];
    const d = hist[idx];
    donneesAudit = d.data; idRapport = d.id; loyerMensuelSaisi = d.loyer || 0;
    
    document.getElementById('prixInitial').value = formatNumber(d.prix);
    if(loyerMensuelSaisi > 0) document.getElementById('loyerMensuel').value = formatNumber(loyerMensuelSaisi);
    
    // Simule le clic vers l'onglet principal et affiche à l'écran
    document.querySelectorAll('nav a')[0].click();
    document.getElementById('result-wrapper').style.display = "block";
    afficherEcran();
    document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
    showToast("Dossier chargé à l'écran.");
};

window.pdfHistorique = function(idx) {
    const hist = JSON.parse(localStorage.getItem('auditpro_hist_final_v1')) || [];
    donneesAudit = hist[idx].data; idRapport = hist[idx].id; loyerMensuelSaisi = hist[idx].loyer || 0;
    showToast("Téléchargement du PDF...");
    exporterPDF('download');
};

function ajouterAuHistorique(ville, prix, donnees) {
    const hist = JSON.parse(localStorage.getItem('auditpro_hist_final_v1')) || [];
    hist.push({ id: "AUDIT-" + Math.floor(Math.random() * 90000), date: new Date().toLocaleDateString('fr-FR'), ville: ville, prix: prix, data: donnees, loyer: loyerMensuelSaisi });
    localStorage.setItem('auditpro_hist_final_v1', JSON.stringify(hist));
    chargerHistorique();
}

function viderHistorique() { if(confirm("Supprimer l'historique ?")) { localStorage.removeItem('auditpro_hist_final_v1'); chargerHistorique(); } }

const formatNumber = (num) => { return Number(num).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' '); };

function formatInputNumber(e) {
    let value = e.target.value.replace(/\s+/g, '');
    if (!isNaN(value) && value !== "") e.target.value = formatNumber(value);
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast success`;
    toast.style.borderLeftColor = agenceCouleur;
    toast.innerHTML = `<strong>INFO :</strong> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

function switchReportTab(tabId) {
    document.querySelectorAll('.report-tab-btn').forEach(btn => {
        btn.classList.remove('active'); btn.style.color = '#6c757d'; btn.style.borderBottomColor = 'transparent';
    });
    document.querySelectorAll('.report-pane').forEach(pane => pane.classList.remove('active'));
    let activeBtn = document.querySelector(`[onclick="switchReportTab('${tabId}')"]`);
    activeBtn.classList.add('active'); activeBtn.style.color = agenceCouleur; activeBtn.style.borderBottomColor = agenceCouleur;
    document.getElementById(tabId).classList.add('active');
}

function copierScript(idElement) {
    const texte = document.getElementById(idElement).innerText;
    navigator.clipboard.writeText(texte).then(() => { showToast("Données copiées !"); });
}

function lancerDemo() {
    document.getElementById('prixInitial').value = "450 000";
    document.getElementById('codePostal').value = "35000";
    idRapport = "DEMO-PRO-7500";
    donneesAudit = { cp: "35000", localisation_exacte: "Rennes (Secteur Ille-et-Vilaine)", impact_marche: "Secteur provincial actif en Ille-et-Vilaine. Tension sur le coût des devis liés aux artisans certifiés RGE (+12%).", date_audit: new Date().toLocaleDateString('fr-FR'), prix_initial: 450000, total_decote: 28700, prix_net: 421300, diagnostics: [{titre: "Électricité (Sécurité)", cout: 4500, statut: "ANOMALIE", detail: "Matériel ancien et absence de mise à la terre sur les pièces d'eau.", action: "Mise en sécurité du tableau électrique par un électricien."}, {titre: "DPE (Énergie)", cout: 20000, statut: "ANOMALIE", detail: "Logement classé F (Passoire thermique). Pertes de chaleur majeures.", action: "Isolation thermique globale nécessaire."}, {titre: "Amiante (Matériaux)", cout: 4200, statut: "ANOMALIE", detail: "Présence de conduits amiantés isolés dans la cave.", action: "Traitement par une société certifiée."}] };
    document.getElementById('result-wrapper').style.display = "block";
    document.getElementById('result-wrapper').scrollIntoView({ behavior: 'smooth' });
    afficherEcran();
}

async function envoyer() {
    const input = document.getElementById('fichierPdf');
    const prix = Number(document.getElementById('prixInitial').value.replace(/\s+/g, '')) || 0;
    const cp = document.getElementById('codePostal').value || "";
    if (prix <= 0 || !input.files.length) return alert("Prix et PDF requis.");
    document.getElementById('loading-overlay').style.display = "flex";
    const formData = new FormData(); formData.append("fichier", input.files[0]); formData.append("prix", prix); formData.append("cp", cp);
    try {
        const reponse = await fetch("https://audit-check-ktny.onrender.com/scan", { method: "POST", body: formData });
        donneesAudit = await reponse.json();
        idRapport = "AUDIT-" + Math.floor(Math.random() * 90000);
        document.getElementById('loading-overlay').style.display = "none";
        ajouterAuHistorique(donneesAudit.localisation_exacte, prix, donneesAudit);
        document.getElementById('result-wrapper').style.display = "block";
        afficherEcran();
    } catch (e) { document.getElementById('loading-overlay').style.display = "none"; alert("Erreur serveur."); }
}

function afficherEcran() {
    let anomalies = donneesAudit.diagnostics.filter(d => d.cout > 0);
    let html = `
    <div style="border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div><h2>Rapport d'Expertise Immobilière</h2><p>Secteur : ${donneesAudit.localisation_exacte}</p></div>
        <div style="text-align:right">Réf: ${idRapport}<br>Date : ${donneesAudit.date_audit}</div>
    </div>
    <div class="report-tabs">
        <button class="report-tab-btn active" onclick="switchReportTab('paneFinancier')" style="color:${agenceCouleur}; border-bottom-color:${agenceCouleur}">1. Synthèse Financière</button>
        <button class="report-tab-btn" onclick="switchReportTab('paneTechnique')">2. Bilan Technique (DDT)</button>
        <button class="report-tab-btn" onclick="switchReportTab('paneData')">3. Données d'Appui</button>
    </div>
    <div id="paneFinancier" class="report-pane active">
        <div class="kpi-grid">
            <div class="kpi-box"><div class="kpi-label">Prix Vente Initial</div><div class="kpi-value">${formatNumber(donneesAudit.prix_initial)} €</div></div>
            <div class="kpi-box"><div class="kpi-label" style="color:#cc0000">Enveloppe Travaux</div><div class="kpi-value" style="color:#cc0000">-${formatNumber(donneesAudit.total_decote)} €</div></div>
            <div class="kpi-box main" style="background:${agenceCouleur}"><div class="kpi-label">Valeur Nette Recommandée</div><div class="kpi-value">${formatNumber(donneesAudit.prix_net)} €</div></div>
        </div>
        <div style="background:#f8f9fa; padding:20px; border-radius:8px; border:1px solid #ddd">${donneesAudit.impact_marche}</div>
    </div>
    <div id="paneTechnique" class="report-pane">
        ${anomalies.length > 0 ? `<div class="chart-container"><canvas id="coutChart"></canvas></div>` : ''}
        <div class="table-responsive">
            <table><thead><tr><th>Domaine Contrôlé</th><th>État</th><th>Détails & Préconisations</th><th>Budget Travaux</th></tr></thead>
            <tbody>${donneesAudit.diagnostics.map(a => `<tr><td><b>${a.titre}</b></td><td style="color:${a.cout>0?'#cc0000':agenceCouleur}; font-weight:bold;">${a.statut}</td><td><b>Constat :</b> ${a.detail}<br>${a.cout>0?`<b>Action :</b> ${a.action}`:''}</td><td style="font-weight:bold; text-align:right;">${a.cout>0?'-'+formatNumber(a.cout)+' €':'0 €'}</td></tr>`).join('')}</tbody></table>
        </div>
    </div>
    <div id="paneData" class="report-pane">
        <div class="script-box" style="border-left-color:${agenceCouleur}"><b>Synthèse Factuelle :</b>\n- Prix de vente initial : ${formatNumber(donneesAudit.prix_initial)} €\n- Enveloppe travaux estimée : ${formatNumber(donneesAudit.total_decote)} €\n- Valeur nette recommandée : ${formatNumber(donneesAudit.prix_net)} €\n\nPoints critiques identifiés :\n${anomalies.map(a=> '• ' + a.titre).join('\n')}</div>
    </div>`;
    document.getElementById('contenu-ecran').innerHTML = html;
    appliquerCouleurMarqueBlanche();
}

function exporterPDF() {
    const doc = {
        content: [
            { columns: [ agenceLogoBase64 ? {image:agenceLogoBase64, fit:[100,40]} : {text:agenceNom, bold:true, fontSize:18}, {stack:[{text:'Réf: ' + idRapport, alignment:'right'},{text:donneesAudit.date_audit, alignment:'right'}]} ] },
            { text: 'RAPPORT D\'EXPERTISE TECHNIQUE IMMOBILIÈRE', alignment:'center', margin:[0,30], bold:true, fontSize:14 },
            { table: { widths:['*','*','*'], body: [ [{text:'PRIX INITIAL',bold:true},{text:'ENVELOPPE TRAVAUX',bold:true},{text:'VALEUR NETTE RECOMMANDÉE',bold:true}], [formatNumber(donneesAudit.prix_initial)+' €', '-'+formatNumber(donneesAudit.total_decote)+' €', {text:formatNumber(donneesAudit.prix_net)+' €', color:agenceCouleur, bold:true}] ] } },
            { text: 'Détails de l\'évaluation technique (DDT) :', margin:[0,30,0,10], bold:true, fontSize:11 },
            { table: { widths:['25%','15%','45%','15%'], body: [ ['Domaine','État','Détails','Budget'], ...donneesAudit.diagnostics.map(a=>[a.titre, a.statut, a.detail, a.cout+' €']) ] } }
        ]
    };
    pdfMake.createPdf(doc).download(idRapport + ".pdf");
}

function ajouterAvis() {
    const nom = document.getElementById('nomAvis').value; const texte = document.getElementById('texteAvis').value;
    if(!nom || !texte) return;
    document.getElementById('listeAvis').innerHTML += `<div class="avis-card border-dynamic-top"><b>${nom}</b><p>${texte}</p></div>`;
    document.getElementById('nomAvis').value = ''; document.getElementById('texteAvis').value = '';
    appliquerCouleurMarqueBlanche(); showToast("Avis publié !");
}

document.addEventListener("DOMContentLoaded", () => {
    // RESTAURATION INTEGRALE ET COMPLETE DES 20 FAQ TEXTUELLES
    const faqs = [
        ["1. Qu'est-ce qu'un audit technique pré-acquisition ?", "C'est une analyse détaillée de la santé d'un bâtiment. Notre programme interprète les documents obligatoires du vendeur pour en déduire les risques financiers et estimer le budget nécessaire pour la mise aux normes."],
        ["2. Le rapport d'AuditPro a-t-il une valeur légale chez le notaire ?", "Non. Le rapport généré est un outil d'aide à la décision visant la transparence commerciale. Chez le notaire, seul le Dossier de Diagnostic Technique (DDT) réalisé physiquement par l'expert certifié a une valeur juridique absolue."],
        ["3. Puis-je utiliser ce chiffrage pour discuter du prix de vente ?", "Absolument, c'est l'objectif principal. En présentant un rapport clair chiffrant les anomalies techniques, vous disposez d'une base objective et neutre pour trouver un accord équitable avec le vendeur."],
        ["4. L'outil remplace-t-il le devis d'un artisan professionnel ?", "Non. L'application calcule une enveloppe budgétaire moyenne basée sur des statistiques régionales. Avant d'acheter, il est toujours conseillé de faire confirmer ces montants précis par le devis d'un artisan local certifié RGE."],
        ["5. Quels sont les diagnostics immobiliers obligatoires pour vendre ?", "Le vendeur doit fournir : le DPE (énergie), le constat plomb (si construction avant 1949), l'amiante (avant 1997), l'électricité et le gaz (installations de plus de 15 ans), l'ERP (risques naturels), et l'état parasitaire selon l'arrêté de la ville."],
        ["6. Quelle est la durée de validité du DPE ?", "Un DPE est valable 10 ans. Attention toutefois, depuis la réforme nationale, tous les DPE réalisés avec l'ancienne méthode de calcul (avant le 1er juillet 2021) ne sont officiellement plus valables et doivent être refaits."],
        ["7. Qu'est-ce qu'exactement une passoire thermique ?", "C'est un logement classé F ou G sur le DPE. Il consomme énormément de chauffage. La loi française interdit progressivement la mise en location de ces biens."],
        ["8. Quelle est la durée de validité des diagnostics Électricité et Gaz ?", "Ils sont valables 3 ans dans le cadre d'une vente immobilière. Si vous achetez ce bien pour le mettre en location, leur durée de validité est étendue à 6 ans pour la signature du contrat de bail."],
        ["9. Faut-il refaire le diagnostic Amiante si le résultat précédent était négatif ?", "Non, sa validité est théoriquement illimitée, MAIS à une seule condition : il doit avoir été réalisé après le 1er avril 2013."],
        ["10. Quelle est la différence de risque entre l'amiante et le plomb ?", "L'amiante est une fibre (souvent dans les toits en fibrociment) qui est cancérigène si on la respire. Le plomb est présent dans les vieilles peintures et provoque une maladie grave (le saturnisme) si un enfant ingère les écailles."],
        ["11. Qu'est-ce qu'un DGI (Danger Grave et Immédiat) ?", "C'est le niveau d'alerte maximum, extrêmement fréquent sur les anciennes chaudières au gaz. Si le diagnostiqueur repère un DGI, il a l'obligation légale de condamner l'installation sur le champ. Elle ne pourra être rouverte qu'après réparation par un pro."],
        ["12. Suis-je obligé de faire les travaux si une anomalie est détectée ?", "Le vendeur n'a aucune obligation de travaux (sauf en cas de DGI), il doit juste informer l'acheteur en toute transparence. En tant qu'acheteur, la loi ne vous y oblige pas, mais les banques l'exigent pour le prêt."],
        ["13. Le calcul prend-il en compte les aides de l'État (MaPrimeRénov') ?", "Non. L'outil vous indique le coût global brut des travaux. Les aides étant calculées en fonction de vos revenus fiscaux personnels, c'est à vous de les déduire."],
        ["14. Le rapport est-il adapté aux tarifs des artisans de ma région ?", "Oui. L'algorithme lit le code postal que vous avez renseigné et applique un coefficient multiplicateur reflétant la tension du marché de la construction dans votre département."],
        ["15. Comment le programme calcule-t-il les prix des travaux ?", "Il repère dans le PDF la surface totale du bien, identifie le type de problème relevé par l'expert, et multiplie la surface par le coût moyen au mètre carré pratiqué pour ce type de réparation spécifique."],
        ["16. Mes données personnelles et mon document PDF sont-ils conservés ?", "Absolument pas. Nous appliquons la règle stricte du 'Zéro Stockage' serveur. Votre PDF est scanné en quelques secondes par la mémoire vive, puis il est immédiatement et définitivement supprimé."],
        ["17. Le programme peut-il lire un PDF de plus de 100 pages ?", "Oui, c'est toute la force de l'outil technique. L'algorithme est conçu pour scanner instantanément l'intégralité du document et cibler uniquement les tableaux de synthèses."],
        ["18. Que se passe-t-il s'il manque un diagnostic obligatoire lors de la vente ?", "Le notaire bloquera généralement la vente le jour de la signature. Si elle se fait quand même, l'acheteur pourra plus tard demander l'annulation de la vente pour vice caché."],
        ["19. L'outil fonctionne-t-il pour les locaux commerciaux ou industriels ?", "Actuellement non. Les règles de sécurité et les prix au mètre carré étant fondamentalement différents, l'outil est calibré exclusivement pour l'immobilier d'habitation."],
        ["20. Je suis un professionnel de l'immobilier, puis-je utiliser la plateforme ?", "Oui, l'outil dispose d'un écran de bienvenue avec sélection de profil. En choisissant 'Espace Professionnel', l'algorithme générera une présentation conçue pour valoriser vos mandats exclusifs."]
    ];
    const faqList = document.getElementById('faq-list');
    if(faqList) { faqs.forEach(f => { faqList.innerHTML += `<details><summary>${f[0]}</summary><p>${f[1]}</p></details>`; }); }

    chargerHistorique(); appliquerCouleurMarqueBlanche();
    document.querySelectorAll('.price-input').forEach(i => i.addEventListener('input', formatInputNumber));
    
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('nav a').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(this.getAttribute('href').substring(1) + "-tab").classList.add('active');
            appliquerCouleurMarqueBlanche();
        });
    });
});
