async function search() {
  const res = await fetch('https://api.github.com/search/code?q=repo:supabase/auth+"email_address_invalid"');
  const data = await res.json();
  for (const item of data.items || []) {
    console.log(item.path);
  }
}
search();
