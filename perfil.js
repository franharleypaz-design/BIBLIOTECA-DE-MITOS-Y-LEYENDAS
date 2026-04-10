// ==========================================
// PERFIL.JS - LÓGICA DE LA TARJETA DE INVOCADOR
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Selectores de Interfaz para el Formulario
    const btnEdit = document.getElementById('btn-edit-profile');
    const viewWrapper = document.getElementById('perfil-view-wrapper');
    const editForm = document.getElementById('perfil-edit-form');
    const btnCancel = document.getElementById('btn-cancel-edit');

    if (btnEdit && viewWrapper && editForm) {
        btnEdit.onclick = async () => {
            if (!usuarioActual) return;
            const doc = await db.collection('usuarios').doc(usuarioActual.uid).get();
            if (doc.exists) {
                const d = doc.data();
                document.getElementById('edit-realname').value = d.nombreReal || "";
                document.getElementById('edit-nickname').value = d.nickname || "";
                document.getElementById('edit-birth').value = d.fechaNacimiento || "";
                document.getElementById('edit-sexo').value = d.sexo || "MÍSTICO";
                document.getElementById('edit-bio').value = d.descripcion || "";
            }
            viewWrapper.style.display = 'none';
            editForm.style.display = 'flex';
        };
    }

    if (btnCancel && viewWrapper && editForm) {
        btnCancel.onclick = () => {
            viewWrapper.style.display = 'flex';
            editForm.style.display = 'none';
        };
    }
});

// ==========================================
// CARGA DE DATOS Y REGISTROS
// ==========================================
async function cargarDatosPerfilCompleto(uid) {
    const doc = await db.collection('usuarios').doc(uid).get();
    if (doc.exists) {
        const data = doc.data();
        
        // 1. Datos Básicos
        const nick = data.nickname || "GLADIADOR";
        document.getElementById('card-nick-display').innerText = nick;
        document.getElementById('card-desc-display').innerText = data.descripcion || "Sin leyenda aún...";
        document.getElementById('invocador-rango').innerText = `RANGO: ${data.rango || "INICIADO"}`;

        if (data.photoCustom) {
            cargarImagenSegura('profile-img-large', data.photoCustom);
            cargarImagenSegura('user-photo', data.photoCustom);
        }

        // 2. Cargar Registros (Mazos y Carpetas)
        actualizarListaRegistros(uid);
    }
}

async function actualizarListaRegistros(uid) {
    const container = document.getElementById('folders-container');
    if (!container) return;
    container.innerHTML = ""; // Limpiar para recargar

    try {
        const slotsRef = db.collection('usuarios').doc(uid).collection('slots');
        const querySnapshot = await slotsRef.get();
        
        // 1. MAZO PRINCIPAL (Elegido por el usuario)
        // Por ahora tomamos 'mazo1' como principal por defecto
        const mazoPrincipal = await slotsRef.doc('mazo1').get();
        container.innerHTML += crearHTMLItemRegistro("⚔️ MAZO PRINCIPAL", "mazo1", "grimorio.html");

        // 2. CARPETA DE LIBRE ELECCIÓN
        // Tomamos 'carpeta1' como la carpeta activa para mostrar en el perfil
        container.innerHTML += crearHTMLItemRegistro("📁 CARPETA ACTIVA", "carpeta1", "grimorio.html");

        // 3. MAZOS COPIADOS (Visualización)
        // Buscamos slots que tengan una marca de "copiado"
        querySnapshot.forEach((doc) => {
            if (doc.id.includes('copia')) {
                container.innerHTML += crearHTMLItemRegistro("🔗 COPIA: " + doc.id, doc.id, "constructor.html");
            }
        });

    } catch (e) {
        console.error("Error cargando registros:", e);
    }
}

function crearHTMLItemRegistro(titulo, id, destino) {
    return `
        <div class="folder-item">
            <div class="folder-info">
                <small style="color: var(--accent); font-size: 0.6rem;">${id.toUpperCase()}</small>
                <span style="display:block;">${titulo}</span>
            </div>
            <button class="btn-salir" onclick="location.href='${destino}?slot=${id}'">ABRIR</button>
        </div>
    `;
}

// ==========================================
// FUNCIONES DE GALERÍA
// ==========================================
function abrirGaleria() {
    document.getElementById('modal-galeria').style.display = 'block';
}

function cerrarGaleria() {
    document.getElementById('modal-galeria').style.display = 'none';
}

async function seleccionarAvatar(url) {
    if (!usuarioActual) return;
    try {
        await db.collection('usuarios').doc(usuarioActual.uid).set({
            photoCustom: url
        }, { merge: true });

        document.getElementById('profile-img-large').src = url;
        if(document.getElementById('user-photo')) document.getElementById('user-photo').src = url;
        
        mostrarNotificacion("Apariencia actualizada", "✨");
        cerrarGaleria();
    } catch (error) {
        mostrarNotificacion("Error al cambiar esencia", "❌");
    }
}