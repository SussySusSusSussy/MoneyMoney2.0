let subs = JSON.parse(localStorage.getItem("subs")) || [];
let ingresos = JSON.parse(localStorage.getItem("ingresos")) || [];

let tipoCambio = 520;
let moneda = localStorage.getItem("moneda") || "CRC";

document.getElementById("moneda").value = moneda;

// API
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

// MONEDA
document.getElementById("moneda").addEventListener("change", e=>{
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

// SUS
function agregarSub() {
  let nombre = subNombre.value;
  let precio = Number(subPrecio.value);
  let dia = Number(subDia.value);
  subs.push({nombre,precio,dia});
  guardar(); render();
}

function eliminarSub(i){ subs.splice(i,1); guardar(); render(); }

// INGRESOS
function agregarIngreso(){
  ingresos.push({fecha:ingFecha.value, monto:Number(ingMonto.value)});
  guardar(); render();
}

function eliminarIngreso(i){ ingresos.splice(i,1); guardar(); render(); }

function resetMes(){
  let h=new Date();
  ingresos=ingresos.filter(i=>{
    let f=new Date(i.fecha);
    return f.getMonth()!=h.getMonth();
  });
  guardar(); render();
}

// UTILS
function totalMes(){
  let h=new Date();
  return ingresos.filter(i=>{
    let f=new Date(i.fecha);
    return f.getMonth()==h.getMonth();
  }).reduce((a,b)=>a+b.monto,0);
}

function diasHasta(dia){
  let h=new Date();
  let f=new Date(h.getFullYear(),h.getMonth(),dia);
  if(f<h) f=new Date(h.getFullYear(),h.getMonth()+1,dia);
  return Math.ceil((f-h)/86400000);
}

// RENDER
function render(){

  document.getElementById("tc").textContent = tipoCambio.toFixed(2);

  let total = totalMes();
  let fondo = total*0.05;
  let disponible = total - fondo;

  subs.sort((a,b)=>diasHasta(a.dia)-diasHasta(b.dia));

  let tSubs="";
  subs.forEach((s,i)=>{

    let costo = s.precio * tipoCambio;
    let estado="Pendiente";
    let clase="";

    if(disponible>=costo){
      disponible-=costo;
      estado="Cubierta";
      clase="verde";
    } else {
      clase="rojo";
    }

    let d=diasHasta(s.dia);
    if(d<=2) clase="rojo";
    else if(d<=5) clase="amarillo";

    tSubs+=`
    <tr class="${clase}">
    <td>${s.nombre}</td>
    <td>${simbolo()}${convertir(costo).toFixed(2)}</td>
    <td>${s.dia}</td>
    <td>${estado}</td>
    <td><button onclick="eliminarSub(${i})">X</button></td>
    </tr>`;
  });

  tablaSubs.innerHTML=tSubs;

  let tIng="";
  ingresos.forEach((i,idx)=>{
    tIng+=`
    <tr>
    <td>${i.fecha}</td>
    <td>${simbolo()}${convertir(i.monto).toFixed(2)}</td>
    <td><button onclick="eliminarIngreso(${idx})">X</button></td>
    </tr>`;
  });

  tablaIngresos.innerHTML=tIng;

  totalMesEl = document.getElementById("totalMes");
  fondoEl = document.getElementById("fondo");
  dispEl = document.getElementById("disponible");

  totalMesEl.textContent = simbolo()+convertir(total).toFixed(2);
  fondoEl.textContent = simbolo()+convertir(fondo).toFixed(2);
  dispEl.textContent = simbolo()+convertir(disponible).toFixed(2);

  actualizarGrafica();
  guardar();
}

// GRAFICA
let grafica;
function actualizarGrafica(){

  let datos = [...ingresos].sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));

  let labels=[];
  let valores=[];
  let acum=0;

  datos.forEach(i=>{
    acum+=i.monto;
    labels.push(i.fecha);
    valores.push(convertir(acum));
  });

  let meta=20000;

  if(grafica) grafica.destroy();

 let ctx = document.getElementById("grafica").getContext("2d");

grafica = new Chart(ctx, {
    type:"line",
    data:{
      labels:labels,
      datasets:[
        {label:"Dinero",data:valores,tension:0.2},
        {label:"Meta",data:labels.map(()=>convertir(meta)),borderDash:[5,5]}
      ]
    }
  });
}

function guardar(){
  localStorage.setItem("subs",JSON.stringify(subs));
  localStorage.setItem("ingresos",JSON.stringify(ingresos));
}

render();
