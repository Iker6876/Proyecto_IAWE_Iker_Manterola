/* blockchain.js — historial de bloques y resumen de un bloque concreto */

const POR_PAGINA = 20;
let proxima;   // siguiente altura (en orden descendente) que falta por cargar

const filaBloque = b => `<tr class="clic" data-h="${b.height}" tabindex="0">
  <td>${num(b.height)}</td>
  <td class="mono">${esc(corto(b.blockhash, 16))}</td>
  <td>${fecha(b.time)}</td>
  <td class="r">${num(b.txs)}</td>
  <td class="r">${bytes(b.total_size)}</td></tr>`;

async function cargarMas() {
  const boton = $("#mas");
  boton.disabled = true;
  try {
    if (proxima === undefined) proxima = await rpc("getblockcount");
    const alturas = [];
    for (let h = proxima; h > proxima - POR_PAGINA && h >= 0; h--) alturas.push(h);
    const bloques = await rpcLote(alturas.map(h => ["getblockstats", [h, ["height", "blockhash", "time", "txs", "total_size"]]]));
    $("#lista").insertAdjacentHTML("beforeend", bloques.filter(Boolean).map(filaBloque).join(""));
    proxima -= alturas.length;
    boton.hidden = proxima < 0;
    resaltar();
  } catch (e) {
    $("#lista").insertAdjacentHTML("beforeend", `<tr><td colspan="5">Error al leer bloques: ${esc(e.message)}</td></tr>`);
  }
  boton.disabled = false;
  marcarEstado();
}

function resaltar(altura) {
  document.querySelectorAll("#lista tr.sel").forEach(t => t.classList.remove("sel"));
  if (altura != null) { const t = $(`#lista tr[data-h="${altura}"]`); if (t) t.classList.add("sel"); }
}

async function mostrarResumen() {
  const id = decodeURIComponent(location.hash.slice(1));
  const caja = $("#resumen");
  if (!id) { caja.hidden = true; resaltar(); return; }

  caja.hidden = false;
  caja.innerHTML = `<p class="nota">Cargando bloque…</p>`;
  try {
    const hash = /^\d+$/.test(id) ? await rpc("getblockhash", [Number(id)]) : id;
    const b = await rpc("getblock", [hash, 1]);
    resaltar(b.height);
    caja.innerHTML = `
      <h2>Resumen del bloque ${num(b.height)}</h2>
      <dl class="detalle">
        ${fila("Número del bloque", num(b.height))}
        ${fila("Hash del bloque", `<span class="mono">${esc(b.hash)}</span>`)}
        ${fila("Fecha", fecha(b.time))}
        ${fila("Tamaño", `${bytes(b.size)} (${num(b.size)} bytes)`)}
        ${fila("Peso", num(b.weight) + " WU")}
        ${fila("Cantidad de transacciones", num(b.nTx))}
        ${fila("Confirmaciones", num(b.confirmations))}
        ${fila("Dificultad", (b.difficulty / 1e12).toFixed(2) + " T")}
        ${fila("Versión", "0x" + Number(b.version).toString(16).padStart(8, "0"))}
        ${fila("Nonce", num(b.nonce))}
        ${fila("Merkle root", `<span class="mono">${esc(b.merkleroot)}</span>`)}
        ${fila("Hash del bloque anterior", b.previousblockhash ? `<a class="mono" href="#${esc(b.previousblockhash)}">${esc(b.previousblockhash)}</a>` : "Bloque génesis")}
      </dl>
      <div class="acciones">
        <a class="boton primario" href="transacciones.html?bloque=${esc(b.hash)}">Ver las ${num(b.nTx)} transacciones</a>
        ${b.previousblockhash ? `<a class="boton" href="#${esc(b.previousblockhash)}">← Bloque anterior</a>` : ""}
        ${b.nextblockhash ? `<a class="boton" href="#${esc(b.nextblockhash)}">Bloque siguiente →</a>` : ""}
        <a class="boton" href="#" onclick="location.hash='';return false">Cerrar</a>
      </div>`;
    caja.scrollIntoView({block: "start"});
  } catch (e) {
    caja.innerHTML = `<div class="alerta error">No se encontró el bloque «${esc(id)}»: ${esc(e.message)}</div>`;
  }
  marcarEstado();
}

/* Pulsar (o Enter sobre) una fila abre el resumen de ese bloque */
$("#lista").addEventListener("click", e => { const tr = e.target.closest("tr[data-h]"); if (tr) location.hash = tr.dataset.h; });
$("#lista").addEventListener("keydown", e => { if (e.key === "Enter") { const tr = e.target.closest("tr[data-h]"); if (tr) location.hash = tr.dataset.h; } });
$("#mas").addEventListener("click", cargarMas);
addEventListener("hashchange", mostrarResumen);

cargarMas();
mostrarResumen();
