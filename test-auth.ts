import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const cleanStr = (str) => {
  if (!str) return '';
  return str.replace(/^["']|["']$/g, '').trim();
};

const supabaseUrlRaw = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKeyRaw = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

const supabaseUrl = (() => {
  const cleaned = cleanStr(supabaseUrlRaw);
  try {
    return new URL(cleaned).origin;
  } catch {
    return cleaned;
  }
})();
const supabaseAnonKey = cleanStr(supabaseAnonKeyRaw);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test_signup_12345_abc@example.com',
    password: 'password123',
  });
  console.log('Result:', { data, error });
}
test();
