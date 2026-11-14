
// Um único mapa de navegação para todas as páginas. Os sete ventos são secções temáticas.
(function initSevenWinds() {
  const script = Array.from(document.scripts).find(s => /\/assets\/site\.js(?:[?#]|$)/.test(s.src));
  if (!script) return;
  const root = new URL("../", script.src);
  const items = [
    {title:"CTRL + CHAOS", subtitle:"DIGITAL", path:"ctrl-chaos/", icon:'<rect x="9" y="9" width="22" height="22" rx="3"/><path d="M15 3v6M25 3v6M15 31v6M25 31v6M3 15h6M3 25h6M31 15h6M31 25h6"/><rect x="15" y="15" width="10" height="10"/>'},
    {title:"ART UNBOUND", subtitle:"ARTE", path:"art-unbound/", icon:'<path d="m25 7 8 8-15 15-8-8z"/><path d="M10 22c-7-1-6 6-7 11 4-1 11 0 11-7"/>'},
    {title:"ECHOS OF INK", subtitle:"ESCRITA", path:"echos-of-ink/", icon:'<path d="M10 27c8-9 15-16 23-17-1 8-8 16-20 22l-3-5Z"/><path d="M12 29c5-5 11-10 16-12"/>'},
    {title:"CURIOSITY CABINET", subtitle:"INFORMAÇÃO", path:"curiosity-cabinet/", icon:'<path d="m20 5 3 12 12 3-12 3-3 12-3-12-12-3 12-3Z"/><circle cx="20" cy="20" r="2"/>'},
    {title:"WAREHOUSE 0613", subtitle:"BTS", path:"warehouse-0613/", icon:'<path d="M5 12h30v5H5zM7 17h26v15H7zM15 23h10"/>'},
    {title:"KOREAN CORNER", subtitle:"HANGUL & CULTURA", path:"korean-corner/", icon:'<path d="M5 18c6-1 10-5 15-12 5 7 9 11 15 12"/><path d="M10 18h20v15H10zM16 18v15M24 18v15"/>'},
    {title:"7 PURPLE SEAS", subtitle:"LOJA", path:"7-purple-seas-loja/", icon:'<path d="M6 26C5 16 10 9 20 8c10 1 15 8 14 18L20 33Z"/><path d="M20 9v19M12 12l6 16M28 12l-6 16"/><circle cx="20" cy="30" r="3"/>'}
  ];
  const current = location.pathname.replace(/index\.html$/, "").replace(/\/+$/, "/");
  const url = p => new URL(p, root).pathname;
  for (const grid of document.querySelectorAll(".seven-nav .seven-grid")) {
    grid.innerHTML = items.map((item, i) => {
      const link = url(item.path);
      const active = current === link || current.startsWith(link);
      const currentAttr = active ? ' aria-current="location"' : "";
      return '<a class="wind-tab" href="' + link + '"' + currentAttr + '><span class="wind-num">' + ["I","II","III","IV","V","VI","VII"][i] + '</span><svg class="wind-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + item.icon + '</svg><span class="wind-label">' + item.title + '</span><small class="wind-sub">' + item.subtitle + '</small></a>';
    }).join("");
    const nav = grid.closest(".seven-nav");
    let utilities = nav.querySelector(".utility-links");
    if (!utilities) {
      utilities = document.createElement("div");
      utilities.className = "utility-links";
      utilities.setAttribute("aria-label", "Páginas institucionais");
      nav.appendChild(utilities);
    }
    utilities.innerHTML = '<a href="' + url("") + '">Início</a><span aria-hidden="true">·</span><a href="' + url("sobre/") + '">Sobre</a>';
  }
})();

document.addEventListener("DOMContentLoaded",()=>{for(const input of document.querySelectorAll("[data-filter]")){input.addEventListener("input",()=>{const term=input.value.trim().toLocaleLowerCase("pt-PT");for(const item of document.querySelectorAll("[data-entry]")){item.hidden=!item.textContent.toLocaleLowerCase("pt-PT").includes(term)}})}const top=document.querySelector(".back-top");if(top){top.hidden=true;const update=()=>{top.hidden=window.scrollY<450};window.addEventListener("scroll",update,{passive:true});update()}});
