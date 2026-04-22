// ── VEHICLE DETAIL PAGE JS ──

// Lightbox state
let currentLightboxIndex = 0;
let lightboxImages = [];

function openLightbox(index, images) {
  currentLightboxIndex = index;
  lightboxImages = images;
  updateLightboxImage();
  document.getElementById('image-lightbox').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('image-lightbox').classList.remove('active');
  document.body.style.overflow = '';
}

function updateLightboxImage() {
  document.getElementById('lightbox-image').src = lightboxImages[currentLightboxIndex];
  document.getElementById('lightbox-counter').textContent =
    `${currentLightboxIndex + 1} / ${lightboxImages.length}`;
  document.getElementById('lightbox-prev').style.display = lightboxImages.length > 1 ? 'block' : 'none';
  document.getElementById('lightbox-next').style.display = lightboxImages.length > 1 ? 'block' : 'none';
}

function prevImage() {
  currentLightboxIndex = (currentLightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  updateLightboxImage();
}

function nextImage() {
  currentLightboxIndex = (currentLightboxIndex + 1) % lightboxImages.length;
  updateLightboxImage();
}

function renderVehicleDetail(vehicle) {
  // Titre
  document.getElementById('vehicle-title').textContent =
    `${vehicle.make} ${vehicle.model} (${vehicle.year})`;

  // Prix + badge vendu
  const priceEl = document.getElementById('vehicle-price');
  if (vehicle.status === 'Vendu') {
    priceEl.innerHTML = `
      <span style="text-decoration:line-through;color:var(--muted);font-size:20px;">${vehicle.price} €</span>
      <span style="margin-left:12px;background:linear-gradient(135deg,#cc2200,#ff3311);color:#f0c040;font-family:'Courier New',monospace;font-weight:900;letter-spacing:0.15em;font-size:14px;padding:6px 16px;border-radius:4px;border:1px solid rgba(240,192,64,0.4);">VENDU</span>
    `;
    const contactBtn = document.querySelector('.contact-btn');
    if (contactBtn) {
      contactBtn.disabled = true;
      contactBtn.style.opacity = '0.4';
      contactBtn.style.cursor = 'not-allowed';
      contactBtn.textContent = '⛔ Ce véhicule est vendu';
    }
    const gallery = document.querySelector('.gallery');
    if (gallery) {
      gallery.style.position = 'relative';
      const ribbon = document.createElement('div');
      ribbon.style.cssText = 'position:absolute;top:32px;right:-32px;width:160px;background:linear-gradient(135deg,#cc2200,#ff3311);color:#f0c040;text-align:center;font-family:Courier New,monospace;font-size:14px;font-weight:900;letter-spacing:0.2em;padding:8px 0;transform:rotate(35deg);box-shadow:0 2px 12px rgba(204,34,0,0.6);border-top:1px solid rgba(240,192,64,0.5);border-bottom:1px solid rgba(240,192,64,0.5);z-index:10;pointer-events:none;';
      ribbon.textContent = 'VENDU';
      gallery.appendChild(ribbon);
    }
  } else {
    priceEl.textContent = `${vehicle.price} €`;
  }

  // Images
  const images = vehicle.images || (vehicle.image ? [vehicle.image] : ['https://via.placeholder.com/800x600?text=Pas+d%27image']);
  const mainImage = document.getElementById('main-image');
  if (vehicle.status === 'Vendu') mainImage.style.filter = 'grayscale(40%) brightness(0.7)';

  let currentImageIndex = 0;
  mainImage.src = images[0];
  mainImage.style.cursor = 'zoom-in';
  mainImage.onclick = () => openLightbox(currentImageIndex, images);

  const thumbnailsContainer = document.getElementById('thumbnails');
  thumbnailsContainer.innerHTML = '';
  images.forEach((img, index) => {
    const thumb = document.createElement('img');
    thumb.src = img;
    thumb.className = 'thumbnail' + (index === 0 ? ' active' : '');
    thumb.onclick = () => {
      currentImageIndex = index;
      mainImage.src = img;
      document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      openLightbox(index, images);
    };
    thumbnailsContainer.appendChild(thumb);
  });

  // Specs
  const specsGrid = document.getElementById('specs-grid');
  const specs = [
    { label: 'Année',        value: vehicle.year },
    { label: 'Kilométrage',  value: vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : 'N/A' },
    { label: 'Carburant',    value: vehicle.fuel_type || 'N/A' },
    { label: 'Transmission', value: vehicle.transmission || 'N/A' },
    { label: 'Couleur',      value: vehicle.color || 'N/A' },
    { label: 'Portes',       value: vehicle.doors || 'N/A' },
    { label: 'Places',       value: vehicle.seats || 'N/A' },
    { label: 'Puissance',    value: vehicle.horsepower ? `${vehicle.horsepower} ch` : 'N/A' },
    { label: 'État',         value: vehicle.condition || 'N/A' },
    { label: 'Garantie',     value: vehicle.warranty_months ? `${vehicle.warranty_months} mois` : 'N/A' }
  ];
  specsGrid.innerHTML = specs.map(s => `
    <div class="spec-item">
      <span class="spec-label">${s.label}</span>
      <span class="spec-value">${s.value}</span>
    </div>
  `).join('');

  // Équipements
  if (vehicle.features && vehicle.features.length > 0) {
    document.getElementById('features-container').innerHTML = `
      <h3 style="margin:24px 0 12px;color:var(--text);">Équipements</h3>
      <div class="features-list">
        ${vehicle.features.map(f => `<span class="feature-badge">✓ ${f}</span>`).join('')}
      </div>
    `;
  }

  // Description
  document.getElementById('vehicle-description').textContent =
    vehicle.description || 'Aucune description disponible.';
}

// Initialisation après chargement Supabase
async function initVehicleDetail() {
  // Supabase est chargé via CDN + module, disponible sur window.supabase
  await new Promise(resolve => {
    if (window._supabaseReady) return resolve();
    window.addEventListener('supabaseReady', resolve, { once: true });
    setTimeout(resolve, 3000); // fallback
  });

  const urlParams = new URLSearchParams(window.location.search);
  const vehicleId = urlParams.get('id');

  if (!vehicleId) {
    alert('❌ Aucun véhicule spécifié');
    window.location.href = 'index.html';
    return;
  }

  try {
    const { data, error } = await window.supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();

    if (error || !data) {
      alert('Véhicule non trouvé');
      window.location.href = 'index.html';
      return;
    }
    renderVehicleDetail(data);
  } catch (err) {
    console.error('❌', err);
    alert('Erreur de chargement');
    window.location.href = 'index.html';
  }
}

// Event listeners lightbox
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('lightbox-close').onclick = closeLightbox;
  document.getElementById('image-lightbox').onclick = e => {
    if (e.target.id === 'image-lightbox') closeLightbox();
  };
  document.getElementById('lightbox-prev').onclick = e => { e.stopPropagation(); prevImage(); };
  document.getElementById('lightbox-next').onclick = e => { e.stopPropagation(); nextImage(); };

  document.addEventListener('keydown', e => {
    const lb = document.getElementById('image-lightbox');
    if (!lb.classList.contains('active')) return;
    if (e.key === 'Escape')      closeLightbox();
    else if (e.key === 'ArrowLeft')  prevImage();
    else if (e.key === 'ArrowRight') nextImage();
  });

  initVehicleDetail();
});
