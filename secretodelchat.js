let k="";
window.addEventListener("keydown",e=>{
  k+=e.key.toLowerCase();
  if(k.includes("delta")){
    alert("Modo oculto activado");
  }
});
