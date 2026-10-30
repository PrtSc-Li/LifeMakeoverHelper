/* Calendar-based diamond history. Drag to pan; pinch horizontally to zoom. */
var DiamondChart = (function () {
  'use strict';
  var DAY = 86400000;
  function day(date) { return Date.parse(date + 'T00:00:00Z') / DAY; }
  function label(value) { return new Date(Math.round(value) * DAY).toISOString().slice(0, 10); }
  function escapeText(s) { return String(s).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function mount(host, log) {
    var points = log.filter(function(p){return Number.isFinite(day(p.date)) && Number.isFinite(p.amount);})
      .map(function(p){return {time:day(p.date),amount:p.amount,note:p.note||''};})
      .sort(function(a,b){return a.time-b.time;});
    if (!points.length) { host.innerHTML='<div class="chart-empty">添加记录后显示钻量趋势</div>'; return; }
    var low=points[0].time-0.5, high=points[points.length-1].time+0.5;
    var total=Math.max(1,high-low), minSpan=Math.min(2,total), span=Math.min(30,total), start=high-span;
    var W=Math.max(320,host.clientWidth||640),H=330,L=68,R=22,T=28,B=210,PW=W-L-R;
    host.innerHTML='<div class="pd-chart-head"><strong>钻量趋势</strong><span class="pd-chart-range"></span></div>'+
      '<svg class="pd-history-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="钻石数量随日期变化的折线图"></svg>'+
      '<div class="pd-chart-controls"><button type="button" data-zoom="out" aria-label="缩小时间轴">−</button><button type="button" data-zoom="in" aria-label="放大时间轴">＋</button><button type="button" data-zoom="all">全部</button><button type="button" data-zoom="latest">最近</button></div>'+
      '<label class="pd-time-label">拖动查看日期<input class="pd-time-range" type="range" min="0" max="1000" step="1" aria-label="移动时间轴"></label>'+
      '<div class="pd-point-detail" aria-live="polite">选择数据点可查看日期、钻量与备注</div>';
    var svg=host.querySelector('svg'), slider=host.querySelector('input'), detail=host.querySelector('.pd-point-detail');
    var selected=null;
    function x(t) { return L+(t-start)/span*PW; }
    function setView(nextStart,nextSpan) {
      span=clamp(nextSpan,minSpan,total); start=clamp(nextStart,low,high-span); draw();
    }
    function zoom(factor, fraction) {
      var anchor=start+fraction*span, next=clamp(span*factor,minSpan,total);
      setView(anchor-fraction*next,next);
    }
    function draw() {
      if (!host.isConnected) return;
      // Include adjacent points so a line crossing the viewport remains visible.
      var visible=points.filter(function(p,i){return p.time>=start&&p.time<=start+span || (p.time<start&&points[i+1]&&points[i+1].time>=start) || (p.time>start+span&&points[i-1]&&points[i-1].time<=start+span);});
      var max=visible.reduce(function(m,p){return Math.max(m,p.amount);},0);
      var rough=Math.max(1,max*1.15/4), power=Math.pow(10,Math.floor(Math.log10(rough)));
      var step=Math.ceil(rough/power)*power, ceiling=step*4;
      function y(v){return B-v/ceiling*(B-T);}
      var html='<defs><clipPath id="pd-plot-clip"><rect x="'+L+'" y="'+T+'" width="'+PW+'" height="'+(B-T)+'"/></clipPath></defs>';
      for(var i=0;i<=4;i++){
        var yy=y(i*step);
        html+='<line class="pd-grid-line" x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'"/><text class="pd-axis-text" text-anchor="end" x="'+(L-8)+'" y="'+(yy+4)+'">'+(i*step).toLocaleString()+'</text>';
      }
      html+='<path class="pd-axis-line" d="M '+L+' '+T+' V '+B+' H '+(W-R)+'"/><text class="pd-axis-text" x="'+L+'" y="16">钻量</text><text class="pd-axis-text" text-anchor="end" x="'+(W-R)+'" y="'+(B+43)+'">日期</text>';
      var tick=Math.max(1,Math.ceil(span/Math.max(2,Math.floor(PW/85))));
      for(var t=Math.ceil(start/tick)*tick;t<=start+span;t+=tick){
        html+='<line class="pd-axis-line" x1="'+x(t)+'" x2="'+x(t)+'" y1="'+B+'" y2="'+(B+5)+'"/><text class="pd-axis-text" text-anchor="middle" x="'+x(t)+'" y="'+(B+20)+'">'+label(t).slice(5).replace('-','/')+'</text>';
      }
      var path=visible.map(function(p,i){return (i?'L':'M')+x(p.time)+' '+y(p.amount);}).join(' ');
      html+='<g clip-path="url(#pd-plot-clip)"><path d="'+path+'" fill="none" stroke="var(--pink)" stroke-width="2.5"/>';
      visible.forEach(function(p){html+='<circle data-point="'+p.time+'" cx="'+x(p.time)+'" cy="'+y(p.amount)+'" r="'+(selected===p.time?6:4)+'" fill="var(--pink)" stroke="var(--bg2)" stroke-width="2"><title>'+escapeText(label(p.time)+' · '+p.amount+' 钻 '+p.note)+'</title></circle><circle class="pd-hit-point" data-point="'+p.time+'" cx="'+x(p.time)+'" cy="'+y(p.amount)+'" r="12" fill="transparent"/>';});
      html+='</g>';
      // Separate note lanes from the line and axes; adjacent labels use alternating rows.
      var laneEnds=[-Infinity,-Infinity,-Infinity];
      visible.filter(function(p){return p.note&&p.time>=start&&p.time<=start+span;}).forEach(function(p){
        var px=x(p.time), left=clamp(px-52,L,W-R-110), lane=laneEnds.findIndex(function(end){return end+8<left;});
        if(lane<0)lane=laneEnds.indexOf(Math.min.apply(null,laneEnds));
        left=Math.max(left,laneEnds[lane]+8);
        if(left+110>W-R)return;
        laneEnds[lane]=left+110;
        var text=Array.from(p.note.replace(/\s+/g,' ')), short=text.slice(0,9).join('')+(text.length>9?'…':'');
        html+='<path class="pd-note-guide" d="M '+px+' '+(B+46)+' V '+(B+52+lane*21)+' H '+(left+4)+'"/><text class="pd-note-text" data-point="'+p.time+'" x="'+left+'" y="'+(B+65+lane*21)+'"><title>'+escapeText(p.note)+'</title>'+escapeText(label(p.time).slice(5).replace('-','/')+' '+short)+'</text>';
      });
      svg.innerHTML=html;
      host.querySelector('.pd-chart-range').textContent=label(Math.ceil(start))+' — '+label(Math.floor(start+span));
      slider.disabled=span>=total; slider.value=total===span?0:Math.round((start-low)/(total-span)*1000);
      host.querySelector('[data-zoom="in"]').disabled=span<=minSpan;
      host.querySelector('[data-zoom="out"]').disabled=span>=total;
    }
    host.querySelectorAll('[data-zoom]').forEach(function(btn){btn.addEventListener('click',function(){
      var mode=btn.getAttribute('data-zoom');
      if(mode==='all')setView(low,total); else if(mode==='latest')setView(high-Math.min(30,total),Math.min(30,total)); else zoom(mode==='in'?0.6:1.6,0.5);
    });});
    slider.addEventListener('input',function(){setView(low+Number(slider.value)/1000*(total-span),span);});
    function fraction(clientX){var r=svg.getBoundingClientRect();return clamp(((clientX-r.left)/r.width*W-L)/PW,0,1);}
    var pointers=new Map(), gesture=null, moved=false;
    function rebase(){
      var p=Array.from(pointers.values());
      gesture=p.length?{start:start,span:span,mid:p.length>1?(p[0]+p[1])/2:p[0],distance:p.length>1?Math.abs(p[0]-p[1]):0}:null;
    }
    svg.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse'&&e.button!==0)return;pointers.set(e.pointerId,e.clientX);svg.setPointerCapture(e.pointerId);moved=false;rebase();});
    svg.addEventListener('pointermove',function(e){
      if(!pointers.has(e.pointerId)||!gesture)return;
      pointers.set(e.pointerId,e.clientX);var p=Array.from(pointers.values()),mid=p.length>1?(p[0]+p[1])/2:p[0];
      if(Math.abs(mid-gesture.mid)>3)moved=true;
      if(p.length>1&&gesture.distance>4){moved=true;var next=clamp(gesture.span*gesture.distance/Math.max(4,Math.abs(p[0]-p[1])),minSpan,total);setView(gesture.start+fraction(gesture.mid)*gesture.span-fraction(mid)*next,next);}
      else setView(gesture.start-(mid-gesture.mid)/svg.getBoundingClientRect().width*W/PW*gesture.span,gesture.span);
    });
    function release(e){pointers.delete(e.pointerId);rebase();}
    svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',release);svg.addEventListener('lostpointercapture',release);
    svg.addEventListener('wheel',function(e){e.preventDefault();if(Math.abs(e.deltaX)>Math.abs(e.deltaY))setView(start+e.deltaX/500*span,span);else zoom(Math.exp(clamp(e.deltaY,-100,100)*0.005),fraction(e.clientX));},{passive:false});
    svg.addEventListener('click',function(e){
      if(moved)return;
      var time=e.target.getAttribute('data-point');
      if(time===null){
        var targetTime=start+fraction(e.clientX)*span;
        var candidates=points.filter(function(p){return p.time>=start&&p.time<=start+span;});
        if(!candidates.length)return;
        time=candidates.reduce(function(a,b){return Math.abs(a.time-targetTime)<Math.abs(b.time-targetTime)?a:b;}).time;
      }
      var p=points.find(function(p){return p.time===Number(time);});if(!p)return;
      selected=p.time;detail.textContent=label(p.time)+' · '+p.amount.toLocaleString()+' 钻'+(p.note?' · '+p.note:' · 暂无备注');draw();
    });
    draw();
  }
  return {mount:mount};
})();
