import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const cleanStr = (str: string) => {
  if (!str) return '';
  return str.replace(/^["']|["']$/g, '').trim();
};

const supabaseUrlRaw = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
console.log('Using URL:', supabaseUrlRaw);

const supabaseUrl = (() => {
  const cleaned = cleanStr(supabaseUrlRaw);
  try {
    return new URL(cleaned).origin;
  } catch {
    return cleaned;
  }
})();
console.log('Cleaned URL:', supabaseUrl);
