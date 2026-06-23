import dotenv from 'dotenv';
dotenv.config();

const url = 'https://iocbykgbjanzxprkaoip.supabase.co/auth/v1/signup';
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function test() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'test_signup_12345_abc@example.com',
      password: 'password123'
    })
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
