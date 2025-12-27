class ControladorPestañasUnicas {
    constructor() {
        this.canal = new BroadcastChannel('control-pestañas');
        this.idPestaña = this.generarIdUnico();
        this.esPestañaPrincipal = false;
        
        this.inicializar();
    }
    
    generarIdUnico() {
        return `pestaña_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    inicializar() {
        // Solicitar si hay pestaña principal
        this.canal.postMessage({
            tipo: 'solicitud-pestaña-principal',
            id: this.idPestaña
        });
        
        // Configurar timeout para declararse como principal si no hay respuesta
        setTimeout(() => {
            if (!this.esPestañaPrincipal) {
                this.declararComoPrincipal();
            }
        }, 100);
        
        // Escuchar mensajes de otras pestañas
        this.canal.onmessage = (evento) => {
            const mensaje = evento.data;
            
            switch(mensaje.tipo) {
                case 'respuesta-pestaña-principal':
                    // Ya hay una pestaña principal, cerrar esta
                    if (mensaje.existePrincipal && mensaje.idPrincipal !== this.idPestaña) {
                        this.cerrarPestaña();
                    }
                    break;
                    
                case 'declarar-principal':
                    // Otra pestaña se declaró principal
                    if (mensaje.id !== this.idPestaña) {
                        if (this.esPestañaPrincipal) {
                            // Esta ya era principal, hay conflicto
                            this.resolverConflicto(mensaje.id);
                        } else {
                            this.cerrarPestaña();
                        }
                    }
                    break;
                    
                case 'cerrar-pestaña':
                    if (mensaje.id === this.idPestaña) {
                        this.cerrarPestaña();
                    }
                    break;
            }
        };
        
        // Limpiar al cerrar
        window.addEventListener('beforeunload', () => {
            if (this.esPestañaPrincipal) {
                this.canal.postMessage({
                    tipo: 'principal-cerrada',
                    id: this.idPestaña
                });
            }
            this.canal.close();
        });
    }
    
    declararComoPrincipal() {
        this.esPestañaPrincipal = true;
        this.canal.postMessage({
            tipo: 'declarar-principal',
            id: this.idPestaña,
            timestamp: Date.now()
        });
    }
    
    cerrarPestaña() {
        // Mostrar mensaje al usuario
        const mensaje = document.createElement('div');
        mensaje.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: #ff6b6b;
            color: white;
            padding: 10px;
            text-align: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;
        mensaje.textContent = 'Esta aplicación ya está abierta en otra pestaña. Esta pestaña se cerrará en 3 segundos...';
        document.body.appendChild(mensaje);
        
        // Cerrar después de 3 segundos
        setTimeout(() => {
            window.close();
            // Si window.close() no funciona (depende del navegador), redirigir
            if (!window.closed) {
                window.location.href = 'about:blank';
            }
        }, 3000);
    }
    
    resolverConflicto(otroId) {
        // Resolver conflicto: la pestaña con ID más antiguo gana
        const miTimestamp = parseInt(this.idPestaña.split('_')[1]);
        const otroTimestamp = parseInt(otroId.split('_')[1]);
        
        if (miTimestamp < otroTimestamp) {
            // Yo gano, enviar mensaje para que el otro cierre
            this.canal.postMessage({
                tipo: 'cerrar-pestaña',
                id: otroId
            });
        } else {
            // Yo pierdo, cerrar esta
            this.cerrarPestaña();
        }
    }
}

// Iniciar cuando la página cargue
window.addEventListener('load', () => {
    new ControladorPestañasUnicas();
});
