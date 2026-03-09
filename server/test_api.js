const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({ id: 'dummy_id', role: 'user' }, 'ev_app_super_secret_jwt_key_change_in_production', { expiresIn: '1d' });

http.get({
    hostname: 'localhost',
    port: 5000,
    path: '/api/stations',
    headers: { 'Authorization': 'Bearer ' + token }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
}).on('error', (e) => console.log('Error:', e.message));
