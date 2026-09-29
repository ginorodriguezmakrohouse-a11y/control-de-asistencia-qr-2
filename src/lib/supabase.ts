import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Solo considerar configuradas credenciales reales (no placeholders ni valores de ejemplo).
const looksLikePlaceholder =
  !supabaseUrl ||
  supabaseUrl.includes('placeholder') ||
  supabaseUrl.includes('YOUR_PROJECT') ||
  !/^https?:\/\//.test(supabaseUrl) ||
  !supabaseAnonKey ||
  supabaseAnonKey.includes('placeholder') ||
  supabaseAnonKey === 'your-anon-key';

export const isSupabaseConfigured = !looksLikePlaceholder;

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Faltan (o son de ejemplo) VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'La app funcionará en modo local (localStorage).'
  );
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
);
