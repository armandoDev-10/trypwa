// server.js (Ejemplo con Express)
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware para headers PWA
app.use((req, res, next) => {
    // Headers para PWA
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Cache control para Service Worker
    if (req.url === '/service-worker.js') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    
    next();
});

// Servir archivos estáticos
app.use(express.static('public'));

// Ruta para manifest.json con headers correctos
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(path.join(__dirname, 'public/manifest.json'));
});

// Ruta para service-worker.js
app.get('/service-worker.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'public/service-worker.js'));
});

// Fallback para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// HTTPS es OBLIGATORIO para PWA
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

const PORT = 443;

https.createServer(options, app).listen(PORT, () => {
    console.log(`🚀 Servidor PWA ejecutándose en https://localhost:${PORT}`);
    
    // Mensaje de configuración
    console.log('\n📋 Configuración necesaria:');
    console.log('1. Asegúrate de tener HTTPS (obligatorio para PWA)');
    console.log('2. Los iconos deben estar en /icons/');
    console.log('3. El manifest.json debe estar en la raíz');
    console.log('4. Service Worker debe estar en la raíz del scope');
});
