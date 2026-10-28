/* transacciones.js — todas las transacciones de un bloque concreto */

const POR_PAGINA = 50;
let txs = [];      // transacciones del bloque
let pagina = 0;

function pintarTabla() {
  const f = $("#filtro").value.trim().toLowerCase();
  const lista = txs.map((t, i) => ({t, i})).filter(x => !f || x.t.txid.includes(f));
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  pagina = Math.min(pagina, paginas - 1);

  $("#txs").innerHTML = lista.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA).map(({t, i}) => {
    const coinbase = t.vin[0] && t.vin[0].coinbase !== undefined;
    const total = t.vout.reduce((s, o) => s + o.value, 0);
    return `<tr>
      <td class="r">${num(i + 1)}</td>
      <td class="mono">${coinbase ? '<span class="chip">coinbase</span> ' : ""}${esc(t.txid)}</td>
      <td class="r">${num(t.vin.length)}</td>
      <td class="r">${num(t.vout.length)}</td>
      <td class="r">${btc(total)}</td>
      <td class="r">${num(t.vsize)} vB</td>
      <td class="r">${t.fee != null ? btc(t.fee) : "—"}</td></tr>`;
  }).join("") || `<tr><td colspan="7">Ninguna transacción coincide con el filtro.</td></tr>`;

  $("#paginacion").innerHTML = `
    <button class="boton" type="button" id="ant" ${pagina === 0 ? "disabled" : ""}>← Anterior</button>
    <span>Página ${num(pagina + 1)} de ${num(paginas)} · ${num(lista.length)} transacciones</span>
    <button class="boton" type="button" id="sig" ${pagina >= paginas - 1 ? "disabled" : ""}>Siguiente →</button>`;
  $("#ant").onclick = () => { pagina--; pintarTabla(); };
  $("#sig").onclick = () => { pagina++; pintarTabla(); };
}

async function cargarBloque(id) {
  const cab = $("#cab-bloque");
  cab.hidden = false;
  cab.innerHTML = `<p class="nota">Cargando transacciones…</p>`;
  $("#resultado").hidden = true;
  try {
    const hash = /^\d+$/.test(id) ? await rpc("getblockhash", [Number(id)]) : id;
    const b = await rpc("getblock", [hash, 2]);   // verbosidad 2: incluye cada transacción completa
    txs = b.tx;
    cab.innerHTML = `
      <h2>Bloque ${num(b.height)}</h2>
      <dl class="detalle">
        ${fila("Hash del bloque", `<span class="mono">${esc(b.hash)}</span>`)}
        ${fila("Fecha", fecha(b.time))}
        ${fila("Cantidad de transacciones", num(b.nTx))}
        ${fila("Tamaño", bytes(b.size))}
      </dl>
      <div class="acciones"><a class="boton" href="blockchain.html#${esc(b.hash)}">← Resumen del bloque</a></div>`;
    $("#resultado").hidden = false;
    pagina = 0;
    pintarTabla();
  } catch (e) {
    cab.innerHTML = `<div class="alerta error">No se pudo cargar el bloque «${esc(id)}»: ${esc(e.message)}</div>`;
  }
  marcarEstado();
}

$("#form-bloque").addEventListener("submit", e => {
  e.preventDefault();
  const q = $("#id-bloque").value.trim();
  if (/^\d+$/.test(q) || esHash(q)) location.href = "transacciones.html?bloque=" + q;
  else $("#id-bloque").focus();
});
$("#ultimo").addEventListener("click", async () => {
  location.href = "transacciones.html?bloque=" + await rpc("getblockcount");
});
$("#filtro").addEventListener("input", () => { pagina = 0; pintarTabla(); });

const bloqueUrl = new URLSearchParams(location.search).get("bloque");
if (bloqueUrl) { $("#id-bloque").value = bloqueUrl; cargarBloque(bloqueUrl); }
else marcarEstado();
