/* index.js — estadísticas del nodo (conexiones, mempool, red, sincronización) */

const tarjeta = (titulo, valor, nota, clase = "") =>
  `<article class="tarjeta"><span class="tarjeta-tit">${titulo}</span><div class="valor">${valor}</div><p class="nota ${clase}">${nota}</p></article>`;

const TIPOS = {
  "outbound-full-relay": "Saliente",
  "block-relay-only": "Saliente (solo bloques)",
  "manual": "Saliente (manual)",
  "addr-fetch": "Saliente (direcciones)",
  "feeler": "Saliente (prueba)",
  "inbound": "Entrante"
};
const REDES = {main: "Mainnet", test: "Testnet 3", testnet4: "Testnet 4", signet: "Signet", regtest: "Regtest"};

async function cargar() {
  try {
    const [bc, net, mp, tot, up, hps, pares] = await rpcLote([
      ["getblockchaininfo"], ["getnetworkinfo"], ["getmempoolinfo"], ["getnettotals"],
      ["uptime"], ["getnetworkhashps", [120]], ["getpeerinfo"]
    ]);
    if (!bc || !net || !mp || !tot) throw new Error("El nodo no devolvió todos los datos");
    const peers = pares || [];

    const entrantes = net.connections_in ?? peers.filter(p => p.inbound).length;
    const salientes = net.connections_out ?? peers.length - entrantes;
    const pct = bc.verificationprogress * 100;
    const red = REDES[bc.chain] || bc.chain;
    const activas = net.networks.filter(n => n.reachable).map(n => n.name).join(", ");

    $("#estadisticas").innerHTML = [
      tarjeta("Altura de bloque", num(bc.blocks), `Cabeceras: ${num(bc.headers)}`),
      tarjeta("Mempool pendientes", `${num(mp.size)} <small>txs</small>`, `Tamaño: ${bytes(mp.bytes)}`),
      tarjeta("Dificultad de red", (bc.difficulty / 1e12).toFixed(2) + " T", `Próximo ajuste en ${num(2016 - bc.blocks % 2016)} bloques`),
      tarjeta("Tasa de hash", ((hps || 0) / 1e18).toFixed(2) + " <small>EH/s</small>", "Estimada sobre los últimos 120 bloques"),
      tarjeta("Conexiones entrantes", num(entrantes), "Pares que se conectan a tu nodo", "ok"),
      tarjeta("Conexiones salientes", num(salientes), "Pares a los que tu nodo se conecta"),
      tarjeta("Total de pares", num(net.connections ?? peers.length), "Redes: " + activas),
      tarjeta("Tráfico de red", "↓ " + bytes(tot.totalbytesrecv), "↑ " + bytes(tot.totalbytessent) + " enviados")
    ].join("");

    $("#paneles").innerHTML = `
      <section class="panel">
        <h2>Sincronización</h2>
        <div class="progreso"><div style="width:${Math.min(pct, 100)}%"></div></div>
        <p class="nota">${pct >= 99.99 ? "Sincronizado" : "Sincronizando: " + pct.toFixed(2) + " %"}</p>
        <dl>
          ${fila("Red", red)}
          ${fila("Descarga inicial", bc.initialblockdownload ? "En curso" : "Completada")}
          ${fila("Tamaño en disco", bytes(bc.size_on_disk))}
          ${fila("Modo podado", bc.pruned ? "Sí" : "No")}
        </dl>
      </section>
      <section class="panel">
        <h2>Nodo</h2>
        <dl>
          ${fila("Versión", esc(net.subversion.replace(/\//g, "")))}
          ${fila("Protocolo", net.protocolversion)}
          ${fila("En marcha desde hace", hace(up))}
          ${fila("Redes alcanzables", activas)}
        </dl>
      </section>`;

    $("#pares").innerHTML = peers.length
      ? peers.slice().sort((a, b) => a.inbound - b.inbound).map(p => `<tr>
          <td class="mono">${esc(p.addr)}</td>
          <td>${esc((p.subver || "").replace(/\//g, ""))}</td>
          <td>${TIPOS[p.connection_type] || (p.inbound ? "Entrante" : "Saliente")}</td>
          <td>${esc(p.network || "—")}</td>
          <td class="r">${p.minping != null ? Math.round(p.minping * 1000) + " ms" : "—"}</td>
          <td class="r">${bytes(p.bytesrecv)}</td>
          <td class="r">${bytes(p.bytessent)}</td></tr>`).join("")
      : `<tr><td colspan="7">Sin pares conectados.</td></tr>`;

    $("#actualizado").textContent = "Última actualización: " + new Date().toLocaleTimeString("es-ES");
  } catch (e) {
    $("#estadisticas").innerHTML = `<div class="alerta error">No se pudieron leer las estadísticas: ${esc(e.message)}</div>`;
  }
  marcarEstado();
}

cargar();
setInterval(cargar, CONFIG.REFRESCO_MS);
