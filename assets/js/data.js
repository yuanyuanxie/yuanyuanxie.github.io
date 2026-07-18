/* ═══════════════════════════════════════════════════════════════
   HomeMining · 实时数据中心（全站唯一数据源 —— 铁律3：同一分母）
   规范：docs/01-calculator-data-strip.md
   - V1 无后端：访客浏览器直连公开 API
   - 刷新：币价 2min；算力/难度 5min
   - 永不 Loading：先展示 localStorage 缓存，取到实时值无感替换
   - 失效链：mempool.space → blockchain.info → 缓存值 + "cached" 标注
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const REWARD_BTC = 3.125;          /* 本地常量：2028 年减半前有效 */
const CACHE_KEY  = 'hm_data_cache';
/* 保底基线（01 文档：首次访问且断网时用，标注 estimated；随版本更新大致校准即可） */
const BASELINE_HASHRATE_EH = 1019;  /* as of 2026-07 */

const DataHub = {

  /* 状态：value 为数值；src 为 'live' | 'cached' | null（null=连缓存都没有） */
  state:{
    priceUsd:null,   priceChange:null, priceSrc:null,
    hashrateEH:null, netSrc:null,      netLabel:'current estimate',
    diffPct:null,    diffBlocks:null,  diffDate:null, diffSrc:null
  },

  _listeners:[],
  onUpdate(fn){ this._listeners.push(fn); },
  _emit(){ this._listeners.forEach(fn => fn(this.state)); },

  /* ── 缓存 ── */
  _loadCache(){
    try{ return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
    catch(e){ return {}; }
  },
  _saveCache(patch){
    const c = Object.assign(this._loadCache(), patch, {savedAt:Date.now()});
    try{ localStorage.setItem(CACHE_KEY, JSON.stringify(c)); }catch(e){}
  },

  /* ── 取数（每项失败自动降级到缓存，绝不抛错、绝不空白） ── */

  async _fetchPrice(){
    try{
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
      const d = await r.json();
      this.state.priceUsd    = d.bitcoin.usd;
      this.state.priceChange = d.bitcoin.usd_24h_change;
      this.state.priceSrc    = 'live';
      this._saveCache({priceUsd:this.state.priceUsd, priceChange:this.state.priceChange});
    }catch(e){ /* 保持现值（缓存或上次实时值），标记来源 */
      if (this.state.priceUsd !== null && this.state.priceSrc === null) this.state.priceSrc = 'cached';
      if (this.state.priceSrc === 'live') this.state.priceSrc = 'cached';
    }
  },

  async _fetchNetwork(){
    try{ /* 首选：mempool.space 的 currentHashrate（基于近期区块的当前估计值）
           2026-07-16 用户拍板：用当前值即可，标签如实标注 "current estimate" */
      const r = await fetch('https://mempool.space/api/v1/mining/hashrate/3d');
      const d = await r.json();
      this.state.hashrateEH = d.currentHashrate / 1e18;
      this.state.netLabel = 'current estimate';
      this.state.netSrc = 'live';
      this._saveCache({hashrateEH:this.state.hashrateEH, netLabel:this.state.netLabel});
      return;
    }catch(e){}
    try{ /* 备胎：blockchain.info（GH/s，同为当前估计值） */
      const r = await fetch('https://blockchain.info/q/hashrate?cors=true');
      const gh = parseFloat(await r.text());
      if (isFinite(gh) && gh > 0){
        this.state.hashrateEH = gh / 1e9;
        this.state.netLabel = 'current estimate';
        this.state.netSrc = 'live';
        this._saveCache({hashrateEH:this.state.hashrateEH, netLabel:this.state.netLabel});
        return;
      }
    }catch(e){}
    if (this.state.hashrateEH !== null) this.state.netSrc = 'cached';
  },

  async _fetchDifficulty(){
    try{
      const r = await fetch('https://mempool.space/api/v1/difficulty-adjustment');
      const d = await r.json();
      this.state.diffPct    = d.difficultyChange;
      this.state.diffBlocks = d.remainingBlocks;
      this.state.diffDate   = d.estimatedRetargetDate;
      this.state.diffSrc    = 'live';
      this._saveCache({diffPct:this.state.diffPct, diffBlocks:this.state.diffBlocks, diffDate:this.state.diffDate});
    }catch(e){
      if (this.state.diffPct !== null) this.state.diffSrc = 'cached';
    }
  },

  /* ── 启动：缓存先上墙 → 实时数据到位后无感替换 → 定时刷新 ── */
  init(){
    const c = this._loadCache();
    if (c.priceUsd   != null){ this.state.priceUsd = c.priceUsd; this.state.priceChange = c.priceChange; this.state.priceSrc = 'cached'; }
    if (c.hashrateEH != null){ this.state.hashrateEH = c.hashrateEH; this.state.netSrc = 'cached'; if (c.netLabel) this.state.netLabel = c.netLabel; }
    if (c.diffPct    != null){ this.state.diffPct = c.diffPct; this.state.diffBlocks = c.diffBlocks; this.state.diffDate = c.diffDate; this.state.diffSrc = 'cached'; }
    /* 连缓存都没有 → 算力用代码保底基线，明确标注 estimated（计算器分母永远存在） */
    if (this.state.hashrateEH == null){
      this.state.hashrateEH = BASELINE_HASHRATE_EH;
      this.state.netSrc = 'estimated';
    }
    this._emit();                              /* 第一帧：缓存值/保底值 */

    const refreshPrice = () => this._fetchPrice().then(() => this._emit());
    const refreshNet   = () => Promise.all([this._fetchNetwork(), this._fetchDifficulty()]).then(() => this._emit());
    refreshPrice(); refreshNet();
    setInterval(refreshPrice, 2*60*1000);      /* 币价 2 分钟 */
    setInterval(refreshNet,   5*60*1000);      /* 算力/难度 5 分钟 */
  }
};
