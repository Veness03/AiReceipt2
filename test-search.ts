async function search() {
  const res = await fetch('https://api.github.com/search/issues?q=repo:supabase/auth+"Email+address"+invalid');
  const data = await res.json();
  console.log('Total:', data.total_count);
  for (const item of data.items || []) {
    console.log(item.title, item.html_url);
  }
}
search();
