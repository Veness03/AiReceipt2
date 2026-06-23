async function search() {
  const res = await fetch('https://raw.githubusercontent.com/supabase/auth/master/internal/mailer/validateclient/validateclient.go');
  console.log(res.status);
  const text = await res.text();
  console.log(text.substring(0, 500));
}
search();
