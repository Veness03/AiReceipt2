import http from 'http';

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
let body = `--${boundary}\r\nContent-Disposition: form-data; name="receipt"; filename="big.png"\r\nContent-Type: image/png\r\n\r\n`;
// Add 11 MB of data to trigger NGINX limits if there are any
body += Buffer.alloc(11 * 1024 * 1024, 'a').toString();
body += `\r\n--${boundary}--\r\n`;

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/extract',
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': Buffer.byteLength(body)
  }
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
req.write(body);
req.end();
