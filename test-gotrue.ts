async function search() {
  const res = await fetch('https://api.github.com/repos/supabase/auth/contents/internal/api/signup.go');
  const data = await res.json();
  const buff = Buffer.from(data.content, 'base64');
  const text = buff.toString('utf-8');
  console.log(text.substring(0, 1000));
}
search();
