// Project Zero V49 - Daydream Reconstruction Gameplay
// Independent roguelite investigation module. No battle-core edits.
(function(global){
  "use strict";

  const SAVE_KEY = "project_zero_daydream_v49";
  const RUN_VERSION = 49;
  const MAX_POLLUTION = 100;
  const BASE_WILL = 72;

  function lang(){ return global.language === "en" ? "en" : "zh"; }
  function T(zh,en){ return lang()==="en" ? en : zh; }
  function now(){ return Date.now(); }
  function rand(seed){
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
  function clickRect(x,y,w,h){ return global.clicked && global.inRect && global.inRect(x,y,w,h); }
  function pulseColor(base="#9b7cff"){ return base; }
  function playerLevel(){
    const p = global.player || {};
    return Number(p.level || p.lv || global.playerLevel || 1) || 1;
  }
  function crystal(){ return Number(global.crystal || global.crystals || 0) || 0; }
  function safeCenter(text, frames=90){ if(global.showCenter) global.showCenter(text, frames); }
  function sfx(name){ if(global.sfx) global.sfx(name); }

  const nodeTypes = {
    story:{zh:"剧情",en:"Story",color:"#9b7cff"},
    event:{zh:"事件",en:"Event",color:"#ffe066"},
    battle:{zh:"战斗",en:"Battle",color:"#ff6b9b"},
    safe:{zh:"休整",en:"Rest",color:"#7cffb2"},
    nightmare:{zh:"梦魇",en:"Nightmare",color:"#b15cff"},
    boss:{zh:"终点",en:"Final",color:"#ff9955"}
  };

  const nightmarePool = [
    {id:"bell", zh:"神乐铃", en:"Kagura Bell", descZh:"铃声让路径变得清晰，但污染轻微上升。", descEn:"The bell clarifies the path, but raises pollution slightly.", clue:1, pollution:5},
    {id:"torii", zh:"鸟居残片", en:"Torii Fragment", descZh:"残片指向了日斩的入口。", descEn:"The fragment points toward Hizan's entrance.", clue:2, pollution:3},
    {id:"blade", zh:"断刃", en:"Broken Blade", descZh:"断刃会强化下一次战斗判定。", descEn:"The broken blade strengthens the next combat check.", buff:"combat", pollution:6},
    {id:"omamori", zh:"御守", en:"Omamori", descZh:"旧御守暂时压住了精神污染。", descEn:"An old charm briefly suppresses contamination.", pollution:-8},
    {id:"paper", zh:"纸人", en:"Paper Doll", descZh:"纸人记录了一个不属于你的记忆。", descEn:"The paper doll records a memory that is not yours.", clue:1, pollution:8},
    {id:"mask", zh:"狐狸面", en:"Fox Mask", descZh:"面具让你看见了另一条路。", descEn:"The mask reveals another route.", clue:1, will:6},
    {id:"mirror", zh:"镜", en:"Mirror", descZh:"镜中倒影确认了一个关键真相。", descEn:"The reflection confirms a key truth.", clue:3, pollution:10},
    {id:"finality", zh:"终焉", en:"Finality", descZh:"它不应该在这里出现。", descEn:"It should not appear here.", clue:2, pollution:14}
  ];

  const eventPool = [
    {
      id:"station", titleZh:"无人车站", titleEn:"Empty Station",
      bodyZh:"站台广播不断重复你的代号。远处有一张掉落的调查卡。",
      bodyEn:"The platform broadcast repeats your code name. A dropped investigation card lies nearby.",
      choices:[
        {zh:"拾起调查卡", en:"Take the card", clue:2, pollution:7, msgZh:"获得线索 +2，污染 +7%。", msgEn:"Clue +2, Pollution +7%."},
        {zh:"关闭广播", en:"Shut down the broadcast", will:8, pollution:3, msgZh:"意志 +8，污染 +3%。", msgEn:"Will +8, Pollution +3%."},
        {zh:"直接离开", en:"Leave", pollution:1, msgZh:"你没有停留。污染 +1%。", msgEn:"You do not stay. Pollution +1%."}
      ]
    },
    {
      id:"shrine", titleZh:"破旧神社", titleEn:"Ruined Shrine",
      bodyZh:"神社中央有一口干井，井底传来敲击声。",
      bodyEn:"At the center of the shrine is a dry well. Knocking echoes from below.",
      choices:[
        {zh:"向井底呼喊", en:"Call into the well", clue:1, pollution:5, msgZh:"线索 +1，污染 +5%。", msgEn:"Clue +1, Pollution +5%."},
        {zh:"封住井口", en:"Seal the well", will:10, msgZh:"意志 +10。", msgEn:"Will +10."},
        {zh:"投入晶体碎片", en:"Drop a crystal shard", clue:2, pollution:10, nightmare:true, msgZh:"线索 +2，污染 +10%，梦魇显现。", msgEn:"Clue +2, Pollution +10%, a Nightmare appears."}
      ]
    },
    {
      id:"classroom", titleZh:"旧教室", titleEn:"Old Classroom",
      bodyZh:"黑板上写着：不要相信醒来后的第一句话。",
      bodyEn:"On the blackboard: Do not trust the first sentence after waking.",
      choices:[
        {zh:"记录文字", en:"Record the sentence", clue:2, pollution:4, msgZh:"线索 +2，污染 +4%。", msgEn:"Clue +2, Pollution +4%."},
        {zh:"擦掉黑板", en:"Erase the board", will:6, pollution:-3, msgZh:"意志 +6，污染 -3%。", msgEn:"Will +6, Pollution -3%."},
        {zh:"翻找课桌", en:"Search desks", clue:1, item:"note", msgZh:"获得线索 +1，并记录一页笔记。", msgEn:"Clue +1 and a note recorded."}
      ]
    },
    {
      id:"river", titleZh:"黑水河", titleEn:"Blackwater River",
      bodyZh:"河面倒映着没有发生过的结局。你可以涉水，也可以绕路。",
      bodyEn:"The river reflects endings that never happened. You can cross or detour.",
      choices:[
        {zh:"涉水穿过", en:"Cross the river", clue:2, pollution:12, msgZh:"线索 +2，污染 +12%。", msgEn:"Clue +2, Pollution +12%."},
        {zh:"沿岸调查", en:"Investigate the bank", clue:1, will:4, msgZh:"线索 +1，意志 +4。", msgEn:"Clue +1, Will +4."},
        {zh:"绕开", en:"Take a detour", pollution:-4, msgZh:"污染 -4%。", msgEn:"Pollution -4%."}
      ]
    }
  ];

  const battlePool = [
    {id:"village", zh:"废弃村落", en:"Abandoned Village", power:38, rewardClue:1, pollution:6},
    {id:"street", zh:"结晶街道", en:"Crystalized Street", power:45, rewardClue:2, pollution:8},
    {id:"lantern", zh:"灯笼回廊", en:"Lantern Corridor", power:52, rewardClue:2, pollution:10},
    {id:"gate", zh:"深层门前", en:"Before the Deep Gate", power:60, rewardClue:3, pollution:12}
  ];

  const endingDefs = {
    truth:{nameZh:"死亡的真相", nameEn:"The Truth of Death", hintZh:"线索足够，污染没有完全吞没你。", hintEn:"Enough clues, and contamination did not consume you."},
    nightmare:{nameZh:"梦魇", nameEn:"Nightmare", hintZh:"梦魇数量过多。", hintEn:"Too many Nightmares gathered."},
    contamination:{nameZh:"精神污染", nameEn:"Mental Contamination", hintZh:"污染达到极限。", hintEn:"Pollution reached the limit."},
    redemption:{nameZh:"救赎", nameEn:"Redemption", hintZh:"意志足够强，仍保留自我。", hintEn:"Your will remained strong enough."},
    sacrifice:{nameZh:"牺牲", nameEn:"Sacrifice", hintZh:"真相不足，只能带回部分记录。", hintEn:"The truth is incomplete; only fragments return."}
  };

  const Daydream = {
    page:"home", // home / run / codex / endings / result
    pulse:0,
    message:"",
    state:null,
    result:null,
    entryAnim:1,
    entryPlaying:false,

    startEntryAnimation(){
      this.entryAnim = 0;
      this.entryPlaying = true;
      this.page = "home";
      this.message = T("精神同步中……","Synchronizing...");
    },

    updateEntryAnimation(){
      if(!this.entryPlaying) return;
      const fs = global.frameScale || 1;
      this.entryAnim = Math.min(1, this.entryAnim + 0.022 * fs);
      if(this.entryAnim >= 1) this.entryPlaying = false;
    },

    entryEase(t){
      return 1 - Math.pow(1 - clamp(t,0,1), 3);
    },

    init(){
      try{
        const raw = localStorage.getItem(SAVE_KEY);
        if(raw){
          const data = JSON.parse(raw);
          if(data && typeof data === "object") this.state = data;
        }
      }catch(e){ console.warn("[PZDaydream] load failed", e); }
      if(!this.state){
        this.state = {version:RUN_VERSION, totalRuns:0, bestClue:0, unlockedEndings:{}, unlockedNightmares:{}};
        this.save();
      }
    },

    save(){
      try{ localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); }
      catch(e){ console.warn("[PZDaydream] save failed", e); }
    },

    scenarioName(){ return T("Project Zero：日斩","Project Zero: Hizan"); },
    title(){ return T("白日梦重现","Daydream Reconstruction"); },
    endingCount(){ return Object.keys(this.state.unlockedEndings || {}).length; },
    nightmareCount(){ return Object.keys(this.state.unlockedNightmares || {}).length; },

    makeRoute(){
      const seed = now() % 999999;
      const ev1 = eventPool[Math.floor(rand(seed+1)*eventPool.length)];
      const ev2 = eventPool[Math.floor(rand(seed+7)*eventPool.length)];
      const b1 = battlePool[Math.floor(rand(seed+11)*battlePool.length)];
      const b2 = battlePool[Math.floor(rand(seed+17)*battlePool.length)];
      return [
        {type:"story", zh:"鸟居入口", en:"Torii Gate", resolved:false},
        {type:"event", event:ev1, zh:ev1.titleZh, en:ev1.titleEn, resolved:false},
        {type:"battle", battle:b1, zh:b1.zh, en:b1.en, resolved:false},
        {type:"safe", zh:"破旧神社", en:"Ruined Shrine", resolved:false},
        {type:"nightmare", zh:"梦魇显现", en:"Nightmare Manifest", resolved:false},
        {type:"event", event:ev2, zh:ev2.titleZh, en:ev2.titleEn, resolved:false},
        {type:"battle", battle:b2, zh:b2.zh, en:b2.en, resolved:false},
        {type:"boss", zh:"日斩深层", en:"Hizan Depth", resolved:false}
      ];
    },

    createRun(){
      this.run = {
        floor:1,
        currentNode:0,
        pollution:0,
        clue:0,
        will:BASE_WILL + Math.min(18, playerLevel()),
        nightmares:[],
        flags:{combatBuff:0, notes:0},
        route:this.makeRoute(),
        activeChoice:-1,
        log:[T("调查开始。","Investigation started.")],
        completed:false
      };
      this.page="run";
      this.message=T("调查开始。","Investigation started.");
      this.resolveCurrentNode(true);
      sfx("reward");
    },

    currentNode(){ return this.run && this.run.route ? this.run.route[this.run.currentNode] : null; },
    nodeName(node){ return T(node.zh || "???", node.en || node.zh || "???"); },

    addLog(text){
      if(!this.run) return;
      this.run.log.unshift(text);
      this.run.log = this.run.log.slice(0,5);
      this.message = text;
    },

    applyEffect(effect){
      if(!this.run || !effect) return;
      if(effect.clue) this.run.clue = clamp(this.run.clue + effect.clue, 0, 99);
      if(effect.will) this.run.will = clamp(this.run.will + effect.will, 0, 120);
      if(effect.pollution) this.run.pollution = clamp(this.run.pollution + effect.pollution, 0, MAX_POLLUTION);
      if(effect.item === "note") this.run.flags.notes = (this.run.flags.notes||0) + 1;
      if(effect.buff === "combat") this.run.flags.combatBuff = (this.run.flags.combatBuff||0) + 1;
      if(effect.nightmare) this.gainNightmare();
    },

    gainNightmare(){
      if(!this.run) return null;
      const seed = now() + this.run.currentNode*31 + this.run.nightmares.length*7;
      let n = nightmarePool[Math.floor(rand(seed) * nightmarePool.length)];
      let tries = 0;
      while(this.run.nightmares.includes(n.id) && tries++ < 12){
        n = nightmarePool[Math.floor(rand(seed+tries*13) * nightmarePool.length)];
      }
      if(!this.run.nightmares.includes(n.id)) this.run.nightmares.push(n.id);
      this.state.unlockedNightmares[n.id] = true;
      this.applyEffect(n);
      this.save();
      return n;
    },

    resolveCurrentNode(first=false){
      const node = this.currentNode();
      if(!node || node.resolved || !this.run) return;
      this.run.activeChoice = -1;

      if(node.type === "story"){
        node.resolved = true;
        this.run.clue += 1;
        this.addLog(T("你穿过鸟居，日斩的记录开始复原。线索 +1。","You pass the torii. Hizan records begin to reconstruct. Clue +1."));
        return;
      }
      if(node.type === "safe"){
        node.resolved = true;
        const reduce = 12;
        this.run.pollution = clamp(this.run.pollution - reduce, 0, MAX_POLLUTION);
        this.run.will = clamp(this.run.will + 10, 0, 120);
        this.addLog(T("休整完成：污染 -12%，意志 +10。","Rest complete: Pollution -12%, Will +10."));
        return;
      }
      if(node.type === "nightmare"){
        node.resolved = true;
        const n = this.gainNightmare();
        this.addLog(T("梦魇词条解锁：","Nightmare unlocked: ") + (n ? T(n.zh,n.en) : "???"));
        return;
      }
      if(node.type === "battle"){
        node.resolved = true;
        const b = node.battle;
        const power = Math.floor(this.run.will*0.55 + playerLevel()*5 + (this.run.flags.combatBuff||0)*18 - this.run.pollution*0.22);
        const success = power >= b.power;
        if(success){
          this.run.clue = clamp(this.run.clue + b.rewardClue, 0, 99);
          this.run.pollution = clamp(this.run.pollution + b.pollution, 0, MAX_POLLUTION);
          this.addLog(T("战斗胜利：","Battle cleared: ") + this.nodeName(node) + T("，线索 +","，Clue +") + b.rewardClue + T("，污染 +","，Pollution +") + b.pollution + "%");
          sfx("break");
        }else{
          this.run.pollution = clamp(this.run.pollution + b.pollution + 12, 0, MAX_POLLUTION);
          this.run.will = clamp(this.run.will - 12, 0, 120);
          this.addLog(T("战斗勉强通过：污染大幅上升，意志下降。","Battle barely survived: pollution rises, will drops."));
          sfx("hit");
        }
        if(this.run.flags.combatBuff) this.run.flags.combatBuff = Math.max(0, this.run.flags.combatBuff-1);
        return;
      }
      if(node.type === "event"){
        this.addLog(T("事件出现：","Event: ") + this.nodeName(node));
        return;
      }
      if(node.type === "boss"){
        node.resolved = true;
        this.finishRun();
      }
    },

    chooseEvent(choiceIndex){
      const node = this.currentNode();
      if(!node || node.type !== "event" || node.resolved) return;
      const choice = node.event.choices[choiceIndex];
      if(!choice) return;
      node.resolved = true;
      this.applyEffect(choice);
      this.addLog(T(choice.msgZh, choice.msgEn));
      sfx("ui");
      if(this.run.pollution >= MAX_POLLUTION) this.finishRun();
    },

    advance(){
      if(!this.run) return;
      const node = this.currentNode();
      if(node && node.type === "event" && !node.resolved){
        this.addLog(T("请先选择事件处理方式。","Choose how to handle the event first."));
        return;
      }
      if(this.run.pollution >= MAX_POLLUTION){ this.finishRun(); return; }
      if(this.run.currentNode < this.run.route.length - 1){
        this.run.currentNode++;
        this.run.floor = this.run.currentNode + 1;
        this.resolveCurrentNode();
      }else{
        this.finishRun();
      }
    },

    judgeEnding(){
      const r = this.run;
      if(!r) return "sacrifice";
      if(r.pollution >= 100) return "contamination";
      if(r.nightmares.length >= 4 && r.clue < 9) return "nightmare";
      if(r.clue >= 11 && r.pollution < 80) return "truth";
      if(r.will >= 95 && r.pollution < 70) return "redemption";
      return "sacrifice";
    },

    finishRun(){
      if(!this.run || this.run.completed) return;
      this.run.completed = true;
      const ending = this.judgeEnding();
      const def = endingDefs[ending];
      this.state.totalRuns = (this.state.totalRuns || 0) + 1;
      this.state.bestClue = Math.max(this.state.bestClue || 0, this.run.clue || 0);
      this.state.unlockedEndings[ending] = true;
      this.save();
      this.result = {
        ending,
        name:T(def.nameZh,def.nameEn),
        hint:T(def.hintZh,def.hintEn),
        clue:this.run.clue,
        pollution:this.run.pollution,
        will:this.run.will,
        nightmares:this.run.nightmares.length
      };
      this.page="result";
      this.message=T("调查结束。","Investigation complete.");
      if(global.addActionRecordTaskProgress) global.addActionRecordTaskProgress("daydream",1);
      if(global.addActionRecordExp) global.addActionRecordExp(120,"daydream");
      sfx("reward");
      safeCenter(T("结局解锁：","Ending unlocked: ") + this.result.name, 120);
    },

    exitRun(){ this.run=null; this.page="home"; this.message=""; },

    drawBasePanel(){
      const ctx=global.ctx, W=global.W, H=global.H, FONT_UI=global.FONT_UI;
      this.pulse += 0.035;
      ctx.save();
      if(global.uiPanel) global.uiPanel(70,120,980,440,"rgba(155,124,255,.32)","rgba(5,8,18,.86)");
      else { ctx.fillStyle="rgba(5,8,18,.86)"; ctx.fillRect(70,120,980,440); ctx.strokeStyle="rgba(155,124,255,.32)"; ctx.strokeRect(70,120,980,440); }
      ctx.fillStyle="rgba(155,124,255,.10)";
      for(let i=0;i<8;i++){
        ctx.beginPath(); ctx.arc(220,275,40+i*28+Math.sin(this.pulse+i)*3,0,Math.PI*2); ctx.strokeStyle="rgba(155,124,255,"+(0.10-i*0.008)+")"; ctx.stroke();
      }
      ctx.restore();
    },

    drawHeader(){
      const ctx=global.ctx, FONT_UI=global.FONT_UI;
      ctx.fillStyle="#9b7cff"; ctx.font="bold 28px "+FONT_UI; ctx.textAlign="left";
      ctx.fillText(this.title(),95,158);
      ctx.fillStyle="rgba(255,255,255,.62)"; ctx.font="14px "+FONT_UI;
      ctx.fillText(this.scenarioName()+"  ·  "+T("多结局调查 / 精神污染 / 梦魇词条","Multi-ending Investigation / Mental Pollution / Nightmare Tags"),97,181);
    },

    drawPage(){
      if(!this.state) this.init();
      this.updateEntryAnimation();
      if(this.page==="run" && this.run) this.drawRun();
      else if(this.page==="codex") this.drawCodex();
      else if(this.page==="endings") this.drawEndings();
      else if(this.page==="result") this.drawResult();
      else this.drawHome();
    },

    drawHome(){
      const ctx=global.ctx, W=global.W, H=global.H, FONT_UI=global.FONT_UI;
      this.pulse += 0.025;

      // V49.1 Daydream main page: reference-style exploration lobby.
      // Layout direction: large scenario banner, left investigation systems,
      // right operators silhouette, bottom-right start exploration.
      ctx.save();

      // Simple entry animation when opening Daydream from the bottom tab.
      // PZ direction: fade-in, slight camera push, sync text overlay.
      const enterT = this.entryEase(this.entryAnim);
      if(this.entryPlaying){
        ctx.globalAlpha = 0.18 + enterT * 0.82;
        ctx.translate(0, (1-enterT) * 18);
      }

      // Full inner scene panel
      const x0=70, y0=118, w0=980, h0=442;
      const bg=ctx.createLinearGradient(x0,y0,x0+w0,y0+h0);
      bg.addColorStop(0,"#182236");
      bg.addColorStop(0.42,"#dbe8ff");
      bg.addColorStop(1,"#08101c");
      ctx.fillStyle=bg;
      ctx.fillRect(x0,y0,w0,h0);

      // cold fog overlay
      const fog=ctx.createRadialGradient(535,320,40,535,320,560);
      fog.addColorStop(0,"rgba(255,255,255,.48)");
      fog.addColorStop(0.45,"rgba(172,205,255,.18)");
      fog.addColorStop(1,"rgba(5,9,18,.78)");
      ctx.fillStyle=fog;
      ctx.fillRect(x0,y0,w0,h0);

      // snow / broken world horizon
      ctx.globalAlpha=.72;
      ctx.strokeStyle="rgba(255,255,255,.55)";
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(94,408); ctx.bezierCurveTo(250,382,360,428,520,391); ctx.bezierCurveTo(690,354,810,384,1028,345); ctx.stroke();
      ctx.globalAlpha=.28;
      for(let i=0;i<34;i++){
        const xx=92+i*30;
        const yy=400+Math.sin(i*1.7+this.pulse)*22;
        ctx.beginPath(); ctx.moveTo(xx,yy); ctx.lineTo(xx+38,yy-18-Math.sin(i)*18); ctx.stroke();
      }
      ctx.globalAlpha=1;

      // distant torn pillars
      function shard(cx,cy,h,tilt,alpha){
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(tilt);
        ctx.fillStyle="rgba(220,235,255,"+alpha+")";
        ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(8,-h); ctx.lineTo(20,0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle="rgba(255,255,255,"+(alpha+.12)+")"; ctx.stroke(); ctx.restore();
      }
      shard(560,365,170,-.12,.22); shard(642,350,220,.16,.18); shard(710,372,130,.25,.20); shard(460,370,95,-.25,.16);

      // left dark title wash
      const wash=ctx.createLinearGradient(70,118,540,118);
      wash.addColorStop(0,"rgba(5,8,18,.78)"); wash.addColorStop(.75,"rgba(5,8,18,.10)"); wash.addColorStop(1,"rgba(5,8,18,0)");
      ctx.fillStyle=wash; ctx.fillRect(x0,y0,560,h0);

      // right character silhouettes, PZ original style rather than copied characters
      ctx.save();
      ctx.translate(760,282);
      ctx.fillStyle="rgba(12,17,36,.70)";
      ctx.beginPath(); ctx.ellipse(0,82,105,24,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="rgba(220,235,255,.42)"; ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(-35,110); ctx.lineTo(-20,20); ctx.lineTo(-48,-55); ctx.moveTo(-20,20); ctx.lineTo(36,105); ctx.stroke();
      ctx.fillStyle="rgba(36,32,64,.82)"; ctx.beginPath(); ctx.arc(-48,-70,23,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(28,24,52,.86)"; ctx.beginPath(); ctx.moveTo(-36,-44); ctx.lineTo(22,10); ctx.lineTo(-2,80); ctx.lineTo(-80,15); ctx.closePath(); ctx.fill();
      ctx.strokeStyle="rgba(155,205,255,.62)"; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(18,-40); ctx.lineTo(78,-100); ctx.moveTo(18,-40); ctx.lineTo(82,-18); ctx.stroke();
      ctx.globalAlpha=.78;
      ctx.fillStyle="rgba(230,240,255,.72)"; ctx.beginPath(); ctx.arc(112,-54,19,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="rgba(210,230,255,.65)"; ctx.beginPath(); ctx.moveTo(110,-36); ctx.lineTo(94,70); ctx.moveTo(105,-6); ctx.lineTo(146,-72); ctx.stroke();
      ctx.restore();

      // Header / title
      ctx.textAlign="left";
      ctx.fillStyle="rgba(255,255,255,.72)"; ctx.font="bold 17px "+FONT_UI;
      ctx.fillText("DAYDREAM RECONSTRUCTION",106,172);
      ctx.fillStyle="rgba(255,255,255,.92)"; ctx.font="bold 38px "+FONT_UI;
      ctx.fillText(this.title(),105,214);
      ctx.fillStyle="rgba(255,255,255,.56)"; ctx.font="bold 30px "+FONT_UI;
      ctx.fillText(this.scenarioName(),107,250);

      // subtitle line
      ctx.fillStyle="rgba(255,255,255,.62)"; ctx.font="14px "+FONT_UI;
      ctx.fillText(T("精神污染 / 多结局 / 梦魇词条 / 节点探索","Mental Pollution / Multi-ending / Nightmare Tags / Node Route"),108,279);

      // logo ring at top-left
      ctx.save(); ctx.translate(116,323);
      for(let i=0;i<4;i++){
        ctx.beginPath(); ctx.arc(0,0,14+i*5+Math.sin(this.pulse+i)*1.5,Math.PI*.15,Math.PI*1.85);
        ctx.strokeStyle="rgba(220,245,255,"+(0.55-i*.08)+")"; ctx.lineWidth=2; ctx.stroke();
      }
      ctx.restore();

      // Left activity cards like reference
      function refCard(x,y,w,h,color,title,value,tag){
        ctx.save();
        ctx.fillStyle="rgba(7,15,27,.62)"; ctx.fillRect(x,y,w,h);
        ctx.strokeStyle=color; ctx.lineWidth=2; ctx.strokeRect(x,y,w,h);
        ctx.fillStyle=color; ctx.font="bold 14px "+FONT_UI; ctx.fillText(title,x+48,y+23);
        ctx.fillStyle="rgba(255,255,255,.92)"; ctx.font="bold 20px "+FONT_UI; ctx.fillText(value,x+48,y+50);
        ctx.fillStyle="rgba(255,255,255,.45)"; ctx.font="11px "+FONT_UI; ctx.fillText(tag,x+48,y+70);
        ctx.beginPath(); ctx.arc(x+24,y+38,17,0,Math.PI*2); ctx.strokeStyle=color; ctx.lineWidth=3; ctx.stroke();
        ctx.beginPath(); ctx.arc(x+24,y+38,8,0,Math.PI*2); ctx.strokeStyle="rgba(255,255,255,.7)"; ctx.lineWidth=2; ctx.stroke();
        ctx.restore();
      }
      refCard(106,335,230,78,"rgba(180,225,255,.72)",T("冬夜展览馆","Winter Night"),T("调查开放","New Route"),T("主线模拟关卡","Scenario"));
      refCard(106,424,230,78,"rgba(120,215,255,.86)",T("文化比较","Cultural Trace"),String(this.nightmareCount())+" / "+nightmarePool.length,T("梦魇图鉴记录","Codex Record"));

      // Initial investigation system block
      ctx.save();
      ctx.translate(360,424);
      ctx.fillStyle="rgba(5,18,23,.62)"; ctx.fillRect(0,0,230,78);
      ctx.strokeStyle="rgba(80,255,210,.72)"; ctx.lineWidth=2; ctx.strokeRect(0,0,230,78);
      ctx.beginPath(); ctx.moveTo(26,15); ctx.lineTo(48,55); ctx.lineTo(5,55); ctx.closePath(); ctx.strokeStyle="rgba(80,255,210,.85)"; ctx.lineWidth=3; ctx.stroke();
      ctx.fillStyle="rgba(255,255,255,.70)"; ctx.font="bold 13px "+FONT_UI; ctx.fillText(T("初始性投资系统","Initial Investigation System"),62,25);
      ctx.fillStyle="rgba(120,255,230,.95)"; ctx.font="bold 26px "+FONT_UI; ctx.fillText(String(this.state.bestClue||0),62,58);
      ctx.restore();

      // right top monthly task style
      ctx.save();
      ctx.fillStyle="rgba(4,12,20,.55)"; ctx.fillRect(828,148,180,52);
      ctx.strokeStyle="rgba(185,235,255,.32)"; ctx.strokeRect(828,148,180,52);
      ctx.fillStyle="rgba(210,242,255,.75)"; ctx.font="bold 14px "+FONT_UI; ctx.textAlign="right";
      ctx.fillText(T("本月委托相关","Monthly Commission"),998,180);
      ctx.restore();

      // bottom left small buttons
      if(global.drawBtn){
        global.drawBtn(T("梦魇图鉴","Codex"),"",104,514,128,36,false,"#d9ecff");
        global.drawBtn(T("结局一览","Endings"),"",246,514,128,36,false,"#d9ecff");
      }

      // main start button reference-style
      ctx.save();
      const sx=828, sy=486, sw=184, sh=58;
      ctx.fillStyle="rgba(3,18,25,.82)"; ctx.fillRect(sx,sy,sw,sh);
      ctx.strokeStyle="rgba(145,255,255,.95)"; ctx.lineWidth=2; ctx.strokeRect(sx,sy,sw,sh);
      ctx.fillStyle="rgba(145,255,255,.18)"; ctx.fillRect(sx+4,sy+4,sw-8,sh-8);
      ctx.fillStyle="#eaffff"; ctx.font="bold 26px "+FONT_UI; ctx.textAlign="center";
      ctx.fillText(T("开始探索","START"),sx+sw/2,sy+38);
      ctx.strokeStyle="rgba(145,255,255,.75)"; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(sx+sw-32,sy+18); ctx.lineTo(sx+sw-16,sy+29); ctx.lineTo(sx+sw-32,sy+40); ctx.stroke();
      ctx.restore();

      // Entry overlay: fades out over the page.
      if(this.entryPlaying){
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        const t = enterT;
        const black = Math.max(0, 1 - t * 1.15);
        ctx.fillStyle = "rgba(0,0,0," + (0.82 * black).toFixed(3) + ")";
        ctx.fillRect(0,0,W,H);

        const titleAlpha = Math.max(0, 1 - Math.abs(t - 0.32) / 0.42);
        ctx.globalAlpha = titleAlpha;
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(235,245,255,.96)";
        ctx.font = "bold 28px " + FONT_UI;
        ctx.fillText("DAYDREAM RECONSTRUCTION", W/2, H/2 - 28);
        ctx.fillStyle = "rgba(155,124,255,.88)";
        ctx.font = "15px " + FONT_UI;
        ctx.fillText(T("精神同步中……","Synchronizing..."), W/2, H/2 + 8);

        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.strokeStyle = "rgba(155,205,255,.38)";
        ctx.lineWidth = 2;
        const scanY = 140 + t * 370;
        ctx.beginPath();
        ctx.moveTo(170, scanY);
        ctx.lineTo(W-170, scanY);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    },

    drawRoute(){
      const ctx=global.ctx, FONT_UI=global.FONT_UI;
      const route = this.run.route;
      for(let i=0;i<route.length;i++){
        const n=route[i], info=nodeTypes[n.type] || nodeTypes.event;
        const x=130+i*116, y=245;
        if(i>0){ ctx.strokeStyle="rgba(255,255,255,.20)"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(x-78,y); ctx.lineTo(x-28,y); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(x,y,24,0,Math.PI*2);
        ctx.fillStyle = i===this.run.currentNode ? info.color : (n.resolved ? "rgba(255,255,255,.30)" : "rgba(255,255,255,.08)");
        ctx.fill(); ctx.strokeStyle= i===this.run.currentNode ? "#fff" : "rgba(255,255,255,.32)"; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle = i===this.run.currentNode ? "#050814" : "rgba(255,255,255,.80)";
        ctx.font="bold 12px "+FONT_UI; ctx.textAlign="center"; ctx.fillText(String(i+1),x,y+4);
        ctx.fillStyle="rgba(255,255,255,.70)"; ctx.font="11px "+FONT_UI;
        ctx.fillText(T(info.zh,info.en),x,y+43);
      }
    },

    drawRun(){
      const ctx=global.ctx, FONT_UI=global.FONT_UI;
      const run=this.run, node=this.currentNode();
      this.drawBasePanel(); this.drawHeader(); this.drawRoute();

      const stats = [
        [T("层数","Depth"), run.floor+" / "+run.route.length],
        [T("线索","Clue"), String(run.clue)],
        [T("意志","Will"), String(run.will)],
        [T("污染","Pollution"), run.pollution+"%"],
        [T("梦魇","Nightmare"), run.nightmares.length]
      ];
      for(let i=0;i<stats.length;i++){
        const x=110+i*185, y=312, w=160, h=54;
        if(global.uiCard) global.uiCard(x,y,w,h, i===3 && run.pollution>=70 ? "#ff6b9b" : "#9b7cff", false);
        ctx.fillStyle="rgba(255,255,255,.55)"; ctx.font="12px "+FONT_UI; ctx.textAlign="left"; ctx.fillText(stats[i][0],x+13,y+21);
        ctx.fillStyle="#fff"; ctx.font="bold 20px "+FONT_UI; ctx.fillText(stats[i][1],x+13,y+45);
      }

      ctx.fillStyle="#fff"; ctx.font="bold 22px "+FONT_UI; ctx.textAlign="left";
      ctx.fillText(node ? this.nodeName(node) : "???",115,405);
      ctx.fillStyle="rgba(255,255,255,.58)"; ctx.font="13px "+FONT_UI;
      if(node && node.type === "event" && !node.resolved){
        ctx.fillText(T(node.event.bodyZh,node.event.bodyEn),116,430);
        for(let i=0;i<node.event.choices.length;i++){
          const c=node.event.choices[i]; const x=118+i*300, y=458, w=280, h=48;
          if(global.uiCard) global.uiCard(x,y,w,h,"#ffe066",false);
          ctx.fillStyle="rgba(255,255,255,.88)"; ctx.font="bold 13px "+FONT_UI; ctx.fillText((i+1)+". "+T(c.zh,c.en),x+14,y+30);
        }
      }else{
        const logs = run.log || [];
        for(let i=0;i<Math.min(4,logs.length);i++){
          ctx.fillStyle=i===0?"#ffe066":"rgba(255,255,255,.58)"; ctx.font=(i===0?"bold ":"")+"13px "+FONT_UI;
          ctx.fillText("· "+logs[i],116,430+i*22);
        }
      }

      global.drawBtn(T("推进节点","Advance"),"",805,520,145,44,true,"#9b7cff");
      global.drawBtn(T("退出探索","Exit Run"),"",645,520,145,44,false,"#fff");
      global.drawBtn(T("返回首页","Home"),"",500,520,120,44,false,"#fff");
    },

    drawCodex(){
      const ctx=global.ctx, FONT_UI=global.FONT_UI;
      this.drawBasePanel(); this.drawHeader();
      ctx.fillStyle="#9b7cff"; ctx.font="bold 24px "+FONT_UI; ctx.textAlign="left";
      ctx.fillText(T("梦魇图鉴","Nightmare Codex"),95,215);
      for(let i=0;i<nightmarePool.length;i++){
        const n=nightmarePool[i]; const unlocked=!!this.state.unlockedNightmares[n.id];
        const col=i%2, row=Math.floor(i/2); const x=110+col*465, y=245+row*58, w=430, h=46;
        if(global.uiCard) global.uiCard(x,y,w,h,unlocked?"#9b7cff":"#666",false);
        ctx.fillStyle=unlocked?"#fff":"rgba(255,255,255,.35)"; ctx.font="bold 14px "+FONT_UI; ctx.textAlign="left";
        ctx.fillText(unlocked ? T(n.zh,n.en) : "???",x+14,y+19);
        ctx.fillStyle="rgba(255,255,255,.52)"; ctx.font="11px "+FONT_UI;
        ctx.fillText(unlocked ? T(n.descZh,n.descEn) : T("未记录。","Not recorded."),x+14,y+37);
      }
      global.drawBtn(T("返回","Back"),"",865,520,150,44,false,"#fff");
    },

    drawEndings(){
      const ctx=global.ctx, FONT_UI=global.FONT_UI;
      this.drawBasePanel(); this.drawHeader();
      ctx.fillStyle="#9b7cff"; ctx.font="bold 24px "+FONT_UI; ctx.textAlign="left";
      ctx.fillText(T("结局一览","Ending Archive"),95,215);
      const ids=Object.keys(endingDefs);
      for(let i=0;i<ids.length;i++){
        const id=ids[i], e=endingDefs[id], unlocked=!!this.state.unlockedEndings[id];
        const x=135, y=252+i*52, w=850, h=42;
        if(global.uiCard) global.uiCard(x,y,w,h,unlocked?"#9b7cff":"#666",false);
        ctx.fillStyle=unlocked?"#fff":"rgba(255,255,255,.38)"; ctx.font="bold 15px "+FONT_UI; ctx.textAlign="left";
        ctx.fillText((i+1)+"/5  "+(unlocked?T(e.nameZh,e.nameEn):"???"),x+18,y+25);
        ctx.fillStyle="rgba(255,255,255,.50)"; ctx.font="12px "+FONT_UI;
        ctx.fillText(unlocked?T(e.hintZh,e.hintEn):T("尚未解锁。","Locked."),x+260,y+25);
      }
      global.drawBtn(T("返回","Back"),"",865,520,150,44,false,"#fff");
    },

    drawResult(){
      const ctx=global.ctx, FONT_UI=global.FONT_UI;
      const r=this.result;
      this.drawBasePanel(); this.drawHeader();
      ctx.fillStyle="#ffe066"; ctx.font="bold 22px "+FONT_UI; ctx.textAlign="left";
      ctx.fillText(T("调查完成","Investigation Complete"),135,230);
      ctx.fillStyle="#fff"; ctx.font="bold 42px "+FONT_UI;
      ctx.fillText(r ? r.name : "???",135,285);
      ctx.fillStyle="rgba(255,255,255,.62)"; ctx.font="15px "+FONT_UI;
      ctx.fillText(r ? r.hint : "",138,315);
      const lines = r ? [
        T("线索：","Clue: ")+r.clue,
        T("污染：","Pollution: ")+r.pollution+"%",
        T("意志：","Will: ")+r.will,
        T("梦魇：","Nightmares: ")+r.nightmares
      ] : [];
      for(let i=0;i<lines.length;i++){
        const x=150+i*195, y=370, w=160, h=62;
        if(global.uiCard) global.uiCard(x,y,w,h,"#9b7cff",false);
        ctx.fillStyle="#fff"; ctx.font="bold 17px "+FONT_UI; ctx.fillText(lines[i],x+16,y+38);
      }
      global.drawBtn(T("再次调查","Run Again"),"",645,505,145,44,true,"#9b7cff");
      global.drawBtn(T("结局一览","Endings"),"",805,505,145,44,false,"#fff");
      global.drawBtn(T("返回首页","Home"),"",485,505,145,44,false,"#fff");
    },

    handleClick(){
      if(!this.state) this.init();
      if(this.page==="home"){
        if(this.entryPlaying){ global.clicked=false; return true; }
        if(clickRect(828,486,184,58)){ this.createRun(); global.clicked=false; return true; }
        if(clickRect(104,514,128,36)){ this.page="codex"; global.clicked=false; return true; }
        if(clickRect(246,514,128,36)){ this.page="endings"; global.clicked=false; return true; }
      }else if(this.page==="run"){
        const node=this.currentNode();
        if(node && node.type==="event" && !node.resolved){
          for(let i=0;i<node.event.choices.length;i++){
            if(clickRect(118+i*300,458,280,48)){ this.chooseEvent(i); global.clicked=false; return true; }
          }
        }
        if(clickRect(805,520,145,44)){ this.advance(); global.clicked=false; return true; }
        if(clickRect(645,520,145,44)){ this.exitRun(); global.clicked=false; return true; }
        if(clickRect(500,520,120,44)){ this.page="home"; global.clicked=false; return true; }
      }else if(this.page==="codex" || this.page==="endings"){
        if(clickRect(865,520,150,44)){ this.page="home"; global.clicked=false; return true; }
      }else if(this.page==="result"){
        if(clickRect(645,505,145,44)){ this.createRun(); global.clicked=false; return true; }
        if(clickRect(805,505,145,44)){ this.page="endings"; global.clicked=false; return true; }
        if(clickRect(485,505,145,44)){ this.exitRun(); global.clicked=false; return true; }
      }
      return false;
    }
  };

  global.PZDaydream = Daydream;
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => Daydream.init());
  else Daydream.init();
})(window);
