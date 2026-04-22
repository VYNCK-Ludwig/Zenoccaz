// Configuration Supabase
    const SUPABASE_URL = 'https://zxnnzpzujmjzhnfqndle.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4bm56cHp1am1qemhuZnFuZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNjc5NzQsImV4cCI6MjA3Nzg0Mzk3NH0.rHvMKPDV_3H_vpt-9HUORANLrqQ_Yvq_y1GD2RGD8_k';
    let supabaseClient = null;

    try {
      const { createClient } = window.supabase || supabase;
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase initialisé');
    } catch (e) {
      console.error('❌ Erreur Supabase:', e);
    }

    // Au chargement de la page
    window.addEventListener('DOMContentLoaded', async function() {
      await loadClientData();
    });

    // Vérification authentification
    function checkAuth() {
      let raw = localStorage.getItem('clientData');

      // Cloudflare encode parfois les emails — on nettoie
      if (raw) {
        raw = raw.replace(/\[email protected\]/g, '')
                 .replace(/\[email protected\]/g, '');
      }

      if (!raw) {
        document.getElementById('login-prompt').style.display = 'block';
        document.getElementById('account-content').style.display = 'none';
        return null;
      }

      let client;
      try {
        client = JSON.parse(raw);
      } catch(e) {
        // JSON corrompu — effacer et redemander connexion
        localStorage.removeItem('clientData');
        document.getElementById('login-prompt').style.display = 'block';
        document.getElementById('account-content').style.display = 'none';
        return null;
      }

      if (!client || !client.id) {
        document.getElementById('login-prompt').style.display = 'block';
        document.getElementById('account-content').style.display = 'none';
        return null;
      }

      document.getElementById('login-prompt').style.display = 'none';
      document.getElementById('account-content').style.display = 'flex';
      // Masquer le bouton "Se connecter" du header
      const btnH = document.getElementById('btn-open-login');
      if (btnH) btnH.style.display = 'none';
      document.getElementById('client-name').textContent  = client.name || 'Client';
      document.getElementById('client-email').textContent = client.email || '';
      // Vue d'ensemble
      const overviewName = document.getElementById('overview-name');
      if (overviewName) overviewName.textContent = (client.name || 'Client').split(' ')[0];
      // Init sidebar tabs
      initDashboardTabs();
      // Bouton login-2 (login screen) pointe aussi sur openLoginModal
      const btn2 = document.getElementById('btn-open-login-2');
      if (btn2) btn2.addEventListener('click', () => window.openLoginModal());

      return client;
    }

    // Chargement des données
    async function loadClientData() {
      const client = checkAuth();
      if (!client) return;

      await Promise.all([
        loadParrainageData(client),
        loadConversations(client.id),
        loadReprises(client.email),
        loadZenScan(client.email),
        loadReviews(client),
        loadOffresClient(client),
        loadFideliteCarte(client),
        loadVipStatus(client),
      ]);
    }


    // ═══════════════════════════════════════════════════════
    // ★ CARTE DE FIDÉLITÉ
    // ═══════════════════════════════════════════════════════

    async function loadFideliteCarte(client) {
      const container = document.getElementById('fidelite-carte-section');
      if (!container) return;
      try {
        const { data: carte, error } = await supabaseClient
          .from('fidelite_carte')
          .select('*')
          .eq('client_id', client.id)
          .single();

        if (error || !carte) {
          container.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
              <div style="font-size:48px;margin-bottom:16px;">🎁</div>
              <div style="font-size:17px;font-weight:700;color:var(--text);margin-bottom:8px;">Votre carte fidélité est vide pour l'instant</div>
              <div style="font-size:14px;color:var(--muted);margin-bottom:24px;line-height:1.6;">Elle s'activera après votre premier service.<br>Découvrez les avantages qui vous attendent.</div>
              <a href="fidelite.html" style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-weight:800;border-radius:12px;text-decoration:none;font-size:14px;">⭐ Voir le programme fidélité</a>
            </div>`;
          return;
        }

        // Avantages débloqués
        const avantages = [];
        if (carte.vidange_offerte)       avantages.push({ emoji:'🛢️', label:'Vidange offerte',                  active:!carte.vidange_offerte_used,         used:carte.vidange_offerte_used });
        if (carte.service_apres_distrib) avantages.push({ emoji:'🔧', label:'Service offert (après distribution)', active:!carte.service_apres_distrib_used,   used:carte.service_apres_distrib_used });
        if (carte.remise_15_pneus)       avantages.push({ emoji:'🛞', label:'−15 % sur la prochaine prestation', active:!carte.remise_15_pneus_used,          used:carte.remise_15_pneus_used });
        if (carte.zenscan_offert)        avantages.push({ emoji:'🔍', label:'ZenScan offert',                    active:!carte.zenscan_offert_used,           used:carte.zenscan_offert_used });

        const avantagesHtml = avantages.length > 0
          ? avantages.map(a => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-radius:12px;gap:12px;background:${a.active ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)'};border:1px solid ${a.active ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'};${a.used ? 'opacity:0.5;' : ''}">
              <div style="display:flex;align-items:center;gap:12px;"><span style="font-size:22px;">${a.emoji}</span><span style="font-size:15px;font-weight:600;color:${a.active ? 'var(--text)' : 'var(--muted)'};">${a.label}</span></div>
              ${a.active ? '<span style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;background:rgba(16,185,129,0.12);color:#10b981;border:1px solid rgba(16,185,129,0.3);">● Disponible</span>'
                         : '<span style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;background:rgba(107,114,128,0.1);color:#6b7280;border:1px solid rgba(107,114,128,0.2);">✓ Utilisé</span>'}
            </div>`).join('')
          : '<div style="text-align:center;padding:24px;color:var(--muted);font-size:14px;">Aucun avantage débloqué pour l&#39;instant. Continuez à faire appel à nos services !</div>';

        const total = (carte.nb_vehicules_achetes||0)+(carte.nb_vidanges||0)+(carte.nb_distributions||0)+(carte.nb_montages_pneus||0)+(carte.nb_zenscan||0);
        // Mettre à jour la quick stat fidélité
        const qsFid = document.getElementById('qs-fidelite-val');
        if (qsFid) qsFid.textContent = total > 0 ? total + ' service' + (total > 1 ? 's' : '') : 'Active';
        const compteurs = [
          { label:'Véhicules achetés',    val:carte.nb_vehicules_achetes,   emoji:'🚗' },
          { label:'Vidanges réalisées',   val:carte.nb_vidanges,            emoji:'🛢️' },
          { label:'Distributions faites', val:carte.nb_distributions,       emoji:'⚙️' },
          { label:'Montages pneus',       val:carte.nb_montages_pneus,      emoji:'🛞' },
          { label:'ZenScan effectués',    val:carte.nb_zenscan,             emoji:'🔍' },
          { label:'Parrainages validés',  val:carte.nb_parrainages_valides, emoji:'👥' },
        ].filter(c => c.val > 0);

        const compteursHtml = compteurs.length > 0
          ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:24px;">${compteurs.map(c => `<div style="padding:14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;text-align:center;"><div style="font-size:20px;margin-bottom:6px;">${c.emoji}</div><div style="font-size:22px;font-weight:900;color:var(--text);font-family:'Orbitron',sans-serif;">${c.val}</div><div style="font-size:11px;color:var(--muted);margin-top:3px;">${c.label}</div></div>`).join('')}</div>`
          : '';

        container.innerHTML = `
          <div style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:16px;">

            <!-- Colonne gauche : carte + compteurs -->
            <div style="display:flex;flex-direction:column;gap:14px;">

              <!-- Carte header -->
              <div style="position:relative;background:linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.02));
                border:1px solid rgba(245,158,11,0.2);border-radius:18px;padding:26px;overflow:hidden;">
                <div style="position:absolute;top:0;left:0;right:0;height:2px;
                  background:linear-gradient(90deg,#f59e0b,#fbbf24,#f97316);"></div>
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                  <div>
                    <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#f59e0b;margin-bottom:6px;">Carte de fidélité</div>
                    <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--text);">${client.name || 'Client ZENOCCAZ'}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Services réalisés</div>
                    <div style="font-family:'JetBrains Mono',monospace;font-size:44px;font-weight:700;color:#f59e0b;line-height:1;
                      text-shadow:0 0 20px rgba(245,158,11,0.35);">${total}</div>
                  </div>
                </div>
              </div>

              <!-- Compteurs services -->
              ${compteurs.length > 0 ? `
              <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:20px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Services réalisés</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">
                  ${compteurs.map(c => `
                    <div style="padding:16px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);
                      border-radius:12px;text-align:center;">
                      <div style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;color:var(--text);margin-bottom:6px;">${c.val}</div>
                      <div style="font-size:11px;color:var(--muted);font-weight:500;">${c.label}</div>
                    </div>`).join('')}
                </div>
              </div>` : ''}

              <!-- Note admin -->
              ${carte.notes_admin ? `
              <div style="padding:16px 20px;background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.12);
                border-radius:14px;font-size:13px;color:#94a3b8;line-height:1.6;">
                <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">Note ZENOCCAZ</div>
                ${carte.notes_admin}
              </div>` : ''}
            </div>

            <!-- Colonne droite : avantages -->
            <div style="display:flex;flex-direction:column;gap:14px;">
              <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:22px;flex:1;">
                <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Vos avantages fidélité</div>
                <div style="display:flex;flex-direction:column;gap:10px;">${avantagesHtml}</div>
              </div>

              <!-- Lien programme -->
              <div style="padding:20px;background:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.1);
                border-radius:14px;text-align:center;">
                <div style="font-size:13px;color:var(--muted2);margin-bottom:14px;line-height:1.5;">
                  Continuez à faire appel à nos services pour débloquer encore plus d'avantages
                </div>
                <a href="fidelite.html" style="display:inline-flex;align-items:center;gap:6px;padding:10px 22px;
                  background:linear-gradient(135deg,#10b981,#059669);border-radius:10px;
                  color:#fff;font-size:13px;font-weight:700;text-decoration:none;
                  box-shadow:0 4px 16px rgba(16,185,129,0.2);">
                  Voir tous les avantages →
                </a>
              </div>
            </div>
          </div>
          </div>
          <div style="text-align:center;padding:12px 0;">
            <a href="fidelite.html" style="font-size:13px;color:#f59e0b;text-decoration:none;font-weight:600;">⭐ Voir toutes les offres du programme fidélité →</a>
          </div>`;

      } catch(e) { console.error('❌ loadFideliteCarte:', e); }
    }

    // ═══════════════════════════════════════════════════════
    // 👑 STATUT VIP
    // ═══════════════════════════════════════════════════════

    async function loadVipStatus(client) {
      try {
        const { data, error } = await supabaseClient
          .from('clients')
          .select('vip_status, vip_validated_at, vip_note, nb_apporteurs')
          .eq('id', client.id)
          .single();

        if (error || !data) return;

        // Badge VIP dans le header
        const nameEl = document.getElementById('client-name');
        if (data.vip_status && nameEl && !document.getElementById('vip-badge-header')) {
          const badge = document.createElement('span');
          badge.id = 'vip-badge-header';
          badge.textContent = '👑 VIP';
          badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;margin-left:12px;padding:3px 12px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-size:11px;font-weight:900;letter-spacing:1px;text-transform:uppercase;border-radius:20px;vertical-align:middle;box-shadow:0 2px 12px rgba(245,158,11,0.4);';
          nameEl.insertAdjacentElement('afterend', badge);
        }

        // Section VIP
        const vipSection = document.getElementById('vip-section');
        if (!vipSection) return;

        if (data.vip_status) {
          const since = data.vip_validated_at
            ? new Date(data.vip_validated_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })
            : null;
          const nb = data.nb_apporteurs || 0;
          const palierLabel = nb === 0 ? '' : nb === 1 ? '🥉 Ambassadeur' : nb === 2 ? '🥈 Ambassadeur confirmé' : nb === 3 ? '🥇 Ambassadeur Gold' : '🏆 Ambassadeur Elite';
          // Activer le mode VIP gold sur toute l'interface
          if (typeof activateVipMode === 'function') activateVipMode(nb, palierLabel);
          const palierRecompense = nb === 1 ? '250 € × 1 = 250 € cash + badge Ambassadeur' : nb === 2 ? '250 € × 2 = 500 € cash + ZenScan offert' : nb === 3 ? '250 € × 3 = 750 € cash + ZenScan + montage 4 pneus offerts' : nb >= 4 ? '250 € × ' + nb + ' = ' + (nb * 250) + ' € cash + tarif préférentiel à vie' : '';
          const palierProchain = nb === 0 ? '→ 1er acheteur : 250 € × 1 = 250 € cash + badge Ambassadeur' : nb === 1 ? '→ 2e acheteur : 250 € × 2 = 500 € cash + ZenScan offert' : nb === 2 ? '→ 3e acheteur : 250 € × 3 = 750 € cash + ZenScan + montage 4 pneus' : nb === 3 ? '→ 4e acheteur : 250 € × 4 = 1 000 € cash + tarif préférentiel à vie' : '→ Vous êtes au palier maximum 🏆';

          // Avantages ambassadeur débloqués selon palier
          const avAmb = [
            { icon:'🔍', label:'ZenScan offert',           unlocked: nb >= 2, desc:'Débloqué au 2e acheteur' },
            { icon:'🛞', label:'ZenScan + montage 4 pneus offerts',   unlocked: nb >= 3, desc:'ZenScan complet + pose/équilibrage (pneus non fournis)' },
            { icon:'🤝', label:'Tarif préférentiel à vie', unlocked: nb >= 4, desc:'Débloqué au 4e acheteur' },
          ];
          const avAmbHtml = avAmb.map(a => `
            <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;
              background:${a.unlocked ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.01)'};
              border:1px solid ${a.unlocked ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)'};
              opacity:${a.unlocked ? '1' : '0.35'};">
              <span style="font-size:22px;">${a.icon}</span>
              <div style="flex:1;">
                <div style="font-size:15px;font-weight:600;color:${a.unlocked ? '#f1f5f9' : 'var(--muted)'};">${a.label}</div>
                <div style="font-size:13px;color:var(--muted);margin-top:2px;">${a.desc}</div>
              </div>
              <span style="font-size:18px;">${a.unlocked ? '✅' : '🔒'}</span>
            </div>`).join('');

          // Paliers visuels
          const paliersClientHtml = [
            { nb:1, color:'#a855f7', icon:'🥉', label:'1er acheteur', gain:'250 € pour ce 1er acheteur + badge Ambassadeur' },
            { nb:2, color:'#3b82f6', icon:'🥈', label:'2e acheteur',  gain:'250 € pour ce 2e acheteur (500 € cumulés) + ZenScan offert' },
            { nb:3, color:'#10b981', icon:'🥇', label:'3e acheteur',  gain:'250 € × 3 = 750 € + ZenScan + montage 4 pneus' },
            { nb:4, color:'#f59e0b', icon:'🏆', label:'4e+ acheteur', gain:'250 € × 4+ = 1 000 € et + + tarif préférentiel à vie' },
          ].map(p => {
            const done = nb >= p.nb;
            const current = nb === p.nb || (p.nb === 4 && nb >= 4);
            return `<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:12px;
              background:${done ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)'};
              border:1px solid ${done ? p.color+'55' : 'rgba(255,255,255,0.05)'};
              opacity:${done ? '1' : '0.4'};">
              <span style="font-size:22px;">${p.icon}</span>
              <div style="flex:1;">
                <div style="font-size:15px;font-weight:700;color:${done ? p.color : 'var(--muted)'};">${p.label}</div>
                <div style="font-size:13px;color:var(--muted);margin-top:2px;">${p.gain}</div>
              </div>
              ${done ? `<span style="font-size:15px;">✅</span>` : `<span style="font-size:12px;color:var(--muted);">🔒</span>`}
            </div>`;
          }).join('');

          vipSection.innerHTML = `
            <div style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:16px;">

              <!-- Colonne gauche : header + gains + paliers -->
              <div style="display:flex;flex-direction:column;gap:12px;">

                <!-- Header ambassadeur -->
                <div style="position:relative;background:linear-gradient(135deg,rgba(245,158,11,0.1),rgba(245,158,11,0.03));
                  border:1px solid rgba(245,158,11,0.25);border-radius:18px;padding:24px;overflow:hidden;">
                  <div style="position:absolute;top:0;left:0;right:0;height:2px;
                    background:linear-gradient(90deg,transparent,#f59e0b,transparent);"></div>
                  <div style="display:flex;align-items:center;gap:14px;margin-bottom:${palierRecompense ? '16px' : '0'};">
                    <div style="width:52px;height:52px;border-radius:50%;background:rgba(245,158,11,0.12);
                      border:2px solid rgba(245,158,11,0.4);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2 20h20"/><path d="M5 20l2-9 5 4 5-4 2 9"/>
                        <circle cx="12" cy="3" r="1.5" fill="#f59e0b" stroke="none"/>
                        <circle cx="4" cy="10" r="1.5" fill="#f59e0b" stroke="none"/>
                        <circle cx="20" cy="10" r="1.5" fill="#f59e0b" stroke="none"/>
                      </svg>
                    </div>
                    <div style="flex:1;">
                      <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#f59e0b;letter-spacing:-0.3px;">
                        Ambassadeur ZENOCCAZ
                      </div>
                      ${palierLabel ? `<div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.75);margin-top:3px;">${palierLabel}</div>` : ''}
                      ${since ? `<div style="font-size:12px;color:var(--muted);margin-top:2px;">Depuis le ${since}</div>` : ''}
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Acheteurs amenés</div>
                      <div style="font-family:'JetBrains Mono',monospace;font-size:40px;font-weight:700;color:#f59e0b;line-height:1;
                        text-shadow:0 0 24px rgba(245,158,11,0.4);">${nb}</div>
                    </div>
                  </div>
                  ${palierRecompense ? `
                    <div style="padding:12px 16px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.18);
                      border-radius:10px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.85);">
                      🎁 Dernier gain : ${palierRecompense}
                    </div>` : ''}
                </div>

                <!-- Prochain palier -->
                <div style="padding:16px 20px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);
                  border-radius:14px;font-size:13px;color:var(--muted2);">
                  <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">Prochain objectif</div>
                  ${palierProchain}
                </div>

                <!-- Progression paliers -->
                <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:18px;">
                  <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:12px;">Progression des paliers</div>
                  <div style="display:flex;flex-direction:column;gap:8px;">${paliersClientHtml}</div>
                </div>
              </div>

              <!-- Colonne droite : avantages débloqués + note -->
              <div style="display:flex;flex-direction:column;gap:12px;">

                <!-- Avantages débloqués -->
                <div style="background:rgba(245,158,11,0.03);border:1px solid rgba(245,158,11,0.12);border-radius:14px;padding:18px;flex:1;">
                  <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:12px;">Vos avantages ambassadeur</div>
                  <div style="display:flex;flex-direction:column;gap:8px;">${avAmbHtml}</div>
                </div>

                ${data.vip_note ? `
                <!-- Note personnalisée -->
                <div style="padding:16px 20px;background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.12);
                  border-radius:14px;font-size:13px;color:#94a3b8;line-height:1.6;">
                  <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">Message ZENOCCAZ</div>
                  ${data.vip_note}
                </div>` : ''}

                <!-- CTA -->
                <div style="padding:16px 20px;background:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.1);
                  border-radius:14px;text-align:center;">
                  <div style="font-size:13px;color:var(--muted2);margin-bottom:12px;line-height:1.5;">
                    Parrainez encore plus de clients et débloquez de nouveaux avantages exclusifs
                  </div>
                  <a href="fidelite.html" style="display:inline-flex;align-items:center;gap:6px;padding:10px 20px;
                    background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:10px;
                    color:#000;font-size:13px;font-weight:700;text-decoration:none;
                    box-shadow:0 4px 16px rgba(245,158,11,0.25);">
                    Voir le programme complet →
                  </a>
                </div>

              </div>
            </div>`;
        } else {
          vipSection.innerHTML = `
            <div style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:16px;">
              <div style="background:rgba(245,158,11,0.04);border:1px solid rgba(245,158,11,0.1);border-radius:16px;padding:28px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:16px;">Programme Ambassadeur</div>
                <div style="font-size:22px;font-weight:800;color:var(--text);font-family:'Syne',sans-serif;margin-bottom:8px;">Devenez Ambassadeur</div>
                <div style="font-size:14px;color:var(--muted2);line-height:1.7;margin-bottom:20px;">Amenez un acheteur chez ZENOCCAZ et touchez <strong style="color:#f59e0b;">250 € cash</strong>. Plus vous en amenez, plus vos récompenses augmentent.</div>
                <a href="fidelite.html" style="display:inline-flex;align-items:center;gap:6px;padding:11px 22px;
                  background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:10px;
                  color:#000;font-size:13px;font-weight:700;text-decoration:none;">
                  Voir le programme →
                </a>
              </div>
              <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:24px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Les paliers de récompense</div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(168,85,247,0.06);border:1px solid rgba(168,85,247,0.15);border-radius:10px;">
                    <span style="font-size:16px;">🥉</span>
                    <div><div style="font-size:12px;font-weight:700;color:#a855f7;">1er acheteur</div><div style="font-size:11px;color:var(--muted);">250 € × 1 = 250 € + badge Ambassadeur</div></div>
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.15);border-radius:10px;">
                    <span style="font-size:16px;">🥈</span>
                    <div><div style="font-size:12px;font-weight:700;color:#3b82f6;">2e acheteur</div><div style="font-size:11px;color:var(--muted);">250 € × 2 = 500 € + ZenScan offert</div></div>
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:10px;">
                    <span style="font-size:16px;">🥇</span>
                    <div><div style="font-size:12px;font-weight:700;color:#10b981;">3e acheteur</div><div style="font-size:11px;color:var(--muted);">250 € × 3 = 750 € + ZenScan + montage 4 pneus</div></div>
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:10px;">
                    <span style="font-size:16px;">🏆</span>
                    <div><div style="font-size:12px;font-weight:700;color:#f59e0b;">4e+ acheteur</div><div style="font-size:11px;color:var(--muted);">250 € × 4+ = 1 000 €+ + tarif préférentiel à vie</div></div>
                  </div>
                </div>
              </div>
            </div>`;
        }
        vipSection.style.display = 'block';

      } catch(e) { console.error('❌ loadVipStatus:', e); }
    }

    // ═══════════════════════════════════════════════════════
    // SECTION PARRAINAGE
    // ═══════════════════════════════════════════════════════

    async function loadParrainageData(client) {
      try {
        // Charger le client complet avec son code de parrainage
        const { data: clientData, error: clientError } = await supabaseClient
          .from('clients')
          .select('code_parrainage')
          .eq('id', client.id)
          .single();

        if (clientError) throw clientError;

        // Afficher le code de parrainage
        const code = clientData.code_parrainage || 'ZEN' + String(client.id).padStart(5, '0');
        document.getElementById('parrainage-code').textContent = code;
        // Quick stat code parrainage
        const qsCode = document.getElementById('qs-code-val');
        if (qsCode) qsCode.textContent = code;

        // Charger les stats de parrainage
        const { data: parrainages, error: parrainagesError } = await supabaseClient
          .from('parrainages')
          .select('*')
          .eq('parrain_email', client.email);

        if (parrainagesError) throw parrainagesError;

        const total = parrainages?.length || 0;
        const conversions = parrainages?.filter(p => p.status === 'fini').length || 0;
        const rewards = parrainages?.reduce((sum, p) => sum + (parseFloat(p.commission) || 0), 0) || 0;

        document.getElementById('stat-filleuls').textContent = total;
        document.getElementById('stat-conversions').textContent = conversions;
        document.getElementById('stat-rewards').textContent = rewards.toFixed(0) + '€';

        // Afficher la liste des filleuls
        if (total > 0) {
          const container = document.getElementById('filleuls-container');
          container.innerHTML = parrainages.map(p => {
            const date = new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
            const isCompleted = p.status === 'fini';
            
            return `
              <div class="filleul-card">
                <div class="filleul-info">
                  <h4>👤 ${p.filleul || 'Filleul anonyme'}</h4>
                  <div class="filleul-date">📅 Parrainé le ${date}</div>
                </div>
                <div class="reward-badge ${isCompleted ? '' : 'pending'}">
                  ${isCompleted ? '✅' : '⏳'}
                  ${isCompleted ? p.commission + '€ gagnés' : 'En attente'}
                </div>
              </div>
            `;
          }).join('');
        }

      } catch (e) {
        console.error('❌ Erreur parrainage:', e);
      }
    }

    // Copier le code
    window.copyCode = async function() {
      const code = document.getElementById('parrainage-code').textContent;
      try {
        await navigator.clipboard.writeText(code);
        alert('✅ Code copié : ' + code);
      } catch (e) {
        // Fallback pour navigateurs ne supportant pas clipboard API
        const input = document.createElement('input');
        input.value = code;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert('✅ Code copié : ' + code);
      }
    };

    // Partager le code
    window.shareCode = async function() {
      const code = document.getElementById('parrainage-code').textContent;
      const text = `Rejoignez ZENOCCAZ avec mon code parrain ${code} et bénéficiez d'avantages exclusifs ! 🚗✨`;
      const url = 'https://zen-occaz.com';

      if (navigator.share) {
        try {
          await navigator.share({ title: 'ZENOCCAZ - Code Parrainage', text: text, url: url });
        } catch (e) {
          console.log('Partage annulé');
        }
      } else {
        // Fallback: copier le texte
        try {
          await navigator.clipboard.writeText(text + '\n' + url);
          alert('✅ Message de parrainage copié !');
        } catch (e) {
          alert('📋 Partagez ce message:\n\n' + text + '\n' + url);
        }
      }
    };

    // ═══════════════════════════════════════════════════════
    // CONVERSATIONS IA
    // ═══════════════════════════════════════════════════════

    async function loadConversations(clientId) {
      const div = document.getElementById('conversations-list');
      try {
        const { data, error } = await supabaseClient
          .from('conversations')
          .select('*')
          .eq('client_id', clientId)
          .order('updated_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        if (!data || data.length === 0) {
          div.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">💬</div>
              <p style="font-size:16px;margin:0 0 8px;">Aucune conversation</p>
              <p style="font-size:14px;margin:0;">Vos conversations avec l'assistant IA apparaîtront ici.</p>
            </div>`;
          return;
        }

        div.innerHTML = data.map(conv => {
          const messages = conv.messages || [];
          const date = new Date(conv.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
          const heure = new Date(conv.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const lastMsg = messages.slice(-1)[0];
          const preview = lastMsg ? lastMsg.content.substring(0, 100) + '...' : '';
          const msgCount = messages.length;

          const msgsHtml = messages.map(m => `
            <div class="conv-msg ${m.role === 'user' ? 'user' : 'bot'}">
              <div class="conv-msg-label">${m.role === 'user' ? '👤 Vous' : '🤖 Assistant'}</div>
              ${m.content.substring(0, 300)}${m.content.length > 300 ? '...' : ''}
            </div>
          `).join('');

          return `
            <div class="conv-card" onclick="toggleConv('conv-${conv.id}')">
              <div class="conv-subject">💬 ${conv.sujet || 'Discussion'}</div>
              <div class="conv-meta">
                <span>📅 ${date} à ${heure}</span>
                <span>💬 ${msgCount} message${msgCount > 1 ? 's' : ''}</span>
              </div>
              <div class="conv-preview">${preview}</div>
              <div id="conv-${conv.id}" class="conv-messages">${msgsHtml}</div>
            </div>
          `;
        }).join('');

      } catch (e) {
        console.error('❌ Conversations:', e);
        div.innerHTML = `<div class="empty-state"><p style="color:#ef4444;">Erreur de chargement</p></div>`;
      }
    }

    function toggleConv(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = el.style.display === 'block' ? 'none' : 'block';
    }

    // ═══════════════════════════════════════════════════════
    // REPRISES
    // ═══════════════════════════════════════════════════════

    async function loadReprises(email) {
      const div = document.getElementById('reprises-list');
      try {
        const { data, error } = await supabaseClient
          .from('reprise_estimations')
          .select('*')
          .eq('email', email)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Mettre à jour quick stat reprises
        const qsRep = document.getElementById('qs-reprises-val');
        if (qsRep) qsRep.textContent = data ? data.length : 0;

        if (!data || data.length === 0) {
          div.innerHTML = `
            <div class="ca-empty">
              <div class="ca-empty-icon">🚗</div>
              <p>Aucune demande de reprise</p>
              <span>Vous n'avez pas encore soumis de véhicule à l'estimation.</span>
              <a href="services.html" class="ca-btn-primary" style="margin-top:20px;display:inline-block;text-decoration:none;">Faire une demande →</a>
            </div>`;
          return;
        }

        div.innerHTML = data.map(c => {
          const date = new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
          const isAccomp = (c.notes||'').includes('EXPERTISE ACHAT');
          const icon  = isAccomp ? '🔍' : '🚗';
          const titre = isAccomp ? 'Expertise Achat' : 'Demande de Reprise';
          return `
            <div class="demand-card">
              <div class="demand-header">
                <div>
                  <div class="demand-title">${icon} ${titre}</div>
                  <div class="demand-date">📅 Le ${date}</div>
                </div>
                <span class="demand-status status-pending">⏳ En attente</span>
              </div>
              <div class="demand-details">
                <div class="detail-item"><span class="detail-label">Téléphone</span><span class="detail-value">${c.phone || '—'}</span></div>
                ${c.notes ? `<div class="detail-item" style="grid-column:1/-1"><span class="detail-label">Détails</span><span class="detail-value" style="font-size:13px;">${c.notes.replace(/^[^—]*—\s*/,'')}</span></div>` : ''}
              </div>
            </div>`;
        }).join('');

      } catch (e) {
        console.error('❌ Reprises:', e);
        div.innerHTML = `<div class="empty-state"><p style="color:#ef4444;">Erreur de chargement</p></div>`;
      }
    }

    // ═══════════════════════════════════════════════════════
    // ZENSCAN
    // ═══════════════════════════════════════════════════════

    async function loadZenScan(email) {
      const div = document.getElementById('zenscan-list');
      try {
        const client = JSON.parse(localStorage.getItem('clientData') || '{}');
        const ids = [...new Set([
          client.id
        ].filter(Boolean))];

        if (!ids.length) {
          div.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><p style="font-size:16px;margin:0 0 8px;">Aucune demande ZenScan</p><p style="font-size:14px;margin:0 0 24px;">Le diagnostic à distance n'a jamais été aussi simple.</p><a href="services.html" class="btn primary" style="display:inline-block;text-decoration:none;padding:12px 32px;">Demander un ZenScan</a></div>`;
          return;
        }

        const { data, error } = await supabaseClient
          .from('zenscan_requests')
          .select('*')
          .in('contact_id', ids)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
          div.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><p style="font-size:16px;margin:0 0 8px;">Aucune demande ZenScan</p><p style="font-size:14px;margin:0 0 24px;">Le diagnostic à distance n'a jamais été aussi simple.</p><a href="services.html" class="btn primary" style="display:inline-block;text-decoration:none;padding:12px 32px;">Demander un ZenScan</a></div>`;
          return;
        }

        div.innerHTML = data.map(z => {
          const date = new Date(z.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
          const services = Array.isArray(z.services) ? z.services.join(', ') : (z.services || '—');
          return `
            <div class="demand-card">
              <div class="demand-header">
                <div>
                  <div class="demand-title">🔍 Demande ZenScan</div>
                  <div class="demand-date">📅 Le ${date}</div>
                </div>
                <span class="demand-status status-pending">⏳ En attente</span>
              </div>
              <div class="demand-details">
                <div class="detail-item">
                  <span class="detail-label">Services</span>
                  <span class="detail-value" style="font-size:13px;">${services}</span>
                </div>
                ${z.dest ? `<div class="detail-item"><span class="detail-label">Destination</span><span class="detail-value">${z.dest}</span></div>` : ''}
                ${z.total ? `<div class="detail-item"><span class="detail-label">Total estimé</span><span class="detail-value" style="color:#10b981;font-weight:700;">${z.total}</span></div>` : ''}
              </div>
            </div>`;
        }).join('');

      } catch (e) {
        console.error('❌ ZenScan:', e);
        div.innerHTML = `<div class="empty-state"><p style="color:#ef4444;">Erreur de chargement</p></div>`;
      }
    }

    // ═══════════════════════════════════════════════════════
    // AVIS
    // ═══════════════════════════════════════════════════════

    async function loadReviews(client) {
      const div = document.getElementById('reviews-list');
      try {
        const { data, error } = await supabaseClient
          .from('reviews')
          .select('*')
          .eq('client_name', client.name)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
          div.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">⭐</div>
              <p style="font-size:16px;margin:0 0 8px;">Aucun avis publié</p>
              <p style="font-size:14px;margin:0 0 24px;">Partagez votre expérience avec la communauté.</p>
              <a href="index.html#avis" class="btn primary" style="display:inline-block;text-decoration:none;padding:12px 32px;">Laisser un avis</a>
            </div>`;
          return;
        }

        div.innerHTML = data.map(r => {
          const date = new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
          return `
            <div class="demand-card">
              <div class="demand-header">
                <div>
                  <div class="demand-title">${'⭐'.repeat(r.rating || 5)}</div>
                  <div class="demand-date">📅 Le ${date}</div>
                </div>
              </div>
              <div style="color:var(--text);margin-top:16px;line-height:1.6;font-size:15px;">${r.comment || ''}</div>
            </div>
          `;
        }).join('');

      } catch (e) {
        console.error('❌ Avis:', e);
        div.innerHTML = `<div class="empty-state"><p style="color:#ef4444;">Erreur de chargement</p></div>`;
      }
    }

    // ═══════════════════════════════════════════════════════
    // AUTHENTIFICATION
    // ═══════════════════════════════════════════════════════

    window.logout = function() {
      localStorage.removeItem('clientData');
      window.dispatchEvent(new CustomEvent('clientLogout'));
      window.location.href = 'index.html';
    };

    window.openLoginModal = function() {
      const m = document.getElementById('client-login-modal');
      if (!m) return;
      m.classList.remove('hidden');
      if (typeof window.switchClientTab === 'function') window.switchClientTab('login');
    };

    window.closeLoginModal = function() {
      const m = document.getElementById('client-login-modal');
      if (m) m.classList.add('hidden');
    };


    // ═══════════════════════════════════════════════════════
    // SECTION OFFRES SAISONNIÈRES
    // ═══════════════════════════════════════════════════════

    const OFFRES_DATA = {
      printemps: {
        id: 'printemps', emoji: '🌸', nom: 'Réveil de Printemps',
        saison: 'Offre Printemps', couleur: '#f472b6',
        gradient: 'linear-gradient(135deg,#f472b6,#fb923c)',
        services: ['Contrôle sortie d\'hiver complet','Scan OBD diagnostic électronique','−10 % sur les filtres habitacle','Vérification courroies & durites','Contrôle fuites moteur'],
      },
      ete: {
        id: 'ete', emoji: '☀️', nom: 'Prêt pour les Vacances',
        saison: 'Offre Été', couleur: '#f59e0b',
        gradient: 'linear-gradient(135deg,#f59e0b,#f97316)',
        services: ['Test batterie & alternateur','Contrôle refroidissement visuel','−10 % sur les LDR (ampoules)','Pack vacances sécurité complet','Contrôle pression & état pneus'],
      },
      noel: {
        id: 'noel', emoji: '🎄', nom: 'Cadeau Fidélité',
        saison: 'Offre Noël', couleur: '#10b981',
        gradient: 'linear-gradient(135deg,#10b981,#3b82f6)',
        services: ['Chèque cadeau 100 € sur n\'importe quel site','Livré par email personnalisé'],
      },
    };

    async function loadOffresClient(client) {
      const container = document.getElementById('offres-client-list');
      if (!container) return;
      try {
        const { data, error } = await supabaseClient
          .from('client_offers')
          .select('*')
          .eq('client_id', client.id)
          .order('activated_at', { ascending: false });

        if (error) throw error;
        // Mettre à jour quick stat offres
        const qsOff = document.getElementById('qs-offres-val');
        if (qsOff && data) qsOff.textContent = data.filter(o => !o.used).length;
        if (!data || data.length === 0) return;

        container.innerHTML = data.map(offer => {
          const o = OFFRES_DATA[offer.offer_id] || {};
          const date = new Date(offer.activated_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
          const used = offer.used;
          return `
            <div style="
              background:rgba(255,255,255,0.03);
              border:1px solid ${used ? 'rgba(107,114,128,0.2)' : (o.couleur || '#10b981') + '44'};
              border-radius:16px; padding:22px; margin-bottom:16px;
              position:relative; overflow:hidden;
              ${used ? 'opacity:0.6;' : ''}
            ">
              ${!used ? `<div style="position:absolute;top:0;left:0;right:0;height:2px;background:${o.gradient || 'var(--primary)'};"></div>` : ''}
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <span style="font-size:32px;">${o.emoji || '🎁'}</span>
                  <div>
                    <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${o.couleur || '#10b981'};margin-bottom:3px;">${o.saison || offer.offer_id}</div>
                    <div style="font-size:17px;font-weight:800;color:var(--text);">${o.nom || 'Offre activée'}</div>
                    <div style="font-size:12px;color:var(--muted);margin-top:2px;">Activée le ${date} · Année ${offer.offer_year}</div>
                  </div>
                </div>
                <span style="padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;${used ? 'background:rgba(107,114,128,0.15);color:#9ca3af;border:1px solid rgba(107,114,128,0.3);' : 'background:rgba(16,185,129,0.12);color:#10b981;border:1px solid rgba(16,185,129,0.3);'}">${used ? '✓ Utilisée' : '● Active'}</span>
              </div>
              ${o.services ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">${o.services.map(s => `<span style="padding:5px 12px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);">${s}</span>`).join('')}</div>` : ''}
              
              ${!used && offer.offer_id === 'noel' ? `<button onclick="demanderCadeauNoel(${offer.id})" style="margin-top:16px;padding:10px 20px;border-radius:10px;background:${o.gradient};border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">🎁 Recevoir mon chèque cadeau</button>` : ''}
            </div>`;
        }).join('');

      } catch(e) { console.error('❌ loadOffresClient:', e); }
    }

    window.marquerOffreUtilisee = async function(offerId) {
      if (!confirm('Confirmer que vous avez utilisé cette offre ?')) return;
      try {
        await supabaseClient.from('client_offers').update({ used: true }).eq('id', offerId);
        const client = JSON.parse(localStorage.getItem('clientData'));
        await loadOffresClient(client);
      } catch(e) { alert('❌ Erreur: ' + e.message); }
    };

    window.demanderCadeauNoel = async function(offerId) {
      const client = JSON.parse(localStorage.getItem('clientData'));
      if (!client) return;
      try {
        // (insert contacts supprimé — table contacts retirée)
        await supabaseClient.from('client_offers').update({ used: true }).eq('id', offerId);
        await loadOffresClient(client);
        alert('🎁 Demande envoyée ! Vous recevrez votre chèque cadeau 100€ par email sous 48h.\nJoyeux Noël ! 🎄');
      } catch(e) { alert('❌ Erreur: ' + e.message); }
    };

    window.switchClientTab = function(tab) {
      const tl = document.getElementById('tab-login');
      const ts = document.getElementById('tab-signup');
      const fl = document.getElementById('client-login-form');
      const fs = document.getElementById('client-signup-form');

      if (tab === 'login') {
        tl.classList.add('primary');
        ts.classList.remove('primary');
        fl.style.display = 'flex';
        fs.style.display = 'none';
      } else {
        ts.classList.add('primary');
        tl.classList.remove('primary');
        fs.style.display = 'flex';
        fl.style.display = 'none';
      }
    };

    // Connexion
    document.getElementById('client-login-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = document.getElementById('login-client-email').value.trim();
      const password = document.getElementById('login-client-password').value;

      try {
        const { data, error } = await supabaseClient
          .from('clients')
          .select('*')
          .eq('email', email)
          .eq('password', password)
          .single();

        if (error || !data) {
          alert('❌ Email ou mot de passe incorrect');
          return;
        }

        const clientData = {
          id: data.id,
          email: data.email,
          name: data.name,
          connectedAt: new Date().toISOString()
        };
        localStorage.setItem('clientData', JSON.stringify(clientData));

        // Notifier le chatbot
        window.dispatchEvent(new CustomEvent('clientLogin', { detail: clientData }));

        closeLoginModal();
        checkAuth();
        loadClientData();

      } catch (e) {
        alert('❌ Erreur: ' + e.message);
      }
    });

    // Inscription
    document.getElementById('client-signup-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = document.getElementById('signup-client-name').value.trim();
      const email = document.getElementById('signup-client-email').value.trim();
      const password = document.getElementById('signup-client-password').value;
      const confirm = document.getElementById('signup-client-password-confirm').value;

      if (password !== confirm) {
        alert('❌ Les mots de passe ne correspondent pas');
        return;
      }

      if (password.length < 6) {
        alert('❌ Le mot de passe doit contenir au moins 6 caractères');
        return;
      }

      try {
        // Vérifier si l'email existe
        const { data: existing } = await supabaseClient
          .from('clients')
          .select('email')
          .eq('email', email)
          .single();

        if (existing) {
          alert('❌ Cet email est déjà utilisé');
          switchClientTab('login');
          return;
        }

        // Générer un code de parrainage unique
        const newId = Date.now();
        const prenom = name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8);
        const chiffres = String(Math.floor(1000 + Math.random() * 9000));
        const codeParrainage = prenom + chiffres;

        // Créer le compte
        const { error } = await supabaseClient
          .from('clients')
          .insert([{
            id: newId,
            name: name,
            email: email,
            password: password,
            code_parrainage: codeParrainage
          }]);

        if (error) {
          alert('❌ Erreur lors de la création du compte');
          return;
        }

        // (sync contacts supprimé — table contacts retirée)

        alert('✅ Compte créé avec succès ! Vous pouvez maintenant vous connecter !');
        if (typeof window.switchClientTab === 'function') window.switchClientTab('login');
        document.getElementById('login-client-email').value = email;

      } catch (e) {
        alert('❌ Erreur: ' + e.message);
      }
    });



  // ══════════════════════════════════════════════════════════
  // DASHBOARD — Tabs sidebar + Mode VIP
  // ══════════════════════════════════════════════════════════

  function initDashboardTabs() {
    const navItems = document.querySelectorAll('.ca-nav-item');
    const tabs     = document.querySelectorAll('.ca-tab');
    const sidebar  = document.getElementById('ca-sidebar');
    const overlay  = document.getElementById('ca-sidebar-overlay');
    const hamburger = document.getElementById('ca-hamburger');

    // Hamburger toggle mobile
    function openSidebar()  { sidebar?.classList.add('open');    overlay?.classList.add('open'); }
    function closeSidebar() { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); }

    if (hamburger) {
      hamburger.style.display = '';
      hamburger.addEventListener('click', () => sidebar?.classList.contains('open') ? closeSidebar() : openSidebar());
    }
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Afficher/masquer hamburger selon largeur
    function checkHamburger() {
      if (hamburger) hamburger.style.display = window.innerWidth <= 700 ? '' : 'none';
    }
    checkHamburger();
    window.addEventListener('resize', checkHamburger);

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const target = item.dataset.tab;
        navItems.forEach(n => n.classList.remove('active'));
        tabs.forEach(t => t.classList.remove('active'));
        item.classList.add('active');
        const tab = document.getElementById('tab-' + target);
        if (tab) tab.classList.add('active');
        // Fermer sidebar mobile après navigation
        if (window.innerWidth <= 700) closeSidebar();
      });
    });

    // Quick stats cards -> navigation
    document.querySelectorAll('.qs-card[data-tab-target]').forEach(card => {
      card.addEventListener('click', () => {
        const target = card.dataset.tabTarget;
        const navBtn = document.querySelector('.ca-nav-item[data-tab="' + target + '"]');
        if (navBtn) navBtn.click();
      });
    });
  }

  // Activer le mode VIP gold sur toute la page
  function activateVipMode(nb, palierLabel) {
    document.body.classList.add('vip-mode');
    // Avatar couronne
    const avatar = document.getElementById('ca-avatar');
    if (avatar) avatar.textContent = '👑';
    // Badge sidebar
    const badge = document.getElementById('sidebar-vip-badge');
    if (badge) { badge.classList.remove('hidden'); badge.textContent = '👑 ' + (palierLabel || 'Ambassadeur'); }
    // Banner vue d'ensemble
    const banner = document.getElementById('vip-banner');
    if (banner) banner.classList.remove('hidden');
    const bannerLabel = document.getElementById('vip-banner-label');
    if (bannerLabel) bannerLabel.textContent = palierLabel || 'Ambassadeur';
    const counter = document.getElementById('vip-counter');
    if (counter) counter.textContent = nb;
    // Header bouton connect -> masquer si connecté
    const btnConnect = document.getElementById('btn-open-login');
    if (btnConnect) btnConnect.style.display = 'none';
  }

  // ── Event listeners — remplace les onclick inline du HTML ──
  const _bind = (id, event, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
  };

  _bind('btn-open-login',  'click', () => window.openLoginModal());
  _bind('btn-logout',      'click', () => window.logout());
  _bind('btn-copy-code',   'click', () => window.copyCode());
  _bind('btn-share-code',  'click', () => window.shareCode());
  _bind('tab-login',       'click', () => window.switchClientTab('login'));
  _bind('tab-signup',      'click', () => window.switchClientTab('signup'));
  _bind('btn-cancel-login',  'click', () => window.closeLoginModal());
  _bind('btn-cancel-signup', 'click', () => window.closeLoginModal());
    // Fermer modal en cliquant dehors
    const loginModal = document.getElementById('client-login-modal');
    if (loginModal) {
      loginModal.addEventListener('click', function(e) {
        if (e.target === this) window.closeLoginModal();
      });
    }