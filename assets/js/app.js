/* 清华生医工教师数据库 · 前端逻辑 */
let CONFIG = {};
let PEOPLE = [];
const state = { q:"", school:"", lab:"", field:"", status:"" };

const $ = (s)=>document.querySelector(s);

const esc = (s)=>String(s==null?"":s).replace(/[&<>"']/g,c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

function initials(name){
  if(!name) return "?";
  const c = name.trim().split(" ");
  if(c.length>1) return (c[0][0]+c[1][0]).toUpperCase();
  // 中文取前两字
  const s=name.trim();
  return s.length<=2 ? s : s.slice(0,2);
}
function avatarHTML(p){
  if(p.photo_url) return `<img class="avatar" src="${esc(p.photo_url)}" alt="${esc(p.name_zh)}" loading="lazy" onerror="this.outerHTML=avatarPh('${esc(p.name_zh)}')">`;
  return avatarPh(p.name_zh);
}
function avatarPh(name){
  return `<div class="avatar avatar-ph" style="background:hsl(${hash(name)%360} 70% 45%)">${esc(initials(name))}</div>`;
}
function hash(s){let h=0;for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0}return Math.abs(h);}

function chip(label,val,group){
  return `<span class="chip" data-group="${group}" data-val="${esc(val)}">${esc(label)}</span>`;
}

function buildChips(){
  // schools
  schoolChips(); labChips(); fieldChips(); statusChips();
}
function schoolChips(){
  const schools = new Set(PEOPLE.map(p=>p.school).filter(Boolean));
  let html = chip("全部","","school") ;
  schools.forEach(s=> html+=chip(s,s,"school"));
  $("#chip-school").innerHTML = html;
}
function labChips(){
  const labs = new Set(PEOPLE.map(p=>p.lab).filter(Boolean));
  let html = chip("全部","","lab");
  labs.forEach(l=> html+=chip(l,l,"lab"));
  $("#chip-lab").innerHTML = html;
}
function fieldChips(){
  const f = new Set();
  PEOPLE.forEach(p=>(p.research_fields||[]).forEach(x=>f.add(x)));
  let html = chip("全部","","field");
  [...f].slice(0,40).forEach(x=> html+=chip(x,x,"field"));
  $("#chip-field").innerHTML = html;
}
function statusChips(){
  const st = [["","全部"],["reviewed","已核实"],["pending","待调研"]];
  $("#chip-status").innerHTML = st.map(([v,l])=>chip(l,v,"status")).join("");
}

function matches(p){
  const q=state.q.trim().toLowerCase();
  if(q){
    const hay=[p.name_zh,p.name_en,p.school,p.lab,(p.research_fields||[]).join(" "),(p.titles||[]).join(" "),p.summary].join(" ").toLowerCase();
    if(!hay.includes(q)) return false;
  }
  if(state.school && p.school!==state.school) return false;
  if(state.lab && p.lab!==state.lab) return false;
  if(state.field && !(p.research_fields||[]).includes(state.field)) return false;
  if(state.status && p.status!==state.status) return false;
  return true;
}

function render(){
  const list = PEOPLE.filter(matches);
  $("#summary").textContent = `共 ${PEOPLE.length} 位教师，当前显示 ${list.length} 位；已核实 ${PEOPLE.filter(p=>p.status==="reviewed").length} 人，待调研 ${PEOPLE.filter(p=>p.status==="pending").length} 人。`;
  $("#empty").hidden = list.length>0;
  $("#grid").innerHTML = list.map(cardHTML).join("");
}
function cardHTML(p){
  const sub = (p.titles||[]).slice(0,3).join(" · ");
  const fields = (p.research_fields||[]).slice(0,4).join(" · ");
  return `<article class="card" data-id="${esc(p.id)}">
    <span class="chev">›</span>
    <div class="card-head">${avatarHTML(p)}
      <div><h3>${esc(p.name_zh||p.id)} <span class="en">${esc(p.name_en||"")}</span></h3>
      <div class="role">${esc(sub||"")}</div></div>
    </div>
    <div class="badges">
      ${p.is_phd_advisor?'<span class="badge phd">博导</span>':''}
      ${p.lab_type?'<span class="badge">'+esc(p.lab_type)+'</span>':''}
      ${p.recruiting_2026?'<span class="badge">2026招生</span>':''}
      <span class="badge st-${esc(p.status)}">${esc((CONFIG.status_labels||{})[p.status]||p.status)}</span>
    </div>
    ${fields?'<div class="fields">'+esc(fields)+'</div>':''}
    <div class="summary">${esc((p.summary||"").slice(0,150))}</div>
    <div class="links">
      ${p.home_url?'<a href="'+esc(p.home_url)+'" target="_blank" rel="noopener">主页</a>':''}
      ${p.group_url?'<a href="'+esc(p.group_url)+'" target="_blank" rel="noopener">课题组</a>':''}
      <a href="teacher.html?id=${encodeURIComponent(p.id)}" class="detail-link">详情</a>
    </div>
  </article>`;
}

function modalContent(p){
  const st = (CONFIG.status_labels||{})[p.status]||p.status;
  let rows = [
    ["姓名", `${esc(p.name_zh)} ${p.name_en?'('+esc(p.name_en)+')':''}`],
    ["性别", esc(p.gender||"—")],
    ["出生/年龄", esc(p.birth_year? p.birth_year+"年" : "未公开") + (p.age_est? " · 约"+esc(p.age_est)+"岁":"")],
    ["单位", esc(p.school||"—") + (p.university? "（"+esc(p.university)+"）":"")],
    ["实验室/平台", esc(p.lab||"—") + (p.lab_type? "（"+esc(p.lab_type)+"）":"")],
    ["头衔", esc((p.titles||[]).join("；")||"—")],
    ["行政职务", esc((p.admin_roles||[]).join("；")||"—")],
    ["博士导师", esc(p.phd_advisor||"待核实")],
    ["教育经历", (p.education||[]).map(e=>(e.stage?esc(e.stage)+"：":"")+(e.years?esc(e.years)+" ":"")+esc(e.school)+" "+(e.major?esc(e.major):"")).join("<br>")||"—"],
    ["是否博导", p.is_phd_advisor?"是":"—"],
    ["2026招生", p.recruiting_2026?"是":"—"],
    ["状态", st],
  ];
  let works = (p.key_works||[]).map(w=>`<div class="work"><div class="wt">${esc(w.title)}</div><div class="meta">${esc(w.venue||"")} · ${esc(w.date||"")}</div>${w.innovation?'<div class="inn">创新点：'+esc(w.innovation)+'</div>':''}</div>`).join("");
  if(!works) works = '<div class="muted">近期代表作待补充。</div>';
  let disruptive = p.disruptive ? `<div class="sec"><h4>0.1 最值得关注的颠覆性技术</h4>
    <p><b>${esc(p.disruptive.tech)}</b></p>
    <p><b>应用场景：</b>${esc(p.disruptive.scenario)}</p>
    <p><b>破解痛点：</b>${esc(p.disruptive.pain)}</p>
    <p><b>技术先进性：</b>${esc(p.disruptive.advance)}</p></div>` : "";
  return `<h2>${esc(p.name_zh)} <span style="color:var(--muted);font-weight:400">${esc(p.name_en||"")}</span></h2>
    <div class="badges">${p.is_phd_advisor?'<span class="badge phd">博导</span>':''}${p.recruiting_2026?'<span class="badge">2026招生</span>':''}<span class="badge st-${esc(p.status)}">${st}</span></div>
    ${p.summary?'<p style="margin-top:10px">'+esc(p.summary)+'</p>':''}
    ${disruptive}
    <div class="sec"><h4>基本信息</h4><table class="mtable">${rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join("")}</table></div>
    <div class="sec"><h4>近期代表作</h4>${works}</div>
    <div class="sec"><h4>头衔与荣誉</h4><p>${esc((p.honors||[]).join("；")||"—")}</p></div>
    <div class="sec"><h4>数据来源</h4><p style="font-size:12px;color:var(--muted)">${(p.sources||[]).map(s=>'<a href="'+esc(s)+'" target="_blank" rel="noopener">'+esc(s)+'</a>').join("<br>")||"—"}</p></div>`;
}


function bindChips(){
  document.querySelectorAll("#filters .chip").forEach(c=>{
    c.addEventListener("click",()=>{
      const g=c.getAttribute("data-group"), v=c.getAttribute("data-val");
      if(v){ state[g]=state[g]===v?"":v; } else { state[g]=""; }
      document.querySelectorAll("#filters .chip[data-group='"+g+"']").forEach(x=>x.classList.toggle("active", x.getAttribute("data-val")===state[g] && state[g]!==""));
      render();
    });
  });
}
function exportJSON(){
  const blob=new Blob([JSON.stringify(PEOPLE,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="bme-professors.json";a.click();
}

async function init(){
  async function loadJSON(url, gv){
    try{ const r = await fetch(url); if(!r.ok) throw new Error(r.status); return await r.json(); }
    catch(e){ return window[gv]; }   // file:// 下 fetch 会被拦截，回退到 index.html 内联的 window.__CONFIG__/__DATA__
  }
  try{
    CONFIG = await loadJSON("config.json", "__CONFIG__");
    PEOPLE = await loadJSON("data/index.json", "__DATA__");
    if(!CONFIG || !PEOPLE) throw new Error("no data");
  }catch(e){ console.error(e); $("#empty").hidden=false; $("#empty").textContent="数据加载失败："+e.message; return; }
  $("#site-title").textContent = CONFIG.site_title;
  $("#site-desc").textContent = CONFIG.site_desc;
  $("#footer").textContent = CONFIG.footer;
  buildChips(); bindChips(); render();
  $("#search").addEventListener("input",e=>{state.q=e.target.value;render();});
  $("#btn-export").addEventListener("click",exportJSON);

}
document.addEventListener("DOMContentLoaded",init);
