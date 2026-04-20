/**
 * ANALIZADOR ESTRATÉGICO PRO - GRIMORIO DIGITAL
 * Receptor y renderizador de Estadísticas Avanzadas (Diseño Tactical Fidelity)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Escuchamos el evento que viene de estrategia.js
    window.addEventListener('mazoListoParaAnalisis', () => {
        ejecutarRenderizadoAnalisis();
    });

    // Ejecución inicial por si los datos ya están en memoria
    if (window.statsActuales) {
        ejecutarRenderizadoAnalisis();
    }
});

/**
 * CONTROLADOR DE VISTAS CENTRAL
 */
window.cambiarVista = function(nuevaVista) {
    const vistaBuilder = document.getElementById("vista-builder");
    const vistaStats = document.getElementById("vista-estadisticas-completas");

    if (nuevaVista === 'stats') {
        if (vistaBuilder) vistaBuilder.style.display = "none";
        if (vistaStats) {
            vistaStats.style.display = "flex";
            ejecutarRenderizadoAnalisis();
        }
        document.body.classList.add("modo-album"); 
        window.viewMode = "stats"; 
    } else {
        if (vistaStats) vistaStats.style.display = "none";
        if (vistaBuilder) vistaBuilder.style.display = "block";
        document.body.classList.remove("modo-album");
        window.viewMode = "builder";
        if (typeof renderizarMazo === 'function') renderizarMazo();
    }
};

function ejecutarRenderizadoAnalisis() {
    const s = window.statsActuales;
    if (!s || s.totalCastillo === 0) return;

    // 1. CARRUSEL Y CONTEO GLOBAL
    renderizarCarruselStats();
    setVal('full-total-count', `(${s.totalCastillo + (s.tieneOroIni ? 1 : 0)})`);

    // 2. WIDGET CONSISTENCIA
    const califConsistencia = s.promedioCopias >= 2.5 ? "ALTA" : (s.promedioCopias >= 1.8 ? "MEDIA" : "BAJA");
    setVal('res-consistencia-val', califConsistencia);
    
    const listConsistencia = document.getElementById('list-consistencia');
    if (listConsistencia) {
        listConsistencia.innerHTML = `
            <li><i class="check">${s.promedioCopias >= 2 ? '✔' : '✖'}</i> ${s.promedioCopias.toFixed(1)} copias promedio</li>
            <li><i class="check">${s.motorRobo >= 8 ? '✔' : '✖'}</i> Motor de robo: ${s.consistencia}</li>
            <li><i class="check">${s.curvaPromedio <= 2.8 ? '✔' : '✖'}</i> Curva balanceada</li>
        `;
    }

    // 3. WIDGET DEPENDENCIA
    setVal('res-dep-critica', s.mejorCarta.nombre || "Ninguna detectada");
    const txtDep = document.getElementById('txt-dependencia');
    if (txtDep) {
        txtDep.innerHTML = `
            Dependencia de aliados: ${s.aliados > 25 ? 'ALTA' : 'MEDIA'}<br>
            Dependencia de control: ${s.motorAnula > 8 ? 'ALTA' : 'BAJA'}<br>
            Sinergia de Raza: ${s.porcentajeSinergia}%
        `;
    }

    // 4. WIDGET PRESIÓN (BARRAS DINÁMICAS)
    actualizarBarraWidget('bar-presion-early', 'val-presion-early', s.presionEarlyPct);
    actualizarBarraWidget('bar-presion-mid', 'val-presion-mid', s.presionMidPct);
    actualizarBarraWidget('bar-presion-late', 'val-presion-late', s.presionLatePct);

    // 5. WIDGET BALANCE Y EFICIENCIA
    setVal('res-bal-aliados', `${s.aliados} (${s.aliados >= 18 ? 'OK' : 'BAJO'})`);
    setVal('res-bal-oros', `${s.orosMazo} (${s.orosMazo >= 14 ? 'OK' : 'ALERTA'})`);
    setVal('res-bal-otros', `${s.otros}`);
    setVal('res-coste-prom', s.curvaPromedio.toFixed(2));
    setVal('res-retorno-fuerza', s.promFuerza >= 3 ? "ALTO" : "ESTÁNDAR");

    // 6. WIDGET SINERGIA
    setVal('full-sinergia-pct', `% Gral: ${s.porcentajeSinergia}%`);
    const listSinergia = document.getElementById('list-sinergia-pro');
    if (listSinergia) {
        listSinergia.innerHTML = `
            <li><i class="check">✔</i> Núcleo ${s.razaDominante}</li>
            <li><i class="check">${s.porcentajeSinergia > 80 ? '✔' : '⚠'}</i> Fidelidad racial</li>
            <li><i class="check">✔</i> Impacto de ${s.mejorCarta.nombre}</li>
        `;
    }

    // 7. WIDGET RIESGOS (DIAGNÓSTICO)
    generarDiagnosticoPro(s);

    // 8. WIN CONDITION Y ARQUETIPO
    setVal('res-win-desc', s.winCondition);
    setVal('res-arquetipo-main', s.arquetipo);
    setVal('res-subtipo-val', `Subtipo: ${s.subtipo}`);

    // 9. PROBABILIDADES AVANZADAS
    setVal('prob-oro-t1', `${s.probOroT1}%`);
    setVal('prob-aliado-t1', `${s.probAliadoT1}%`);
    setVal('prob-ctrl-t3', `${s.probControlT3}%`);
    setVal('prob-key-t5', `${s.probKeyT5}%`);
}

/**
 * Genera la lista de riesgos con iconos dinámicos
 */
function generarDiagnosticoPro(s) {
    const container = document.getElementById('full-riesgos-list');
    if (!container) return;

    let riesgos = [];
    if (!s.tieneOroIni) riesgos.push({ tipo: 'error', txt: "Falta Oro Inicial" });
    if (s.orosMazo < 13) riesgos.push({ tipo: 'error', txt: "Oros insuficientes" });
    if (s.curvaPromedio > 3.0) riesgos.push({ tipo: 'error', txt: "Curva muy pesada" });
    if (s.motorRobo < 5) riesgos.push({ tipo: 'warning', txt: "Poco motor de robo" });
    if (s.aliados < 16) riesgos.push({ tipo: 'warning', txt: "Base de aliados débil" });

    if (riesgos.length === 0) {
        container.innerHTML = `<li><i class="check">✔</i> No se detectan riesgos críticos</li>`;
    } else {
        container.innerHTML = riesgos.map(r => `
            <li><i class="${r.tipo}">${r.tipo === 'error' ? '✖' : '⚠'}</i> ${r.txt}</li>
        `).join('');
    }
}

/**
 * Actualiza las barras de progreso del Dashboard
 */
function actualizarBarraWidget(barId, valId, porcentaje) {
    const bar = document.getElementById(barId);
    const txt = document.getElementById(valId);
    if (!bar || !txt) return;

    bar.style.width = `${porcentaje}%`;
    const label = porcentaje > 75 ? "ALTA" : (porcentaje > 40 ? "MEDIA" : "BAJA");
    txt.innerText = label;

    // Cambiar color de la clase
    bar.className = "bar-fill " + (porcentaje > 75 ? "green" : (porcentaje > 40 ? "yellow" : "red"));
}

function renderizarCarruselStats() {
    const contenedor = document.getElementById('stats-cartas-carousel');
    if (!contenedor) return;
    contenedor.innerHTML = "";

    const mazo = window.mazoActual || [];
    const catalogo = window.cartasMyL || [];

    mazo.forEach(item => {
        const c = catalogo.find(x => String(x.ID) === String(item.id));
        if (c) {
            const img = document.createElement('img');
            img.src = c.Imagen;
            img.title = `${c.Nombre} (x${item.cant})`;
            contenedor.appendChild(img);
        }
    });
}

// HELPERS
function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

window.salirModoStats = () => cambiarVista('builder');