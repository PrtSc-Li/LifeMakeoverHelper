/**
 * 记录 — 心愿单 + 攒钻 + 氪金记录 + 随记
 * 二级路由: #/notes (主) / #/notes/diamond / #/notes/spending
 */
(function () {
  'use strict';
  var WL_KEY = 'wishlist', MM_KEY = 'memos';
  var PD_KEY = 'purple_diamond_log', SP_KEY = 'spending_log';

  function getWL() { return Storage.get(WL_KEY, []); }
  function saveWL(d) { Storage.set(WL_KEY, d); }
  function getMM() { return Storage.get(MM_KEY, []); }
  function saveMM(d) { Storage.set(MM_KEY, d); }
  function getPD() { return Storage.get(PD_KEY,[]); }
  function savePD(d) { Storage.set(PD_KEY, d); }
  function getSP() { var d=Storage.get(SP_KEY,{}); if(!d.entries){d={startDate:'',entries:[]};} return d; }
  function saveSP(d) { Storage.set(SP_KEY, d); }

  function gid(p) { return (p||'n')+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,6); }
  function todayStr() { var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function esc(s) { var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
  function fmtDate(ds) { if(!ds)return''; var p=ds.split('-'); return parseInt(p[1])+'/'+parseInt(p[2]); }
  function fmtFull(ds) { if(!ds)return''; var p=ds.split('-'); return p[0]+'年'+parseInt(p[1])+'月'+parseInt(p[2])+'日'; }

  function render(params, container) {
    var sub = params.sub;
    if (sub === 'diamond') { renderDiamond(container); return; }
    if (sub === 'spending') { renderSpending(container); return; }
    renderMain(container);
  }

  // ===== 主页面 =====
  function renderMain(container) {
    var t = document.getElementById('nav-title'); if (t) t.textContent = '📝 记录';
    var wl = getWL(), mm = getMM();
    var pdLog = getPD(), spData = getSP();
    var pdCur = pdLog.length>0 ? pdLog[pdLog.length-1].amount : 0;
    var totalSpend = spData.entries.reduce(function(s,e){return s+(e.amount||0);},0);
    var monthlyAvg = 0;
    if (spData.startDate) {
      var start = new Date(spData.startDate), now = new Date();
      var months = (now.getFullYear()-start.getFullYear())*12+(now.getMonth()-start.getMonth())+1;
      if (months<1) months=1; monthlyAvg = Math.round(totalSpend/months);
    }

    container.innerHTML = '<div class="page" style="animation:none">'+
      '<div class="page-head"><h2>📝 记录</h2></div>'+
      '<div class="wl-card" id="wl-card">'+
        '<div class="wl-card-top"><div class="wl-card-title">💖 心愿单</div>'+
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>'+
        '<div class="wl-preview" id="wl-preview"></div>'+
      '</div>'+
      '<div class="dual-cards">'+
        '<div class="dc-card" id="dc-diamond"><div class="dc-icon">💎</div><div class="dc-title">攒钻</div><div class="dc-num">'+pdCur+'</div></div>'+
        '<div class="dc-card" id="dc-spend"><div class="dc-icon">💳</div><div class="dc-title">氪金记录</div><div class="dc-num">¥'+totalSpend+'</div><div class="dc-sub">月供 ¥'+monthlyAvg+'</div></div>'+
      '</div>'+
      '<div class="section-header"><h3>✏️ 随记</h3><button class="memo-add-btn" id="memo-add">+ 新建</button></div>'+
      '<div class="memo-list" id="memo-list"></div>'+
      '<div class="modal hidden" id="memo-modal"><div class="modal-mask"></div><div class="modal-sheet">'+
        '<div class="modal-head"><button class="modal-cancel" id="memo-cancel">取消</button><span class="modal-title">随记</span><button class="modal-save" id="memo-save">保存</button></div>'+
        '<div class="form-pad"><textarea id="memo-text" rows="6" placeholder="记下你的想法..."></textarea></div>'+
      '</div></div>'+
      '<div class="modal hidden" id="wl-modal"><div class="modal-mask"></div><div class="modal-sheet">'+
        '<div class="modal-head"><button class="modal-cancel" id="wl-back">← 返回</button><span class="modal-title">💖 心愿单</span><button class="modal-save" id="wl-add-btn">+ 添加</button></div>'+
        '<div class="wl-list" id="wl-list"></div>'+
        '<div class="modal hidden" id="wl-add-modal"><div class="modal-mask"></div><div class="modal-sheet">'+
          '<div class="modal-head"><button class="modal-cancel" id="wl-add-cancel">取消</button><span class="modal-title">添加心愿</span><button class="modal-save" id="wl-add-save">添加</button></div>'+
          '<div class="form-pad"><input type="text" id="wl-add-name" placeholder="套装名称"></div>'+
        '</div></div>'+
      '</div></div>'+
    '</div>';

    updatePreview(container, wl);
    updateMemoList(container, mm);
    bindMain(container, wl, mm);
  }

  // ===== 攒钻二级页 =====
  function renderDiamond(container) {
    var t = document.getElementById('nav-title'); if (t) t.textContent = '💎 攒钻';
    var pdLog = getPD(); pdLog.sort(function(a,b){return a.date.localeCompare(b.date);});
    var cur = pdLog.length>0 ? pdLog[pdLog.length-1].amount : 0;

    var chartHtml = '<div id="diamond-chart"></div>';

    var listHtml = pdLog.length === 0 ? '<div class="empty-cute">还没有记录</div>'
      : pdLog.slice().reverse().map(function(e,i){
          var prev = i < pdLog.length-1 ? pdLog.slice().reverse()[i+1] : null;
          var diff = prev ? e.amount - prev.amount : 0;
          var diffStr = diff > 0 ? '<span class="dlog-diff up">+'+diff+'</span>' : (diff < 0 ? '<span class="dlog-diff down">'+diff+'</span>' : '');
          return '<div class="dlog-card">'+
            '<div class="dlog-left"><div class="dlog-date">'+fmtFull(e.date)+'</div>'+(e.note?'<div class="dlog-note">'+esc(e.note)+'</div>':'')+'<button class="dlog-edit" data-date="'+e.date+'">编辑 / 备注</button></div>'+
            '<div class="dlog-right"><div class="dlog-amt">'+e.amount+'</div>'+diffStr+'</div>'+
            '<button class="dlog-del" aria-label="删除 '+e.date+' 的攒钻记录" data-date="'+e.date+'">×</button>'+
          '</div>';
        }).join('');

    container.innerHTML = '<div class="page" style="animation:none">'+
      '<button class="back-btn" id="pd-back">← 返回记录</button>'+
      '<div class="dlog-hero"><div class="dlog-emoji">💎</div><div class="dlog-cur">'+cur+'</div><div class="dlog-cur-label">当前紫钻</div></div>'+
      '<div class="pd-chart-wrap">'+chartHtml+'</div>'+
      '<button class="dlog-add-btn" id="pd-add-btn">+ 记录今日数量</button>'+
      '<div class="dlog-section-title">记录历史</div>'+
      '<div class="dlog-list">'+listHtml+'</div>'+
      '<div class="modal hidden" id="pd-add-modal"><div class="modal-mask"></div><div class="modal-sheet">'+
        '<div class="modal-head"><button class="modal-cancel" id="pd-add-cancel">取消</button><span class="modal-title">添加记录</span><button class="modal-save" id="pd-add-save">保存</button></div>'+
        '<div class="form-pad"><label for="pd-add-date">日期</label><input type="date" id="pd-add-date" value="'+todayStr()+'"><label for="pd-add-amount">钻石数量</label><input type="number" id="pd-add-amount" placeholder="钻石数量" min="0" step="1" inputmode="numeric"><label for="pd-add-note">备注（选填）</label><textarea id="pd-add-note" rows="3" maxlength="200" placeholder="例如：抽海谕遥音池子，花了 12000 钻"></textarea><p class="pd-form-hint" id="pd-form-hint">同一天保存会更新该日记录</p></div>'+
      '</div></div>'+
    '</div>';

    container.querySelector('#pd-back').addEventListener('click',function(){ window.history.back(); });
    DiamondChart.mount(container.querySelector('#diamond-chart'), pdLog);
    function openRecord(date) {
      var entry = pdLog.find(function(x){return x.date===date;});
      container.querySelector('#pd-add-date').value=date;
      container.querySelector('#pd-add-amount').value=entry?entry.amount:'';
      container.querySelector('#pd-add-note').value=entry?(entry.note||''):'';
      container.querySelector('#pd-add-modal .modal-title').textContent=entry?'编辑记录':'添加记录';
      container.querySelector('#pd-add-modal').classList.remove('hidden');
    }
    container.querySelector('#pd-add-btn').addEventListener('click',function(){openRecord(todayStr());});
    container.querySelector('#pd-add-date').addEventListener('change',function(){
      var entry=pdLog.find(function(x){return x.date===container.querySelector('#pd-add-date').value;});
      container.querySelector('#pd-add-amount').value=entry?entry.amount:'';
      container.querySelector('#pd-add-note').value=entry?(entry.note||''):'';
    });
    container.querySelectorAll('.dlog-edit').forEach(function(btn){btn.addEventListener('click',function(){openRecord(btn.getAttribute('data-date'));});});
    container.querySelector('#pd-add-cancel').addEventListener('click',function(){ container.querySelector('#pd-add-modal').classList.add('hidden'); });
    container.querySelector('#pd-add-modal .modal-mask').addEventListener('click',function(){ container.querySelector('#pd-add-modal').classList.add('hidden'); });
    container.querySelector('#pd-add-save').addEventListener('click',function(){ var date=container.querySelector('#pd-add-date').value, raw=container.querySelector('#pd-add-amount').value, amt=Number(raw), note=container.querySelector('#pd-add-note').value.trim(); if(!date||raw===''||!Number.isSafeInteger(amt)||amt<0){container.querySelector('#pd-form-hint').textContent='请选择日期，并填写非负整数钻石数量';container.querySelector('#pd-add-amount').focus();return;} var ex=pdLog.find(function(x){return x.date===date;}); if(ex){ex.amount=amt;ex.note=note;} else pdLog.push({date:date,amount:amt,note:note}); pdLog.sort(function(a,b){return a.date.localeCompare(b.date);}); savePD(pdLog); container.querySelector('#pd-add-modal').classList.add('hidden'); renderDiamond(container); });
    container.querySelectorAll('.dlog-del').forEach(function(btn){ btn.addEventListener('click',function(){ var d=btn.getAttribute('data-date'); var f=pdLog.filter(function(x){return x.date!==d;}); savePD(f); renderDiamond(container); }); });
  }

  // ===== 氪金二级页 =====
  function renderSpending(container) {
    var t = document.getElementById('nav-title'); if (t) t.textContent = '💳 氪金记录';
    var spData = getSP();
    var total = spData.entries.reduce(function(s,e){return s+(e.amount||0);},0);
    var monthly = 0;
    if (spData.startDate) {
      var start = new Date(spData.startDate), now = new Date();
      var months = (now.getFullYear()-start.getFullYear())*12+(now.getMonth()-start.getMonth())+1;
      if (months<1) months=1; monthly = Math.round(total/months);
    }

    var listHtml = spData.entries.length === 0
      ? '<div class="empty-cute">还没有记录<br><span>点击下方按钮添加</span></div>'
      : spData.entries.slice().reverse().map(function(e){
          return '<div class="spend-card">'+
            '<div class="spend-top"><span class="spend-date">'+fmtFull(e.date)+'</span><span class="spend-amount">¥'+(e.amount||0)+'</span></div>'+
            (e.note ? '<div class="spend-note">'+esc(e.note)+'</div>' : '')+
            '<button class="spend-del" data-sid="'+e.id+'">×</button>'+
          '</div>';
        }).join('');

    container.innerHTML = '<div class="page" style="animation:none">'+
      '<button class="back-btn" id="sp-back">← 返回记录</button>'+
      '<div class="spend-hero">'+
        '<div class="spend-stat"><span class="spend-stat-val">¥'+total+'</span><span class="spend-stat-label">累氪</span></div>'+
        '<div class="spend-divider"></div>'+
        '<div class="spend-stat"><span class="spend-stat-val">¥'+monthly+'</span><span class="spend-stat-label">月供</span></div>'+
      '</div>'+
      '<div class="spend-date-row" id="sp-start-row">'+
        (spData.startDate
          ? '<span>📅 入坑：'+spData.startDate+'</span><button class="spend-date-edit" id="sp-start-edit">修改</button>'
          : '<button class="spend-date-set" id="sp-start-set">📅 设置入坑日期以计算月供</button>')+
      '</div>'+
      '<div class="dlog-section-title">充值记录</div>'+
      '<div class="spend-list">'+listHtml+'</div>'+
      '<button class="dlog-add-btn" id="sp-add-btn">+ 添加充值记录</button>'+
      '<div class="modal hidden" id="sp-add-modal"><div class="modal-mask"></div><div class="modal-sheet">'+
        '<div class="modal-head"><button class="modal-cancel" id="sp-add-cancel">取消</button><span class="modal-title">添加氪金</span><button class="modal-save" id="sp-add-save">保存</button></div>'+
        '<div class="form-pad"><input type="date" id="sp-add-date" value="'+todayStr()+'"><input type="number" id="sp-add-amount" placeholder="充值金额" min="0" inputmode="numeric" style="margin-top:12px"><input type="text" id="sp-add-note" placeholder="备注（选填）" style="margin-top:12px"></div>'+
      '</div></div>'+
    '</div>';

    container.querySelector('#sp-back').addEventListener('click',function(){ window.history.back(); });
    container.querySelector('#sp-add-btn').addEventListener('click',function(){ container.querySelector('#sp-add-modal').classList.remove('hidden'); container.querySelector('#sp-add-date').value=todayStr(); container.querySelector('#sp-add-amount').value=''; container.querySelector('#sp-add-note').value=''; container.querySelector('#sp-add-amount').focus(); });
    container.querySelector('#sp-add-cancel').addEventListener('click',function(){ container.querySelector('#sp-add-modal').classList.add('hidden'); });
    container.querySelector('#sp-add-modal .modal-mask').addEventListener('click',function(){ container.querySelector('#sp-add-modal').classList.add('hidden'); });
    container.querySelector('#sp-add-save').addEventListener('click',function(){ var date=container.querySelector('#sp-add-date').value, amt=parseInt(container.querySelector('#sp-add-amount').value), note=container.querySelector('#sp-add-note').value.trim(); if(!date||isNaN(amt)||amt<0){container.querySelector('#sp-add-amount').focus();return;} spData.entries.push({id:gid('s'),date:date,amount:amt,note:note}); saveSP(spData); container.querySelector('#sp-add-modal').classList.add('hidden'); renderSpending(container); });
    container.querySelectorAll('.spend-del').forEach(function(btn){ btn.addEventListener('click',function(){ spData.entries=spData.entries.filter(function(x){return x.id!==btn.getAttribute('data-sid');}); saveSP(spData); renderSpending(container); }); });

    function refreshStart() {
      var row=container.querySelector('#sp-start-row');
      row.innerHTML = spData.startDate ? '<span>入坑日期：'+spData.startDate+'</span><button class="sp-start-edit" id="sp-start-edit">修改</button>' : '<button class="sp-start-set" id="sp-start-set">设置入坑日期（计算月供）</button>';
      var sb=row.querySelector('#sp-start-set'), eb=row.querySelector('#sp-start-edit');
      if(sb)sb.addEventListener('click',function(){var d=prompt('输入入坑日期 (YYYY-MM-DD)：',todayStr());if(d){spData.startDate=d;saveSP(spData);refreshStart();renderSpending(container);}});
      if(eb)eb.addEventListener('click',function(){var d=prompt('修改入坑日期 (YYYY-MM-DD)：',spData.startDate);if(d){spData.startDate=d;saveSP(spData);refreshStart();renderSpending(container);}});
    }
    refreshStart();
  }

  // ===== 主页面局部更新 =====
  function updatePreview(c, wl) {
    var el = c.querySelector('#wl-preview'); if (!el) return;
    el.innerHTML = wl.length===0 ? '<div class="wl-preview-empty">点击添加想要的套装</div>'
      : wl.slice(0,4).map(function(x){return '<span class="wl-preview-tag'+(x.done?' done':'')+'">'+esc(x.name)+(x.done?' ✓':'')+'</span>';}).join('')+(wl.length>4?'<span class="wl-preview-more">+'+(wl.length-4)+'</span>':'');
  }
  function updateMemoList(c) {
    var mm = c._mm; if (!mm) return;
    var el = c.querySelector('#memo-list'); if (!el) return;
    el.innerHTML = mm.length===0 ? '<div class="empty-cute">还没有记录<br><span>记下你此刻的想法吧</span></div>'
      : mm.slice().reverse().map(function(m){return '<div class="memo-card" data-mid="'+m.id+'"><div class="memo-text">'+esc(m.text).replace(/\n/g,'<br>')+'</div><button class="memo-del" data-mid="'+m.id+'">×</button></div>';}).join('');
    bindMemoCards(c);
  }
  function updateWLList(c) {
    var wl = c._wl; if (!wl) return;
    var list = c.querySelector('#wl-list'); if (!list) return;
    list.innerHTML = wl.length===0 ? '<div class="empty-cute">还没有心愿<br><span>点击右上角 + 添加</span></div>'
      : wl.map(function(x){return '<div class="wl-row"><button class="wl-check'+(x.done?' done':'')+'" data-wid="'+x.id+'">'+(x.done?'💖':'🤍')+'</button><span class="wl-name'+(x.done?' done':'')+'">'+esc(x.name)+'</span><button class="wl-del" data-wid="'+x.id+'">×</button></div>';}).join('');
    list.querySelectorAll('.wl-check').forEach(function(btn){btn.addEventListener('click',function(){var w=wl.find(function(x){return x.id===btn.getAttribute('data-wid');});if(w){w.done=!w.done;saveWL(wl);updateWLList(c);updatePreview(c,wl);}});});
    list.querySelectorAll('.wl-del').forEach(function(btn){btn.addEventListener('click',function(){c._wl=wl.filter(function(x){return x.id!==btn.getAttribute('data-wid');});saveWL(c._wl);updateWLList(c);updatePreview(c,c._wl);});});
  }
  function bindMemoCards(c) {
    c.querySelectorAll('.memo-card').forEach(function(card){card.addEventListener('click',function(e){if(e.target.closest('.memo-del'))return;var m=c._mm.find(function(x){return x.id===card.getAttribute('data-mid');});if(!m)return;c._editingId=m.id;c.querySelector('#memo-text').value=m.text;c.querySelector('#memo-modal').classList.remove('hidden');c.querySelector('#memo-text').focus();});});
    c.querySelectorAll('.memo-del').forEach(function(btn){btn.addEventListener('click',function(e){e.stopPropagation();if(confirm('删除这条随记？')){c._mm=c._mm.filter(function(x){return x.id!==btn.getAttribute('data-mid');});saveMM(c._mm);updateMemoList(c);}});});
  }

  // ===== 事件 =====
  function bindMain(c, wl, mm) {
    c._wl = wl; c._mm = mm; c._editingId = null;
    // 心愿单
    c.querySelector('#wl-card').addEventListener('click',function(e){if(e.target.closest('.wl-preview-tag'))return;updateWLList(c);c.querySelector('#wl-modal').classList.remove('hidden');});
    c.querySelector('#wl-back').addEventListener('click',function(){c.querySelector('#wl-modal').classList.add('hidden');updatePreview(c,c._wl);});
    c.querySelector('#wl-modal .modal-mask').addEventListener('click',function(){c.querySelector('#wl-modal').classList.add('hidden');updatePreview(c,c._wl);});
    c.querySelector('#wl-add-btn').addEventListener('click',function(){c.querySelector('#wl-add-modal').classList.remove('hidden');c.querySelector('#wl-add-name').value='';c.querySelector('#wl-add-name').focus();});
    c.querySelector('#wl-add-cancel').addEventListener('click',function(){c.querySelector('#wl-add-modal').classList.add('hidden');});
    c.querySelector('#wl-add-modal .modal-mask').addEventListener('click',function(){c.querySelector('#wl-add-modal').classList.add('hidden');});
    c.querySelector('#wl-add-save').addEventListener('click',function(){var nm=c.querySelector('#wl-add-name').value.trim();if(!nm){c.querySelector('#wl-add-name').focus();return;}c._wl.push({id:gid('w'),name:nm,done:false});saveWL(c._wl);c.querySelector('#wl-add-modal').classList.add('hidden');updateWLList(c);updatePreview(c,c._wl);});
    // 攒钻 → 二级页
    c.querySelector('#dc-diamond').addEventListener('click',function(){Router.go('notes',{sub:'diamond'});});
    // 氪金 → 二级页
    c.querySelector('#dc-spend').addEventListener('click',function(){Router.go('notes',{sub:'spending'});});
    // 随记
    c.querySelector('#memo-add').addEventListener('click',function(){c._editingId=null;c.querySelector('#memo-text').value='';c.querySelector('#memo-modal').classList.remove('hidden');c.querySelector('#memo-text').focus();});
    c.querySelector('#memo-cancel').addEventListener('click',function(){c.querySelector('#memo-modal').classList.add('hidden');});
    c.querySelector('#memo-modal .modal-mask').addEventListener('click',function(){c.querySelector('#memo-modal').classList.add('hidden');});
    c.querySelector('#memo-save').addEventListener('click',function(){var text=c.querySelector('#memo-text').value.trim();if(!text)return;if(c._editingId){var m=c._mm.find(function(x){return x.id===c._editingId;});if(m)m.text=text;}else{c._mm.push({id:gid('m'),text:text,date:todayStr()});}saveMM(c._mm);c.querySelector('#memo-modal').classList.add('hidden');updateMemoList(c);});
    bindMemoCards(c);
    updatePreview(c, wl);
    updateMemoList(c);
  }

  ToolRegistry.register({
    id: 'notes', title: '记录', icon: '📝', tab: true,
    tabIcon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    paramNames: ['sub'],
    render: render
  });
})();
