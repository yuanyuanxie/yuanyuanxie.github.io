/* HammerFans 原型共享脚本：i18n 引擎 + 公共文案 + 横幅时钟 + 移动菜单 + 滚动动画 */

/* ===== 公共双语词典 ===== */
window.HF_COMMON = {
  zh: {
    'nav.home':'首页','nav.calc':'概率计算器','nav.miners':'矿机对比','nav.blocks':'中奖墙','nav.learn':'学习中心','nav.about':'关于',
    'nav.cta':'算我的概率',
    'banner.pre':'距上一台家庭矿机中块已过去','banner.day':'天',
    'banner.last':'最近：区块 #955,703，奖励 3.1553 BTC，CKPool Solo','banner.view':'查看中奖墙',
    'footer.tag':'面向家庭矿工的独立社区网站。','footer.site':'站内','footer.legal':'声明',
    'footer.disc':'HammerFans 是玩家社区网站（fan site）。收益与概率估算仅供参考，不构成投资建议。加密货币挖矿请遵守所在地法律法规。',
    'snapshot':'演示快照 2026-07','notice.est':'概率按 2026-07 网络快照估算，仅供参考，不构成投资建议。',
  },
  en: {
    'nav.home':'Home','nav.calc':'Calculator','nav.miners':'Compare Miners','nav.blocks':'Block Wins','nav.learn':'Learn','nav.about':'About',
    'nav.cta':'My Odds',
    'banner.pre':'Days since a home miner last found a block:','banner.day':'',
    'banner.last':'Latest: block #955,703, reward 3.1553 BTC, CKPool Solo','banner.view':'View the wall',
    'footer.tag':'An independent community site for home miners.','footer.site':'Site','footer.legal':'Legal',
    'footer.disc':'HammerFans is a community fan site. All odds and earnings are estimates only, not financial advice. Please follow the laws of your jurisdiction.',
    'snapshot':'Demo snapshot 2026-07','notice.est':'Odds estimated from a 2026-07 network snapshot. For reference only, not financial advice.',
  }
};

/* ===== 演示快照常量（真实公式，快照数据）===== */
window.HF_SNAPSHOT = {
  btcNetTHs: 938e6,   btcPrice: 62939,  btcReward: 3.125,
  ltcNetMHs: 2.4e9,   ltcPrice: 84.6,   ltcReward: 6.25,
  dogeNetMHs: 2.1e9,  dogePrice: 0.142, dogeReward: 10000,
  lastHomeBlock: new Date('2026-06-27T07:00:00Z'),
};

/* ===== i18n 引擎 ===== */
(function(){
  const PAGE = window.HF_PAGE_DICT || {zh:{},en:{}};
  window.HF_LANG = localStorage.getItem('hf-lang') || 'en';
  window.t = function(k){
    return (PAGE[HF_LANG] && PAGE[HF_LANG][k] !== undefined) ? PAGE[HF_LANG][k]
         : (HF_COMMON[HF_LANG][k] !== undefined) ? HF_COMMON[HF_LANG][k] : k;
  };
  window.applyLang = function(){
    document.documentElement.lang = HF_LANG === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = t(el.dataset.i18n);
      if (v !== el.dataset.i18n) el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const v = t(el.dataset.i18nPh);
      if (v !== el.dataset.i18nPh) el.placeholder = v;
    });
    document.querySelectorAll('.langBtn').forEach(b => b.textContent = HF_LANG === 'zh' ? 'EN' : '中文');
    if (window.onLangChange) window.onLangChange();
  };
  window.toggleLang = function(){
    HF_LANG = HF_LANG === 'zh' ? 'en' : 'zh';
    localStorage.setItem('hf-lang', HF_LANG);
    applyLang();
  };
})();

/* ===== 通用初始化 ===== */
document.addEventListener('DOMContentLoaded', function(){
  // 语言按钮
  document.querySelectorAll('.langBtn').forEach(b => b.addEventListener('click', toggleLang));
  // 横幅时钟
  function tick(){
    const ms = Date.now() - HF_SNAPSHOT.lastHomeBlock.getTime();
    document.querySelectorAll('.tickerDays').forEach(el => el.textContent = Math.floor(ms/86400000));
    const h = document.getElementById('heroHours');
    if (h) h.textContent = Math.floor(ms % 86400000 / 3600000);
    const d = document.getElementById('heroDays');
    if (d) d.textContent = Math.floor(ms/86400000);
  }
  tick(); setInterval(tick, 60000);
  // 移动端菜单
  const mb = document.getElementById('menuBtn');
  if (mb) mb.addEventListener('click', function(){
    const m = document.getElementById('mobileMenu');
    const open = m.classList.toggle('hidden') === false;
    mb.setAttribute('aria-expanded', open);
  });
  // 滚动进入动画
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    }), {threshold: 0.15});
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  }
  applyLang();
});

/* ===== 通用格式化 ===== */
window.fmtOdds = n => (!isFinite(n) || n <= 0) ? '-' : '1 in ' + Math.round(n).toLocaleString('en-US');
