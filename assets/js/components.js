/* ═══════════════════════════════════════════════════════════════
   HomeMining · 共享组件（导航/页脚注入 + 站级交互）
   规范：docs/00-site-architecture.md §4 方案B —— 改一处，全站生效
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const PAGES = [
  ['index.html','Home'], ['calculator.html','Calculator'], ['miners.html','Miners'],
  ['blocks.html','Blocks'], ['about.html','About']
];
const CURRENT_PAGE = document.body.dataset.page;

/* ── 导航注入 ── */
document.getElementById('nav-root').innerHTML = `
<div class="navbar">
  <div class="navbar-inner">
    <a class="logo" href="index.html">Home<span>Mining</span></a>
    <div class="nav-links" id="navLinks">
      <span class="nav-pill" id="navPill"></span>
      ${PAGES.map(([f,n]) => `<a href="${f}" class="${n.toLowerCase()===CURRENT_PAGE?'active':''}">${n}</a>`).join('')}
      <button class="theme-btn" id="themeBtn" aria-label="Toggle theme"></button>
    </div>
  </div>
</div>`;

/* ── 页脚注入 ── */
document.getElementById('foot-root').innerHTML = `
<footer>
  <div class="glow-spot foot-glow"></div>
  <div class="foot-inner">
    <div>
      <div class="foot-tag">Home<span style="color:var(--accent)">Mining</span></div>
      <div class="foot-legal" style="margin-top:8px">
        Estimates only. Mining outcomes are probabilistic, not financial advice.
        Check your local regulations. Data: mempool.space · CoinGecko
      </div>
    </div>
    <div class="foot-links">${PAGES.map(([f,n]) => `<a href="${f}">${n}</a>`).join('')}</div>
  </div>
</footer>`;

/* ── 主题切换（localStorage 跨页记忆；默认浅色 = 00 文档 §6） ── */
const themeBtn = document.getElementById('themeBtn');
const ICON_MOON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-2px;margin-right:5px"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/></svg>';
const ICON_SUN  = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-2px;margin-right:5px"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  themeBtn.innerHTML = (t === 'light') ? ICON_MOON + 'Dark' : ICON_SUN + 'Light';
  dispatchEvent(new CustomEvent('hm-theme', {detail:t}));   /* 通知光带等主题感知组件 */
}
applyTheme(localStorage.getItem('hm_theme') || 'light');
themeBtn.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem('hm_theme', next);
});

/* ── 玻璃岛：滚动收缩（03 文档 §2） ── */
addEventListener('scroll', () => {
  document.body.classList.toggle('scrolled', scrollY > 24);
}, {passive:true});

/* ── 滑动高亮块 ── */
(function(){
  const navLinks = document.getElementById('navLinks');
  const pill = document.getElementById('navPill');
  function movePill(el){
    if (!el){ pill.style.opacity = 0; return; }
    pill.style.opacity = 1;
    pill.style.width = el.offsetWidth + 'px';
    pill.style.transform = `translateX(${el.offsetLeft}px)`;
  }
  /* 滑块只在 hover 期间出现（"去哪"）；离开即淡出——"在哪"由选中芯片+光点独立表达，避免双框叠加 */
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('mouseenter', () => movePill(a)));
  navLinks.addEventListener('mouseleave', () => { pill.style.opacity = 0; });
})();

/* ── 滚动渐显 ── */
const _io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting){ e.target.classList.add('visible'); _io.unobserve(e.target); }
  });
}, {threshold:.12});
document.querySelectorAll('.reveal').forEach(el => _io.observe(el));

/* ── CountUp：数字从 0 滚动到位（03 文档 §6，≤0.8s，快起缓落） ── */
function countUp(el, target, dur = 800){
  const t0 = performance.now();
  (function tick(now){
    const p = Math.min((now - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 4);
    el.textContent = Math.round(target * eased).toLocaleString('en-US');
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}
