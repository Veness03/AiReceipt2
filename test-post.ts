import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/extract',
  method: 'POST',
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Body:', data.substring(0, 500));
  });
});
req.on('error', console.error);
req.end();
