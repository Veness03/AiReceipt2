import fs from 'fs';
async function search() {
  const res = await fetch('https://raw.githubusercontent.com/supabase/auth/master/internal/mailer/validateclient/validateclient.go');
  const text = await res.text();
  fs.writeFileSync('validateclient.go', text);
}
search();
