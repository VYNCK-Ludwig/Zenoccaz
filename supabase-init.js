// ── SUPABASE INIT — partagé par toutes les pages ──
// Chargé via <script type="module" src="supabase-init.js">

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const { createClient } = window.supabase || supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.supabase = supabaseClient;
window.supabaseClient = {
  supabase: supabaseClient,
  async fetchVehicles() {
    const { data, error } = await supabaseClient.from('vehicles').select('*').order('created_at', { ascending: false });
    return { data: data || [], error };
  },
  async insertContact(contact) {
    return await supabaseClient.from('clients') /* contacts supprimé */.insert([contact]);
  },
  async insertZenscan(zenscan) {
    return await supabaseClient.from('zenscan_requests').insert([zenscan]);
  },
  async uploadVehicleImage(file, vehicleId) {
    const ext      = file.name.split('.').pop();
    const fileName = `${vehicleId}_${Date.now()}.${ext}`;
    const { data, error } = await supabaseClient.storage.from('vehicle-images').upload(fileName, file);
    if (error) return { data: null, error };
    const { data: urlData } = supabaseClient.storage.from('vehicle-images').getPublicUrl(fileName);
    return { data: urlData?.publicUrl || null, error: null };
  },
  async deleteVehicle(id) {
    return await supabaseClient.from('vehicles').delete().eq('id', id);
  }
};

window._supabaseReady = true;
window.dispatchEvent(new Event('supabaseReady'));
console.log('✅ Supabase initialisé');
