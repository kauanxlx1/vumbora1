import { createClient } from '@supabase/supabase-js';

// =========================================================================
// 🔴 SUPABASE CREDENTIALS / COLOQUE SUAS CREDENCIAIS DO SUPABASE AQUI 🔴
// Substitua as strings abaixo com a URL e a Anon Key do seu projeto Supabase.
// Você também pode deixá-las como estão e adicionar as variáveis de ambiente:
// VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env
// =========================================================================
export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
export const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

// Verifica se as credenciais ainda são os placeholders originais
const isMock = SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE';

export const supabase = createClient(
  isMock ? 'https://placeholder-project.supabase.co' : SUPABASE_URL,
  isMock ? 'placeholder-anon-key' : SUPABASE_ANON_KEY
);

/**
 * Retorna true se o Supabase estiver configurado com credenciais válidas.
 * Se falso, o sistema funcionará em modo LocalStorage offline como fallback seguro.
 */
export function isSupabaseConfigured(): boolean {
  return !isMock;
}
