import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = 'https://iocbykgbjanzxprkaoip.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.auth.signUp({
    email: 'chong@gmail.com',
    password: 'password123',
    options: {
      emailRedirectTo: 'http://localhost:3000'
    }
  });
  console.dir(error, { depth: null });
}
test();
