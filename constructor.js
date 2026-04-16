// ==========================================
// 1. VARIABLES DE ESTADO Y REGLAS
// ==========================================
const BLOQUES = {
    "primera-era": ["el_reto", "mundo_gotico", "la_ira_del_nahual", "ragnarok", "espiritu_de_dragon"],
    "segunda-era": ["espada_sagrada", "helenica", "hijos_de_daana", "dominios_de_ra"]
};

let mazoActual = [];
let slotId = "";
let esMazo = false;
let faseOroInicial = true;
let configMazo = {
    bloque: "",
    formato: "",
    raza: ""
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

    esMazo = slotId.includes('mazo') || slotId.startsWith('copia_');

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            usuarioActual = user;
            await cargarDatosDelSlot();
            verificarYRenderizar();
        } else {
            window.location.href = 'index.html';
        }
    });

    document.getElementById('main-search')?.addEventListener('input', () => filtrarCartas());
    document.getElementById('tipo-filter')?.addEventListener('change', () => filtrarCartas());
    document.getElementById('raza-filter')?.addEventListener('change', () => filtrarCartas());
});

async function cargarDatosDelSlot() {
    try {
        const doc = await db.collection('usuarios').doc(usuarioActual.uid)
            .collection('slots').doc(slotId).get();

        if (doc.exists) {
            const data = doc.data();
            mazoActual = data.cartas || [];
            configMazo = data.config || { bloque: "", formato: "", raza: "" };

            const displayNombre = document.getElementById('slot-id-display');
            if (displayNombre) {
                const nombreLimpio = (data.nombre || "ESTRATEGIA").replace("COPIA:", "").trim().toUpperCase();
                if (slotId.startsWith('copia_')) {
                    const autor = (data.autorOriginal || "INVOCADOR").toUpperCase();
                    displayNombre.innerHTML = `MODO: <span style="color:var(--accent);">${nombreLimpio}</span> | DE: ${autor}`;
                } else {
                    displayNombre.innerHTML = `MODO: <span style="color:var(--accent);">${nombreLimpio}</span>`;
                }
            }

            setearValoresInterfaz();

            if (mazoActual.length > 0 || slotId.startsWith('copia_')) {
                liberarVistaMazoExistente();
            } else {
                actualizarSetup(true);
            }
        }
        renderizarMazo();
    } catch (e) {
        console.error("Error en conexión astral:", e);
    }
}

function verificarYRenderizar() {
    const reintento = setInterval(() => {
        if (typeof cartasMyL !== 'undefined' && cartasMyL.length > 0) {
            clearInterval(reintento);
            filtrarCartas();
            renderizarMazo();
        }
    }, 500);
}

// ==========================================
// 3. FLUJO DE REGLAS (CORRECCIÓN DE BLOQUEO)
// ==========================================
function actualizarSetup(esCargaInicial = false) {
    const selBloque = document.getElementById('select-bloque');
    const selFormato = document.getElementById('select-formato');
    const selRaza = document.getElementById('select-raza');
    const overlay = document.getElementById('lock-overlay');
    const sidebar = document.querySelector('.sidebar');

    if (!selBloque) return;

    if (!esCargaInicial && event && event.target.id === 'select-bloque') {
        selFormato.value = "";
        selRaza.value = "";
        configMazo.formato = "";
        configMazo.raza = "";
    }

    configMazo.bloque = selBloque.value;
    configMazo.formato = selFormato.value;
    configMazo.raza = selRaza.value;

    if (configMazo.bloque !== "") {
        selFormato.style.display = "inline-block";
    } else {
        selFormato.style.display = "none";
        selRaza.style.display = "none";
        bloquearSelectores(false);
        return;
    }

    if (configMazo.formato !== "") {
        if (configMazo.formato.includes('racial')) {
            selRaza.style.display = "inline-block";
        } else {
            selRaza.style.display = "none";
            configMazo.raza = "";
        }
    } else {
        selRaza.style.display = "none";
        return;
    }

    const requiereRaza = configMazo.formato.includes('racial');
    const bloqueOK = configMazo.bloque !== "";
    const formatoOK = configMazo.formato !== "";
    const razaOK = requiereRaza ? configMazo.raza !== "" : true;

    if (bloqueOK && formatoOK && razaOK) {
        bloquearSelectores(true);
        if (overlay) overlay.classList.add('unlocked');
        if (sidebar) sidebar.style.display = "block";

        const tieneOroIni = mazoActual.some(item => {
            const c = cartasMyL.find(x => x.ID === item.id);
            return c && c.Tipo.includes('Oro') && (!c.Habilidad || c.Habilidad.length < 5);
        });
        faseOroInicial = !tieneOroIni;
        filtrarCartas();
    } else {
        if (overlay) overlay.classList.remove('unlocked');
        if (sidebar) sidebar.style.display = "none";
    }
}

function bloquearSelectores(bloquear) {
    const contenedor = document.getElementById('setup-mazo');
    const instruction = document.getElementById('setup-instruction');
    const selectores = contenedor.querySelectorAll('select');
    const controlsRow = contenedor.querySelector('.setup-controls-row');
    const oldBtn = document.getElementById('btn-reset-rules');
    const oldResumen = document.getElementById('resumen-reglas');

    if (oldBtn) oldBtn.remove();
    if (oldResumen) oldResumen.remove();

    if (bloquear) {
        selectores.forEach(sel => sel.style.display = 'none');
        if (instruction) instruction.innerText = "SELLO DEL REINO ROTO - CARTAS LIBERADAS";

        const resumen = document.createElement('span');
        resumen.id = 'resumen-reglas';
        const txtBloque = configMazo.bloque.replace(/-/g, ' ');
        const txtRaza = configMazo.raza ? ` | ${configMazo.raza}` : '';
        resumen.innerText = `${txtBloque} | ${configMazo.formato}${txtRaza}`;
        resumen.style.color = 'var(--accent)';
        resumen.style.marginRight = '15px';
        resumen.style.paddingLeft = '15px';
        resumen.style.borderLeft = '2px solid var(--accent)';
        resumen.style.fontWeight = 'bold';
        resumen.style.textTransform = 'uppercase';
        resumen.style.fontFamily = "'Cinzel', serif";
        if (controlsRow) controlsRow.appendChild(resumen);

        const btnReset = document.createElement('button');
        btnReset.id = 'btn-reset-rules';
        btnReset.innerHTML = '<span>🔄</span> CAMBIAR REGLAS';
        btnReset.className = 'btn-cambiar-reglas';
        btnReset.onclick = resetearReglas;
        if (controlsRow) controlsRow.appendChild(btnReset);
    } else {
        if (instruction) instruction.innerText = "ESTABLECE LAS REGLAS DEL REINO PARA DESBLOQUEAR EL GRIMORIO";
        const b = document.getElementById('select-bloque');
        if (b) b.style.display = 'inline-block';
    }
}

function resetearReglas() {
    if (mazoActual.length > 0) {
        if (!confirm("Si cambias las reglas podrías invalidar las cartas ya elegidas. ¿Continuar?")) return;
    }
    configMazo = { bloque: "", formato: "", raza: "" };
    document.getElementById('select-bloque').value = "";
    document.getElementById('select-formato').value = "";
    document.getElementById('select-raza').value = "";
    bloquearSelectores(false);
    actualizarSetup(false);
}

// ==========================================
// 4. FILTRADO
// ==========================================
function filtrarCartas() {
    const display = document.getElementById('card-display');
    const sidebar = document.querySelector('.sidebar');
    if (!display || !cartasMyL || !configMazo.bloque) return;

    const edicionesPermitidas = BLOQUES[configMazo.bloque].map(e => e.toLowerCase().trim());
    let fuente = cartasMyL.filter(c => {
        const edicionNorm = (c.Carpeta_Edicion || "").toLowerCase().trim();
        return edicionesPermitidas.includes(edicionNorm);
    });

    if (faseOroInicial) {
        if (sidebar) {
            sidebar.classList.add('sidebar-hidden');
            sidebar.style.display = "none";
        }
        fuente = fuente.filter(c => {
            const tipo = (c.Tipo || "").toLowerCase();
            const habilidad = (c.Habilidad || "").trim().toLowerCase();
            const esOro = tipo.includes('oro');
            const sinHabilidadReal = habilidad === "" || habilidad === "-" || habilidad === "sin habilidad" || habilidad.length < 12;
            return esOro && sinHabilidadReal;
        });
        if (fuente.length === 0) {
            display.innerHTML = `<div class="lock-message" style="position:static; color: #ff6666; border:none;">NO SE ENCONTRARON OROS INICIALES LEGALES EN ESTE BLOQUE.</div>`;
            return;
        }
        mostrarNotificacion("ETAPA 1: ELIGE TU ORO INICIAL", "👑");
    } else {
        if (sidebar) {
            sidebar.classList.remove('sidebar-hidden');
            sidebar.style.display = "block";
            sidebar.style.visibility = "visible";
        }
        const busqueda = (document.getElementById('main-search')?.value || "").toLowerCase();
        const tipoFiltro = document.getElementById('tipo-filter')?.value || "";
        fuente = fuente.filter(c => {
            if (configMazo.formato.includes('racial') && (c.Tipo || "").includes('Aliado')) {
                if (c.Raza !== configMazo.raza) return false;
            }
            if (tipoFiltro && !(c.Tipo || "").includes(tipoFiltro)) return false;
            const nombre = (c.Nombre || "").toLowerCase();
            const hab = (c.Habilidad || "").toLowerCase();
            return nombre.includes(busqueda) || hab.includes(busqueda);
        });
    }
    dibujarCartasConstructor(fuente);
}

function dibujarCartasConstructor(lista) {
    const display = document.getElementById('card-display');
    display.innerHTML = "";
    lista.forEach(c => {
        const rutaImg = `img/cartas/${c.Bloque}/${c.Carpeta_Edicion}/${c.Imagen}`;
        const div = document.createElement('div');
        div.className = "card-item";
        div.innerHTML = `<img src="${rutaImg}" alt="${c.Nombre}" loading="lazy">`;
        div.onclick = () => añadirCarta(c.ID);
        display.appendChild(div);
    });
}

// ==========================================
// 5. ACCIONES
// ==========================================
function añadirCarta(id) {
    const carta = cartasMyL.find(c => c.ID === id);
    if (!carta) return;

    if (faseOroInicial) {
        mazoActual.push({ id: id, cant: 1, favorito: false });
        faseOroInicial = false;
        mostrarNotificacion("ORO INICIAL REGISTRADO. BUSCADOR LIBERADO.", "⚔️");
        filtrarCartas();
    } else {
        let tieneOroYa = false;
        const totalCastilloActual = mazoActual.reduce((acc, item) => {
            const infoC = cartasMyL.find(c => c.ID === item.id);
            if (!infoC) return acc;
            const textoHab = (infoC.Habilidad || "").trim();
            const esOroBasico = infoC.Tipo.toLowerCase().includes('oro') && textoHab.length < 30;
            if (esOroBasico && !tieneOroYa) {
                tieneOroYa = true;
                return acc + (item.cant - 1);
            }
            return acc + item.cant;
        }, 0);

        if (totalCastilloActual >= 49) {
            mostrarNotificacion("ESTRATEGIA COMPLETA (50 CARTAS).", "✅");
            return;
        }

        const itemEnMazo = mazoActual.find(item => item.id === id);
        if (itemEnMazo) {
            const hab = (carta.Habilidad || "").toLowerCase();
            if (hab.includes("única") || hab.includes("unica")) {
                mostrarNotificacion("ESTA CARTA ES ÚNICA.", "⚠️");
                return;
            }
            const tipoLower = (carta.Tipo || "").toLowerCase();
            if (!hab.includes("mercenario") && !tipoLower.includes("oro") && itemEnMazo.cant >= 3) {
                mostrarNotificacion("MÁXIMO 3 COPIAS POR CARTA.", "⚠️");
                return;
            }
            itemEnMazo.cant++;
        } else {
            mazoActual.push({ id: id, cant: 1, favorito: false });
        }
    }
    renderizarMazo();
}

function renderizarMazo() {
    const container = document.getElementById('deck-list-container');
    if (!container) return;
    container.innerHTML = "";

    let totalCastillo = 0;
    let tieneOroIni = false;
    let nombreOroIni = "FALTA";
    let countAliados = 0, countOrosMazo = 0, countOtros = 0;
    let costes = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    let sumaFuerza = 0, cuentaFuerza = 0;
    let razasMap = {};
    let motorRobo = 0, motorAnula = 0;

    mazoActual.forEach(item => {
        const info = cartasMyL.find(c => c.ID === item.id);
        if (!info) return;

        const textoHabilidad = (info.Habilidad || "").trim();
        const habLower = textoHabilidad.toLowerCase();
        const tipo = (info.Tipo || "").toLowerCase();
        const esOro = tipo.includes('oro');

        for (let i = 0; i < item.cant; i++) {
            if (esOro && !tieneOroIni && (textoHabilidad === "" || textoHabilidad === "-" || textoHabilidad.length < 30)) {
                tieneOroIni = true;
                nombreOroIni = info.Nombre;
            } else {
                totalCastillo++;
                if (tipo.includes('aliado')) {
                    countAliados++;
                    sumaFuerza += (parseInt(info.Fuerza) || 0);
                    cuentaFuerza++;
                    if (info.Raza) {
                        const r = info.Raza.trim();
                        razasMap[r] = (razasMap[r] || 0) + 1;
                    }
                } else if (esOro) {
                    countOrosMazo++;
                } else {
                    countOtros++;
                }
                if (habLower.includes("roba") || habLower.includes("busca") || habLower.includes("mira") || habLower.includes("mazo castillo")) motorRobo++;
                if (habLower.includes("anula") || habLower.includes("destruye") || habLower.includes("destierra")) motorAnula++;
                if (!esOro) {
                    let c = parseInt(info.Coste) || 0;
                    if (c > 4) c = 4;
                    costes[c]++;
                }
            }
        }

        const rutaImg = `img/cartas/${info.Bloque}/${info.Carpeta_Edicion}/${info.Imagen}`;
        const div = document.createElement('div');
        div.className = "deck-card-item";
        div.innerHTML = `
            <div class="mini-preview" style="background-image: url('${rutaImg}')"></div>
            <span class="deck-card-qty">${item.cant}x</span>
            <div class="deck-card-info"><strong>${info.Nombre}</strong></div>
            <button class="btn-qty-control" onclick="quitarCarta('${info.ID}')">-</button>
        `;
        container.appendChild(div);
    });

    const elStatOroIni = document.getElementById('stat-oro-ini');
    if (elStatOroIni) {
        elStatOroIni.innerText = tieneOroIni ? "SÍ" : "NO";
        elStatOroIni.style.color = tieneOroIni ? "#f7ef8a" : "#ff6666";
    }

    document.getElementById('total-aliados').innerText = countAliados;
    document.getElementById('total-oros').innerText = countOrosMazo;
    document.getElementById('total-otros').innerText = countOtros;

    const sumaTotalReal = countAliados + countOrosMazo + countOtros + (tieneOroIni ? 1 : 0);
    const elTotalCards = document.getElementById('total-cards');
    if (elTotalCards) {
        elTotalCards.innerText = `${sumaTotalReal} / 50`;
        elTotalCards.style.color = (sumaTotalReal >= 50) ? "#f7ef8a" : "#fff";
    }

    document.getElementById('fuerza-promedio').innerText = cuentaFuerza > 0 ? (sumaFuerza / cuentaFuerza).toFixed(1) : "0";
    document.getElementById('stat-robo').innerText = motorRobo;
    document.getElementById('stat-anula').innerText = motorAnula;

    let maxRaza = "NINGUNA", maxVal = 0;
    for (let r in razasMap) { if(razasMap[r] > maxVal) { maxVal = razasMap[r]; maxRaza = r; } }
    document.getElementById('raza-predominante').innerText = maxRaza.toUpperCase();

    for (let i = 0; i <= 4; i++) {
        const barra = document.getElementById(`bar-${i}`);
        if (barra) {
            const porcentaje = totalCastillo > 0 ? (costes[i] / totalCastillo) * 200 : 0;
            barra.style.height = `${Math.min(porcentaje, 100)}%`;
        }
    }

    let arquetipo = "ANALIZANDO...";
    if (totalCastillo > 10) {
        if (countAliados > 22) arquetipo = "AGRESIVO (AGGRO)";
        else if (motorAnula > 7 || countOtros > 18) arquetipo = "CONTROL / LENTITUD";
        else arquetipo = "MID-RANGE / EQUILIBRADO";
    }
    document.getElementById('arquetipo-sugerido').innerText = arquetipo;

    const oroStatus = document.getElementById('status-oro-inicial');
    if (oroStatus) {
        if (tieneOroIni) {
            oroStatus.innerText = (sumaTotalReal >= 50) ? "✅ ESTRATEGIA COMPLETA" : `🛡️ ORO INICIAL: ${nombreOroIni}`;
            oroStatus.style.background = "rgba(212, 175, 55, 0.2)";
            oroStatus.style.color = "#f7ef8a";
        } else {
            oroStatus.innerText = "❌ FALTA ORO SIN HABILIDAD";
            oroStatus.style.background = "rgba(255, 0, 0, 0.1)";
            oroStatus.style.color = "#ff6666";
        }
    }
}

function quitarCarta(id) {
    const indice = mazoActual.findIndex(item => item.id === id);
    if (indice > -1) {
        const info = cartasMyL.find(c => c.ID === id);
        if (!info) return;
        const textoHabilidad = (info.Habilidad || "").trim();
        const esOroIniPotencial = info.Tipo.toLowerCase().includes('oro') && textoHabilidad.length < 30;

        if (esOroIniPotencial && !faseOroInicial) {
            faseOroInicial = true;
            const buscadorInput = document.getElementById('main-search');
            if (buscadorInput) buscadorInput.value = "";
            mostrarNotificacion("ORO INICIAL ELIMINADO. SE REQUIERE UNO NUEVO.", "⚠️");
        }

        mazoActual[indice].cant--;
        if (mazoActual[indice].cant <= 0) {
            mazoActual.splice(indice, 1);
        }

        if (faseOroInicial) {
            filtrarCartas();
        }
        renderizarMazo();
    }
}

function setearValoresInterfaz() {
    const b = document.getElementById('select-bloque');
    const f = document.getElementById('select-formato');
    const r = document.getElementById('select-raza');
    if (b) b.value = configMazo.bloque || "";
    if (f) f.value = configMazo.formato || "";
    if (r) r.value = configMazo.raza || "";
}

function liberarVistaMazoExistente() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('lock-overlay');

    if (sidebar) {
        sidebar.style.display = "block";
        sidebar.classList.remove('sidebar-hidden');
        sidebar.style.visibility = "visible";
        sidebar.style.opacity = "1";
        sidebar.style.width = "320px";
    }
    if (overlay) overlay.classList.add('unlocked');

    bloquearSelectores(true);

    const tieneOroIni = mazoActual.some(item => {
        const c = cartasMyL.find(x => x.ID === item.id);
        const textoHab = (c?.Habilidad || "").trim();
        return c && c.Tipo.toLowerCase().includes('oro') && textoHab.length < 30;
    });

    faseOroInicial = !tieneOroIni;
    filtrarCartas();
}

function mostrarNotificacion(mensaje, icono = "⚠️") {
    const notificacionesActivas = document.querySelectorAll('.notificacion-toast');
    for (let n of notificacionesActivas) {
        if (n.innerText.includes(mensaje)) return;
    }

    let container = document.getElementById('notif-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notif-container';
        container.style.cssText = "position: fixed; bottom: 20px; left: 20px; z-index: 9999; display: flex; flex-direction: column-reverse; gap: 10px;";
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'notificacion-toast';
    toast.innerHTML = `<span>${icono}</span> ${mensaje}`;
    toast.style.cssText = `
        background: rgba(0, 0, 0, 0.95);
        color: #fff;
        padding: 12px 20px;
        border-radius: 4px;
        border-left: 4px solid #d4af37;
        font-family: 'Cinzel', serif;
        font-size: 0.8rem;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        border: 1px solid rgba(212, 175, 55, 0.3);
        transition: all 0.3s ease;
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(-20px)";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function guardarMazoFirebase() {
    if (!usuarioActual) {
        mostrarNotificacion("DEBES INICIAR SESIÓN PARA GUARDAR", "🚫");
        return;
    }
    if (mazoActual.length === 0) {
        mostrarNotificacion("EL MAZO ESTÁ VACÍO", "⚠️");
        return;
    }

    const tieneOroIni = mazoActual.some(item => {
        const c = cartasMyL.find(x => x.ID === item.id);
        const textoHab = (c?.Habilidad || "").trim();
        return c && c.Tipo.toLowerCase().includes('oro') && textoHab.length < 30;
    });

    if (!tieneOroIni) {
        mostrarNotificacion("FALTA ELEGIR EL ORO INICIAL", "⚠️");
        return;
    }

    try {
        const btn = document.querySelector('.btn-save-deck');
        const originalText = btn ? btn.innerText : "GUARDAR CAMBIOS";
        if (btn) btn.innerText = "GUARDANDO EN EL REINO...";

        await db.collection('usuarios').doc(usuarioActual.uid)
            .collection('slots').doc(slotId).set({
                cartas: mazoActual,
                config: configMazo,
                ultimaModificacion: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

        if (btn) btn.innerText = originalText;
        mostrarNotificacion("ESTRATEGIA GUARDADA EN EL GRIMORIO", "⭐");
    } catch (error) {
        console.error("Error al guardar mazo:", error);
        mostrarNotificacion("ERROR AL CONECTAR CON EL REINO", "❌");
    }
}