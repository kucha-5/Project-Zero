// Project Zero V41 Story Engine
// Independent visual-novel style story layer.
(function(global){
  "use strict";

  function pick(value, lang){
    if(value == null) return "";
    if(typeof value === "string") return value;
    return value[lang] || value.zh || value.en || "";
  }

  const Story = {
    active:false,
    id:null,
    index:0,
    choiceIndex:0,
    lang:"zh",
    lastBg:"black",

    start(id){
      const scripts = global.PZ_STORY_SCRIPTS || {};
      if(!scripts[id]){
        console.warn("[PZStory] missing script:", id);
        return false;
      }
      this.active = true;
      this.id = id;
      this.index = 0;
      this.choiceIndex = 0;
      this.lastBg = "black";
      return true;
    },

    stop(){
      this.active = false;
      this.id = null;
      this.index = 0;
      this.choiceIndex = 0;
    },

    current(){
      const scripts = global.PZ_STORY_SCRIPTS || {};
      const arr = scripts[this.id] || [];
      return arr[this.index] || null;
    },

    stepForward(){
      const scripts = global.PZ_STORY_SCRIPTS || {};
      const arr = scripts[this.id] || [];
      this.index++;
      if(this.index >= arr.length){
        this.stop();
      }
    },

    runEvents(){
      let guard = 0;
      while(this.active && guard++ < 20){
        const step = this.current();
        if(!step || !step.event) break;
        const fn = global.PZ_STORY_EVENTS && global.PZ_STORY_EVENTS[step.event];
        this.stepForward();
        if(typeof fn === "function") fn();
        else console.warn("[PZStory] missing event:", step.event);
      }
    },

    update(input){
      if(!this.active) return;
      this.lang = global.language === "en" ? "en" : "zh";
      this.runEvents();
      if(!this.active) return;

      const step = this.current();
      if(!step) { this.stop(); return; }
      if(step.bg) this.lastBg = step.bg;

      if(step.choice){
        if(input.up) this.choiceIndex = Math.max(0, this.choiceIndex - 1);
        if(input.down) this.choiceIndex = Math.min((step.choices || []).length - 1, this.choiceIndex + 1);

        if(input.clicked){
          const mx = input.mouseX, my = input.mouseY;
          const x = 760, y0 = 470, w = 285, h = 48, gap = 60;
          for(let i=0;i<(step.choices||[]).length;i++){
            const y = y0 + i * gap;
            if(mx >= x && mx <= x+w && my >= y && my <= y+h){
              this.choiceIndex = i;
              break;
            }
          }
        }

        if(input.clicked || input.enter || input.space){
          const choice = (step.choices || [])[this.choiceIndex];
          if(choice && choice.next){
            this.start(choice.next);
          }
        }
        return;
      }

      if(input.clicked || input.enter || input.space){
        this.stepForward();
      }
    },

    drawBg(ctx,W,H,bg){
      if(bg === "black"){
        ctx.fillStyle = "#000";
        ctx.fillRect(0,0,W,H);
        return;
      }

      const grd = ctx.createLinearGradient(0,0,0,H);
      grd.addColorStop(0,"#10172a");
      grd.addColorStop(.55,"#171a24");
      grd.addColorStop(1,"#08090f");
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,W,H);

      ctx.fillStyle="#2b2e38"; ctx.fillRect(0,385,W,275);
      ctx.fillStyle="#3a3a42"; ctx.fillRect(70,220,170,170);
      ctx.fillStyle="#464650"; ctx.fillRect(260,185,150,205);
      ctx.fillStyle="#363842"; ctx.fillRect(445,245,190,145);
      ctx.fillStyle="#40424d"; ctx.fillRect(670,205,160,185);
      ctx.fillStyle="#343640"; ctx.fillRect(860,235,190,155);

      ctx.fillStyle="#22242b";
      for(const b of [[60,195,190,35],[250,160,170,35],[660,180,185,34],[850,210,210,35]]){
        const [x,y,w,h]=b;
        ctx.beginPath(); ctx.moveTo(x,y+h); ctx.lineTo(x+w/2,y); ctx.lineTo(x+w,y+h); ctx.closePath(); ctx.fill();
      }

      ctx.fillStyle="#565761"; ctx.fillRect(505,90,100,300);
      ctx.fillStyle="#2c2e36"; ctx.beginPath(); ctx.moveTo(490,90); ctx.lineTo(555,35); ctx.lineTo(620,90); ctx.closePath(); ctx.fill();

      // protagonist placeholder
      ctx.save();
      ctx.translate(210,455);
      ctx.fillStyle="#eeeeee"; ctx.fillRect(-12,-72,24,45);
      ctx.fillStyle="#222"; ctx.fillRect(-9,-55,18,28);
      ctx.fillStyle="#d7d7d7"; ctx.beginPath(); ctx.arc(0,-86,15,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#dedede"; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(0,-26); ctx.lineTo(-18,22); ctx.moveTo(0,-26); ctx.lineTo(18,22); ctx.stroke();
      ctx.strokeStyle="#c0c0c0"; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(18,-50); ctx.lineTo(52,-86); ctx.stroke();
      ctx.restore();

      if(bg === "after"){
        ctx.save(); ctx.translate(760,455);
        ctx.fillStyle="#111"; ctx.fillRect(-16,-78,32,55);
        ctx.fillStyle="#ff5757"; ctx.fillRect(10,-68,8,22);
        ctx.fillStyle="#d8d8d8"; ctx.beginPath(); ctx.arc(0,-92,15,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="#888"; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(0,-24); ctx.lineTo(-22,23); ctx.moveTo(0,-24); ctx.lineTo(22,23); ctx.stroke();
        ctx.strokeStyle="#ffe066"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-2,-56); ctx.lineTo(42,-108); ctx.stroke();
        ctx.restore();
      }else{
        ctx.save(); ctx.translate(790,465);
        ctx.fillStyle="#36506f"; ctx.fillRect(-18,-64,36,45);
        ctx.fillStyle="#f0d0aa"; ctx.beginPath(); ctx.arc(0,-78,14,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#263041"; ctx.fillRect(-54,-26,110,46);
        ctx.restore();
      }
    },

    wrap(ctx,text,x,y,maxWidth,lineHeight){
      const words = String(text).split("");
      let line = "";
      for(const ch of words){
        const test = line + ch;
        if(ctx.measureText(test).width > maxWidth && line){
          ctx.fillText(line,x,y);
          line = ch;
          y += lineHeight;
        }else{
          line = test;
        }
      }
      if(line) ctx.fillText(line,x,y);
    },

    drawButton(ctx,text,x,y,w,h,selected,color){
      ctx.fillStyle = selected ? "rgba(124,199,255,.22)" : "rgba(255,255,255,.07)";
      ctx.fillRect(x,y,w,h);
      ctx.strokeStyle = selected ? color : "rgba(255,255,255,.18)";
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(x,y,w,h);
      ctx.fillStyle = "#fff";
      ctx.font = "18px Arial, Microsoft YaHei, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text,x+w/2,y+31);
    },

    draw(ctx,W,H){
      if(!this.active) return;
      this.lang = global.language === "en" ? "en" : "zh";
      this.runEvents();
      if(!this.active) return;

      const step = this.current();
      if(!step) return;

      const bg = step.bg || this.lastBg || "black";
      this.lastBg = bg;
      this.drawBg(ctx,W,H,bg);

      ctx.fillStyle="rgba(0,0,0,.74)";
      ctx.fillRect(65,H-190,W-130,150);
      ctx.strokeStyle="rgba(255,255,255,.16)";
      ctx.strokeRect(65,H-190,W-130,150);

      ctx.textAlign="left";
      ctx.fillStyle="#ffe066";
      ctx.font="bold 24px Arial, Microsoft YaHei, sans-serif";
      ctx.fillText(pick(step.speaker,this.lang),95,H-146);

      ctx.fillStyle = step.keyword ? "#7cc7ff" : "#fff";
      ctx.font = (step.keyword ? "bold 32px " : "22px ") + "Arial, Microsoft YaHei, sans-serif";
      this.wrap(ctx,pick(step.text,this.lang),95,H-102,W-230,32);

      if(step.choice){
        const choices = step.choices || [];
        for(let i=0;i<choices.length;i++){
          this.drawButton(ctx,pick(choices[i].text,this.lang),760,470+i*60,285,48,this.choiceIndex===i,i===0?"#7cc7ff":"#ffe066");
        }
      }else{
        this.drawButton(ctx,this.lang==="en"?"NEXT":"继续",880,H-82,165,48,true,"#ffe066");
      }

      ctx.fillStyle="rgba(124,199,255,.85)";
      ctx.font="12px Arial, Microsoft YaHei, sans-serif";
      ctx.textAlign="left";
      ctx.fillText("V41 STORY MODULE",10,18);
    }
  };

  global.PZStory = Story;
})(window);
