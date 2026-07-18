/* ═══════════════════════════════════════════════════════════════
   HomeMining · Calculator 页逻辑
   规范：docs/01（数据条）、docs/02（输入/输出/公式/判词/类比）
   全部前端计算；数据分母 = DataHub.state.hashrateEH（铁律3）
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── 单位换算（→ TH/s） ── */
const UNIT_TO_TH = { 'MH/s':1e-6, 'GH/s':1e-3, 'TH/s':1, 'PH/s':1e3, 'EH/s':1e6 };
const DUR_TO_DAYS = { 'Days':1, 'Weeks':7, 'Months':30.44, 'Years':365.25 };
const BLOCKS_PER_DAY = 144;

/* ── 现实类比对照表（02 文档 §五：10 档，全部原创可验证） ── */
const PERSPECTIVES = [
  {n:3.5e14, text:'Winning the Powerball jackpot <b>and</b> being struck by lightning in the same year', odds:'1 in 350 trillion'},
  {n:1.1e12, text:'Flipping a coin and landing heads forty times in a row', odds:'1 in 1.1 trillion'},
  {n:1.6e11, text:'Being dealt all thirteen spades in a hand of bridge', odds:'1 in 159 billion'},
  {n:8.2e9,  text:'A stranger drawing your name from a hat holding everyone on Earth', odds:'1 in 8.2 billion'},
  {n:2.9e8,  text:'Winning the US Powerball jackpot on a single ticket', odds:'1 in 292 million'},
  {n:1.3e7,  text:'A natural identical-quadruplet birth', odds:'about 1 in 13 million'},
  {n:1.2e6,  text:'Being struck by lightning sometime this year', odds:'about 1 in 1.2 million'},
  {n:6.5e5,  text:'Being dealt a royal flush in your first five cards', odds:'1 in 649,740'},
  {n:1.25e4, text:'An amateur golfer sinking a hole-in-one', odds:'about 1 in 12,500'},
  {n:1e2,    text:'A random stranger turning out to be a natural redhead', odds:'about 1 in 100'}
];

/* ── 判词（02 文档定稿：SoloBlocks 原文、去表情、{pct} 动态） ── */
function verdict(pct){
  const p = pct.toFixed(pct < 10 ? 1 : 0);
  /* 2026-07-16 文案微调：em-dash 全站清除（Taste Skill 9.G），语义不变 */
  if (pct < 50)   return {badge:'EARLY',                 text:`You're only ${p}% into your expected wait. Still very early. Keep mining!`};
  if (pct <= 100) return {badge:Math.round(pct) + '%',   text:`At ${p}% of expected wait. Within normal range, you're on track.`};
  if (pct <= 200) return {badge:Math.round(pct) + '%',   text:`At ${p}% of expected wait. Past average, but normal variance. Every hash has equal odds.`};
  return           {badge:Math.round(pct) + '%',         text:`${p}% of expected wait. Very unlucky statistically, but the next hash is always a fresh lottery ticket.`};
}

/* ── DOM ── */
const $ = id => document.getElementById(id);
let lastInput = null;            /* 记住上次计算的输入，数据刷新时重算（铁律3） */

/* ═════════ 数据条渲染（4 张卡片） ═════════ */
function renderStrip(s){
  const chip = src => (src === 'cached' || src === 'estimated')
    ? `<span class="cached-chip">${src}</span>` : '';

  $('strip-price').innerHTML = chip(s.priceSrc) +
    '<div class="strip-label">BTC Price</div>' +
    `<div class="strip-val mono">${s.priceUsd == null ? '—' : Fmt.usd(s.priceUsd)}</div>` +
    `<div class="strip-sub">${s.priceChange == null ? '&nbsp;' :
      `<span class="${s.priceChange >= 0 ? 'up' : 'down'}">${s.priceChange >= 0 ? '+' : ''}${s.priceChange.toFixed(1)}% (24h)</span>`}</div>`;

  $('strip-net').innerHTML = chip(s.netSrc) +
    '<div class="strip-label">Network Hashrate</div>' +
    `<div class="strip-val mono">${s.hashrateEH == null ? '—' : Fmt.ehs(s.hashrateEH)}</div>` +
    `<div class="strip-sub">${s.netLabel || 'current estimate'}</div>`;

  const usd = (s.priceUsd != null) ? ' ≈ ' + Fmt.usd(REWARD_BTC * s.priceUsd) : '';
  $('strip-reward').innerHTML =
    '<div class="strip-label">Block Reward</div>' +
    `<div class="strip-val mono">${REWARD_BTC} BTC</div>` +
    `<div class="strip-sub">${usd || '&nbsp;'}</div>`;

  let diffSub = '&nbsp;';
  if (s.diffBlocks != null){
    const days = s.diffDate ? Math.max(0, Math.round((s.diffDate - Date.now()) / 864e5)) : null;
    diffSub = `~${Fmt.int(s.diffBlocks)} blocks${days != null ? ` (~${days} days)` : ''}`;
  }
  $('strip-diff').innerHTML = chip(s.diffSrc) +
    '<div class="strip-label">Next Difficulty</div>' +
    `<div class="strip-val mono">${s.diffPct == null ? '—' :
      `<span class="${s.diffPct >= 0 ? '' : ''}">${s.diffPct >= 0 ? '+' : ''}${s.diffPct.toFixed(1)}%</span>`}</div>` +
    `<div class="strip-sub">${diffSub}</div>`;
}

/* ═════════ 核心计算（02 文档公式，已与 SoloBlocks 源码交叉验证） ═════════ */
function compute(userTH, durationDays){
  const netTH = DataHub.state.hashrateEH * 1e6;
  const p = userTH / netTH;                         /* 每块概率（比例） */
  const perBlockX  = netTH / userTH;                /* 1 in X */
  const perDayX    = perBlockX / BLOCKS_PER_DAY;
  const waitMin    = perBlockX * 10;
  const cum = mins => 1 - Math.pow(1 - p, mins / 10);   /* 累积：1−(1−p)^N */
  return {
    p, perBlockX, perDayX, waitMin,
    cum1d: cum(1440), cum1m: cum(43800), cum1y: cum(525600),
    cum5y: cum(2628000), cum10y: cum(5256000),
    luck: (durationDays > 0) ? {
      soFar:   cum(durationDays * 1440),
      journey: (durationDays * 1440) / waitMin * 100
    } : null
  };
}

/* ═════════ 渲染 ═════════ */
function renderResults(r, animate){
  /* ① 概率组 */
  if (animate && r.perBlockX < 1e9){
    $('res-prefix').textContent = '1 in';
    countUp($('res-big-num'), r.perBlockX);
  } else {
    const s = Fmt.oneIn(r.perBlockX);
    $('res-prefix').textContent = '1 in';
    $('res-big-num').textContent = s.replace('1 in ', '');
  }
  $('res-day').textContent   = Fmt.oneIn(r.perDayX);
  $('res-wait').textContent  = '≈ ' + Fmt.wait(r.waitMin);
  $('res-share').textContent = Fmt.pct(r.p);

  /* ② 钱组 */
  const price = DataHub.state.priceUsd;
  $('res-win').innerHTML = `<b>${REWARD_BTC} BTC</b>${price != null ? ' ≈ ' + Fmt.usd(REWARD_BTC * price) : ''}`;

  /* ③ 运气组（条件显示，不留空壳） */
  if (r.luck){
    const v = verdict(r.luck.journey);
    $('luck-badge').textContent  = v.badge;
    $('luck-sofar').textContent  = Fmt.pct(r.luck.soFar);
    $('luck-journey').textContent = (r.luck.journey < 0.01 ? 'less than 0.01' : r.luck.journey.toFixed(r.luck.journey < 10 ? 2 : 0)) + '% of the average wait';
    $('luck-verdict').textContent = v.text;
    $('luck-group').classList.remove('hidden');
  } else {
    $('luck-group').classList.add('hidden');
  }

  /* ④ 累积数字行（5 行，带日历图标） */
  const CAL = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>';
  const rows = [['1 day',r.cum1d],['1 month',r.cum1m],['1 year',r.cum1y],['5 years',r.cum5y],['10 years',r.cum10y]];
  $('fun-rows').innerHTML = rows.map(([label, c]) => {
    const oneIn = c > 0 ? Fmt.oneIn(1 / c) : '—';
    return `<div class="krow"><span class="krow-ico">${CAL}</span>` +
      `<span class="krow-label">${label}</span>` +
      `<span class="krow-val"><span class="fun-odds mono">${oneIn}</span>` +
      `<span class="fun-pct">${Fmt.pct(c)}</span></span></div>`;
  }).join('');

  /* ④ 曲线（纵轴按 10 年值自动缩放） */
  renderCurve(r);

  /* 类比卡（对数距离最近档 + 边界规则） */
  renderPerspective(r.perBlockX);

  /* 副注与底部说明行同步用户算力 */
  $('sec-sub-hashrate').textContent = lastInput.rawValue + ' ' + lastInput.rawUnit;
  $('note-hashrate').textContent = lastInput.rawValue + ' ' + lastInput.rawUnit;
}

function renderCurve(r){
  /* 2026-07-16 改版：对标用户提供的参考样式——
     横轴用 √t 非线性刻度（近线性的累积曲线呈上扬弧线，"越挖越近"的视觉叙事）、
     虚线网格 + 纵轴百分比刻度、里程碑做成小气泡卡、末端实心大点 */
  /* 方形画布（520×520）撑满右面板高度，与左列等高；字号气泡同步放大 */
  const W = 520, H = 520, L = 58, R = W - 20, TOP = 74, BOT = H - 52;
  const maxC = r.cum10y;
  const xs = t => L + (R - L) * Math.sqrt(t / 10);
  const ys = c => BOT - (BOT - TOP) * (c / maxC);

  /* 曲线路径（40 段） */
  let d = `M ${xs(0).toFixed(1)} ${BOT}`;
  for (let i = 1; i <= 40; i++){
    const t = 10 * i / 40;
    const c = 1 - Math.pow(1 - r.p, t * 52560);
    d += ` L ${xs(t).toFixed(1)} ${ys(c).toFixed(1)}`;
  }

  /* 横向虚线网格 + 纵轴刻度（0 / ⅓ / ⅔ / 满） */
  let grid = '', ylab = '';
  for (let k = 0; k <= 3; k++){
    const c = maxC * k / 3, gy = ys(c);
    grid += `<line x1="${L}" y1="${gy}" x2="${R}" y2="${gy}" stroke="var(--border)"${k === 0 ? '' : ' stroke-dasharray="4 5"'}/>`;
    ylab += `<text x="${L-9}" y="${gy+4}" text-anchor="end" fill="var(--muted2)" font-size="13">${k === 0 ? '0' : Fmt.pct(c)}</text>`;
  }

  /* 横轴标签（√t 刻度下的真实位置） */
  const xlab = [[0,'today','start'],[1,'1 year','middle'],[5,'5 years','middle'],[10,'10 years','end']]
    .map(([t, lb, an]) => `<text x="${xs(t)}" y="${BOT+28}" text-anchor="${an}" fill="var(--muted2)" font-size="13">${lb}</text>`).join('');

  /* 气泡卡：label + 百分比 */
  function tip(t, c, label){
    const val = Fmt.pct(c);
    const w = Math.max(label.length, val.length) * 7.6 + 24;
    let tx = xs(t) - w / 2;
    tx = Math.max(L + 2, Math.min(tx, R - w - 2));
    let ty = ys(c) - 62;
    ty = Math.max(6, ty);
    return `<g><rect x="${tx.toFixed(1)}" y="${ty}" width="${w.toFixed(0)}" height="44" rx="10" fill="var(--card)" stroke="var(--border)"/>` +
      `<text x="${(tx+w/2).toFixed(1)}" y="${ty+17}" text-anchor="middle" fill="var(--muted)" font-size="12">${label}</text>` +
      `<text x="${(tx+w/2).toFixed(1)}" y="${ty+34}" text-anchor="middle" fill="var(--accent)" font-size="13" font-weight="700" font-family="'JetBrains Mono',monospace">${val}</text></g>`;
  }

  $('curve').innerHTML =
    grid + ylab + xlab +
    `<path d="${d} L ${xs(10).toFixed(1)} ${BOT} Z" fill="var(--accent-tint)"/>` +
    `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="${xs(0)}" cy="${BOT}" r="5" fill="var(--card)" stroke="var(--accent)" stroke-width="2.5"/>` +
    `<circle cx="${xs(1)}" cy="${ys(r.cum1y)}" r="5" fill="var(--card)" stroke="var(--accent)" stroke-width="2.5"/>` +
    `<circle cx="${xs(5)}" cy="${ys(r.cum5y)}" r="5" fill="var(--card)" stroke="var(--accent)" stroke-width="2.5"/>` +
    `<circle cx="${xs(10)}" cy="${ys(r.cum10y)}" r="7" fill="var(--accent)"/>` +
    tip(0.55, r.cum1d, '1 day') + tip(1.7, r.cum1y, '1 year') +
    tip(5, r.cum5y, '5 years') + tip(10, r.cum10y, '10 years');
}

function renderPerspective(perBlockX){
  /* 独立类比卡，位于大字卡正下方（2026-07-16 用户拍板：卡片保留、不带概率数字）
     对数距离最近档；边界：better than / longer than even */
  const lg = Math.log10(perBlockX);
  let best = PERSPECTIVES[0], bestDist = Infinity;
  for (const t of PERSPECTIVES){
    const dist = Math.abs(Math.log10(t.n) - lg);
    if (dist < bestDist){ bestDist = dist; best = t; }
  }
  const minT = PERSPECTIVES[PERSPECTIVES.length - 1], maxT = PERSPECTIVES[0];
  let lead = 'Per block, your odds sit closest to';
  if (perBlockX < minT.n){ lead = 'Per block, your odds are better than'; best = minT; }
  if (perBlockX > maxT.n){ lead = 'Per block, your odds are longer than even'; best = maxT; }
  $('persp-lead').textContent = lead;
  $('persp-text').innerHTML = best.text;   /* 仅类比句，无概率数字 */
}

/* ═════════ 交互 ═════════ */
function doCalculate(animate){
  const rawValue = parseFloat($('inp-hashrate').value);
  const rawUnit  = $('inp-unit').value;
  if (!isFinite(rawValue) || rawValue <= 0) return;
  if (DataHub.state.hashrateEH == null) return;          /* 连缓存都没有：无分母不算 */

  const durVal  = parseFloat($('inp-duration').value);
  const durUnit = $('inp-dur-unit').value;
  const durationDays = (isFinite(durVal) && durVal > 0) ? durVal * DUR_TO_DAYS[durUnit] : 0;

  lastInput = {userTH: rawValue * UNIT_TO_TH[rawUnit], durationDays, rawValue, rawUnit};
  localStorage.setItem('hm_calc_input', JSON.stringify({rawValue, rawUnit, durVal:isFinite(durVal)?durVal:'', durUnit}));

  renderResults(compute(lastInput.userTH, durationDays), animate);
  $('results').classList.remove('hidden');
  if (animate) $('res-card').scrollIntoView({behavior:'smooth', block:'center'});
}

document.addEventListener('DOMContentLoaded', () => {
  /* 回填上次输入 */
  try{
    const saved = JSON.parse(localStorage.getItem('hm_calc_input'));
    if (saved){
      $('inp-hashrate').value = saved.rawValue;
      $('inp-unit').value = saved.rawUnit;
      if (saved.durVal !== '') $('inp-duration').value = saved.durVal;
      $('inp-dur-unit').value = saved.durUnit;
    }
  }catch(e){}

  $('btn-calc').addEventListener('click', () => doCalculate(true));
  [$('inp-hashrate'), $('inp-duration')].forEach(el =>
    el.addEventListener('keydown', e => { if (e.key === 'Enter') doCalculate(true); }));

  /* 数据到位/刷新：数据条与已显示结果同帧更新（铁律3） */
  DataHub.onUpdate(s => {
    renderStrip(s);
    if (lastInput && !$('results').classList.contains('hidden')){
      renderResults(compute(lastInput.userTH, lastInput.durationDays), false);
    }
  });
  DataHub.init();
});
