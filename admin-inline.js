// [script normal — KPIs attendront supabaseReady]
(function() {
  function initKPIs() {
    // Calcul dynamique des KPIs Expertises
    (async function loadExpertisesKPIs() {
          // ── Expérience : année courante - année d'ouverture du garage ──
          const ANNEE_OUVERTURE = 2025;
          const anneeActuelle   = new Date().getFullYear();
          const experience      = anneeActuelle - ANNEE_OUVERTURE;
          const expEl = document.getElementById('exp-kpi-experience');
          if (expEl) {
            expEl.textContent = experience === 0
              ? '< 1 an'
              : experience === 1
                ? '1 an'
                : experience + ' ans';
          }

          // ── Données depuis Supabase reviews ──
          try {
            if (!window.supabase) return;
            const { data, error } = await window.supabase
              .from('reviews')
              .select('rating');

            if (error || !data) return;

            const total = data.length;

            // Nombre d'avis
            const clientsEl = document.getElementById('exp-kpi-clients');
            if (clientsEl) clientsEl.textContent = total > 0 ? total : '0';

            if (total === 0) {
              const satEl = document.getElementById('exp-kpi-satisfaction');
              const noteEl = document.getElementById('exp-kpi-note');
              if (satEl)  satEl.textContent  = '—';
              if (noteEl) noteEl.textContent = '—';
              return;
            }

            // Note moyenne (sur 5)
            const somme   = data.reduce((acc, r) => acc + (r.rating || 0), 0);
            const moyenne = somme / total;

            const noteEl = document.getElementById('exp-kpi-note');
            if (noteEl) noteEl.textContent = moyenne.toFixed(1) + ' / 5';

            // Taux de satisfaction = % d'avis avec note >= 4
            const satisfaits = data.filter(r => r.rating >= 4).length;
            const taux       = Math.round((satisfaits / total) * 100);

            const satEl = document.getElementById('exp-kpi-satisfaction');
            if (satEl) satEl.textContent = taux + '%';

          } catch(e) {
            console.error('❌ KPIs expertises:', e);
          }
        })();


/* ══════════════════════════════════════════ */

    // Stats dynamiques reprises
    (async function loadReprisesStats() {
        try {
          if (!window.supabase) return;
          const { data, error } = await window.supabase.from('reprises').select('status, purchase_price');
          if (error || !data) return;

          const total    = data.length;
          const enCours  = data.filter(r => r.status === 'En réparation' || r.status === 'Acheté').length;
          const pret     = data.filter(r => r.status === 'Prêt à la vente').length;
          const investi  = data.reduce((s, r) => s + (parseFloat(r.purchase_price) || 0), 0);

          const s = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
          s('rep-stat-total',   total);
          s('rep-stat-encours', enCours);
          s('rep-stat-pret',    pret);
          s('rep-stat-invest',  investi.toLocaleString('fr-FR') + ' €');
          s('rep-badge-count',  total);
        } catch(e) { console.error('❌ Stats reprises:', e); }
      })();


/* ══════════════════════════════════════════ */

(function initPWANumpad() {
      const numpad = document.getElementById('pwa-numpad');
      if (!numpad) return;
      const buttons = [1,2,3,4,5,6,7,8,9,'',0,'⌫'];
      buttons.forEach(n => {
        const btn = document.createElement('button');
        btn.textContent = n;
        if (n === '') btn.disabled = true;
        btn.style.cssText = `width:72px;height:72px;border-radius:50%;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:${n===''?'transparent':'var(--text)'};font-size:${n==='⌫'?'20px':'22px'};font-weight:600;cursor:pointer;transition:all 0.15s;font-family:inherit;`;
        btn.onclick = () => pwaPin(String(n));
        numpad.appendChild(btn);
      });
    })();



  }
  // Attendre que Supabase soit prêt
  if (window._supabaseReady) {
    initKPIs();
  } else {
    window.addEventListener('supabaseReady', initKPIs, { once: true });
  }
})();

/* ══════════════════════════════════════════ */

// [module — converti en IIFE async]
(async function() {
try {
      if (typeof window.supabase === 'undefined' && typeof supabase === 'undefined') {
        throw new Error('Bibliothèque Supabase non chargée depuis le CDN');
      }
      const config = await import('./supabase-config.js');
      const { createClient } = window.supabase || supabase;
      const supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      window.supabase = supabaseClient;
      window.supabaseClient = {
        supabase: supabaseClient,
        async fetchVehicles() {
          const { data, error } = await supabaseClient.from('vehicles').select('*').order('created_at', { ascending: false });
          return { data: data || [], error };
        },
        async insertVehicle(vehicle) {
          const payload = { id: vehicle.id, make: vehicle.make || null, model: vehicle.model || null, year: vehicle.year || null, price: parseFloat(vehicle.price) || null, description: vehicle.description || null, image: vehicle.image || null, created_at: vehicle.date || new Date().toISOString() };
          return await supabaseClient.from('vehicles').insert([payload]);
        },
        async deleteVehicle(id) {
          return await supabaseClient.from('vehicles').delete().eq('id', id);
        },
        async uploadVehicleImage(file, vehicleId) {
          const ext = file.name.split('.').pop();
          const fileName = `${vehicleId}_${Date.now()}.${ext}`;
          const { data, error } = await supabaseClient.storage.from('vehicle-images').upload(fileName, file);
          if(error) return { data: null, error };
          const { data: urlData } = supabaseClient.storage.from('vehicle-images').getPublicUrl(fileName);
          return { data: urlData?.publicUrl || null, error: null };
        }
      };
      console.log('✅ Supabase client chargé');
      window.dispatchEvent(new Event('supabaseReady'));
    } catch (error) {
      console.error('❌ Erreur Supabase:', error.message);
      alert('❌ Erreur de chargement Supabase:\n\n' + error.message + '\n\nVérifiez la console (F12) pour plus de détails.');
    }
})();


/* ══════════════════════════════════════════ */

// [script normal]
(function(){
      try {
        const admin    = localStorage.getItem('zenoccaz_admin');
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const isPWA    = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

        if (admin !== '1') {
          if (isMobile || isPWA) {
            // Sur mobile/PWA : afficher l'écran PIN au lieu de rediriger
            // Le lock screen sera affiché par le JS PWA plus bas
          } else {
            // Sur desktop sans connexion : rediriger vers index
            window.location.replace('index.html');
          }
        }
      } catch(e) {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (!isMobile) window.location.replace('index.html');
      }
    })();


/* ══════════════════════════════════════════ */

// [script normal]
/* ============================================================
   ADMIN-MAIN.JS — ZENOCCAZ
   JS principal du panneau d'administration
   ============================================================ */

// ── Fonctions globales partagées (accessibles par chat-ia-js-final.js) ──

window.escapeHtml = function(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[c]);
};

window.hideAllSections = function() {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
};

// ── Fonction globale suppression avis (hors initAdmin) ──
window.deleteReview = async function(id) {
  if (!confirm('❌ Supprimer définitivement cet avis client ?')) return;
  try {
    if (!window.supabase) { alert('❌ Erreur: Supabase non initialisé'); return; }
    const { error } = await window.supabase.from('reviews').delete().eq('id', id);
    if (error) { console.error('❌ Erreur suppression:', error); alert('❌ Erreur lors de la suppression'); return; }
    console.log('✅ Avis supprimé');
    if (window.loadReviewsAdmin) await window.loadReviewsAdmin();
  } catch(e) { console.error('❌ Exception:', e); alert('❌ Exception lors de la suppression'); }
};

// ── Initialisation ──
document.addEventListener('DOMContentLoaded', () => {
  if (window.supabaseClient) {
    console.log('✅ Supabase déjà disponible');
    initAdmin();
  } else {
    console.log('⏳ Attente du chargement de Supabase...');
    window.addEventListener('supabaseReady', () => {
      console.log('✅ Événement supabaseReady reçu');
      initAdmin();
    }, { once: true });
    setTimeout(() => {
      if (!window.supabaseClient) {
        console.error('❌ Timeout: Supabase non chargé');
        alert('⚠️ Erreur de chargement Supabase.\n\nOuvrez la console (F12) pour voir les détails.');
      }
    }, 5000);
  }
});

function initAdmin() {
  const logout       = document.getElementById('admin-logout');
  const addAdminBtn  = document.getElementById('add-vehicle-admin');
  const tbody        = document.getElementById('vehicles-table-body');
  const activity     = document.getElementById('activity-list');
  const vehiculesSection = document.getElementById('vehicules');
  const vehiculesLink    = document.querySelector('a[href="#vehicules"]');
  const navItems         = document.querySelectorAll('.admin-nav .admin-item');

  // Raccourcis locaux vers les globales
  const escapeHtml     = window.escapeHtml;
  const hideAllSections = window.hideAllSections;

  function triggerLavaEffect(el) {
    if (!el) return;
    el.classList.remove('lava-burst');
    void el.offsetWidth;
    el.classList.add('lava-burst');
    setTimeout(() => el.classList.remove('lava-burst'), 800);
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      triggerLavaEffect(item);
      document.body.classList.add('admin-fire-text');
    });
  });

  if (vehiculesLink) {
    vehiculesLink.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAllSections();
      vehiculesSection.classList.remove('hidden');
      await renderVehiclesTable();
    });
  }

  const dashboardLink    = document.getElementById('admin-dashboard-link');
  const dashboardSection = document.getElementById('dashboard');
  if (dashboardLink) {
    dashboardLink.addEventListener('click', (e) => {
      e.preventDefault();
      hideAllSections();
      dashboardSection.classList.remove('hidden');
    });
  }

  if (logout) logout.addEventListener('click', () => {
    try { localStorage.setItem('zenoccaz_admin','0'); } catch(e) {}
    window.location.replace('index.html');
  });

  // ── VÉHICULES ──
  async function loadVehicles() {
    try {
      if (window.supabaseClient && window.supabaseClient.fetchVehicles) {
        const { data, error } = await window.supabaseClient.fetchVehicles();
        if (error) { console.error('❌ Erreur chargement véhicules:', error); return []; }
        return data || [];
      }
      return [];
    } catch(e) { console.error('❌ Exception loadVehicles:', e); return []; }
  }

  async function renderVehiclesTable() {
    const arr = await loadVehicles();
    const grid = document.getElementById('vehicles-table-body');
    grid.innerHTML = '';

    // Stats bar
    const statsBar = document.getElementById('veh-stats-bar');
    if (statsBar) {
      const dispo = arr.filter(v => (v.status||'Disponible') === 'Disponible').length;
      const vendu = arr.filter(v => v.status === 'Vendu').length;
      statsBar.innerHTML = `
        <div class="veh-stat"><span class="veh-stat-dot" style="background:#10b981"></span><span>${dispo} disponible${dispo>1?'s':''}</span></div>
        <div class="veh-stat"><span class="veh-stat-dot" style="background:#f59e0b"></span><span>${vendu} vendu${vendu>1?'s':''}</span></div>
        <div class="veh-stat"><span class="veh-stat-dot" style="background:#9fb1b7"></span><span>${arr.length} total</span></div>
      `;
    }

    if (arr.length === 0) {
      grid.innerHTML = '<div class="veh-empty"><div style="font-size:48px;margin-bottom:16px;opacity:0.4;">🚗</div><div style="color:var(--muted);font-size:14px;">Aucun véhicule dans le parc</div></div>';
      return;
    }

    const statusConfig = {
      'Disponible': { color:'#10b981', bg:'rgba(16,185,129,0.1)', border:'rgba(16,185,129,0.25)', dot:'#10b981' },
      'Vendu':      { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.25)', dot:'#f59e0b' },
      'Archivé':    { color:'#9fb1b7', bg:'rgba(107,114,128,0.1)', border:'rgba(107,114,128,0.25)', dot:'#6b7280' }
    };

    arr.forEach((v, i) => {
      const st = statusConfig[v.status||'Disponible'] || statusConfig['Disponible'];
      const img = v.images && v.images.length > 0 ? v.images[0] : null;
      const card = document.createElement('div');
      card.className = 'veh-card';
      card.style.animationDelay = (i * 0.06) + 's';
      card.innerHTML = `
        <div class="veh-card-img" style="position:relative;overflow:hidden;">
          ${img ? `<img src="${img}" alt="${escapeHtml(v.make||'')} ${escapeHtml(v.model||'')}" />` : '<div class="veh-card-img-placeholder">🚗</div>'}
          <div class="veh-card-status" style="background:${st.bg};color:${st.color};border-color:${st.border};">
            <span style="width:6px;height:6px;border-radius:50%;background:${st.dot};display:inline-block;"></span>
            ${escapeHtml(v.status||'Disponible')}
          </div>
          ${v.status === 'Vendu' ? `
          <div style="position:absolute;top:18px;right:-28px;width:130px;background:linear-gradient(135deg,#cc2200,#ff3311);color:#f0c040;text-align:center;font-family:'Courier New',monospace;font-size:11px;font-weight:900;letter-spacing:0.18em;padding:5px 0;transform:rotate(35deg);box-shadow:0 2px 8px rgba(204,34,0,0.5);border-top:1px solid rgba(240,192,64,0.4);border-bottom:1px solid rgba(240,192,64,0.4);z-index:10;">
            VENDU
          </div>` : ''}
        </div>
        <div class="veh-card-body">
          <div class="veh-card-name">${escapeHtml(v.make||'—')} ${escapeHtml(v.model||'')}</div>
          <div class="veh-card-meta">
            <span>${escapeHtml(v.year||'—')}</span>
            ${v.mileage ? `<span>·</span><span>${escapeHtml(String(v.mileage))} km</span>` : ''}
            ${v.fuel ? `<span>·</span><span>${escapeHtml(v.fuel)}</span>` : ''}
          </div>
          ${v.description ? `<div class="veh-card-desc">${escapeHtml(v.description)}</div>` : ''}
          <div class="veh-card-footer">
            <div class="veh-card-price">${escapeHtml(String(v.price||'—'))} €</div>
            <div class="veh-card-actions">
              <button class="veh-btn veh-btn-edit edit" data-id="${v.id}" title="Modifier">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="veh-btn veh-btn-sold sold" data-id="${v.id}" data-price="${v.price}" data-vehicle="${escapeHtml(v.make||'')} ${escapeHtml(v.model||'')}" title="Marquer vendu">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </button>
              <button class="veh-btn veh-btn-archive archive" data-id="${v.id}" title="Archiver">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              </button>
              <button class="veh-btn veh-btn-del del" data-id="${v.id}" title="Supprimer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll('.edit').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); editVehicle(Number(el.dataset.id)); }));
    grid.querySelectorAll('.sold').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); openSalePriceModal(Number(el.dataset.id), el.dataset.vehicle); }));
    grid.querySelectorAll('.archive').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); archiveVehicle(Number(el.dataset.id)); }));
    grid.querySelectorAll('.del').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); deleteVehicle(Number(el.dataset.id)); }));
  }

  async function updateDashboard() {
    const arr = await loadVehicles();
    document.getElementById('count-vehicules').textContent = arr.length;
    activity.innerHTML = '';
    if (arr.length === 0) { activity.innerHTML = '<div class="activity-empty">Aucune activité récente.</div>'; return; }
    arr.slice(0,6).forEach(v => {
      const it = document.createElement('div');
      it.className = 'activity-item';
      it.innerHTML = `<div class="act-icon">🚗</div><div><div style="font-weight:600">${escapeHtml(v.make||'—')} ${escapeHtml(v.model||'')}</div><div class="muted" style="font-size:13px;margin-top:4px">Ajouté — ${escapeHtml(v.year||'')} — ${escapeHtml(v.price||'')} €</div></div>`;
      activity.appendChild(it);
    });
  }

  const vehicleModal  = document.getElementById('vehicle-modal');
  const vehicleForm   = document.getElementById('vehicle-form');
  const vehicleCancel = document.getElementById('vehicle-cancel');
  let currentVehicleImages = [], imagesToDelete = [];

  window.removeImage = function(index) {
    if (!confirm('Supprimer cette image ?')) return;
    imagesToDelete.push(index);
    const previewContainer = document.getElementById('current-images-preview');
    previewContainer.innerHTML = '';
    currentVehicleImages.forEach((imgUrl, i) => {
      if (imagesToDelete.includes(i)) return;
      const imgWrapper = document.createElement('div');
      imgWrapper.style.cssText = 'position:relative;width:100%;padding-bottom:100%;border-radius:8px;overflow:hidden;border:2px solid rgba(255,255,255,0.1);';
      imgWrapper.innerHTML = `<img src="${imgUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;"><button type="button" onclick="removeImage(${i})" style="position:absolute;top:4px;right:4px;background:rgba(255,0,0,0.8);color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:16px;line-height:1;padding:0;">×</button>`;
      previewContainer.appendChild(imgWrapper);
    });
    if (previewContainer.children.length === 0) previewContainer.innerHTML = '<p style="color:var(--muted);font-size:13px;">Aucune image (ajoutez-en ci-dessous)</p>';
  };

  function openVehicleModal() {
    vehicleModal.classList.remove('hidden');
    vehicleModal.setAttribute('aria-hidden','false');
    vehicleForm.reset();
    document.getElementById('vehicle-edit-id').value = '';
    document.getElementById('vehicle-modal-title').textContent = 'Ajouter un véhicule';
    document.getElementById('current-images-preview').innerHTML = '';
    currentVehicleImages = []; imagesToDelete = [];
    document.getElementById('veh-make').focus();
  }

  function closeVehicleModal() {
    vehicleModal.classList.add('hidden');
    vehicleModal.setAttribute('aria-hidden','true');
  }

  vehicleCancel.addEventListener('click', closeVehicleModal);
  vehicleModal.addEventListener('click', e => { if (e.target === vehicleModal) closeVehicleModal(); });

  vehicleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('vehicle-edit-id').value;
    const isEdit = editId !== '';
    const make = document.getElementById('veh-make').value.trim();
    const model = document.getElementById('veh-model').value.trim();
    const year  = document.getElementById('veh-year').value.trim();
    const price = document.getElementById('veh-price').value.trim();
    const description = document.getElementById('veh-desc').value.trim();
    const mileage = document.getElementById('veh-mileage').value || null;
    const fuel_type = document.getElementById('veh-fuel').value || null;
    const transmission = document.getElementById('veh-transmission').value || null;
    const color = document.getElementById('veh-color').value || null;
    const doors = document.getElementById('veh-doors').value || null;
    const seats = document.getElementById('veh-seats').value || null;
    const horsepower = document.getElementById('veh-horsepower').value || null;
    const condition = document.getElementById('veh-condition').value || 'Occasion';
    const vin = document.getElementById('veh-vin').value || null;
    const registration_date = document.getElementById('veh-registration').value || null;
    const previous_owners = document.getElementById('veh-owners').value || null;
    const technical_control_date = document.getElementById('veh-technical').value || null;
    const warranty_months = document.getElementById('veh-warranty').value || null;
    const features = [];
    ['gps','ac','cruise','camera','radar','bluetooth','heated-seats','panoramic','alloy','audio','led','parking'].forEach(id => {
      const el = document.getElementById('feature-' + id);
      if (el && el.checked) features.push(el.value);
    });
    if (!make || !model || !year || !price) { alert('❌ Marque, modèle, année et prix sont obligatoires'); return; }
    if (!window.supabaseClient) { alert('❌ Erreur: Supabase non initialisé'); return; }
    let existingImages = isEdit ? currentVehicleImages.filter((_, i) => !imagesToDelete.includes(i)) : [];
    const imageFiles = document.getElementById('veh-images').files;
    let newImageUrls = [];
    const vehicleId = isEdit ? editId : Date.now();
    if (imageFiles.length > 0 && window.supabaseClient.uploadVehicleImage) {
      for (let i = 0; i < imageFiles.length; i++) {
        try {
          const { data, error } = await window.supabaseClient.uploadVehicleImage(imageFiles[i], `${vehicleId}_${Date.now()}_${i}`);
          if (data) newImageUrls.push(data);
        } catch(err) { console.error('❌ Exception upload:', err); }
      }
    }
    const imageUrls = [...existingImages, ...newImageUrls];
    const vehicleData = { make, model, year: parseInt(year), price: parseFloat(price), description, image: imageUrls[0] || null, images: imageUrls, mileage: mileage ? parseInt(mileage) : null, fuel_type, transmission, color, doors: doors ? parseInt(doors) : null, seats: seats ? parseInt(seats) : null, horsepower: horsepower ? parseInt(horsepower) : null, condition, features, vin, registration_date, previous_owners: previous_owners ? parseInt(previous_owners) : null, technical_control_date, warranty_months: warranty_months ? parseInt(warranty_months) : null };
    if (!isEdit) vehicleData.id = vehicleId;
    try {
      if (isEdit) {
        const result = await window.supabase.from('vehicles').update(vehicleData).eq('id', editId).select();
        if (result && result.error) { alert('❌ Erreur:\n' + result.error.message); return; }
        alert('✅ Véhicule modifié avec succès!');
      } else {
        const result = await window.supabase.from('vehicles').insert([vehicleData]);
        if (result && result.error) { alert('❌ Erreur:\n' + result.error.message); return; }
        alert('✅ Véhicule ajouté avec succès!');
      }
    } catch(e) { alert('❌ Erreur: ' + e.message); return; }
    await renderVehiclesTable();
    await updateDashboard();
    closeVehicleModal();
  });

  async function editVehicle(id) {
    try {
      const { data, error } = await window.supabase.from('vehicles').select('*').eq('id', id).single();
      if (error) { alert('❌ Erreur lors du chargement du véhicule'); return; }
      const v = data;
      document.getElementById('vehicle-edit-id').value = v.id;
      document.getElementById('vehicle-modal-title').textContent = 'Modifier le véhicule';
      ['make','model','year','price','mileage','color','doors','seats','horsepower','vin','owners','desc'].forEach(field => {
        const map = { make:'veh-make', model:'veh-model', year:'veh-year', price:'veh-price', mileage:'veh-mileage', color:'veh-color', doors:'veh-doors', seats:'veh-seats', horsepower:'veh-horsepower', vin:'veh-vin', owners:'veh-owners', desc:'veh-desc' };
        const el = document.getElementById(map[field]);
        if (el) el.value = v[field === 'owners' ? 'previous_owners' : field] || '';
      });
      document.getElementById('veh-fuel').value = v.fuel_type || '';
      document.getElementById('veh-transmission').value = v.transmission || '';
      document.getElementById('veh-condition').value = v.condition || 'Excellent';
      document.getElementById('veh-registration').value = v.registration_date || '';
      document.getElementById('veh-technical').value = v.technical_control_date || '';
      document.getElementById('veh-warranty').value = v.warranty_months || '';
      const features = v.features || [];
      ['gps','ac','cruise','camera','radar','bluetooth','heated-seats','panoramic','alloy','audio','led','parking'].forEach(id => {
        const el = document.getElementById('feature-' + id);
        if (el) el.checked = features.includes(el.value);
      });
      currentVehicleImages = v.images || [];
      if (currentVehicleImages.length === 0 && v.image) currentVehicleImages = [v.image];
      imagesToDelete = [];
      const previewContainer = document.getElementById('current-images-preview');
      previewContainer.innerHTML = '';
      if (currentVehicleImages.length > 0) {
        currentVehicleImages.forEach((imgUrl, index) => {
          const imgWrapper = document.createElement('div');
          imgWrapper.style.cssText = 'position:relative;width:100%;padding-bottom:100%;border-radius:8px;overflow:hidden;border:2px solid rgba(255,255,255,0.1);';
          imgWrapper.innerHTML = `<img src="${imgUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;"><button type="button" onclick="removeImage(${index})" style="position:absolute;top:4px;right:4px;background:rgba(255,0,0,0.8);color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:16px;line-height:1;padding:0;">×</button>`;
          previewContainer.appendChild(imgWrapper);
        });
      } else {
        previewContainer.innerHTML = '<p style="color:var(--muted);font-size:13px;">Aucune image pour ce véhicule</p>';
      }
      vehicleModal.classList.remove('hidden');
      vehicleModal.setAttribute('aria-hidden','false');
      document.getElementById('veh-make').focus();
    } catch(e) { alert('❌ Erreur: ' + e.message); }
  }

  async function deleteVehicle(id) {
    if (!confirm('Supprimer ce véhicule ?')) return;
    try {
      if (!window.supabase) { alert('❌ Erreur: Supabase non initialisé'); return; }
      const { data: vehicle, error: fetchError } = await window.supabase.from('vehicles').select('*').eq('id', id).single();
      if (fetchError) { alert('❌ Erreur lors de la récupération du véhicule'); return; }
      if (vehicle && vehicle.status === 'Vendu') {
        const { data: financeEntries } = await window.supabase.from('finances').select('*').eq('vehicle_id', id);
        if (financeEntries && financeEntries.length > 0) {
          for (const entry of financeEntries) await window.supabase.from('finances').delete().eq('id', entry.id);
        }
      }
      if (window.supabaseClient && window.supabaseClient.deleteVehicle) {
        const result = await window.supabaseClient.deleteVehicle(id);
        if (result && result.error) { alert('❌ Erreur lors de la suppression: ' + result.error.message); return; }
        alert('✅ Véhicule et finances mises à jour!');
      }
    } catch(e) { alert('❌ Erreur: ' + e.message); return; }
    await renderVehiclesTable();
    await updateDashboard();
  }

  // Modal prix de vente
  const salePriceModal  = document.getElementById('sale-price-modal');
  const salePriceForm   = document.getElementById('sale-price-form');
  const salePriceCancel = document.getElementById('sale-price-cancel');

  function openSalePriceModal(id, vehicleName) {
    document.getElementById('sale-vehicle-id').value = id;
    document.getElementById('sale-vehicle-name').value = vehicleName;
    document.getElementById('sale-price-input').value = '';
    salePriceModal.classList.remove('hidden');
    salePriceModal.setAttribute('aria-hidden','false');
    document.getElementById('sale-price-input').focus();
  }

  function closeSalePriceModal() {
    salePriceModal.classList.add('hidden');
    salePriceModal.setAttribute('aria-hidden','true');
  }

  salePriceCancel.addEventListener('click', closeSalePriceModal);
  salePriceModal.addEventListener('click', e => { if (e.target === salePriceModal) closeSalePriceModal(); });

  salePriceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = Number(document.getElementById('sale-vehicle-id').value);
    const vehicleName = document.getElementById('sale-vehicle-name').value;
    const price = parseFloat(document.getElementById('sale-price-input').value);
    closeSalePriceModal();
    await markVehicleAsSold(id, price, vehicleName);
  });

  async function markVehicleAsSold(id, price, vehicleName) {
    try {
      if (!window.supabase) { alert('❌ Erreur: Supabase non initialisé'); return; }

      // 1. Récupérer le véhicule complet
      const { data: veh, error: fetchError } = await window.supabase.from('vehicles').select('*').eq('id', id).single();
      if (fetchError) { alert('❌ Erreur récupération véhicule'); return; }

      // 2. Archiver dans sold_vehicles
      const soldAt = new Date().toISOString();
      const { error: archiveError } = await window.supabase.from('sold_vehicles').insert([{
        id:           veh.id,
        make:         veh.make         || null,
        model:        veh.model        || null,
        year:         veh.year         || null,
        price:        veh.price        || null,
        mileage:      veh.mileage      || null,
        fuel_type:    veh.fuel         || veh.fuel_type || null,
        description:  veh.description  || null,
        registration: veh.registration || null,
        images:       veh.images       || null,
        sold_at:      soldAt,
        sold_price:   parseFloat(price) || null
      }]);
      if (archiveError) { alert('❌ Erreur archivage : ' + archiveError.message); return; }

      // 3. Mettre à jour le statut + date de vente dans vehicles
      const { error: updateError } = await window.supabase.from('vehicles').update({ status:'Vendu', sold_at: soldAt }).eq('id', id);
      if (updateError) { alert('❌ Erreur lors de la mise à jour du véhicule'); return; }

      // 4. Ajouter dans les finances
      const { error: financeError } = await window.supabase.from('finances').insert([{ id: Date.now(), description: `Vente véhicule: ${vehicleName}`, type:'revenue', amount: parseFloat(price), category:'vehicle', vehicle_id: id }]);
      if (financeError) { alert('❌ Erreur lors de l\'ajout dans les finances'); return; }

      alert('✅ Véhicule vendu ! Archivé et ajouté aux finances.');
      await renderVehiclesTable();
      await updateDashboard();
    } catch(e) { alert('❌ Erreur: ' + e.message); }
  }

  async function archiveVehicle(id) {
    if (!confirm('Archiver ce véhicule ?')) return;
    try {
      const { error } = await window.supabase.from('vehicles').update({ status:'Archivé' }).eq('id', id);
      if (error) { alert('❌ Erreur lors de l\'archivage'); return; }
      alert('✅ Véhicule archivé avec succès!');
      await renderVehiclesTable();
      await updateDashboard();
    } catch(e) { alert('❌ Erreur: ' + e.message); }
  }

  // ── CONTACTS ──
  // renderContactsTable et contactsLink sont gérés par admin-main.js
  // Ici : loadContacts (utilisé aussi par d'autres modules), modal ajout, deleteContact

  // loadContacts exposé globalement pour admin-main.js
  window.loadContacts = async function() { return []; }; // table contacts supprimée

  const contactModal  = document.getElementById('contact-modal');
  const contactForm   = document.getElementById('contact-form');
  const contactCancel = document.getElementById('contact-cancel');
  const addContactBtn = document.getElementById('add-contact-admin');

  window.openContactModal = function() { contactModal.classList.remove('hidden'); contactModal.setAttribute('aria-hidden','false'); contactForm.reset(); document.getElementById('cont-name').focus(); };
  window.closeContactModal = function() { contactModal.classList.add('hidden'); contactModal.setAttribute('aria-hidden','true'); };
  contactCancel.addEventListener('click', window.closeContactModal);
  contactModal.addEventListener('click', e => { if (e.target === contactModal) window.closeContactModal(); });

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name    = document.getElementById('cont-name').value.trim();
    const email   = document.getElementById('cont-email').value.trim();
    const phone   = document.getElementById('cont-phone').value.trim();
    const address = document.getElementById('cont-address').value.trim();
    if (!name) { alert('❌ Le nom est requis'); return; }
    try {
      // Insérer dans clients (table contacts supprimée)
      const newId = Date.now();
      const codeParrainage = (name.split(' ')[0]||'ZEN').toUpperCase().replace(/[^A-Z]/g,'').substring(0,8) + String(Math.floor(1000+Math.random()*9000));
      const { error } = await window.supabase.from('clients').insert([{ id: newId, name, email: email||null, phone: phone||null, adresse: address||null, code_parrainage: codeParrainage }]);
      if (error) { alert('❌ Erreur lors de l\'ajout : ' + error.message); return; }
      if (typeof window.renderClientsTableGlobal === 'function') await window.renderClientsTableGlobal();
      window.closeContactModal();
    } catch(e) { alert('❌ Erreur: ' + e.message); }
  });

  // deleteContact exposé globalement pour admin-main.js
  window.deleteContactGlobal = async function(id) {
    if (!confirm('Supprimer ce client ?')) return;
    try {
      const { error } = await window.supabase.from('clients').delete().eq('id', Number(id));
      if (error) { alert('❌ Erreur : ' + error.message); return; }
      if (typeof window.renderClientsTableGlobal === 'function') await window.renderClientsTableGlobal();
    } catch(e) { console.error('❌ Exception:', e); }
  };

  if (addContactBtn) addContactBtn.addEventListener('click', () => window.openContactModal());

  // ── TÂCHES ──
  const tasksTbody   = document.getElementById('tasks-table-body');
  const addTaskBtn   = document.getElementById('add-task-admin');
  const tasksSection = document.getElementById('tache');
  const tasksLink    = document.querySelector('a[href="#tache"]');

  async function loadTasks() {
    try {
      if (!window.supabase) return [];
      const { data, error } = await window.supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } catch(e) { return []; }
  }

  async function renderTasksTable() {
    const arr = await loadTasks();
    tasksTbody.innerHTML = '';
    if (arr.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="5" class="activity-empty">Aucune tâche.</td>';
      tasksTbody.appendChild(tr);
      return;
    }
    arr.forEach(t => {
      const tr = document.createElement('tr');
      tr.className = 'task-row';
      const dateStr = new Date(t.due_date || t.dueDate).toLocaleDateString('fr-FR');
      const priorityColor = t.priority==='Haute'?'#ef4444':t.priority==='Moyenne'?'#f59e0b':'#10b981';
      const priorityBg    = t.priority==='Haute'?'rgba(239,68,68,0.12)':t.priority==='Moyenne'?'rgba(245,158,11,0.12)':'rgba(16,185,129,0.12)';
      const statusColor   = t.status==='À faire'?'#9fb6d6':t.status==='En cours'?'#f59e0b':'#10b981';
      const statusBg      = t.status==='À faire'?'rgba(159,182,214,0.12)':t.status==='En cours'?'rgba(245,158,11,0.12)':'rgba(16,185,129,0.12)';
      tr.innerHTML = `<td><div class="task-title">${escapeHtml(t.title||'—')}</div><div class="task-desc">${escapeHtml(t.description||'')}</div></td><td><span class="priority-pill" style="background:${priorityBg};color:${priorityColor}">${escapeHtml(t.priority||'—')}</span></td><td><span class="status-pill" style="background:${statusBg};color:${statusColor}">${escapeHtml(t.status||'—')}</span></td><td>${dateStr}</td><td><div class="action-links" style="display:flex;gap:8px;"><span class="edit-task" data-id="${t.id}" style="cursor:pointer;padding:6px 10px;background:rgba(16,185,129,0.1);border-radius:6px;font-size:16px;">✏️</span><span class="del-task" data-id="${t.id}" style="cursor:pointer;padding:6px 10px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:16px;">🗑️</span></div></td>`;
      tasksTbody.appendChild(tr);
    });
    tasksTbody.querySelectorAll('.edit-task').forEach(el => el.addEventListener('click', e => editTask(Number(e.target.dataset.id))));
    tasksTbody.querySelectorAll('.del-task').forEach(el  => el.addEventListener('click', e => deleteTask(Number(e.target.dataset.id))));
  }

  const taskModal  = document.getElementById('task-modal');
  const taskForm   = document.getElementById('task-form');
  const taskCancel = document.getElementById('task-cancel');

  function openTaskModal() { taskModal.classList.remove('hidden'); taskModal.setAttribute('aria-hidden','false'); document.getElementById('task-title').focus(); }
  function closeTaskModal() { taskModal.classList.add('hidden'); taskModal.setAttribute('aria-hidden','true'); }
  taskCancel.addEventListener('click', closeTaskModal);
  taskModal.addEventListener('click', e => { if (e.target === taskModal) closeTaskModal(); });

  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('task-id').value;
    const title  = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-desc').value.trim();
    const priority = document.getElementById('task-priority').value;
    const status   = document.getElementById('task-status').value;
    const dueDate  = document.getElementById('task-due').value || new Date().toISOString().split('T')[0];
    if (!title) { alert('❌ Le titre est requis'); return; }
    try {
      if (editId) {
        const { error } = await window.supabase.from('tasks').update({ title, description, priority, status, due_date: dueDate }).eq('id', parseInt(editId));
        if (error) { alert('❌ Erreur lors de la mise à jour'); return; }
      } else {
        const { error } = await window.supabase.from('tasks').insert([{ id: Date.now(), title, description, priority, status, due_date: dueDate }]);
        if (error) { alert('❌ Erreur lors de l\'ajout'); return; }
      }
      await renderTasksTable();
      closeTaskModal();
    } catch(e) { alert('❌ Erreur: ' + e.message); }
  });

  function addTaskAdmin() {
    document.getElementById('task-id').value = '';
    taskForm.reset();
    document.getElementById('task-modal-title').textContent = 'Ajouter une tâche';
    document.getElementById('task-submit-btn').textContent = 'Ajouter';
    openTaskModal();
  }

  async function editTask(id) {
    const arr = await loadTasks();
    const task = arr.find(x => x.id === id);
    if (!task) return;
    document.getElementById('task-id').value = id;
    document.getElementById('task-title').value = task.title || '';
    document.getElementById('task-desc').value   = task.description || '';
    document.getElementById('task-priority').value = task.priority || 'Basse';
    document.getElementById('task-status').value   = task.status   || 'À faire';
    document.getElementById('task-due').value      = task.due_date || task.dueDate || '';
    document.getElementById('task-modal-title').textContent   = 'Modifier la tâche';
    document.getElementById('task-submit-btn').textContent    = 'Enregistrer';
    openTaskModal();
  }

  async function deleteTask(id) {
    if (!confirm('Supprimer cette tâche ?')) return;
    const { error } = await window.supabase.from('tasks').delete().eq('id', id);
    if (error) { alert('❌ Erreur lors de la suppression'); return; }
    await renderTasksTable();
  }

  if (tasksLink) {
    tasksLink.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAllSections();
      tasksSection.classList.remove('hidden');
      await renderTasksTable();
    });
  }

  if (addTaskBtn) addTaskBtn.addEventListener('click', addTaskAdmin);

  // ── ÉVÉNEMENTS / VENTES ──
  const eventsTbody   = document.getElementById('events-table-body');
  const addEventBtn   = document.getElementById('add-event-admin');
  const eventsSection = document.getElementById('evenements');
  const eventsLink    = document.querySelector('a[href="#evenements"]');

  function loadEvents()     { try { const raw = localStorage.getItem('zenoccaz_events'); return raw ? JSON.parse(raw) : []; } catch(e) { return []; } }
  function saveEvents(arr)  { try { localStorage.setItem('zenoccaz_events', JSON.stringify(arr)); } catch(e) {} }

  function renderEventsTable() {
    const arr = loadEvents();
    eventsTbody.innerHTML = '';
    if (arr.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="6" class="activity-empty">Aucune vente.</td>';
      eventsTbody.appendChild(tr);
      return;
    }
    arr.forEach(e => {
      const tr = document.createElement('tr');
      tr.className = 'event-row';
      const dateStr = new Date(e.date).toLocaleDateString('fr-FR');
      const statusColor = e.status==='Complétée'?'#10b981':e.status==='En cours'?'#f59e0b':'#9fb6d6';
      const statusBg    = e.status==='Complétée'?'rgba(16,185,129,0.12)':e.status==='En cours'?'rgba(245,158,11,0.12)':'rgba(159,182,214,0.12)';
      tr.innerHTML = `<td><div class="event-client">${escapeHtml(e.client||'—')}</div></td><td>${escapeHtml(e.vehicle||'—')}</td><td>${escapeHtml(e.price||'')} €</td><td>${dateStr}</td><td><span class="status-pill" style="background:${statusBg};color:${statusColor}">${escapeHtml(e.status||'—')}</span></td><td><div class="action-links"><span class="del-event" data-id="${e.id}" style="color:#ef4444;cursor:pointer;">Supprimer</span></div></td>`;
      eventsTbody.appendChild(tr);
    });
    eventsTbody.querySelectorAll('.del-event').forEach(el => el.addEventListener('click', e => deleteEvent(Number(e.target.dataset.id))));
  }

  const eventModal  = document.getElementById('event-modal');
  const eventForm   = document.getElementById('event-form');
  const eventCancel = document.getElementById('event-cancel');

  function openEventModal() { eventModal.classList.remove('hidden'); eventModal.setAttribute('aria-hidden','false'); eventForm.reset(); document.getElementById('event-client').focus(); }
  function closeEventModal() { eventModal.classList.add('hidden'); eventModal.setAttribute('aria-hidden','true'); }
  eventCancel.addEventListener('click', closeEventModal);
  eventModal.addEventListener('click', e => { if (e.target === eventModal) closeEventModal(); });

  eventForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const client  = document.getElementById('event-client').value.trim();
    const vehicle = document.getElementById('event-vehicle').value.trim();
    const price   = document.getElementById('event-price').value.trim();
    const status  = document.getElementById('event-status').value;
    if (!client || !vehicle || !price) return;
    const arr = loadEvents();
    arr.unshift({ id: Date.now(), client, vehicle, price, status, date: new Date().toISOString() });
    saveEvents(arr);
    renderEventsTable();
    closeEventModal();
  });

  function deleteEvent(id) {
    if (!confirm('Supprimer cette vente ?')) return;
    saveEvents(loadEvents().filter(e => e.id !== id));
    renderEventsTable();
  }

  if (eventsLink) {
    eventsLink.addEventListener('click', (e) => {
      e.preventDefault();
      hideAllSections();
      eventsSection.classList.remove('hidden');
      renderEventsTable();
    });
  }

  if (addEventBtn) addEventBtn.addEventListener('click', openEventModal);

  // ── PIÈCES ──
  const piecesTbody   = document.getElementById('pieces-table-body');
  const addPieceBtn   = document.getElementById('add-piece-admin');
  const piecesSection = document.getElementById('pieces');
  const piecesLink    = document.querySelector('a[href="#pieces"]');

  async function loadPieces() {
    try {
      if (!window.supabase) return [];
      const { data, error } = await window.supabase.from('pieces').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } catch(e) { return []; }
  }

  async function renderPiecesTable() {
    const arr = await loadPieces();
    piecesTbody.innerHTML = '';
    if (arr.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="5" class="activity-empty">Aucune pièce.</td>';
      piecesTbody.appendChild(tr);
      return;
    }
    arr.forEach(p => {
      const tr = document.createElement('tr');
      tr.className = 'piece-row';
      tr.style.background = 'rgba(255,255,255,0.02)';
      tr.innerHTML = `<td style="padding:20px 16px;"><div style="display:flex;align-items:center;gap:12px;"><div style="width:40px;height:40px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">⚙️</div><div style="font-weight:600;color:var(--text);font-size:15px;">${escapeHtml(p.name||'—')}</div></div></td><td style="padding:20px 16px;"><span style="font-family:monospace;font-size:13px;color:var(--muted);background:rgba(255,255,255,0.05);padding:6px 12px;border-radius:6px;">${escapeHtml(p.reference||'—')}</span></td><td style="padding:20px 16px;"><div style="font-weight:700;color:#10b981;font-size:17px;">${escapeHtml(p.price||'0')} €</div></td><td style="padding:20px 16px;"><div style="display:inline-flex;align-items:center;gap:8px;background:rgba(59,130,246,0.1);padding:8px 16px;border-radius:20px;border:1px solid rgba(59,130,246,0.2);"><span style="font-weight:600;color:#60a5fa;">${escapeHtml(p.stock||'0')}</span><span style="font-size:12px;color:var(--muted);">unités</span></div></td><td style="padding:20px 16px;text-align:right;"><div class="action-links" style="display:flex;gap:10px;justify-content:flex-end;"><span class="edit-piece" data-id="${p.id}" style="cursor:pointer;padding:8px 12px;background:rgba(16,185,129,0.1);border-radius:6px;font-size:16px;">✏️</span><span class="del-piece" data-id="${p.id}" style="cursor:pointer;padding:8px 12px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:16px;">🗑️</span></div></td>`;
      piecesTbody.appendChild(tr);
    });
    piecesTbody.querySelectorAll('.edit-piece').forEach(el => el.addEventListener('click', e => editPiece(Number(e.target.dataset.id))));
    piecesTbody.querySelectorAll('.del-piece').forEach(el  => el.addEventListener('click', e => deletePiece(Number(e.target.dataset.id))));
  }

  const pieceModal  = document.getElementById('piece-modal');
  const pieceForm   = document.getElementById('piece-form');
  const pieceCancel = document.getElementById('piece-cancel');

  function openPieceModal() { pieceModal.classList.remove('hidden'); pieceModal.setAttribute('aria-hidden','false'); pieceForm.reset(); document.getElementById('piece-name').focus(); }
  function closePieceModal() { pieceModal.classList.add('hidden'); pieceModal.setAttribute('aria-hidden','true'); }
  pieceCancel.addEventListener('click', closePieceModal);
  pieceModal.addEventListener('click', e => { if (e.target === pieceModal) closePieceModal(); });

  pieceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name      = document.getElementById('piece-name').value.trim();
    const reference = document.getElementById('piece-ref').value.trim();
    const price     = document.getElementById('piece-price').value.trim();
    const stock     = document.getElementById('piece-stock').value.trim() || '0';
    if (!name || !price) { alert('❌ Le nom et le prix sont requis'); return; }
    const id = Date.now();
    try {
      const { error: pieceError } = await window.supabase.from('pieces').insert([{ id, name, reference, price: parseFloat(price), stock: parseInt(stock) }]);
      if (pieceError) { alert('❌ Erreur lors de l\'ajout de la pièce'); return; }
      await window.supabase.from('finances').insert([{ id: Date.now()+1, description:`Achat pièce: ${name}${reference?' (Réf: '+reference+')':''}`, type:'expense', amount: parseFloat(price), category:'parts', piece_id: id }]);
      await renderPiecesTable();
      closePieceModal();
      if (!financeSection.classList.contains('hidden')) await updateFinanceDashboard();
    } catch(e) { alert('❌ Erreur: ' + e.message); }
  });

  async function editPiece(id) {
    const arr   = await loadPieces();
    const piece = arr.find(x => x.id === id);
    if (!piece) return;
    const name      = prompt('Nom de la pièce', piece.name) || piece.name;
    const reference = prompt('Référence', piece.reference) || piece.reference;
    const price     = prompt('Prix (€)', piece.price) || piece.price;
    const stock     = prompt('Stock (unités)', piece.stock) || piece.stock;
    try {
      const { error } = await window.supabase.from('pieces').update({ name, reference, price: parseFloat(price), stock: parseInt(stock) }).eq('id', id);
      if (error) { alert('❌ Erreur lors de la mise à jour'); return; }
      await renderPiecesTable();
    } catch(e) { console.error('❌ Exception:', e); }
  }

  async function deletePiece(id) {
    if (!confirm('Supprimer cette pièce ?')) return;
    try {
      const { data: financeEntries } = await window.supabase.from('finances').select('*').eq('piece_id', id);
      if (financeEntries) for (const entry of financeEntries) await window.supabase.from('finances').delete().eq('id', entry.id);
      await window.supabase.from('pieces').delete().eq('id', id);
      await renderPiecesTable();
      if (!financeSection.classList.contains('hidden')) await updateFinanceDashboard();
    } catch(e) { console.error('❌ Exception:', e); }
  }

  if (piecesLink) {
    piecesLink.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAllSections();
      piecesSection.classList.remove('hidden');
      await renderPiecesTable();
    });
  }

  if (addPieceBtn) addPieceBtn.addEventListener('click', () => openPieceModal());

  // ── PARRAINAGES ──
  const parrainage_tbody   = document.getElementById('parrainage-table-body');
  const addParrainageBtn   = document.getElementById('add-parrainage-admin');
  const parrainage_section = document.getElementById('parrainages');
  const parrainage_link    = document.querySelector('a[href="#parrainages"]');

  async function loadParrainages() {
    try {
      if (!window.supabase) return [];
      const { data, error } = await window.supabase.from('parrainages').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } catch(e) { return []; }
  }

  async function renderParrainageTable() {
    const arr = await loadParrainages();
    parrainage_tbody.innerHTML = '';
    if (arr.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="7" class="activity-empty">Aucun parrainage.</td>';
      parrainage_tbody.appendChild(tr);
      return;
    }
    arr.forEach(pa => {
      const tr = document.createElement('tr');
      tr.className = 'parrainage-row';
      const dateStr = new Date(pa.created_at || pa.date).toLocaleDateString('fr-FR');
      const rewardText = pa.reward_type==='bon_125'?'🎁 Bon 125€':pa.reward_type==='vidange_75'?'🔧 Vidange 75€':'—';
      const statusColorMap = {'Actif':'#10b981','Fini':'#3b82f6','Archivé':'#6b7280'};
      const statusBgMap    = {'Actif':'rgba(16,185,129,0.12)','Fini':'rgba(59,130,246,0.12)','Archivé':'rgba(107,114,128,0.12)'};
      const sc = statusColorMap[pa.status] || '#9fb6d6';
      const sb = statusBgMap[pa.status]    || 'rgba(159,182,214,0.12)';
      tr.innerHTML = `<td style="padding:16px 12px;"><div style="display:flex;align-items:center;"><div style="width:40px;height:40px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">👤</div><div style="margin-left:12px;"><div style="font-weight:600;color:var(--text);">${escapeHtml(pa.parrain||'—')}</div><div style="font-size:13px;color:var(--muted);">${escapeHtml(pa.parrain_email||'')}</div></div></div></td><td style="padding:16px 12px;">${escapeHtml(pa.filleul||'—')}</td><td style="padding:16px 12px;color:#a855f7;">${rewardText}</td><td style="padding:16px 12px;"><span style="background:${sb};color:${sc};padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;">${escapeHtml(pa.status||'—')}</span></td><td style="padding:16px 12px;color:#a855f7;font-weight:600;">${escapeHtml(pa.commission||'0')} €</td><td style="padding:16px 12px;color:var(--muted);font-size:13px;">${dateStr}</td><td style="padding:16px 12px;"><div class="action-links" style="display:flex;gap:8px;flex-wrap:wrap;"><button class="send-mail-btn" data-email="${escapeHtml(pa.parrain_email||''||'no-email')}" data-name="${escapeHtml(pa.parrain||'—')}" data-filleul="${escapeHtml(pa.filleul||'—')}" data-commission="${escapeHtml(String(pa.commission||'0'))}" data-status="${escapeHtml(pa.status||'—')}" data-date="${dateStr}" style="cursor:pointer;padding:6px 10px;background:rgba(59,130,246,0.1);border:none;border-radius:6px;font-size:16px;cursor:pointer;">📧</button><span class="edit-parrainage" data-id="${pa.id}" style="cursor:pointer;padding:6px 10px;background:rgba(16,185,129,0.1);border-radius:6px;font-size:16px;">✏️</span><span class="del-parrainage" data-id="${pa.id}" style="cursor:pointer;padding:6px 10px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:16px;">🗑️</span></div></td>`;
      parrainage_tbody.appendChild(tr);
    });
    parrainage_tbody.querySelectorAll('.edit-parrainage').forEach(el => el.addEventListener('click', e => editParrainage(Number(e.target.dataset.id))));
    parrainage_tbody.querySelectorAll('.del-parrainage').forEach(el  => el.addEventListener('click', e => deleteParrainage(Number(e.target.dataset.id))));
    parrainage_tbody.querySelectorAll('.send-mail-btn').forEach(btn => btn.addEventListener('click', (e) => {
      const d = e.target.dataset;
      if(!d.email){ alert('❌ Email manquant pour ce parrain'); return; }
      showMailOptions(d.email, d.name, d.filleul, d.commission, d.status, d.date);
    }));
  }


  function showMailOptions(toEmail, name, filleul, commission, status, date){
    const subject = `Commission parrainage - ${commission}€`
    const body = `Bonjour ${name},\n\nNous vous remercions pour votre parrainage de ${filleul}.\n\nVoici le détail de votre commission :\n- Montant : ${commission}€\n- Statut : ${status}\n- Date : ${date}\n\nCordialement,\nL\'équipe ZenOccaz`
    const modalHtml = `<div id="mail-choice-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(4px);"><div style="background:var(--card-bg,#0f1419);padding:32px;border-radius:16px;max-width:600px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);max-height:90vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.08);"><h3 style="margin:0 0 8px;color:var(--text);font-size:20px;">📧 Informations pour le mail</h3><p style="color:var(--muted);margin:0 0 24px;font-size:14px;">Copiez ces informations et ouvrez votre messagerie</p><div style="display:flex;flex-direction:column;gap:16px;"><div style="background:rgba(59,130,246,0.1);padding:16px;border-radius:8px;border:1px solid rgba(59,130,246,0.2);"><div style="font-size:14px;color:#60a5fa;font-weight:600;margin-bottom:8px;">📋 Instructions :</div><ol style="margin:0;padding-left:20px;color:var(--text);font-size:13px;line-height:1.8;"><li>Copiez les informations ci-dessous</li><li>Ouvrez Gmail ou votre messagerie</li><li>Connectez-vous avec : <strong>serviceclient.zenoccaz@gmail.com</strong></li><li>Créez un nouveau message et collez les informations</li></ol></div><div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><label style="font-size:13px;color:var(--muted);font-weight:600;">À :</label><button id="copy-to-btn" style="padding:4px 12px;background:rgba(59,130,246,0.2);border:none;border-radius:6px;color:#60a5fa;font-size:12px;cursor:pointer;">📋 Copier</button></div><input readonly value="${toEmail}" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box;"></div><div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><label style="font-size:13px;color:var(--muted);font-weight:600;">Objet :</label><button id="copy-subject-btn" style="padding:4px 12px;background:rgba(59,130,246,0.2);border:none;border-radius:6px;color:#60a5fa;font-size:12px;cursor:pointer;">📋 Copier</button></div><input readonly value="${subject}" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box;"></div><div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><label style="font-size:13px;color:var(--muted);font-weight:600;">Message :</label><button id="copy-body-btn" style="padding:4px 12px;background:rgba(59,130,246,0.2);border:none;border-radius:6px;color:#60a5fa;font-size:12px;cursor:pointer;">📋 Copier</button></div><textarea readonly style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:var(--text);font-size:14px;min-height:180px;resize:vertical;font-family:inherit;box-sizing:border-box;">${body}</textarea></div><button id="copy-all-btn" style="padding:16px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:10px;color:white;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-size:15px;">📋 Tout copier dans le presse-papier</button><div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;"><div style="font-size:13px;color:var(--muted);margin-bottom:12px;font-weight:600;">🔗 Ouvrir votre messagerie :</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><a href="https://mail.google.com" target="_blank" style="padding:12px;background:rgba(234,67,53,0.15);border:1px solid rgba(234,67,53,0.3);border-radius:8px;text-decoration:none;color:#ea4335;font-weight:600;text-align:center;font-size:13px;">📬 Gmail</a><a href="https://outlook.live.com/mail" target="_blank" style="padding:12px;background:rgba(0,120,212,0.15);border:1px solid rgba(0,120,212,0.3);border-radius:8px;text-decoration:none;color:#0078d4;font-weight:600;text-align:center;font-size:13px;">📮 Outlook</a></div></div></div><button id="cancel-mail-btn" style="margin-top:20px;width:100%;padding:12px;background:rgba(255,255,255,0.1);border:none;border-radius:8px;color:var(--text);font-weight:500;cursor:pointer;">Fermer</button></div></div>`
    document.body.insertAdjacentHTML('beforeend', modalHtml)
    const modal = document.getElementById('mail-choice-modal')
    function copyToClipboard(text, btn){ navigator.clipboard.writeText(text).then(()=>{ const t=btn.textContent; btn.textContent='✓ Copié !'; btn.style.background='rgba(16,185,129,0.3)'; setTimeout(()=>{ btn.textContent=t; btn.style.background='rgba(59,130,246,0.2)' },2000) }).catch(()=>alert('❌ Erreur de copie')) }
    document.getElementById('copy-to-btn').addEventListener('click',(e)=>copyToClipboard(toEmail,e.target))
    document.getElementById('copy-subject-btn').addEventListener('click',(e)=>copyToClipboard(subject,e.target))
    document.getElementById('copy-body-btn').addEventListener('click',(e)=>copyToClipboard(body,e.target))
    document.getElementById('copy-all-btn').addEventListener('click',(e)=>copyToClipboard(`À : ${toEmail}\n\nObjet : ${subject}\n\nMessage :\n${body}`,e.target))
    document.getElementById('cancel-mail-btn').addEventListener('click',()=>modal.remove())
    modal.addEventListener('click',(e)=>{ if(e.target.id==='mail-choice-modal') modal.remove() })
  }

  async function updateParrainageStats() {
    const arr = await loadParrainages();
    document.getElementById('parrainage-count').textContent        = arr.filter(p => p.status==='Actif').length;
    document.getElementById('parrainage-conversions').textContent   = arr.filter(p => p.status==='Actif' && p.filleul).length;
    document.getElementById('parrainage-commissions').textContent   = arr.reduce((s,p) => s + (parseFloat(p.commission)||0), 0).toFixed(2) + ' €';
  }

  const parrainageModal  = document.getElementById('parrainage-modal');
  const parrainageForm   = document.getElementById('parrainage-form');
  const parrainageCancel = document.getElementById('parrainage-cancel');

  function openParrainageModal() { parrainageModal.classList.remove('hidden'); parrainageModal.setAttribute('aria-hidden','false'); parrainageForm.reset(); document.getElementById('parr-parrain').focus(); }
  function closeParrainageModal() { parrainageModal.classList.add('hidden'); parrainageModal.setAttribute('aria-hidden','true'); }
  parrainageCancel.addEventListener('click', closeParrainageModal);
  parrainageModal.addEventListener('click', e => { if (e.target === parrainageModal) closeParrainageModal(); });

  parrainageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId        = document.getElementById('parr-id').value;
    const parrain       = document.getElementById('parr-parrain').value.trim();
    const parrain_email = document.getElementById('parr-email').value.trim();
    const filleul       = document.getElementById('parr-filleul').value.trim();
    const reward_type   = document.getElementById('parr-reward').value;
    const status        = document.getElementById('parr-status').value;
    const commission    = document.getElementById('parr-commission').value.trim() || '0';
    if (!parrain) { alert('❌ Le nom du parrain est requis'); return; }
    try {
      if (editId) {
        // Vérifier le statut précédent pour savoir si on doit incrémenter
        const { data: prev } = await window.supabase.from('parrainages').select('status').eq('id', parseInt(editId)).maybeSingle();
        const { error } = await window.supabase.from('parrainages').update({ parrain, parrain_email, filleul, reward_type, status, commission: parseFloat(commission) }).eq('id', parseInt(editId));
        if (error) { alert('❌ Erreur lors de la mise à jour'); return; }
        // Auto-sync : si le statut PASSE à Actif (et n'était pas déjà Actif)
        if (status === 'Actif' && prev?.status !== 'Actif' && parrain_email) await incrementParrainageFidelite(parrain_email);
      } else {
        const { error } = await window.supabase.from('parrainages').insert([{ id: Date.now(), parrain, parrain_email, filleul, reward_type, status, commission: parseFloat(commission) }]);
        if (error) { alert('❌ Erreur lors de l\'ajout'); return; }
        // Auto-sync : si statut Actif dès la création → incrémenter le compteur
        if (status === 'Actif' && parrain_email) await incrementParrainageFidelite(parrain_email);
      }
      await renderParrainageTable();
      await updateParrainageStats();
      closeParrainageModal();
    } catch(e) { alert('❌ Erreur: ' + e.message); }
  });

  function addParrainageAdmin() {
    document.getElementById('parr-id').value = '';
    document.getElementById('parrainage-modal-title').textContent = 'Ajouter un parrainage';
    document.getElementById('parrainage-submit-btn').textContent  = 'Ajouter';
    openParrainageModal();
  }

  async function editParrainage(id) {
    const arr = await loadParrainages();
    const pa  = arr.find(x => x.id === id);
    if (!pa) return;
    document.getElementById('parr-id').value        = id;
    document.getElementById('parr-parrain').value   = pa.parrain || '';
    document.getElementById('parr-email').value     = pa.parrain_email || '';
    document.getElementById('parr-filleul').value   = pa.filleul || '';
    document.getElementById('parr-reward').value    = pa.reward_type || 'bon_125';
    document.getElementById('parr-status').value    = pa.status || 'Actif';
    document.getElementById('parr-commission').value = pa.commission || '0';
    document.getElementById('parrainage-modal-title').textContent = 'Modifier le parrainage';
    document.getElementById('parrainage-submit-btn').textContent  = 'Enregistrer';
    openParrainageModal();
  }

  async function deleteParrainage(id) {
    if (!confirm('Supprimer ce parrainage ?')) return;
    const { error } = await window.supabase.from('parrainages').delete().eq('id', id);
    if (error) { alert('❌ Erreur lors de la suppression'); return; }
    await renderParrainageTable();
    await updateParrainageStats();
  }

  if (parrainage_link) {
    parrainage_link.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAllSections();
      parrainage_section.classList.remove('hidden');
      await renderParrainageTable();
      await updateParrainageStats();
    });
  }

  if (addParrainageBtn) addParrainageBtn.addEventListener('click', addParrainageAdmin);

  // ── FINANCES ──
  const financeSection = document.getElementById('finances');
  const financesLink   = document.querySelector('a[href="#finances"]');

  async function loadFinances() {
    try {
      if (!window.supabase) return [];
      const { data, error } = await window.supabase.from('finances').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } catch(e) { return []; }
  }

  function triggerMarginEffect(netMargin) {
    if (window.marginEffectActive) return;
    window.marginEffectActive = true;
    const isPositive = netMargin > 0;
    const isNegative = netMargin < 0;
    if (!isPositive && !isNegative) { window.marginEffectActive = false; return; }

    const gold      = '#c9a84c';
    const goldBright= '#f0c040';
    const goldDim   = 'rgba(201,168,76,0.12)';
    const goldGlow  = 'rgba(201,168,76,0.45)';
    const red       = '#cc2200';
    const redBright = '#ff3311';
    const redGlow   = 'rgba(204,34,0,0.5)';
    const accent    = isPositive ? goldBright : '#ff6622';
    const accentGlow= isPositive ? goldGlow   : 'rgba(255,102,34,0.5)';
    const status    = isPositive ? 'SYSTEMS NOMINAL' : 'ALERT — CHECK FINANCES';
    const sign      = isPositive ? '+' : '';

    if (!document.getElementById('mk-style')) {
      const s = document.createElement('style');
      s.id = 'mk-style';
      s.textContent = `
        @keyframes mkIn    { from{opacity:0;transform:translateY(16px) scale(0.96);} to{opacity:1;transform:translateY(0) scale(1);} }
        @keyframes mkOut   { from{opacity:1;transform:scale(1);} to{opacity:0;transform:translateY(8px) scale(0.97);} }
        @keyframes mkSpin  { from{transform:rotate(0deg);}   to{transform:rotate(360deg);}  }
        @keyframes mkSpinR { from{transform:rotate(0deg);}   to{transform:rotate(-360deg);} }
        @keyframes mkPulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        @keyframes mkBlink { 0%,49%{opacity:1;} 50%,100%{opacity:0;} }
        @keyframes mkArc   { from{stroke-dashoffset:200;} to{stroke-dashoffset:0;} }
        @keyframes mkFade  { from{opacity:0;} to{opacity:1;} }
        .mk-spin  { animation:mkSpin  9s linear infinite; transform-origin:50% 50%; }
        .mk-spinr { animation:mkSpinR 6s linear infinite; transform-origin:50% 50%; }
      `;
      document.head.appendChild(s);
    }

    const arc = (r, sa, ea) => {
      const s=(sa-90)*Math.PI/180, e=(ea-90)*Math.PI/180;
      const x1=r*Math.cos(s),y1=r*Math.sin(s),x2=r*Math.cos(e),y2=r*Math.sin(e);
      return `M${x1},${y1} A${r},${r} 0 ${ea-sa>180?1:0},1 ${x2},${y2}`;
    };

    const hud = document.createElement('div');
    hud.style.cssText = `
      position:fixed; bottom:28px; right:28px; z-index:9999;
      width:500px;
      animation: mkIn 0.45s cubic-bezier(0.16,1,0.3,1) forwards;
      pointer-events:none;
      filter: drop-shadow(0 0 24px ${accentGlow}) drop-shadow(0 0 8px ${redGlow});
    `;

    hud.innerHTML = `<svg width="500" height="294" viewBox="0 0 340 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="mkglow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="mkglow2" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="mkbg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#1a0800" stop-opacity="0.97"/>
          <stop offset="100%" stop-color="#0d0300" stop-opacity="0.97"/>
        </linearGradient>
        <linearGradient id="mkgold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="${goldBright}"/>
          <stop offset="100%" stop-color="${gold}"/>
        </linearGradient>
        <linearGradient id="mkred" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="${redBright}"/>
          <stop offset="100%" stop-color="${red}"/>
        </linearGradient>
        <clipPath id="mkclip">
          <path d="M16,0 L324,0 L340,16 L340,184 L324,200 L16,200 L0,184 L0,16 Z"/>
        </clipPath>
      </defs>

      <!-- Fond avec clip forme casque coupé -->
      <path d="M16,0 L324,0 L340,16 L340,184 L324,200 L16,200 L0,184 L0,16 Z"
            fill="url(#mkbg)" stroke="${gold}" stroke-width="1" opacity="0.95"/>

      <!-- Double bordure or intérieure -->
      <path d="M18,2 L322,2 L338,18 L338,182 L322,198 L18,198 L2,182 L2,18 Z"
            fill="none" stroke="${gold}" stroke-width="0.4" opacity="0.25"/>

      <!-- Liseré rouge haut -->
      <path d="M16,0 L324,0 L340,16" fill="none" stroke="url(#mkred)" stroke-width="2" filter="url(#mkglow)"/>
      <path d="M0,184 L16,200 L324,200 L340,184" fill="none" stroke="url(#mkred)" stroke-width="2" filter="url(#mkglow)"/>

      <!-- Ligne séparatrice header -->
      <line x1="0" y1="30" x2="340" y2="30" stroke="${gold}" stroke-width="0.6" opacity="0.35"/>

      <!-- Petit triangle déco gauche header -->
      <polygon points="8,8 20,8 8,20" fill="${red}" opacity="0.7" filter="url(#mkglow)"/>

      <!-- Header texte -->
      <text x="28" y="20" font-family="'Courier New',monospace" font-size="9" font-weight="700"
            letter-spacing="3" fill="${goldBright}" filter="url(#mkglow)" opacity="0.9">
        STARK INDUSTRIES // FINANCIAL CORE
      </text>
      <text x="332" y="20" font-family="'Courier New',monospace" font-size="8" text-anchor="end"
            fill="${red}" filter="url(#mkglow)" style="animation:mkBlink 1.4s step-end infinite">
        ◆ ONLINE
      </text>

      <!-- ── CERCLE RÉACTEUR gauche ── -->
      <g transform="translate(72,115)">
        <!-- Halo -->
        <circle cx="0" cy="0" r="46" fill="none" stroke="${gold}" stroke-width="0.3" opacity="0.12"/>
        <!-- Anneaux rotatifs -->
        <g class="mk-spin">
          <path d="${arc(44, 0, 80)}"   fill="none" stroke="${gold}" stroke-width="1"   opacity="0.5" stroke-linecap="round"/>
          <path d="${arc(44,100,200)}"  fill="none" stroke="${gold}" stroke-width="1"   opacity="0.5" stroke-linecap="round"/>
          <path d="${arc(44,220,310)}"  fill="none" stroke="${gold}" stroke-width="1"   opacity="0.5" stroke-linecap="round"/>
          <circle cx="${44*Math.cos(-10*Math.PI/180)}" cy="${44*Math.sin(-10*Math.PI/180)}" r="2.5" fill="${goldBright}" filter="url(#mkglow)"/>
        </g>
        <g class="mk-spinr">
          <path d="${arc(34, 0,140)}"   fill="none" stroke="${redBright}" stroke-width="0.8" opacity="0.55" stroke-linecap="round"/>
          <path d="${arc(34,160,310)}"  fill="none" stroke="${redBright}" stroke-width="0.8" opacity="0.55" stroke-linecap="round"/>
          <circle cx="${34*Math.cos(50*Math.PI/180)}" cy="${34*Math.sin(50*Math.PI/180)}" r="1.8" fill="${redBright}" filter="url(#mkglow)"/>
        </g>
        <!-- Arc progression -->
        <circle cx="0" cy="0" r="26" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="5"/>
        <circle cx="0" cy="0" r="26" fill="none" stroke="url(#mkgold)" stroke-width="5"
          stroke-dasharray="163" stroke-dashoffset="163"
          stroke-linecap="round" transform="rotate(-90)"
          style="animation:mkArc 2s cubic-bezier(0.4,0,0.2,1) 0.2s forwards; filter:drop-shadow(0 0 5px ${goldGlow})"/>
        <!-- Core rouge -->
        <circle cx="0" cy="0" r="18" fill="rgba(140,20,0,0.25)" stroke="${red}" stroke-width="0.8"/>
        <circle cx="0" cy="0" r="10" fill="rgba(200,40,0,0.3)"  stroke="${redBright}" stroke-width="0.5"/>
        <circle cx="0" cy="0" r="5"  fill="${redBright}" filter="url(#mkglow2)"
          style="animation:mkPulse 1.8s ease-in-out infinite"/>
        <!-- Croix déco -->
        <line x1="-18" y1="0" x2="18" y2="0" stroke="${gold}" stroke-width="0.5" opacity="0.3"/>
        <line x1="0" y1="-18" x2="0" y2="18" stroke="${gold}" stroke-width="0.5" opacity="0.3"/>
      </g>

      <!-- ── ZONE DONNÉES droite ── -->

      <!-- Valeur principale -->
      <text x="148" y="80" font-family="'Courier New',monospace" font-size="40" font-weight="900"
            letter-spacing="1" fill="url(#mkgold)" filter="url(#mkglow2)"
            style="animation:mkFade 0.6s ease-out 0.3s both">
        ${sign}${netMargin.toFixed(2)}
      </text>
      <text x="148" y="100" font-family="'Courier New',monospace" font-size="13" font-weight="700"
            letter-spacing="3" fill="${gold}" filter="url(#mkglow)" opacity="0.8"
            style="animation:mkFade 0.6s ease-out 0.5s both">
        EUROS
      </text>

      <!-- Séparateur or fin -->
      <line x1="148" y1="112" x2="330" y2="112" stroke="${gold}" stroke-width="0.6" opacity="0.3"/>

      <!-- Status -->
      <text x="148" y="128" font-family="'Courier New',monospace" font-size="9" letter-spacing="3"
            fill="${isPositive ? goldBright : redBright}" filter="url(#mkglow)"
            style="animation:mkFade 0.5s ease-out 0.7s both">
        ▸ ${status}
      </text>

      <!-- Données URSSAF -->
      <text x="148" y="148" font-family="'Courier New',monospace" font-size="8" letter-spacing="1"
            fill="${gold}" opacity="0.5" style="animation:mkFade 0.5s ease-out 0.9s both">
        MARGE NETTE APRÈS URSSAF (${isPositive?'21.4':'—'}%)
      </text>
      <line x1="148" y1="155" x2="330" y2="155" stroke="${gold}" stroke-width="0.3" opacity="0.15"/>

      <!-- Footer -->
      <text x="148" y="178" font-family="'Courier New',monospace" font-size="7.5" letter-spacing="2"
            fill="${gold}" opacity="0.3">
        J.A.R.V.I.S v4.2 // ZENOCCAZ CORE
      </text>
      <text x="332" y="178" font-family="'Courier New',monospace" font-size="7.5" text-anchor="end"
            letter-spacing="1" fill="${red}" opacity="0.6">
        PWR ${isPositive?'100':'072'}%
      </text>

      <!-- Déco coins bas -->
      <polygon points="0,184 0,200 16,200" fill="${red}" opacity="0.4" filter="url(#mkglow)"/>
      <polygon points="340,184 340,200 324,200" fill="${red}" opacity="0.4" filter="url(#mkglow)"/>
    </svg>`;

    document.body.appendChild(hud);
    setTimeout(() => {
      hud.style.animation = 'mkOut 0.4s ease-in forwards';
      setTimeout(() => { hud.remove(); window.marginEffectActive = false; }, 400);
    }, 5500);
  }

  async function updateFinanceDashboard() {
    const arr = await loadFinances();
    let revenue = 0, expenses = 0, vehicleRevenue = 0, zenscanRevenue = 0;
    const vehiclesHtml = [], reprisesHtml = [], partsHtml = [];
    arr.forEach(f => {
      const amount = parseFloat(f.amount) || 0;
      if (f.type === 'revenue') {
        revenue += amount;
        if (f.category === 'vehicle') vehicleRevenue += amount;
        else if (f.category === 'zenscan') zenscanRevenue += amount;
      } else { expenses += amount; }
      const dateStr = new Date(f.created_at || f.date).toLocaleDateString('fr-FR');
      const item = `<div style="padding:12px;background:rgba(255,255,255,0.02);border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:600;color:var(--text)">${escapeHtml(f.description||'—')}</div><div style="font-size:13px;color:var(--muted)">${dateStr}</div></div><div style="color:${f.type==='revenue'?'#10b981':'#ef4444'};font-weight:700;">${f.type==='revenue'?'+':'-'}${Math.abs(amount)} €</div></div>`;
      if (f.category === 'vehicle') vehiclesHtml.push(item);
      else if (f.category === 'reprise') reprisesHtml.push(item);
      else if (f.category === 'parts') partsHtml.push(item);
    });
    const urssafVehicleTaxKpi = vehicleRevenue * 0.126;
    const urssafZenscanTaxKpi = zenscanRevenue * 0.214;
    const netMarginAfterUrssaf = (vehicleRevenue - urssafVehicleTaxKpi) + (zenscanRevenue - urssafZenscanTaxKpi) - expenses;
    const margin = revenue > 0 ? ((netMarginAfterUrssaf/revenue)*100).toFixed(1) : 0;
    document.getElementById('finance-revenue').textContent  = revenue.toFixed(2)+' €';
    document.getElementById('finance-expenses').textContent = expenses.toFixed(2)+' €';
    document.getElementById('finance-profit').textContent   = netMarginAfterUrssaf.toFixed(2)+' €';
    document.getElementById('finance-margin').textContent   = margin+'%';
    const urssafVehicleTax  = vehicleRevenue * 0.126;
    const netMarginVehicle  = vehicleRevenue - urssafVehicleTax;
    const urssafZenscanTax  = zenscanRevenue * 0.214;
    const netMarginZenscan  = zenscanRevenue - urssafZenscanTax;
    const totalGlobalMargin = netMarginVehicle + netMarginZenscan;
    document.getElementById('urssaf-vehicle-revenue').textContent     = vehicleRevenue.toFixed(2)+' €';
    document.getElementById('urssaf-vehicle-tax').textContent         = urssafVehicleTax.toFixed(2)+' €';
    document.getElementById('urssaf-vehicle-net').textContent         = netMarginVehicle.toFixed(2)+' €';
    document.getElementById('urssaf-vehicle-net-percent').textContent = (vehicleRevenue>0?((netMarginVehicle/vehicleRevenue)*100).toFixed(1):0)+'% du revenu brut';
    document.getElementById('urssaf-zenscan-revenue').textContent     = zenscanRevenue.toFixed(2)+' €';
    document.getElementById('urssaf-zenscan-tax').textContent         = urssafZenscanTax.toFixed(2)+' €';
    document.getElementById('urssaf-zenscan-net').textContent         = netMarginZenscan.toFixed(2)+' €';
    document.getElementById('urssaf-zenscan-net-percent').textContent = (zenscanRevenue>0?((netMarginZenscan/zenscanRevenue)*100).toFixed(1):0)+'% du revenu brut';
    document.getElementById('total-vehicle-margin').textContent = netMarginVehicle.toFixed(2)+' €';
    document.getElementById('total-zenscan-margin').textContent = netMarginZenscan.toFixed(2)+' €';
    document.getElementById('total-global-margin').textContent  = totalGlobalMargin.toFixed(2)+' €';
    triggerMarginEffect(totalGlobalMargin);
    document.getElementById('finance-vehicles').innerHTML  = vehiclesHtml.length>0  ? vehiclesHtml.join('')  : '<div class="activity-empty">Aucun véhicule vendu.</div>';
    const rc = reprisesHtml.length;
    document.getElementById('finance-reprises').innerHTML  = rc>0 ? `<div style="background:rgba(59,130,246,0.1);padding:10px;border-radius:6px;margin-bottom:12px;border-left:3px solid #3b82f6;"><div style="color:#3b82f6;font-weight:700;">${rc} véhicule${rc>1?'s':''} acheté${rc>1?'s':''}</div></div>`+reprisesHtml.join('') : '<div class="activity-empty">Aucun véhicule acheté.</div>';
    document.getElementById('finance-parts').innerHTML     = partsHtml.length>0     ? partsHtml.join('')     : '<div class="activity-empty">Aucun achat de pièce.</div>';
    await checkMonthlyArchive();
  }

  async function checkMonthlyArchive() {
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const lastArchive = localStorage.getItem('last_finance_archive');
      if (!lastArchive || lastArchive !== currentMonth) {
        if (lastArchive) {
          const finances = await loadFinances();
          const lastMonthDate = new Date(lastArchive+'-01');
          const previousMonthData = finances.filter(f => {
            const d = new Date(f.created_at || f.date);
            return d.getMonth()===lastMonthDate.getMonth() && d.getFullYear()===lastMonthDate.getFullYear();
          });
          if (previousMonthData.length > 0) await archiveMonth(lastArchive, previousMonthData);
        }
        localStorage.setItem('last_finance_archive', currentMonth);
      }
    } catch(e) { console.error('❌ Erreur vérification archive mensuelle:', e); }
  }

  async function archiveMonth(monthStr, financeData) {
    try {
      let totalRevenue=0, totalExpenses=0, vehicleRevenue=0, zenscanRevenue=0;
      let vehicleCount=0, zenscanCount=0, repriseCount=0, partsCount=0;
      financeData.forEach(f => {
        const amount = parseFloat(f.amount)||0;
        if (f.type==='revenue') {
          totalRevenue += amount;
          if (f.category==='vehicle') { vehicleRevenue+=amount; vehicleCount++; }
          else if (f.category==='zenscan') { zenscanRevenue+=amount; zenscanCount++; }
        } else {
          totalExpenses += amount;
          if (f.category==='reprise') repriseCount++;
          else if (f.category==='parts') partsCount++;
        }
      });
      const [year, month] = monthStr.split('-');
      const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
      const monthName = `${monthNames[parseInt(month)-1]} ${year}`;
      const urssafVehicleTax = vehicleRevenue*0.126, urssafZenscanTax = zenscanRevenue*0.214;
      const netMarginVehicle = vehicleRevenue-urssafVehicleTax, netMarginZenscan = zenscanRevenue-urssafZenscanTax;
      const archiveData = { month: monthStr, month_name: monthName, total_revenue: totalRevenue, total_expenses: totalExpenses, total_profit: totalRevenue-totalExpenses, vehicle_revenue: vehicleRevenue, zenscan_revenue: zenscanRevenue, vehicle_count: vehicleCount, zenscan_count: zenscanCount, reprise_count: repriseCount, parts_count: partsCount, urssaf_vehicle_tax: urssafVehicleTax, urssaf_zenscan_tax: urssafZenscanTax, net_margin_vehicle: netMarginVehicle, net_margin_zenscan: netMarginZenscan, net_margin_total: netMarginVehicle+netMarginZenscan, pdf_generated: false };
      // Vérifier si l'archive existe déjà pour ce mois (évite les doublons)
      const { data: existing } = await window.supabase.from('finance_archives').select('id').eq('month', monthStr).single();
      if (existing) { console.log('Archive déjà existante pour', monthStr); return; }

      const { error } = await window.supabase.from('finance_archives').insert([archiveData]);
      if (error) { console.error('❌ Erreur sauvegarde archive:', error); return; }

      // Récupérer aussi les ZenScan archivés du mois pour les inclure dans le PDF
      const [archYear, archMonth] = monthStr.split('-');
      const { data: zenscanArchived } = await window.supabase
        .from('zenscan_archives')
        .select('*')
        .gte('archived_at', `${archYear}-${archMonth}-01`)
        .lt('archived_at', `${archYear}-${String(parseInt(archMonth)+1).padStart(2,'0')}-01`);

      await generateMonthlyPDF(monthName, archiveData, financeData, zenscanArchived || []);

      // Remettre les compteurs finances à zéro (supprimer les entrées du mois archivé)
      const idsToDelete = financeData.map(f => f.id);
      if (idsToDelete.length > 0) await window.supabase.from('finances').delete().in('id', idsToDelete);

      // Notification discrète (toast au lieu d'alert bloquante)
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.4);border-radius:8px;padding:14px 24px;color:#10b981;font-family:monospace;font-size:13px;letter-spacing:0.05em;box-shadow:0 4px 20px rgba(16,185,129,0.2);';
      toast.textContent = `✅ Archive mensuelle générée — ${monthName} — PDF téléchargé`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
    } catch(e) { console.error('❌ Erreur archivage:', e); }
  }

  async function generateMonthlyPDF(monthName, stats, financeData, zenscanArchived = []) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let y = 20;

      // ── HEADER ──
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
      doc.setFontSize(18); doc.setFont('helvetica','bold'); doc.setTextColor(16, 185, 129);
      doc.text('ZENOCCAZ', 105, 16, { align:'center' });
      doc.setFontSize(11); doc.setTextColor(148, 163, 184);
      doc.text(`Rapport Financier Mensuel — ${monthName}`, 105, 26, { align:'center' });
      doc.setFontSize(8); doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 105, 34, { align:'center' });
      y = 50;

      // ── RÉSUMÉ KPI ──
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11); doc.setFont('helvetica','bold');
      doc.text('RÉSUMÉ FINANCIER', 20, y); y += 8;
      doc.setFontSize(9); doc.setFont('helvetica','normal');

      const kpis = [
        ['Revenus totaux',    `${stats.total_revenue.toFixed(2)} €`,  [16,185,129]],
        ['Dépenses totales',  `${stats.total_expenses.toFixed(2)} €`, [239,68,68]],
        ['Bénéfice brut',     `${stats.total_profit.toFixed(2)} €`,   [59,130,246]],
        ['Marge nette totale',`${stats.net_margin_total.toFixed(2)} €`,[16,185,129]],
      ];
      kpis.forEach(([label, val, rgb]) => {
        doc.setTextColor(100,116,139); doc.text(label + ' :', 25, y);
        doc.setTextColor(...rgb); doc.setFont('helvetica','bold'); doc.text(val, 100, y);
        doc.setFont('helvetica','normal'); y += 7;
      });
      y += 5;

      // ── VENTE VOITURES ──
      doc.setDrawColor(16,185,129); doc.line(20, y, 190, y); y += 6;
      doc.setTextColor(30,41,59); doc.setFont('helvetica','bold'); doc.setFontSize(10);
      doc.text('VENTE VOITURES  (URSSAF 12,6%)', 20, y); y += 7;
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(71,85,105);
      doc.text(`Revenus : ${stats.vehicle_revenue.toFixed(2)} €`, 28, y); y += 5;
      doc.text(`Cotisations URSSAF : ${stats.urssaf_vehicle_tax.toFixed(2)} €`, 28, y); y += 5;
      doc.setTextColor(16,185,129); doc.setFont('helvetica','bold');
      doc.text(`Marge nette : ${stats.net_margin_vehicle.toFixed(2)} €`, 28, y); y += 5;
      doc.setTextColor(100,116,139); doc.setFont('helvetica','normal');
      doc.text(`Véhicules vendus : ${stats.vehicle_count}`, 28, y); y += 10;

      // ── DÉPANNAGE ZENSCAN ──
      doc.setDrawColor(249,115,22); doc.line(20, y, 190, y); y += 6;
      doc.setTextColor(30,41,59); doc.setFont('helvetica','bold'); doc.setFontSize(10);
      doc.text('DÉPANNAGE ZENSCAN  (URSSAF 21,4%)', 20, y); y += 7;
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(71,85,105);
      doc.text(`Revenus : ${stats.zenscan_revenue.toFixed(2)} €`, 28, y); y += 5;
      doc.text(`Cotisations URSSAF : ${stats.urssaf_zenscan_tax.toFixed(2)} €`, 28, y); y += 5;
      doc.setTextColor(16,185,129); doc.setFont('helvetica','bold');
      doc.text(`Marge nette : ${stats.net_margin_zenscan.toFixed(2)} €`, 28, y); y += 5;
      doc.setTextColor(100,116,139); doc.setFont('helvetica','normal');
      doc.text(`Interventions effectuées : ${stats.zenscan_count}`, 28, y); y += 12;

      // ── TOTAL ENCADRÉ ──
      doc.setFillColor(16,185,129); doc.rect(20, y-2, 170, 12, 'F');
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(11);
      doc.text(`MARGE NETTE TOTALE APRÈS URSSAF : ${stats.net_margin_total.toFixed(2)} €`, 105, y+6, { align:'center' });
      y += 20;

      // ── DÉTAILS TRANSACTIONS FINANCES ──
      if (y > 230) { doc.addPage(); y = 20; }
      doc.setDrawColor(200,200,200); doc.line(20, y, 190, y); y += 6;
      doc.setTextColor(30,41,59); doc.setFont('helvetica','bold'); doc.setFontSize(10);
      doc.text('DÉTAIL DES TRANSACTIONS', 20, y); y += 8;
      doc.setFontSize(8); doc.setFont('helvetica','normal');
      financeData.forEach(f => {
        if (y > 270) { doc.addPage(); y = 20; }
        const date = new Date(f.created_at||f.date).toLocaleDateString('fr-FR');
        const sign = f.type==='revenue' ? '+' : '-';
        const col  = f.type==='revenue' ? [16,185,129] : [239,68,68];
        doc.setTextColor(100,116,139); doc.text(date, 22, y);
        doc.setTextColor(30,41,59);    doc.text(f.description||'N/A', 50, y);
        doc.setTextColor(...col); doc.setFont('helvetica','bold');
        doc.text(`${sign} ${Math.abs(parseFloat(f.amount)||0).toFixed(2)} €`, 175, y, { align:'right' });
        doc.setFont('helvetica','normal'); y += 6;
      });

      // ── DÉTAILS INTERVENTIONS ZENSCAN ──
      if (zenscanArchived.length > 0) {
        if (y > 230) { doc.addPage(); y = 20; }
        y += 4;
        doc.setDrawColor(249,115,22); doc.line(20, y, 190, y); y += 6;
        doc.setTextColor(30,41,59); doc.setFont('helvetica','bold'); doc.setFontSize(10);
        doc.text('DÉTAIL DES INTERVENTIONS ZENSCAN', 20, y); y += 8;
        doc.setFontSize(8); doc.setFont('helvetica','normal');
        zenscanArchived.forEach(z => {
          if (y > 270) { doc.addPage(); y = 20; }
          const date = new Date(z.archived_at).toLocaleDateString('fr-FR');
          doc.setTextColor(100,116,139); doc.text(date, 22, y);
          doc.setTextColor(30,41,59);    doc.text(z.client_name||'—', 50, y);
          doc.setTextColor(71,85,105);   doc.text(z.dest||'—', 100, y);
          doc.setTextColor(16,185,129);  doc.setFont('helvetica','bold');
          doc.text(z.total||'—', 175, y, { align:'right' });
          doc.setFont('helvetica','normal'); y += 6;
        });
      }

      doc.save(`ZENOCCAZ_Finances_${monthName.replace(' ','_')}.pdf`);
    } catch(e) { console.error('❌ Erreur génération PDF:', e); }
  }

  const financeModal  = document.getElementById('finance-modal');
  const financeForm   = document.getElementById('finance-form');
  const financeCancel = document.getElementById('finance-cancel');

  function openFinanceModal() { financeModal.classList.remove('hidden'); financeModal.setAttribute('aria-hidden','false'); financeForm.reset(); document.getElementById('fin-desc').focus(); }
  function closeFinanceModal() { financeModal.classList.add('hidden'); financeModal.setAttribute('aria-hidden','true'); }
  financeCancel.addEventListener('click', closeFinanceModal);
  financeModal.addEventListener('click', e => { if (e.target === financeModal) closeFinanceModal(); });

  financeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const description = document.getElementById('fin-desc').value.trim();
    const type        = document.getElementById('fin-type').value;
    const amount      = document.getElementById('fin-amount').value.trim();
    const category    = document.getElementById('fin-category').value;
    if (!description || !amount) { alert('❌ La description et le montant sont requis'); return; }
    try {
      const { error } = await window.supabase.from('finances').insert([{ id: Date.now(), description, type, amount: parseFloat(amount), category }]);
      if (error) { alert('❌ Erreur lors de l\'ajout'); return; }
      await updateFinanceDashboard();
      closeFinanceModal();
    } catch(e) { alert('❌ Erreur: ' + e.message); }
  });

  if (financesLink) {
    financesLink.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAllSections();
      financeSection.classList.remove('hidden');
      await updateFinanceDashboard();
    });
  }

  // ── ZENSCAN ──
  const zenscanTbody   = document.getElementById('zenscan-table-body');
  const zenscanSection = document.getElementById('zenscan');
  const zenscanLink    = document.querySelector('a[href="#zenscan"]');

  async function loadZenscans() {
    try {
      if (!window.supabase) return [];
      const { data, error } = await window.supabase.from('zenscan_requests').select('*, clients(name, email, phone)').order('created_at', { ascending: false });
      if (error) {
        // Fallback sans join si la relation n'existe pas
        const { data: data2 } = await window.supabase.from('zenscan_requests').select('*').order('created_at', { ascending: false });
        return data2 || [];
      }
      return data || [];
    } catch(e) { return []; }
  }

  // Vérifie s'il y a des nouvelles demandes non confirmées et affiche badge
  // ── Fonction générique pour badge de notification ──
  function setBadge(href, count) {
    const link = document.querySelector('a[href="' + href + '"]');
    if (!link) return;
    let badge = link.querySelector('.zenscan-new-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'zenscan-new-badge';
        link.appendChild(badge);
      }
      badge.textContent = count;
    } else {
      if (badge) badge.remove();
    }
  }

  function getReadIds(key) {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  function markAsRead(key, id) {
    const ids = getReadIds(key);
    if (!ids.includes(id)) { ids.push(id); localStorage.setItem(key, JSON.stringify(ids)); }
  }

  // Badge Contacts — nouvelles entrées non lues
  async function checkNewContacts() {
    try {
      if (!window.supabase) return;
      const { data } = await window.supabase.from('clients').select('id').order('created_at', { ascending: false }).limit(50);
      const all = (data || []).map(r => r.id);
      const read = getReadIds('contacts_read');
      setBadge('#clients', all.filter(id => !read.includes(id)).length);
    } catch(e) {}
  }

  // Badge Reprises — statut 'en_attente' non lues
  async function checkNewReprises() {
    try {
      if (!window.supabase) return;
      const { data } = await window.supabase.from('reprises').select('id, status');
      const pending = (data || []).filter(r => r.status === 'en_attente' || !r.status);
      const read = getReadIds('reprises_read');
      setBadge('#reprises', pending.filter(r => !read.includes(r.id)).length);
    } catch(e) {}
  }

  // Badge Avis — avis non lus
  async function checkNewAvis() {
    try {
      if (!window.supabase) return;
      const { data } = await window.supabase.from('reviews').select('id').order('created_at', { ascending: false }).limit(50);
      const all = (data || []).map(r => r.id);
      const read = getReadIds('avis_read');
      setBadge('#avis', all.filter(id => !read.includes(id)).length);
    } catch(e) {}
  }

  // Lancer tous les badges au chargement + toutes les 30s
  async function checkAllBadges() {
    await Promise.all([checkNewContacts(), checkNewReprises(), checkNewAvis(), checkNewZenscanRequests()]);
  }

  async function checkNewZenscanRequests() {
    try {
      if (!window.supabase) return;
      const { data } = await window.supabase.from('zenscan_requests').select('id, confirmed').eq('confirmed', false);
      // ZenScan : compte uniquement les non-confirmées (badge baisse à la confirmation)
      const count = (data || []).length;
      const link = document.querySelector('a[href="#zenscan"]');
      if (!link) return;
      let badge = link.querySelector('.zenscan-new-badge');
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'zenscan-new-badge';
          link.appendChild(badge);
        }
        badge.textContent = count;
        // Notification sonore si nouvelle demande
        if (window._lastZenscanCount !== undefined && count > window._lastZenscanCount) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 880; gain.gain.value = 0.1;
            osc.start(); osc.stop(ctx.currentTime + 0.2);
          } catch(e) {}
        }
        window._lastZenscanCount = count;
      } else {
        if (badge) badge.remove();
        window._lastZenscanCount = 0;
      }
    } catch(e) {}
  }
  // Vérifier toutes les 30 secondes
  checkAllBadges();
  setInterval(checkAllBadges, 30000);

  async function renderZenscanTable() {
    const arr = await loadZenscans();
    zenscanTbody.innerHTML = '';
    if (arr.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="7" class="activity-empty">Aucune demande ZenScan.</td>';
      zenscanTbody.appendChild(tr);
      return;
    }
    arr.forEach(r => {
      const tr = document.createElement('tr');
      const dateStr = new Date(r.created_at||r.date).toLocaleDateString('fr-FR')+' '+new Date(r.created_at||r.date).toLocaleTimeString('fr-FR');
      const clientInfo = r.clients || null;
      const clientName = clientInfo ? escapeHtml(clientInfo.name) : ('Contact #'+(r.contactId||r.contact_id||'—'));
      const clientEmail = clientInfo ? (clientInfo.email || '—') : '—';
      const clientPhone = clientInfo ? (clientInfo.phone || '—') : '—';
      const clientContact = '<div style="font-size:11px;color:#f97316;margin-top:3px;">' + escapeHtml(clientEmail) + ' · ' + escapeHtml(clientPhone) + '</div>';
      const breakdownRaw = r.breakdown||'';
      let servicesPreview='', servicesFullText='';
      if (breakdownRaw) {
        servicesFullText = breakdownRaw;
        const firstLine = breakdownRaw.split('\n')[0].trim();
        servicesPreview = escapeHtml(firstLine.substring(0,50))+(firstLine.length>50||breakdownRaw.split('\n').length>1?'...':'');
      } else if ((r.services||[]).length) {
        servicesFullText = (r.services||[]).join('\n');
        servicesPreview = escapeHtml((r.services||[])[0].substring(0,50))+((r.services||[])[0].length>50||(r.services||[]).length>1?'...':'');
      } else { servicesPreview='—'; servicesFullText='—'; }
      const statusBadge = r.paid
        ? '<span style="background:rgba(16,185,129,0.18);color:#10b981;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600;">💶 Payé</span>'
        : r.confirmed
          ? '<span style="background:rgba(59,130,246,0.12);color:#3b82f6;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600;">✓ Confirmé</span>'
          : '';
      const confirmBtn = r.confirmed ? '' : `<button class="confirm-zenscan" data-id="${r.id}" data-total="${escapeHtml(r.total||'')}" data-client="${escapeHtml(clientName)}" style="background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.2);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:16px;" title="Confirmer">✅</button>`;
      const payBtn = (r.confirmed && !r.paid) ? `<button class="pay-zenscan" data-id="${r.id}" data-total="${escapeHtml(r.total||'')}" data-client="${escapeHtml(clientName)}" style="background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.4);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;" title="Marquer comme payé">💶 Payé</button>` : '';
      tr.innerHTML = `<td style="white-space:nowrap;">${r.id}</td><td style="min-width:160px">${clientName}${clientContact}</td><td style="cursor:pointer;color:#f97316;" class="zenscan-view-details" data-id="${r.id}" title="Voir les détails">${servicesPreview}</td><td style="min-width:180px">${escapeHtml(r.dest||'—')}</td><td style="white-space:nowrap">${escapeHtml(r.total||'—')} ${statusBadge}</td><td style="white-space:nowrap">${dateStr}</td><td><div class="action-links" style="display:flex;gap:6px;flex-wrap:wrap;">${confirmBtn}${payBtn}<button class="del-zenscan" data-id="${r.id}" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:16px;" title="Supprimer">🗑️</button></div></td>`;
      tr.dataset.zenscanData = JSON.stringify({ id:r.id, client:clientName, services:servicesFullText, dest:r.dest||'—', total:r.total||'—', date:dateStr, confirmed:r.confirmed, paid:r.paid });
      // Appliquer style "lu" si déjà ouvert
      const readIds = JSON.parse(localStorage.getItem('zenscan_read') || '[]');
      if (readIds.includes(r.id)) tr.classList.add('zenscan-row-read');
      zenscanTbody.appendChild(tr);
    });
    zenscanTbody.querySelectorAll('.zenscan-view-details').forEach(el => el.addEventListener('click', e => {
      const row = e.target.closest('tr');
      const data = JSON.parse(row.dataset.zenscanData);
      // Marquer comme lu visuellement + mémoriser dans localStorage
      row.classList.add('zenscan-row-read');
      const readIds = JSON.parse(localStorage.getItem('zenscan_read') || '[]');
      if (!readIds.includes(data.id)) { readIds.push(data.id); localStorage.setItem('zenscan_read', JSON.stringify(readIds)); }
      showZenscanDetails(data);
    }));
    zenscanTbody.querySelectorAll('.confirm-zenscan').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); confirmZenscan(Number(e.target.dataset.id), e.target.dataset.total, e.target.dataset.client); }));
    zenscanTbody.querySelectorAll('.pay-zenscan').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); payerZenscan(Number(e.target.closest('button').dataset.id), e.target.closest('button').dataset.total, e.target.closest('button').dataset.client); }));
    zenscanTbody.querySelectorAll('.del-zenscan').forEach(el  => el.addEventListener('click', e => { e.stopPropagation(); deleteZenscan(Number(e.target.dataset.id)); }));
  }

  const zenscanDetailsModal = document.getElementById('zenscan-details-modal');
  const zenscanDetailsClose = document.getElementById('zenscan-details-close');

  function showZenscanDetails(data) {
    const content = document.getElementById('zenscan-details-content');
    const servicesLines = data.services.split('\n').map(line => `<div style="padding:8px;background:rgba(249,115,22,0.05);border-left:3px solid #f97316;margin-bottom:8px;border-radius:4px;">${escapeHtml(line)}</div>`).join('');
    content.innerHTML = `<div style="background:rgba(255,255,255,0.02);padding:16px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);"><div style="display:grid;gap:12px;"><div><strong style="color:var(--muted);">Référence:</strong> <span style="color:var(--text);">${data.id}</span></div><div><strong style="color:var(--muted);">Client:</strong> <span style="color:var(--text);">${data.client}</span></div><div><strong style="color:var(--muted);">Date:</strong> <span style="color:var(--text);">${data.date}</span></div><div><strong style="color:var(--muted);">Destination:</strong> <span style="color:var(--text);">${escapeHtml(data.dest)}</span></div><div><strong style="color:var(--muted);">Total:</strong> <span style="color:#10b981;font-size:18px;font-weight:700;">${escapeHtml(data.total)}</span></div>${data.confirmed?'<div><span style="background:rgba(16,185,129,0.12);color:#10b981;padding:6px 12px;border-radius:6px;font-weight:600;">✓ Confirmé</span></div>':''}</div></div><div style="margin-top:16px;"><strong style="color:var(--text);margin-bottom:12px;display:block;">Services demandés:</strong>${servicesLines}</div>`;
    zenscanDetailsModal.classList.remove('hidden');
    zenscanDetailsModal.setAttribute('aria-hidden','false');
  }

  zenscanDetailsClose.addEventListener('click', () => { zenscanDetailsModal.classList.add('hidden'); zenscanDetailsModal.setAttribute('aria-hidden','true'); });
  zenscanDetailsModal.addEventListener('click', e => { if (e.target===zenscanDetailsModal) { zenscanDetailsModal.classList.add('hidden'); zenscanDetailsModal.setAttribute('aria-hidden','true'); } });


  // ══════════════════════════════════════════════════════
  // AUTO-SYNC FIDÉLITÉ — incrémente les compteurs client
  // ══════════════════════════════════════════════════════

  async function incrementFidelite(clientEmail, field) {
    if (!clientEmail) return;
    try {
      // 1. Trouver le client par email
      const { data: client } = await window.supabase
        .from('clients').select('id, name').eq('email', clientEmail).maybeSingle();
      if (!client) return;
      const clientId = client.id;

      // 2. Récupérer ou créer la carte fidélité
      const { data: carte } = await window.supabase
        .from('fidelite_carte').select('*').eq('client_id', clientId).maybeSingle();

      if (carte) {
        const newVal = (carte[field] || 0) + 1;
        await window.supabase.from('fidelite_carte')
          .update({ [field]: newVal }).eq('client_id', clientId);
      } else {
        await window.supabase.from('fidelite_carte').insert([{
          client_id:    clientId,
          client_name:  client.name  || null,
          client_email: clientEmail,
          [field]: 1
        }]);
      }

      // 3. Recharger la fiche si elle est ouverte pour ce client
      const modal = document.getElementById('fidelite-modal');
      if (modal && !modal.classList.contains('hidden')) {
        // Recharger données fraîches et rouvrir la fiche
        const { data: clientFrais } = await window.supabase
          .from('clients')
          .select('id, name, email, phone, adresse, created_at, vip_status, nb_apporteurs, vip_note, vip_validated_at')
          .eq('id', clientId).single();
        const { data: carteFraiche } = await window.supabase
          .from('fidelite_carte').select('*').eq('client_id', clientId).maybeSingle();
        if (clientFrais && typeof window.openContactFicheGlobal === 'function') {
          window.openContactFicheGlobal(clientFrais, clientFrais, carteFraiche || null);
        }
      }

      // 4. Recharger le tableau clients
      if (typeof window.renderClientsTableGlobal === 'function') await window.renderClientsTableGlobal();

      if (typeof showToast === 'function') showToast('✅ Carte fidélité mise à jour automatiquement');
      console.log(`✅ Fidélité auto-sync : ${field} +1 pour ${clientEmail}`);
    } catch(e) { console.warn('incrementFidelite:', e.message); }
  }

  async function incrementParrainageFidelite(parrainEmail) {
    if (!parrainEmail) return;
    try {
      // 1. Trouver le client parrain
      const { data: client } = await window.supabase
        .from('clients').select('id, nb_apporteurs').eq('email', parrainEmail).maybeSingle();
      if (!client) return;
      const clientId = client.id;

      // 2. Incrémenter nb_parrainages_valides dans fidelite_carte
      await incrementFidelite(parrainEmail, 'nb_parrainages_valides');

      // 3. Incrémenter nb_apporteurs dans clients
      const newNb = (client.nb_apporteurs || 0) + 1;
      await window.supabase.from('clients')
        .update({ nb_apporteurs: newNb, vip_status: newNb >= 1 ? true : false })
        .eq('id', clientId);
      console.log(`✅ Ambassadeur auto-sync : nb_apporteurs ${newNb} pour ${parrainEmail}`);
    } catch(e) { console.warn('incrementParrainageFidelite:', e.message); }
  }

  async function confirmZenscan(id, totalStr, clientName) {
    if (!confirm(`Confirmer la demande ZenScan pour ${clientName} (${totalStr}) ?`)) return;
    try {
      // Récupérer l'email du client avant de confirmer
      const { data: req } = await window.supabase.from('zenscan_requests').select('client_email').eq('id', id).maybeSingle();

      const { error: updateError } = await window.supabase.from('zenscan_requests').update({ confirmed:true }).eq('id', id);
      if (updateError) { alert('❌ Erreur lors de la mise à jour'); return; }

      // Auto-sync fidélité : incrémenter nb_zenscan
      if (req?.client_email) await incrementFidelite(req.client_email, 'nb_zenscan');

      alert('✅ ZenScan confirmé ! La carte fidélité du client a été mise à jour. Cliquez sur 💶 Payé une fois l\'intervention effectuée et réglée.');
      await renderZenscanTable();
      await checkNewZenscanRequests();
    } catch(e) { alert('❌ Erreur: ' + e.message); }
  }

  async function payerZenscan(id, totalStr, clientName) {
    if (!confirm(`Marquer comme PAYÉ par ${clientName} (${totalStr}) ?\nCela comptabilisera le montant dans les finances et archivera la demande.`)) return;
    try {
      // 1. Récupérer la demande complète (sans join clients pour éviter les erreurs de relation)
      const { data: req, error: fetchError } = await window.supabase
        .from('zenscan_requests').select('*').eq('id', id).single();
      if (fetchError) { alert('❌ Erreur récupération demande : ' + fetchError.message); return; }

      // 2. Archiver dans zenscan_archives
      const clientInfo = {};  // pas de join, on utilise clientName passé en paramètre
      const { error: archiveError } = await window.supabase.from('zenscan_archives').insert([{
        id:           req.id,
        client_name:  clientInfo.name  || clientName,
        client_email: clientInfo.email || null,
        client_phone: clientInfo.phone || null,
        services:     (req.services || []).join('\n'),
        breakdown:    req.breakdown   || null,
        dest:         req.dest        || null,
        total:        req.total       || totalStr,
        confirmed:    true,
        paid:         true,
        created_at:   req.created_at  || new Date().toISOString(),
        archived_at:  new Date().toISOString()
      }]);
      if (archiveError) { alert('❌ Erreur archivage : ' + archiveError.message); return; }

      // 3. Insérer dans finances
      const amount = parseFloat(totalStr.replace(/[^0-9.-]/g,'')) || 0;
      if (amount > 0) {
        const { error: financeError } = await window.supabase.from('finances').insert([{
          id: Date.now(), description: `ZenScan: ${clientName}`,
          type: 'revenue', amount, category: 'zenscan', zenscan_id: id
        }]);
        if (financeError) { alert('❌ Erreur finances : ' + financeError.message); return; }
      }

      // 4. Supprimer de zenscan_requests
      await window.supabase.from('zenscan_requests').delete().eq('id', id);

      alert('💶 Paiement enregistré, comptabilisé et archivé !');
      await renderZenscanTable();
      await checkNewZenscanRequests();
      if (!financeSection.classList.contains('hidden')) await updateFinanceDashboard();
    } catch(e) { alert('❌ Erreur: ' + e.message); }
  }

    async function deleteZenscan(id) {
    if (!confirm('Supprimer cette demande ZenScan ?')) return;
    try {
      const { data: financeEntries } = await window.supabase.from('finances').select('*').eq('zenscan_id', id);
      if (financeEntries) for (const entry of financeEntries) await window.supabase.from('finances').delete().eq('id', entry.id);
      await window.supabase.from('zenscan_requests').delete().eq('id', id);
      await renderZenscanTable();
      if (!financeSection.classList.contains('hidden')) await updateFinanceDashboard();
    } catch(e) { console.error('❌ Exception:', e); }
  }

  if (zenscanLink) {
    zenscanLink.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAllSections();
      zenscanSection.classList.remove('hidden');
      await renderZenscanTable();
    });
  }

  // ── REPRISES ──
  const reprisesTableDiv = document.getElementById('reprises-table');
  const reprisesSection  = document.getElementById('reprises');
  const reprisesLink     = document.querySelector('a[href="#reprises"]');
  const reprisesModal    = document.getElementById('reprises-modal');
  const reprisesForm     = document.getElementById('reprises-form');

  async function loadReprises() {
    try {
      if (!window.supabase) return [];
      const { data, error } = await window.supabase.from('reprises').select('*').order('purchase_date', { ascending: false });
      if (error) return [];
      return data || [];
    } catch(e) { return []; }
  }

  async function renderReprisesTable() {
    const arr = await loadReprises();
    if (arr.length === 0) { reprisesTableDiv.innerHTML = '<div class="activity-empty" style="text-align:center;padding:40px;color:var(--muted);">Aucun véhicule repris pour le moment.</div>'; return; }
    let html = '<table style="width:100%;border-collapse:separate;border-spacing:0 8px;"><thead><tr style="color:var(--muted);font-size:13px;text-align:left;"><th style="padding:12px;">Véhicule</th><th style="padding:12px;">Vendeur</th><th style="padding:12px;">Prix d\'achat</th><th style="padding:12px;">Date</th><th style="padding:12px;">Statut</th><th style="padding:12px;">Actions</th></tr></thead><tbody>';
    arr.forEach(rep => {
      const dateStr = new Date(rep.purchase_date).toLocaleDateString('fr-FR');
      const statusColors = { 'Acheté':{bg:'rgba(59,130,246,0.12)',color:'#3b82f6'}, 'En réparation':{bg:'rgba(245,158,11,0.12)',color:'#f59e0b'}, 'Prêt à la vente':{bg:'rgba(16,185,129,0.12)',color:'#10b981'}, 'Vendu':{bg:'rgba(107,114,128,0.12)',color:'#6b7280'} };
      const st = statusColors[rep.status] || { bg:'rgba(159,182,214,0.12)', color:'#9fb6d6' };
      html += `<tr class="reprise-row" data-id="${rep.id}" style="background:rgba(255,255,255,0.02);border-radius:8px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'" title="Cliquer pour voir tous les détails"><td style="padding:20px 16px;border-top-left-radius:8px;border-bottom-left-radius:8px;"><div><div style="font-weight:600;color:var(--text);margin-bottom:4px;">${escapeHtml(rep.make)} ${escapeHtml(rep.model)}</div><div style="font-size:13px;color:var(--muted);">${rep.year} • ${rep.mileage.toLocaleString()} km • ${escapeHtml(rep.fuel_type)}</div><div style="font-size:12px;color:var(--muted);margin-top:2px;">📋 ${escapeHtml(rep.registration)}</div></div></td><td style="padding:20px 16px;"><div style="color:var(--text);font-weight:500;">${escapeHtml(rep.seller_name)}</div><div style="font-size:13px;color:var(--muted);">${escapeHtml(rep.seller_phone||'—')}</div></td><td style="padding:20px 16px;"><div style="font-weight:700;color:#10b981;font-size:16px;">${parseFloat(rep.purchase_price).toLocaleString()} €</div></td><td style="padding:20px 16px;"><div style="color:var(--muted);font-size:13px;">${dateStr}</div></td><td style="padding:20px 16px;"><span style="background:${st.bg};color:${st.color};padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;">${escapeHtml(rep.status)}</span></td><td style="padding:20px 16px;border-top-right-radius:8px;border-bottom-right-radius:8px;"><div style="display:flex;gap:8px;"><span class="edit-reprise" data-id="${rep.id}" title="Modifier" style="cursor:pointer;padding:6px 10px;background:rgba(16,185,129,0.1);border-radius:6px;font-size:16px;">✏️</span><span class="del-reprise" data-id="${rep.id}" title="Supprimer" style="cursor:pointer;padding:6px 10px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:16px;">🗑️</span></div></td></tr>`;
    });
    html += '</tbody></table>';
    reprisesTableDiv.innerHTML = html;
    document.querySelectorAll('.reprise-row').forEach(row => row.addEventListener('click', async e => {
      if (e.target.closest('.edit-reprise') || e.target.closest('.del-reprise')) return;
      const repData = arr.find(r => r.id === Number(row.dataset.id));
      if (repData) showRepriseDetails(repData);
    }));
    document.querySelectorAll('.edit-reprise').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); editReprise(Number(e.target.dataset.id)); }));
    document.querySelectorAll('.del-reprise').forEach(el  => el.addEventListener('click', e => { e.stopPropagation(); deleteReprise(Number(e.target.dataset.id)); }));
  }

  const repriseDetailsModal = document.getElementById('reprise-details-modal');
  const repriseDetailsClose = document.getElementById('reprise-details-close');

  function showRepriseDetails(rep) {
    const content = document.getElementById('reprise-details-content');
    const dateStr = new Date(rep.purchase_date).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
    const documentsHtml = (rep.documents&&rep.documents.length>0) ? rep.documents.map(doc => `<span style="background:rgba(16,185,129,0.1);color:#10b981;padding:4px 8px;border-radius:4px;font-size:12px;margin-right:8px;display:inline-block;margin-bottom:4px;">✓ ${escapeHtml(doc)}</span>`).join('') : '<span style="color:var(--muted);">Aucun document</span>';
    content.innerHTML = `<div style="background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(59,130,246,0.1));padding:20px;border-radius:12px;border:1px solid rgba(16,185,129,0.2);"><h3 style="margin:0 0 16px;color:var(--text);font-size:24px;font-weight:700;">🚗 ${escapeHtml(rep.make)} ${escapeHtml(rep.model)}</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;"><div><div style="color:var(--muted);font-size:13px;margin-bottom:4px;">Année</div><div style="color:var(--text);font-weight:600;font-size:16px;">${rep.year}</div></div><div><div style="color:var(--muted);font-size:13px;margin-bottom:4px;">Kilométrage</div><div style="color:var(--text);font-weight:600;font-size:16px;">${rep.mileage.toLocaleString()} km</div></div><div><div style="color:var(--muted);font-size:13px;margin-bottom:4px;">Carburant</div><div style="color:var(--text);font-weight:600;font-size:16px;">${escapeHtml(rep.fuel_type)}</div></div><div><div style="color:var(--muted);font-size:13px;margin-bottom:4px;">Immatriculation</div><div style="color:var(--text);font-weight:600;font-size:16px;">📋 ${escapeHtml(rep.registration)}</div></div><div><div style="color:var(--muted);font-size:13px;margin-bottom:4px;">VIN</div><div style="color:var(--text);font-weight:600;font-size:16px;">${escapeHtml(rep.vin||'—')}</div></div><div><div style="color:var(--muted);font-size:13px;margin-bottom:4px;">Statut</div><div style="color:#10b981;font-weight:600;font-size:16px;">${escapeHtml(rep.status)}</div></div></div></div><div style="background:rgba(255,255,255,0.02);padding:20px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);"><h3 style="margin:0 0 16px;color:var(--text);font-size:18px;font-weight:600;">💰 Transaction</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;"><div><div style="color:var(--muted);font-size:13px;margin-bottom:4px;">Acheteur</div><div style="color:var(--text);font-weight:600;">${escapeHtml(rep.buyer_name||'—')}</div></div><div><div style="color:var(--muted);font-size:13px;margin-bottom:4px;">Prix</div><div style="color:#10b981;font-weight:700;font-size:24px;">${parseFloat(rep.purchase_price).toLocaleString()} €</div></div><div><div style="color:var(--muted);font-size:13px;margin-bottom:4px;">Date</div><div style="color:var(--text);font-weight:600;">${dateStr}</div></div></div></div><div style="background:rgba(255,255,255,0.02);padding:20px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);"><h3 style="margin:0 0 16px;color:var(--text);font-size:18px;font-weight:600;">🔧 État</h3><div style="margin-bottom:12px;">${documentsHtml}</div></div>${rep.notes?`<div style="background:rgba(249,115,22,0.05);padding:20px;border-radius:12px;border-left:4px solid #f97316;"><h3 style="margin:0 0 12px;color:var(--text);font-size:18px;font-weight:600;">📝 Notes</h3><div style="color:var(--text);line-height:1.6;white-space:pre-wrap;">${escapeHtml(rep.notes)}</div></div>`:''}`;
    repriseDetailsModal.classList.remove('hidden');
    repriseDetailsModal.setAttribute('aria-hidden','false');
  }

  repriseDetailsClose.addEventListener('click', () => { repriseDetailsModal.classList.add('hidden'); repriseDetailsModal.setAttribute('aria-hidden','true'); });
  repriseDetailsModal.addEventListener('click', e => { if (e.target===repriseDetailsModal) { repriseDetailsModal.classList.add('hidden'); repriseDetailsModal.setAttribute('aria-hidden','true'); } });

  window.openReprisesModal = function() {
    document.getElementById('reprises-modal-title').textContent = 'Ajouter un véhicule repris';
    document.getElementById('reprise-edit-id').value = '';
    reprisesForm.reset();
    document.getElementById('rep-purchase-date').valueAsDate = new Date();
    reprisesModal.classList.remove('hidden');
    reprisesModal.setAttribute('aria-hidden','false');
  };

  window.closeReprisesModal = function() {
    reprisesModal.classList.add('hidden');
    reprisesModal.setAttribute('aria-hidden','true');
    reprisesForm.reset();
  };

  async function editReprise(id) {
    try {
      const arr = await loadReprises();
      const rep = arr.find(r => r.id===id);
      if (!rep) { alert('❌ Reprise introuvable'); return; }
      document.getElementById('reprises-modal-title').textContent = 'Modifier le véhicule repris';
      document.getElementById('reprise-edit-id').value = id;
      ['make','model','year','mileage','immat','vin','seller-name','seller-phone','seller-email','buyer-name','purchase-price','purchase-date','notes'].forEach(field => {
        const map = { 'make':'rep-make','model':'rep-model','year':'rep-year','mileage':'rep-mileage','immat':'rep-immat','vin':'rep-vin','seller-name':'rep-seller-name','seller-phone':'rep-seller-phone','seller-email':'rep-seller-email','buyer-name':'rep-buyer-name','purchase-price':'rep-purchase-price','purchase-date':'rep-purchase-date','notes':'rep-notes' };
        const el = document.getElementById(map[field]);
        if (el) el.value = rep[field.replace(/-/g,'_')]||rep[field]||'';
      });
      document.getElementById('rep-fuel').value     = rep.fuel_type||'';
      document.getElementById('rep-status').value   = rep.status||'';
      document.getElementById('rep-ct').value       = rep.technical_control||'';
      document.getElementById('rep-carnet').value   = rep.maintenance_book||'';
      document.getElementById('rep-condition').value = rep.condition||'';
      document.getElementById('rep-seller-address').value = rep.seller_address||'';
      const docs = rep.documents||[];
      ['carte-grise','certificat','non-gage','ct','factures','2cles'].forEach(id => {
        const el = document.getElementById('doc-'+id);
        if (el) el.checked = docs.includes(el.value);
      });
      reprisesModal.classList.remove('hidden');
      reprisesModal.setAttribute('aria-hidden','false');
    } catch(e) { console.error('❌ Exception:', e); alert('❌ Erreur lors du chargement'); }
  }

  async function deleteReprise(id) {
    if (!confirm('❌ Supprimer définitivement ce véhicule repris ?')) return;
    try {
      const { data: financeEntries } = await window.supabase.from('finances').select('*').eq('reprise_id', id);
      if (financeEntries) for (const entry of financeEntries) await window.supabase.from('finances').delete().eq('id', entry.id);
      await window.supabase.from('reprises').delete().eq('id', id);
      await renderReprisesTable();
      if (!financeSection.classList.contains('hidden')) await updateFinanceDashboard();
    } catch(e) { console.error('❌ Exception:', e); }
  }

  reprisesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('reprise-edit-id').value;
    const documents = ['carte-grise','certificat','non-gage','ct','factures','2cles'].reduce((acc, id) => {
      const el = document.getElementById('doc-'+id);
      if (el && el.checked) acc.push(el.value);
      return acc;
    }, []);
    const repriseData = { make:document.getElementById('rep-make').value, model:document.getElementById('rep-model').value, year:parseInt(document.getElementById('rep-year').value), mileage:parseInt(document.getElementById('rep-mileage').value), fuel_type:document.getElementById('rep-fuel').value, registration:document.getElementById('rep-immat').value, vin:document.getElementById('rep-vin').value||null, seller_name:document.getElementById('rep-seller-name').value, seller_phone:document.getElementById('rep-seller-phone').value||null, seller_email:document.getElementById('rep-seller-email').value||null, seller_address:document.getElementById('rep-seller-address').value||null, buyer_name:document.getElementById('rep-buyer-name').value, purchase_price:parseFloat(document.getElementById('rep-purchase-price').value), purchase_date:document.getElementById('rep-purchase-date').value, status:document.getElementById('rep-status').value, technical_control:document.getElementById('rep-ct').value||null, maintenance_book:document.getElementById('rep-carnet').value||null, documents, condition:document.getElementById('rep-condition').value||null, notes:document.getElementById('rep-notes').value||null };
    try {
      if (editId) {
        const { error } = await window.supabase.from('reprises').update(repriseData).eq('id', parseInt(editId));
        if (error) { alert('❌ Erreur lors de la mise à jour'); return; }
      } else {
        const { data: newReprise, error } = await window.supabase.from('reprises').insert([repriseData]).select().single();
        if (error) { alert('❌ Erreur lors de l\'ajout:\n\n'+error.message); return; }
        await window.supabase.from('finances').insert([{ id: Date.now(), description:`Achat véhicule: ${repriseData.make} ${repriseData.model}`, type:'expense', amount:repriseData.purchase_price, category:'reprise', reprise_id:newReprise.id }]);
      }
      await renderReprisesTable();
      window.closeReprisesModal();
      if (!financeSection.classList.contains('hidden')) await updateFinanceDashboard();
    } catch(e) { alert('❌ Erreur: ' + e.message); }
  });

  if (reprisesLink) {
    reprisesLink.addEventListener('click', async (e) => {
      // Marquer toutes les reprises comme lues
      const { data: repData } = await window.supabase.from('reprises').select('id').limit(50);
      if (repData) { const ids = repData.map(r => r.id); localStorage.setItem('reprises_read', JSON.stringify(ids)); setBadge('#reprises', 0); }
      e.preventDefault();
      hideAllSections();
      reprisesSection.classList.remove('hidden');
      await renderReprisesTable();
    });
  }

  // ── EXPERTISES ──
  const expertisesLink    = document.querySelector('a[href="#expertises"]');
  const expertisesSection = document.querySelector('#expertises');
  if (expertisesLink) {
    expertisesLink.addEventListener('click', (e) => {
      e.preventDefault();
      hideAllSections();
      expertisesSection.classList.remove('hidden');
    });
  }

  // ── AVIS CLIENTS ──
  const avisLink    = document.querySelector('a[href="#avis"]');
  const avisSection = document.querySelector('#avis');
  if (avisLink) {
    avisLink.addEventListener('click', async (e) => {
      // Marquer tous les avis comme lus
      const { data: avData } = await window.supabase.from('reviews').select('id').limit(50);
      if (avData) { const ids = avData.map(r => r.id); localStorage.setItem('avis_read', JSON.stringify(ids)); setBadge('#avis', 0); }
      e.preventDefault();
      hideAllSections();
      avisSection.classList.remove('hidden');
      await loadReviews();
    });
  }

  async function loadReviews() {
    try {
      if (!window.supabase) return;
      const { data, error } = await window.supabase.from('reviews').select('*').order('created_at', { ascending: false });
      if (error) return;
      await renderReviewsTable(data || []);
    } catch(e) { console.error('❌ Exception:', e); }
  }

  async function renderReviewsTable(reviews) {
    const container = document.getElementById('avis-table');
    if (!container) return;

    const total   = reviews.length;
    const average = total > 0 ? (reviews.reduce((s,r) => s + r.rating, 0) / total).toFixed(1) : 0;
    const cnt5    = reviews.filter(r => r.rating === 5).length;
    const cnt4    = reviews.filter(r => r.rating === 4).length;
    const cnt3    = reviews.filter(r => r.rating === 3).length;
    const cnt2    = reviews.filter(r => r.rating === 2).length;
    const cnt1    = reviews.filter(r => r.rating === 1).length;
    const positif = total > 0 ? Math.round(reviews.filter(r => r.rating >= 4).length / total * 100) : 0;

    // Stats
    const s = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    s('avis-total',      total);
    s('avis-5stars',     cnt5);
    s('avis-lowstars',   cnt1 + cnt2);
    s('avis-pct-positif', total > 0 ? positif + '%' : '—');

    // Note moyenne
    const avgEl = document.getElementById('avis-average');
    if (avgEl) avgEl.textContent = total > 0 ? average : '—';

    // Étoiles display
    const starsEl = document.getElementById('avis-stars-display');
    if (starsEl && total > 0) {
      const full  = Math.floor(parseFloat(average));
      const empty = 5 - full;
      starsEl.innerHTML =
        '<span style="color:#f59e0b;font-size:20px;">⭐</span>'.repeat(full) +
        '<span style="color:rgba(255,255,255,0.15);font-size:20px;">⭐</span>'.repeat(empty);
    }

    // Barres par note
    [5,4,3,2,1].forEach(n => {
      const cnt  = reviews.filter(r => r.rating === n).length;
      const pct  = total > 0 ? (cnt / total * 100) : 0;
      const bar  = document.getElementById('avis-bar-' + n);
      const cntEl = document.getElementById('avis-cnt-' + n);
      if (bar)   setTimeout(() => bar.style.width = pct + '%', 100);
      if (cntEl) cntEl.textContent = cnt;
    });

    // Empty state
    if (reviews.length === 0) {
      container.innerHTML = `<div class="avis-empty"><div class="avis-empty-icon">💬</div><p class="avis-empty-title">Aucun avis pour le moment</p><p class="avis-empty-sub">Les avis de vos clients apparaîtront ici</p></div>`;
      return;
    }

    // Cartes
    container.innerHTML = '<div class="avis-grid" id="avis-grid-inner"></div>';
    const grid = document.getElementById('avis-grid-inner');

    reviews.forEach((review, i) => {
      const date     = new Date(review.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
      const initiale = (review.client_name || '?').charAt(0).toUpperCase();
      const starsHtml = '⭐'.repeat(review.rating) + '<span style="opacity:.2">⭐</span>'.repeat(5 - review.rating);
      const starsClass = 'stars-' + review.rating;

      const card = document.createElement('div');
      card.className = `avis-card ${starsClass}`;
      card.style.animationDelay = (i * 0.05) + 's';
      card.innerHTML = `
        <div class="avis-card-top">
          <div class="avis-card-left">
            <div class="avis-avatar">${initiale}</div>
            <div>
              <p class="avis-client-name">${escapeHtml(review.client_name || '—')}</p>
              <p class="avis-date">${date}</p>
            </div>
          </div>
          <div class="avis-card-stars">${starsHtml}</div>
        </div>
        <div class="avis-card-comment">${escapeHtml(review.comment || '—')}</div>
        <div class="avis-card-actions">
          <button class="avis-del-btn" onclick="deleteReview(${review.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
            Supprimer
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  window.loadReviewsAdmin = loadReviews;

  // ── OFFRES ADMIN ──
  const offresAdminLink    = document.querySelector('a[href="#offres-admin"]');
  const offresAdminSection = document.querySelector('#offres-admin');
  if (offresAdminLink) {
    offresAdminLink.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAllSections();
      offresAdminSection.classList.remove('hidden');
      await loadOffresAdmin();
    });
  }

  const OFFRES_ADMIN_DATA = {
    printemps: { emoji:'🌸', nom:'Réveil de Printemps', couleur:'#f472b6', gradient:'linear-gradient(135deg,#f472b6,#fb923c)' },
    ete:       { emoji:'☀️', nom:'Prêt pour les Vacances', couleur:'#f59e0b', gradient:'linear-gradient(135deg,#f59e0b,#f97316)' },
    noel:      { emoji:'🎄', nom:'Cadeau Fidélité 100€', couleur:'#10b981', gradient:'linear-gradient(135deg,#10b981,#3b82f6)' },
  };

  let offresAdminAll = [];
  let offresAdminFiltre = 'tout';

  async function loadOffresAdmin() {
    const list = document.getElementById('offres-admin-list');
    if (!list) return;
    list.innerHTML = '<div class="activity-empty">Chargement...</div>';
    try {
      if (!window.supabase) return;
      // Charger les offres
      const { data, error } = await window.supabase
        .from('client_offers')
        .select('*')
        .order('activated_at', { ascending: false });

      if (error) throw error;
      const offres = data || [];

      // Charger les clients en parallèle
      const clientIds = [...new Set(offres.map(o => o.client_id))];
      let clientsMap = {};
      if (clientIds.length > 0) {
        const { data: clientsData } = await window.supabase
          .from('clients')
          .select('id, name, email')
          .in('id', clientIds);
        (clientsData || []).forEach(c => clientsMap[c.id] = c);
      }

      // Fusionner
      offresAdminAll = offres.map(o => ({ ...o, clients: clientsMap[o.client_id] || null }));

      // Stats
      const total   = offresAdminAll.length;
      const pending = offresAdminAll.filter(o => !o.used).length;
      const used    = offresAdminAll.filter(o => o.used).length;
      const s = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
      s('oa-stat-total', total);
      s('oa-stat-pending', pending);
      s('oa-stat-used', used);

      renderOffresAdmin();
    } catch(e) {
      list.innerHTML = '<div class="activity-empty">❌ Erreur : ' + escapeHtml(e.message) + '</div>';
    }
  }

  function renderOffresAdmin() {
    const list = document.getElementById('offres-admin-list');
    if (!list) return;
    let data = offresAdminAll;
    if (offresAdminFiltre === 'actif')     data = data.filter(o => !o.used);
    if (offresAdminFiltre === 'used')      data = data.filter(o => o.used);
    if (['printemps','ete','noel'].includes(offresAdminFiltre)) data = data.filter(o => o.offer_id === offresAdminFiltre);

    if (!data.length) { list.innerHTML = '<div class="activity-empty">Aucune offre pour ce filtre</div>'; return; }

    list.innerHTML = data.map((offer, i) => {
      const o    = OFFRES_ADMIN_DATA[offer.offer_id] || { emoji:'🎁', nom:offer.offer_id, couleur:'#10b981', gradient:'var(--primary)' };
      const date = new Date(offer.activated_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
      const client = offer.clients || {};
      return `
        <div class="oa-card" style="animation-delay:${i*0.04}s">
          <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${o.gradient};opacity:${offer.used?'0.3':'1'};"></div>
          <div class="oa-card-left">
            <span class="oa-emoji">${o.emoji}</span>
            <div>
              <div class="oa-saison" style="color:${o.couleur}">${o.nom}</div>
              <div class="oa-client">${escapeHtml(client.name||'Client #'+offer.client_id)}</div>
              <div class="oa-meta">${escapeHtml(client.email||'')} · Activée le ${date} · Année ${offer.offer_year}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
            <span class="oa-badge ${offer.used?'oa-badge-used':'oa-badge-active'}">${offer.used?'✓ Utilisée':'● En attente'}</span>
            ${!offer.used ? `<button class="oa-validate-btn" onclick="validerOffreAdmin(${offer.id})">✓ Valider</button>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  window.filtrerOffresAdmin = function(filtre, btn) {
    offresAdminFiltre = filtre;
    document.querySelectorAll('.oa-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderOffresAdmin();
  };

  window.validerOffreAdmin = async function(offerId) {
    if (!confirm('Confirmer que ce client a bien utilisé son offre ?')) return;
    try {
      const { error } = await window.supabase.from('client_offers').update({ used: true }).eq('id', offerId);
      if (error) throw error;
      await loadOffresAdmin();
    } catch(e) { alert('❌ Erreur : ' + e.message); }
  };



  // ── ARCHIVES ──
  const archivesLink    = document.querySelector('a[href="#archives"]');
  const archivesSection = document.querySelector('#archives');
  if (archivesLink) {
    archivesLink.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAllSections();
      archivesSection.classList.remove('hidden');
      await loadArchives();
    });
  }

  async function loadArchives() {
    try {
      if (!window.supabase) return;
      const { data, error } = await window.supabase.from('finance_archives').select('*').order('month', { ascending: false });
      if (error) { document.getElementById('archives-list').innerHTML = '<div class="activity-empty">Erreur de chargement</div>'; return; }
      if (!data || data.length === 0) { document.getElementById('archives-list').innerHTML = '<div class="activity-empty">Aucune archive disponible</div>'; return; }
      document.getElementById('archives-list').innerHTML = data.map(archive => {
        const date = new Date(archive.created_at).toLocaleDateString('fr-FR');
        return `<div style="background:linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.04);padding:24px;border-radius:12px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><div><h3 style="margin:0 0 8px;color:var(--text);font-size:20px;">📊 ${escapeHtml(archive.month_name)}</h3><div style="color:var(--muted);font-size:13px;">Archivé le ${date}</div></div><button onclick="downloadArchivePDF('${archive.month}',${JSON.stringify(archive).replace(/"/g,'&quot;')})" class="btn primary">📥 Télécharger PDF</button></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;"><div style="background:rgba(16,185,129,0.1);padding:12px;border-radius:8px;border:1px solid rgba(16,185,129,0.3);"><div style="color:var(--muted);font-size:12px;margin-bottom:4px;">Revenus totaux</div><div style="color:#10b981;font-size:18px;font-weight:700;">${parseFloat(archive.total_revenue).toFixed(2)} €</div></div><div style="background:rgba(239,68,68,0.1);padding:12px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);"><div style="color:var(--muted);font-size:12px;margin-bottom:4px;">Dépenses totales</div><div style="color:#ef4444;font-size:18px;font-weight:700;">${parseFloat(archive.total_expenses).toFixed(2)} €</div></div><div style="background:rgba(59,130,246,0.1);padding:12px;border-radius:8px;border:1px solid rgba(59,130,246,0.3);"><div style="color:var(--muted);font-size:12px;margin-bottom:4px;">Marge nette totale</div><div style="color:#3b82f6;font-size:18px;font-weight:700;">${parseFloat(archive.net_margin_total).toFixed(2)} €</div></div></div></div>`;
      }).join('');
    } catch(e) { document.getElementById('archives-list').innerHTML = '<div class="activity-empty">Erreur de chargement</div>'; }
  }

  window.downloadArchivePDF = async function(monthStr, archiveData) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let y = 20;
      doc.setFontSize(20); doc.setFont('helvetica','bold');
      doc.text('ZENOCCAZ - Rapport Financier Mensuel', 105, y, { align:'center' }); y+=15;
      doc.setFontSize(14); doc.text(archiveData.month_name, 105, y, { align:'center' }); y+=15;
      doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.text('RÉSUMÉ FINANCIER', 20, y); y+=10;
      doc.setFont('helvetica','normal'); doc.setFontSize(10);
      doc.text(`Revenus totaux: ${parseFloat(archiveData.total_revenue).toFixed(2)} €`, 20, y); y+=7;
      doc.text(`Dépenses totales: ${parseFloat(archiveData.total_expenses).toFixed(2)} €`, 20, y); y+=7;
      doc.text(`Bénéfice brut: ${parseFloat(archiveData.total_profit).toFixed(2)} €`, 20, y); y+=15;
      doc.setFont('helvetica','bold'); doc.text('VENTE VOITURES (URSSAF 12,6%)', 20, y); y+=7;
      doc.setFont('helvetica','normal');
      doc.text(`Marge nette: ${parseFloat(archiveData.net_margin_vehicle).toFixed(2)} €`, 30, y); y+=6;
      doc.text(`Véhicules vendus: ${archiveData.vehicle_count}`, 30, y); y+=12;
      doc.setFont('helvetica','bold'); doc.text('DÉPANNAGE ZENSCAN (URSSAF 21,4%)', 20, y); y+=7;
      doc.setFont('helvetica','normal');
      doc.text(`Marge nette: ${parseFloat(archiveData.net_margin_zenscan).toFixed(2)} €`, 30, y); y+=6;
      doc.text(`Services effectués: ${archiveData.zenscan_count}`, 30, y); y+=12;
      doc.setFont('helvetica','bold'); doc.setFontSize(12);
      doc.text(`MARGE NETTE TOTALE: ${parseFloat(archiveData.net_margin_total).toFixed(2)} €`, 20, y);
      doc.save(`ZENOCCAZ_Finances_${archiveData.month_name.replace(' ','_')}.pdf`);
    } catch(e) { alert('❌ Erreur lors du téléchargement du PDF'); }
  };

  window.forceArchiveCurrentMonth = async function() {
    if (!confirm('⚠️ TEST : Voulez-vous archiver le mois en cours ?')) return;
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const finances = await loadFinances();
      if (finances.length === 0) { alert('❌ Aucune donnée financière à archiver'); return; }
      await archiveMonth(currentMonth, finances);
      await loadArchives();
    } catch(e) { alert('❌ Erreur lors du test d\'archivage'); }
  };

  // ── ARCHIVES ZENSCAN ──
  const zenscanArchivesLink    = document.querySelector('a[href="#zenscan-archives"]');
  const zenscanArchivesSection = document.querySelector('#zenscan-archives');

  if (zenscanArchivesLink) {
    zenscanArchivesLink.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAllSections();
      zenscanArchivesSection.classList.remove('hidden');
      await loadZenscanArchives();
    });
  }

  async function loadZenscanArchives() {
    const list = document.getElementById('zenscan-archives-list');
    if (!list) return;
    list.innerHTML = '<div class="activity-empty">Chargement...</div>';
    try {
      const { data, error } = await window.supabase
        .from('zenscan_archives')
        .select('*')
        .order('archived_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) {
        list.innerHTML = '<div class="activity-empty">Aucune intervention archivée pour le moment.</div>';
        return;
      }
      list.innerHTML = `
        <div style="overflow:auto;">
          <table style="width:100%;border-collapse:separate;border-spacing:0 8px;">
            <thead>
              <tr style="color:var(--muted);font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">
                <th style="padding:10px 14px;text-align:left;">Réf</th>
                <th style="padding:10px 14px;text-align:left;">Client</th>
                <th style="padding:10px 14px;text-align:left;">Services</th>
                <th style="padding:10px 14px;text-align:left;">Destination</th>
                <th style="padding:10px 14px;text-align:left;">Total</th>
                <th style="padding:10px 14px;text-align:left;">Date intervention</th>
                <th style="padding:10px 14px;text-align:left;">Archivé le</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(r => {
                const dateIntervention = r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '—';
                const dateArchive      = r.archived_at ? new Date(r.archived_at).toLocaleDateString('fr-FR') + ' ' + new Date(r.archived_at).toLocaleTimeString('fr-FR') : '—';
                const services = (r.breakdown || r.services || '—').split('\n')[0].substring(0,50) + ((r.breakdown||r.services||'').length > 50 ? '…' : '');
                return `<tr style="background:rgba(255,255,255,0.02);border-radius:8px;">
                  <td style="padding:14px;color:var(--text);font-weight:600;white-space:nowrap;">${escapeHtml(String(r.id))}</td>
                  <td style="padding:14px;min-width:150px;">
                    <div style="font-weight:600;color:var(--text);">${escapeHtml(r.client_name||'—')}</div>
                    <div style="font-size:11px;color:#f97316;">${escapeHtml(r.client_email||'')}</div>
                  </td>
                  <td style="padding:14px;color:#f97316;max-width:200px;">${escapeHtml(services)}</td>
                  <td style="padding:14px;color:var(--muted);min-width:160px;">${escapeHtml(r.dest||'—')}</td>
                  <td style="padding:14px;white-space:nowrap;">
                    <span style="font-weight:700;color:#10b981;">${escapeHtml(r.total||'—')}</span>
                    <span style="margin-left:6px;background:rgba(16,185,129,0.15);color:#10b981;padding:3px 7px;border-radius:4px;font-size:11px;font-weight:600;">💶 Payé</span>
                  </td>
                  <td style="padding:14px;color:var(--muted);white-space:nowrap;font-size:13px;">${dateIntervention}</td>
                  <td style="padding:14px;color:var(--muted);white-space:nowrap;font-size:13px;">${dateArchive}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:16px;padding:12px 16px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--muted);font-size:13px;">${data.length} intervention${data.length>1?'s':''} archivée${data.length>1?'s':''}</span>
          <span style="color:#10b981;font-weight:700;font-size:15px;">
            Total encaissé : ${data.reduce((sum,r) => sum + (parseFloat((r.total||'0').replace(/[^0-9.-]/g,''))||0), 0).toFixed(2)} €
          </span>
        </div>
      `;
    } catch(e) {
      list.innerHTML = '<div class="activity-empty">❌ Erreur : ' + escapeHtml(e.message) + '</div>';
    }
  }

  // ── MESSAGES CONTACT ──
  const messagesNavLink = document.querySelector('a[href="#messages"]');
  const messagesSection = document.querySelector('#messages');

  if (messagesNavLink) {
    messagesNavLink.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAllSections();
      messagesSection.classList.remove('hidden');
      await loadContactMessages();
    });
  }

  async function loadContactMessages() {
    const list = document.getElementById('messages-list');
    if (!list) return;
    list.innerHTML = '<div class="activity-empty">Chargement...</div>';
    try {
      const { data, error } = await window.supabase
        .from('contact_messages').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) {
        list.innerHTML = '<div class="activity-empty">Aucun message pour le moment.</div>';
        return;
      }
      // Badge non lus
      const unread = data.filter(m => !m.read).length;
      const navLink = document.querySelector('a[href="#messages"]');
      if (navLink) {
        let badge = navLink.querySelector('.zenscan-new-badge');
        if (unread > 0) {
          if (!badge) { badge = document.createElement('span'); badge.className = 'zenscan-new-badge'; navLink.appendChild(badge); }
          badge.textContent = unread;
        } else if (badge) badge.remove();
      }
      const subjects = { vehicule: '🚗 Véhicule', zenscan: '🔧 ZenScan', reprise: '🔄 Reprise', autre: '💬 Autre' };
      list.innerHTML = data.map(m => {
        const date = new Date(m.created_at).toLocaleDateString('fr-FR') + ' ' + new Date(m.created_at).toLocaleTimeString('fr-FR');
        const subjectLabel = subjects[m.subject] || m.subject || '—';
        return `<div style="background:${m.read ? 'rgba(255,255,255,0.02)' : 'rgba(16,185,129,0.06)'};border:1px solid ${m.read ? 'rgba(255,255,255,0.04)' : 'rgba(16,185,129,0.2)'};border-left:3px solid ${m.read ? 'rgba(255,255,255,0.1)' : '#10b981'};padding:20px;border-radius:10px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:40px;height:40px;border-radius:50%;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">👤</div>
              <div>
                <div style="font-weight:700;color:var(--text);font-size:15px;">${escapeHtml(m.name)}</div>
                <div style="font-size:12px;color:#f97316;">${escapeHtml(m.email)}${m.phone ? ' · ' + escapeHtml(m.phone) : ''}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span style="background:rgba(59,130,246,0.1);color:#60a5fa;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">${subjectLabel}</span>
              <span style="color:var(--muted);font-size:12px;">${date}</span>
              ${!m.read ? `<button onclick="markMessageRead(${m.id}, this)" style="background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.3);padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;">✓ Lu</button>` : '<span style="color:rgba(255,255,255,0.2);font-size:12px;">✓ Lu</span>'}
              <button onclick="deleteMessage(${m.id}, this)" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;">🗑️</button>
            </div>
          </div>
          <div style="background:rgba(255,255,255,0.02);padding:14px;border-radius:8px;color:var(--muted);font-size:14px;line-height:1.6;border-left:2px solid rgba(255,255,255,0.06);">${escapeHtml(m.message)}</div>
        </div>`;
      }).join('');
    } catch(e) {
      list.innerHTML = '<div class="activity-empty">❌ Erreur : ' + escapeHtml(e.message) + '</div>';
    }
  }

  window.markMessageRead = async function(id, btn) {
    try {
      await window.supabase.from('contact_messages').update({ read: true }).eq('id', id);
      await loadContactMessages();
    } catch(e) { alert('❌ ' + e.message); }
  };

  window.deleteMessage = async function(id, btn) {
    if (!confirm('Supprimer ce message ?')) return;
    try {
      await window.supabase.from('contact_messages').delete().eq('id', id);
      await loadContactMessages();
    } catch(e) { alert('❌ ' + e.message); }
  };

  // Badge messages non lus au démarrage
  async function checkUnreadMessages() {
    try {
      const { data } = await window.supabase.from('contact_messages').select('id').eq('read', false);
      const count = (data || []).length;
      const navLink = document.querySelector('a[href="#messages"]');
      if (!navLink) return;
      let badge = navLink.querySelector('.zenscan-new-badge');
      if (count > 0) {
        if (!badge) { badge = document.createElement('span'); badge.className = 'zenscan-new-badge'; navLink.appendChild(badge); }
        badge.textContent = count;
      } else if (badge) badge.remove();
    } catch(e) {}
  }

  // ── VOITURES VENDUES ──
  const soldVehiclesLink    = document.querySelector('a[href="#sold-vehicles"]');
  const soldVehiclesSection = document.querySelector('#sold-vehicles');

  if (soldVehiclesLink) {
    soldVehiclesLink.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAllSections();
      soldVehiclesSection.classList.remove('hidden');
      await loadSoldVehicles();
    });
  }

  async function loadSoldVehicles() {
    const list = document.getElementById('sold-vehicles-list');
    if (!list) return;
    list.innerHTML = '<div class="activity-empty">Chargement...</div>';
    try {
      const { data, error } = await window.supabase
        .from('sold_vehicles').select('*').order('sold_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) {
        list.innerHTML = '<div class="activity-empty">Aucun véhicule vendu pour le moment.</div>';
        return;
      }

      const totalRevenu = data.reduce((sum, v) => sum + (parseFloat(v.sold_price) || 0), 0);

      list.innerHTML = `
        <div style="overflow:auto;">
          <table style="width:100%;border-collapse:separate;border-spacing:0 8px;">
            <thead>
              <tr style="color:var(--muted);font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">
                <th style="padding:10px 14px;text-align:left;">Véhicule</th>
                <th style="padding:10px 14px;text-align:left;">Année</th>
                <th style="padding:10px 14px;text-align:left;">Kilométrage</th>
                <th style="padding:10px 14px;text-align:left;">Carburant</th>
                <th style="padding:10px 14px;text-align:left;">Prix affiché</th>
                <th style="padding:10px 14px;text-align:left;">Prix de vente</th>
                <th style="padding:10px 14px;text-align:left;">Vendu le</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(v => {
                const dateSold = v.sold_at ? new Date(v.sold_at).toLocaleDateString('fr-FR') : '—';
                const mileage  = v.mileage ? Number(v.mileage).toLocaleString('fr-FR') + ' km' : '—';
                const imgs     = v.images ? (Array.isArray(v.images) ? v.images : JSON.parse(v.images)) : [];
                const img      = imgs[0] || '';
                return `<tr style="background:rgba(255,255,255,0.02);border-radius:8px;">
                  <td style="padding:14px;min-width:180px;">
                    <div style="display:flex;align-items:center;gap:12px;">
                      ${img ? `<img src="${escapeHtml(img)}" style="width:52px;height:38px;object-fit:cover;border-radius:6px;border:1px solid rgba(255,255,255,0.06);" />` : '<div style="width:52px;height:38px;background:rgba(255,255,255,0.04);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px;">🚗</div>'}
                      <div>
                        <div style="font-weight:700;color:var(--text);">${escapeHtml((v.make||'') + ' ' + (v.model||''))}</div>
                        ${v.registration ? `<div style="font-size:11px;color:var(--muted);">📋 ${escapeHtml(v.registration)}</div>` : ''}
                      </div>
                    </div>
                  </td>
                  <td style="padding:14px;color:var(--muted);">${escapeHtml(v.year||'—')}</td>
                  <td style="padding:14px;color:var(--muted);">${mileage}</td>
                  <td style="padding:14px;color:var(--muted);">${escapeHtml(v.fuel_type||'—')}</td>
                  <td style="padding:14px;color:var(--muted);">${v.price ? escapeHtml(String(v.price)) + ' €' : '—'}</td>
                  <td style="padding:14px;">
                    <span style="font-weight:700;color:#10b981;font-size:16px;">${v.sold_price ? parseFloat(v.sold_price).toLocaleString('fr-FR') + ' €' : '—'}</span>
                  </td>
                  <td style="padding:14px;color:var(--muted);white-space:nowrap;">${dateSold}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:16px;padding:14px 20px;background:linear-gradient(135deg,rgba(26,8,0,0.97),rgba(13,3,0,0.97));border:1px solid #c9a84c;border-left:3px solid #ff3311;border-radius:4px 12px 4px 12px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 0 16px rgba(201,168,76,0.15);">
          <span style="font-family:'Courier New',monospace;font-size:11px;color:rgba(201,168,76,0.6);letter-spacing:0.15em;">${data.length} VÉHICULE${data.length > 1 ? 'S' : ''} VENDU${data.length > 1 ? 'S' : ''}</span>
          <span style="font-family:'Courier New',monospace;font-weight:900;font-size:20px;color:#f0c040;text-shadow:0 0 10px rgba(240,192,64,0.4);">TOTAL : ${totalRevenu.toLocaleString('fr-FR')} €</span>
        </div>
      `;
    } catch(e) {
      list.innerHTML = '<div class="activity-empty">❌ Erreur : ' + escapeHtml(e.message) + '</div>';
    }
  }

  // ── ESTIMATIONS REPRISES ──
  const estimationsReprisesLink    = document.querySelector('a[href="#estimations-reprises"]');
  const estimationsReprisesSection = document.querySelector('#estimations-reprises');

  if (estimationsReprisesLink) {
    estimationsReprisesLink.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAllSections();
      estimationsReprisesSection.classList.remove('hidden');
      await loadEstimationsReprises();
    });
  }

  async function loadEstimationsReprises() {
    const list = document.getElementById('estimations-reprises-list');
    if (!list) return;
    list.innerHTML = '<div class="activity-empty">Chargement...</div>';
    try {
      const { data, error } = await window.supabase
        .from('reprise_estimations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) {
        list.innerHTML = '<div class="activity-empty">Aucune estimation reçue pour le moment.</div>';
        return;
      }

      const statusColors = {
        'en_attente': { bg:'rgba(245,158,11,0.12)', color:'#f59e0b', border:'rgba(245,158,11,0.3)', label:'⏳ En attente' },
        'contacte':   { bg:'rgba(59,130,246,0.12)',  color:'#3b82f6', border:'rgba(59,130,246,0.3)',  label:'📞 Contacté' },
        'accepte':    { bg:'rgba(16,185,129,0.12)',  color:'#10b981', border:'rgba(16,185,129,0.3)',  label:'✅ Accepté' },
        'refuse':     { bg:'rgba(239,68,68,0.12)',   color:'#ef4444', border:'rgba(239,68,68,0.3)',   label:'❌ Refusé' },
      };

      list.innerHTML = data.map(e => {
        const date    = new Date(e.created_at).toLocaleDateString('fr-FR') + ' ' + new Date(e.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});
        const st      = statusColors[e.status] || statusColors['en_attente'];
        const estMin  = e.est_min ? e.est_min.toLocaleString('fr-FR') + ' €' : '—';
        const estMax  = e.est_max ? e.est_max.toLocaleString('fr-FR') + ' €' : '—';
        const estMoy  = e.est_moy ? e.est_moy.toLocaleString('fr-FR') + ' €' : '—';
        return `
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-left:3px solid ${st.color};border-radius:10px;padding:20px;transition:all 0.2s;">
          <!-- Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(59,130,246,0.08));border:1px solid rgba(16,185,129,0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M5 11L6.5 6.5C6.8 5.6 7.6 5 8.5 5H15.5C16.4 5 17.2 5.6 17.5 6.5L19 11" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/>
                  <rect x="2" y="11" width="20" height="7" rx="2" fill="rgba(16,185,129,0.1)" stroke="#10b981" stroke-width="1.5"/>
                  <circle cx="7" cy="18" r="2" fill="#10b981"/>
                  <circle cx="17" cy="18" r="2" fill="#10b981"/>
                </svg>
              </div>
              <div>
                <div style="font-weight:800;color:var(--text);font-size:16px;">${escapeHtml((e.marque||'') + ' ' + (e.modele||''))} <span style="color:var(--muted);font-weight:400;">${escapeHtml(e.annee||'')}</span></div>
                <div style="font-size:12px;color:#f97316;margin-top:2px;">${escapeHtml(e.client_name||'—')} · ${escapeHtml(e.client_email||'')} · ${escapeHtml(e.client_phone||'—')}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="background:${st.bg};color:${st.color};border:1px solid ${st.border};padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;">${st.label}</span>
              <select onchange="updateStatutEstimation(${e.id}, this.value)" style="background:#0d1117;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#94a3b8;font-size:12px;padding:5px 10px;cursor:pointer;color-scheme:dark;">
                <option value="en_attente" ${e.status==='en_attente'?'selected':''}>⏳ En attente</option>
                <option value="contacte"   ${e.status==='contacte'?'selected':''}>📞 Contacté</option>
                <option value="accepte"    ${e.status==='accepte'?'selected':''}>✅ Accepté</option>
                <option value="refuse"     ${e.status==='refuse'?'selected':''}>❌ Refusé</option>
              </select>
              <button onclick="deleteEstimation(${e.id})" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);padding:5px 10px;border-radius:8px;cursor:pointer;font-size:12px;">🗑️</button>
            </div>
          </div>

          <!-- Infos véhicule -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-bottom:16px;">
            ${[
              ['Kilométrage',   e.km ? e.km.toLocaleString('fr-FR')+' km' : '—'],
              ['Carburant',     e.carburant||'—'],
              ['Boîte',         e.boite||'—'],
              ['Motorisation',  e.motorisation||'—'],
              ['Finition',      e.finition||'—'],
              ['Puissance',     e.ch ? e.ch+' CH · '+(e.cv||'?')+' CV' : '—'],
              ['État',          e.etat||'—'],
              ['Plaque',        e.plaque||'—'],
            ].map(([k,v]) => `
              <div style="background:rgba(255,255,255,0.02);padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);">
                <div style="font-size:10px;color:#475569;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">${k}</div>
                <div style="font-size:13px;color:#cbd5e1;font-weight:600;">${escapeHtml(String(v))}</div>
              </div>
            `).join('')}
          </div>

          <!-- Estimation -->
          <div style="background:linear-gradient(135deg,rgba(16,185,129,0.06),rgba(6,182,212,0.04));border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:14px;margin-bottom:${e.message?'12px':'0'};display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div style="display:flex;gap:24px;flex-wrap:wrap;">
              <div style="text-align:center;"><div style="font-size:10px;color:#475569;margin-bottom:3px;">Minimum</div><div style="font-size:16px;font-weight:700;color:#94a3b8;">${estMin}</div></div>
              <div style="text-align:center;"><div style="font-size:10px;color:#475569;margin-bottom:3px;">Maximum</div><div style="font-size:16px;font-weight:700;color:#94a3b8;">${estMax}</div></div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:10px;color:#10b981;font-weight:700;letter-spacing:0.5px;margin-bottom:3px;">ESTIMATION ZENOCCAZ</div>
              <div style="font-size:24px;font-weight:900;color:#10b981;text-shadow:0 0 12px rgba(16,185,129,0.3);">${estMoy}</div>
            </div>
            <div style="font-size:11px;color:#334155;text-align:right;">Envoyé le<br>${date}</div>
          </div>

          ${e.message ? `<div style="background:rgba(255,255,255,0.02);padding:12px 14px;border-radius:8px;border-left:2px solid rgba(255,255,255,0.08);color:var(--muted);font-size:13px;line-height:1.6;">💬 ${escapeHtml(e.message)}</div>` : ''}
        </div>`;
      }).join('');

      // Badge non lus (statut en_attente)
      const enAttente = data.filter(e => e.status === 'en_attente').length;
      const navLink = document.querySelector('a[href="#estimations-reprises"]');
      if (navLink) {
        let badge = navLink.querySelector('.zenscan-new-badge');
        if (enAttente > 0) {
          if (!badge) { badge = document.createElement('span'); badge.className = 'zenscan-new-badge'; navLink.appendChild(badge); }
          badge.textContent = enAttente;
        } else if (badge) badge.remove();
      }

    } catch(e) {
      list.innerHTML = '<div class="activity-empty">❌ Erreur : ' + escapeHtml(e.message) + '</div>';
    }
  }

  window.updateStatutEstimation = async function(id, status) {
    try {
      await window.supabase.from('reprise_estimations').update({ status }).eq('id', id);
      await loadEstimationsReprises();
    } catch(e) { alert('❌ ' + e.message); }
  };

  window.deleteEstimation = async function(id) {
    if (!confirm('Supprimer cette estimation ?')) return;
    try {
      await window.supabase.from('reprise_estimations').delete().eq('id', id);
      await loadEstimationsReprises();
    } catch(e) { alert('❌ ' + e.message); }
  };

  // Badge au démarrage
  async function checkEstimationsEnAttente() {
    try {
      const { data } = await window.supabase.from('reprise_estimations').select('id').eq('status', 'en_attente');
      const count = (data||[]).length;
      const navLink = document.querySelector('a[href="#estimations-reprises"]');
      if (!navLink) return;
      let badge = navLink.querySelector('.zenscan-new-badge');
      if (count > 0) {
        if (!badge) { badge = document.createElement('span'); badge.className = 'zenscan-new-badge'; navLink.appendChild(badge); }
        badge.textContent = count;
      } else if (badge) badge.remove();
    } catch(e) {}
  }

  // ── INIT ──
  (async () => {
    await renderVehiclesTable();
    await updateDashboard();
    await checkMonthlyArchive();
    await checkUnreadMessages();
    await checkEstimationsEnAttente();
  })();

  if (addAdminBtn) addAdminBtn.addEventListener('click', () => openVehicleModal());
  window._adminInlineInitDone = true;
}

  // ── PWA — Service Worker + Écran de connexion PIN ──
  (function() {
    // Enregistrement du Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // PIN admin (4 chiffres)
    const ADMIN_PIN = '1985'; // Change ce PIN comme tu veux

    // Sur mobile PWA : afficher l'écran de connexion
    const isMobile   = window.matchMedia('(max-width: 768px)').matches;
    const isPWA      = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const isUnlocked = sessionStorage.getItem('pwa_unlocked') === '1';
    const isAdmin    = localStorage.getItem('zenoccaz_admin') === '1';

    const lockScreen = document.getElementById('pwa-lock-screen');

    if ((isMobile || isPWA) && !isUnlocked && !isAdmin && lockScreen) {
      lockScreen.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    let currentPin = '';

    window.pwaPin = function(val) {
      if (val === '') return;
      if (val === '⌫') {
        currentPin = currentPin.slice(0, -1);
      } else if (currentPin.length < 4) {
        currentPin += val;
      }

      // Mise à jour dots
      const dots = document.querySelectorAll('.pin-dot');
      dots.forEach((d, i) => {
        d.style.background = i < currentPin.length ? '#10b981' : 'transparent';
        d.style.borderColor = i < currentPin.length ? '#10b981' : 'rgba(16,185,129,0.4)';
        d.style.boxShadow   = i < currentPin.length ? '0 0 8px rgba(16,185,129,0.5)' : 'none';
      });

      const hint = document.getElementById('pwa-pin-hint');

      if (currentPin.length === 4) {
        if (currentPin === ADMIN_PIN) {
          // Succès
          hint.style.color = '#10b981';
          hint.textContent  = '✓ Accès autorisé';
          sessionStorage.setItem('pwa_unlocked', '1');
          localStorage.setItem('zenoccaz_admin', '1'); // Connexion admin
          setTimeout(() => {
            lockScreen.style.opacity = '0';
            lockScreen.style.transition = 'opacity 0.4s';
            setTimeout(() => {
              lockScreen.style.display = 'none';
              document.body.style.overflow = '';
            }, 400);
          }, 500);
        } else {
          // Erreur
          hint.style.color = '#ef4444';
          hint.textContent  = '✗ Code incorrect';
          lockScreen.style.animation = 'pinShake 0.4s ease';
          setTimeout(() => {
            lockScreen.style.animation = '';
            currentPin = '';
            hint.textContent = 'Entrez votre code PIN';
            hint.style.color = '#475569';
            dots.forEach(d => {
              d.style.background   = 'transparent';
              d.style.borderColor  = 'rgba(16,185,129,0.4)';
              d.style.boxShadow    = 'none';
            });
          }, 800);
        }
      }
    };
  })();