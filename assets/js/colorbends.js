/* ═══════════════════════════════════════════════════════════════
   HomeMining · ColorBends 流光背景
   GLSL 逐字取自 reactbits.dev 主页 hero 实际运行的着色器
   （从其编译产物提取；React Bits 为 MIT License 开源项目）
   外壳：原生 WebGL 全屏三角形（替代其 THREE.js 壳，视觉一致）
   参数：与其主页 hero 完全相同
     color #A855F7 · speed .2 · frequency 1 · noise .15 · bandWidth .14
     rotation 90 · fadeTop .75 · iterations 1 · intensity 1.3
     warpStrength 11（默认值）· mouseInfluence .3（默认值）
   ═══════════════════════════════════════════════════════════════ */
'use strict';

(function(){

/* ── 片段着色器（reactbits.dev 主页版原文；仅追加 uGlobalAlpha 一处） ── */
const FRAG = `
precision mediump float;
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform vec3 uColor;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform float uNoise;
uniform float uBandWidth;
uniform float uYOffset;
uniform float uFadeTop;
uniform vec2 uPointer;
uniform float uMouseInfluence;
uniform int uIterations;
uniform float uIntensity;
uniform float uGlobalAlpha;
uniform int uInvert;      /* 0=深色发光模式（原版）；1=浅色颜料模式（白上铺色，配 CSS multiply） */
varying vec2 vUv;

void main() {
  float t = uTime * uSpeed;
  vec2 uv = vUv;
  uv.y += uYOffset;
  vec2 p = uv * 2.0 - 1.0;
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  float aspect = uCanvas.x / uCanvas.y;
  vec2 q = vec2(rp.x * aspect, rp.y);
  float invScale = 1.0 / max(uScale, 0.0001);
  q *= invScale;
  q /= 0.5 + 0.2 * dot(q, q);
  q += (uPointer - rp) * uMouseInfluence * 0.2;
  q += 0.2 * cos(t) - 7.56;

  for (int i = 0; i < 5; i++) {
    if (i >= uIterations) break;
    vec2 r = sin(1.5 * (q.yx * uFrequency) + 2.0 * cos(q * uFrequency));
    q = q + (r - q) * uWarpStrength;
  }

  float m = length(q + sin(5.0 * q.y * uFrequency - 3.0 * t) * 0.25);

  float w = 1.0 - exp(-6.0 / exp(6.0 * m));
  w = pow(clamp(w, 0.0, 1.0), uBandWidth);
  /* 原文为 smoothstep(uFadeTop, 0.0, y)（倒序边界，部分显卡未定义），改为等价安全写法 */
  w *= 1.0 - smoothstep(0.0, max(uFadeTop, 0.0001), vUv.y);
  w *= uIntensity;
  w *= uGlobalAlpha;

  float grain = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;

  if (uInvert == 1) {
    /* 浅色颜料模式：输出 白→主色 的实色，交给 CSS multiply 压进亮底 */
    float wn = clamp(w + grain * uNoise * 0.7, 0.0, 1.0);
    gl_FragColor = vec4(mix(vec3(1.0), uColor, wn), 1.0);
  } else {
    /* 深色发光模式（reactbits 原版路径） */
    vec3 col = uColor * w;
    col += grain * uNoise;
    col = clamp(col, 0.0, 1.0) * w;
    gl_FragColor = vec4(col, w);
  }
}`;

const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main(){
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

function hexToVec3(hex){
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/* 主题 → 渲染模式与用色
   深色 = reactbits 原版发光模式（黑丝绒上叠光）
   浅色 = 颜料模式（亮底上铺饱和紫，FUNCITY 式），配 CSS mix-blend-mode:multiply */
function themeParams(subtle){
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    invert: dark ? 0 : 1,
    color: hexToVec3(dark ? '#A855F7' : '#8b5cf6'),
    globalAlpha: (dark ? 1.0 : 0.85) * (subtle ? 0.5 : 1.0)
  };
}

function initCanvas(canvas){
  const gl = canvas.getContext('webgl', {alpha:true, antialias:false, premultipliedAlpha:true});
  if (!gl) return;                                   /* WebGL 不可用 → 保留 CSS 兜底光晕 */
  const hero = canvas.closest('.hero');

  const subtle  = canvas.dataset.fx === 'subtle';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function compile(type, src){
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
    return sh;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)){
    console.error(gl.getProgramInfoLog(prog));
    return;                                          /* 编译/链接失败 → 保留 CSS 兜底光晕 */
  }
  gl.useProgram(prog);
  hero.classList.add('fx-on');                       /* 着色器确认可用后才关闭 CSS 兜底 */

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const locPos = gl.getAttribLocation(prog, 'position');
  gl.enableVertexAttribArray(locPos);
  gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);      /* 预乘 alpha，同其 THREE 配置 */

  const U = {};
  ['uCanvas','uTime','uSpeed','uRot','uColor','uScale','uFrequency','uWarpStrength',
   'uNoise','uBandWidth','uYOffset','uFadeTop','uPointer','uMouseInfluence',
   'uIterations','uIntensity','uGlobalAlpha','uInvert'].forEach(n => U[n] = gl.getUniformLocation(prog, n));

  /* ── 参数：reactbits.dev 主页 hero 同款 ── */
  const rotation = 90;
  gl.uniform2f(U.uRot, Math.cos(rotation * Math.PI / 180), Math.sin(rotation * Math.PI / 180));
  gl.uniform1f(U.uSpeed, 0.2);
  gl.uniform1f(U.uScale, 1);
  gl.uniform1f(U.uFrequency, 1);
  gl.uniform1f(U.uWarpStrength, 1);   /* ⚠️ 必须 ≈1：warp 公式 q+(r−q)·k 在 k=1 时 q 收敛为有界的 r；
                                          k=11 会把 q 甩飞（配合 −7.56 偏移）导致全屏 w≈0 一片空白 */
  gl.uniform1f(U.uNoise, 0.15);
  gl.uniform1f(U.uBandWidth, 0.14);
  gl.uniform1f(U.uYOffset, 0.3);    /* hero 调用处显式传入（面板不显示的隐藏参数） */
  gl.uniform1f(U.uFadeTop, 0.75);
  gl.uniform1f(U.uMouseInfluence, 0.3);
  gl.uniform1i(U.uIterations, 1);
  gl.uniform1f(U.uIntensity, 1.25); /* 面板 def 默认值原文 */

  function applyTheme(){
    const p = themeParams(subtle);
    gl.uniform3fv(U.uColor, p.color);
    gl.uniform1f(U.uGlobalAlpha, p.globalAlpha);
    gl.uniform1i(U.uInvert, p.invert);
  }
  applyTheme();
  addEventListener('hm-theme', () => { applyTheme(); if (reduced) draw(lastT); });

  /* ── 鼠标视差（目标点 + 平滑趋近，同其实现思路） ── */
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  hero.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    targetX = ((e.clientX - r.left) / r.width) * 2 - 1;
    targetY = -(((e.clientY - r.top) / r.height) * 2 - 1);
  });
  hero.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; });

  function resize(){
    const dpr = Math.min(devicePixelRatio || 1, 1.5);  /* 同其 DPR 上限 */
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h){
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(U.uCanvas, w, h);
    }
  }

  let running = true, inView = true, lastT = 0, lastNow = performance.now();
  const t0 = lastNow;
  function draw(tSec){
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(U.uTime, tSec);
    gl.uniform2f(U.uPointer, curX, curY);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now){
    if (running && inView){
      resize();
      const dt = Math.min((now - lastNow) / 1000, 0.1);
      curX += (targetX - curX) * Math.min(1, dt * 8);
      curY += (targetY - curY) * Math.min(1, dt * 8);
      lastT = (now - t0) / 1000;
      draw(lastT);
    }
    lastNow = now;
    if (!reduced) requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => { running = !document.hidden; });
  new IntersectionObserver(es => { inView = es[0].isIntersecting; }).observe(canvas);

  resize();
  if (reduced){ draw(0); }
  else requestAnimationFrame(frame);
}

document.querySelectorAll('canvas.fx-canvas').forEach(initCanvas);

})();
