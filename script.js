let devMode = false;

let subs = JSON.parse(localStorage.getItem("subs")) || [];
let ingresos = JSON.parse(localStorage.getItem("ingresos")) || [];
let diasSinIngreso = JSON.parse(localStorage.getItem("diasSinIngreso")) || [];
let metaMensual = JSON.parse(localStorage.getItem("metaMensual")) || 0;

let tipoCambio = 520;
let moneda = localStorage.getItem("moneda") || "CRC";

document.getElementById("moneda").value = moneda;
document.getElementById("metaInput").value = metaMensual;

// ================= API =================
async function obtenerTipoCambio() {
  try {
    let res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    let data = await res.json();
    tipoCambio = data.rates.CRC;
    render();
  } catch {
    console.log("API error");
  }
}
obtenerTipoCambio();
setInterval(obtenerTipoCambio, 3600000);

// ================= MONEDA =================
document.getElementById("moneda").addEventListener("change", e => {
  moneda = e.target.value;
  localStorage.setItem("moneda", moneda);
  render();
});

function convertir(v) {
  return moneda === "USD" ? v / tipoCambio : v;
}
function simbolo() {
  return moneda === "USD" ? "$" : "₡";
}

// ================= META =================
function actualizarMeta() {
  let nuevoValor = Number(document.getElementById("metaInput").value);
  if (nuevoValor < 0) return alert("La meta no puede ser negativa");

  metaMensual = nuevoValor;
  localStorage.setItem("metaMensual", JSON.stringify(metaMensual));
  render();
}

// ================= SUBS =================
function agregarSub() {
  let n = subNombre.value;
  let p = subPrecio.value;
  let d = subDia.value;

  if (!n || !p || !d) return alert("Completa todo");

  subs.push({ nombre: n, precio: Number(p), dia: Number(d) });

  subNombre.value = "";
  subPrecio.value = "";
  subDia.value = "";

  guardar(); render();
}

function eliminarSub(i) {
  if (confirm("¿Eliminar?")) {
    subs.splice(i, 1);
    guardar(); render();
  }
}

// ================= INGRESOS =================
function agregarIngreso() {
  let f = ingFecha.value;
  let m = ingMonto.value;

  if (!f || !m) return alert("Completa todo");

  ingresos.push({ fecha: f, monto: Number(m) });

  ingFecha.value = "";
  ingMonto.value = "";

  guardar(); render();
}

function eliminarIngreso(i) {
  if (confirm("¿Eliminar ingreso?")) {
    ingresos.splice(i, 1);
    guardar(); render();
  }
}

function resetMes() {
  if (!confirm("Borrar ingresos del mes?")) return;

  let h = new Date();
  ingresos = ingresos.filter(i => new Date(i.fecha).getMonth() != h.getMonth());

  guardar(); render();
}

// ✅ FIX FECHA LOCAL
function ponerFechaHoy() {
  let h = new Date();
  let y = h.getFullYear();
  let m = String(h.getMonth() + 1).padStart(2, '0');
  let d = String(h.getDate()).padStart(2, '0');
  ingFecha.value = `${y}-${m}-${d}`;
}

// ================= BLOQUEADOS =================
function bloquearDia() {
  let f = fechaBloqueada.value;
  if (!f) return alert("Selecciona fecha");

  if (!diasSinIngreso.includes(f)) {
    diasSinIngreso.push(f);
    fechaBloqueada.value = "";
    guardar(); render();
  }
}

function eliminarBloqueado(i) {
  if (confirm("Desbloquear?")) {
    diasSinIngreso.splice(i, 1);
    guardar(); render();
  }
}

// ================= UTILS =================
function totalMes() {
  let h = new Date();
  return ingresos
    .filter(i => new Date(i.fecha).getMonth() == h.getMonth())
    .reduce((a, b) => a + b.monto, 0);
}

function diasHasta(dia) {
  let h = new Date();
  let f = new Date(h.getFullYear(), h.getMonth(), dia);
  if (f < h) f = new Date(h.getFullYear(), h.getMonth() + 1, dia);
  return Math.ceil((f - h) / 86400000);
}

// ================= RENDER =================
function render() {

  document.getElementById("tc").textContent = tipoCambio.toFixed(2);
  document.getElementById("metaActual").textContent = "$" + metaMensual.toFixed(0);

  let total = totalMes();
  let fondo = total * 0.05;
  let disponible = total - fondo;

  // ===== SUBS =====
  subs.sort((a, b) => diasHasta(a.dia) - diasHasta(b.dia));

  let tSubs = "";
  let dispTemp = disponible;

  subs.forEach((s, i) => {
    let costo = s.precio * tipoCambio;
    let estado = dispTemp >= costo ? "✅ Cubierta" : "❌ Pendiente";

    if (dispTemp >= costo) dispTemp -= costo;

    let clase = "verde";
    let d = diasHasta(s.dia);

    if (d <= 2) clase = "rojo";
    else if (d <= 5) clase = "amarillo";

    tSubs += `
    <tr class="${clase}">
      <td>${s.nombre}</td>
      <td>${simbolo()}${convertir(costo).toFixed(2)}</td>
      <td>${s.dia}</td>
      <td>${estado}</td>
      <td><button onclick="eliminarSub(${i})">✕</button></td>
    </tr>`;
  });

  tablaSubs.innerHTML = tSubs || "<tr><td colspan='5'>Sin subs</td></tr>";

  // ===== INGRESOS LIMITADOS =====
  let hoy = new Date();

  let filtrados = ingresos.filter(i => {
    let diff = (hoy - new Date(i.fecha)) / 86400000;
    return diff <= 7;
  });

  filtrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  filtrados = filtrados.slice(0, 20);

  let tIng = "";

  filtrados.forEach(i => {
    let idx = ingresos.findIndex(x => x.fecha === i.fecha && x.monto === i.monto);

    tIng += `
    <tr>
      <td>${i.fecha}</td>
      <td>${simbolo()}${convertir(i.monto).toFixed(2)}</td>
      <td><button onclick="eliminarIngreso(${idx})">✕</button></td>
    </tr>`;
  });

  tablaIngresos.innerHTML = tIng || "<tr><td colspan='3'>Sin ingresos</td></tr>";

  // ===== RESUMEN =====
  totalMesEl.textContent = simbolo()+convertir(total).toFixed(2);
  fondoEl.textContent = simbolo()+convertir(fondo).toFixed(2);
  disponibleEl.textContent = simbolo()+convertir(disponible).toFixed(2);

  actualizarGrafica();
  guardar();
}

// ================= GRAFICA =================
let grafica;

function actualizarGrafica() {

  let hoy = new Date();

  let datos = ingresos.filter(i => {
    let diff = (hoy - new Date(i.fecha)) / 86400000;
    return diff <= 30;
  });

  // ✅ FIX: evitar crash
  if (datos.length === 0) {
    if (grafica) grafica.destroy();
    return;
  }

  datos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  let labels = [];
  let valores = [];
  let acum = 0;

  datos.forEach(i => {
    acum += i.monto;
    labels.push(i.fecha);
    valores.push(convertir(acum));
  });

  if (grafica) grafica.destroy();

  let ctx = document.getElementById("grafica").getContext("2d");

  grafica = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Dinero", data: valores, tension: 0.3 }
      ]
    }
  });
}

// ================= DEV =================
window.addEventListener("keydown", e => {
  if ((e.key + "").toLowerCase() === "d") devMode = !devMode;
});

window.devTools = {
  addMoney: c => {
    ingresos.push({
      fecha: new Date().toLocaleDateString("sv-SE"),
      monto: c
    });
    guardar(); render();
  }
};

// ================= GUARDAR =================
function guardar() {
  localStorage.setItem("subs", JSON.stringify(subs));
  localStorage.setItem("ingresos", JSON.stringify(ingresos));
  localStorage.setItem("diasSinIngreso", JSON.stringify(diasSinIngreso));
  localStorage.setItem("metaMensual", JSON.stringify(metaMensual));
}

render();
