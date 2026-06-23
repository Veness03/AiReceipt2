import http from 'http';
import FormData from 'form-data';
import fs from 'fs';

const form = new FormData();
form.append('receipt', Buffer.from('dummy data'), { filename: 'test.png', contentType: 'image/png' });

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/extract',
  method: 'POST',
  headers: form.getHeaders()
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
form.pipe(req);
