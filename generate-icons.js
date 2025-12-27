// generate-icons.js (Node.js script)
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateIcons() {
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    const sourceIcon = 'icon-source.png'; // Tu icono fuente (512x512 mínimo)
    
    try {
        // Crear directorio si no existe
        await fs.mkdir('icons', { recursive: true });
        
        // Generar cada tamaño
        for (const size of sizes) {
            await sharp(sourceIcon)
                .resize(size, size)
                .png()
                .toFile(`icons/icon-${size}x${size}.png`);
            
            console.log(`✅ Generado icono ${size}x${size}`);
        }
        
        // Generar favicon
        await sharp(sourceIcon)
            .resize(32, 32)
            .png()
            .toFile('icons/favicon-32x32.png');
        
        await sharp(sourceIcon)
            .resize(16, 16)
            .png()
            .toFile('icons/favicon-16x16.png');
            
        console.log('🎉 Todos los iconos generados exitosamente');
        
    } catch (error) {
        console.error('❌ Error generando iconos:', error);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    generateIcons();
}

module.exports = generateIcons;
