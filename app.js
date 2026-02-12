const VEHICLES_JSON = 'vehicles.json'
const STORAGE_KEY = 'zenoccaz_vehicles'
const ADMIN_KEY = 'zenoccaz_admin'

let vehicles = []
let adminMode = false

/* --- Carousel state --- */
let carouselIndex = 0
let carouselTimer = null
const CAROUSEL_INTERVAL = 5000

function startCarousel(){
  stopCarousel()
  carouselTimer = window.setInterval(()=> nextCarouselSlide(), CAROUSEL_INTERVAL)
}
function stopCarousel(){ if(carouselTimer){ window.clearInterval(carouselTimer); carouselTimer = null } }
function nextCarouselSlide(){ const slides = document.querySelectorAll('#hero-carousel .carousel-slide'); if(!slides || slides.length<=1) return; goToCarousel((carouselIndex+1) % slides.length) }
function goToCarousel(n){
  const slides = document.querySelectorAll('#hero-carousel .carousel-slide')
  const dots = document.querySelectorAll('#hero-carousel .carousel-dot')
  if(!slides || slides.length===0) return
  slides.forEach((s,i)=> s.classList.toggle('active', i===n))
  dots.forEach((d,i)=> d.classList.toggle('active', i===n))
  carouselIndex = n
}
function buildCarousel(){
  const carousel = document.getElementById('hero-carousel')
  if(!carousel) return
  const slidesWrap = carousel.querySelector('.carousel-slides')
  const dotsWrap = carousel.querySelector('.carousel-indicators')
  slidesWrap.innerHTML = ''
  dotsWrap.innerHTML = ''
  // collect images from vehicles (use images provided by user)
  const imgs = vehicles.map(v=> v.image).filter(Boolean)
  if(imgs.length === 0){ carousel.classList.add('hidden'); return }
  imgs.forEach((src,i)=>{
    const s = document.createElement('div')
    s.className = 'carousel-slide' + (i===0 ? ' active' : '')
    const img = document.createElement('img')
    img.src = src
    img.alt = `Véhicule ${i+1}`
    s.appendChild(img)
    slidesWrap.appendChild(s)

    const dot = document.createElement('button')
    dot.className = 'carousel-dot' + (i===0 ? ' active' : '')
    dot.setAttribute('aria-label', `Aller à la diapositive ${i+1}`)
    dot.addEventListener('click', ()=> { goToCarousel(i); startCarousel() })
    dotsWrap.appendChild(dot)
  })
  carousel.classList.remove('hidden')
  carousel.addEventListener('mouseenter', stopCarousel)
  carousel.addEventListener('mouseleave', startCarousel)
  carouselIndex = 0
  startCarousel()
}

const vehiclesEl = document.getElementById('vehicles')
const adminBar = document.getElementById('admin-bar')
const addBtn = document.getElementById('add-vehicle')
const toggleAdminBtn = document.getElementById('toggle-admin')

// éléments de la modale de login admin
const loginModal = document.getElementById('admin-login-modal')
const loginUsername = document.getElementById('login-username')
const loginPassword = document.getElementById('login-password')
const loginSubmit = document.getElementById('login-submit')
const loginCancel = document.getElementById('login-cancel')
const loginError = document.getElementById('login-error')

// identifiants demandés par l'utilisateur
const DEMO_ADMIN_USER = 'Ludwig'
const DEMO_ADMIN_PASS = 'Kooligan011.' // attention au point final

async function loadVehicles(){
  try{
    console.log('🔄 Chargement des véhicules...');
    
    // Attendre que Supabase soit prêt si nécessaire
    if(!window.supabaseClient){
      console.log('⏳ Attente de Supabase...');
      await new Promise(resolve => {
        if(window.supabaseClient) resolve();
        else window.addEventListener('supabaseReady', resolve, { once: true });
      });
    }
    
    if(window.supabaseClient && window.supabaseClient.fetchVehicles){
      const { data, error } = await window.supabaseClient.fetchVehicles();
      if(error){
        console.error('❌ Erreur chargement véhicules:', error);
        vehicles = [];
      } else {
        vehicles = data || [];
        console.log('✅ Véhicules chargés:', vehicles.length);
      }
    } else {
      console.warn('⚠️ supabaseClient.fetchVehicles non disponible');
      vehicles = [];
    }
  }catch(e){
    console.error('❌ Exception loadVehicles:', e);
    vehicles = [];
  }
  render();
}

function render(){
  if(!vehiclesEl) return
  vehiclesEl.innerHTML = ''
  // Filtrer les véhicules : afficher seulement ceux qui sont "Disponible" (ou sans status)
  const availableVehicles = vehicles.filter(v => !v.status || v.status === 'Disponible')
  availableVehicles.forEach(v=> vehiclesEl.appendChild(vehicleCard(v)))
  // rebuild carousel to reflect current vehicles images
  try{ buildCarousel() }catch(e){/* ignore */}
}

function vehicleCard(v){
  const card = document.createElement('article')
  card.className = 'vehicle-card'

  const img = document.createElement('img')
  img.src = v.image || 'https://via.placeholder.com/600x400?text=Voiture'
  img.alt = `${v.make} ${v.model}`

  const title = document.createElement('div')
  title.className = 'vehicle-meta'
  const t = document.createElement('div')
  t.innerHTML = `<div class="vehicle-title">${v.make} ${v.model} <span class="muted">(${v.year})</span></div>`
  const price = document.createElement('div')
  price.className = 'vehicle-price'
  price.textContent = `${v.price} €`

  title.appendChild(t)
  title.appendChild(price)

  const desc = document.createElement('div')
  desc.className = 'vehicle-desc'
  desc.textContent = v.description || ''

  const actions = document.createElement('div')
  actions.className = 'vehicle-actions'

  const viewBtn = document.createElement('button')
  viewBtn.className = 'btn primary'
  viewBtn.textContent = 'Voir détails'
  viewBtn.onclick = ()=> window.location.href = `vehicle-detail.html?id=${v.id}`
  actions.appendChild(viewBtn)

  if(adminMode){
    const editBtn = document.createElement('button')
    editBtn.className = 'btn'
    editBtn.textContent = 'Modifier'
    editBtn.onclick = ()=> editVehicle(v.id)
    const delBtn = document.createElement('button')
    delBtn.className = 'btn danger'
    delBtn.textContent = 'Supprimer'
    delBtn.onclick = ()=> deleteVehicle(v.id)
    actions.appendChild(editBtn)
    actions.appendChild(delBtn)
  }

  card.appendChild(img)
  card.appendChild(title)
  card.appendChild(desc)
  card.appendChild(actions)
  return card
}

function save(){
  // Deprecated: now using Supabase directly
  render()
}

function editVehicle(id){
  const v = vehicles.find(x=>x.id===id)
  if(!v) return
  const make = prompt('Marque', v.make) || v.make
  const model = prompt('Modèle', v.model) || v.model
  const year = prompt('Année', v.year) || v.year
  const price = prompt('Prix (€)', v.price) || v.price
  v.make = make; v.model = model; v.year = year; v.price = price
  save()
}

function deleteVehicle(id){
  if(!confirm('Supprimer ce véhicule ?')) return
  vehicles = vehicles.filter(v=>v.id!==id)
  save()
}

function addVehicle(){
  const make = prompt('Marque')
  if(!make) return
  const model = prompt('Modèle')||''
  const year = prompt('Année')||''
  const price = prompt('Prix (€)')||'0'
  const id = Date.now()
  const newV = {id, make, model, year, price, description:'Ajouté via interface admin'}
  vehicles.unshift(newV)
  save()
}

function setAdmin(on){
  adminMode = !!on
  localStorage.setItem(ADMIN_KEY, adminMode ? '1' : '0')
  if(adminBar){
    if(adminMode){
      adminBar.classList.remove('hidden')
      adminBar.setAttribute('aria-hidden','false')
    } else {
      adminBar.classList.add('hidden')
      adminBar.setAttribute('aria-hidden','true')
    }
  }
  render()
}

/* --- Modale de login --- */
function showLoginModal(){
  if(!loginModal) return
  loginError.classList.add('hidden')
  loginError.textContent = ''
  loginUsername.value = ''
  loginPassword.value = ''
  loginModal.classList.remove('hidden')
  loginModal.setAttribute('aria-hidden','false')
  setTimeout(()=> loginUsername.focus(), 50)
}

function hideLoginModal(){
  if(!loginModal) return
  loginModal.classList.add('hidden')
  loginModal.setAttribute('aria-hidden','true')
}

function handleLoginAttempt(){
  const user = (loginUsername.value || '').trim()
  const pass = (loginPassword.value || '')
  if(user === DEMO_ADMIN_USER && pass === DEMO_ADMIN_PASS){
    hideLoginModal()
    setAdmin(true)
    // redirige vers le panneau d'administration dédié
    try{ window.location.href = 'admin.html' }catch(e){ /* noop */ }
    return
  }
  loginError.textContent = 'Identifiant ou mot de passe incorrect.'
  loginError.classList.remove('hidden')
  loginPassword.value = ''
  loginPassword.focus()
}

/* listeners modale */
if(loginSubmit) loginSubmit.addEventListener('click', handleLoginAttempt)
if(loginCancel) loginCancel.addEventListener('click', ()=> hideLoginModal())
if(loginPassword) loginPassword.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') handleLoginAttempt()
})
if(loginUsername) loginUsername.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') loginPassword.focus()
})

/* keyboard listener: ouvre la modale avec Ctrl+M */
document.addEventListener('keydown', (e)=>{
  if(e.ctrlKey && (e.key === 'm' || e.key === 'M')){
    e.preventDefault()
    showLoginModal()
  }
})

addBtn && addBtn.addEventListener('click', addVehicle)
toggleAdminBtn && toggleAdminBtn.addEventListener('click', ()=> setAdmin(false))

// recharge périodiquement depuis Supabase (pour les changements dans n'importe quelle fenêtre)
window.setInterval(async ()=>{
  try{
    if(window.supabaseClient && window.supabaseClient.fetchVehicles){
      const { data } = await window.supabaseClient.fetchVehicles()
      const newVehicles = data || []
      // compare pour éviter des rendus inutiles
      if(JSON.stringify(newVehicles) !== JSON.stringify(vehicles)){
        vehicles = newVehicles
        render()
      }
    }
  }catch(e){
    // ignore errors
  }
}, 2000)

// init
(() => {
  const storedAdmin = localStorage.getItem(ADMIN_KEY)
  setAdmin(storedAdmin === '1')
  loadVehicles()
})()
