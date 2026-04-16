/**
 * ZENOCCAZ — Système d'offres saisonnières v1.0
 * Bannière auto + chatbot + page offres
 */

(function () {

  // ════════════════════════════════════════
  // DONNÉES DES OFFRES
  // ════════════════════════════════════════
  const OFFRES = [
    {
      id: 'printemps',
      mois: [3, 4], // Mars, Avril
      emoji: '🌸',
      saison: 'Offre Printemps',
      titre: 'Réveil de Printemps',
      accroche: 'Votre véhicule mérite un bilan après l\'hiver',
      services: [
        'Contrôle sortie d\'hiver complet',
        'Scan OBD diagnostic électronique',
        '−10 % sur les filtres habitacle',
        'Vérification courroies & durites',
        'Contrôle fuites moteur',
      ],
      couleur: '#f472b6',
      couleurBg: 'rgba(244,114,182,0.08)',
      couleurBorder: 'rgba(244,114,182,0.25)',
      gradient: 'linear-gradient(135deg, #f472b6, #fb923c)',
      pourQui: 'tout',
      cta: 'Profiter de l\'offre',
      fin: 'Offre valable en mars et avril',
    },
    {
      id: 'ete',
      mois: [7, 8], // Juillet, Août
      emoji: '☀️',
      saison: 'Offre Été',
      titre: 'Prêt pour les Vacances',
      accroche: 'Partez l\'esprit tranquille, on vérifie tout',
      services: [
        'Test batterie & alternateur',
        'Contrôle refroidissement visuel',
        '−10 % sur les LDR (ampoules)',
        'Pack vacances sécurité complet',
        'Contrôle pression & état pneus',
      ],
      couleur: '#f59e0b',
      couleurBg: 'rgba(245,158,11,0.08)',
      couleurBorder: 'rgba(245,158,11,0.25)',
      gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
      pourQui: 'tout',
      cta: 'Réserver mon contrôle',
      fin: 'Offre valable en juillet et août',
    },
    {
      id: 'noel',
      mois: [12], // Décembre
      emoji: '🎄',
      saison: 'Offre Noël',
      titre: 'Cadeau Fidélité',
      accroche: 'Merci de nous avoir fait confiance cette année',
      services: [
        'Chèque cadeau 100 € à valoir sur n\'importe quel site',
        'Offert à tous nos clients ayant acheté en ' + new Date().getFullYear(),
        'Valable jusqu\'au 31 décembre',
        'Livré par email personnalisé',
      ],
      couleur: '#10b981',
      couleurBg: 'rgba(16,185,129,0.08)',
      couleurBorder: 'rgba(16,185,129,0.25)',
      gradient: 'linear-gradient(135deg, #10b981, #3b82f6)',
      pourQui: 'achat', // uniquement clients ayant acheté
      cta: 'Débloquer mon cadeau',
      fin: 'Réservé aux clients ayant acheté en ' + new Date().getFullYear(),
    },
  ];

  // ════════════════════════════════════════
  // UTILITAIRES
  // ════════════════════════════════════════

  function getOffreDuMois() {
    const mois = new Date().getMonth() + 1;
    return OFFRES.find(o => o.mois.includes(mois)) || null;
  }

  function getClientConnecte() {
    try { return JSON.parse(localStorage.getItem('clientData') || 'null'); } catch { return null; }
  }

  async function clientAAchete(clientId) {
    if (!clientId) return false;
    try {
      const sb = window.supabase;
      if (!sb) return false;
      const { data } = await sb
        .from('vehicles')
        .select('id')
        .eq('status', 'Vendu')
        .limit(1);
      // Vérifie dans les finances si le client a un achat
      const annee = new Date().getFullYear();
      const debut = annee + '-01-01';
      const fin   = annee + '-12-31';
      const { data: ventes } = await sb
        .from('finances')
        .select('id')
        .eq('type', 'revenue')
        .gte('date', debut)
        .lte('date', fin)
        .limit(1);
      return ventes && ventes.length > 0;
    } catch { return false; }
  }

  // ════════════════════════════════════════
  // INJECTION CSS
  // ════════════════════════════════════════

  function injectCSS() {
    if (document.getElementById('zn-offres-css')) return;
    const style = document.createElement('style');
    style.id = 'zn-offres-css';
    style.textContent = `
      /* ── Bannière saisonnière ── */
      #zn-banner {
        position: fixed;
        top: 0; left: 0; right: 0;
        z-index: 1100;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 28px;
        backdrop-filter: blur(20px) saturate(160%);
        border-bottom: 1px solid rgba(255,255,255,0.08);
        font-family: 'Inter', sans-serif;
        animation: zn-slide-down .5s cubic-bezier(.4,0,.2,1) both;
        cursor: pointer;
        transition: opacity .3s;
      }
      #zn-banner:hover { opacity: .92; }

      @keyframes zn-slide-down {
        from { transform: translateY(-100%); opacity: 0; }
        to   { transform: translateY(0);     opacity: 1; }
      }

      .zn-banner-left {
        display: flex; align-items: center; gap: 14px;
      }
      .zn-banner-emoji {
        font-size: 22px; line-height: 1; flex-shrink: 0;
        animation: zn-bounce 2s ease-in-out infinite;
      }
      @keyframes zn-bounce {
        0%,100% { transform: translateY(0) rotate(0deg); }
        50%      { transform: translateY(-4px) rotate(5deg); }
      }
      .zn-banner-text { display: flex; flex-direction: column; gap: 1px; }
      .zn-banner-titre {
        font-size: 14px; font-weight: 700; color: #fff;
        letter-spacing: -.2px;
      }
      .zn-banner-sub {
        font-size: 12px; color: rgba(255,255,255,0.65);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 500px;
      }
      .zn-banner-cta {
        padding: 8px 20px;
        border-radius: 20px;
        font-size: 13px; font-weight: 700;
        border: none; cursor: pointer;
        white-space: nowrap; flex-shrink: 0;
        font-family: inherit;
        transition: transform .2s, box-shadow .2s;
        color: #fff;
      }
      .zn-banner-cta:hover {
        transform: translateY(-2px) scale(1.04);
        box-shadow: 0 6px 20px rgba(0,0,0,0.3);
      }
      .zn-banner-close {
        background: rgba(255,255,255,0.1);
        border: none; color: rgba(255,255,255,0.6);
        width: 28px; height: 28px; border-radius: 50%;
        cursor: pointer; font-size: 14px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        transition: background .2s, color .2s;
        font-family: inherit;
      }
      .zn-banner-close:hover {
        background: rgba(255,255,255,0.2); color: #fff;
      }

      /* Décalage du header quand bannière visible */
      body.zn-banner-visible .site-header {
        top: 48px !important;
        transition: top .3s;
      }
      /* Pas de padding-top sur services.html — ça décale les modaux fixed */
      body.zn-banner-visible:not(.no-banner-padding) {
        padding-top: 48px;
      }

      /* ── Page offres (modal fullscreen) ── */
      #zn-offres-modal {
        position: fixed; inset: 0;
        background: rgba(5,8,18,0.92);
        backdrop-filter: blur(20px);
        z-index: 9990;
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
        animation: zn-fade-in .3s ease both;
      }
      #zn-offres-modal.hidden { display: none; }

      @keyframes zn-fade-in {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      .zn-modal-inner {
        background: linear-gradient(160deg, #0d1220, #080c18);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 24px;
        width: 100%; max-width: 900px;
        max-height: 90vh; overflow-y: auto;
        animation: zn-slide-up .35s cubic-bezier(.4,0,.2,1) both;
        scrollbar-width: thin;
        scrollbar-color: rgba(16,185,129,0.4) transparent;
      }

      .zn-modal-inner::-webkit-scrollbar { width: 4px; }
      .zn-modal-inner::-webkit-scrollbar-thumb {
        background: rgba(16,185,129,0.4); border-radius: 4px;
      }

      @keyframes zn-slide-up {
        from { opacity: 0; transform: translateY(30px) scale(.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* Header modal */
      .zn-modal-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 28px 32px 0;
      }
      .zn-modal-header h2 {
        font-family: 'Orbitron', sans-serif;
        font-size: 22px; font-weight: 800;
        background: linear-gradient(135deg, #10b981, #3b82f6);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text; margin: 0;
      }
      .zn-modal-close-btn {
        width: 40px; height: 40px; border-radius: 12px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        color: #94a3b8; cursor: pointer; font-size: 16px;
        display: flex; align-items: center; justify-content: center;
        transition: all .2s; font-family: inherit;
      }
      .zn-modal-close-btn:hover {
        background: rgba(239,68,68,0.15);
        border-color: rgba(239,68,68,0.3); color: #ef4444;
        transform: rotate(90deg);
      }

      /* Grille des offres */
      .zn-offres-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 20px;
        padding: 28px 32px 32px;
      }

      /* Carte offre */
      .zn-offre-card {
        border-radius: 20px;
        border: 1px solid;
        padding: 28px;
        position: relative; overflow: hidden;
        transition: transform .3s, box-shadow .3s;
        cursor: default;
      }
      .zn-offre-card:hover {
        transform: translateY(-6px);
        box-shadow: 0 20px 50px rgba(0,0,0,0.4);
      }

      /* Badge "EN CE MOMENT" */
      .zn-badge-now {
        position: absolute; top: 16px; right: 16px;
        padding: 4px 12px; border-radius: 20px;
        font-size: 10px; font-weight: 800;
        letter-spacing: 1px; text-transform: uppercase;
        color: #fff; border: 1px solid rgba(255,255,255,0.3);
        animation: zn-pulse-badge 2s ease-in-out infinite;
      }
      @keyframes zn-pulse-badge {
        0%,100% { opacity: 1; }
        50%      { opacity: .6; }
      }

      /* Badge "À VENIR" */
      .zn-badge-soon {
        position: absolute; top: 16px; right: 16px;
        padding: 4px 12px; border-radius: 20px;
        font-size: 10px; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase;
        color: rgba(255,255,255,0.4);
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
      }

      .zn-card-emoji { font-size: 40px; margin-bottom: 16px; display: block; }

      .zn-card-saison {
        font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
        text-transform: uppercase; margin-bottom: 6px;
        opacity: .7;
      }

      .zn-card-titre {
        font-family: 'Orbitron', sans-serif;
        font-size: 18px; font-weight: 800;
        color: #fff; margin-bottom: 6px; line-height: 1.2;
      }

      .zn-card-accroche {
        font-size: 13px; color: rgba(255,255,255,0.55);
        margin-bottom: 20px; line-height: 1.5;
      }

      .zn-card-services {
        display: flex; flex-direction: column; gap: 8px;
        margin-bottom: 20px;
      }

      .zn-card-service {
        display: flex; align-items: flex-start; gap: 8px;
        font-size: 13px; color: rgba(255,255,255,0.8);
        line-height: 1.4;
      }

      .zn-service-dot {
        width: 6px; height: 6px; border-radius: 50%;
        flex-shrink: 0; margin-top: 5px;
      }

      .zn-card-fin {
        font-size: 11px; color: rgba(255,255,255,0.35);
        margin-bottom: 20px; font-style: italic;
      }

      .zn-card-btn {
        width: 100%; padding: 12px;
        border-radius: 12px; border: none;
        font-size: 13px; font-weight: 700;
        cursor: pointer; font-family: inherit;
        color: #fff; transition: all .2s;
        position: relative; overflow: hidden;
      }
      .zn-card-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      }
      .zn-card-btn:disabled {
        opacity: .4; cursor: not-allowed; transform: none;
      }

      /* Carte inactive (offre passée ou future) */
      .zn-offre-card.inactive {
        opacity: .45;
        filter: grayscale(30%);
      }
      .zn-offre-card.inactive:hover {
        transform: none;
        box-shadow: none;
      }

      /* Section teasing Noël pour non-clients */
      .zn-noel-teasing {
        background: rgba(16,185,129,0.06);
        border: 1px solid rgba(16,185,129,0.2);
        border-radius: 12px; padding: 16px;
        text-align: center; margin-top: 12px;
        font-size: 13px; color: rgba(255,255,255,0.6);
        line-height: 1.6;
      }
      .zn-noel-teasing a {
        color: #10b981; font-weight: 600; text-decoration: none;
      }
      .zn-noel-teasing a:hover { text-decoration: underline; }

      /* Timeline mois */
      .zn-timeline {
        display: flex; align-items: center;
        gap: 0; padding: 0 32px 28px;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .zn-timeline::-webkit-scrollbar { display: none; }

      .zn-tl-item {
        display: flex; flex-direction: column; align-items: center;
        flex: 1; min-width: 60px; position: relative;
      }

      .zn-tl-item::before {
        content: '';
        position: absolute; top: 14px; left: calc(50% + 10px); right: calc(-50% + 10px);
        height: 2px; background: rgba(255,255,255,0.08);
        z-index: 0;
      }
      .zn-tl-item:last-child::before { display: none; }

      .zn-tl-dot {
        width: 28px; height: 28px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.03);
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; z-index: 1; position: relative;
        transition: all .2s;
      }
      .zn-tl-item.active .zn-tl-dot {
        border-color: currentColor;
        box-shadow: 0 0 12px currentColor;
      }
      .zn-tl-mois {
        font-size: 10px; font-weight: 600; letter-spacing: .5px;
        color: rgba(255,255,255,0.3); margin-top: 6px;
        text-transform: uppercase;
      }
      .zn-tl-item.active .zn-tl-mois { color: rgba(255,255,255,0.8); }
      .zn-tl-item.now .zn-tl-dot {
        background: currentColor;
        border-color: currentColor;
        animation: zn-pulse-badge 1.5s ease-in-out infinite;
      }

      /* Responsive */
      @media (max-width: 600px) {
        #zn-banner { padding: 10px 16px; }
        .zn-banner-sub { display: none; }
        .zn-offres-grid { grid-template-columns: 1fr; padding: 20px; }
        .zn-modal-header { padding: 20px 20px 0; }
        .zn-timeline { padding: 0 20px 20px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ════════════════════════════════════════
  // BANNIÈRE
  // ════════════════════════════════════════

  function creerBanniere(offre) {
    if (document.getElementById('zn-banner')) return;
    // Ne pas remonter si déjà fermée cette session
    if (sessionStorage.getItem('zn-banner-closed-' + offre.id)) return;

    const banner = document.createElement('div');
    banner.id = 'zn-banner';
    banner.style.background = offre.couleurBg.replace('0.08', '0.85');
    banner.style.background = 'linear-gradient(90deg, rgba(10,14,26,0.92), rgba(10,14,26,0.88))';
    banner.style.borderBottom = '1px solid ' + offre.couleurBorder;

    banner.innerHTML = `
      <div class="zn-banner-left">
        <span class="zn-banner-emoji">${offre.emoji}</span>
        <div class="zn-banner-text">
          <span class="zn-banner-titre">${offre.saison} — ${offre.titre}</span>
          <span class="zn-banner-sub">${offre.services.slice(0,3).join(' · ')}</span>
        </div>
      </div>
      <button class="zn-banner-cta" style="background:${offre.gradient};">${offre.cta}</button>
      <button class="zn-banner-close" title="Fermer">✕</button>
    `;

    document.body.classList.add('zn-banner-visible');
    document.body.appendChild(banner);

    // CTA → ouvre la page offres
    banner.querySelector('.zn-banner-cta').addEventListener('click', (e) => {
      e.stopPropagation();
      ouvrirPageOffres();
    });

    // Fermer
    banner.querySelector('.zn-banner-close').addEventListener('click', (e) => {
      e.stopPropagation();
      banner.style.animation = 'zn-slide-down .3s reverse both';
      setTimeout(() => {
        banner.remove();
        document.body.classList.remove('zn-banner-visible');
      }, 280);
      sessionStorage.setItem('zn-banner-closed-' + offre.id, '1');
    });

    // Clic sur toute la bannière
    banner.addEventListener('click', ouvrirPageOffres);
  }

  // ════════════════════════════════════════
  // PAGE OFFRES (MODAL)
  // ════════════════════════════════════════

  const MOIS_NOMS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  function buildTimeline() {
    const moisActuel = new Date().getMonth() + 1;
    return `<div class="zn-timeline">
      ${MOIS_NOMS.map((nom, i) => {
        const mois = i + 1;
        const offre = OFFRES.find(o => o.mois.includes(mois));
        const isNow = mois === moisActuel;
        const isOffre = !!offre;
        const couleur = offre ? offre.couleur : 'rgba(255,255,255,0.15)';
        return `<div class="zn-tl-item ${isOffre ? 'active' : ''} ${isNow ? 'now' : ''}" style="color:${couleur}">
          <div class="zn-tl-dot">${isOffre ? offre.emoji : ''}</div>
          <div class="zn-tl-mois">${nom}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  async function buildCarteNoel(offre) {
    const client = getClientConnecte();
    let contenu = '';

    if (!client) {
      contenu = `
        <div class="zn-noel-teasing">
          🎁 Cette offre est réservée à nos clients fidèles.<br>
          <a href="#" onclick="window.openLoginModal && window.openLoginModal(); return false;">
            Connectez-vous
          </a> pour vérifier votre éligibilité.
        </div>`;
    } else {
      const aAchete = await clientAAchete(client.id);
      if (aAchete) {
        contenu = `
          <button class="zn-card-btn" style="background:${offre.gradient};" onclick="window.znDemanderCadeau && window.znDemanderCadeau()">
            🎁 Recevoir mon chèque cadeau
          </button>`;
      } else {
        contenu = `
          <div class="zn-noel-teasing">
            🎄 Cette offre est réservée aux clients ayant acheté un véhicule en ${new Date().getFullYear()}.<br>
            Achetez chez nous et profitez-en l'année prochaine !
          </div>`;
      }
    }
    return contenu;
  }

  async function ouvrirPageOffres() {
    let modal = document.getElementById('zn-offres-modal');
    if (modal) { modal.classList.remove('hidden'); return; }

    const moisActuel = new Date().getMonth() + 1;

    // Construire les cartes
    const cartesHTML = await Promise.all(OFFRES.map(async (offre) => {
      const estActive = offre.mois.includes(moisActuel);
      const estFuture = offre.mois[0] > moisActuel || (offre.mois[0] < 3 && moisActuel > 8);

      let badge = '';
      if (estActive) badge = `<span class="zn-badge-now" style="background:${offre.gradient}">En ce moment</span>`;
      else badge = `<span class="zn-badge-soon">À venir</span>`;

      const servicesHTML = offre.services.map(s => `
        <div class="zn-card-service">
          <span class="zn-service-dot" style="background:${offre.couleur}"></span>
          <span>${s}</span>
        </div>`).join('');

      let ctaHTML = '';
      if (offre.id === 'noel') {
        ctaHTML = await buildCarteNoel(offre);
      } else if (estActive) {
        ctaHTML = `<button class="zn-card-btn" style="background:${offre.gradient};" onclick="window.znActiverOffre('${offre.id}')">${offre.cta}</button>`;
      } else {
        ctaHTML = `<button class="zn-card-btn" style="background:${offre.gradient};" disabled>Disponible ${offre.mois.map(m => MOIS_NOMS[m-1]).join(' & ')}</button>`;
      }

      return `
        <div class="zn-offre-card ${estActive ? 'active' : 'inactive'}"
             style="background:${offre.couleurBg};border-color:${offre.couleurBorder};">
          ${badge}
          <span class="zn-card-emoji">${offre.emoji}</span>
          <div class="zn-card-saison" style="color:${offre.couleur}">${offre.saison}</div>
          <div class="zn-card-titre">${offre.titre}</div>
          <div class="zn-card-accroche">${offre.accroche}</div>
          <div class="zn-card-services">${servicesHTML}</div>
          <div class="zn-card-fin">${offre.fin}</div>
          ${ctaHTML}
        </div>`;
    }));

    modal = document.createElement('div');
    modal.id = 'zn-offres-modal';
    modal.innerHTML = `
      <div class="zn-modal-inner">
        <div class="zn-modal-header">
          <h2>🎁 Nos Offres Saisonnières</h2>
          <button class="zn-modal-close-btn" onclick="document.getElementById('zn-offres-modal').classList.add('hidden')">✕</button>
        </div>
        ${buildTimeline()}
        <div class="zn-offres-grid">${cartesHTML.join('')}</div>
      </div>`;

    document.body.appendChild(modal);

    // Fermer en cliquant hors du contenu
    // SAUF si un znModal est ouvert par-dessus
    modal.addEventListener('click', (e) => {
      if (e.target === modal && !document.getElementById('zn-modal-overlay')) {
        modal.classList.add('hidden');
      }
    });
  }

  // ════════════════════════════════════════
  // CHATBOT — INJECTION MESSAGE OFFRE
  // ════════════════════════════════════════

  function patcherChatbot() {
    const offre = getOffreDuMois();
    if (!offre) return;

    // Attend que le chatbot soit initialisé
    const check = setInterval(() => {
      if (!window.chatBotInstance) return;
      clearInterval(check);

      const originalStartFlow = window.chatBotInstance.startFlow.bind(window.chatBotInstance);

      window.chatBotInstance.startFlow = function () {
        const offre = getOffreDuMois();
        if (offre) {
          // Message offre en premier
          const msg = `${offre.emoji} **Offre ${offre.saison}** — ${offre.titre}\n${offre.accroche}\n\n${offre.services.slice(0,3).map(s => '→ ' + s).join('\n')}`;
          this.addMessage(msg, 'bot');
          // Bouton pour voir l'offre complète
          this.addButtons('Que souhaitez-vous faire ?', [
            { label: offre.emoji + ' Voir l\'offre complète', value: 'voir_offre' },
            { label: 'Continuer', value: 'continuer' },
          ], (value) => {
            if (value === 'voir_offre') {
              ouvrirPageOffres();
              this.addMessage('La page des offres est ouverte ! 👆', 'bot');
            }
            originalStartFlow();
          });
        } else {
          originalStartFlow();
        }
      };

    }, 300);
  }

  // ════════════════════════════════════════
  // DEMANDE CHÈQUE CADEAU NOËL
  // ════════════════════════════════════════


  // ── Modal custom premium — clic pour fermer ──
  function znModal({ icon, titre, message, lien, lienTexte }) {
    icon = icon || '✅'; lienTexte = lienTexte || 'Voir →';
    const ex = document.getElementById('zn-modal-overlay');
    if (ex) ex.remove();
    const overlay = document.createElement('div');
    overlay.id = 'zn-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,18,0.85);backdrop-filter:blur(12px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;cursor:pointer;';
    overlay.innerHTML = `<div style="background:linear-gradient(160deg,#0d1220,#080c18);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:36px 32px;max-width:420px;width:100%;text-align:center;box-shadow:0 32px 80px rgba(0,0,0,0.6);position:relative;overflow:hidden;font-family:'Inter',-apple-system,sans-serif;cursor:default;">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#10b981,#3b82f6,transparent);"></div>
      <div style="font-size:52px;margin-bottom:16px;line-height:1;">${icon}</div>
      <div style="font-size:19px;font-weight:800;color:#fff;margin-bottom:10px;">${titre}</div>
      <div style="font-size:14px;color:#94a3b8;line-height:1.7;margin-bottom:${lien ? '24px' : '8px'};">${message}</div>
      ${lien ? `<a href="${lien}" onclick="event.stopPropagation()" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#10b981,#059669);border-radius:12px;color:#fff;font-weight:700;font-size:14px;text-decoration:none;">${lienTexte}</a>` : ''}
      <div style="margin-top:18px;font-size:11px;color:rgba(255,255,255,0.25);">Cliquez n'importe où pour fermer</div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity .25s';
      setTimeout(() => overlay.remove(), 250);
    });
  }


  // ── Activation d'une offre ──
  window.znActiverOffre = async function(offreId) {
    const client = getClientConnecte();

    if (!client) {
      // Sauvegarder l'offre à activer et ouvrir le login
      sessionStorage.setItem('zn-pending-offer', offreId);
      if (typeof window.openLoginModal === 'function') {
        window.openLoginModal();
        // Après connexion, activer l'offre automatiquement
        window.addEventListener('clientLogin', async function handler(e) {
          window.removeEventListener('clientLogin', handler);
          await window.znActiverOffreConnecte(offreId, e.detail);
        });
      } else {
        znModal({ icon: '🔐', titre: 'Connexion requise', message: 'Connectez-vous pour activer cette offre et la retrouver dans votre espace client.', lien: 'client-account.html', lienTexte: 'Se connecter →' });
      }
      return;
    }

    await window.znActiverOffreConnecte(offreId, client);
  };

  window.znActiverOffreConnecte = async function(offreId, client) {
    const sb = window.supabase;
    if (!sb) { znModal({ icon: '❌', titre: 'Erreur de connexion', message: 'Impossible de se connecter à la base de données. Réessayez.' }); return; }

    const annee = new Date().getFullYear();

    try {
      // Vérifier si déjà activée cette année
      const { data: existing } = await sb
        .from('client_offers')
        .select('id, used')
        .eq('client_id', client.id)
        .eq('offer_id', offreId)
        .eq('offer_year', annee)
        .single();

      if (existing) {
        const statut = existing.used ? 'déjà utilisée' : 'déjà activée';
        znModal({ icon: statut === 'déjà utilisée' ? '✓' : '🎁', titre: statut === 'déjà utilisée' ? 'Offre déjà utilisée' : 'Offre déjà activée !', message: `Cette offre est <strong>${statut}</strong> sur votre compte.`, lien: 'client-account.html', lienTexte: 'Voir mes offres →' });
        return;
      }

      // Créer l'activation
      const { error } = await sb.from('client_offers').insert([{
        client_id: client.id,
        offer_id:  offreId,
        offer_year: annee,
        used: false,
        activated_at: new Date().toISOString(),
      }]);

      if (error) throw error;

      document.getElementById('zn-offres-modal')?.classList.add('hidden');

      const offre = OFFRES.find(o => o.id === offreId);
      const nom = offre ? offre.titre : 'l\'offre';

      // Afficher confirmation sans redirection forcée
      setTimeout(() => {
        // Créer une notification toast au lieu d'un alert + redirect
        const toast = document.createElement('div');
        toast.style.cssText = [
          'position:fixed','bottom:100px','right:28px',
          'background:linear-gradient(135deg,#10b981,#059669)',
          'color:#fff','padding:16px 24px','border-radius:16px',
          'font-family:Inter,sans-serif','font-size:14px','font-weight:600',
          'box-shadow:0 8px 32px rgba(16,185,129,0.4)',
          'z-index:99999','max-width:320px','line-height:1.5',
          'animation:zn-toast-in .3s cubic-bezier(.4,0,.2,1)',
          'display:flex','align-items:flex-start','gap:12px',
        ].join(';');
        toast.innerHTML = `
          <span style="font-size:24px;flex-shrink:0;">🎉</span>
          <div>
            <div style="font-size:15px;font-weight:800;margin-bottom:4px;">Offre activée !</div>
            <div style="font-size:13px;opacity:.9;">"${nom}" est sur votre compte.</div>
            <a href="client-account.html" style="display:inline-block;margin-top:10px;padding:7px 16px;background:rgba(255,255,255,0.2);border-radius:8px;color:#fff;font-weight:700;text-decoration:none;font-size:13px;">
              Voir mes offres →
            </a>
          </div>
        `;
        // Ajouter l'animation
        const styleEl = document.createElement('style');
        styleEl.textContent = '@keyframes zn-toast-in{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:none}}';
        document.head.appendChild(styleEl);
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity .4s'; setTimeout(()=>toast.remove(),400); }, 6000);
      }, 200);

    } catch(e) {
      console.error('❌ Activation offre:', e);
      znModal({ icon: '❌', titre: 'Erreur', message: 'Une erreur est survenue lors de l\'activation. Réessayez.' });
    }
  };

  window.znDemanderCadeau = function () {
    const client = getClientConnecte();
    if (!client || !client.email) {
      znModal({ icon: '🔐', titre: 'Connexion requise', message: 'Connectez-vous pour recevoir votre chèque cadeau.', lien: 'client-account.html', lienTexte: 'Se connecter →' });
      return;
    }
    // Envoyer une notification dans Supabase pour que l'admin le voit
    const sb = window.supabase;
    if (sb) {
      sb.from('contacts').insert([{
        name: client.name || 'Client',
        email: client.email,
        message: '🎄 Demande chèque cadeau Noël 100€ — Client fidèle ' + new Date().getFullYear(),
      }]).then(() => {
        document.getElementById('zn-offres-modal')?.classList.add('hidden');
        setTimeout(() => {
          znModal({ icon: '🎄', titre: 'Cadeau en route !', message: 'Votre demande a bien été enregistrée.<br>Vous recevrez votre <strong>chèque cadeau 100 €</strong> par email sous 48h.<br><br>Joyeux Noël ! 🎄', cta: 'Parfait !' });
        }, 300);
      });
    }
  };

  // ════════════════════════════════════════
  // NAVIGATION — lien "Offres" dans le menu
  // ════════════════════════════════════════

  function ajouterLienMenu() {
    const offre = getOffreDuMois();
    if (!offre) return; // Pas d'offre = pas de lien dans le menu

    const nav = document.querySelector('.admin-header nav, header nav, .nav-links, .site-header nav');
    if (!nav) return;
    if (document.getElementById('zn-nav-offres')) return;

    const lien = document.createElement('a');
    lien.id = 'zn-nav-offres';
    lien.href = '#';
    lien.textContent = offre.emoji + ' Offre';
    lien.style.cssText = `
      padding: 8px 18px;
      background: ${offre.gradient};
      border-radius: 20px;
      color: #fff !important;
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      animation: zn-pulse-badge 2s ease-in-out infinite;
      white-space: nowrap;
    `;
    lien.addEventListener('click', (e) => { e.preventDefault(); ouvrirPageOffres(); });
    nav.appendChild(lien);
  }

  // ════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════

  function init() {
    injectCSS();
    // Sur services.html — ne pas décaler le body (modaux fixed)
    if (window.location.pathname.includes('services')) {
      document.body.classList.add('no-banner-padding');
    }
    const offre = getOffreDuMois();
    if (offre) creerBanniere(offre);
    ajouterLienMenu();
    patcherChatbot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();