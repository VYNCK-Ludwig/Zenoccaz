// ====== GESTION DES CHOIX CHAT IA ======
      const chatSection = document.getElementById('chat');
      const chatLink    = document.querySelector('a[href="#chat"]');

      let chatLeadsFilter  = 'all';
      let chatLeadsCache   = [];
      let chatSearchQuery  = '';

      // Filtres onglets
      function filterChatLeads(filter) {
        chatLeadsFilter = filter;
        ['all','active','archived'].forEach(f => {
          const btn = document.getElementById('chat-filter-' + f);
          if (btn) btn.classList.toggle('active', f === filter);
        });
        renderChatLeadsTable();
      }
      window.filterChatLeads = filterChatLeads;

      // Recherche
      function filterChatSearch(query) {
        chatSearchQuery = (query || '').toLowerCase().trim();
        renderChatLeadsTable();
      }
      window.filterChatSearch = filterChatSearch;

      // Chargement Supabase
      async function loadChatLeads() {
        try {
          if (!window.supabase) return [];
          let query = window.supabase.from('chat_leads').select('*').order('created_at', { ascending: false });
          if (chatLeadsFilter === 'active')   query = query.or('status.is.null,status.eq.active');
          if (chatLeadsFilter === 'archived') query = query.eq('status', 'archived');
          const { data, error } = await query;
          if (error) { console.error('❌ loadChatLeads:', error); return []; }
          return data || [];
        } catch(e) { console.error('❌ loadChatLeads:', e); return []; }
      }

      // Helpers visuels
      function getCiaChipHtml(choice) {
        const map = {
          sell:    { cls:'cia-chip-sell',  label:'Vendre',   icon:'<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
          buy:     { cls:'cia-chip-buy',   label:'Acheter',  icon:'<path d="M5 11L6.5 6.5C6.8 5.6 7.6 5 8.5 5H15.5C16.4 5 17.2 5.6 17.5 6.5L19 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="3" y="11" width="18" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/><circle cx="7.5" cy="15" r="1.5" fill="currentColor"/><circle cx="16.5" cy="15" r="1.5" fill="currentColor"/>' },
          faq:     { cls:'cia-chip-faq',   label:'Question', icon:'<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M12 8c-1.1 0-2 .9-2 2h1.5c0-.28.22-.5.5-.5s.5.22.5.5c0 .5-.75 1.25-.75 2H13c0-.75.75-1.5.75-2A2 2 0 0012 8z" fill="currentColor"/><circle cx="12" cy="15.5" r=".75" fill="currentColor"/>' },
          ai_chat: { cls:'cia-chip-chat',  label:'Chat IA',  icon:'<rect x="3" y="5" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 10h8M8 13h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7 18l-3 3V18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' },
        };
        const d = map[choice] || { cls:'cia-chip-other', label: choice || 'Autre', icon:'<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>' };
        return `<span class="cia-chip ${d.cls}"><svg viewBox="0 0 24 24" fill="none">${d.icon}</svg>${escapeHtml(d.label)}</span>`;
      }

      function getCiaDetailsPreview(row) {
        if (!row || !row.payload) return '—';
        const p = row.payload;
        if (row.choice === 'sell') return [p.model, p.km ? p.km+' km' : '', p.etat, p.lieu].filter(Boolean).join(' · ');
        if (row.choice === 'buy')  return [p.type, p.budget, p.km ? p.km+' km' : '', p.options].filter(Boolean).join(' · ');
        if (row.choice === 'faq')  return p.question || '—';
        if (p.callback_info) return '📞 ' + p.callback_info;
        if (p.email)         return '📧 ' + p.email;
        if (p.whatsapp)      return '💬 ' + p.whatsapp;
        if (p.rdv_info)      return '📅 ' + p.rdv_info;
        if (p.ai_conversation_topic) return '🤖 ' + p.ai_conversation_topic;
        return '—';
      }

      // Rendu du tableau
      async function renderChatLeadsTable() {
        const tbody   = document.getElementById('chat-leads-table-body');
        const emptyEl = document.getElementById('cia-empty');
        if (!tbody) return;

        chatLeadsCache = await loadChatLeads();

        // Recherche côté client
        let rows = chatLeadsCache;
        if (chatSearchQuery) {
          rows = rows.filter(r => {
            return [r.choice, r.payload ? JSON.stringify(r.payload) : '']
              .join(' ').toLowerCase().includes(chatSearchQuery);
          });
        }

        // Stats
        const countActive   = chatLeadsCache.filter(r => !r.status || r.status === 'active').length;
        const countArchived = chatLeadsCache.filter(r => r.status === 'archived').length;
        const s = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
        s('cia-count-active',   countActive);
        s('cia-count-archived', countArchived);
        s('cia-count-total',    chatLeadsCache.length);

        if (rows.length === 0) {
          tbody.innerHTML = '';
          if (emptyEl) emptyEl.classList.remove('hidden');
          return;
        }
        if (emptyEl) emptyEl.classList.add('hidden');

        tbody.innerHTML = '';
        rows.forEach((row, i) => {
          const tr = document.createElement('tr');
          tr.style.animationDelay = (i * 0.04) + 's';
          const isArchived = row.status === 'archived';

          const d = new Date(row.created_at);
          const dateStr = d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit' });
          const timeStr = d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });

          const chipHtml   = getCiaChipHtml(row.choice);
          const details    = getCiaDetailsPreview(row);
          const badgeHtml  = isArchived
            ? '<span class="cia-badge cia-badge-archived">📦 Archivée</span>'
            : '<span class="cia-badge cia-badge-active">● Active</span>';

          const archBtn = isArchived
            ? `<button class="cia-btn cia-btn-restore" onclick="event.stopPropagation();unarchiveChatLead(${row.id})" title="Réactiver">
                <svg viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 109-9H7m-4 0l3-3m-3 3l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
               </button>`
            : `<button class="cia-btn cia-btn-archive" onclick="event.stopPropagation();archiveChatLead(${row.id})" title="Archiver">
                <svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M5 6l1 13a2 2 0 002 2h8a2 2 0 002-2L19 6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
               </button>`;
          const delBtn = `<button class="cia-btn cia-btn-delete" onclick="event.stopPropagation();deleteChatLead(${row.id})" title="Supprimer">
              <svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
             </button>`;

          tr.innerHTML = `
            <td>${dateStr}<br><span style="font-size:11px;color:var(--muted);font-weight:400;">${timeStr}</span></td>
            <td>${chipHtml}</td>
            <td><div class="cia-detail-text">${escapeHtml(details)}</div></td>
            <td>${badgeHtml}</td>
            <td><div class="cia-actions">${archBtn}${delBtn}</div></td>
          `;
          if (isArchived) tr.style.opacity = '0.55';
          tr.style.cursor = 'pointer';
          tr.addEventListener('click', () => showChatDetails(row));
          tbody.appendChild(tr);
        });
      }

      // Modal détails
      function showChatDetails(row) {
        const overlay   = document.getElementById('chat-details-modal');
        const content   = document.getElementById('chat-details-content');
        const actions   = document.getElementById('cia-modal-actions');
        const modalDate = document.getElementById('cia-modal-date');
        if (!overlay || !content) return;

        const d = new Date(row.created_at);
        if (modalDate) modalDate.textContent = d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });

        const p = row.payload || {};
        const choiceLabels = { sell:'Vendre un véhicule', buy:'Acheter un véhicule', faq:'Question', ai_chat:'Chat IA' };
        let html = '<div class="cia-info-grid">';
        html += ciaInfoItem('Intention', choiceLabels[row.choice] || row.choice || '—');
        html += ciaInfoItem('Statut', row.status === 'archived' ? '📦 Archivée' : '🟢 Active');

        if (row.choice === 'sell') {
          if (p.model)  html += ciaInfoItem('Modèle', p.model);
          if (p.km)     html += ciaInfoItem('Kilométrage', p.km + ' km');
          if (p.etat)   html += ciaInfoItem('État', p.etat);
          if (p.lieu)   html += ciaInfoItem('Lieu', p.lieu);
        } else if (row.choice === 'buy') {
          if (p.type)    html += ciaInfoItem('Type recherché', p.type);
          if (p.budget)  html += ciaInfoItem('Budget', p.budget);
          if (p.km)      html += ciaInfoItem('Km max', p.km + ' km');
          if (p.options) html += ciaInfoItem('Options', p.options);
          if (p.urgence) html += ciaInfoItem('Urgence', p.urgence);
        } else if (row.choice === 'faq' && p.question) {
          html += ciaInfoItem('Question', p.question, true);
        }
        html += '</div>';

        // Contact
        if (p.contact_choice || p.callback_nom || p.callback_tel || p.callback_date || p.callback_info || p.email || p.whatsapp || p.rdv_info) {
          const cLabels = { callback:'📞 Rappel demandé', email:'📧 Par email', whatsapp:'💬 WhatsApp', rdv:'📅 Rendez-vous' };
          html += '<div>';
          if (p.contact_choice) {
            html += '<p class="cia-section-label">Mode de contact</p>';
            html += `<div class="cia-contact-highlight">${escapeHtml(cLabels[p.contact_choice] || p.contact_choice)}</div>`;
          }
          if (p.callback_nom || p.callback_tel || p.callback_date || p.callback_info) {
            html += '<div class="cia-info-grid" style="margin-top:10px;">';
            if (p.callback_nom)  html += ciaInfoItem('Nom', p.callback_nom);
            if (p.callback_tel)  html += ciaInfoItem('Téléphone', p.callback_tel);
            if (p.callback_date) html += ciaInfoItem('Créneau', p.callback_date);
            if (p.callback_info) html += ciaInfoItem('Info rappel', p.callback_info);
            html += '</div>';
          }
          if (p.email)    html += `<div class="cia-contact-highlight" style="border-color:#3b82f6;color:#3b82f6;margin-top:8px;">📧 ${escapeHtml(p.email)}</div>`;
          if (p.whatsapp) html += `<div class="cia-contact-highlight" style="border-color:#25d366;color:#25d366;margin-top:8px;">💬 ${escapeHtml(p.whatsapp)}</div>`;
          if (p.rdv_info) html += `<div class="cia-contact-highlight" style="border-color:#a855f7;color:#a855f7;margin-top:8px;">📅 ${escapeHtml(p.rdv_info)}</div>`;
          html += '</div>';
        }

        if (p.ai_conversation_topic) {
          html += `<div><p class="cia-section-label">Sujet IA</p><div class="cia-info-item"><div class="cia-info-value">${escapeHtml(p.ai_conversation_topic)}</div></div></div>`;
        }
        if (p.full_conversation) {
          html += `<div><p class="cia-section-label">Historique conversation</p><div class="cia-conv-block">${escapeHtml(p.full_conversation)}</div></div>`;
        }

        content.innerHTML = html;

        const isArchived = row.status === 'archived';
        actions.innerHTML = isArchived
          ? `<button class="cia-modal-btn cia-modal-btn-restore" onclick="unarchiveChatLead(${row.id})">
               <svg viewBox="0 0 24 24" fill="none" style="width:14px;height:14px;"><path d="M3 12a9 9 0 109-9H7m-4 0l3-3m-3 3l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
               Réactiver
             </button>
             <button class="cia-modal-btn cia-modal-btn-delete" onclick="deleteChatLead(${row.id})">
               <svg viewBox="0 0 24 24" fill="none" style="width:14px;height:14px;"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
               Supprimer
             </button>`
          : `<button class="cia-modal-btn cia-modal-btn-archive" onclick="archiveChatLead(${row.id})">
               <svg viewBox="0 0 24 24" fill="none" style="width:14px;height:14px;"><path d="M3 6h18M5 6l1 13a2 2 0 002 2h8a2 2 0 002-2L19 6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
               Archiver
             </button>
             <button class="cia-modal-btn cia-modal-btn-delete" onclick="deleteChatLead(${row.id})">
               <svg viewBox="0 0 24 24" fill="none" style="width:14px;height:14px;"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
               Supprimer
             </button>`;

        overlay.style.display = 'flex';
      }

      function ciaInfoItem(label, value, fullWidth) {
        const span = fullWidth ? ' style="grid-column:1/-1"' : '';
        return `<div class="cia-info-item"${span}>
          <div class="cia-info-label">${escapeHtml(label)}</div>
          <div class="cia-info-value">${escapeHtml(String(value || '—'))}</div>
        </div>`;
      }

      function closeChatDetailsModal() {
        const overlay = document.getElementById('chat-details-modal');
        if (overlay) overlay.style.display = 'none';
      }

      // CRUD
      async function archiveChatLead(id) {
        if (!window.supabase) return;
        const { error } = await window.supabase.from('chat_leads').update({ status:'archived' }).eq('id', id);
        if (error) { alert('Erreur lors de l\'archivage'); return; }
        closeChatDetailsModal();
        await renderChatLeadsTable();
      }

      async function unarchiveChatLead(id) {
        if (!window.supabase) return;
        const { error } = await window.supabase.from('chat_leads').update({ status:'active' }).eq('id', id);
        if (error) { alert('Erreur lors de la réactivation'); return; }
        closeChatDetailsModal();
        await renderChatLeadsTable();
      }

      async function deleteChatLead(id) {
        if (!confirm('Supprimer définitivement cette demande ?')) return;
        if (!window.supabase) return;
        const { error } = await window.supabase.from('chat_leads').delete().eq('id', id);
        if (error) { alert('Erreur lors de la suppression'); return; }
        closeChatDetailsModal();
        await renderChatLeadsTable();
      }

      window.archiveChatLead   = archiveChatLead;
      window.unarchiveChatLead = unarchiveChatLead;
      window.deleteChatLead    = deleteChatLead;

      // Fermeture modal
      const closeChatModalBtn = document.getElementById('close-chat-modal');
      if (closeChatModalBtn) closeChatModalBtn.addEventListener('click', closeChatDetailsModal);
      const chatDetailsOverlay = document.getElementById('chat-details-modal');
      if (chatDetailsOverlay) {
        chatDetailsOverlay.addEventListener('click', e => {
          if (e.target === chatDetailsOverlay) closeChatDetailsModal();
        });
      }

      // Navigation
      if (chatLink) {
        chatLink.addEventListener('click', async e => {
          e.preventDefault();
          hideAllSections();
          chatSection.classList.remove('hidden');
          chatLeadsFilter = 'all';
          chatSearchQuery = '';
          const searchInput = document.getElementById('cia-search');
          if (searchInput) searchInput.value = '';
          document.getElementById('chat-filter-all')?.classList.add('active');
          document.getElementById('chat-filter-active')?.classList.remove('active');
          document.getElementById('chat-filter-archived')?.classList.remove('active');
          await renderChatLeadsTable();
        });
      }