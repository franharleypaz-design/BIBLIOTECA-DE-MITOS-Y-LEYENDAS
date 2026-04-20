/**
 * COMPONENTE DE ANÁLISIS DE ESTRATEGIA - Mitos y Leyendas
 * Gestiona el procesamiento de datos y la actualización de los paneles visuales.
 * Versión: Unificada Pro (Nivel 1: Tarjeta / Nivel 2: Dashboard Avanzado Tactical)
 */

function renderizarMazo() {
    // 1. REFORZAR ACCESO A VARIABLES GLOBALES
    const mazo = window.mazoActual || (typeof mazoActual !== 'undefined' ? mazoActual : []);
    const catalogo = window.cartasMyL || (typeof cartasMyL !== 'undefined' ? cartasMyL : []);

    if (catalogo.length === 0) {
        console.warn("Análisis de Estrategia: Esperando catálogo de cartas...");
        return;
    }

    // 2. ESTRUCTURA DE DATOS UNIFICADA PRO
    let stats = {
        totalCastillo: 0,
        tieneOroIni: false,
        nombreOroIni: "FALTA",
        aliados: 0,
        orosMazo: 0,
        otros: 0, 
        sumaFuerza: 0,
        cuentaFuerza: 0,
        motorRobo: 0,
        motorAnula: 0,
        costes: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
        razasMap: {},
        mejorCarta: { nombre: "Ninguna", impacto: 0, sinergia: 0 },
        // Nuevas métricas Pro
        presionEarly: 0,
        presionMid: 0,
        presionLate: 0,
        conteoCopias: {},
        totalItemsMazo: 0 // Para promedios de copias
    };

    // 3. CÁLCULOS LÓGICOS (MOTOR CENTRAL)
    mazo.forEach((item) => {
        const info = catalogo.find(c => String(c.ID) === String(item.id));
        if (!info) return;

        const habilidad = (info.Habilidad || "").toLowerCase();
        const tipo = (info.Tipo || "").toLowerCase();
        const coste = parseInt(info.Coste) || 0;
        const fuerza = parseInt(info.Fuerza) || 0;

        stats.conteoCopias[info.ID] = item.cant;
        stats.totalItemsMazo++;

        for (let i = 0; i < item.cant; i++) {
            // Lógica Oro Inicial
            if (tipo.includes('oro') && !stats.tieneOroIni && habilidad.length < 30) {
                stats.tieneOroIni = true;
                stats.nombreOroIni = info.Nombre;
            } else {
                stats.totalCastillo++;

                if (tipo.includes('aliado')) {
                    stats.aliados++;
                    stats.sumaFuerza += fuerza;
                    stats.cuentaFuerza++;
                    
                    // Presión por fases
                    if (coste <= 2) stats.presionEarly += (fuerza > 0 ? fuerza : 1);
                    else if (coste <= 4) stats.presionMid += (fuerza > 0 ? fuerza : 1);
                    else stats.presionLate += (fuerza > 0 ? fuerza : 1);

                    if (info.Raza) {
                        const r = info.Raza.trim();
                        stats.razasMap[r] = (stats.razasMap[r] || 0) + 1;
                    }
                } else if (tipo.includes('oro')) {
                    stats.orosMazo++;
                } else {
                    stats.otros++;
                }

                // Detección de Motores
                if (/roba|busca|mira|mano/i.test(habilidad)) stats.motorRobo++;
                if (/anula|destruye|destierra|cancela/i.test(habilidad)) stats.motorAnula++;
                
                // Curva de oro
                if (!tipo.includes('oro')) {
                    stats.costes[coste >= 4 ? 4 : coste]++;
                }

                // Cálculo de Carta Clave
                let impactoPotencial = (fuerza * 2) + (habilidad.length / 10);
                if (impactoPotencial > stats.mejorCarta.impacto && !tipo.includes('oro')) {
                    stats.mejorCarta = { 
                        nombre: info.Nombre, 
                        impacto: impactoPotencial.toFixed(0),
                        sinergia: item.cant * 10
                    };
                }
            }
        }
    });

    // ==========================================
    // ⚙️ EXTENSIÓN DE MÉTRICAS AVANZADAS PRO
    // ==========================================
    const totalFinal = stats.totalCastillo + (stats.tieneOroIni ? 1 : 0);
    const promFuerza = stats.cuentaFuerza > 0 ? (stats.sumaFuerza / stats.cuentaFuerza) : 0;
    stats.promFuerza = promFuerza;

    // Cálculo Curva
    let sumaCostes = 0;
    let totalParaCurva = stats.totalCastillo - stats.orosMazo;
    for (let i = 0; i <= 4; i++) sumaCostes += (stats.costes[i] * i);
    const avgCurva = totalParaCurva > 0 ? (sumaCostes / totalParaCurva) : 0;
    stats.curvaPromedio = avgCurva;

    // Consistencia (Promedio de copias)
    let sumaCopias = 0;
    Object.values(stats.conteoCopias).forEach(v => sumaCopias += v);
    stats.promedioCopias = stats.totalItemsMazo > 0 ? (sumaCopias / stats.totalItemsMazo) : 0;

    // Raza Dominante
    let maxRaza = "NINGUNA", maxVal = 0;
    for (let r in stats.razasMap) {
        if(stats.razasMap[r] > maxVal) { maxVal = stats.razasMap[r]; maxRaza = r; }
    }
    stats.razaDominante = maxRaza;
    stats.porcentajeSinergia = stats.aliados > 0 ? Math.round((maxVal / stats.aliados) * 100) : 0;

    // Lógica de Presión % (Normalización)
    stats.presionEarlyPct = Math.min((stats.presionEarly / 15) * 100, 100);
    stats.presionMidPct = Math.min((stats.presionMid / 20) * 100, 100);
    stats.presionLatePct = Math.min((stats.presionLate / 20) * 100, 100);

    // Probabilidades (Cálculos aproximados Mano Inicial 8 cartas)
    const calcularProb = (cantidad, mazoSize) => {
        if (cantidad <= 0) return 0;
        let prob = 1 - (combinations(mazoSize - cantidad, 8) / combinations(mazoSize, 8));
        return Math.round(prob * 100);
    };
    
    stats.probOroT1 = calcularProb(stats.orosMazo + (stats.tieneOroIni ? 1 : 0), 50);
    stats.probAliadoT1 = calcularProb(stats.aliados, 50);
    stats.probControlT3 = calcularProb(stats.motorAnula, 50); // Simplificado
    stats.probKeyT5 = calcularProb(3, 50); // Asumiendo 3 copias de carta clave

    // ==========================================
    // 🗂️ ACTUALIZACIÓN TARJETA (NIVEL 1)
    // ==========================================
    setDOMText('total-aliados', stats.aliados);
    setDOMText('total-oros', stats.orosMazo);
    setDOMText('total-otros', stats.otros);
    setDOMText('total-cards', `${totalFinal} / 50 CARTAS`, totalFinal > 50 ? "#ff6666" : "#d4af37");
    setDOMText('fuerza-val', promFuerza.toFixed(1));
    setDOMText('curva-promedio', avgCurva.toFixed(2));
    setDOMText('raza-nombre', stats.razaDominante.toUpperCase());
    setDOMText('sinergia-porcentaje', `${stats.porcentajeSinergia}%`);

    for (let i = 0; i <= 4; i++) {
        const barra = document.getElementById(`bar-${i}`);
        if (barra) {
            const percBarra = totalParaCurva > 0 ? (stats.costes[i] / totalParaCurva) * 100 : 0;
            barra.style.height = `${Math.max(percBarra, 2)}%`;
        }
    }

    // ==========================================
    // 🎯 SINCRONIZACIÓN NIVEL 2 (ANALIZADOR)
    // ==========================================
    window.statsActuales = stats;
    actualizarDashboardAvanzado(stats, totalFinal, maxRaza, maxVal, avgCurva);
    window.dispatchEvent(new CustomEvent('mazoListoParaAnalisis'));
}

/**
 * LÓGICA DE INTERPRETACIÓN PARA DASHBOARD PRO
 */
function actualizarDashboardAvanzado(s, total, maxRaza, maxVal, avg) {
    let arq = "ESTRATEGIA EQUILIBRADA";
    let sub = "Versatilidad en mesa";
    let winCond = "Control de campo y remate progresivo.";

    if (total >= 10) {
        if (s.aliados > 24 && avg < 2.3) { 
            arq = "AGRESIVO (SWARM)"; 
            sub = "Presión Temprana"; 
            winCond = "Victoria rápida por superioridad numérica de aliados.";
        }
        else if (s.motorAnula > 8) { 
            arq = "CONTROL MÍSTICO"; 
            sub = "Desgaste y Negación"; 
            winCond = "Agotar recursos del oponente y cerrar en Late Game.";
        }
        else if (s.motorRobo > 10) { 
            arq = "COMBO / TEMPO"; 
            sub = "Ciclo de Mazo"; 
            winCond = "Búsqueda acelerada de piezas clave para combo definitivo.";
        }
        else if (s.porcentajeSinergia > 70) { 
            arq = `MIDRANGE RACIAL`; 
            sub = `Sinergia ${maxRaza}`; 
            winCond = `Potenciación masiva basada en habilidades de raza ${maxRaza}.`;
        }
    }

    s.arquetipo = arq;
    s.subtipo = sub;
    s.winCondition = winCond;

    setDOMText('estrategia-tipo', arq);
    setDOMText('estrategia-dominio', avg <= 2.2 ? "EARLY GAME" : (avg <= 2.8 ? "MID GAME" : "LATE GAME"));
}

// Helpers Matemáticos
function combinations(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k;
    let res = 1;
    for (let i = 1; i <= k; i++) res = res * (n - i + 1) / i;
    return res;
}

function setDOMText(id, text, color = null) {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = text;
        if (color) el.style.color = color;
    }
}