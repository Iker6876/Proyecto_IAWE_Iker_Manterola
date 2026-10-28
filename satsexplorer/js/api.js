/* api.js — conexión con el nodo (JSON-RPC), modo demostración y utilidades comunes */

const CONFIG = {
  RPC_URL: "/rpc",       // ruta que tu servidor web reenvía a bitcoind (ver nginx al final)
  REFRESCO_MS: 5000,
  DEMO: new URLSearchParams(location.search).has("demo")
};
let modoDemo = CONFIG.DEMO;

/* ===== Utilidades ===== */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num = n => new Intl.NumberFormat("es-ES").format(n);
const btc = n => Number(n).toFixed(8);
const fecha = t => new Date(t * 1000).toLocaleString("es-ES", {dateStyle: "medium", timeStyle: "short"});
const bytes = b => { const u = ["B","KB","MB","GB","TB"]; let i = 0; b = Number(b) || 0; while (b >= 1024 && i < 4) { b /= 1024; i++; } return b.toFixed(i ? 2 : 0) + " " + u[i]; };
const hace = s => s < 60 ? Math.round(s) + " s" : s < 3600 ? Math.round(s / 60) + " min" : s < 86400 ? (s / 3600).toFixed(1) + " h" : (s / 86400).toFixed(1) + " días";
const corto = (h, n = 12) => h && h.length > 2 * n + 1 ? h.slice(0, n) + "…" + h.slice(-n) : (h || "—");
const esHash = s => /^[0-9a-fA-F]{64}$/.test(s);
const fila = (k, v) => `<div class="fila"><dt>${k}</dt><dd>${v}</dd></div>`;
const errRpc = m => Object.assign(new Error(m), {rpc: true});

/* ===== RPC ===== */
async function enviar(cuerpo) {
  const r = await fetch(CONFIG.RPC_URL, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(cuerpo)});
  return r.json();
}

async function rpc(method, params = []) {
  if (!modoDemo) {
    try {
      const j = await enviar({jsonrpc: "1.0", id: 1, method, params});
      if (j.error) throw errRpc(j.error.message);
      return j.result;
    } catch (e) { if (e.rpc) throw e; modoDemo = true; }
  }
  return demo(method, params);
}

/* lista: [[método, [parámetros]], ...] → resultados en el mismo orden (null si una llamada falla) */
async function rpcLote(lista) {
  if (!modoDemo) {
    try {
      const j = await enviar(lista.map(([method, params = []], i) => ({jsonrpc: "1.0", id: i, method, params})));
      return j.sort((a, b) => a.id - b.id).map(x => x.error ? null : x.result);
    } catch (e) { modoDemo = true; }
  }
  return lista.map(([m, p = []]) => { try { return demo(m, p); } catch { return null; } });
}

/* ===== Cabecera, pie y buscador (se montan en todas las páginas) ===== */
function montarMarco() {
  const pag = document.body.dataset.pagina;
  const enlace = (id, href, txt) => `<a class="nav-link${pag === id ? " activo" : ""}" href="${href}">${txt}</a>`;
  $("#cabecera").outerHTML = `
  <header class="cabecera"><div class="contenedor cab-int">
    <a class="marca" href="index.html">
      <span class="logo">₿</span>
      <span class="marca-txt">SATS<b>EXPLORER</b></span>
      <span class="chip chip-nodo" id="chip-nodo">NODO: …</span>
    </a>
    <form class="buscador" id="form-busca" role="search">
      <input type="search" id="q" placeholder="Buscar por altura o hash de bloque…" aria-label="Buscar bloque" autocomplete="off" spellcheck="false">
    </form>
    <nav class="nav">${enlace("index", "index.html", "Nodo")}${enlace("blockchain", "blockchain.html", "Blockchain")}${enlace("transacciones", "transacciones.html", "Transacciones")}</nav>
    <div class="estado"><span class="punto" id="punto"></span><span id="estado-txt">Conectando…</span></div>
  </div></header>`;
  $("#pie").outerHTML = `
  <footer class="pie"><div class="contenedor">
    <span>SATSEXPLORER • Red Bitcoin (Descentralizada &amp; Segura)</span>
    <span>Sin rastreadores de precios</span>
  </div></footer>`;
  $("#form-busca").addEventListener("submit", e => {
    e.preventDefault();
    const q = $("#q").value.trim(), valido = /^\d+$/.test(q) || esHash(q);
    $("#q").classList.toggle("invalido", !valido);
    if (valido) location.href = "blockchain.html#" + q;
  });
  $("#q").addEventListener("input", () => $("#q").classList.remove("invalido"));
}

/* Actualiza el indicador de estado y el aviso de demo; llamar tras cada consulta */
function marcarEstado() {
  $("#punto").className = "punto " + (modoDemo ? "demo" : "vivo");
  $("#estado-txt").textContent = modoDemo ? "Modo demo" : "Red activa";
  $("#chip-nodo").textContent = modoDemo ? "NODO: DEMO (SIM)" : "NODO: EN VIVO";
  const av = $("#avisos");
  if (av) av.innerHTML = modoDemo
    ? `<div class="alerta">Modo demostración: no hay respuesta de tu nodo en <span class="mono">${esc(CONFIG.RPC_URL)}</span>, así que se muestran datos simulados.</div>` : "";
}

montarMarco();

/* ===== Datos simulados (determinísticos) ===== */
const DEMO_TIP = 840215;
function sem(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
const hex = (s, n = 64) => { const r = sem(s); let o = ""; for (let i = 0; i < n; i++) o += "0123456789abcdef"[Math.floor(r() * 16)]; return o; };
const hBloque = h => "00000000000000000" + hex("b" + h).slice(17);
const tBloque = h => 1713571767 + (h - 840000) * 600;
const nTxDemo = h => 150 + Math.floor(sem("n" + h)() * 300);
const alturaDemo = id => { if (typeof id === "number") return id; for (let h = DEMO_TIP; h > DEMO_TIP - 2000; h--) if (hBloque(h) === id) return h; throw errRpc("Block not found"); };

function demo(m, p) {
  const t = Math.floor(Date.now() / 1000) % 1000;
  switch (m) {
    case "getblockcount": return DEMO_TIP;
    case "getblockhash":
      if (p[0] < 0 || p[0] > DEMO_TIP) throw errRpc("Block height out of range");
      return hBloque(p[0]);
    case "getblockstats": { const h = alturaDemo(p[0]); return {height: h, blockhash: hBloque(h), time: tBloque(h), txs: nTxDemo(h), total_size: nTxDemo(h) * 480}; }
    case "getblock": {
      const h = alturaDemo(p[0]), n = nTxDemo(h), ids = Array.from({length: n}, (_, i) => hex("t" + h + "-" + i));
      return {
        hash: hBloque(h), height: h, time: tBloque(h), mediantime: tBloque(h) - 1200, nTx: n, size: n * 480, weight: n * 1650,
        difficulty: 8.355e13, bits: "17034219", version: 536870912, nonce: Math.floor(sem("nc" + h)() * 4e9), merkleroot: hex("m" + h),
        previousblockhash: h > 0 ? hBloque(h - 1) : undefined, nextblockhash: h < DEMO_TIP ? hBloque(h + 1) : undefined, confirmations: DEMO_TIP - h + 1,
        tx: p[1] === 2 ? ids.map((id, i) => {
          const r = sem("x" + id);
          if (i === 0) return {txid: id, vin: [{coinbase: "03" + hex("c" + h, 24)}], vout: [{value: 3.125, n: 0}], vsize: 210};
          return {txid: id, vin: Array.from({length: 1 + Math.floor(r() * 3)}, () => ({txid: hex("i" + r())})), vout: Array.from({length: 1 + Math.floor(r() * 4)}, (_, k) => ({value: +(r() * 0.5 + 0.0005).toFixed(8), n: k})), vsize: 110 + Math.floor(r() * 400), fee: +(r() * 0.0003).toFixed(8)};
        }) : ids
      };
    }
    case "getblockchaininfo": return {chain: "main", blocks: DEMO_TIP, headers: DEMO_TIP, verificationprogress: 0.99999, initialblockdownload: false, size_on_disk: 6.4e11, pruned: false, difficulty: 8.355e13};
    case "getnetworkinfo": return {version: 270000, subversion: "/Satoshi:27.0.0/", protocolversion: 70016, connections: 16, connections_in: 6, connections_out: 10, networks: [{name: "ipv4", reachable: true}, {name: "ipv6", reachable: true}, {name: "onion", reachable: true}, {name: "i2p", reachable: false}]};
    case "getmempoolinfo": return {size: 142850 + t, bytes: 2.8e8, usage: 3.1e8, maxmempool: 3e8 * 2, mempoolminfee: 0.00001};
    case "getnettotals": return {totalbytesrecv: 2.4e10 + t * 1e5, totalbytessent: 3.1e10 + t * 2e5};
    case "uptime": return 864000 + t;
    case "getnetworkhashps": return 6.1045e20;
    case "getpeerinfo": return Array.from({length: 16}, (_, i) => ({addr: `203.0.113.${i + 10}:8333`, subver: "/Satoshi:" + (i % 3 ? "27.0.0" : "26.1.0") + "/", inbound: i >= 10, connection_type: i < 8 ? "outbound-full-relay" : i < 10 ? "block-relay-only" : "inbound", network: ["ipv4", "ipv6", "onion"][i % 3], minping: .03 + sem("p" + i)() * .2, bytesrecv: 5e6 * (i + 1), bytessent: 2e6 * (i + 1)}));
  }
  throw errRpc("Método no soportado en demo: " + m);
}

/* ===== Conexión con tu nodo (nginx) =====
bitcoin.conf:  server=1   rpcallowip=127.0.0.1   rpcuser=lector   rpcpassword=CLAVE

server {
  listen 8080;
  root /ruta/a/satsexplorer;
  location = /rpc {
    if ($request_method != POST) { return 405; }
    proxy_pass http://127.0.0.1:8332/;
    proxy_set_header Authorization "Basic BASE64(lector:CLAVE)";
    proxy_set_header Content-Type "application/json";
  }
}
Úsalo solo en tu red local; no expongas el RPC a internet. */
