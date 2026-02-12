// Supabase client helper (browser module)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// For backward compatibility
let supabaseReady = Promise.resolve(supabase);

async function insertContact(contact){
  const payload = {
    id: contact.id,
    name: contact.name,
    first_name: contact.firstName || null,
    last_name: contact.lastName || null,
    email: contact.email || null,
    phone: contact.phone || null,
    address: contact.address || null,
    plates: contact.plates || [],
    created_at: contact.date || new Date().toISOString()
  };
  return await supabase.from('contacts').insert([payload]);
}

async function insertZenscan(req){
  const payload = {
    id: req.id,
    contact_id: req.contactId || null,
    services: req.services || [],
    breakdown: req.breakdown || null,
    total: req.total || null,
    dest: req.dest || null,
    created_at: req.date || new Date().toISOString()
  };
  return await supabase.from('zenscan_requests').insert([payload]);
}

async function insertVehicle(vehicle){
  const payload = {
    id: vehicle.id,
    make: vehicle.make || null,
    model: vehicle.model || null,
    year: vehicle.year || null,
    price: parseFloat(vehicle.price) || null,
    description: vehicle.description || null,
    image: vehicle.image || null,
    created_at: vehicle.date || new Date().toISOString()
  };
  return await supabase.from('vehicles').insert([payload]);
}

async function insertPiece(piece){
  const payload = {
    id: piece.id,
    name: piece.name || null,
    reference: piece.reference || null,
    price: parseFloat(piece.price) || null,
    stock: parseInt(piece.stock) || null,
    created_at: piece.date || new Date().toISOString()
  };
  return await supabase.from('pieces').insert([payload]);
}

async function insertParrainage(parrainage){
  const payload = {
    id: parrainage.id,
    parrain: parrainage.parrain || null,
    parrain_email: parrainage.parrain_email || null,
    filleul: parrainage.filleul || null,
    status: parrainage.status || null,
    commission: parseFloat(parrainage.commission) || null,
    created_at: parrainage.date || new Date().toISOString()
  };
  return await supabase.from('parrainages').insert([payload]);
}

async function insertFinance(finance){
  const payload = {
    id: finance.id,
    description: finance.description || null,
    type: finance.type || null,
    amount: parseFloat(finance.amount) || null,
    category: finance.category || null,
    created_at: finance.date || new Date().toISOString()
  };
  return await supabase.from('finances').insert([payload]);
}

async function insertEvent(event){
  const payload = {
    id: event.id,
    client: event.client || null,
    vehicle: event.vehicle || null,
    price: parseFloat(event.price) || null,
    status: event.status || null,
    created_at: event.date || new Date().toISOString()
  };
  return await supabase.from('events').insert([payload]);
}

async function insertTask(task){
  const payload = {
    id: task.id,
    title: task.title || null,
    description: task.description || null,
    priority: task.priority || null,
    status: task.status || null,
    due_date: task.dueDate || null,
    created_at: task.date || new Date().toISOString()
  };
  return await supabase.from('tasks').insert([payload]);
}

// Fetch/Read functions
async function fetchVehicles(){
  const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
  return { data: data || [], error };
}

async function fetchContacts(){
  const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
  return { data: data || [], error };
}

async function fetchTasks(){
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  return { data: data || [], error };
}

async function fetchEvents(){
  const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
  return { data: data || [], error };
}

async function fetchPieces(){
  const { data, error } = await supabase.from('pieces').select('*').order('created_at', { ascending: false });
  return { data: data || [], error };
}

async function fetchParrainages(){
  const { data, error } = await supabase.from('parrainages').select('*').order('created_at', { ascending: false });
  return { data: data || [], error };
}

async function fetchFinances(){
  const { data, error } = await supabase.from('finances').select('*').order('created_at', { ascending: false });
  return { data: data || [], error };
}

async function fetchZenscan(){
  const { data, error } = await supabase.from('zenscan_requests').select('*').order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Upload image to Supabase Storage
async function uploadVehicleImage(file, vehicleId){
  const ext = file.name.split('.').pop();
  const fileName = `${vehicleId}_${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage.from('vehicle-images').upload(fileName, file);
  if(error) return { data: null, error };
  const { data: urlData } = supabase.storage.from('vehicle-images').getPublicUrl(fileName);
  return { data: urlData?.publicUrl || null, error: null };
}

// Update vehicle with image URL
async function updateVehicleImage(vehicleId, imageUrl){
  return await supabase.from('vehicles').update({ image: imageUrl }).eq('id', vehicleId);
}

// Delete functions
async function deleteVehicle(id){
  return await supabase.from('vehicles').delete().eq('id', id);
}

async function deleteContact(id){
  return await supabase.from('contacts').delete().eq('id', id);
}

async function deleteTask(id){
  return await supabase.from('tasks').delete().eq('id', id);
}

async function deleteEvent(id){
  return await supabase.from('events').delete().eq('id', id);
}

async function deletePiece(id){
  return await supabase.from('pieces').delete().eq('id', id);
}

async function deleteParrainage(id){
  return await supabase.from('parrainages').delete().eq('id', id);
}

async function deleteFinance(id){
  return await supabase.from('finances').delete().eq('id', id);
}

async function deleteZenscan(id){
  return await supabase.from('zenscan_requests').delete().eq('id', id);
}

// Expose to window for existing non-module scripts
window.supabaseClient = {
  insertContact,
  insertZenscan,
  insertVehicle,
  insertPiece,
  insertParrainage,
  insertFinance,
  insertEvent,
  insertTask,
  fetchVehicles,
  fetchContacts,
  fetchTasks,
  fetchEvents,
  fetchPieces,
  fetchParrainages,
  fetchFinances,
  fetchZenscan,
  uploadVehicleImage,
  updateVehicleImage,
  deleteVehicle,
  deleteContact,
  deleteTask,
  deleteEvent,
  deletePiece,
  deleteParrainage,
  deleteFinance,
  deleteZenscan,
  supabase
};

export { insertContact, insertZenscan, insertVehicle, insertPiece, insertParrainage, insertFinance, insertEvent, insertTask, fetchVehicles, fetchContacts, fetchTasks, fetchEvents, fetchPieces, fetchParrainages, fetchFinances, fetchZenscan, uploadVehicleImage, updateVehicleImage, deleteVehicle, deleteContact, deleteTask, deleteEvent, deletePiece, deleteParrainage, deleteFinance, deleteZenscan };
