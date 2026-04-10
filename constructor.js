// ==========================================
// 1. CONFIGURACIÓN DE REGLAS Y BLOQUES
// ==========================================
const BLOQUES = {
    "primera-era": ["el_reto", "mundo_gotico", "la_ira_del_nahual", "ragnarok", "espiritu_de_dragon"],
    "segunda-era": ["espada_sagrada", "helenica", "hijos_de_daana", "dominios_de_ra"]
};

let mazoActual = []; 
let slotId = "";
let esMazo = false;
let mostrandoSoloFavoritos = false;
let mostrandoSoloCarpeta = false; // Nueva variable de estado

let configMazo = {
    bloque: "",      
    formato: "libre", 
    raza: "",        
    edicionBase: ""  
};

// ==========================================
// 2. INICIO Y CARGA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    slotId = params.get('slot');

    if (!slotId) {
        window.location.href = 'grimorio.html';
        return;
    }

    esMazo = slotId.includes('mazo');
    
    const displaySlot = document.getElementById('slot-id-display');
    if (displaySlot) displaySlot.innerText = "SINCRONIZANDO REGISTROS...";
    
    // --- LÓGICA DE INTERFAZ SEGÚN MODO ---
    if (!esMazo) {
        document.body.classList.add('modo-album'); 
        const titulo = document.getElementById('constructor-title');
        if (titulo) titulo.innerText = "ÁLBUM DE COLECCIÓN";
        
        const setup = document.getElementById('setup-mazo');
        const stats = document.querySelector('.deck-stats-header');
        const favFilter = document.getElementById('folder-fav-filter');

        if (setup) setup.style.display = 'none';
        if (stats) stats.style.display = 'none';
        if (favFilter) favFilter.style.display = 'block';

        const btnSave = document.querySelector('.btn-save-deck');
        if (btnSave) btnSave.innerText = "GUARDAR CAMBIOS EN ÁLBUM";
    }

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            usuarioActual = user;
            await cargarDatosDelSlot();
            if (typeof cargarGrimorio === "function") {
                await cargarGrimorio();
            }
            filtrarCartas();
        }
    });

    document.getElementById('main-search')?.addEventListener('input', () => filtrarCartas());
});

async function cargarDatosDelSlot() {
    try {
        const doc = await db.collection('usuarios').doc(usuarioActual.uid)
                       .collection('slots').doc(slotId).get();
        
        if (doc.exists) {
            const data = doc.data();
            mazoActual = data.cartas || [];

            const displayNombre = document.getElementById('slot-id-display');
            if (displayNombre) {
                const nombreReal = data.nombre || slotId.toUpperCase();
                displayNombre.innerText = `MODO: ${nombreReal}`;
            }

            if (data.config) {
                configMazo = data.config;
                setearValoresInterfaz();
            }
        }
        renderizarMazo();
    } catch (e) {
        console.error("Error al cargar datos del slot:", e);
    }
}

// ==========================================
// 3. LÓGICA DE EXHIBICIÓN (FILTROS DE VISTA)
// ==========================================

function toggleMostrarCarpeta() {
    mostrandoSoloCarpeta = !mostrandoSoloCarpeta;
    
    // Si desactivamos carpeta, desactivamos favoritos también
    if (!mostrandoSoloCarpeta) mostrandoSoloFavoritos = false;

    actualizarEstiloBotonesExhibicion();
    filtrarCartas();
}

function toggleMostrarFavoritos() {
    mostrandoSoloFavoritos = !mostrandoSoloFavoritos;
    
    // Si activamos favoritos, forzamos la vista de carpeta
    if (mostrandoSoloFavoritos) mostrandoSoloCarpeta = true;

    actualizarEstiloBotonesExhibicion();
    filtrarCartas();
    renderizarMazo(); // Sincroniza lista derecha
}

function actualizarEstiloBotonesExhibicion() {
    const btnOwned = document.getElementById('btn-show-owned');
    const btnFavs = document.getElementById('btn-show-favs');

    if (btnOwned) {
        btnOwned.innerHTML = mostrandoSoloCarpeta ? "🌍 VER CATÁLOGO" : "🗂️ VER MI CARPETA";
        btnOwned.classList.toggle('active-filter', mostrandoSoloCarpeta);
    }
    if (btnFavs) {
        btnFavs.innerHTML = mostrandoSoloFavoritos ? "📖 VER TODO EL ÁLBUM" : "⭐ VER FAVORITOS";
        btnFavs.classList.toggle('active-filter', mostrandoSoloFavoritos);
    }
}

// ==========================================
// 4. JUEZ DE VALIDACIONES Y FILTRADO
// ==========================================
function filtrarCartas() {
    const display = document.getElementById('card-display');
    if (!display || !cartasMyL || cartasMyL.length === 0) return;

    const busqueda = document.getElementById('main-search')?.value.toLowerCase() || "";
    const tipoFiltro = document.getElementById('tipo-filter')?.value || "";
    const razaFiltroManual = document.getElementById('raza-filter')?.value || "";

    // Decidir fuente: ¿Todo el juego o solo mi carpeta?
    let fuenteDeCartas = cartasMyL;

    if (mostrandoSoloCarpeta) {
        const idsEnMazo = mazoActual.map(item => item.id);
        
        if (mostrandoSoloFavoritos) {
            const idsFavs = mazoActual.filter(item => item.favorito).map(item => item.id);
            fuenteDeCartas = cartasMyL.filter(c => idsFavs.includes(c.ID));
        } else {
            fuenteDeCartas = cartasMyL.filter(c => idsEnMazo.includes(c.ID));
        }
    }

    const legales = fuenteDeCartas.filter(c => {
        if (esMazo && configMazo.bloque) {
            const edicionNorm = c.Carpeta_Edicion.toLowerCase();
            const esPrimera = BLOQUES["primera-era"].includes(edicionNorm);
            const esSegunda = BLOQUES["segunda-era"].includes(edicionNorm);
            if (configMazo.bloque === "primera-era" && !esPrimera) return false;
            if (configMazo.bloque === "segunda-era" && !esSegunda) return false;
        }

        if (esMazo && configMazo.formato.includes('racial') && configMazo.raza && c.Tipo.includes('Aliado')) {
            if (c.Raza !== configMazo.raza) return false;
        }

        if (razaFiltroManual !== "" && c.Raza !== razaFiltroManual) return false;

        const matchTexto = c.Nombre.toLowerCase().includes(busqueda) || 
                          (c.Habilidad && c.Habilidad.toLowerCase().includes(busqueda));
        const matchTipo = tipoFiltro === "" || c.Tipo.includes(tipoFiltro);

        return matchTexto && matchTipo;
    });

    dibujarCartasConstructor(legales.slice(0, 100)); 
}

function dibujarCartasConstructor(lista) {
    const display = document.getElementById('card-display');
    if (!display) return;
    display.innerHTML = "";

    if (lista.length === 0) {
        display.innerHTML = `<div style="color: #666; padding: 50px; text-align: center; font-family: 'Cinzel'; grid-column: span 4;">No se han encontrado cartas en esta sección.</div>`;
        return;
    }

    lista.forEach(c => {
        const rutaImg = `img/cartas/${c.Bloque}/${c.Carpeta_Edicion}/${c.Imagen}`;
        const div = document.createElement('div');
        div.className = "card-item";
        div.innerHTML = `<img src="${rutaImg}" alt="${c.Nombre}" loading="lazy">`;
        div.onclick = () => añadirCarta(c.ID);
        display.appendChild(div);
    });
}

function validarCopiaLegal(carta) {
    if (!esMazo) return { valida: true };
    
    const itemEnMazo = mazoActual.find(item => item.id === carta.ID);
    const cantEnMazo = itemEnMazo ? itemEnMazo.cant : 0;
    const habilidad = (carta.Habilidad || "").toLowerCase();

    if (habilidad.includes("única") || habilidad.includes("unica")) {
        if (cantEnMazo >= 1) return { valida: false, msg: "Es una carta ÚNICA. Solo se permite 1 copia." };
    }
    
    if (!habilidad.includes("mercenario") && !carta.Tipo.includes("Oro")) {
        if (cantEnMazo >= 3) return { valida: false, msg: "Máximo 3 copias permitidas." };
    }

    return { valida: true };
}

// ==========================================
// 5. ACCIONES (BOTONES)
// ==========================================
function añadirCarta(id) {
    const carta = cartasMyL.find(c => c.ID === id);
    if (!carta) return;

    const validacion = validarCopiaLegal(carta);
    
    if (!validacion.valida) {
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion(validacion.msg, "⚠️");
        }
        return;
    }

    const indice = mazoActual.findIndex(item => item.id === id);
    if (indice > -1) {
        mazoActual[indice].cant++;
    } else {
        mazoActual.push({ id: id, cant: 1, favorito: false });
    }
    renderizarMazo();
    if (mostrandoSoloCarpeta) filtrarCartas(); // Actualiza galería si estamos viendo la carpeta
}

function quitarCarta(id) {
    const indice = mazoActual.findIndex(item => item.id === id);
    if (indice > -1) {
        mazoActual[indice].cant--;
        if (mazoActual[indice].cant <= 0) mazoActual.splice(indice, 1);
    }
    renderizarMazo();
    if (mostrandoSoloCarpeta) filtrarCartas(); // Actualiza galería si estamos viendo la carpeta
}

function toggleFavorito(id) {
    const indice = mazoActual.findIndex(item => item.id === id);
    if (indice > -1) {
        mazoActual[indice].favorito = !mazoActual[indice].favorito;
        renderizarMazo();
        if (mostrandoSoloFavoritos) filtrarCartas(); // Actualiza galería si estamos filtrando favoritos
    }
}

// ==========================================
// 6. RENDERIZADO DE LISTA DERECHA
// ==========================================
function renderizarMazo() {
    const container = document.getElementById('deck-list-container');
    if (!container) return;
    container.innerHTML = "";

    // La lista de la derecha siempre muestra lo de la carpeta, 
    // pero podemos filtrarla por favoritos también si el usuario lo desea
    const listaParaRenderizar = mostrandoSoloFavoritos 
        ? mazoActual.filter(item => item.favorito === true)
        : mazoActual;

    let tAliados = 0, tOros = 0, tOtros = 0, tTotal = 0;
    let tieneOroInicial = false;

    listaParaRenderizar.forEach(item => {
        const info = cartasMyL.find(c => c.ID === item.id);
        if (!info) return;

        tTotal += item.cant;
        const tipo = info.Tipo.toLowerCase();

        if (tipo.includes('aliado')) tAliados += item.cant;
        else if (tipo.includes('oro')) {
            tOros += item.cant;
            if (!info.Habilidad || info.Habilidad.length < 5) tieneOroInicial = true;
        } else {
            tOtros += item.cant;
        }

        const div = document.createElement('div');
        div.className = `deck-card-item ${item.favorito ? 'is-fav' : ''}`;
        
        const estrellaBtn = !esMazo ? `<button class="btn-fav-toggle" onclick="toggleFavorito('${item.id}')">${item.favorito ? '⭐' : '☆'}</button>` : '';
        const botonPlus = esMazo ? `<button class="btn-qty-control" onclick="añadirCarta('${item.id}')"> + </button>` : '';

        div.innerHTML = `
            <span class="deck-card-qty">${item.cant}x</span>
            <div class="deck-card-info">
                <strong>${info.Nombre}</strong>
                <small>${info.Tipo}</small>
            </div>
            ${estrellaBtn}
            <button class="btn-qty-control" onclick="quitarCarta('${item.id}')"> - </button>
            ${botonPlus}
        `;
        container.appendChild(div);
    });

    if (esMazo) {
        if(document.getElementById('total-cards')) document.getElementById('total-cards').innerText = tTotal;
        if(document.getElementById('total-aliados')) document.getElementById('total-aliados').innerText = tAliados;
        if(document.getElementById('total-oros')) document.getElementById('total-oros').innerText = tOros;
        if(document.getElementById('total-otros')) document.getElementById('total-otros').innerText = tOtros;

        const oroStatus = document.getElementById('status-oro-inicial');
        if (oroStatus) {
            oroStatus.innerText = tieneOroInicial ? "✅ ORO INICIAL PRESENTE" : "❌ FALTA ORO SIN HABILIDAD";
            oroStatus.style.color = tieneOroInicial ? "#d4af37" : "#ff4444";
        }
    }
}

// ==========================================
// 7. PERSISTENCIA Y REGLAS
// ==========================================
async function guardarMazoFirebase() {
    if (!usuarioActual || !slotId) return;
    try {
        await db.collection('usuarios').doc(usuarioActual.uid)
                .collection('slots').doc(slotId).set({
            cartas: mazoActual,
            config: configMazo,
            ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion(esMazo ? "Estrategia Forjada." : "Álbum Actualizado.", "🛡️");
        }
    } catch (e) { 
        console.error("Error al guardar:", e);
    }
}

function actualizarSetup() {
    configMazo.bloque = document.getElementById('select-bloque').value;
    configMazo.formato = document.getElementById('select-formato').value;
    configMazo.raza = document.getElementById('select-raza').value;
    const selectRaza = document.getElementById('select-raza');
    if (selectRaza) selectRaza.style.display = configMazo.formato.includes('racial') ? 'block' : 'none';
    filtrarCartas(); 
}

function setearValoresInterfaz() {
    if(document.getElementById('select-bloque')) document.getElementById('select-bloque').value = configMazo.bloque;
    if(document.getElementById('select-formato')) document.getElementById('select-formato').value = configMazo.formato;
    if(document.getElementById('select-raza')) {
        document.getElementById('select-raza').value = configMazo.raza;
        document.getElementById('select-raza').style.display = configMazo.formato.includes('racial') ? 'block' : 'none';
    }
}