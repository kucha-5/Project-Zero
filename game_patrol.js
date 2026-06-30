// Project Zero V46.2 Patrol System
// Independent patrol module. Do not put patrol logic into game.js.
(function(global){
  "use strict";

  const PATROL_KEY = "project_zero_patrol_v462";
  const STAMINA_COST = 40;

  function lang(){ return global.language === "en" ? "en" : "zh"; }
  function T(zh,en){ return lang()==="en" ? en : zh; }
  function now(){ return Date.now(); }

  const Patrol = {
    state:null,
    selectedArea:0,
    selectedDuration:1,
    team:[0,1,2],

    init(){
      try{
        const raw = localStorage.getItem(PATROL_KEY);
        if(raw){
          const data = JSON.parse(raw);
          if(data && typeof data === "object"){
            this.state = data.state || null;
            this.selectedArea = Number.isFinite(data.selectedArea) ? data.selectedArea : 0;
            this.selectedDuration = Number.isFinite(data.selectedDuration) ? data.selectedDuration : 1;
            this.team = Array.isArray(data.team) ? data.team : [0,1,2];
          }
        }
      }catch(e){ console.warn("[PZPatrol] load failed", e); }
    },

    save(){
      try{
        localStorage.setItem(PATROL_KEY, JSON.stringify({
          state:this.state,
          selectedArea:this.selectedArea,
          selectedDuration:this.selectedDuration,
          team:this.team
        }));
      }catch(e){ console.warn("[PZPatrol] save failed", e); }
    },

    areas(){
      return [
        {key:"project_area", name:"Project Area", recLv:10, unlocked:!!global.projectAreaCleared, bias:"balanced", desc:T("完成 Project Area 探索后开放。","Unlocked after Project Area exploration.")},
        {key:"industrial_zone", name:"Industrial Zone", recLv:20, unlocked:true, bias:"gold", desc:T("工业区附近的稳定补给路线。","Stable supply route near the industrial district.")},
        {key:"storage", name:"Storage Warehouse", recLv:15, unlocked:true, bias:"mat", desc:T("旧仓库，可能找到材料箱。","Old warehouse with material crates.")},
        {key:"power_station", name:"Power Station", recLv:25, unlocked:true, bias:"exp", desc:T("废弃电站巡逻路线。","Abandoned power station patrol route.")}
      ];
    },

    durations(){ return [1,2,4,8]; },

    remainingMs(){
      if(!this.state || this.state.status !== "running") return 0;
      return Math.max(0, this.state.endAt - now());
    },

    timeText(ms){
      const s=Math.ceil(ms/1000);
      const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
      return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");
    },

    ownedList(){
      try{
        const order = typeof global.executorOrder === "function" ? global.executorOrder() : [0,1,2,3,4,5,6,7,8];
        return order.filter(id => global.owned && global.owned[id]);
      }catch(e){ return [0]; }
    },

    roleName(id){
      try{
        if(global.roles && global.roles[id] && typeof global.roleName === "function") return global.roleName(global.roles[id]);
      }catch(e){}
      return "Operator " + (id+1);
    },

    roleLevel(id){
      try{
        if(typeof global.roleDisplayLevel === "function") return global.roleDisplayLevel(id);
      }catch(e){}
      return global.playerLevel || 1;
    },

    teamPower(){
      let total=0, count=0;
      for(const id of this.team){
        if(id===undefined || id===null) continue;
        if(global.owned && !global.owned[id]) continue;
        total += this.roleLevel(id);
        count++;
      }
      return {total,count};
    },

    rewardPreview(area,durationHours){
      const pow=this.teamPower();
      const areaMul = area.bias==="gold" ? 1.25 : area.bias==="mat" ? 1.08 : area.bias==="exp" ? 1.08 : 1.12;
      const ratio = Math.max(.55, Math.min(1.25, pow.total / Math.max(1,area.recLv)));
      const bonus = pow.total >= area.recLv ? 1.10 : ratio;
      return {
        gold: Math.floor(650 * durationHours * areaMul * bonus),
        expReward: Math.floor(120 * durationHours * (area.bias==="exp"?1.35:1) * bonus),
        expBooks: Math.max(0, Math.floor(durationHours/2) + (area.bias==="exp"?1:0)),
        weaponOre: Math.max(0, Math.floor(durationHours/4) + (area.bias==="mat"?1:0)),
        crystal: durationHours>=8 ? 10 : 0,
        success: Math.floor(Math.max(.55, Math.min(1, ratio)) * 100)
      };
    },

    start(){
      const area=this.areas()[this.selectedArea] || this.areas()[0];
      if(!area.unlocked){
        if(typeof global.showCenter==="function") global.showCenter(T("区域未开放","Area locked"),70);
        return;
      }
      const pow=this.teamPower();
      if(pow.count<=0){
        if(typeof global.showCenter==="function") global.showCenter(T("至少选择1名执行官","Select at least 1 operator"),70);
        return;
      }
      if(typeof global.normalizeDungeonRuntime==="function") global.normalizeDungeonRuntime();
      if((global.dungeonStamina||0) < STAMINA_COST){
        if(typeof global.openStaminaRecover==="function") global.openStaminaRecover(T("体力不足，需要40体力。","Not enough stamina. Need 40."));
        else if(typeof global.showCenter==="function") global.showCenter(T("体力不足，需要40体力","Not enough stamina. Need 40."),90);
        return;
      }
      global.dungeonStamina = Math.max(0, (global.dungeonStamina||0) - STAMINA_COST);
      const hours=this.selectedDuration;
      this.state={
        status:"running",
        areaIndex:this.selectedArea,
        areaKey:area.key,
        areaName:area.name,
        durationHours:hours,
        startAt:now(),
        endAt:now()+hours*60*60*1000,
        team:this.team.slice(),
        reward:this.rewardPreview(area,hours)
      };
      this.save();
      if(typeof global.saveGame==="function") global.saveGame();
      if(global.autoCloudSaveNow) global.autoCloudSaveNow(false);
      if(typeof global.showCenter==="function") global.showCenter(T("巡逻开始","Patrol started"),70);
    },

    claim(){
      if(!this.state) return;
      if(this.remainingMs()>0){
        if(typeof global.showCenter==="function") global.showCenter(T("巡逻尚未完成","Patrol not complete"),70);
        return;
      }
      const r=this.state.reward || {};
      global.gold += r.gold||0;
      global.totalGoldEarned += r.gold||0;
      global.expBooks += r.expBooks||0;
      global.weaponOre += r.weaponOre||0;
      if(r.crystal){
        global.crystals += r.crystal;
        global.totalCrystalsEarned += r.crystal;
      }
      if(typeof global.addActionRecordTaskProgress==="function") global.addActionRecordTaskProgress("patrol",1);
      if(typeof global.addActionRecordExp==="function") global.addActionRecordExp(r.expReward||0,"patrol");
      else if(typeof global.addPlayerExp==="function") global.addPlayerExp(r.expReward||0);
      this.state=null;
      this.save();
      if(typeof global.saveGame==="function") global.saveGame();
      if(global.autoCloudSaveNow) global.autoCloudSaveNow(false);
      if(typeof global.showCenter==="function") global.showCenter(T("巡逻奖励已领取","Patrol reward claimed"),90);
    },

    cycleTeam(slot){
      const list=this.ownedList();
      if(!list.length) return;
      const cur=this.team[slot];
      let idx=list.indexOf(cur);
      idx=(idx+1)%list.length;
      this.team[slot]=list[idx];
      this.save();
    },

    drawDetail(){
      const ctx=global.ctx, W=global.W, FONT_UI=global.FONT_UI;
      const areas=this.areas();
      this.selectedArea=Math.max(0, Math.min(areas.length-1, this.selectedArea));
      const area=areas[this.selectedArea];

      ctx.fillStyle="#fff";
      ctx.font="bold 26px "+FONT_UI;
      ctx.textAlign="left";
      ctx.fillText(T("巡逻","Patrol"),95,190);
      ctx.fillStyle="rgba(255,255,255,.55)";
      ctx.font="14px "+FONT_UI;
      ctx.fillText(T("派遣执行官 / 离线资源路线","Dispatch operators / offline resource route"),97,214);
      global.drawBtn(T("返回","Back"),"",930,165,90,36,false,"#fff");

      if(global.uiPanel) global.uiPanel(95,245,390,250,"rgba(255,224,102,.55)","rgba(255,224,102,.10)");
      else{ctx.fillStyle="rgba(255,224,102,.10)";ctx.fillRect(95,245,390,250);ctx.strokeStyle="rgba(255,224,102,.55)";ctx.strokeRect(95,245,390,250);}

      global.drawBtn("<","",108,260,42,38,true,"#fff");
      global.drawBtn(">","",424,260,42,38,true,"#fff");
      ctx.textAlign="center";
      ctx.fillStyle=area.unlocked?"#ffe066":"rgba(255,255,255,.45)";
      ctx.font="bold 25px "+FONT_UI;
      ctx.fillText(area.name,287,292);
      ctx.fillStyle="rgba(255,255,255,.55)";
      ctx.font="12px "+FONT_UI;
      ctx.fillText((this.selectedArea+1)+" / "+areas.length,287,318);

      ctx.textAlign="left";
      ctx.fillStyle="rgba(255,255,255,.74)";
      ctx.font="15px "+FONT_UI;
      ctx.fillText((T("推荐等级 Lv.","Recommended Lv."))+area.recLv,120,342);
      ctx.fillText(area.desc,120,372);

      ctx.fillStyle="#ffe066";
      ctx.font="bold 15px "+FONT_UI;
      ctx.fillText(T("时间","Duration"),120,414);
      const ds=this.durations();
      for(let i=0;i<ds.length;i++){
        const x=120+i*78;
        global.drawBtn(ds[i]+"h","",x,430,62,36,this.selectedDuration===ds[i],"#ffe066");
      }

      ctx.fillStyle="rgba(255,255,255,.72)";
      ctx.font="bold 14px "+FONT_UI;
      ctx.fillText(T("当前体力：","Stamina: ")+Math.floor(global.dungeonStamina||0)+" / 240",120,486);
      ctx.fillText(T("开始消耗：40体力","Start Cost: 40 Stamina"),280,486);

      const reward=this.rewardPreview(area,this.selectedDuration);
      ctx.fillStyle="rgba(255,255,255,.05)";
      ctx.fillRect(520,245,485,250);
      ctx.strokeStyle="rgba(255,255,255,.13)";
      ctx.strokeRect(520,245,485,250);

      ctx.fillStyle="#7cffb2";
      ctx.font="bold 18px "+FONT_UI;
      ctx.fillText(T("巡逻小队","Patrol Team"),545,282);
      for(let i=0;i<3;i++){
        const x=545+i*145;
        const id=this.team[i];
        const has = id!==undefined && id!==null && (!global.owned || global.owned[id]);
        global.drawBtn(has ? this.roleName(id) : T("空位","Empty"),T("点击","Click"),x,305,132,42,has,"#7cffb2");
      }

      ctx.fillStyle="#ffe066";
      ctx.font="bold 16px "+FONT_UI;
      ctx.fillText(T("奖励预览","Reward Preview"),545,378);
      ctx.fillStyle="rgba(255,255,255,.78)";
      ctx.font="14px "+FONT_UI;
      ctx.fillText(T("成功率 ","Success ")+reward.success+"%",545,406);
      ctx.fillText(T("金币 +","Gold +")+reward.gold+"   "+T("行动记录EXP +","Action EXP +")+reward.expReward,545,430);
      ctx.fillText(T("经验书 +","EXP Books +")+reward.expBooks+"   "+T("武器矿石 +","Weapon Ore +")+reward.weaponOre,545,454);
      if(reward.crystal) ctx.fillText(T("水晶 +","Crystal +")+reward.crystal,545,478);

      if(this.state && this.state.status==="running"){
        const left=this.remainingMs();
        ctx.fillStyle=left<=0?"#7cffb2":"#ffe066";
        ctx.font="bold 18px "+FONT_UI;
        ctx.fillText(left<=0 ? T("巡逻完成","Patrol Complete") : (T("剩余 ","Remaining ")+this.timeText(left)),120,486);
        global.drawBtn(left<=0 ? T("领取","Claim") : T("巡逻中","In Progress"),"",805,445,185,48,left<=0,"#ffe066");
      }else{
        global.drawBtn(area.unlocked ? (((global.dungeonStamina||0) >= STAMINA_COST) ? T("开始巡逻","Start Patrol") : T("体力不足","No Stamina")) : T("未开放","Locked"),"",805,445,185,48,area.unlocked && ((global.dungeonStamina||0) >= STAMINA_COST),"#ffe066");
      }
    },

    handleDungeonClick(){
      if(global.inRect(930,165,90,36)){
        global.dungeonPanelMode="home";
        global.clicked=false;
        return true;
      }
      if(global.inRect(108,260,42,38)){
        this.selectedArea=(this.selectedArea+this.areas().length-1)%this.areas().length;
        global.clicked=false;
        return true;
      }
      if(global.inRect(424,260,42,38)){
        this.selectedArea=(this.selectedArea+1)%this.areas().length;
        global.clicked=false;
        return true;
      }
      const ds=this.durations();
      for(let i=0;i<ds.length;i++){
        const x=120+i*78;
        if(global.inRect(x,430,62,36)){
          this.selectedDuration=ds[i];
          this.save();
          global.clicked=false;
          return true;
        }
      }
      for(let i=0;i<3;i++){
        const x=545+i*145;
        if(global.inRect(x,305,132,42)){
          this.cycleTeam(i);
          global.clicked=false;
          return true;
        }
      }
      if(global.inRect(805,445,185,48)){
        if(this.state && this.state.status==="running") this.claim();
        else this.start();
        global.clicked=false;
        return true;
      }
      return false;
    }
  };

  Patrol.init();
  global.PZPatrol = Patrol;
})(window);
