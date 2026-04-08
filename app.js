let cartasMyL = []; 

const display = document.getElementById('card-display');
const count = document.getElementById('card-count');
const buscador = document.getElementById('main-search');
const panel = document.getElementById('card-detail-panel');

async function cargarGrimorio() {
    try {
        const respuesta = await fetch('cartas.json');
        if (!respuesta.ok) throw new Error("No se encontró el archivo cartas.json");
        cartasMyL = await respuesta.json();
        filtrarCartas();
    } catch (error) {
        console.error("Error:", error);
        display.innerHTML = `<div class="card-placeholder">Error al cargar el grimorio...</div>`;
    }
}

function filtrarCartas() {
    const texto = buscador.value.toLowerCase();
    const raza = document.getElementById('raza-filter').value.toLowerCase();
    
    // Capturar valores de los sliders
    const costeMax = parseInt(document.getElementById('filter-coste').value);
    const fuerzaMin = parseInt(document.getElementById('filter-fuerza').value);
    
    const ediciones = Array.from(document.querySelectorAll('.filter-group input[type="checkbox"]'))
        .filter(i => i.checked && ["espada-sagrada", "helenica", "hijos-daana"].includes(i.value))
        .map(i => i.value);

    const tipos = Array.from(document.querySelectorAll('.filter-group input[type="checkbox"]'))
        .filter(i => i.checked && ["aliado", "talisman", "totem", "oro"].includes(i.value))
        .map(i => i.value);
const resultado = cartasMyL.filter(c => {
        const matchTexto = c.Nombre.toLowerCase().includes(texto) || c.Habilidad.toLowerCase().includes(texto);
        const matchRaza = raza === "" || (c.Raza && c.Raza.toLowerCase() === raza);
        const matchEdicion = ediciones.length === 0 || ediciones.includes(c.Carpeta_Edicion.toLowerCase().replace('_', '-'));
        const matchTipo = tipos.length === 0 || tipos.includes(c.Tipo.toLowerCase());
        
        // --- FILTROS DE ESTADÍSTICAS (Versión Segura para carga masiva) ---
        
        // Si Coste es vacío "", lo tratamos como 0
        const numCoste = c.Coste === "" || c.Coste === undefined ? 0 : parseInt(c.Coste);
        const matchCoste = numCoste <= costeMax;

        // Para Fuerza: Solo filtramos si es Aliado. Si es vacío, es 0.
        const numFuerza = c.Fuerza === "" || c.Fuerza === undefined ? 0 : parseInt(c.Fuerza);
        const matchFuerza = (c.Tipo.toLowerCase() === 'aliado') ? numFuerza >= fuerzaMin : true;

        return matchTexto && matchRaza && matchEdicion && matchTipo && matchCoste && matchFuerza;
    });

    dibujarCartas(resultado);

function dibujarCartas(lista) {
    display.innerHTML = '';
    count.innerText = lista.length;

    if (lista.length === 0) {
        display.innerHTML = `<div class="card-placeholder">No se hallaron registros...</div>`;
        return;
    }

    lista.forEach(c => {
        const rutaImg = `img/cartas/${c.Bloque}/${c.Carpeta_Edicion}/${c.Imagen}`;
        const div = document.createElement('div');
        div.className = 'card-item';
        div.innerHTML = `<img src="${rutaImg}" alt="${c.Nombre}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x280?text=${c.ID}'">`;
        div.onclick = () => mostrarDetalle(c, rutaImg);
        display.appendChild(div);
    });
}
function mostrarDetalle(c, ruta) {
    document.getElementById('detail-img').src = ruta;
    document.getElementById('detail-name').innerText = c.Nombre;
    
    const stats = c.Tipo.toLowerCase() === 'aliado' ? ` | C:${c.Coste} F:${c.Fuerza}` : ` | C:${c.Coste}`;
    document.getElementById('detail-type').innerText = `${c.Tipo.toUpperCase()} ${c.Raza ? '- ' + c.Raza : ''}${stats}`;
    
    // Lógica de Cartas Relacionadas
    let sugHtml = "";
    if (c.Relacionadas && c.Relacionadas.trim() !== "") {
        sugHtml = `
            <div style="margin-top:20px; border-top:1px dashed #444; padding-top:15px;">
                <p style="color:var(--accent); font-size:0.8rem; font-weight:bold; margin-bottom:10px; text-transform:uppercase;">Sugerencias:</p>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
        `;
        
        c.Relacionadas.split(',').forEach(idBusqueda => {
            const idLimpio = idBusqueda.trim();
            const cartaRel = cartasMyL.find(item => item.ID === idLimpio);
            
            if (cartaRel) {
                sugHtml += `
                    <button onclick="irARelacionada('${cartaRel.ID}')" 
                            style="background:#222; border:1px solid var(--accent); color:#fff; padding:5px 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; transition:0.2s;"
                            onmouseover="this.style.background='var(--accent)'; this.style.color='#000';"
                            onmouseout="this.style.background='#222'; this.style.color='#fff';">
                        ${cartaRel.Nombre}
                    </button>
                `;
            }
        });
        
        sugHtml += `</div></div>`;
    }

    document.getElementById('detail-text').innerHTML = `
        <div style="font-style:italic; line-height:1.5;">${c.Hability || c.Habilidad}</div>
        ${sugHtml}
        <p style="margin-top:20px; color:#666; font-size:0.8rem;">Ilustrador: ${c.Ilustrador}</p>
    `;
    
    panel.classList.add('active');
}

// Función para saltar entre cartas
function irARelacionada(id) {
    const carta = cartasMyL.find(c => c.ID === id);
    if (carta) {
        const rutaImg = `img/cartas/${carta.Bloque}/${carta.Carpeta_Edicion}/${carta.Imagen}`;
        mostrarDetalle(carta, rutaImg);
    }
}

function verRelacionada(id) {
    const c = cartasMyL.find(card => card.ID === id);
    if (c) mostrarDetalle(c, `img/cartas/${c.Bloque}/${c.Carpeta_Edicion}/${c.Imagen}`);
}

function cartaAlAzar() {
    if (cartasMyL.length === 0) return;
    const c = cartasMyL[Math.floor(Math.random() * cartasMyL.length)];
    mostrarDetalle(c, `img/cartas/${c.Bloque}/${c.Carpeta_Edicion}/${c.Imagen}`);
}

// Listeners
buscador.addEventListener('input', filtrarCartas);
document.getElementById('raza-filter').addEventListener('change', filtrarCartas);
document.querySelectorAll('input[type="checkbox"]').forEach(i => i.addEventListener('change', filtrarCartas));
document.getElementById('filter-coste').addEventListener('input', (e) => {
    document.getElementById('val-coste').innerText = e.target.value;
    filtrarCartas();
});
document.getElementById('filter-fuerza').addEventListener('input', (e) => {
    document.getElementById('val-fuerza').innerText = e.target.value;
    filtrarCartas();
});
document.getElementById('close-detail').onclick = () => panel.classList.remove('active');

cargarGrimorio();
