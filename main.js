// main.js - VERSIÓN MEJORADA QUE SÍ FUNCIONA

// ============================================
// SISTEMA DE BLOQUEO DE PESTAÑAS
// ============================================
import electron from 'electron';

(function() {
    'use strict';
    
    // Configuración
    const CONFIG = {
        CLAVE_BLOQUEO: 'app_bloqueo_pestana',
        CLAVE_ESTADO: 'app_estado_pestana',
        INTERVALO_VERIFICACION: 1000, // 1 segundo
        TIEMPO_BLOQUEO: 15000, // 15 segundos de tiempo muerto para recuperación
        VERSION: '2.0'
    };
    
    // ID único de esta pestaña
    const ID_PESTANA = `pestana_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let soyPrincipal = false;
    let intervalo = null;
    let ultimoLatido = Date.now();
    
    // ================= FUNCIONES PRINCIPALES =================
    
    /**
     * Inicializa el sistema de control
     */
    function inicializarSistema() {
        console.log(`🚀 Iniciando control de pestañas (ID: ${ID_PESTANA})`);
        
        // Verificar estado actual
        const estado = verificarEstadoSistema();
        
        if (estado === 'BLOQUEADO') {
            // El sistema está bloqueado por otra pestaña
            manejarPestanaDuplicada();
            return false;
        } else if (estado === 'LIBRE') {
            // Tomar control como pestaña principal
            tomarControl();
            return true;
        } else {
            // Estado ambiguo - hay conflicto
            resolverConflicto();
            return false;
        }
    }
    
    /**
     * Verifica el estado actual del sistema
     */
    function verificarEstadoSistema() {
        try {
            const bloqueo = localStorage.getItem(CONFIG.CLAVE_BLOQUEO);
            const estado = localStorage.getItem(CONFIG.CLAVE_ESTADO);
            
            if (!bloqueo && !estado) {
                return 'LIBRE'; // No hay pestañas activas
            }
            
            if (bloqueo) {
                const datosBloqueo = JSON.parse(bloqueo);
                const tiempoTranscurrido = Date.now() - datosBloqueo.timestamp;
                
                if (tiempoTranscurrido < CONFIG.TIEMPO_BLOQUEO) {
                    // El bloqueo es reciente
                    if (datosBloqueo.id === ID_PESTANA) {
                        return 'YO_SOY_PRINCIPAL'; // Esta pestaña ya es principal
                    } else {
                        return 'BLOQUEADO'; // Otra pestaña tiene el control
                    }
                } else {
                    // El bloqueo expiró (pestaña principal colgada)
                    console.warn('⚠️ Bloqueo expirado, limpiando...');
                    limpiarEstado();
                    return 'LIBRE';
                }
            }
            
            return 'INDETERMINADO';
        } catch (error) {
            console.error('Error verificando estado:', error);
            return 'ERROR';
        }
    }
    
    /**
     * Toma control como pestaña principal
     */
    function tomarControl() {
        console.log('👑 Tomando control como pestaña principal');
        soyPrincipal = true;
        
        // Establecer bloqueo
        const bloqueo = {
            id: ID_PESTANA,
            timestamp: Date.now(),
            version: CONFIG.VERSION,
            url: window.location.href
        };
        
        localStorage.setItem(CONFIG.CLAVE_BLOQUEO, JSON.stringify(bloqueo));
        
        // Iniciar latido
        iniciarLatido();
        
        // Configurar limpieza al cerrar
        configurarLimpiezaSalida();
        
        // Monitorear otras pestañas
        monitorearPestanas();
        
        // Bloquear apertura de nuevas ventanas
        bloquearNuevasVentanas();
        
        // Intentar cerrar otras pestañas existentes
        cerrarOtrasPestanas();
    }
    
    /**
     * Inicia el sistema de latido (heartbeat)
     */
    function iniciarLatido() {
        // Actualizar timestamp periódicamente
        intervalo = setInterval(() => {
            if (soyPrincipal) {
                const bloqueo = {
                    id: ID_PESTANA,
                    timestamp: Date.now(),
                    version: CONFIG.VERSION,
                    url: window.location.href
                };
                localStorage.setItem(CONFIG.CLAVE_BLOQUEO, JSON.stringify(bloqueo));
                ultimoLatido = Date.now();
            }
        }, CONFIG.INTERVALO_VERIFICACION);
    }
    
    /**
     * Configura la limpieza al salir
     */
    function configurarLimpiezaSalida() {
        // Limpiar al cerrar la pestaña
        window.addEventListener('beforeunload', function(e) {
            if (soyPrincipal) {
                // Intentar limpiar el estado
                try {
                    localStorage.removeItem(CONFIG.CLAVE_BLOQUEO);
                    localStorage.removeItem(CONFIG.CLAVE_ESTADO);
                } catch (error) {
                    console.error('Error limpiando estado:', error);
                }
                
                // Cancelar intervalo
                if (intervalo) {
                    clearInterval(intervalo);
                }
            }
        });
        
        // También limpiar si la página se descarga
        window.addEventListener('unload', function() {
            if (soyPrincipal) {
                // Marcar como inactivo para que otra pestaña pueda tomar control
                localStorage.setItem(CONFIG.CLAVE_ESTADO, JSON.stringify({
                    estado: 'INACTIVO',
                    timestamp: Date.now()
                }));
            }
        });
    }
    
    /**
     * Monitorea otras pestañas
     */
    function monitorearPestanas() {
        // Escuchar eventos de almacenamiento
        window.addEventListener('storage', function(e) {
            if (e.key === CONFIG.CLAVE_BLOQUEO && e.newValue) {
                try {
                    const nuevoBloqueo = JSON.parse(e.newValue);
                    
                    // Si otra pestaña intentó tomar control
                    if (nuevoBloqueo.id !== ID_PESTANA && soyPrincipal) {
                        console.warn('⚠️ Otra pestaña intentó tomar control. Forzando cierre...');
                        
                        // Enviar comando de cierre
                        enviarComandoCierre(nuevoBloqueo.id);
                        
                        // Reforzar nuestro bloqueo
                        const bloqueo = {
                            id: ID_PESTANA,
                            timestamp: Date.now(),
                            version: CONFIG.VERSION
                        };
                        localStorage.setItem(CONFIG.CLAVE_BLOQUEO, JSON.stringify(bloqueo));
                    }
                } catch (error) {
                    console.error('Error procesando evento storage:', error);
                }
            }
        });
        
        // También usar BroadcastChannel si está disponible
        if (typeof BroadcastChannel !== 'undefined') {
            const canal = new BroadcastChannel('control_pestanas_app');
            
            canal.onmessage = function(e) {
                const mensaje = e.data;
                
                if (mensaje.tipo === 'SOLICITUD_CONTROL' && mensaje.id !== ID_PESTANA && soyPrincipal) {
                    // Responder que ya hay control
                    canal.postMessage({
                        tipo: 'CONTROL_NEGADO',
                        id: ID_PESTANA,
                        motivo: 'YA_EXISTE_PRINCIPAL'
                    });
                    
                    // Ordenar cierre
                    canal.postMessage({
                        tipo: 'CERRAR_PESTANA',
                        idDestino: mensaje.id,
                        idOrigen: ID_PESTANA
                    });
                }
                
                if (mensaje.tipo === 'CERRAR_PESTANA' && mensaje.idDestino === ID_PESTANA) {
                    cerrarPestanaActual();
                }
            };
            
            // Anunciar nuestro control
            canal.postMessage({
                tipo: 'CONTROL_TOMADO',
                id: ID_PESTANA,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Bloquea la apertura de nuevas ventanas
     */
    function bloquearNuevasVentanas() {
        // Interceptar clics en enlaces que abren nueva pestaña
        document.addEventListener('click', function(e) {
            let target = e.target;
            
            // Buscar si el clic fue en un enlace
            while (target && target.nodeName !== 'A') {
                target = target.parentNode;
            }
            
            if (target && target.nodeName === 'A') {
                const href = target.getAttribute('href');
                const targetAttr = target.getAttribute('target');
                
                // Si intenta abrir en nueva pestaña/ventana
                if (targetAttr && (targetAttr === '_blank' || targetAttr === 'new')) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Mostrar advertencia
                    mostrarNotificacion('Esta aplicación no permite abrir nuevas pestañas');
                    
                    // Alternativa: abrir en la misma pestaña
                    // window.location.href = href;
                    
                    return false;
                }
            }
        }, true); // Usar captura para interceptar temprano
        
        // Bloquear Ctrl+T, Ctrl+N, etc.
        document.addEventListener('keydown', function(e) {
            // Ctrl+T (nueva pestaña)
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                mostrarNotificacion('No se pueden abrir nuevas pestañas');
                return false;
            }
            
            // Ctrl+N (nueva ventana)
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                mostrarNotificacion('No se pueden abrir nuevas ventanas');
                return false;
            }
            
            // Ctrl+Shift+N (nueva ventana incógnito)
            if (e.ctrlKey && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                mostrarNotificacion('No se pueden abrir nuevas ventanas');
                return false;
            }
            
            // Ctrl+Click en enlace (abre en nueva pestaña)
            if (e.ctrlKey && e.button === 0) {
                // Se maneja en el evento click
            }
        });
        
        // Sobrescribir window.open
        const originalWindowOpen = window.open;
        window.open = function(url, target, features) {
            mostrarNotificacion('Esta aplicación bloquea la apertura de nuevas ventanas');
            
            // Opcional: puedes permitir que se abra en la misma pestaña
            if (url) {
                window.location.href = url;
            }
            
            return null;
        };
        
        // Bloquear middle-click (rueda del ratón)
        document.addEventListener('auxclick', function(e) {
            if (e.button === 1) { // Middle click
                e.preventDefault();
                e.stopPropagation();
                mostrarNotificacion('Click central bloqueado');
                return false;
            }
        });
    }
    
    /**
     * Intenta cerrar otras pestañas existentes
     */
    function cerrarOtrasPestanas() {
        console.log('🔍 Buscando otras pestañas para cerrar...');
        
        // Usar BroadcastChannel para enviar comando de cierre
        if (typeof BroadcastChannel !== 'undefined') {
            const canal = new BroadcastChannel('control_pestanas_app');
            canal.postMessage({
                tipo: 'CERRAR_TODAS',
                excepcion: ID_PESTANA,
                timestamp: Date.now()
            });
            
            // Cerrar el canal después de enviar
            setTimeout(() => {
                canal.close();
            }, 1000);
        }
        
        // También usar localStorage para enviar señal de cierre
        localStorage.setItem('app_comando_cierre', JSON.stringify({
            comando: 'CERRAR',
            excepcion: ID_PESTANA,
            timestamp: Date.now()
        }));
        
        // Remover después de un tiempo
        setTimeout(() => {
            localStorage.removeItem('app_comando_cierre');
        }, 2000);
    }
    
    /**
     * Envía comando de cierre a una pestaña específica
     */
    function enviarComandoCierre(idPestana) {
        localStorage.setItem('app_cierre_especifico', JSON.stringify({
            id: idPestana,
            comando: 'CERRAR_INMEDIATO',
            timestamp: Date.now()
        }));
        
        setTimeout(() => {
            localStorage.removeItem('app_cierre_especifico');
        }, 1000);
    }
    
    /**
     * Maneja una pestaña duplicada (esta no es la principal)
     */
    function manejarPestanaDuplicada() {
        console.log('🚫 Esta es una pestaña duplicada. Cerrando...');
        
        // Mostrar página de bloqueo
        mostrarPaginaBloqueo();
        
        // Esperar un momento y cerrar
        setTimeout(() => {
            cerrarPestanaActual();
        }, 3000);
        
        // Intentar enfocar la pestaña principal
        try {
            localStorage.setItem('app_enfocar_principal', Date.now().toString());
        } catch (error) {
            console.error('Error intentando enfocar principal:', error);
        }
    }
    
    /**
     * Muestra página de bloqueo
     */
    function mostrarPaginaBloqueo() {
        // Reemplazar todo el contenido de la página
        document.documentElement.innerHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Aplicación ya en uso</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                        color: white;
                    }
                    
                    .container {
                        background: rgba(255, 255, 255, 0.1);
                        backdrop-filter: blur(10px);
                        border-radius: 20px;
                        padding: 40px;
                        max-width: 500px;
                        width: 100%;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    
                    .icon {
                        font-size: 80px;
                        margin-bottom: 20px;
                        animation: pulse 2s infinite;
                    }
                    
                    h1 {
                        font-size: 28px;
                        margin-bottom: 15px;
                        font-weight: 600;
                    }
                    
                    p {
                        font-size: 16px;
                        margin-bottom: 25px;
                        line-height: 1.6;
                        opacity: 0.9;
                    }
                    
                    .countdown {
                        font-size: 48px;
                        font-weight: bold;
                        margin: 30px 0;
                        color: #ffd166;
                    }
                    
                    .button {
                        background: white;
                        color: #667eea;
                        border: none;
                        padding: 15px 30px;
                        border-radius: 50px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.2s, box-shadow 0.2s;
                        display: inline-block;
                        text-decoration: none;
                    }
                    
                    .button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                    }
                    
                    .button:active {
                        transform: translateY(0);
                    }
                    
                    @keyframes pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                        100% { transform: scale(1); }
                    }
                    
                    .footer {
                        margin-top: 30px;
                        font-size: 14px;
                        opacity: 0.7;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">⚠️</div>
                    <h1>Aplicación ya en uso</h1>
                    <p>Esta aplicación solo puede estar abierta en una pestaña a la vez.</p>
                    <p>Por favor, use la pestaña ya abierta o cierre las otras para continuar.</p>
                    
                    <div class="countdown" id="countdown">3</div>
                    
                    <button class="button" onclick="window.close()">
                        Cerrar esta pestaña ahora
                    </button>
                    
                    <div class="footer">
                        <p>Esta pestaña se cerrará automáticamente en unos segundos</p>
                    </div>
                </div>
                
                <script>
                    // Contador regresivo
                    let countdown = 3;
                    const countdownElement = document.getElementById('countdown');
                    
                    const timer = setInterval(() => {
                        countdown--;
                        countdownElement.textContent = countdown;
                        
                        if (countdown <= 0) {
                            clearInterval(timer);
                            window.close();
                        }
                    }, 1000);
                    
                    // Intentar cerrar automáticamente
                    setTimeout(() => {
                        window.close();
                    }, 4000);
                </script>
            </body>
            </html>
        `;
    }
    
    /**
     * Cierra la pestaña actual
     */
    function cerrarPestanaActual() {
        // Intentar cerrar suavemente
        try {
            window.close();
            
            // Si no se pudo cerrar, redirigir
            setTimeout(() => {
                if (!window.closed) {
                    window.location.href = 'about:blank';
                }
            }, 100);
        } catch (error) {
            console.error('Error cerrando pestaña:', error);
            window.location.href = 'about:blank';
        }
    }
    
    /**
     * Resuelve conflicto cuando hay estado ambiguo
     */
    function resolverConflicto() {
        console.log('⚡ Resolviendo conflicto de pestañas...');
        
        // Usar timestamp para decidir (la más reciente gana)
        const timestampActual = parseInt(ID_PESTANA.split('_')[1]);
        const bloqueo = JSON.parse(localStorage.getItem(CONFIG.CLAVE_BLOQUEO) || '{}');
        const timestampBloqueo = bloqueo.timestamp || 0;
        
        if (timestampActual > timestampBloqueo) {
            // Esta pestaña es más nueva, tomar control
            limpiarEstado();
            setTimeout(tomarControl, 100);
        } else {
            // Otra pestaña es más nueva, cerrar
            manejarPestanaDuplicada();
        }
    }
    
    /**
     * Limpia el estado almacenado
     */
    function limpiarEstado() {
        try {
            localStorage.removeItem(CONFIG.CLAVE_BLOQUEO);
            localStorage.removeItem(CONFIG.CLAVE_ESTADO);
            localStorage.removeItem('app_comando_cierre');
            localStorage.removeItem('app_cierre_especifico');
        } catch (error) {
            console.error('Error limpiando estado:', error);
        }
    }
    
    /**
     * Muestra una notificación temporal
     */
    function mostrarNotificacion(mensaje) {
        // Crear elemento de notificación
        const notificacion = document.createElement('div');
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4757;
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease-out;
            max-width: 400px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        `;
        
        // Agregar animación
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        notificacion.textContent = mensaje;
        document.body.appendChild(notificacion);
        
        // Auto-eliminar después de 3 segundos
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.style.animation = 'slideInRight 0.3s ease-out reverse';
                setTimeout(() => {
                    if (notificacion.parentNode) {
                        notificacion.remove();
                    }
                }, 300);
            }
        }, 3000);
    }
    
    // ================= INICIALIZACIÓN =================
    
    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(inicializarSistema, 100);
        });
    } else {
        setTimeout(inicializarSistema, 100);
    }
    
    // También manejar cuando la página se hace visible
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && !soyPrincipal) {
            // La pestaña se hizo visible y no es principal
            setTimeout(() => {
                const estado = verificarEstadoSistema();
                if (estado === 'BLOQUEADO') {
                    manejarPestanaDuplicada();
                }
            }, 500);
        }
    });
    
    // Exportar para debugging (opcional)
    window.controlPestanas = {
        soyPrincipal: () => soyPrincipal,
        miId: () => ID_PESTANA,
        forzarCierre: () => {
            limpiarEstado();
            location.reload();
        },
        liberarControl: () => {
            soyPrincipal = false;
            if (intervalo) clearInterval(intervalo);
            limpiarEstado();
        }
    };
    
})();

// ============================================
// EL RESTO DE TU CÓDIGO MAIN.JS
// ============================================

console.log('✅ Sistema de control de pestañas cargado');

// Tu código de aplicación normal aquí...
// Por ejemplo:
// import './app.js';
// import './config.js';
// etc.


// main.js de Electron
const { app, BrowserWindow, Menu } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        // Esto SÍ funciona en Electron:
        frame: false,           // Sin barra de título
        titleBarStyle: 'hidden', // Barra de título personalizada
        autoHideMenuBar: true,  // Menú oculto
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    
    // Cargar tu sitio web
    win.loadURL('https://tu-sitio.com');
    
    // Ocultar menú completamente
    Menu.setApplicationMenu(null);
}

app.whenReady().then(createWindow);
