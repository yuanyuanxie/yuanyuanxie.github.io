/* HammerFans 原型：矿机规格库（演示快照，正式版由爬虫流水线维护 specs.json） */
window.HF_MINERS = [
  // ---- Hammer（主推）----
  {id:'bc01', rel:'2025-07', brand:'Hammer', model:'BC 01', hammer:true, algo:'sha256', hDisp:'1.5 TH/s', ths:1.5,  watts:23,  noise:38, noiseTxt:'38dB', net:'WiFi/USB-C', price:159, open:'semi',
   zh:'超便携 USB-C 彩票矿机，1.9 英寸 AMOLED 屏，即插即用。', en:'Ultra-portable USB-C lottery miner with a 1.9-inch AMOLED display. Plug and play.'},
  {id:'bc04', rel:'2025-10', brand:'Hammer', model:'BC 04', hammer:true, algo:'sha256', hDisp:'6.0 TH/s', ths:6.0,  watts:96,  noise:40, noiseTxt:'40dB', net:'WiFi/以太网', netEn:'WiFi/Ethernet', price:299, open:'semi',
   zh:'Solo 与矿池双模式，家用场景的主力机型。', en:'Dual mode (solo and pool). The mainstream pick for home setups.'},
  {id:'bc08', rel:'2026-02', brand:'Hammer', model:'BC 08', hammer:true, algo:'sha256', hDisp:'12 TH/s',  ths:12,   watts:210, noise:45, noiseTxt:'45dB', net:'以太网', netEn:'Ethernet', price:499, open:'semi',
   zh:'家用旗舰，12 TH/s 配强化散热。', en:'Home flagship. 12 TH/s with upgraded cooling.'},
  {id:'dc02', rel:'2025-05', brand:'Hammer', model:'DC 02', hammer:true, algo:'scrypt', hDisp:'120 MH/s', mhs:120,  watts:30,  noise:40, noiseTxt:'40dB', net:'WiFi', price:249, open:'semi',
   zh:'入门级 Scrypt 矿机，挖 DOGE 与 LTC。', en:'Entry Scrypt miner for DOGE and LTC.'},
  {id:'dc04', rel:'2025-08', brand:'Hammer', model:'DC 04', hammer:true, algo:'scrypt', hDisp:'230 MH/s', mhs:230,  watts:60,  noise:41, noiseTxt:'41dB', net:'WiFi 2.4G', price:399, open:'semi',
   zh:'中端 Scrypt，散热增强。', en:'Mid-range Scrypt with better cooling.'},
  {id:'dc06', rel:'2025-04', brand:'Hammer', model:'DC 06', hammer:true, algo:'scrypt', hDisp:'330 MH/s', mhs:330,  watts:90,  noise:42, noiseTxt:'42dB', net:'以太网/WiFi', netEn:'Ethernet/WiFi', price:599, open:'semi',
   zh:'高配 Scrypt。官方博客案例：开机 5 天中 DOGE 块。', en:'High-end Scrypt. Official blog case: found a DOGE block 5 days after power-on.'},
  // ---- 竞品 ----
  {id:'bitaxe-gamma', rel:'2024-09', brand:'Bitaxe', model:'Gamma 602', algo:'sha256', hDisp:'1.2 TH/s', ths:1.2, watts:17, noise:0, noiseTxt:'~0dB', net:'WiFi', price:120, open:'full',
   zh:'开源标杆，BM1370 芯片，近乎无声。', en:'The open-source benchmark. BM1370 chip, near silent.'},
  {id:'bitaxe-gt', rel:'2025-11', brand:'Bitaxe', model:'GT 801', algo:'sha256', hDisp:'2.15 TH/s', ths:2.15, watts:36, noise:30, noiseTxt:'30dB', net:'WiFi', price:230, open:'full',
   zh:'Bitaxe 家族性能款。', en:'Performance model of the Bitaxe family.'},
  {id:'nerdqaxe', rel:'2025-02', brand:'NerdAxe', model:'NerdQAxe++', algo:'sha256', hDisp:'4.8 TH/s', ths:4.8, watts:72, noise:35, noiseTxt:'35dB', net:'WiFi', price:382, open:'full',
   zh:'四芯片开源机，能效 15 J/TH 级。', en:'Quad-chip open-source miner, roughly 15 J/TH.'},
  {id:'nerdoctaxe', rel:'2025-08', brand:'NerdAxe', model:'NerdOctaxe', algo:'sha256', hDisp:'9.6 TH/s', ths:9.6, watts:160, noise:45, noiseTxt:'45dB', net:'WiFi', price:799, open:'full',
   zh:'开源阵营算力之王。', en:'Highest hashrate in the open-source camp.'},
  {id:'nano3s', rel:'2025-03', brand:'Canaan', model:'Avalon Nano 3S', algo:'sha256', hDisp:'6.0 TH/s', ths:6.0, watts:140, noise:36, noiseTxt:'36dB', net:'WiFi/以太网', netEn:'WiFi/Ethernet', price:299, open:'closed',
   zh:'大厂家用机，性价比强，三档运行模式。', en:'Big-vendor home miner. Strong value, three power modes.'},
  {id:'lv06', rel:'2024-10', brand:'Lucky Miner', model:'LV06', algo:'sha256', hDisp:'0.5 TH/s', ths:0.5, watts:13, noise:35, noiseTxt:'35dB', net:'WiFi', price:80, open:'closed',
   zh:'80 美元级入门彩票机。', en:'Entry lottery miner around $80.'},
  {id:'minidoge3', rel:'2024-11', brand:'Goldshell', model:'Mini-DOGE III', algo:'scrypt', hDisp:'700 MH/s', mhs:700, watts:400, noise:45, noiseTxt:'45dB', net:'WiFi', price:699, open:'closed',
   zh:'Scrypt 家用老牌，App 远程管理。', en:'Veteran home Scrypt brand with app control.'},
  {id:'fluminer-l1', rel:'2024-11', brand:'Fluminer', model:'L1', algo:'scrypt', hDisp:'5.3 GH/s', mhs:5300, watts:1200, noise:40, noiseTxt:'40dB', net:'以太网', netEn:'Ethernet', price:1499, open:'closed',
   zh:'准专业级家用 Scrypt。', en:'Prosumer-grade home Scrypt.'},
  {id:'volcminer-d1', rel:'2025-02', brand:'VolcMiner', model:'D1 Mini', algo:'scrypt', hDisp:'2.2 GH/s', mhs:2200, watts:500, noise:42, noiseTxt:'42dB', net:'以太网', netEn:'Ethernet', price:999, open:'closed',
   zh:'紧凑型 Scrypt，能效出色。', en:'Compact Scrypt with excellent efficiency.'},
  {id:'dghome1', rel:'2024-12', brand:'ElphaPex', model:'DG Home 1', algo:'scrypt', hDisp:'2.1 GH/s', mhs:2100, watts:630, noise:45, noiseTxt:'45dB', net:'以太网', netEn:'Ethernet', price:1099, open:'closed',
   zh:'家用 Scrypt 中功率档。', en:'Mid-power home Scrypt.'},
];

/* 每日中块概率（1 in N；越小越好） */
window.minerDailyOdds = function(m){
  if (m.algo === 'sha256') return HF_SNAPSHOT.btcNetTHs / m.ths / 144;
  return HF_SNAPSHOT.dogeNetMHs / m.mhs / 1440;   // Scrypt 默认按 DOGE
};
/* 月电费 */
window.minerMonthlyCost = function(m, kwhPrice){
  return m.watts * 24 * 30 / 1000 * kwhPrice;
};
/* 每美元算力（GH/s per $，越大越好；跨算法仅同算法内比较有意义） */
window.minerHashPerDollar = function(m){
  const ghs = m.algo === 'sha256' ? m.ths * 1000 : m.mhs / 1000;
  return ghs / m.price;
};
