let subs = JSON.parse(localStorage.getItem("subs")) || [];
let ingresos = JSON.parse(localStorage.getItem("ingresos")) || [];

let tipoCambio = 520;
let moneda = localStorage.getItem("moneda") || "CRC";

let grafica;
let devMode = false;

// MONEDA
document.getElementById("moneda").value = moneda;

document.getElementById("moneda").addEventListener("change", e=>{
  moneda = e.target.value;
  localStorage.setItem("moneda", moneda);
  render();
});

function convertir(v){
  return moneda==="USD"? v/tipoCambio : v;
}

function simbolo(){
  return moneda==="USD"?"$":"₡";
}

// API
async function obtenerTipoCambio(){
  try{
    let res=await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    let data=await res.json();
    tipoCambio=data.rates.CRC;
    render();
  }catch{
    console.log("API error");
  }
}

obtenerTipoCambio();
setInterval(obtenerTipoCambio,3600000);

// FECHA AUTO (SIN LOOP)
function usarHoy(){
  let hoy=new Date().toISOString().split("T")[0];
  document.getElementById("ingFecha").value=hoy;
}
usarHoy();

// SUSCRIPCIONES
function agregarSub(){
  let n=subNombre.value;
  let p=Number(subPrecio.value);
  let d=Number(subDia.value);
  if(!n||!p||!d)return;
  subs.push({nombre:n,precio:p,dia:d});
  guardar();render();
}

function eliminarSub(i){
  subs.splice(i,1);
  guardar();render();
}

// INGRESOS
function agregarIngreso(){
  let f=ingFecha.value;
  let m=Number(ingMonto.value);
  if(!f||!m)return;
  ingresos.push({fecha:f,monto:m});
  guardar();render();
}

function eliminarIngreso(i){
  ingresos.splice(i,1);
  guardar();render();
}

function resetMes(){
  let h=new Date();
  ingresos=ingresos.filter(i=>{
    let f=new Date(i.fecha);
    return f.getMonth()!=h.getMonth() || f.getFullYear()!=h.getFullYear();
  });
  guardar();render();
}

// CALCULOS
function totalMes(){
  let h=new Date();
  return ingresos.filter(i=>{
    let f=new Date(i.fecha);
    return f.getMonth()==h.getMonth() && f.getFullYear()==h.getFullYear();
  }).reduce((a,b)=>a+b.monto,0);
}

function diasHasta(dia){
  let h=new Date();
  let f=new Date(h.getFullYear(),h.getMonth(),dia);
  if(f<h)f=new Date(h.getFullYear(),h.getMonth()+1,dia);
  return Math.ceil((f-h)/86400000);
}

// RENDER
function render(){

  document.getElementById("tc").textContent=tipoCambio.toFixed(2);

  let total=totalMes();
  let fondo=total*0.05;
  let disponible=total-fondo;

  subs.sort((a,b)=>diasHasta(a.dia)-diasHasta(b.dia));

  let htmlSubs="";

  subs.forEach((s,i)=>{
    let costo=s.precio*tipoCambio;
    let estado="Pendiente";
    let clase="";

    if(disponible>=costo){
      disponible-=costo;
      estado="Cubierta";
      clase="verde";
    }else{
      clase="rojo";
    }

    let d=diasHasta(s.dia);
    if(d<=2)clase="rojo";
    else if(d<=5)clase="amarillo";

    htmlSubs+=`
    <tr class="${clase}">
      <td>${s.nombre}</td>
      <td>${simbolo()}${convertir(costo).toFixed(2)}</td>
      <td>${s.dia}</td>
      <td>${estado}</td>
      <td><button onclick="eliminarSub(${i})">X</button></td>
    </tr>`;
  });

  tablaSubs.innerHTML=htmlSubs;

  let htmlIng="";
  ingresos.forEach((i,idx)=>{
    htmlIng+=`
    <tr>
      <td>${i.fecha}</td>
      <td>${simbolo()}${convertir(i.monto).toFixed(2)}</td>
      <td><button onclick="eliminarIngreso(${idx})">X</button></td>
    </tr>`;
  });

  tablaIngresos.innerHTML=htmlIng;

  totalMesEl.textContent=simbolo()+convertir(total).toFixed(2);
  fondoEl.textContent=simbolo()+convertir(fondo).toFixed(2);
  disponibleEl.textContent=simbolo()+convertir(disponible).toFixed(2);

  actualizarGrafica();

  if(devMode){
    devTC.textContent=tipoCambio.toFixed(2);
    devTotal.textContent=total.toFixed(2);
    devDisponible.textContent=disponible.toFixed(2);
  }

  guardar();
}

// GRAFICA
function actualizarGrafica(){

  let datos=[...ingresos].sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));

  let labels=[];
  let valores=[];
  let acum=0;

  datos.forEach(i=>{
    acum+=i.monto;
    labels.push(i.fecha);
    valores.push(convertir(acum));
  });

  let meta=20000;

  if(grafica)grafica.destroy();

  let ctx=document.getElementById("grafica").getContext("2d");

  grafica=new Chart(ctx,{
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

// DEV MODE
let key="";
window.addEventListener("keydown",e=>{
  key+=e.key.toLowerCase();
  if(key.includes("dev")){
    devMode=!devMode;
    devPanel.style.display=devMode?"block":"none";
    key="";
  }
});

function forzarAPI(){ obtenerTipoCambio(); }

function resetTodo(){
  if(confirm("BORRAR TODO?")){
    localStorage.clear();
    location.reload();
  }
}

// STORAGE
function guardar(){
  localStorage.setItem("subs",JSON.stringify(subs));
  localStorage.setItem("ingresos",JSON.stringify(ingresos));
}

function render(){

  document.getElementById("tc").textContent = tipoCambio.toFixed(2);

  let total = totalMes();
  let fondo = total * 0.05;
  let disponible = total - fondo;

  // ... más código
}
