// SubTrack — Chart & Calendar Views

// ── chart (12-month projected spend bar chart) ─────────────────────────
window.renderChart = () => {
  const el = document.getElementById("chart-section"); if(!el) return;
  const active = SUBS.filter(s=>s.status==="active");

  // build 12 monthly buckets from today
  const buckets = Array.from({length:12}, (_,i)=>{
    const d = new Date(TODAY.getFullYear(), TODAY.getMonth()+i, 1);
    return { label: ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"][d.getMonth()]
             + (d.getFullYear()!==TODAY.getFullYear()?"'"+String(d.getFullYear()).slice(2):""),
             month: d.getMonth(), year: d.getFullYear(), total: 0, renewals: [] };
  });

  active.forEach(s=>{
    const m = monthlyTHB(s);
    buckets.forEach(b => b.total += m);
    // mark renewal month
    if(s.renews){
      const r = parseDate(s.renews);
      const bi = buckets.findIndex(b=>b.month===r.getMonth()&&b.year===r.getFullYear());
      if(bi>=0) buckets[bi].renewals.push(s.name);
    }
  });

  const max = Math.max(...buckets.map(b=>b.total), 1);
  const W=520, H=120, BAR=32, GAP=6, PAD=28;
  const totalW = buckets.length*(BAR+GAP)-GAP + PAD*2;

  const bars = buckets.map((b,i)=>{
    const bh = Math.max(3, Math.round((b.total/max)*(H-20)));
    const x = PAD + i*(BAR+GAP);
    const y = H - bh;
    const isCurrent = i===0;
    const hasRenew = b.renewals.length>0;
    return `
      <rect x="${x}" y="${y}" width="${BAR}" height="${bh}"
        fill="${isCurrent?"var(--fg)":"var(--bar-fill)"}" rx="2"
        class="bar-rect" data-tip="${b.label}: ${fmt(b.total)}${hasRenew?" · "+b.renewals.slice(0,2).join(", ")+( b.renewals.length>2?" +more":""):""}" />
      ${hasRenew?`<circle cx="${x+BAR/2}" cy="${y-6}" r="3" fill="var(--red)" />`:""}
      <text x="${x+BAR/2}" y="${H+14}" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="inherit">${b.label}</text>
    `;
  }).join("");

  // y-axis labels
  const yLabels = [0, 0.5, 1].map(pct=>{
    const val = max * pct;
    const y = H - Math.round(pct*(H-20));
    return `<text x="${PAD-4}" y="${y+4}" text-anchor="end" font-size="10" fill="var(--muted-2)" font-family="inherit">${fmt(val)}</text>
            <line x1="${PAD}" y1="${y}" x2="${totalW-PAD/2}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`;
  }).join("");

  el.innerHTML = `
    <div class="chart-head">
      <span class="chart-title">projected monthly spend</span>
      <span class="chart-sub">next 12 months · active only · red dots = renewals</span>
    </div>
    <div style="overflow-x:auto">
      <svg viewBox="0 0 ${totalW} ${H+24}" width="${totalW}" height="${H+24}" id="chart-svg" style="display:block">
        ${yLabels}
        ${bars}
      </svg>
    </div>
  `;

  // tooltip
  el.querySelectorAll(".bar-rect").forEach(r=>{
    r.addEventListener("mouseenter", e=>{
      const tip=document.createElement("div");
      tip.className="chart-tip"; tip.textContent=r.dataset.tip;
      tip.style.cssText=`position:fixed;left:${e.clientX+10}px;top:${e.clientY-6}px;pointer-events:none`;
      tip.id="chart-tip"; document.body.appendChild(tip);
    });
    r.addEventListener("mousemove", e=>{ const t=document.getElementById("chart-tip"); if(t){t.style.left=e.clientX+10+"px";t.style.top=e.clientY-6+"px";}});
    r.addEventListener("mouseleave", ()=>{ const t=document.getElementById("chart-tip"); if(t) t.remove(); });
  });
};

// ── calendar (12-month renewal overview grid) ─────────────────────────
window.renderCalendar = () => {
  const el = document.getElementById("calendar-section"); if(!el) return;

  const months = Array.from({length:12}, (_,i)=>{
    const d = new Date(TODAY.getFullYear(), TODAY.getMonth()+i, 1);
    return { month:d.getMonth(), year:d.getFullYear(),
      label: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]+" "+d.getFullYear() };
  });

  const html = months.map(m=>{
    const subs = SUBS.filter(s=>{
      if(!s.renews) return false;
      const r=parseDate(s.renews);
      return r.getMonth()===m.month && r.getFullYear()===m.year;
    });
    // actual cash out this month: monthly subs → monthly cost, annual → annual cost
    const actualCost = s => s.cycle==="annual" ? annualTHB(s) : monthlyTHB(s);
    const total = subs.reduce((t,s)=>t+(s.status==="active"?actualCost(s):0),0);
    const isCurrent = m.month===TODAY.getMonth()&&m.year===TODAY.getFullYear();
    return `<div class="cal-month ${isCurrent?"current":""}">
      <div class="cal-head">
        <span class="cal-label">${m.label}</span>
        ${total>0?`<span class="cal-total">${fmt(total)}</span>`:""}
      </div>
      ${subs.length
        ? subs.map(s=>`<div class="cal-sub ${s.status==="paused"?"paused":""}" title="${escapeHTML(s.name)}">
            <span class="cal-dot" style="background:${s.color}"></span>
            <span class="cal-name">${escapeHTML(s.name)}</span>
            <span class="cal-cost">${fmt(actualCost(s))}/${s.cycle==="annual"?"yr":"mo"}</span>
          </div>`).join("")
        : `<div class="cal-empty">—</div>`
      }
    </div>`;
  }).join("");

  el.innerHTML = `
    <div class="chart-head">
      <span class="chart-title">renewal calendar</span>
      <span class="chart-sub">all subscriptions · next 12 months</span>
    </div>
    <div class="cal-grid">${html}</div>
  `;
};

// ── view toggle ───────────────────────────────────────────────────────
window.setView = v => {
  STATE.view = v;
  const tbl  = document.getElementById("tbl-wrap");
  const cards= document.getElementById("cards");
  const chart= document.getElementById("chart-section");
  const cal  = document.getElementById("calendar-section");
  const isMobile = window.innerWidth <= 767;

  tbl.style.display  = (v==="list"&&!isMobile) ? "" : "none";
  cards.style.display= (v==="list"&&isMobile)  ? "" : "none";
  chart.style.display= v==="chart"   ? "" : "none";
  cal.style.display  = v==="calendar"? "" : "none";

  document.querySelectorAll(".view-btn").forEach(b=>b.classList.toggle("active", b.dataset.view===v));

  if(v==="chart")    renderChart();
  if(v==="calendar") renderCalendar();
  if(v==="list")     renderRows();
};
