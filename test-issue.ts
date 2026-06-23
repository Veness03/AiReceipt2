async function search() {
  const res = await fetch('https://api.github.com/repos/supabase/auth/issues/2252');
  const data = await res.json();
  console.log('Body:', data.body);
  
  const res2 = await fetch('https://api.github.com/repos/supabase/auth/pulls/2273');
  const data2 = await res2.json();
  console.log('Pull Body:', data2.body);
}
search();
