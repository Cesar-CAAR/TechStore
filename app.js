const apiUrl = 'https://techstore-api-ypm5.onrender.com/api/componentes';
let componentesActuales = [];

// ==========================================
// 1. SISTEMA DE NOTIFICACIONES Y MODALES
// ==========================================
window.cerrarModal = function(idModal) {
    document.getElementById(idModal).classList.add('oculto');
}

window.mostrarNotificacion = function(mensaje, tipo = 'normal') {
    const toast = document.getElementById('toast-notificacion');
    const toastMensaje = document.getElementById('toast-mensaje');
    
    toastMensaje.textContent = mensaje;
    toast.className = 'toast'; 
    if (tipo === 'error') toast.classList.add('error');
    if (tipo === 'success') toast.classList.add('success');
    
    toast.classList.remove('oculto-toast');
    
    setTimeout(() => {
        toast.classList.add('oculto-toast');
    }, 3500);
}

// ==========================================
// 2. DETECCIÓN DE CONEXIÓN Y SINCRONIZACIÓN
// ==========================================
function actualizarEstadoRedEstatico(online) {
    const indicador = document.getElementById('estado-red-estatico');
    if (online) {
        indicador.textContent = "✅ Conectado";
        indicador.className = "estado-online";
    } else {
        indicador.textContent = "⚠️ Sin conexión - Modo local";
        indicador.className = "estado-offline";
    }
}

// Ya no se disparan notificaciones Toast aquí, solo se actualiza el indicador estático
window.addEventListener('offline', () => {
    actualizarEstadoRedEstatico(false);
});

window.addEventListener('online', () => {
    actualizarEstadoRedEstatico(true);
    sincronizarColaOffline();
});

// Función para procesar y enviar los datos guardados al recuperar internet
async function sincronizarColaOffline() {
    let cola = JSON.parse(localStorage.getItem('techstore_cola_offline')) || [];
    if (cola.length === 0) {
        cargarComponentes(); 
        return; 
    }
    
    for (let tarea of cola) {
        try {
            if (tarea.metodo === 'POST') {
                let payload = { ...tarea.data };
                delete payload.id; 
                await fetch(apiUrl, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
            } else if (tarea.metodo === 'PUT') {
                await fetch(`${apiUrl}/${tarea.id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(tarea.data) });
            } else if (tarea.metodo === 'DELETE') {
                await fetch(`${apiUrl}/${tarea.id}`, { method: 'DELETE' });
            }
        } catch (error) {
            console.error("Error al sincronizar tarea:", tarea, error);
        }
    }
    
    localStorage.removeItem('techstore_cola_offline');
    cargarComponentes();
    mostrarNotificacion("Sincronización completada exitosamente.", "success");
}

// Función para guardar acciones en caché cuando no hay internet
function guardarAccionOffline(metodo, id, data) {
    let cola = JSON.parse(localStorage.getItem('techstore_cola_offline')) || [];
    
    if (metodo === 'POST') {
        data.id = 'temp_' + Date.now(); 
        cola.push({ metodo: 'POST', data: data });
        componentesActuales.push(data);
    } else if (metodo === 'PUT') {
        if (String(id).startsWith('temp_')) {
            let postTarea = cola.find(q => q.metodo === 'POST' && q.data.id === id);
            if (postTarea) postTarea.data = data;
        } else {
            cola.push({ metodo: 'PUT', id: id, data: data });
        }
        let index = componentesActuales.findIndex(c => c.id == id);
        if(index > -1) componentesActuales[index] = data;
    } else if (metodo === 'DELETE') {
        if (String(id).startsWith('temp_')) {
            cola = cola.filter(q => !(q.metodo === 'POST' && q.data.id === id));
        } else {
            cola.push({ metodo: 'DELETE', id: id });
        }
        componentesActuales = componentesActuales.filter(c => c.id != id);
    }
    
    localStorage.setItem('techstore_cola_offline', JSON.stringify(cola));
    localStorage.setItem('techstore_backup', JSON.stringify(componentesActuales));
    renderizarTabla(componentesActuales);
}

// ==========================================
// 3. OBTENER Y PINTAR TABLA (GET) 
// ==========================================
async function cargarComponentes() {
    try {
        const respuesta = await fetch(apiUrl);
        componentesActuales = await respuesta.json();
        
        let cola = JSON.parse(localStorage.getItem('techstore_cola_offline')) || [];
        if (cola.length === 0) {
            localStorage.setItem('techstore_backup', JSON.stringify(componentesActuales));
        }
        
        renderizarTabla(componentesActuales);
    } catch (error) {
        console.warn('Sin conexión a la API. Cargando respaldo local y cambios sin sincronizar...');
        const respaldo = localStorage.getItem('techstore_backup');
        if (respaldo) {
            componentesActuales = JSON.parse(respaldo);
            renderizarTabla(componentesActuales);
        } else {
            document.getElementById('lista-componentes').innerHTML = 
                '<tr><td colspan="5" style="text-align:center; color:#e53e3e;">Sin internet y sin respaldo local.</td></tr>';
        }
    }
}

function renderizarTabla(componentes) {
    const tbody = document.getElementById('lista-componentes');
    tbody.innerHTML = ''; 

    if (componentes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Inventario vacío.</td></tr>';
        return;
    }

    componentes.forEach(comp => {
        const tr = document.createElement('tr');
        tr.onclick = () => abrirModalDetalles(comp.id);
        
        let visualId = String(comp.id).startsWith('temp_') ? '⏳ Pendiente' : `#${comp.id}`;
        
        tr.innerHTML = `
            <td style="color:#8A2BE2; font-weight:bold;">${visualId}</td>
            <td><strong>${comp.nombre}</strong></td>
            <td><span style="background:#0B0B12; padding:4px 8px; border-radius:4px; border:1px solid #8A2BE2; font-size:0.85em;">${comp.categoria}</span></td>
            <td style="color:#FFD700; font-weight:bold;">$${comp.precio.toFixed(2)}</td>
            <td>${comp.stock} unds.</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// 4. MODAL DE DETALLES
// ==========================================
window.abrirModalDetalles = function(id) {
    const comp = componentesActuales.find(c => c.id === id);
    if (!comp) return;

    document.getElementById('detalle-nombre').textContent = comp.nombre;
    document.getElementById('detalle-categoria').textContent = comp.categoria;
    document.getElementById('detalle-precio').textContent = comp.precio.toFixed(2);
    document.getElementById('detalle-stock').textContent = comp.stock;
    document.getElementById('detalle-especificaciones').textContent = comp.especificaciones || 'Sin detalles registrados.';

    document.getElementById('btn-editar-detalle').onclick = () => abrirModalEditar(comp);
    document.getElementById('btn-eliminar-detalle').onclick = () => eliminarComponente(comp.id);

    document.getElementById('modal-detalles').classList.remove('oculto');
}

// ==========================================
// 5. CREAR Y EDITAR (POST / PUT)
// ==========================================
window.abrirModalCrear = function() {
    document.getElementById('form-componente').reset();
    document.getElementById('form-id').value = '';
    document.getElementById('form-titulo').textContent = 'Nuevo Componente';
    document.getElementById('modal-formulario').classList.remove('oculto');
}

window.abrirModalEditar = function(comp) {
    cerrarModal('modal-detalles');
    document.getElementById('form-id').value = comp.id;
    document.getElementById('form-nombre').value = comp.nombre;
    document.getElementById('form-categoria').value = comp.categoria;
    document.getElementById('form-precio').value = comp.precio;
    document.getElementById('form-stock').value = comp.stock;
    document.getElementById('form-especificaciones').value = comp.especificaciones;
    
    document.getElementById('form-titulo').textContent = 'Editar Componente';
    document.getElementById('modal-formulario').classList.remove('oculto');
}

document.getElementById('form-componente').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const idValue = document.getElementById('form-id').value;
    const componenteData = {
        nombre: document.getElementById('form-nombre').value,
        categoria: document.getElementById('form-categoria').value,
        precio: parseFloat(document.getElementById('form-precio').value),
        stock: parseInt(document.getElementById('form-stock').value),
        especificaciones: document.getElementById('form-especificaciones').value
    };

    const metodo = idValue ? 'PUT' : 'POST';
    
    if (!navigator.onLine) {
        let idFormateado = idValue;
        if (idValue && !String(idValue).startsWith('temp_')) {
            idFormateado = parseInt(idValue);
            componenteData.id = idFormateado;
        } else if (String(idValue).startsWith('temp_')) {
            componenteData.id = idValue;
        }
        
        guardarAccionOffline(metodo, idFormateado, componenteData);
        cerrarModal('modal-formulario');
        mostrarNotificacion("Cambio guardado localmente (Sin conexión)", "normal");
        return;
    }

    if (idValue) componenteData.id = parseInt(idValue);
    const urlFinal = idValue ? `${apiUrl}/${idValue}` : apiUrl;

    try {
        const respuesta = await fetch(urlFinal, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(componenteData)
        });

        if (respuesta.ok) {
            cerrarModal('modal-formulario');
            mostrarNotificacion(idValue ? "Componente actualizado." : "Componente guardado.", "success");
            cargarComponentes();
        }
    } catch (error) {
        mostrarNotificacion("Error de conexión con el servidor.", "error");
    }
});

// ==========================================
// 6. ELIMINAR (DELETE) CON MODAL
// ==========================================
let idAEliminar = null; 

window.eliminarComponente = function(id) {
    idAEliminar = id; 
    document.getElementById('modal-confirmacion').classList.remove('oculto'); 
}

document.getElementById('btn-confirmar-eliminar').addEventListener('click', async () => {
    if (!idAEliminar) return;
    
    cerrarModal('modal-confirmacion'); 
    cerrarModal('modal-detalles'); 

    if (!navigator.onLine) {
        guardarAccionOffline('DELETE', idAEliminar, null);
        mostrarNotificacion("Eliminación encolada (Sin conexión).", "normal");
        idAEliminar = null; 
        return;
    }
    
    try {
        const respuesta = await fetch(`${apiUrl}/${idAEliminar}`, { method: 'DELETE' });
        if (respuesta.ok) {
            mostrarNotificacion("Componente eliminado.", "success");
            cargarComponentes();
        }
    } catch (error) {
        mostrarNotificacion("Error de conexión con el servidor.", "error");
    }
    
    idAEliminar = null; 
});

// ==========================================
// INICIAR APLICACIÓN
// ==========================================
actualizarEstadoRedEstatico(navigator.onLine); // Comprobar estado inicial al cargar
cargarComponentes();

// ==========================================
// 7. REGISTRO DEL SERVICE WORKER (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado correctamente.', reg))
            .catch(err => console.warn('Error al registrar Service Worker:', err));
    });
}