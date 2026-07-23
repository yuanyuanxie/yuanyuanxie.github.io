/* ═══════════════════════════════════════════════════════════════
   HomeMining · Miners 页逻辑（2026-07-22 四版：类别/厂商/算法多选）
   - 数据源：assets/data/miners-data.js（由 miners-draft.json 生成，104 台 AMV 三类）
   - 视图层：币种分段开关（单选，独立一行）
   - 工具层：类别/厂商/算法 = 自制复选下拉（可多选；同组内"或"，组间"与"），
     不勾任何项 = 不限；数量为 0 的选项变灰禁用（联动计数在背后算，不显示数字）
   - 收益列：仅 BTC 机器。入池期望值 = 机器算力/全网算力 × 144 块/天 × 3.125 BTC
     换算成聪（sats），按 30 天记一个月；Altcoin 显示 "—"（选项一，用户拍板）
   - 电费列：功耗 × 24h × 30 天 × 用户电价（$/kWh，记忆于 localStorage）
   - 全网算力/币价来自 DataHub —— 与 Calculator 同一分母（铁律3）
   - 默认排序：发布时间 新→旧（released_ts_raw 原始时间戳，精确到秒）
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const ELEC_KEY       = 'hm_elec_price';
const MONTH_DAYS     = 30;
const PER_PAGE       = 25;   /* 分页：每页 25 台 */
const SATS_PER_BLOCK = REWARD_BTC * 1e8;   /* 3.125 BTC = 312,500,000 sats */
const M_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TYPE_LABELS = { solo:'Solo miners', home:'Home miners', heater:'Heaters' };

/* 三个多选筛选面（facet）的静态描述 */
const FACETS = [
  { key:'type',  ddId:'dd-type',  all:'All types',         unit:'types' },
  { key:'brand', ddId:'dd-brand', all:'All manufacturers', unit:'manufacturers' },
  { key:'algo',  ddId:'dd-algo',  all:'All algorithms',    unit:'algorithms' }
];

/* 厂商图标（assets/img/brands/，源自 AMV 官方厂商图，自托管零外链）
   s = 文件名 slug；d = 1 表示存在深色主题变体（<slug>-dark.png） */
const BRAND_ICONS = {
  '21energy':      {s:'21energy',       d:0},
  'Baikal':        {s:'baikal',         d:0},
  'Bitaxe':        {s:'bitaxe',         d:1},
  'Bitmain':       {s:'bitmain',        d:1},
  'Braiins':       {s:'braiins',        d:1},
  'Canaan':        {s:'canaan',         d:1},
  'Digital Shovel':{s:'digital-shovel', d:0},
  'ElphaPex':      {s:'elphapex',       d:0},
  'Fluminer':      {s:'fluminer',       d:0},
  'Goldshell':     {s:'goldshell',      d:0},
  'Heatbit':       {s:'heatbit',        d:0},
  'IceRiver':      {s:'iceriver',       d:0},
  'iPollo':        {s:'ipollo',         d:0},
  'Jasminer':      {s:'jasminer',       d:0},
  'Jingle Miner':  {s:'jingle-miner',   d:0},
  'Lucky Miner':   {s:'lucky-miner',    d:0},
  'NerdMiner':     {s:'nerdminer',      d:0},
  'Pinecone':      {s:'pinecone',       d:1},
  'PlebSource':    {s:'plebsource',     d:0}
};

/* 币种图标（assets/img/coins/，源自 AMV 官方币种图，自托管零外链）；tag → 全名（悬停提示用） */
const COIN_NAMES = {
  BTC:'Bitcoin', DOGE:'Dogecoin', LTC:'Litecoin', BEL:'Bells',
  KAS:'Kaspa', KDA:'Kadena', CKB:'Nervos', SC:'SiaCoin',
  ALPH:'Alephium', HNS:'Handshake', LBC:'LBRY', XTM:'Tari',
  RXD:'Radiant', XP:'Xphere', ETC:'Ethereum Classic', DASH:'Dash',
  ALEO:'Aleo', GRIN:'Grin', SUMO:'Sumokoin', INI:'InitVerse'
};

const MinersPage = {

  all: [],
  updated: '',
  options: { type:['solo','home','heater'], brand:[], algo:[] },  /* 各面的全量选项，init 固定 */
  sel:     { type:new Set(), brand:new Set(), algo:new Set() },   /* 各面的已勾选集合；空 = 不限 */
  state:   { q:'', coin:'all', sort:'released', dir:-1, elec:0.10, page:1 },

  /* ── 工具 ── */

  /* 三类互斥（AMV 口径）：tags 含 solo → Solo；含 heater → Heater；否则 Home */
  cat(m){
    if (m.tags.indexOf('solo')   !== -1) return 'solo';
    if (m.tags.indexOf('heater') !== -1) return 'heater';
    return 'home';
  },

  /* 某台机器在某个筛选面上的取值 */
  facetVal(m, key){
    if (key === 'type')  return this.cat(m);
    if (key === 'brand') return m.brand;
    return m.algo;
  },

  optLabel(key, v){ return key === 'type' ? TYPE_LABELS[v] : v; },

  esc(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  /* "2025-09" → "Sep 2025" */
  rel(m){
    if (!m.released) return '—';
    const y = m.released.slice(0,4), mo = parseInt(m.released.slice(5,7), 10);
    return (M_NAMES[mo-1] || '?') + ' ' + y;
  },

  /* 排序用时间值：优先原始时间戳（精确），缺失时退回月中近似 */
  relTs(m){
    if (m.released_ts_raw){ const t = Date.parse(m.released_ts_raw); if (isFinite(t)) return t; }
    if (m.released){ const t = Date.parse(m.released + '-15T00:00:00Z'); if (isFinite(t)) return t; }
    return null;
  },

  /* ── 计算 ── */

  /* 入池月收益（聪）：仅 BTC 机器；期望值口径，只算区块补贴 */
  satsMonth(m){
    if (m.coin !== 'BTC' || m.hashrate_ghs == null) return null;
    const netGH = DataHub.state.hashrateEH * 1e9;   /* EH → GH，同一分母 */
    if (!isFinite(netGH) || netGH <= 0) return null;
    return m.hashrate_ghs / netGH * 144 * SATS_PER_BLOCK * MONTH_DAYS;
  },

  /* 月电费（美元） */
  costMonth(m){
    if (m.power_w == null) return null;
    return m.power_w * 24 * MONTH_DAYS / 1000 * this.state.elec;
  },

  /* 金额排版：≥$100 取整加千分位；≥$0.01 两位小数；再小显示 "< $0.01"（铁律1：无科学计数法） */
  fmtMoney(v){
    if (!isFinite(v)) return '—';
    if (v >= 100) return '$' + Fmt.int(v);
    if (v >= 0.01 || v === 0) return '$' + v.toFixed(2);
    return '&lt; $0.01';
  },

  /* ── 筛选：同一面内是"或"（多选），面与面之间是"与" ──
     filteredExcept('brand') = 应用除厂商外的全部条件 → 用于该面的联动计数 */

  filteredExcept(skip){
    const q = this.state.q.trim().toLowerCase();
    return this.all.filter(m => {
      if (skip !== 'q' && q && (m.brand + ' ' + m.model).toLowerCase().indexOf(q) === -1) return false;
      if (skip !== 'coin'){
        if (this.state.coin === 'btc' && m.coin !== 'BTC') return false;
        if (this.state.coin === 'alt' && m.coin === 'BTC') return false;
      }
      for (const f of FACETS){
        if (skip === f.key) continue;
        const set = this.sel[f.key];
        if (set.size && !set.has(this.facetVal(m, f.key))) return false;
      }
      return true;
    });
  },

  filtered(){ return this.filteredExcept(null); },

  /* ── 联动刷新：分段开关计数 + 三个复选下拉的按钮文字与面板 ── */

  refreshControls(){
    /* 币种分段开关：在"除币种外"的语境里计数 */
    const cBase = this.filteredExcept('coin');
    const nBtc  = cBase.filter(m => m.coin === 'BTC').length;
    const nums  = { all: cBase.length, btc: nBtc, alt: cBase.length - nBtc };
    const txts  = { all: 'All', btc: 'Bitcoin', alt: 'Altcoin' };
    document.querySelectorAll('.m-chip').forEach(b => {
      const k = b.dataset.coin;
      b.textContent = txts[k] + ' (' + nums[k] + ')';
      b.disabled = (nums[k] === 0 && this.state.coin !== k);
    });

    /* 三个复选下拉 */
    for (const f of FACETS){
      const dd    = document.getElementById(f.ddId);
      const set   = this.sel[f.key];
      const base  = this.filteredExcept(f.key);
      const count = {};
      base.forEach(m => {
        const v = this.facetVal(m, f.key);
        if (v) count[v] = (count[v] || 0) + 1;
      });

      /* 按钮文字：不限 → "All xxx"；勾 1 个 → 名字；勾多个 → "N xxx" */
      const btn = dd.querySelector('.m-dd-btn');
      if (set.size === 0)      btn.textContent = f.all;
      else if (set.size === 1) btn.textContent = this.optLabel(f.key, set.values().next().value);
      else                     btn.textContent = set.size + ' ' + f.unit;
      btn.classList.toggle('on', set.size > 0);

      /* 面板：复选框列表；0 台且未勾选的变灰禁用；有勾选时顶部出现清空行 */
      const rows = this.options[f.key].map(v => {
        const on  = set.has(v);
        const dis = (!on && (count[v] || 0) === 0);
        return '<label class="m-dd-opt' + (dis ? ' off' : '') + '">' +
                 '<input type="checkbox" value="' + this.esc(v) + '"' +
                   (on ? ' checked' : '') + (dis ? ' disabled' : '') + '>' +
                 '<span>' + this.esc(this.optLabel(f.key, v)) + '</span>' +
               '</label>';
      }).join('');
      dd.querySelector('.m-dd-panel').innerHTML =
        (set.size ? '<button type="button" class="m-dd-reset">Clear selection</button>' : '') + rows;
    }
  },

  /* ── 排序 ── */

  sortVal(m){
    switch (this.state.sort){
      case 'released': return this.relTs(m);
      case 'hashrate': return m.hashrate_ghs;      /* null（异构单位机型）沉底 */
      case 'power':    return m.power_w;
      case 'noise':    return m.noise_db;
      case 'earn':     return this.satsMonth(m);   /* Altcoin 无收益 → 沉底 */
      case 'cost':     return m.power_w;           /* 电费 ∝ 功耗 */
      default:         return null;
    }
  },

  sorted(list){
    const dir = this.state.dir;
    return list.slice().sort((a, b) => {
      const va = this.sortVal(a), vb = this.sortVal(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;                    /* 空值永远沉底，不随方向翻转 */
      if (vb == null) return -1;
      if (va === vb){                              /* 平手 → 按发布时间新→旧稳定 */
        return (this.relTs(b) || 0) - (this.relTs(a) || 0);
      }
      return (va - vb) * dir;
    });
  },

  /* ── 渲染 ── */

  earnCell(m){
    const s = this.satsMonth(m);
    if (s === null) return '<td class="m-earn"><span class="m-dash">—</span></td>';
    const big = (s < 1) ? '&lt; 1 sat' : Fmt.int(s) + ' sats';
    const p = DataHub.state.priceUsd;
    const sub = p ? '<span>≈ ' + this.fmtMoney(s / 1e8 * p) + '</span>' : '';
    return '<td class="m-earn"><b class="mono">' + big + '</b>' + sub + '</td>';
  },

  /* 厂商图标：有深色变体的输出两张，CSS 按主题显隐 */
  icoHtml(m){
    const ic = BRAND_ICONS[m.brand];
    if (!ic) return '';
    const base = 'assets/img/brands/' + ic.s;
    if (ic.d){
      return '<img class="m-ico ico-light" src="' + base + '.png" alt="" loading="lazy">' +
             '<img class="m-ico ico-dark" src="' + base + '-dark.png" alt="" loading="lazy">';
    }
    return '<img class="m-ico" src="' + base + '.png" alt="" loading="lazy">';
  },

  /* 币种列：图标代替文字（悬停显示 "BTC · Bitcoin"）；多挖机型并排多枚；
     未知新币种（无图标映射）回退显示文字，不留空 */
  coinCell(m){
    if (!m.coin) return '<td class="m-coins">—</td>';
    const tags = m.coin.split('+');
    const parts = tags.map(t => {
      const name = COIN_NAMES[t];
      if (!name) return '<span class="m-coin">' + this.esc(t) + '</span>';
      return '<img class="m-cico" src="assets/img/coins/' + t.toLowerCase() + '.png"' +
             ' alt="' + this.esc(t) + '" title="' + this.esc(t + ' · ' + name) + '" loading="lazy">';
    });
    /* 三挖机型且图标齐全 → 品字形小三角（上一下二）；其余平铺 */
    if (tags.length === 3 && parts.every(p => p.indexOf('<img') === 0)){
      return '<td class="m-coins"><span class="m-cgroup" title="' +
             this.esc(tags.map(t => t + ' · ' + COIN_NAMES[t]).join('  +  ')) + '">' +
             parts.join('') + '</span></td>';
    }
    return '<td class="m-coins">' + parts.join('') + '</td>';
  },

  row(m){
    const power = m.power_w  != null ? Fmt.int(m.power_w) + ' W' : '—';
    const noise = m.noise_db != null ? m.noise_db + ' dB' : '—';
    const c = this.costMonth(m);
    const cost  = c != null ? this.fmtMoney(c) : '—';
    return '<tr>' +
      '<td class="m-name"><div class="m-name-in">' + this.icoHtml(m) + '<span>' + this.esc(m.brand + ' ' + m.model) + '</span></div></td>' +
      '<td class="mono">' + this.esc(m.hashrate_text || '—') + '</td>' +
      '<td class="mono">' + power + '</td>' +
      '<td class="mono">' + noise + '</td>' +
      '<td class="m-coin">' + this.esc(m.algo || '—') + '</td>' +
      this.coinCell(m) +
      '<td class="mono">' + this.rel(m) + '</td>' +
      this.earnCell(m) +
      '<td class="mono m-cost">' + cost + '</td>' +
    '</tr>';
  },

  render(){
    this.refreshControls();                        /* 联动状态先行 */

    const list  = this.sorted(this.filtered());
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (this.state.page > pages) this.state.page = pages;   /* 筛选变少后页码防越界 */
    const start = (this.state.page - 1) * PER_PAGE;
    const slice = list.slice(start, start + PER_PAGE);

    const tbody = document.getElementById('m-body');
    if (!list.length){
      tbody.innerHTML = '<tr><td class="m-empty" colspan="9">No miners match your filters.<br>' +
        '<button type="button" class="m-clear" onclick="MinersPage.clear()">Clear all filters</button></td></tr>';
    } else {
      tbody.innerHTML = slice.map(m => this.row(m)).join('');
    }
    document.getElementById('m-count').textContent = list.length
      ? 'Showing ' + (start + 1) + '-' + (start + slice.length) + ' of ' + list.length + ' miners'
      : 'Showing 0 of ' + this.all.length + ' miners';
    this.renderPager(pages);

    const active = this.state.q !== '' || this.state.coin !== 'all' ||
                   this.sel.type.size > 0 || this.sel.brand.size > 0 || this.sel.algo.size > 0;
    document.getElementById('m-clear').classList.toggle('hidden', !active);

    document.querySelectorAll('.m-table th[data-sort]').forEach(th => {
      const on = th.dataset.sort === this.state.sort;
      th.classList.toggle('sorted', on);
      th.querySelector('.arr').textContent = on ? (this.state.dir === 1 ? '▲' : '▼') : '▼';
    });
  },

  /* 分页器：Prev + 页码 + Next（104 台 ÷ 25 最多 5 页，无需省略号） */
  renderPager(pages){
    const el = document.getElementById('m-pager');
    if (pages <= 1){ el.innerHTML = ''; return; }
    let h = '<button type="button" class="m-pg" data-pg="prev"' +
            (this.state.page === 1 ? ' disabled' : '') + '>&larr; Prev</button>';
    for (let i = 1; i <= pages; i++){
      h += '<button type="button" class="m-pg' + (i === this.state.page ? ' on' : '') +
           '" data-pg="' + i + '">' + i + '</button>';
    }
    h += '<button type="button" class="m-pg" data-pg="next"' +
         (this.state.page === pages ? ' disabled' : '') + '>Next &rarr;</button>';
    el.innerHTML = h;
  },

  gotoPage(p){
    this.state.page = p;
    this.render();
    /* 翻页后滚回表格顶部（带出参数行），避免停在长表中段 */
    const meta = document.getElementById('m-count');
    if (meta) meta.scrollIntoView({ behavior:'smooth', block:'start' });
  },

  /* ── 交互 ── */

  closeAllDD(except){
    document.querySelectorAll('.m-dd').forEach(dd => {
      if (dd !== except) dd.classList.remove('open');
      const b = dd.querySelector('.m-dd-btn');
      b.setAttribute('aria-expanded', dd.classList.contains('open') ? 'true' : 'false');
    });
  },

  clear(){
    this.state.q = ''; this.state.coin = 'all'; this.state.page = 1;
    this.sel.type.clear(); this.sel.brand.clear(); this.sel.algo.clear();
    document.getElementById('m-search').value = '';
    document.querySelectorAll('.m-chip').forEach(b => b.classList.toggle('active', b.dataset.coin === 'all'));
    this.render();
  },

  bind(){
    document.getElementById('m-search').addEventListener('input', e => {
      this.state.q = e.target.value; this.state.page = 1; this.render();
    });

    document.querySelectorAll('.m-chip').forEach(b => b.addEventListener('click', () => {
      this.state.coin = b.dataset.coin; this.state.page = 1;
      document.querySelectorAll('.m-chip').forEach(x => x.classList.toggle('active', x === b));
      this.render();
    }));

    /* 分页器（事件委托，内容每次渲染重建） */
    document.getElementById('m-pager').addEventListener('click', e => {
      const b = e.target.closest('.m-pg');
      if (!b || b.disabled) return;
      const pg = b.dataset.pg;
      if (pg === 'prev')      this.gotoPage(this.state.page - 1);
      else if (pg === 'next') this.gotoPage(this.state.page + 1);
      else                    this.gotoPage(parseInt(pg, 10));
    });

    /* 复选下拉：按钮开合 + 面板事件委托（面板内容每次渲染重建，容器与监听不变） */
    for (const f of FACETS){
      const dd    = document.getElementById(f.ddId);
      const btn   = dd.querySelector('.m-dd-btn');
      const panel = dd.querySelector('.m-dd-panel');

      btn.addEventListener('click', e => {
        e.stopPropagation();
        const willOpen = !dd.classList.contains('open');
        this.closeAllDD(null);
        dd.classList.toggle('open', willOpen);
        btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });

      panel.addEventListener('click', e => e.stopPropagation());  /* 面板内点击不冒泡关闭 */

      panel.addEventListener('change', e => {
        const cb = e.target;
        if (cb.type !== 'checkbox') return;
        if (cb.checked) this.sel[f.key].add(cb.value);
        else            this.sel[f.key].delete(cb.value);
        this.state.page = 1;
        this.render();                                            /* 面板保持打开，内容联动刷新 */
      });

      panel.addEventListener('click', e => {
        if (e.target.classList.contains('m-dd-reset')){
          this.sel[f.key].clear();
          this.state.page = 1;
          this.render();
        }
      });
    }

    document.addEventListener('click', () => this.closeAllDD(null));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.closeAllDD(null); });

    document.getElementById('elec-input').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      if (isFinite(v) && v >= 0){
        this.state.elec = v;
        try{ localStorage.setItem(ELEC_KEY, String(v)); }catch(err){}
      }
      this.render();
    });

    document.querySelectorAll('.m-table th[data-sort]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.sort;
      if (this.state.sort === k){
        this.state.dir *= -1;                     /* 再点同列 → 翻转方向 */
      } else {
        this.state.sort = k;
        /* 新列的默认方向：时间新→旧、算力/收益大→小；功耗/噪音/电费小→大 */
        this.state.dir = (k === 'released' || k === 'hashrate' || k === 'earn') ? -1 : 1;
      }
      this.state.page = 1;                        /* 换排序回到第一页 */
      this.render();
    }));
  },

  /* ── 启动 ── */

  init(){
    let saved = NaN;
    try{ saved = parseFloat(localStorage.getItem(ELEC_KEY)); }catch(e){}
    if (isFinite(saved) && saved >= 0) this.state.elec = saved;
    document.getElementById('elec-input').value = this.state.elec;

    if (typeof MINERS_DB === 'undefined' || !MINERS_DB.miners){
      document.getElementById('m-body').innerHTML =
        '<tr><td class="m-empty" colspan="9">Could not load the miner list. Please refresh and try again.</td></tr>';
      return;
    }
    this.all     = MINERS_DB.miners;
    this.updated = MINERS_DB.updated || '';

    /* 厂商/算法全名单固定一次（字母序），联动只改禁用态不改名单 */
    const seenB = {}, seenA = {};
    this.all.forEach(m => { seenB[m.brand] = true; if (m.algo) seenA[m.algo] = true; });
    this.options.brand = Object.keys(seenB).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    this.options.algo  = Object.keys(seenA).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    if (this.updated){
      document.getElementById('m-updated').textContent = 'List updated ' + this.updated + '.';
    }

    this.bind();
    DataHub.onUpdate(() => this.render());   /* 算力/币价到位 → 收益列无感刷新 */
    this.render();
  }
};

DataHub.init();
MinersPage.init();
