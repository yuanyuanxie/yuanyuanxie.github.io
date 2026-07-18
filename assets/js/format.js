/* ═══════════════════════════════════════════════════════════════
   HomeMining · 数字格式化（显示三铁律的代码化身）
   规范：docs/02-calculator-input-output.md §四
   铁律1：永不显示科学计数法
   铁律2：百分号背后必须真的 ×100
   铁律3：全站同一分母（由 data.js 保证，本文件只管排版）
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const Fmt = {

  /** 整数加千分位：1019000 → "1,019,000" */
  int(n){
    return Math.round(n).toLocaleString('en-US');
  },

  /** "1 in X"。X 过大时用英文数量词（million/billion/trillion/quadrillion），
      永不出现科学计数法 */
  oneIn(x){
    if (!isFinite(x) || x <= 0) return '—';
    if (x < 1e9)  return '1 in ' + Fmt.int(x);
    const scales = [[1e15,'quadrillion'],[1e12,'trillion'],[1e9,'billion']];
    for (const [v, name] of scales){
      if (x >= v) return '1 in ' + (x/v).toFixed(2).replace(/\.?0+$/,'') + ' ' + name;
    }
    return '1 in ' + Fmt.int(x);
  },

  /** 比例(0~1) → 百分数字符串。真·乘 100（铁律2），
      极小值显示 "less than 0.00001%"（铁律1） */
  pct(fraction){
    const p = fraction * 100;
    if (!isFinite(p) || p < 0) return '—';
    if (p === 0) return '0%';
    if (p < 0.00001) return 'less than 0.00001%';
    if (p >= 10)   return p.toFixed(1) + '%';
    if (p >= 0.01) return p.toFixed(2) + '%';
    // 0.00001 ~ 0.01：保留 2 位有效数字，定点展开，绝不用指数
    const digits = Math.min(7, Math.ceil(-Math.log10(p)) + 2);
    return p.toFixed(digits).replace(/0+$/,'').replace(/\.$/,'') + '%';
  },

  /** 预期等待：分钟 → 单位阶梯（02 文档定稿：
      minutes → hours → days → years → million/billion years） */
  wait(minutes){
    if (!isFinite(minutes) || minutes <= 0) return '—';
    if (minutes < 60)      return minutes.toFixed(0) + ' minutes';
    if (minutes < 1440)    return (minutes/60).toFixed(1) + ' hours';
    if (minutes < 525600)  return Fmt.int(minutes/1440) + ' days';
    const years = minutes / 525600;
    if (years < 1e4)  return Fmt.int(years) + ' years';
    if (years < 1e9)  return (years/1e6).toFixed(1).replace(/\.0$/,'') + ' million years';
    if (years < 1e12) return (years/1e9).toFixed(1).replace(/\.0$/,'') + ' billion years';
    return (years/1e12).toFixed(1).replace(/\.0$/,'') + ' trillion years';
  },

  /** 美元：201762.4 → "$201,762" */
  usd(n){
    if (!isFinite(n)) return '—';
    return '$' + Math.round(n).toLocaleString('en-US');
  },

  /** 算力：EH 数值 → "1,019 EH/s" */
  ehs(eh){
    if (!isFinite(eh)) return '—';
    return Fmt.int(eh) + ' EH/s';
  }
};
