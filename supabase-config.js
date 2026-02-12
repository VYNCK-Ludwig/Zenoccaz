// Supabase configuration
export const SUPABASE_URL = 'https://zxnnzpzujmjzhnfqndle.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4bm56cHp1am1qemhuZnFuZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNjc5NzQsImV4cCI6MjA3Nzg0Mzk3NH0.rHvMKPDV_3H_vpt-9HUORANLrqQ_Yvq_y1GD2RGD8_k';

// Export global pour les scripts non-module
if (typeof window !== 'undefined') {
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
}
