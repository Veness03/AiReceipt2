import { createClient } from '@supabase/supabase-js';

const cleanStr = (str: string) => {
  if (!str) return '';
  return str.replace(/^["']|["']$/g, '').trim();
};

const supabaseUrlRaw = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKeyRaw = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabaseUrl = (() => {
  const cleaned = cleanStr(supabaseUrlRaw);
  try {
    return new URL(cleaned).origin;
  } catch {
    return cleaned;
  }
})();
export const supabaseAnonKey = cleanStr(supabaseAnonKeyRaw);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

