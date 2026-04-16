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
    tbody.innerHTML = '';
    if (arr.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="4" class="activity-empty">Aucun véhicule.</td>';
      tbody.appendChild(tr);
      return;
    }
    arr.forEach(v => {
      const tr = document.createElement('tr');
      tr.className = 'vehicle-row';
      const statusText = v.status || 'Disponible';
      const statusColors = {
        'Disponible': {bg:'rgba(16,185,129,0.12)', color:'#10b981'},
        'Vendu':      {bg:'rgba(245,158,11,0.12)', color:'#f59e0b'},
        'Archivé':    {bg:'rgba(107,114,128,0.12)',color:'#6b7280'}
      };
      const st = statusColors[statusText] || statusColors['Disponible'];
      tr.innerHTML = `<td><div class="vehicle-cell-title"><div class="vehicle-avatar">🚗</div><div><div class="vehicle-meta-title">${escapeHtml(v.make||'—')} ${escapeHtml(v.model||'')}</div><div class="vehicle-meta-sub">${escapeHtml(v.year||'')} — ${escapeHtml(v.description||'')}</div></div></div></td><td>${escapeHtml(v.price||'')} €</td><td><span class="status-pill" style="background:${st.bg};color:${st.color}">${statusText}</span></td><td><div class="action-links" style="display:flex;gap:8px;"><span class="edit" data-id="${v.id}" title="Modifier" style="cursor:pointer;padding:6px 10px;background:rgba(16,185,129,0.1);border-radius:6px;font-size:16px;">✏️</span><span class="sold" data-id="${v.id}" data-price="${v.price}" data-vehicle="${escapeHtml(v.make||'')} ${escapeHtml(v.model||'')}" title="Marquer vendu" style="cursor:pointer;padding:6px 10px;background:rgba(245,158,11,0.1);border-radius:6px;font-size:16px;">💰</span><span class="archive" data-id="${v.id}" title="Archiver" style="cursor:pointer;padding:6px 10px;background:rgba(107,114,128,0.1);border-radius:6px;font-size:16px;">📦</span><span class="del" data-id="${v.id}" title="Supprimer" style="cursor:pointer;padding:6px 10px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:16px;">🗑️</span></div></td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.edit').forEach(el => el.addEventListener('click', e => editVehicle(Number(e.target.dataset.id))));
    tbody.querySelectorAll('.sold').forEach(el => el.addEventListener('click', e => openSalePriceModal(Number(e.target.dataset.id), e.target.dataset.vehicle)));
    tbody.querySelectorAll('.archive').forEach(el => el.addEventListener('click', e => archiveVehicle(Number(e.target.dataset.id))));
    tbody.querySelectorAll('.del').forEach(el => el.addEventListener('click', e => deleteVehicle(Number(e.target.dataset.id))));
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
      const { error: updateError } = await window.supabase.from('vehicles').update({ status:'Vendu' }).eq('id', id);
      if (updateError) { alert('❌ Erreur lors de la mise à jour du véhicule'); return; }
      const { error: financeError } = await window.supabase.from('finances').insert([{ id: Date.now(), description: `Vente véhicule: ${vehicleName}`, type:'revenue', amount: parseFloat(price), category:'vehicle', vehicle_id: id }]);
      if (financeError) { alert('❌ Erreur lors de l\'ajout dans les finances'); return; }
      alert('✅ Véhicule vendu ! Montant ajouté aux finances.');
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
  const contactsTbody = document.getElementById('contacts-table-body');
  const addContactBtn = document.getElementById('add-contact-admin');
  const contactsSection = document.getElementById('contacts');
  const contactsLink    = document.querySelector('a[href="#contacts"]');

  async function loadContacts() {
    try {
      if (!window.supabase) return [];
      const { data, error } = await window.supabase.from('contacts').select('*').order('created_at', { ascending: false });
      if (error) { console.error('❌ Erreur chargement contacts:', error); return []; }
      return data || [];
    } catch(e) { return []; }
  }

  async function renderContactsTable() {
    const arr = await loadContacts();
    contactsTbody.innerHTML = '';
    if (arr.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="5" class="activity-empty">Aucun contact.</td>';
      contactsTbody.appendChild(tr);
      return;
    }
    arr.forEach(c => {
      const tr = document.createElement('tr');
      tr.className = 'contact-row';
      const dateStr = new Date(c.created_at || c.date).toLocaleDateString('fr-FR');
      tr.innerHTML = `<td><div class="contact-cell-title"><div class="contact-avatar">👤</div><div><div class="contact-name">${escapeHtml(c.name||'—')}</div></div></div></td><td>${escapeHtml(c.email||'—')}</td><td>${escapeHtml(c.phone||'—')}</td><td>${dateStr}</td><td><div class="action-links"><span class="edit-contact" data-id="${c.id}" style="cursor:pointer;padding:6px 10px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:16px;">🗑️</span></div></td>`;
      contactsTbody.appendChild(tr);
    });
    contactsTbody.querySelectorAll('.edit-contact').forEach(el => el.addEventListener('click', e => deleteContact(Number(e.target.dataset.id))));
  }

  const contactModal  = document.getElementById('contact-modal');
  const contactForm   = document.getElementById('contact-form');
  const contactCancel = document.getElementById('contact-cancel');

  function openContactModal() { contactModal.classList.remove('hidden'); contactModal.setAttribute('aria-hidden','false'); contactForm.reset(); document.getElementById('cont-name').focus(); }
  function closeContactModal() { contactModal.classList.add('hidden'); contactModal.setAttribute('aria-hidden','true'); }
  contactCancel.addEventListener('click', closeContactModal);
  contactModal.addEventListener('click', e => { if (e.target === contactModal) closeContactModal(); });

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name  = document.getElementById('cont-name').value.trim();
    const email = document.getElementById('cont-email').value.trim();
    const phone = document.getElementById('cont-phone').value.trim();
    if (!name) { alert('❌ Le nom est requis'); return; }
    try {
      const { error } = await window.supabase.from('contacts').insert([{ id: Date.now(), name, email, phone }]);
      if (error) { alert('❌ Erreur lors de l\'ajout du contact'); return; }
      await renderContactsTable();
      closeContactModal();
    } catch(e) { alert('❌ Erreur: ' + e.message); }
  });

  async function deleteContact(id) {
    if (!confirm('Supprimer ce contact ?')) return;
    try {
      const { error } = await window.supabase.from('contacts').delete().eq('id', id);
      if (error) { alert('❌ Erreur lors de la suppression'); return; }
      await renderContactsTable();
    } catch(e) { console.error('❌ Exception:', e); }
  }

  if (contactsLink) {
    contactsLink.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAllSections();
      contactsSection.classList.remove('hidden');
      await renderContactsTable();
    });
  }

  if (addContactBtn) addContactBtn.addEventListener('click', () => openContactModal());

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
      tr.innerHTML = `<td style="padding:16px 12px;"><div style="display:flex;align-items:center;"><div style="width:40px;height:40px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">👤</div><div style="margin-left:12px;"><div style="font-weight:600;color:var(--text);">${escapeHtml(pa.parrain||'—')}</div><div style="font-size:13px;color:var(--muted);">${escapeHtml(pa.parrain_email||'')}</div></div></div></td><td style="padding:16px 12px;">${escapeHtml(pa.filleul||'—')}</td><td style="padding:16px 12px;color:#a855f7;">${rewardText}</td><td style="padding:16px 12px;"><span style="background:${sb};color:${sc};padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;">${escapeHtml(pa.status||'—')}</span></td><td style="padding:16px 12px;color:#a855f7;font-weight:600;">${escapeHtml(pa.commission||'0')} €</td><td style="padding:16px 12px;color:var(--muted);font-size:13px;">${dateStr}</td><td style="padding:16px 12px;"><div class="action-links" style="display:flex;gap:8px;"><span class="edit-parrainage" data-id="${pa.id}" style="cursor:pointer;padding:6px 10px;background:rgba(16,185,129,0.1);border-radius:6px;font-size:16px;">✏️</span><span class="del-parrainage" data-id="${pa.id}" style="cursor:pointer;padding:6px 10px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:16px;">🗑️</span></div></td>`;
      parrainage_tbody.appendChild(tr);
    });
    parrainage_tbody.querySelectorAll('.edit-parrainage').forEach(el => el.addEventListener('click', e => editParrainage(Number(e.target.dataset.id))));
    parrainage_tbody.querySelectorAll('.del-parrainage').forEach(el  => el.addEventListener('click', e => deleteParrainage(Number(e.target.dataset.id))));
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
        const { error } = await window.supabase.from('parrainages').update({ parrain, parrain_email, filleul, reward_type, status, commission: parseFloat(commission) }).eq('id', parseInt(editId));
        if (error) { alert('❌ Erreur lors de la mise à jour'); return; }
      } else {
        const { error } = await window.supabase.from('parrainages').insert([{ id: Date.now(), parrain, parrain_email, filleul, reward_type, status, commission: parseFloat(commission) }]);
        if (error) { alert('❌ Erreur lors de l\'ajout'); return; }
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
    const container = document.createElement('div');
    container.className = 'margin-effect-container';
    if (netMargin > 0) {
      document.body.classList.add('screen-flash-green');
      const text = document.createElement('div');
      text.className = 'margin-positive-effect';
      text.innerHTML = `💰 PROFIT DÉTECTÉ ! 💰<br><span style="font-size:48px;">+${netMargin.toFixed(2)} €</span><br>🔥 MONEY MODE 🔥`;
      container.appendChild(text);
      const border = document.createElement('div');
      border.className = 'cyberpunk-border';
      document.body.appendChild(border);
      for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random()*100+'%'; p.style.top = '100%';
        p.style.background = 'linear-gradient(135deg,#10b981,#3b82f6)';
        p.style.animationDelay = Math.random()*0.5+'s';
        p.style.animationDuration = (1+Math.random())+'s';
        p.style.width = (10+Math.random()*20)+'px'; p.style.height = p.style.width;
        p.style.animation = 'particleFall 2s ease-out forwards reverse';
        container.appendChild(p);
      }
      setTimeout(() => border.remove(), 3000);
    } else if (netMargin < 0) {
      document.body.classList.add('screen-flash-red','screen-shake');
      const text = document.createElement('div');
      text.className = 'margin-negative-effect';
      text.innerHTML = `❌ MARGE NÉGATIVE ❌<br><span style="font-size:48px;">${netMargin.toFixed(2)} €</span><br>💀 ALERTE PERTES 💀`;
      container.appendChild(text);
      setTimeout(() => document.body.classList.remove('screen-shake'), 500);
    }
    if (netMargin !== 0) {
      document.body.appendChild(container);
      setTimeout(() => {
        container.remove();
        document.body.classList.remove('screen-flash-red','screen-flash-green');
        window.marginEffectActive = false;
      }, 3000);
    } else { window.marginEffectActive = false; }
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
    const profit = revenue - expenses;
    const margin = revenue > 0 ? ((profit/revenue)*100).toFixed(1) : 0;
    document.getElementById('finance-revenue').textContent = revenue.toFixed(2)+' €';
    document.getElementById('finance-expenses').textContent = expenses.toFixed(2)+' €';
    document.getElementById('finance-profit').textContent   = profit.toFixed(2)+' €';
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
      const { error } = await window.supabase.from('finance_archives').insert([archiveData]);
      if (error) { console.error('❌ Erreur sauvegarde archive:', error); return; }
      await generateMonthlyPDF(monthName, archiveData, financeData);
      const idsToDelete = financeData.map(f => f.id);
      if (idsToDelete.length > 0) await window.supabase.from('finances').delete().in('id', idsToDelete);
      alert(`✅ Archive mensuelle créée pour ${monthName}`);
    } catch(e) { console.error('❌ Erreur archivage:', e); }
  }

  async function generateMonthlyPDF(monthName, stats, financeData) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let y = 20;
      doc.setFontSize(20); doc.setFont('helvetica','bold');
      doc.text('ZENOCCAZ - Rapport Financier Mensuel', 105, y, { align:'center' }); y+=15;
      doc.setFontSize(14); doc.text(monthName, 105, y, { align:'center' }); y+=15;
      doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.text('RÉSUMÉ FINANCIER', 20, y); y+=10;
      doc.setFont('helvetica','normal'); doc.setFontSize(10);
      doc.text(`Revenus totaux: ${stats.total_revenue.toFixed(2)} €`, 20, y); y+=7;
      doc.text(`Dépenses totales: ${stats.total_expenses.toFixed(2)} €`, 20, y); y+=7;
      doc.text(`Bénéfice brut: ${stats.total_profit.toFixed(2)} €`, 20, y); y+=15;
      doc.setFont('helvetica','bold'); doc.text('VENTE VOITURES (URSSAF 12,6%)', 20, y); y+=7;
      doc.setFont('helvetica','normal');
      doc.text(`Revenus: ${stats.vehicle_revenue.toFixed(2)} €`, 30, y); y+=6;
      doc.text(`URSSAF: ${stats.urssaf_vehicle_tax.toFixed(2)} €`, 30, y); y+=6;
      doc.text(`Marge nette: ${stats.net_margin_vehicle.toFixed(2)} €`, 30, y); y+=6;
      doc.text(`Véhicules: ${stats.vehicle_count}`, 30, y); y+=12;
      doc.setFont('helvetica','bold'); doc.text('DÉPANNAGE ZENSCAN (URSSAF 21,4%)', 20, y); y+=7;
      doc.setFont('helvetica','normal');
      doc.text(`Revenus: ${stats.zenscan_revenue.toFixed(2)} €`, 30, y); y+=6;
      doc.text(`URSSAF: ${stats.urssaf_zenscan_tax.toFixed(2)} €`, 30, y); y+=6;
      doc.text(`Marge nette: ${stats.net_margin_zenscan.toFixed(2)} €`, 30, y); y+=6;
      doc.text(`Services: ${stats.zenscan_count}`, 30, y); y+=12;
      doc.setFont('helvetica','bold'); doc.setFontSize(12);
      doc.text(`MARGE NETTE TOTALE: ${stats.net_margin_total.toFixed(2)} €`, 20, y); y+=15;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.text('DÉTAILS DES TRANSACTIONS', 20, y); y+=10;
      doc.setFontSize(9);
      financeData.forEach(f => {
        if (y > 270) { doc.addPage(); y = 20; }
        const date = new Date(f.created_at||f.date).toLocaleDateString('fr-FR');
        doc.text(`${date} | ${f.type==='revenue'?'+ Revenu':'- Dépense'} | ${f.description||'N/A'} | ${Math.abs(parseFloat(f.amount)||0).toFixed(2)} €`, 20, y); y+=6;
      });
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
      const { data, error } = await window.supabase.from('zenscan_requests').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } catch(e) { return []; }
  }

  async function renderZenscanTable() {
    const arr = await loadZenscans();
    zenscanTbody.innerHTML = '';
    if (arr.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="7" class="activity-empty">Aucune demande ZenScan.</td>';
      zenscanTbody.appendChild(tr);
      return;
    }
    const contacts = await loadContacts();
    arr.forEach(r => {
      const tr = document.createElement('tr');
      const dateStr = new Date(r.created_at||r.date).toLocaleDateString('fr-FR')+' '+new Date(r.created_at||r.date).toLocaleTimeString('fr-FR');
      const contact = contacts.find(c => c.id===r.contact_id||c.id===r.contactId);
      const clientName = contact ? escapeHtml(contact.name) : ('Contact #'+(r.contactId||'—'));
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
      const statusBadge = r.confirmed ? '<span style="background:rgba(16,185,129,0.12);color:#10b981;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600;">✓ Confirmé</span>' : '';
      const confirmBtn  = r.confirmed ? '' : `<button class="confirm-zenscan" data-id="${r.id}" data-total="${escapeHtml(r.total||'')}" data-client="${escapeHtml(clientName)}" style="background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.2);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:16px;margin-right:8px;" title="Confirmer">✅</button>`;
      tr.innerHTML = `<td style="white-space:nowrap;">${r.id}</td><td style="min-width:160px">${clientName}</td><td style="cursor:pointer;color:#f97316;" class="zenscan-view-details" data-id="${r.id}" title="Voir les détails">${servicesPreview}</td><td style="min-width:180px">${escapeHtml(r.dest||'—')}</td><td style="white-space:nowrap">${escapeHtml(r.total||'—')} ${statusBadge}</td><td style="white-space:nowrap">${dateStr}</td><td><div class="action-links" style="display:flex;gap:8px;">${confirmBtn}<button class="del-zenscan" data-id="${r.id}" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:16px;" title="Supprimer">🗑️</button></div></td>`;
      tr.dataset.zenscanData = JSON.stringify({ id:r.id, client:clientName, services:servicesFullText, dest:r.dest||'—', total:r.total||'—', date:dateStr, confirmed:r.confirmed });
      zenscanTbody.appendChild(tr);
    });
    zenscanTbody.querySelectorAll('.zenscan-view-details').forEach(el => el.addEventListener('click', e => {
      const data = JSON.parse(e.target.closest('tr').dataset.zenscanData);
      showZenscanDetails(data);
    }));
    zenscanTbody.querySelectorAll('.confirm-zenscan').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); confirmZenscan(Number(e.target.dataset.id), e.target.dataset.total, e.target.dataset.client); }));
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

  async function confirmZenscan(id, totalStr, clientName) {
    if (!confirm(`Confirmer la demande ZenScan pour ${clientName} (${totalStr}) ?`)) return;
    try {
      const { error: updateError } = await window.supabase.from('zenscan_requests').update({ confirmed:true }).eq('id', id);
      if (updateError) { alert('❌ Erreur lors de la mise à jour'); return; }
      const amount = parseFloat(totalStr.replace(/[^0-9.-]/g,'')) || 0;
      if (amount > 0) {
        const { error: financeError } = await window.supabase.from('finances').insert([{ id: Date.now(), description:`ZenScan: ${clientName}`, type:'revenue', amount, category:'zenscan', zenscan_id: id }]);
        if (financeError) { alert('❌ Erreur lors de l\'ajout dans les finances'); return; }
      }
      alert('✅ ZenScan confirmé et ajouté aux finances !');
      await renderZenscanTable();
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
    const average = total>0 ? (reviews.reduce((s,r)=>s+r.rating,0)/total).toFixed(1) : 0;
    document.getElementById('avis-total').textContent    = total;
    document.getElementById('avis-average').textContent  = `${average} ⭐`;
    document.getElementById('avis-5stars').textContent   = reviews.filter(r=>r.rating===5).length;
    document.getElementById('avis-lowstars').textContent = reviews.filter(r=>r.rating<=2).length;
    if (reviews.length === 0) {
      container.innerHTML = '<div style="background:rgba(255,255,255,0.02);padding:40px;text-align:center;border-radius:12px;border:1px solid rgba(255,255,255,0.06);"><div style="font-size:48px;margin-bottom:16px;opacity:0.3;">💬</div><div style="color:var(--muted);font-size:15px;">Aucun avis client pour le moment</div></div>';
      return;
    }
    let html = `<div style="background:rgba(255,255,255,0.02);border-radius:12px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.06);"><th style="padding:14px 16px;text-align:left;color:var(--muted);font-weight:600;font-size:13px;text-transform:uppercase;">Client</th><th style="padding:14px 16px;text-align:left;color:var(--muted);font-weight:600;font-size:13px;text-transform:uppercase;">Note</th><th style="padding:14px 16px;text-align:left;color:var(--muted);font-weight:600;font-size:13px;text-transform:uppercase;">Commentaire</th><th style="padding:14px 16px;text-align:left;color:var(--muted);font-weight:600;font-size:13px;text-transform:uppercase;">Date</th><th style="padding:14px 16px;text-align:center;color:var(--muted);font-weight:600;font-size:13px;text-transform:uppercase;">Actions</th></tr></thead><tbody>`;
    reviews.forEach((review, index) => {
      const date = new Date(review.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
      const stars = '⭐'.repeat(review.rating)+'☆'.repeat(5-review.rating);
      const ratingColor = review.rating>=4?'#10b981':review.rating===3?'#f59e0b':'#ef4444';
      const borderBottom = index<reviews.length-1?'border-bottom:1px solid rgba(255,255,255,0.06);':'';
      html += `<tr style="${borderBottom}"><td style="padding:14px 16px;"><div style="font-weight:600;color:var(--text);font-size:14px;">${review.client_name}</div></td><td style="padding:14px 16px;"><div style="font-size:16px;color:${ratingColor};">${stars}</div></td><td style="padding:14px 16px;"><div style="color:var(--text);font-size:14px;max-width:400px;line-height:1.5;">${review.comment}</div></td><td style="padding:14px 16px;"><div style="color:var(--muted);font-size:13px;">${date}</div></td><td style="padding:14px 16px;text-align:center;"><button onclick="deleteReview(${review.id})" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:16px;">🗑️</button></td></tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  window.loadReviewsAdmin = loadReviews;

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

  // ── INIT ──
  (async () => {
    await renderVehiclesTable();
    await updateDashboard();
  })();

  if (addAdminBtn) addAdminBtn.addEventListener('click', () => openVehicleModal());
}