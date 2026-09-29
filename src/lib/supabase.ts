import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('=== 🔍 DEBUG SUPABASE 🔍 ===');
console.log('URL:', supabaseUrl);
console.log('LONGITUD DE LA CLAVE:', supabaseAnonKey ? supabaseAnonKey.length : 'NO SE ENCONTRÓ');
console.log('============================');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);