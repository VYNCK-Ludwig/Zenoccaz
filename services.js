// ── SERVICES PAGE JS ──
// Séparé de services.html — dépend de Supabase (window.supabase)

'use strict';

// ─────────────────────────────────────────
// DONNÉES RÉFÉRENCE
// ─────────────────────────────────────────
const MARQUES = ['Audi','BMW','Citroën','Dacia','Fiat','Ford','Honda','Hyundai','Kia','Mazda','Mercedes','Nissan','Opel','Peugeot','Renault','Seat','Skoda','Toyota','Volkswagen','Volvo','Alpine','DS','Jeep','Land Rover','Lexus','Maserati','Mini','Mitsubishi','Porsche','Subaru','Suzuki','Tesla','Autre'];
const CARBURANTS = ['Essence','Diesel','Hybride','Hybride rechargeable','Électrique','GPL'];
const BOITES = ['Manuelle','Automatique','Semi-automatique'];
const ETATS = [
  { val:'excellent', label:'Excellent', desc:'Aucun défaut visible, entretien parfait', mult:1.00 },
  { val:'bon',       label:'Bon',       desc:'Usure normale pour l\'âge',              mult:0.88 },
  { val:'a_reparer', label:'À réparer', desc:'Pannes ou dégâts importants — valeur pièces', mult:0.18 }
];
const PRIX_NEUF_REF = {
  'Audi':42000,'BMW':48000,'Mercedes':50000,'Volkswagen':32000,'Porsche':95000,
  'Renault':22000,'Peugeot':23000,'Citroën':21000,'DS':35000,'Alpine':62000,
  'Ford':25000,'Opel':22000,'Seat':24000,'Skoda':26000,'Dacia':16000,
  'Toyota':28000,'Honda':26000,'Mazda':27000,'Mitsubishi':24000,'Subaru':28000,
  'Hyundai':25000,'Kia':25000,'Nissan':24000,'Fiat':20000,'Mini':32000,
  'Volvo':45000,'Land Rover':60000,'Lexus':48000,'Maserati':90000,
  'Tesla':55000,'Suzuki':18000,'Jeep':38000,'Autre':25000
};
const DEPRECIATION = {
  0:1.00,1:0.80,2:0.70,3:0.62,4:0.55,5:0.49,
  6:0.44,7:0.40,8:0.36,9:0.32,10:0.29,
  11:0.27,12:0.25,13:0.23,14:0.21,15:0.20,
  16:0.19,17:0.18,18:0.17,19:0.16,20:0.15
};

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function getDepreciation(age) {
  if (age <= 0) return DEPRECIATION[0];
  const a = Math.min(Math.floor(age), 20);
  const b = Math.min(Math.ceil(age), 20);
  if (a === b) return DEPRECIATION[a];
  return DEPRECIATION[a] + (DEPRECIATION[b] - DEPRECIATION[a]) * (age - a);
}

function calculerEstimation(marque, annee, km, carburant, etat, options, motorisation, finition) {
  const age      = new Date().getFullYear() - parseInt(annee);
  const prixNeuf = PRIX_NEUF_REF[marque] || 25000;
  const kmInt    = parseInt(km) || 0;
  let prix = prixNeuf * getDepreciation(age);
  const kmRef  = age * 15000;
  const kmDiff = kmInt - kmRef;
  prix -= (kmDiff / 1000) * (prix * 0.0012);
  if (carburant === 'Diesel')               prix *= age >= 10 ? 0.93 : 0.97;
  if (carburant === 'Hybride')              prix *= 1.06;
  if (carburant === 'Hybride rechargeable') prix *= 1.10;
  if (carburant === 'Électrique')           prix *= 1.08;
  if (carburant === 'GPL')                  prix *= 0.87;
  const etatsMultipliers = { 'excellent':1.00, 'bon':0.88, 'a_reparer':0.18 };
  prix *= (etatsMultipliers[etat] || 0.88);
  if (motorisation) {
    const m = motorisation.toLowerCase();
    if (/v8|v10|v12|biturbo|bi-turbo|4\.0|5\.0|6\.0/.test(m))        prix *= 1.18;
    else if (/v6|3\.0|2\.9|2\.8|2\.7|3\.5/.test(m))                   prix *= 1.10;
    else if (/2\.5|2\.4|2\.3|rs|amg|m sport|gti|gtd|st|s3|s4|s5/.test(m)) prix *= 1.08;
    else if (/2\.0 tsi|2\.0 tfsi|2\.0t|thp|tce 200|tce 205/.test(m)) prix *= 1.05;
    else if (/1\.4 tsi|1\.5 tsi|1\.2 tsi|turbo/.test(m))             prix *= 1.03;
    else if (/électrique|ev|bev|phev/.test(m))                        prix *= 1.08;
    else if (/1\.0|1\.2|1\.1|three.cyl|3.cyl/.test(m))               prix *= 0.95;
  }
  if (finition) {
    const f = finition.toLowerCase();
    if (/black edition|nürburgring|pista|trofeo|sv|superleggera|mansory|brabus/.test(f)) prix *= 1.20;
    else if (/amg|m sport|rs |r-line|fr |st |gti|gtd|cupra|svr|autobiography|lounge s/.test(f)) prix *= 1.15;
    else if (/s line|s-line|sport|r sport|gt line|allure|signature|titanium|limited|prestige|executive|elegance/.test(f)) prix *= 1.08;
    else if (/business|confort|comfort|active|style|design|dynamique|trend|edition/.test(f)) prix *= 1.04;
    else if (/access|base|entry|essential|life|like|tonic|expression/.test(f)) prix *= 0.96;
  }
  if (options.includes('ct_ok'))         prix *= 1.04;
  if (options.includes('carnet'))        prix *= 1.03;
  if (options.includes('premiere_main')) prix *= 1.05;
  if (options.includes('garantie'))      prix *= 1.03;
  let plancher;
  if (etat === 'a_reparer') {
    plancher = age <= 5 ? 500 : age <= 10 ? 350 : 250;
  } else {
    plancher = age <= 3 ? 3000 : age <= 6 ? 2000 : age <= 10 ? 1500 : age <= 15 ? 800 : 500;
  }
  prix = Math.max(plancher, prix);
  const moy = Math.round(prix / 50) * 50;
  const min = Math.round(prix * 0.90 / 50) * 50;
  const max = Math.round(prix * 1.10 / 50) * 50;
  return { min, max, moy };
}

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
window.showZenToast = function(msg, type) {
  const ex = document.getElementById('zen-toast');
  if (ex) ex.remove();
  const toast = document.createElement('div');
  toast.id = 'zen-toast';
  const bg = type === 'success'
    ? 'linear-gradient(135deg,#10b981,#059669)'
    : 'linear-gradient(135deg,#ef4444,#dc2626)';
  toast.style.cssText = [
    'position:fixed','bottom:32px','left:50%','transform:translateX(-50%)',
    'background:' + bg,'color:#fff','padding:16px 28px','border-radius:16px',
    'font-family:Inter,sans-serif','font-size:14px','font-weight:600',
    'box-shadow:0 8px 32px rgba(0,0,0,0.4)','z-index:99999',
    'max-width:500px','width:calc(100vw - 40px)','text-align:center','line-height:1.5'
  ].join(';');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .4s';
    setTimeout(() => toast.remove(), 400);
  }, 5000);
};

// ─────────────────────────────────────────
// HEADER — ÉTAT CONNEXION
// ─────────────────────────────────────────
function updateHeader() {
  const raw = localStorage.getItem('clientData');
  let client = null;
  try { client = raw ? JSON.parse(raw) : null; } catch(e) {}
  const chip   = document.getElementById('hdr-user-chip');
  const btn    = document.getElementById('hdr-btn-compte');
  const name   = document.getElementById('hdr-user-name');
  const avatar = document.getElementById('hdr-user-avatar');
  if (client && client.name) {
    chip?.classList.add('visible');
    if (btn)    btn.style.display = 'none';
    if (name)   name.textContent   = client.name.split(' ')[0] || client.name;
    if (avatar) avatar.textContent = client.name.charAt(0).toUpperCase();
  } else {
    chip?.classList.remove('visible');
    if (btn) btn.style.display = '';
  }
}

window.logoutUser = function() {
  sessionStorage.removeItem('zenoccaz_current_user');
  localStorage.removeItem('clientData');
  window.dispatchEvent(new CustomEvent('clientLogout'));
  window.location.href = 'index.html';
};

function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem('zenoccaz_current_user');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function setCurrentUser(obj) {
  try {
    sessionStorage.setItem('zenoccaz_current_user', JSON.stringify(obj));
    localStorage.setItem('clientData', JSON.stringify({
      id: obj.id, name: obj.name, email: obj.email || '',
      connectedAt: new Date().toISOString()
    }));
    updateHeader();
  } catch(e) {}
}

// ─────────────────────────────────────────
// MODAL AUTH (connexion / inscription)
// ─────────────────────────────────────────
function buildAuthModal() {
  if (document.getElementById('auth-modal')) return;
  const html = `
  <div id="auth-modal" class="hidden" aria-hidden="true" role="dialog" aria-labelledby="auth-title">
    <div class="auth-box">
      <div class="auth-icon">🔐</div>
      <h2 class="auth-title" id="auth-title">Identifiez-vous</h2>
      <p class="auth-sub">Finalisez votre demande en vous connectant ou en créant un compte gratuit.</p>
      <div class="auth-tabs">
        <button id="auth-tab-register" class="auth-tab active">✨ Créer un compte</button>
        <button id="auth-tab-login" class="auth-tab">Se connecter</button>
      </div>
      <form id="auth-form">
        <div id="reg-fields" style="display:flex;flex-direction:column;">
          <div class="auth-2col">
            <div class="auth-field"><label>Prénom <span class="auth-required">*</span></label><input id="reg-first" placeholder="Jean" /></div>
            <div class="auth-field"><label>Nom <span class="auth-required">*</span></label><input id="reg-last" placeholder="Dupont" /></div>
          </div>
          <div class="auth-2col">
            <div class="auth-field"><label>Email</label><input id="reg-email" type="email" placeholder="jean@email.com" /></div>
            <div class="auth-field"><label>Téléphone</label><input id="reg-phone" type="tel" placeholder="06 12 34 56 78" /></div>
          </div>
          <div class="auth-field"><label>Adresse complète <span class="auth-required">*</span></label><input id="reg-address" placeholder="12 rue de la Paix, 75001 Paris" /></div>
          <div class="auth-field"><label>Plaque d'immatriculation <span class="auth-required">*</span></label><input id="reg-plate" placeholder="AB-123-CD" style="text-transform:uppercase;letter-spacing:2px;font-weight:700;" /></div>
          <div class="auth-field"><label>Mot de passe <span class="auth-required">*</span></label><input id="reg-password" type="password" placeholder="Minimum 6 caractères" /></div>
          <div class="auth-actions">
            <button type="button" id="reg-cancel" class="auth-btn-cancel">Annuler</button>
            <button type="button" id="reg-submit" class="auth-btn-primary">✅ Créer & Envoyer</button>
          </div>
        </div>
        <div id="login-fields" style="display:none;flex-direction:column;">
          <div class="auth-field"><label>Email <span class="auth-required">*</span></label><input id="login-email" type="email" placeholder="votre@email.com" /></div>
          <div class="auth-field"><label>Mot de passe <span class="auth-required">*</span></label><input id="login-password" type="password" placeholder="••••••••" /></div>
          <div class="auth-actions">
            <button type="button" id="login-cancel" class="auth-btn-cancel">Annuler</button>
            <button type="button" id="login-submit" class="auth-btn-primary">✅ Se connecter</button>
          </div>
        </div>
      </form>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  bindAuthModal();
}

function openAuthModal(mode) {
  buildAuthModal();
  const authModal = document.getElementById('auth-modal');
  authModal.classList.remove('hidden');
  authModal.setAttribute('aria-hidden', 'false');
  const regFields   = document.getElementById('reg-fields');
  const loginFields = document.getElementById('login-fields');
  const tabReg  = document.getElementById('auth-tab-register');
  const tabLogin = document.getElementById('auth-tab-login');
  if (mode === 'login') {
    loginFields.style.display = 'flex';
    regFields.style.display = 'none';
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
  } else {
    loginFields.style.display = 'none';
    regFields.style.display = 'flex';
    tabReg.classList.add('active');
    tabLogin.classList.remove('active');
  }
}
window.openAuthModalGlobal = openAuthModal;

function closeAuthModal() {
  const m = document.getElementById('auth-modal');
  if (m) { m.classList.add('hidden'); m.setAttribute('aria-hidden', 'true'); }
}

function showAuthError(msg) {
  let el = document.getElementById('auth-error-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'auth-error-msg';
    el.style.cssText = 'background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:12px 16px;font-size:13px;color:#fca5a5;margin-bottom:16px;display:flex;align-items:center;gap:8px;';
    const form = document.getElementById('auth-form');
    if (form) form.insertBefore(el, form.firstChild);
  }
  el.innerHTML = '❌ ' + msg;
  el.style.display = 'flex';
  setTimeout(() => { if (el) el.style.display = 'none'; }, 4000);
}

function bindAuthModal() {
  document.getElementById('auth-tab-login').addEventListener('click',    () => openAuthModal('login'));
  document.getElementById('auth-tab-register').addEventListener('click', () => openAuthModal('register'));
  document.getElementById('reg-cancel').addEventListener('click',         closeAuthModal);
  document.getElementById('login-cancel').addEventListener('click',       closeAuthModal);

  // Inscription
  document.getElementById('reg-submit').addEventListener('click', async () => {
    const first    = (document.getElementById('reg-first').value||'').trim();
    const last     = (document.getElementById('reg-last').value||'').trim();
    const email    = (document.getElementById('reg-email').value||'').trim();
    const phone    = (document.getElementById('reg-phone').value||'').trim();
    const addr     = (document.getElementById('reg-address').value||'').trim();
    const plate    = (document.getElementById('reg-plate').value||'').trim();
    const password = (document.getElementById('reg-password').value||'').trim();

    if (!first || !last || !plate) { showAuthError('Prénom, nom et plaque sont obligatoires.'); return; }
    if (password.length < 6)        { showAuthError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    try {
      if (!window.supabase) { showAuthError('Erreur de connexion. Réessayez.'); return; }
      if (email) {
        const { data: existing } = await window.supabase.from('clients').select('id').eq('email', email).single();
        if (existing) { showAuthError('Cet email est déjà utilisé. Connectez-vous.'); return; }
      }
      const newId = Date.now();
      const code  = 'ZEN' + String(newId).padStart(5, '0');
      const { error: clientErr } = await window.supabase.from('clients').insert([{
        id: newId, name: last + ' ' + first,
        email: email || null, phone: phone || null,
        password: password, code_parrainage: code
      }]);
      if (clientErr) { showAuthError('Erreur création compte : ' + clientErr.message); return; }
      // (sync contacts supprimé — table contacts retirée)
      const clientData = { id: newId, name: last + ' ' + first, email, connectedAt: new Date().toISOString() };
      localStorage.setItem('clientData', JSON.stringify(clientData));
      window.dispatchEvent(new CustomEvent('clientLogin', { detail: clientData }));
      setCurrentUser({ id: newId, name: clientData.name });
      closeAuthModal();
      // Exécuter le callback en attente si présent
      if (typeof window._pendingServiceCallback === 'function') {
        const cb = window._pendingServiceCallback;
        window._pendingServiceCallback = null;
        cb();
      }
    } catch(e) { showAuthError('Erreur : ' + e.message); }
  });

  // Connexion
  document.getElementById('login-submit').addEventListener('click', async () => {
    const email    = (document.getElementById('login-email').value||'').trim();
    const password = (document.getElementById('login-password').value||'').trim();
    if (!email || !password) { showAuthError('Email et mot de passe requis.'); return; }
    try {
      if (!window.supabase) { showAuthError('Erreur de connexion. Réessayez.'); return; }
      const { data, error } = await window.supabase
        .from('clients').select('*')
        .eq('email', email).eq('password', password).single();
      if (error || !data) { showAuthError('Email ou mot de passe incorrect.'); return; }
      const clientData = { id: data.id, name: data.name, email: data.email, connectedAt: new Date().toISOString() };
      localStorage.setItem('clientData', JSON.stringify(clientData));
      window.dispatchEvent(new CustomEvent('clientLogin', { detail: clientData }));
      setCurrentUser({ id: data.id, name: data.name });
      // (sync contacts supprimé — table contacts retirée)
      closeAuthModal();
      // Exécuter callback en attente
      if (typeof window._pendingServiceCallback === 'function') {
        const cb = window._pendingServiceCallback;
        window._pendingServiceCallback = null;
        cb();
      }
    } catch(e) { showZenToast('❌ Erreur : ' + e.message, 'error'); }
  });
}

// ─────────────────────────────────────────
// ZENSCAN — MODAL DIAGNOSTIC
// ─────────────────────────────────────────
(function initZenscan() {
  const ORIGIN   = '2 chemin de la baleyte 03380 Huriel France';
  const KM_FREE  = 20;
  const KM_PRICE = 0.5;

  function qs(s, root) { return (root||document).querySelector(s); }
  function qsa(s, root) { return Array.from((root||document).querySelectorAll(s)); }

  async function geocode(query) {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(query);
    try {
      const res  = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (data && data.length) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch(e) {}
    return null;
  }

  function haversineKm([lat1, lon1], [lat2, lon2]) {
    const toRad = r => r * Math.PI / 180;
    const R    = 6371;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a    = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  document.addEventListener('DOMContentLoaded', () => {
    const openBtn    = qs('#open-diagnostic-btn');
    const modal      = qs('#diagnostic-modal');
    const closeBtn   = qs('#close-diagnostic');
    const calcBtn    = qs('#calc-distance');
    const destInput  = qs('#dest-address');
    const deplBlock  = qs('#depl-block');
    const priceTotalEl   = qs('#price-total');
    const priceBreakdownEl = qs('#price-breakdown');
    const distanceResult = qs('#distance-result');
    const confirmBtn = qs('#confirm-diagnostic');
    if (!openBtn || !modal) return;

    let originCoords = null;
    geocode(ORIGIN).then(c => { originCoords = c; });

    openBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
    });
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    });
    modal.addEventListener('click', e => {
      if (e.target === modal) { modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); }
    });

    const deplCheckbox = qsa('input[name="service"][value="deplacement"]')[0];
    if (deplCheckbox) {
      deplCheckbox.addEventListener('change', e => {
        deplBlock.style.display = e.target.checked ? 'flex' : 'none';
        updatePrice();
      });
    }

    calcBtn.addEventListener('click', async () => {
      const dest = (destInput.value||'').trim();
      if (!dest) { distanceResult.textContent = 'Veuillez saisir l\'adresse du client.'; return; }
      distanceResult.textContent = 'Calcul en cours…';
      const destCoords = await geocode(dest);
      if (!destCoords) { distanceResult.textContent = 'Adresse introuvable.'; return; }
      if (!originCoords) { originCoords = await geocode(ORIGIN); }
      if (!originCoords) { distanceResult.textContent = 'Impossible de géocoder l\'origine.'; return; }
      const km     = Math.max(0, Math.round(haversineKm([originCoords.lat, originCoords.lon], [destCoords.lat, destCoords.lon]) * 10) / 10);
      const extra  = Math.max(0, km - KM_FREE);
      const fee    = Math.round(extra * KM_PRICE * 100) / 100;
      distanceResult.innerHTML = `Distance estimée: <strong>${km} km</strong> — Frais déplacement: <strong>${fee.toFixed(2)} €</strong> (${KM_FREE} km offerts)`;
      distanceResult.dataset.km  = km;
      distanceResult.dataset.fee = fee;
      updatePrice();
    });

    function updatePrice() {
      const checked = qsa('input[name="service"]:checked', modal);
      let sum = 0, breakdown = [];
      checked.forEach(ch => {
        const price = parseFloat(ch.dataset.price) || 0;
        if (ch.value === 'deplacement') {
          const fee = parseFloat(distanceResult.dataset.fee) || 0;
          breakdown.push(ch.parentNode.textContent.trim() + ': ' + fee.toFixed(2) + ' €');
          sum += fee;
        } else {
          breakdown.push(ch.parentNode.textContent.trim() + ': ' + price.toFixed(2) + ' €');
          sum += price;
        }
      });
      priceTotalEl.textContent     = sum.toFixed(2) + ' €';
      priceBreakdownEl.innerHTML   = breakdown.join('<br>');
    }

    qsa('input[name="service"]', modal).forEach(el => el.addEventListener('change', updatePrice));

    confirmBtn.addEventListener('click', () => {
      const user = getCurrentUser();
      if (!user) {
        window._pendingServiceCallback = () => {
          // Réouvrir le modal diagnostic et finaliser
          modal.classList.remove('hidden');
          modal.setAttribute('aria-hidden', 'false');
          const u = getCurrentUser();
          if (u) finalizeZenscanRequest(u.id);
        };
        openAuthModal('register');
      } else {
        finalizeZenscanRequest(user.id);
      }
    });

    async function finalizeZenscanRequest(contactId) {
      const checked = qsa('input[name="service"]:checked', modal).map(i => i.dataset.title || i.value);
      if (checked.length === 0) { showZenToast('❌ Sélectionnez au moins un service.', 'error'); return; }
      const summary = priceBreakdownEl.innerText || '—';
      const total   = priceTotalEl.textContent;
      const reqObj  = {
        id: Date.now(), contact_id: contactId,
        services: checked, breakdown: summary,
        total: total, dest: destInput.value || null
      };
      try {
        if (!window.supabase) { showAuthError('❌ Erreur: Supabase non initialisé'); return; }
        const { error } = await window.supabase.from('zenscan_requests').insert([reqObj]);
        if (error) { showZenToast('❌ Erreur lors de l\'enregistrement : ' + error.message, 'error'); return; }
        showZenToast('✅ Votre demande ZenScan a bien été enregistrée ! Nous vous contactons rapidement.', 'success');
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
      } catch(e) { showZenToast('❌ Erreur : ' + e.message, 'error'); }
    }
  });
})();

// ─────────────────────────────────────────
// REPRISE — TUNNEL 4 ÉTAPES
// ─────────────────────────────────────────
window.ouvrirDemandeReprise = async function() {
  const existing = document.getElementById('reprise-modal-overlay');
  if (existing) existing.remove();

  let client = null;
  try { const raw = localStorage.getItem('clientData'); client = raw ? JSON.parse(raw) : null; } catch(e) {}

  if (!client || !client.id) {
    window._pendingServiceCallback = () => window.ouvrirDemandeReprise();
    openAuthModal('login');
    return;
  }

  let phone = '', email = client.email || '';
  if (window.supabase) {
    const { data } = await window.supabase.from('clients').select('phone,email').eq('id', client.id).single();
    if (data) { phone = data.phone || ''; email = data.email || email; }
  }
  const clientName = client.name || '';

  let step = 1;
  const totalSteps = 4;
  const formData = { marque:'', modele:'', annee:'', km:'', carburant:'', boite:'', etat:'', options:[], plaque:'', tel:phone, message:'', ch:'', cv:'', motorisation:'', finition:'' };

  const overlay = document.createElement('div');
  overlay.id = 'reprise-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,18,0.92);backdrop-filter:blur(20px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;overflow-y:auto;';
  document.body.appendChild(overlay);

  function renderStep() {
    const steps = [
      { num:1, label:'Véhicule' }, { num:2, label:'État' },
      { num:3, label:'Estimation' }, { num:4, label:'Confirmation' }
    ];
    const progressBar = steps.map(s => `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">
        <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;transition:all 0.3s;
          ${step > s.num ? 'background:#10b981;color:#fff;box-shadow:0 0 12px rgba(16,185,129,0.5);' :
            step === s.num ? 'background:rgba(16,185,129,0.15);border:2px solid #10b981;color:#10b981;' :
            'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#475569;'}">
          ${step > s.num ? '✓' : s.num}
        </div>
        <span style="font-size:10px;font-weight:600;letter-spacing:0.5px;${step >= s.num ? 'color:#10b981;' : 'color:#334155;'}">${s.label}</span>
      </div>
      ${s.num < steps.length ? `<div style="flex:1;height:2px;margin-top:15px;background:${step > s.num ? '#10b981' : 'rgba(255,255,255,0.06)'};border-radius:2px;transition:background 0.3s;"></div>` : ''}
    `).join('');

    let stepContent = '';

    if (step === 1) {
      stepContent = `
        <h3 style="font-size:18px;font-weight:800;color:#fff;margin:0 0 6px;text-align:center;">Votre véhicule</h3>
        <p style="font-size:12px;color:#475569;text-align:center;margin:0 0 24px;">Renseignez les informations de base</p>
        <div class="svc-2col" style="margin-bottom:14px;">
          <div class="svc-field">
            <label>Marque *</label>
            <select id="rep-marque" style="width:100%;padding:12px 14px;background:#0d1117;border:1px solid rgba(255,255,255,0.12);border-radius:13px;color:#e2e8f0;font-size:14px;box-sizing:border-box;" class="rep-select-dark">
              <option value="">Choisir...</option>
              ${MARQUES.map(m => `<option value="${m}" ${formData.marque===m?'selected':''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="svc-field"><label>Modèle *</label><input id="rep-modele" placeholder="Ex: Clio, 308, Golf..." value="${formData.modele}" /></div>
        </div>
        <div class="svc-2col" style="margin-bottom:14px;">
          <div class="svc-field">
            <label>Année *</label>
            <select id="rep-annee" style="width:100%;padding:12px 14px;background:#0d1117;border:1px solid rgba(255,255,255,0.12);border-radius:13px;color:#e2e8f0;font-size:14px;box-sizing:border-box;" class="rep-select-dark">
              <option value="">Année...</option>
              ${Array.from({length:25},(_,i)=>2024-i).map(y=>`<option value="${y}" ${formData.annee==y?'selected':''}>${y}</option>`).join('')}
            </select>
          </div>
          <div class="svc-field"><label>Kilométrage *</label><input id="rep-km" type="number" placeholder="Ex: 85000" value="${formData.km}" /></div>
        </div>
        <div class="svc-2col" style="margin-bottom:14px;">
          <div class="svc-field">
            <label>Carburant *</label>
            <select id="rep-carburant" style="width:100%;padding:12px 14px;background:#0d1117;border:1px solid rgba(255,255,255,0.12);border-radius:13px;color:#e2e8f0;font-size:14px;box-sizing:border-box;" class="rep-select-dark">
              <option value="">Choisir...</option>
              ${CARBURANTS.map(c=>`<option value="${c}" ${formData.carburant===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="svc-field">
            <label>Boîte de vitesses</label>
            <select id="rep-boite" style="width:100%;padding:12px 14px;background:#0d1117;border:1px solid rgba(255,255,255,0.12);border-radius:13px;color:#e2e8f0;font-size:14px;box-sizing:border-box;" class="rep-select-dark">
              <option value="">Choisir...</option>
              ${BOITES.map(b=>`<option value="${b}" ${formData.boite===b?'selected':''}>${b}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="svc-field" style="margin-bottom:14px;"><label>Immatriculation (optionnel)</label><input id="rep-plaque" placeholder="AA-123-BB" value="${formData.plaque}" /></div>
        <div class="svc-2col" style="margin-bottom:14px;">
          <div class="svc-field"><label>Puissance réelle (CH)</label><input id="rep-ch" type="number" placeholder="Ex: 190" value="${formData.ch||''}" /></div>
          <div class="svc-field"><label>Puissance fiscale (CV)</label><input id="rep-cv" type="number" placeholder="Ex: 11" value="${formData.cv||''}" /></div>
        </div>
        <div class="svc-field" style="margin-bottom:14px;"><label>Motorisation</label><input id="rep-motorisation" placeholder="Ex: 2.7 TDI V6, 1.6 HDi..." value="${formData.motorisation||''}" /></div>
        <div class="svc-field"><label>Finition / Équipement</label><input id="rep-finition" placeholder="Ex: S Line, GT Line, AMG..." value="${formData.finition||''}" /></div>
      `;
    }

    if (step === 2) {
      stepContent = `
        <h3 style="font-size:18px;font-weight:800;color:#fff;margin:0 0 6px;text-align:center;">État du véhicule</h3>
        <p style="font-size:12px;color:#475569;text-align:center;margin:0 0 20px;">Soyez honnête pour une estimation précise</p>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
          ${ETATS.map(e => `
            <label style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;cursor:pointer;border:1.5px solid ${formData.etat===e.val?'#10b981':'rgba(255,255,255,0.07)'};background:${formData.etat===e.val?'rgba(16,185,129,0.08)':'rgba(255,255,255,0.02)'};transition:all 0.2s;">
              <input type="radio" name="rep-etat" value="${e.val}" ${formData.etat===e.val?'checked':''} style="accent-color:#10b981;width:16px;height:16px;flex-shrink:0;" />
              <div style="flex:1;">
                <div style="font-weight:700;color:#e2e8f0;font-size:14px;margin-bottom:2px;">${e.label}</div>
                <div style="font-size:11px;color:#475569;">${e.desc}</div>
              </div>
            </label>
          `).join('')}
        </div>
        <p style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#64748b;margin:0 0 12px;">Options valorisantes</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${[{val:'ct_ok',label:'✅ CT valide'},{val:'carnet',label:'📋 Carnet entretien'},{val:'premiere_main',label:'👤 1ère main'},{val:'garantie',label:'🛡️ Garantie restante'}].map(o=>`
            <label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;cursor:pointer;border:1px solid ${formData.options.includes(o.val)?'rgba(16,185,129,0.4)':'rgba(255,255,255,0.06)'};background:${formData.options.includes(o.val)?'rgba(16,185,129,0.07)':'rgba(255,255,255,0.02)'};transition:all 0.2s;">
              <input type="checkbox" value="${o.val}" class="rep-option" ${formData.options.includes(o.val)?'checked':''} style="accent-color:#10b981;width:14px;height:14px;" />
              <span style="font-size:12px;font-weight:600;color:#cbd5e1;">${o.label}</span>
            </label>
          `).join('')}
        </div>
      `;
    }

    if (step === 3) {
      stepContent = `
        <div style="text-align:center;padding:40px 20px;">
          <div style="width:48px;height:48px;border:3px solid rgba(16,185,129,0.2);border-top-color:#10b981;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 20px;"></div>
          <div style="font-size:15px;font-weight:600;color:#fff;margin-bottom:8px;">Analyse du marché en cours...</div>
          <div style="font-size:12px;color:#475569;">Recherche sur LeBonCoin, La Centrale, AutoScout24</div>
        </div>
      `;
      setTimeout(async () => {
        try {
          const SERVER_URL = window.ZENOCCAZ_SERVER_URL || 'https://zenoccaz.onrender.com';
          const response = await fetch(SERVER_URL + '/api/estimation-reprise', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ marque:formData.marque, modele:formData.modele, annee:formData.annee, km:formData.km, carburant:formData.carburant, boite:formData.boite, etat:formData.etat, motorisation:formData.motorisation, finition:formData.finition, ch:formData.ch, cv:formData.cv, options:formData.options })
          });
          const data = await response.json();
          if (!data.success || !data.estimation) {
            const stepEl = document.getElementById('rep-step-content');
            if (stepEl) stepEl.innerHTML = `<div style="text-align:center;padding:32px 20px;"><div style="font-size:36px;margin-bottom:16px;">📡</div><div style="font-size:15px;font-weight:700;color:#ef4444;margin-bottom:8px;">Recherche marché indisponible</div><div style="font-size:12px;color:#475569;margin-bottom:20px;">Réessayez dans quelques instants.</div><button onclick="window._repriseRetry&&window._repriseRetry()" style="background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.3);padding:10px 24px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">🔄 Réessayer</button></div>`;
            window._repriseRetry = () => { step = 3; renderStep(); };
            return;
          }
          const est = data.estimation;
          formData._estimation = { min:est.est_min, max:est.est_max, moy:est.est_moy };
          window._repriseEstimation = formData._estimation;
          window._repriseFormData   = {...formData};
          const etatsObj = ETATS.find(e=>e.val===formData.etat);
          const sourceLabel = est.source === 'web' ? '<span style="color:#10b981;font-size:10px;">✓ Basé sur les annonces du marché</span>' : '<span style="color:#64748b;font-size:10px;">Estimation IA</span>';
          const stepEl = document.getElementById('rep-step-content');
          if (stepEl) stepEl.innerHTML = `
            <h3 style="font-size:18px;font-weight:800;color:#fff;margin:0 0 4px;text-align:center;">Votre estimation</h3>
            <p style="font-size:12px;color:#475569;text-align:center;margin:0 0 4px;">${formData.marque} ${formData.modele} ${formData.annee} · ${parseInt(formData.km).toLocaleString('fr-FR')} km</p>
            <p style="text-align:center;margin:0 0 16px;">${sourceLabel}</p>
            ${est.prix_marche_min?`<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;"><div style="font-size:11px;color:#475569;">Prix de vente marché</div><div style="font-size:14px;font-weight:700;color:#64748b;">${est.prix_marche_min.toLocaleString('fr-FR')} € — ${est.prix_marche_max.toLocaleString('fr-FR')} €</div></div>`:''}
            <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(6,182,212,0.05));border:1px solid rgba(16,185,129,0.25);border-radius:18px;padding:24px;text-align:center;margin-bottom:16px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#475569;margin-bottom:12px;">Estimation de reprise</div>
              <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:8px;">
                <div style="text-align:center;"><div style="font-size:13px;color:#475569;margin-bottom:4px;">Minimum</div><div style="font-size:22px;font-weight:800;color:#94a3b8;">${est.est_min.toLocaleString('fr-FR')} €</div></div>
                <div style="font-size:28px;color:#10b981;">—</div>
                <div style="text-align:center;"><div style="font-size:13px;color:#475569;margin-bottom:4px;">Maximum</div><div style="font-size:22px;font-weight:800;color:#94a3b8;">${est.est_max.toLocaleString('fr-FR')} €</div></div>
              </div>
              <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:14px;margin-top:4px;">
                <div style="font-size:11px;color:#64748b;margin-bottom:6px;letter-spacing:0.5px;">ESTIMATION ZENOCCAZ</div>
                <div style="font-size:38px;font-weight:900;color:#10b981;text-shadow:0 0 20px rgba(16,185,129,0.4);letter-spacing:-1px;">${est.est_moy.toLocaleString('fr-FR')} €</div>
              </div>
            </div>
            ${est.explication?`<div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.15);border-radius:10px;padding:12px;font-size:11px;color:#94a3b8;line-height:1.6;margin-bottom:12px;">💡 ${est.explication}</div>`:''}
            <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:12px;font-size:11px;color:#92400e;line-height:1.5;">⚠️ Cette estimation est indicative. Le prix définitif sera confirmé après inspection physique.</div>
          `;
        } catch(err) {
          const stepEl = document.getElementById('rep-step-content');
          if (stepEl) stepEl.innerHTML = `<div style="text-align:center;padding:32px 20px;"><div style="font-size:36px;margin-bottom:16px;">📡</div><div style="font-size:15px;font-weight:700;color:#ef4444;margin-bottom:8px;">Connexion au serveur impossible</div><div style="font-size:12px;color:#475569;margin-bottom:20px;">Réessayez dans quelques secondes.</div><button onclick="window._repriseRetry&&window._repriseRetry()" style="background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.3);padding:10px 24px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">🔄 Réessayer</button></div>`;
          window._repriseRetry = () => { step = 3; renderStep(); };
        }
      }, 100);
    }

    if (step === 4) {
      const est = formData._estimation;
      stepContent = `
        <h3 style="font-size:18px;font-weight:800;color:#fff;margin:0 0 6px;text-align:center;">Confirmer la demande</h3>
        <p style="font-size:12px;color:#475569;text-align:center;margin:0 0 20px;">Nous vous contactons pour finaliser l'estimation</p>
        <div style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.15);border-radius:14px;padding:16px;margin-bottom:14px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#10b981;margin-bottom:10px;">Récapitulatif</div>
          <div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;">${formData.marque} ${formData.modele} ${formData.annee}</div>
          <div style="font-size:12px;color:#64748b;">${parseInt(formData.km).toLocaleString('fr-FR')} km · ${formData.carburant} · ${ETATS.find(e=>e.val===formData.etat)?.label||''}</div>
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;color:#475569;">Estimation ZENOCCAZ</span>
            <span style="font-size:20px;font-weight:900;color:#10b981;">${est?.moy?.toLocaleString('fr-FR')} €</span>
          </div>
        </div>
        <div class="svc-field" style="margin-bottom:12px;"><label>Téléphone *</label><input id="rep-tel-final" placeholder="06 12 34 56 78" value="${phone}" /></div>
        <div class="svc-field" style="margin-bottom:12px;"><label>Message (optionnel)</label><textarea id="rep-message-final" placeholder="Précisions sur l'état, disponibilités..." rows="2"></textarea></div>
        <div id="reprise-error" style="display:none;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:12px;font-size:13px;color:#fca5a5;margin-bottom:10px;"></div>
      `;
    }

    overlay.innerHTML = `
      <div class="svc-modal-wrapper" style="max-width:540px;">
        <div class="svc-border-wrap" style="color:#10b981;"><div class="svc-border-inner"></div></div>
        <div class="svc-modal-box" style="--svc-rgb:16,185,129;">
          <div class="svc-modal-content">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;border-radius:10px;background:rgba(16,185,129,0.1);display:flex;align-items:center;justify-content:center;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round"><path d="M5 11L6.5 6.5C6.8 5.6 7.6 5 8.5 5H15.5C16.4 5 17.2 5.6 17.5 6.5L19 11"/><rect x="2" y="11" width="20" height="7" rx="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
                </div>
                <div>
                  <div style="font-size:14px;font-weight:800;color:#fff;">Estimation reprise</div>
                  <div style="font-size:11px;color:#475569;">Étape ${step} sur ${totalSteps}</div>
                </div>
              </div>
              <button onclick="document.getElementById('reprise-modal-overlay').remove()" style="background:rgba(255,255,255,0.06);border:none;border-radius:8px;width:28px;height:28px;color:#64748b;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
            <div style="display:flex;align-items:flex-start;margin-bottom:28px;">${progressBar}</div>
            <div id="rep-step-content">${stepContent}</div>
            <div style="display:flex;gap:10px;justify-content:space-between;margin-top:24px;">
              ${step > 1 ? `<button id="rep-prev-btn" class="svc-btn-cancel" style="flex:1;">← Retour</button>` : `<button onclick="document.getElementById('reprise-modal-overlay').remove()" class="svc-btn-cancel" style="flex:1;">Annuler</button>`}
              ${step < totalSteps
                ? `<button id="rep-next-btn" class="svc-btn-primary" style="flex:2;background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 4px 20px rgba(16,185,129,0.3);">${step === 3 ? 'Confirmer l\'estimation →' : 'Continuer →'}</button>`
                : `<button id="rep-submit-btn" class="svc-btn-primary" style="flex:2;background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 4px 20px rgba(16,185,129,0.3);">✅ Envoyer ma demande</button>`
              }
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('rep-prev-btn')?.addEventListener('click', () => { saveCurrentStep(); step--; renderStep(); });
    document.getElementById('rep-next-btn')?.addEventListener('click', () => { if (!validateStep()) return; saveCurrentStep(); step++; renderStep(); });
    document.getElementById('rep-submit-btn')?.addEventListener('click', () => envoyerEstimationReprise(client.id, clientName, email));
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  }

  function saveCurrentStep() {
    if (step === 1) {
      formData.marque      = document.getElementById('rep-marque')?.value || '';
      formData.modele      = document.getElementById('rep-modele')?.value || '';
      formData.annee       = document.getElementById('rep-annee')?.value || '';
      formData.km          = document.getElementById('rep-km')?.value || '';
      formData.carburant   = document.getElementById('rep-carburant')?.value || '';
      formData.boite       = document.getElementById('rep-boite')?.value || '';
      formData.plaque      = document.getElementById('rep-plaque')?.value || '';
      formData.ch          = document.getElementById('rep-ch')?.value || '';
      formData.cv          = document.getElementById('rep-cv')?.value || '';
      formData.motorisation = document.getElementById('rep-motorisation')?.value || '';
      formData.finition    = document.getElementById('rep-finition')?.value || '';
    }
    if (step === 2) {
      formData.etat    = document.querySelector('input[name="rep-etat"]:checked')?.value || '';
      formData.options = [...document.querySelectorAll('.rep-option:checked')].map(c => c.value);
      window._repriseFormData = {...formData};
    }
  }

  function validateStep() {
    if (step === 1) {
      if (!document.getElementById('rep-marque')?.value)                        { showZenToast('❌ Sélectionnez la marque', 'error'); return false; }
      if (!(document.getElementById('rep-modele')?.value||'').trim())            { showZenToast('❌ Renseignez le modèle', 'error'); return false; }
      if (!document.getElementById('rep-annee')?.value)                         { showZenToast('❌ Sélectionnez l\'année', 'error'); return false; }
      const km = document.getElementById('rep-km')?.value;
      if (!km || isNaN(parseInt(km)))                                            { showZenToast('❌ Renseignez le kilométrage', 'error'); return false; }
      if (!document.getElementById('rep-carburant')?.value)                     { showZenToast('❌ Sélectionnez le carburant', 'error'); return false; }
    }
    if (step === 2) {
      if (!document.querySelector('input[name="rep-etat"]:checked')?.value)     { showZenToast('❌ Sélectionnez l\'état du véhicule', 'error'); return false; }
    }
    return true;
  }

  renderStep();
};

async function envoyerEstimationReprise(clientId, clientName, email) {
  const tel     = (document.getElementById('rep-tel-final')?.value||'').trim();
  const message = (document.getElementById('rep-message-final')?.value||'').trim();
  const errEl   = document.getElementById('reprise-error');
  if (!tel) { errEl.textContent = '❌ Le téléphone est obligatoire.'; errEl.style.display='block'; return; }
  const btn = document.getElementById('rep-submit-btn');
  if (btn) { btn.disabled=true; btn.textContent='⏳ Envoi...'; }
  try {
    if (!window.supabase) throw new Error('Connexion Supabase indisponible');
    const est = window._repriseEstimation || {};
    const fd  = window._repriseFormData  || {};
    const { error } = await window.supabase.from('reprise_estimations').insert([{
      id: Date.now(), client_id:clientId, client_name:clientName,
      client_email:email, client_phone:tel,
      marque:fd.marque||'', modele:fd.modele||'', annee:fd.annee||'',
      km:parseInt(fd.km)||0, carburant:fd.carburant||'', boite:fd.boite||'',
      ch:parseInt(fd.ch)||null, cv:parseInt(fd.cv)||null,
      motorisation:fd.motorisation||null, finition:fd.finition||null,
      etat:fd.etat||'', options:fd.options||[], plaque:fd.plaque||'',
      est_min:est.min||0, est_max:est.max||0, est_moy:est.moy||0,
      message:message||null, status:'en_attente'
    }]);
    if (error) throw error;
    document.getElementById('reprise-modal-overlay')?.remove();
    showZenToast('✅ Estimation envoyée ! Nous vous contactons sous 48h.', 'success');
  } catch(e) {
    if (errEl) { errEl.textContent = '❌ ' + e.message; errEl.style.display='block'; }
    if (btn)   { btn.disabled=false; btn.textContent='✅ Envoyer ma demande'; }
  }
}

// ─────────────────────────────────────────
// ACCOMPAGNEMENT
// ─────────────────────────────────────────
window.ouvrirDemandeAccompagnement = async function() {
  const existing = document.getElementById('accomp-modal-overlay');
  if (existing) { existing.remove(); }
  let client = null;
  try { const raw = localStorage.getItem('clientData'); client = raw ? JSON.parse(raw) : null; } catch(e) {}
  if (!client || !client.id) {
    window._pendingServiceCallback = () => window.ouvrirDemandeAccompagnement();
    openAuthModal('login');
    return;
  }
  let phone = '', email = client.email || '';
  if (window.supabase) {
    const { data } = await window.supabase.from('clients').select('phone,email').eq('id', client.id).single();
    if (data) { phone = data.phone || ''; email = data.email || email; }
  }
  const nameParts = (client.name || '').split(' ');
  const prenom = nameParts.slice(1).join(' ') || '';
  const nom    = nameParts[0] || '';
  const overlay = document.createElement('div');
  overlay.id = 'accomp-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,18,0.88);backdrop-filter:blur(16px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;width:100vw;height:100vh;';
  overlay.innerHTML = `
    <div class="svc-modal-wrapper">
      <div class="svc-border-wrap" style="color:#f97316;"><div class="svc-border-inner"></div></div>
      <div class="svc-modal-box" style="--svc-rgb:249,115,22;">
        <div class="svc-modal-content">
          <div class="svc-icon-wrap" style="background:rgba(249,115,22,0.1);">
            <div class="svc-icon-glow" style="background:#f97316;"></div>
            <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg>
          </div>
          <h2 style="font-size:22px;font-weight:900;color:#fff;text-align:center;margin:0 0 4px;">Expertise Achat</h2>
          <p style="font-size:13px;color:#475569;text-align:center;margin:0 0 22px;">Nous trouvons le véhicule idéal pour vous</p>
          <div class="svc-client-card" style="background:rgba(249,115,22,0.06);border-color:rgba(249,115,22,0.2);">
            <div class="svc-client-avatar" style="background:rgba(249,115,22,0.15);">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div><div class="svc-client-name">${prenom} ${nom}</div><div class="svc-client-sub">${phone?phone+' · ':''}${email||'Connecté'}</div></div>
          </div>
          <div id="accomp-error" style="display:none;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:12px;font-size:13px;color:#fca5a5;margin-bottom:14px;"></div>
          <div class="svc-field" style="margin-bottom:14px;"><label>Téléphone *</label><input id="accomp-tel" placeholder="06 12 34 56 78" value="${phone}" /></div>
          <div class="svc-field" style="margin-bottom:14px;"><label>Type de véhicule recherché *</label><input id="accomp-vehicule" placeholder="Ex: SUV familial, berline diesel..." /></div>
          <div class="svc-2col" style="margin-bottom:14px;">
            <div class="svc-field"><label>Budget max</label><input id="accomp-budget" placeholder="Ex: 15 000 €" /></div>
            <div class="svc-field"><label>Km max</label><input id="accomp-km" placeholder="Ex: 80 000 km" /></div>
          </div>
          <div class="svc-field" style="margin-bottom:20px;"><label>Critères importants (optionnel)</label><textarea id="accomp-message" placeholder="Carburant préféré, options souhaitées..." rows="3"></textarea></div>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
            <button onclick="document.getElementById('accomp-modal-overlay').remove()" class="svc-btn-cancel">Annuler</button>
            <button id="accomp-submit-btn" data-cid="${client.id}" data-cname="${prenom} ${nom}" data-cphone="${phone}" data-cemail="${email}" class="svc-btn-primary" style="background:linear-gradient(135deg,#f97316,#ea580c);box-shadow:0 4px 20px rgba(249,115,22,0.35);">✅ Envoyer</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('accomp-submit-btn').addEventListener('click', function() {
    const d = this.dataset;
    window.envoyerDemandeAccompagnement(d.cid, d.cname, d.cphone, d.cemail);
  });
};

window.envoyerDemandeAccompagnement = async function(clientId, clientName, phone, email) {
  const vehicule = (document.getElementById('accomp-vehicule')?.value||'').trim();
  const budget   = (document.getElementById('accomp-budget')?.value||'').trim();
  const km       = (document.getElementById('accomp-km')?.value||'').trim();
  const message  = (document.getElementById('accomp-message')?.value||'').trim();
  const tel      = (document.getElementById('accomp-tel')?.value||'').trim() || phone;
  const errEl    = document.getElementById('accomp-error');
  if (!vehicule) { errEl.textContent = '❌ Le type de véhicule est obligatoire.'; errEl.style.display = 'block'; return; }
  if (!tel)      { errEl.textContent = '❌ Le téléphone est obligatoire.'; errEl.style.display = 'block'; return; }
  try {
    if (!window.supabase) { errEl.textContent = '❌ Erreur connexion.'; errEl.style.display = 'block'; return; }
    const detail = '🔍 EXPERTISE ACHAT — ' + vehicule + (budget?' · Budget: '+budget:'') + (km?' · Km max: '+km:'') + (message?' · '+message:'');
    // Stocker dans reprise_estimations (table contacts supprimée)
    const { error } = await window.supabase.from('reprise_estimations').insert([{
      id: Date.now(),
      client_name: clientName,
      email: email||null,
      phone: tel||null,
      notes: detail,
      status: 'en_attente',
      created_at: new Date().toISOString()
    }]);
    if (error) throw error;
    document.getElementById('accomp-modal-overlay')?.remove();
    showZenToast('✅ Demande d\'accompagnement envoyée ! Nous vous contactons rapidement.', 'success');
  } catch(e) { errEl.textContent = '❌ ' + e.message; errEl.style.display = 'block'; }
};

// ─────────────────────────────────────────
// INIT AU CHARGEMENT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateHeader();
  window.addEventListener('clientLogin',  () => setTimeout(updateHeader, 100));
  window.addEventListener('clientLogout', () => setTimeout(updateHeader, 100));
});
