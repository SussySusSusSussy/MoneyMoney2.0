let devMode = false;

let subs = JSON.parse(localStorage.getItem("subs")) || [];
let ingresos = JSON.parse(localStorage.getItem("ingresos")) || [];
let diasSinIngreso = JSON.parse(localStorage.getItem("diasSinIngreso")) || [];

let tipoCambio = 520;
let moneda = localStorage.getItem("moneda") || "CRC";

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
  if (!subNombre.value || !subPrecio.value || !subDia.value) return;

  subs.push({
    nombre: subNombre.value,
    precio: Number(subPrecio.value),
    dia: Number(subDia.value)
  });

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

function ponerFechaHoy() {
  document.getElementById("ingFecha").value =
    new Date().toISOString().split("T")[0];
}

// ================= DIAS SIN INGRESO =================
function bloquearDia() {
  let fecha = document.getElementById("fechaBloqueada").value;
  if (!fecha) return;

  if (!diasSinIngreso.includes(fecha)) {
    diasSinIngreso.push(fecha);
    guardar(); render();
  }
}

function eliminarBloqueado(i) {
  diasSinIngreso.splice(i, 1);
  guardar(); render();
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

  // ===== SUBS =====
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

  // ===== INGRESOS (7 días + límite 20) =====
  let hoy = new Date();

  let ingresosFiltrados = ingresos.filter(i => {
    let f = new Date(i.fecha);
    let diff = (hoy - f) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });

  ingresosFiltrados = ingresosFiltrados
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 20);

  let tIng = "";

  ingresosFiltrados.forEach((i, idx) => {
    tIng += `
    <tr>
      <td>${i.fecha}</td>
      <td>${simbolo()}${convertir(i.monto).toFixed(2)}</td>
      <td><button onclick="eliminarIngreso(${idx})">X</button></td>
    </tr>`;
  });

  tablaIngresos.innerHTML = tIng;

  // ===== RESUMEN =====
  document.getElementById("totalMes").textContent =
    simbolo() + convertir(total).toFixed(2);

  document.getElementById("fondo").textContent =
    simbolo() + convertir(fondo).toFixed(2);

  document.getElementById("disponible").textContent =
    simbolo() + convertir(disponible).toFixed(2);

  // ===== FALTA / SOBRA =====
  let totalSubs = subs.reduce((acc, s) => acc + (s.precio * tipoCambio), 0);
  let diferencia = total - totalSubs;

  let estadoDinero = document.getElementById("estadoDinero");
  if (estadoDinero) {
    estadoDinero.textContent =
      diferencia >= 0
        ? `Te sobran ${simbolo()}${convertir(diferencia).toFixed(2)}`
        : `Te faltan ${simbolo()}${convertir(Math.abs(diferencia)).toFixed(2)}`;
  }

  // ===== TOTAL 7 DIAS =====
  let total7 = ingresosFiltrados.reduce((a, b) => a + b.monto, 0);
  let t7 = document.getElementById("total7dias");
  if (t7) {
    t7.textContent =
      `Últimos 7 días: ${simbolo()}${convertir(total7).toFixed(2)}`;
  }

  // ===== PLANIFICACION =====
  let diasMes = 30;
  let diasActivos = diasMes - diasSinIngreso.length;
  if (diasActivos <= 0) diasActivos = 1;

  let objetivoDiario = totalSubs / diasActivos;

  let ingresoPromedio = total / new Date().getDate();
  let proyeccion = ingresoPromedio * diasActivos;

  let estadoPlan = "";
  let colorPlan = "";

  if (proyeccion >= totalSubs * 1.2) {
    estadoPlan = "Vas sobrado 😎";
    colorPlan = "lime";
  } else if (proyeccion >= totalSubs) {
    estadoPlan = "Vas justo 😐";
    colorPlan = "orange";
  } else {
    estadoPlan = "No alcanzas 😬";
    colorPlan = "red";
  }

  document.getElementById("objetivoDiario").textContent =
    `Objetivo diario: ${simbolo()}${convertir(objetivoDiario).toFixed(2)}`;

  let estadoEl = document.getElementById("estadoPlan");
  estadoEl.textContent = estadoPlan;
  estadoEl.style.color = colorPlan;

  let cobertura = 0;
  if (diasSinIngreso.length > 0 && diferencia > 0) {
    cobertura = diferencia / diasSinIngreso.length;
  }

  document.getElementById("cobertura").textContent =
    `Cobertura días sin ingreso: ${simbolo()}${convertir(cobertura).toFixed(2)}`;

  // ===== LISTA BLOQUEADOS =====
  let lista = document.getElementById("listaBloqueados");
  if (lista) {
    lista.innerHTML = "";
    diasSinIngreso.forEach((f, i) => {
      lista.innerHTML += `<li>${f} <button onclick="eliminarBloqueado(${i})">X</button></li>`;
    });
  }

  actualizarGrafica();
  guardar();

  // DEV
  if (devMode) {
    document.getElementById("devTC").textContent = tipoCambio.toFixed(2);
    document.getElementById("devTotal").textContent = total.toFixed(2);
    document.getElementById("devDisponible").textContent = disponible.toFixed(2);
  }
}

// ================= GRAFICA =================
let grafica;

function actualizarGrafica() {

  let hoy = new Date();

  let datos = ingresos.filter(i => {
    let f = new Date(i.fecha);
    let diff = (hoy - f) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  });

  datos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  let labels = [];
  let valores = [];
  let acum = 0;

  datos.forEach(i => {
    acum += i.monto;
    labels.push(i.fecha);
    valores.push(convertir(acum));
  });

  let totalSubs = subs.reduce((acc, s) => acc + (s.precio * tipoCambio), 0);

  if (grafica) grafica.destroy();

  let ctx = document.getElementById("grafica").getContext("2d");

  let dark = document.body.classList.contains("dark");

  grafica = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        { label: "Dinero", data: valores, tension: 0.3 },
        { label: "Meta", data: labels.map(() => convertir(totalSubs)), borderDash: [6,6] }
      ]
    },
    options: {
      plugins: {
        legend: {
          labels: { color: dark ? "#eee" : "#111" }
        }
      },
      scales: {
        x: {
          ticks: { color: dark ? "#eee" : "#111" },
          grid: { color: dark ? "#333" : "#ccc" }
        },
        y: {
          ticks: { color: dark ? "#eee" : "#111" },
          grid: { color: dark ? "#333" : "#ccc" }
        }
      }
    }
  });
}

// ================= GUARDAR =================
function guardar() {
  localStorage.setItem("subs", JSON.stringify(subs));
  localStorage.setItem("ingresos", JSON.stringify(ingresos));
  localStorage.setItem("diasSinIngreso", JSON.stringify(diasSinIngreso));
}

// ================= DEV =================
let devKey = "";

window.addEventListener("keydown", e => {
  devKey += e.key.toLowerCase();

  if (devKey.includes("devmode")) {
    devMode = !devMode;
    document.getElementById("devPanel").style.display =
      devMode ? "block" : "none";
    alert(devMode ? "DEV MODE 😎" : "DEV OFF");
    devKey = "";
  }
});

window.devTools = {
  addMoney: (c) => {
    ingresos.push({ fecha: new Date().toISOString().split("T")[0], monto: c });
    guardar(); render();
  },
  godMode: () => {
    ingresos.push({ fecha: new Date().toISOString().split("T")[0], monto: 9999999 });
    guardar(); render();
  }
};

function forzarAPI() { obtenerTipoCambio(); }

function resetTodo() {
  if (confirm("BORRA TODO")) {
    localStorage.clear();
    location.reload();
  }
}

render();
