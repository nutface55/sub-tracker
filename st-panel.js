// SubTrack — Panel & Modals

// ── draft state ───────────────────────────────────────────────────────
const draft = {
  id:null, name:"", plan:"", cycle:"monthly", cost:"",
  color:PALETTE[0], renews:"", status:"active",
  category:"", notes:"", trial:false, trialEnds:"",
  reminder:0, splitWith:1, currency:"THB", priceHistory:[],
};

// ── panel open/close ──────────────────────────────────────────────────
window.panelOpen = () => document.getElementById("panel").classList.contains("open");

window.openPanel = id => {
  const panel=document.getElementById("panel"), scrim=document.getElementById("scrim");
  const isNew=!id;
  if(id){
    const s=SUBS.find(x=>x.id===id); if(!s) return;
    Object.assign(draft,{...s});
  } else {
    const nextMonth=new Date(TODAY.getFullYear(),TODAY.getMonth()+1,TODAY.getDate());
    Object.assign(draft,{id:null,name:"",plan:"",cycle:"monthly",cost:"",color:PALETTE[0],
      renews:toISO(nextMonth),status:"active",category:"",notes:"",
      trial:false,trialEnds:"",reminder:0,splitWith:1,currency:"THB",priceHistory:[]});
  }
  document.getElementById("panel-title").textContent = isNew ? "new subscription" : "edit subscription";
  document.getElementById("panel-sub").textContent   = isNew ? "" : "· "+draft.name;
  document.getElementById("btn-delete").style.display = isNew ? "none" : "";
  populatePanel();
  panel.classList.add("open"); scrim.classList.add("open");
  panel.setAttribute("aria-hidden","false");
  setTimeout(()=>document.getElementById("i-name").focus(), 220);
};

window.closePanel = () => {
  const panel=document.getElementById("panel"), scrim=document.getElementById("scrim");
  panel.classList.remove("open"); scrim.classList.remove("open");
  panel.setAttribute("aria-hidden","true");
};

// ── populate form fields ──────────────────────────────────────────────
function populatePanel(){
  document.getElementById("i-name").value    = draft.name;
  document.getElementById("i-plan").value    = draft.plan;
  document.getElementById("i-cost").value    = draft.cost;
  document.getElementById("i-renew").value   = draft.renews;
  document.getElementById("i-card").value        = draft.card||"";
  document.getElementById("i-card-expiry").value = draft.cardExpiry||"";
  document.getElementById("i-notes").value   = draft.notes||"";
  document.getElementById("i-reminder").value= draft.reminder||0;
  document.getElementById("i-split").value   = draft.splitWith||1;
  document.getElementById("i-trial-end").value = draft.trialEnds||"";
  document.getElementById("i-trial-end").closest(".trial-end-row").style.display = draft.trial?"":"none";

  // cycle seg
  document.querySelectorAll(".seg-cycle btn, #seg-cycle button").forEach(b=>b.classList.toggle("on", b.dataset.cycle===draft.cycle));
  document.getElementById("cost-label").textContent = draft.cycle==="monthly" ? "monthly cost" : "annual cost";

  // currency select
  document.getElementById("i-currency").value = draft.currency||"THB";

  // trial toggle
  document.getElementById("i-trial").checked = draft.trial;

  // color swatches
  buildSwatches();
  setColor(draft.color, false);

  // category
  document.getElementById("i-category").value = draft.category||"";

  // price history
  renderPriceHistory();

  // clear errors
  ["f-name","f-cost","f-renew"].forEach(id=>document.getElementById(id).classList.remove("invalid"));

  refreshPreview();
}

// ── color swatches ────────────────────────────────────────────────────
function buildSwatches(){
  const el=document.getElementById("colors");
  el.innerHTML = PALETTE.map(c=>`<button type="button" class="swatch" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join("")
    + `<label class="swatch custom" title="custom"><input type="color" id="i-color" value="${draft.color}" /></label>`;
  el.querySelectorAll(".swatch[data-color]").forEach(b=>b.onclick=()=>setColor(b.dataset.color));
  document.getElementById("i-color").addEventListener("input", e=>setColor(e.target.value));
}

window.setColor = (c, rebuild=false) => {
  draft.color = c;
  if(rebuild) buildSwatches();
  document.querySelectorAll("#colors .swatch[data-color]").forEach(b=>b.classList.toggle("on", b.dataset.color===c));
  refreshPreview();
};

// ── preview ───────────────────────────────────────────────────────────
window.refreshPreview = () => {
  const name=(draft.name||"untitled").trim();
  const cost=parseFloat(draft.cost)||0;
  const thb=toTHB(draft.cycle==="monthly"?cost:cost/12, draft.currency||"THB")/(draft.splitWith||1);
  let ren="—";
  if(draft.renews){ try{ ren=`${fmtDate(parseDate(draft.renews))} · ${relDate(parseDate(draft.renews))}`; }catch{} }
  document.getElementById("preview").innerHTML = `
    <span class="pdot" style="background:${draft.color}"></span>
    <span class="pname">${escapeHTML(name)}</span>
    ${draft.plan?`<span class="meta">· ${escapeHTML(draft.plan)}</span>`:""}
    <span class="pmeta">${fmt(thb)}/mo · ${ren}</span>
  `;
};

// ── price history ─────────────────────────────────────────────────────
function renderPriceHistory(){
  const el=document.getElementById("price-history"); if(!el) return;
  const hist=(draft.priceHistory||[]).slice(-5).reverse();
  if(!hist.length){ el.innerHTML=`<span style="color:var(--muted-2)">no changes recorded</span>`; return; }
  el.innerHTML=hist.map(h=>`<div class="hist-row"><span class="hist-date">${h.date}</span><span class="hist-val">${h.currency||"THB"} ${h.cost}</span></div>`).join("");
}

// ── live input binding ────────────────────────────────────────────────
window.bindPanelInputs = () => {
  const bind = (id, key) => {
    const el=document.getElementById(id); if(!el) return;
    el.addEventListener("input", ()=>{ draft[key]=el.value; refreshPreview(); });
  };
  bind("i-name","name"); bind("i-plan","plan");
  bind("i-cost","cost"); bind("i-notes","notes"); bind("i-card","card");

  // auto-format card expiry as MM/YY
  document.getElementById("i-card-expiry").addEventListener("input", e => {
    let v = e.target.value.replace(/\D/g,"");
    if (v.length >= 3) v = v.slice(0,2) + "/" + v.slice(2,4);
    e.target.value = v;
    draft.cardExpiry = v;
  });

  document.getElementById("i-reminder").addEventListener("input", e=>draft.reminder=Number(e.target.value)||0);
  document.getElementById("i-split").addEventListener("input", e=>{ draft.splitWith=Math.max(1,Number(e.target.value)||1); refreshPreview(); });
  document.getElementById("i-renew").addEventListener("input", e=>{ draft.renews=e.target.value; refreshPreview(); });
  document.getElementById("i-trial-end").addEventListener("input", e=>draft.trialEnds=e.target.value);
  document.getElementById("i-trial").addEventListener("change", e=>{
    draft.trial=e.target.checked;
    document.getElementById("i-trial-end").closest(".trial-end-row").style.display=draft.trial?"":"none";
  });
  document.getElementById("i-category").addEventListener("change", e=>draft.category=e.target.value);
  document.getElementById("i-currency").addEventListener("change", e=>{ draft.currency=e.target.value; document.getElementById("cost-label").textContent=draft.cycle==="monthly"?"monthly cost":"annual cost"; refreshPreview(); });

  document.getElementById("seg-cycle").querySelectorAll("button").forEach(b=>{
    b.onclick=()=>{
      document.getElementById("seg-cycle").querySelectorAll("button").forEach(x=>x.classList.remove("on"));
      b.classList.add("on"); draft.cycle=b.dataset.cycle;
      document.getElementById("cost-label").textContent=draft.cycle==="monthly"?"monthly cost":"annual cost";
      refreshPreview();
    };
  });

  document.getElementById("btn-save").onclick   = savePanel;
  document.getElementById("btn-cancel").onclick  = closePanel;
  document.getElementById("btn-delete").onclick  = deleteFromPanel;
  document.getElementById("scrim").onclick       = closePanel;
  document.getElementById("close-panel").onclick = closePanel;

  document.getElementById("panel").addEventListener("keydown", e=>{
    if(e.key==="Enter"&&e.target.tagName!=="TEXTAREA"){ e.preventDefault(); savePanel(); }
  });
};

// ── save ──────────────────────────────────────────────────────────────
function savePanel(){
  let ok=true;
  if(!document.getElementById("i-name").value.trim()){ document.getElementById("f-name").classList.add("invalid"); ok=false; } else document.getElementById("f-name").classList.remove("invalid");
  const cost=parseFloat(document.getElementById("i-cost").value);
  if(!(cost>0)){ document.getElementById("f-cost").classList.add("invalid"); ok=false; } else document.getElementById("f-cost").classList.remove("invalid");
  if(!document.getElementById("i-renew").value){ document.getElementById("f-renew").classList.add("invalid"); ok=false; } else document.getElementById("f-renew").classList.remove("invalid");
  if(!ok) return;

  // record price history if cost changed
  const oldSub=SUBS.find(s=>s.id===draft.id);
  const hist=[...(draft.priceHistory||[])];
  if(oldSub && (oldSub.cost!==cost || oldSub.currency!==draft.currency)){
    hist.push({date:toISO(TODAY), cost:oldSub.cost, currency:oldSub.currency||"THB"});
  }

  const payload={
    id:draft.id||uid(),
    name:document.getElementById("i-name").value.trim(),
    plan:document.getElementById("i-plan").value.trim(),
    cycle:draft.cycle, cost, color:draft.color,
    renews:document.getElementById("i-renew").value,
    status:draft.status||"active",
    category:draft.category||"",
    notes:document.getElementById("i-notes").value.trim(),
    trial:document.getElementById("i-trial").checked,
    trialEnds:document.getElementById("i-trial-end").value,
    reminder:Number(document.getElementById("i-reminder").value)||0,
    splitWith:Math.max(1,Number(document.getElementById("i-split").value)||1),
    currency:document.getElementById("i-currency").value||"THB",
    card:document.getElementById("i-card").value.trim(),
    cardExpiry:document.getElementById("i-card-expiry").value.trim(),
    priceHistory:hist,
  };

  if(draft.id){ const i=SUBS.findIndex(s=>s.id===draft.id); if(i>=0) SUBS[i]=payload; flashMsg("updated · "+payload.name); }
  else { SUBS.unshift(payload); flashMsg("added · "+payload.name); }
  persist(); renderAll(); closePanel();
}

function deleteFromPanel(){
  if(!draft.id) return;
  const sub=SUBS.find(s=>s.id===draft.id); if(!sub) return;
  if(confirm(`Delete "${sub.name}"?`)){ SUBS.splice(SUBS.indexOf(sub),1); persist(); renderAll(); closePanel(); }
}

// ── flash message ─────────────────────────────────────────────────────
let _flashT;
window.flashMsg = msg => {
  const el=document.getElementById("foot-msg"); if(!el) return;
  const orig=el.textContent; el.textContent=msg; el.style.color="var(--fg)";
  clearTimeout(_flashT);
  _flashT=setTimeout(()=>{ el.textContent=orig; el.style.color=""; }, 1800);
};

// ── shortcuts modal ───────────────────────────────────────────────────
window.openShortcuts = () => {
  document.getElementById("shortcuts-modal").classList.add("open");
  document.getElementById("modal-scrim").classList.add("open");
};
window.closeShortcuts = () => {
  document.getElementById("shortcuts-modal").classList.remove("open");
  document.getElementById("modal-scrim").classList.remove("open");
};

// ── budget modal ──────────────────────────────────────────────────────
window.openBudget = () => {
  const v=prompt("Monthly budget in THB (0 to clear):", BUDGET||"");
  if(v===null) return;
  BUDGET=Math.max(0,parseFloat(v)||0);
  persist(); renderStats();
};

// ── exchange rates modal ──────────────────────────────────────────────
window.openRates = () => {
  const modal=document.getElementById("rates-modal"), scrim=document.getElementById("modal-scrim");
  // populate fields
  Object.keys(CURRENCY_BASE).forEach(cur=>{
    const el=document.getElementById("rate-"+cur); if(el) el.value=RATES[cur]||CURRENCY_BASE[cur];
  });
  modal.classList.add("open"); scrim.classList.add("open");
};
window.closeRates = () => {
  document.getElementById("rates-modal").classList.remove("open");
  document.getElementById("modal-scrim").classList.remove("open");
};
window.saveRates = () => {
  Object.keys(CURRENCY_BASE).forEach(cur=>{
    const el=document.getElementById("rate-"+cur); if(!el) return;
    const v=parseFloat(el.value); if(v>0) RATES[cur]=v;
  });
  persist(); renderAll(); closeRates();
};

// ── dark mode ─────────────────────────────────────────────────────────
window.toggleDark = () => {
  STATE.dark=!STATE.dark;
  const root=document.getElementById("root");
  if(STATE.dark) root.setAttribute("data-dark","1");
  else root.removeAttribute("data-dark");
  persist();
};

// ── import CSV ────────────────────────────────────────────────────────
window.importCSV = file => {
  const reader=new FileReader();
  reader.onload=e=>{
    const lines=e.target.result.split("\n").filter(Boolean);
    if(lines.length<2){ flashMsg("import failed — no data rows"); return; }
    const headers=lines[0].split(",").map(h=>h.replace(/^"|"$/g,"").trim());
    let added=0;
    lines.slice(1).forEach(line=>{
      const vals=line.match(/(".*?"|[^,]+)(?=,|$)/g)||[];
      const obj={}; headers.forEach((h,i)=>{ obj[h]=(vals[i]||"").replace(/^"|"$/g,""); });
      if(!obj.name) return;
      SUBS.push(normSub({...obj,cost:parseFloat(obj.cost)||0}));
      added++;
    });
    persist(); renderAll(); flashMsg(`imported ${added} subscription${added===1?"":"s"}`);
  };
  reader.readAsText(file);
};
