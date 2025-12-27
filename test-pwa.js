// test-pwa.js - Script para verificar la PWA
function testPWAFunctionality() {
    const tests = {
        'Service Worker': 'serviceWorker' in navigator,
        'Web App Manifest': 'HTMLLinkElement' in window && 
                           document.querySelector('link[rel="manifest"]') !== null,
        'Cache API': 'caches' in window,
        'IndexedDB': 'indexedDB' in window,
        'Fetch API': 'fetch' in window,
        'HTTPS': window.location.protocol === 'https:',
        'Install Prompt': 'onbeforeinstallprompt' in window,
        'Display Mode': window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true
    };
    
    console.log('🧪 Test de PWA:');
    let passed = 0;
    let total = Object.keys(tests).length;
    
    for (const [test, result] of Object.entries(tests)) {
        const status = result ? '✅' : '❌';
        console.log(`${status} ${test}`);
        if (result) passed++;
    }
    
    console.log(`\n📊 Resultado: ${passed}/${total} tests pasados`);
    console.log(`🏆 PWA Score: ${Math.round((passed / total) * 100)}%`);
    
    if (passed === total) {
        console.log('🎉 ¡Tu PWA está lista!');
    } else {
        console.log('⚠️ Algunas funcionalidades PWA no están disponibles');
    }
    
    return tests;
}

// Ejecutar tests cuando la página cargue
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testPWAFunctionality);
} else {
    testPWAFunctionality();
}
