// SubTrack — Event Listeners & Init

window.initApp = async () => {
  // loadState now fetches from server; it calls renderAll() itself when done

  // ── show mobile header tools on small screens ──────────────────────
  const updateHeaderTools = () => {
    const isMobile = window.innerWidth <= 767;
    const ht = document.getElementById("header-tools");
    if(ht) ht.style.display = isMobile ? "flex" : "none";
  };
  updateHeaderTools();
  window.addEventListener("resize", updateHeaderTools);

  // wire mobile header icon buttons
  const hdrDark = document.getElementById("hdr-dark");
  const hdrRates = document.getElementById("hdr-rates");
  const hdrShortcuts = document.getElementById("hdr-shortcuts");
  if(hdrDark) hdrDark.onclick = toggleDark;
  if(hdrRates) hdrRates.onclick = openRates;
  if(hdrShortcuts) hdrShortcuts.onclick = openShortcuts;

  // ── view buttons ───────────────────────────────────────────────────
  document.querySelectorAll(".view-btn").forEach(b=>{
    b.onclick = () => setView(b.dataset.view);
  });

  // ── tabs ───────────────────────────────────────────────────────────
  document.getElementById("tabs").addEventListener("click", e=>{
    const t=e.target.closest(".tab"); if(!t) return;
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    STATE.filter=t.dataset.filter;
    renderAll();
  });

  // ── search ─────────────────────────────────────────────────────────
  const q=document.getElementById("q");
  q.addEventListener("input", ()=>{ STATE.query=q.value; renderRows(); renderTabs(); renderCatFilters(); });

  // ── FAB ────────────────────────────────────────────────────────────
  document.getElementById("fab").onclick = () => openPanel(null);

  // ── modal scrim ────────────────────────────────────────────────────
  document.getElementById("modal-scrim").onclick = () => {
    closeShortcuts(); closeRates();
  };

  // ── shortcuts modal wiring ─────────────────────────────────────────
  document.getElementById("close-shortcuts").onclick = closeShortcuts;

  // ── rates modal wiring ─────────────────────────────────────────────
  document.getElementById("close-rates").onclick    = closeRates;
  document.getElementById("save-rates-btn").onclick = saveRates;

  // ── panel inputs ───────────────────────────────────────────────────
  bindPanelInputs();

  // ── footer actions ─────────────────────────────────────────────────
  document.getElementById("export").onclick = () => {
    const cols=["name","plan","cycle","cost","currency","color","status","renews","category","notes","trial","trialEnds","reminder","splitWith","card","cardExpiry"];
    const rows=[cols.join(",")].concat(SUBS.map(s=>cols.map(c=>JSON.stringify(s[c]??'')).join(",")));
    const blob=new Blob([rows.join("\n")],{type:"text/csv"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="subtrack.csv"; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    flashMsg("exported subtrack.csv");
  };

  const fileIn=document.getElementById("import-input");
  document.getElementById("import").onclick = () => fileIn.click();
  fileIn.addEventListener("change", e=>{ const f=e.target.files[0]; if(f) importCSV(f); fileIn.value=""; });

  // ── keyboard shortcuts ─────────────────────────────────────────────
  document.addEventListener("keydown", e=>{
    const tag=document.activeElement.tagName;
    const typing=["INPUT","TEXTAREA","SELECT"].includes(tag);

    if(e.key==="Escape"){
      if(panelOpen()) closePanel();
      else if(document.getElementById("shortcuts-modal").classList.contains("open")) closeShortcuts();
      else if(document.getElementById("rates-modal").classList.contains("open")) closeRates();
      else if(STATE.query){ STATE.query=""; document.getElementById("q").value=""; renderRows(); document.getElementById("q").blur(); }
    } else if(!typing && !panelOpen()){
      if(e.key==="/")                      { e.preventDefault(); document.getElementById("q").focus(); document.getElementById("q").select(); }
      if((e.metaKey||e.ctrlKey)&&e.key==="n"){ e.preventDefault(); openPanel(null); }
      if(e.key==="?")                      { openShortcuts(); }
      if(e.key==="1")                      { setView("list"); }
      if(e.key==="2")                      { setView("chart"); }
      if(e.key==="3")                      { setView("calendar"); }
      if(e.key==="d")                      { toggleDark(); }
    }
  });

  // ── responsive: recalculate visible panes on resize ────────────────
  window.addEventListener("resize", ()=>{
    const isMobile=window.innerWidth<=767;
    const tbl=document.getElementById("tbl-wrap");
    const cards=document.getElementById("cards");
    if(STATE.view==="list"){
      tbl.style.display=isMobile?"none":"";
      cards.style.display=isMobile?"":"none";
    }
  });

  // default view based on viewport
  const isMobile=window.innerWidth<=767;
  document.getElementById("tbl-wrap").style.display=isMobile?"none":"";
  document.getElementById("cards").style.display=isMobile?"":"none";

  // wire sync key copy
  const syncKeyEl = document.getElementById("sync-key-display");
  if (syncKeyEl) {
    syncKeyEl.onclick = () => {
      navigator.clipboard.writeText(getUserKey()).then(() => flashMsg("sync key copied!")).catch(()=>{});
    };
  }

  // loadState fetches from server + calls renderAll when ready
  await loadState();
};

document.addEventListener("DOMContentLoaded", initApp);
