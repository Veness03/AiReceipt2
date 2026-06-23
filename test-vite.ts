import { createServer } from 'vite';
import http from 'http';

async function test() {
  const vite = await createServer({
    server: { port: 3001, middlewareMode: false },
    appType: "spa"
  });
  await vite.listen();

  const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/extract',
    method: 'POST',
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Body HTML?:', data.includes('<html'));
      vite.close();
    });
  });
  req.end();
}
test();
