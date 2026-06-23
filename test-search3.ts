async function search() {
  const res = await fetch('https://api.github.com/search/code?q=repo:supabase/auth+"Email+address"');
  const data = await res.json();
  console.log('Status', res.status);
  console.log('Message', data.message);
}
search();
