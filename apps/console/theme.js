/* Runs before styles/app initialization so persisted appearance never flashes light. */
(() => {
  const key='hexagon.console.theme', choices=['system','light','dark'];
  const system=window.matchMedia('(prefers-color-scheme: dark)');
  let preference='system';
  try { const saved=localStorage.getItem(key);if(choices.includes(saved))preference=saved; } catch { /* Storage may be unavailable. */ }
  const apply=()=>{document.documentElement.dataset.theme=preference==='system'?(system.matches?'dark':'light'):preference;};
  window.hexagonTheme={get preference(){return preference;},set(value){
    if(!choices.includes(value))return;
    preference=value;try{localStorage.setItem(key,value);}catch{/* Keep the in-memory preference. */}
    apply();document.dispatchEvent(new Event('themechange'));
  }};
  system.addEventListener('change',apply);
  window.addEventListener('storage',event=>{if(event.key===key){preference=choices.includes(event.newValue)?event.newValue:'system';apply();document.dispatchEvent(new Event('themechange'));}});
  apply();
})();
