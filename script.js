let devMode = false;
let subs = JSON.parse(localStorage.getItem("subs")) || [];
let ingresos = JSON.parse(localStorage.getItem("ingresos")) || [];

let tipoCambio = 520;
let moneda = localStorage.getItem("moneda") || "CRC";
let meta = localStorage.getItem("meta") ? Number(localStorage.getItem("meta")) : 20000;

document.getElementById("moneda").value = moneda;

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

// ================= SUS =================
function agregarSub() {
  let nombre = subNombre.value;
  let precio = Number(subPrecio.value);
  let dia = Number(subDia.value);

  if (!nombre || !precio || !dia) return;

  subs.push({ nombre, precio, dia });
  guardar(); render();
}

function eliminarSub(i) {
  subs.splice(i, 1);
  guardar(); render();
}

// ================= INGRESOS =================
function agregarIngreso() {
  if (!ingFecha.value || !ingMonto.value) return;

  ingresos.push({
    fecha: ingFecha.value,
    monto: Number(ingMonto.value)
  });

  guardar(); render();
}

function eliminarIngreso(i) {
  ingresos.splice(i, 1);
  guardar(); render();
}

function resetMes() {
  let h = new Date();
  ingresos = ingresos.filter(i => {
    let f = new Date(i.fecha);
    return f.getMonth() != h.getMonth();
  });
  guardar(); render();
}

// 👉 BOTÓN HOY
function ponerFechaHoy() {
  let hoy = new Date().toISOString().split("T")[0];
  document.getElementById("ingFecha").value = hoy;
}

// ================= UTILS =================
function totalMes() {
  let h = new Date();
  return ingresos.filter(i => {
    let f = new Date(i.fecha);
    return f.getMonth() == h.getMonth();
  }).reduce((a, b) => a + b.monto, 0);
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

  let total = totalMes();
  let fondo = total * 0.05;
  let disponible = total - fondo;

  subs.sort((a, b) => diasHasta(a.dia) - diasHasta(b.dia));

  let tSubs = "";

  let disponibleTemp = disponible;

  subs.forEach((s, i) => {

    let costo = s.precio * tipoCambio;
    let estado = "Pendiente";
    let clase = "";

    if (disponibleTemp >= costo) {
      disponibleTemp -= costo;
      estado = "Cubierta";
      clase = "verde";
    } else {
      clase = "rojo";
    }

    let d = diasHasta(s.dia);
    if (d <= 2) clase = "rojo";
    else if (d <= 5) clase = "amarillo";

    tSubs += `
    <tr class="${clase}">
    <td>${s.nombre}</td>
    <td>${simbolo()}${convertir(costo).toFixed(2)}</td>
    <td>${s.dia}</td>
    <td>${estado}</td>
    <td><button onclick="eliminarSub(${i})">X</button></td>
    </tr>`;
  });

  tablaSubs.innerHTML = tSubs;

  // ================= INGRESOS (7 DÍAS) =================
  let hoy = new Date();

  let ingresosFiltrados = ingresos.filter(i => {
    let f = new Date(i.fecha);
    let diff = (hoy - f) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
  });

  // Limitar visualmente a últimos 20 registros
  ingresosFiltrados = ingresosFiltrados
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)) // más recientes primero
    .slice(0, 20);

  let tIng = "";

  ingresosFiltrados.forEach((i) => {
    let ingresoIndex = ingresos.indexOf(i);
    tIng += `
    <tr>
    <td>${i.fecha}</td>
    <td>${simbolo()}${convertir(i.monto).toFixed(2)}</td>
    <td><button onclick="eliminarIngreso(${ingresoIndex})">X</button></td>
    </tr>`;
  });

  tablaIngresos.innerHTML = tIng;

  // ================= RESUMEN =================
  totalMesEl = document.getElementById("totalMes");
  fondoEl = document.getElementById("fondo");
  dispEl = document.getElementById("disponible");

  totalMesEl.textContent = simbolo() + convertir(total).toFixed(2);
  fondoEl.textContent = simbolo() + convertir(fondo).toFixed(2);
  dispEl.textContent = simbolo() + convertir(disponible).toFixed(2);

  // 👉 FALTA / SOBRA
  let totalSubs = subs.reduce((acc, s) => acc + (s.precio * tipoCambio), 0);
  let diferencia = total - totalSubs;

  let estadoEl = document.getElementById("estadoDinero");

  if (estadoEl) {
    if (diferencia >= 0) {
      estadoEl.textContent = `Te sobran ${simbolo()}${convertir(diferencia).toFixed(2)}`;
      estadoEl.style.color = "lime";
    } else {
      estadoEl.textContent = `Te faltan ${simbolo()}${convertir(Math.abs(diferencia)).toFixed(2)}`;
      estadoEl.style.color = "red";
    }
  }

  // 👉 TOTAL 7 DÍAS
  let total7 = ingresosFiltrados.reduce((a, b) => a + b.monto, 0);
  let t7el = document.getElementById("total7dias");

  if (t7el) {
    t7el.textContent = `Últimos 7 días: ${simbolo()}${convertir(total7).toFixed(2)}`;
  }

  actualizarGrafica();
  guardar();

  // 👉 DEV PANEL
  if (devMode) {
    document.getElementById("devTC").textContent = tipoCambio.toFixed(2);
    document.getElementById("devTotal").textContent = total.toFixed(2);
    document.getElementById("devDisponible").textContent = disponible.toFixed(2);
  }
}

// ================= GRAFICA =================
let grafica;

function actualizarGrafica() {

  let datos = [...ingresos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

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
      labels: labels,
      datasets: [
        { label: "Dinero", data: valores, tension: 0.2 },
        { label: "Meta", data: labels.map(() => convertir(meta)), borderDash: [5, 5] }
      ]
    }
  });
}

// ================= GUARDAR =================
function guardar() {
  localStorage.setItem("subs", JSON.stringify(subs));
  localStorage.setItem("ingresos", JSON.stringify(ingresos));
  localStorage.setItem("meta", meta.toString());
}

// ================= DEV MODE =================
let devKey = "";

window.addEventListener("keydown", e => {
  devKey += e.key.toLowerCase();

  if (devKey.includes("devmode")) {
    devMode = !devMode;

    document.getElementById("devPanel").style.display =
      devMode ? "block" : "none";

    alert(devMode ? "DEV MODE ACTIVADO 😎" : "DEV MODE OFF");

    devKey = "";
  }
});

// 👉 herramientas pro
window.devTools = {
  addMoney: (cantidad) => {
    ingresos.push({
      fecha: new Date().toISOString().split("T")[0],
      monto: cantidad
    });
    guardar(); render();
  },
  godMode: () => {
    ingresos.push({
      fecha: new Date().toISOString().split("T")[0],
      monto: 9999999
    });
    guardar(); render();
  },
  fakeSubs: () => {
    subs.push({ nombre: "Netflix", precio: 5000, dia: 10 });
    subs.push({ nombre: "Spotify", precio: 3000, dia: 5 });
    guardar(); render();
  },
  setMeta: (cantidad) => {
    meta = cantidad;
    guardar(); render();
  }
};

function forzarAPI() {
  obtenerTipoCambio();
}

function resetTodo() {
  if (confirm("¿Seguro? BORRA TODO")) {
    localStorage.clear();
    location.reload();
  }
}

// ================= INIT =================
render();
