// SubTrack — Render Layer

window.renderAll = () => {
  renderStats();
  renderTabs();
  renderCatFilters();
  renderRows();
  renderFooter();
  if(STATE.view==="chart")    renderChart();
  if(STATE.view==="calendar") renderCalendar();
};

// ── stats bar ─────────────────────────────────────────────────────────
window.renderStats = () => {
  const active = SUBS.filter(s=>s.status==="active");
  const m = active.reduce((t,s)=>t+monthlyTHB(s),0);
  const a = active.reduce((t,s)=>t+annualTHB(s),0);
  const over = BUDGET>0 && m>BUDGET;
  document.getElementById("stats").innerHTML = `
    <div class="stat" id="stat-monthly" title="click to set budget" style="cursor:pointer">
      <span class="lbl">monthly</span>
      <span class="val ${over?"over":""}">${fmt(m)}</span>
      ${BUDGET>0?`<span class="sub ${over?"over":""}">${over?"over ":""}฿${fmtRaw(BUDGET)} cap</span>`:`<span class="sub">/mo</span>`}
    </div>
    <div class="sep"></div>
    <div class="stat"><span class="lbl">annual</span><span class="val">${fmt(a)}</span><span class="sub">/yr</span></div>
    <div class="sep"></div>
    <div class="stat"><span class="lbl">active</span><span class="val">${active.length}</span><span class="sub">subs</span></div>
    <div class="sep"></div>
    <button class="icon-tool" id="btn-dark" title="toggle dark mode">◐</button>
    <button class="icon-tool" id="btn-rates" title="exchange rates">₿</button>
    <button class="icon-tool" id="btn-shortcuts" title="keyboard shortcuts">?</button>
  `;
  document.getElementById("btn-dark").onclick  = toggleDark;
  document.getElementById("btn-rates").onclick = openRates;
  document.getElementById("stat-monthly").onclick = openBudget;
};

// ── tabs ──────────────────────────────────────────────────────────────
window.renderTabs = () => {
  document.getElementById("c-all").textContent    = SUBS.length;
  document.getElementById("c-active").textContent = SUBS.filter(s=>s.status==="active").length;
  document.getElementById("c-paused").textContent = SUBS.filter(s=>s.status==="paused").length;
};

// ── category filters ──────────────────────────────────────────────────
window.renderCatFilters = () => {
  const el = document.getElementById("cat-filters");
  const used = [...new Set(SUBS.map(s=>s.category).filter(Boolean))];
  if(!used.length){ el.innerHTML=""; el.style.display="none"; return; }
  el.style.display="flex";
  el.innerHTML = used.map(cid => {
    const cat = catById(cid); if(!cat) return "";
    const on = STATE.catFilter===cid;
    return `<button class="cat-chip ${on?"on":""}" data-cat="${cid}" style="${on?`background:${cat.bg};color:${cat.fg};border-color:${cat.fg}`:""}">
      ${cat.label} <span class="cat-count">${SUBS.filter(s=>s.category===cid).length}</span>
    </button>`;
  }).join("");
  el.querySelectorAll(".cat-chip").forEach(b=>{
    b.onclick = () => { STATE.catFilter = STATE.catFilter===b.dataset.cat?"":b.dataset.cat; renderAll(); };
  });
};

// ── table rows ────────────────────────────────────────────────────────
window.renderRows = () => {
  const list = visibleSubs();
  const tbody = document.getElementById("rows");
  const cardsEl = document.getElementById("cards");
  if(!list.length){
    tbody.innerHTML=`<tr><td colspan="6" class="empty">no subscriptions match. press <span class="key">esc</span> to clear.</td></tr>`;
    cardsEl.innerHTML=`<div class="empty">no subscriptions match.</div>`;
    return;
  }
  tbody.innerHTML = list.map(rowHTML).join("");
  cardsEl.innerHTML = list.map(cardHTML).join("");
  wireRows(tbody);
  wireCards(cardsEl);
  wireRowDrag(tbody);
};

function badges(s){
  let b="";
  if(s.trial) b+=`<span class="badge trial">trial</span>`;
  if(s.reminder>0){ const d=daysBetween(TODAY,parseDate(s.renews)); if(d>=0&&d<=s.reminder) b+=`<span class="badge remind">!${d}d</span>`; }
  if(s.splitWith>1) b+=`<span class="badge split">÷${s.splitWith}</span>`;
  return b;
}

function catChip(s){
  const cat=catById(s.category); if(!cat) return "";
  return `<span class="cat-inline" style="background:${cat.bg};color:${cat.fg}">${cat.label}</span>`;
}

window.rowHTML = s => {
  const renew=parseDate(s.renews), days=daysBetween(TODAY,renew);
  const due=days>=0&&days<=7&&s.status==="active";
  const m=monthlyTHB(s), a=annualTHB(s);
  const mCell=s.cycle==="annual"?`<span class="secondary">${fmt(m)}</span>`:`<span class="strong">${fmt(m)}</span>`;
  const aCell=s.cycle==="annual"?`<span class="strong">${fmt(a)}</span>`:`<span class="secondary">${fmt(a)}</span>`;
  const curBadge=s.currency!=="THB"?`<span class="cur-tag">${s.currency}</span>`:"";
  return `<tr class="${s.status==="paused"?"paused":""}" data-id="${s.id}" draggable="true">
    <td class="drag-handle" title="drag to reorder">⠿</td>
    <td class="col-name">
      <div class="name-cell">
        <span class="dot" style="background:${s.color}"></span>
        <span class="label">${escapeHTML(s.name)}</span>
        ${s.plan?`<span class="meta">· ${escapeHTML(s.plan)}</span>`:""}
        ${catChip(s)}${badges(s)}
        ${s.card?`<span class="meta" style="margin-left:4px">· ${escapeHTML(s.card)}</span>`:""}
      </div>
    </td>
    <td class="col-cycle"><span class="cycle ${s.cycle==="annual"?"annual":""}">${s.cycle}</span></td>
    <td class="num col-monthly">${mCell}${curBadge}</td>
    <td class="num col-annual-cell">${aCell}</td>
    <td class="col-renew">
      <div class="renew ${due?"due":""}">
        <span class="date">${fmtDate(renew)}</span>
        <span class="rel">${relDate(renew)}</span>
      </div>
    </td>
    <td class="col-card-exp">
      ${cardExpiresBefore(s.cardExpiry, s.renews)
        ? `<span class="badge card-exp" title="card expires ${s.cardExpiry} — before next renewal">exp ${s.cardExpiry}</span>`
        : s.cardExpiry ? `<span style="font-size:11px;color:var(--muted-2)">${s.cardExpiry}</span>` : ""}
    </td>
    <td>
      <div class="actions">
        <button class="act" data-act="edit">edit</button>
        <button class="act" data-act="dupe">dupe</button>
        <button class="act" data-act="pause">${s.status==="paused"?"resume":"pause"}</button>
        <button class="act danger" data-act="del">del</button>
      </div>
    </td>
  </tr>`;
};

window.cardHTML = s => {
  const renew=parseDate(s.renews), days=daysBetween(TODAY,renew);
  const due=days>=0&&days<=7&&s.status==="active";
  const m=monthlyTHB(s);
  return `<div class="card ${s.status==="paused"?"paused":""} ${due?"due":""}" data-id="${s.id}">
    <span class="c-dot" style="background:${s.color}"></span>
    <div class="c-name">${escapeHTML(s.name)}${badges(s)}</div>
    <div class="c-cost">${fmt(m)}<span class="per">/mo</span></div>
    <div class="c-meta">
      <span>${s.cycle}</span>
      ${s.category?`<span class="midot">·</span><span>${catById(s.category)?.label||""}</span>`:""}
      ${s.currency!=="THB"?`<span class="midot">·</span><span class="cur-tag">${s.currency}</span>`:""}
      ${s.card?`<span class="midot">·</span><span>${escapeHTML(s.card)}</span>`:""}
    </div>
    <div class="c-renew"><span>${fmtDate(renew)} · ${relDate(renew)}</span></div>
  </div>`;
};

function wireRows(tbody){
  tbody.querySelectorAll("tr[data-id]").forEach(tr=>{
    const id=tr.dataset.id;
    tr.querySelectorAll(".act").forEach(b=>{
      b.onclick = e => { e.stopPropagation(); handleAct(b.dataset.act, id); };
    });
    tr.addEventListener("click", e=>{ if(!e.target.closest(".act")&&!e.target.closest(".drag-handle")) openPanel(id); });
  });
}

function wireCards(cardsEl){
  cardsEl.querySelectorAll(".card[data-id]").forEach(c=>{
    c.addEventListener("click", ()=>openPanel(c.dataset.id));
  });
}

window.handleAct = (act, id) => {
  const sub=SUBS.find(x=>x.id===id); if(!sub) return;
  if(act==="edit")  { openPanel(id); }
  else if(act==="pause") { sub.status=sub.status==="paused"?"active":"paused"; persist(); renderAll(); }
  else if(act==="del")   { if(confirm(`Delete "${sub.name}"?`)){ SUBS.splice(SUBS.indexOf(sub),1); persist(); renderAll(); } }
  else if(act==="dupe")  { const copy=normSub({...sub,id:uid(),name:sub.name+" (copy)"}); SUBS.splice(SUBS.indexOf(sub)+1,0,copy); persist(); renderAll(); }
};

// ── drag to reorder ───────────────────────────────────────────────────
window.wireRowDrag = tbody => {
  let dragId=null;
  tbody.querySelectorAll("tr[data-id]").forEach(tr=>{
    tr.addEventListener("dragstart", e=>{ dragId=tr.dataset.id; tr.classList.add("dragging"); e.dataTransfer.effectAllowed="move"; });
    tr.addEventListener("dragend",   ()=>{ tr.classList.remove("dragging"); dragId=null; });
    tr.addEventListener("dragover",  e=>{ e.preventDefault(); e.dataTransfer.dropEffect="move"; tr.classList.add("drag-over"); });
    tr.addEventListener("dragleave", ()=>tr.classList.remove("drag-over"));
    tr.addEventListener("drop", e=>{ e.preventDefault(); tr.classList.remove("drag-over");
      if(!dragId||dragId===tr.dataset.id) return;
      const from=SUBS.findIndex(s=>s.id===dragId), to=SUBS.findIndex(s=>s.id===tr.dataset.id);
      if(from>=0&&to>=0){ const [item]=SUBS.splice(from,1); SUBS.splice(to,0,item); persist(); renderRows(); }
    });
  });
};

// ── footer ────────────────────────────────────────────────────────────
window.renderFooter = () => {
  const dueSoon=SUBS.filter(s=>s.status==="active"&&daysBetween(TODAY,parseDate(s.renews))>=0&&daysBetween(TODAY,parseDate(s.renews))<=30).length;
  document.getElementById("foot-msg").textContent=`${dueSoon} renewal${dueSoon===1?"":"s"} due in 30 days`;
  document.getElementById("pulse").style.opacity=dueSoon?1:0;
};
