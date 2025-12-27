// pwa-manager.js
class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isStandalone = false;
        this.isOnline = navigator.onLine;
        this.serviceWorker = null;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Inicializando PWA Manager...');
        
        // Verificar modo de visualización
        this.checkDisplayMode();
        
        // Registrar Service Worker
        await this.registerServiceWorker();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Configurar instalación
        this.setupInstallation();
        
        // Actualizar estado
        this.updateStatus();
        
        // Verificar actualizaciones
        this.checkForUpdates();
    }
    
    checkDisplayMode() {
        // Verificar si la app está en modo standalone (instalada)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isStandalone = true;
            console.log('📱 Aplicación en modo standalone (instalada)');
            document.getElementById('pwa-badge').style.display = 'block';
        } else if (window.navigator.standalone) {
            this.isStandalone = true;
            console.log('📱 Aplicación en modo standalone (iOS)');
            document.getElementById('pwa-badge').style.display = 'block';
        }
        
        // Ocultar prompt si ya está instalada
        if (this.isStandalone) {
            document.getElementById('pwa-install-prompt').style.display = 'none';
        }
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                this.serviceWorker = await navigator.serviceWorker.register('/service-worker.js', {
                    scope: '/',
                    updateViaCache: 'none'
                });
                
                console.log('✅ Service Worker registrado:', this.serviceWorker);
                
                // Escuchar actualizaciones del Service Worker
                this.serviceWorker.addEventListener('updatefound', () => {
                    const newWorker = this.serviceWorker.installing;
                    console.log('🔄 Nueva versión del Service Worker encontrada');
                    
                    newWorker.addEventListener('statechange', () => {
                        console.log('Estado del nuevo Service Worker:', newWorker.state);
                        
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
                
                // Comprobar estado del Service Worker periódicamente
                setInterval(() => {
                    this.serviceWorker.update();
                }, 60 * 60 * 1000); // Cada hora
                
            } catch (error) {
                console.error('❌ Error registrando Service Worker:', error);
            }
        } else {
            console.log('⚠️ Service Worker no soportado en este navegador');
        }
    }
    
    setupEventListeners() {
        // Estado de conexión
        window.addEventListener('online', () => {
            this.isOnline = true;
            document.getElementById('offline-indicator').style.display = 'none';
            console.log('✅ Conectado a internet');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            document.getElementById('offline-indicator').style.display = 'block';
            console.log('⚠️ Sin conexión a internet');
        });
        
        // Actualizar estado inicial
        if (!this.isOnline) {
            document.getElementById('offline-indicator').style.display = 'block';
        }
        
        // Botón de prueba de notificación
        document.getElementById('test-notification')?.addEventListener('click', () => {
            this.testNotification();
        });
    }
    
    setupInstallation() {
        // Evento antes de la instalación
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('🎯 Evento beforeinstallprompt disparado');
            
            // Prevenir que el navegador muestre su propio prompt
            e.preventDefault();
            
            // Guardar el evento para usarlo después
            this.deferredPrompt = e;
            
            // Mostrar nuestro prompt personalizado
            this.showInstallPrompt();
            
            // Mostrar badge
            document.getElementById('pwa-badge').style.display = 'block';
        });
        
        // App instalada exitosamente
        window.addEventListener('appinstalled', () => {
            console.log('🎉 Aplicación instalada exitosamente');
            this.deferredPrompt = null;
            
            // Ocultar prompts
            document.getElementById('pwa-install-prompt').style.display = 'none';
            document.getElementById('pwa-badge').style.display = 'none';
            
            // Mostrar mensaje de éxito
            this.showToast('✅ Aplicación instalada correctamente');
            
            // Recargar en modo standalone
            setTimeout(() => {
                location.reload();
            }, 1000);
        });
        
        // Configurar botones del prompt
        document.getElementById('pwa-install-btn')?.addEventListener('click', () => {
            this.installApp();
        });
        
        document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
            this.hideInstallPrompt();
            // Recordar después de 7 días
            localStorage.setItem('pwa_dismissed', Date.now().toString());
        });
    }
    
    showInstallPrompt() {
        // Verificar si el usuario ya descartó el prompt recientemente
        const lastDismiss = localStorage.getItem('pwa_dismissed');
        if (lastDismiss) {
            const daysSinceDismiss = (Date.now() - parseInt(lastDismiss)) / (1000 * 60 * 60 * 24);
            if (daysSinceDismiss < 7) {
                console.log('Prompt descartado recientemente, no mostrar');
                return;
            }
        }
        
        // No mostrar si ya está instalado
        if (this.isStandalone) return;
        
        // Mostrar prompt
        const prompt = document.getElementById('pwa-install-prompt');
        prompt.style.display = 'block';
        
        // Auto-ocultar después de 30 segundos
        setTimeout(() => {
            if (prompt.style.display === 'block') {
                this.hideInstallPrompt();
            }
        }, 30000);
    }
    
    hideInstallPrompt() {
        document.getElementById('pwa-install-prompt').style.display = 'none';
    }
    
    async installApp() {
        if (!this.deferredPrompt) {
            console.log('No hay prompt de instalación disponible');
            return;
        }
        
        try {
            // Mostrar el prompt nativo del navegador
            this.deferredPrompt.prompt();
            
            // Esperar la elección del usuario
            const choiceResult = await this.deferredPrompt.userChoice;
            
            console.log('Usuario eligió:', choiceResult.outcome);
            
            if (choiceResult.outcome === 'accepted') {
                console.log('Usuario aceptó la instalación');
            } else {
                console.log('Usuario rechazó la instalación');
                // Ocultar por 30 días si rechazó
                localStorage.setItem('pwa_dismissed', Date.now().toString());
            }
            
            // Limpiar la referencia
            this.deferredPrompt = null;
            
            // Ocultar nuestro prompt
            this.hideInstallPrompt();
            
        } catch (error) {
            console.error('Error durante la instalación:', error);
        }
    }
    
    async testNotification() {
        // Solicitar permiso para notificaciones
        if (!('Notification' in window)) {
            alert('Este navegador no soporta notificaciones');
            return;
        }
        
        if (Notification.permission === 'granted') {
            this.sendNotification();
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.sendNotification();
            }
        }
    }
    
    sendNotification(title = '¡Hola!', body = 'Esta es una notificación de prueba') {
        if ('serviceWorker' in navigator && this.serviceWorker) {
            // Enviar mensaje al Service Worker
            this.serviceWorker.active?.postMessage({
                type: 'SHOW_NOTIFICATION',
                title,
                body,
                icon: '/icons/icon-192x192.png'
            });
        } else {
            // Fallback a Notification API
            new Notification(title, {
                body,
                icon: '/icons/icon-192x192.png'
            });
        }
    }
    
    showUpdateNotification() {
        if (confirm('¡Hay una nueva versión disponible! ¿Quieres actualizar ahora?')) {
            // Enviar mensaje al Service Worker para que se active
            if (this.serviceWorker.waiting) {
                this.serviceWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
                
                // Recargar cuando el nuevo Service Worker esté activo
                this.serviceWorker.addEventListener('controllerchange', () => {
                    window.location.reload();
                });
            }
        }
    }
    
    updateStatus() {
        const statusContent = document.getElementById('status-content');
        if (!statusContent) return;
        
        const status = {
            'Modo': this.isStandalone ? '📱 Aplicación instalada' : '🌐 Navegador web',
            'Service Worker': this.serviceWorker ? '✅ Registrado' : '❌ No disponible',
            'Notificaciones': Notification.permission === 'granted' ? '✅ Permisos otorgados' : '⚠️ Sin permisos',
            'Conexión': this.isOnline ? '✅ En línea' : '⚠️ Offline',
            'Storage': 'localStorage' in window ? '✅ Disponible' : '❌ No disponible',
            'IndexedDB': 'indexedDB' in window ? '✅ Disponible' : '❌ No disponible'
        };
        
        let html = '<ul style="list-style: none; padding: 0;">';
        for (const [key, value] of Object.entries(status)) {
            html += `<li><strong>${key}:</strong> ${value}</li>`;
        }
        html += '</ul>';
        
        statusContent.innerHTML = html;
    }
    
    async checkForUpdates() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.update();
                    console.log('✅ Buscando actualizaciones...');
                }
            } catch (error) {
                console.error('Error buscando actualizaciones:', error);
            }
        }
    }
    
    showToast(message, duration = 3000) {
        // Crear toast
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            animation: fadeInUp 0.3s ease-out;
        `;
        
        // Agregar animación
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInUp {
                from { opacity: 0; transform: translate(-50%, 20px); }
                to { opacity: 1; transform: translate(-50%, 0); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(toast);
        
        // Auto-remover
        setTimeout(() => {
            toast.style.animation = 'fadeInUp 0.3s ease-out reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }
    
    // Métodos públicos
    getInstallStatus() {
        return {
            canInstall: !!this.deferredPrompt,
            isInstalled: this.isStandalone,
            serviceWorker: !!this.serviceWorker
        };
    }
    
    forceUpdate() {
        if (confirm('¿Forzar actualización de la aplicación?')) {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    registrations.forEach((registration) => {
                        registration.unregister();
                    });
                    localStorage.clear();
                    sessionStorage.clear();
                    location.reload();
                });
            }
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.pwaManager = new PWAManager();
    
    // También inicializar cuando la página se hace visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            window.pwaManager?.checkForUpdates();
        }
    });
});

// Para uso global
window.installPWA = function() {
    if (window.pwaManager) {
        window.pwaManager.installApp();
    }
};

window.checkPWAStatus = function() {
    if (window.pwaManager) {
        return window.pwaManager.getInstallStatus();
    }
    return null;
};
