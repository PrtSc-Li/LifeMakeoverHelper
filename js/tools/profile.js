/**
 * 我的 — 衣橱统计 + 设置
 */
(function () {
  'use strict';

  var DARK_KEY = 'dark_mode';

  function isDark() { var s=Storage.get(DARK_KEY,null); return s!==null?s:window.matchMedia('(prefers-color-scheme:dark)').matches; }
  function applyTheme(dark) { var h=document.documentElement; h.classList.remove('dark','light'); h.classList.add(dark?'dark':'light'); }

  var STATUS_ORDER = ['抽裙','全齐','扩裙','全扩','特姿'];
  var STATUS_COLORS = { '全扩':'#E8A840', '扩裙':'#9B7FD4', '全齐':'#5BAF6B', '抽裙':'#5B9BD5', '特姿':'#FF7BA6', '未抽齐':'#B08898' };
  var COLLECTED = ['全齐','扩裙','全扩','特姿'];

  function getStats() {
    var outfits = Storage.get('outfits_v2', []);
    var pdLog = Storage.get('purple_diamond_log', []);
    var byStatus = {};
    var byCategory = {};
    var collected = outfits.filter(function(o){ return COLLECTED.indexOf(o.status)!==-1; });
    outfits.forEach(function(o){ var s=o.status||'未抽齐'; byStatus[s]=(byStatus[s]||0)+1; });
    collected.forEach(function(o){ var c=o.category||'未知'; byCategory[c]=(byCategory[c]||0)+1; });
    var pdAmount = pdLog.length>0 ? pdLog[pdLog.length-1].amount : 0;
    return { setCount: outfits.length, byStatus: byStatus, byCategory: byCategory, pdAmount: pdAmount };
  }

  function render(params, container) {
    if (params.sub === 'overview') { renderOverview(container); return; }
    var stats = getStats();
    var dark = isDark();
    var catOrder = ['限时六星','限时五星','盲盒','潮流密码','陪跑五星'];
    var catLabels = {'限时六星':'六星','限时五星':'五星','盲盒':'盲盒','潮流密码':'密码','陪跑五星':'陪跑'};

    container.innerHTML =
      '<div class="page">'+
        '<div class="page-head"><h2>✨ 衣橱统计</h2></div>'+
        '<div class="stats-grid">'+
          catOrder.filter(function(c){return (stats.byCategory[c]||0)>0;}).map(function(c){
            return '<div class="stat-card"><div class="sc-num">'+(stats.byCategory[c]||0)+'</div><div class="sc-label">'+(catLabels[c]||c)+'</div></div>';
          }).join('')+
        '</div>'+
        '<div class="section-title">📊 状态分布</div>'+
        '<div class="status-bars">'+
          STATUS_ORDER.map(function(sk){
            var n = stats.byStatus[sk]||0;
            var pct = stats.setCount>0?Math.round(n/stats.setCount*100):0;
            return '<div class="sb-row"><span class="sb-label">'+sk+'</span>'+
              '<div class="sb-bar"><div class="sb-fill" style="width:'+pct+'%;background:'+(STATUS_COLORS[sk]||'#888')+'"></div></div>'+
              '<span class="sb-num">'+n+'</span></div>';
          }).join('')+
        '</div>'+
        '<div class="overview-card" id="overview-entry">'+
          '<div><div class="ov-title">👗 衣橱总览</div><div class="ov-sub">查看已收集套装</div></div>'+
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>'+
        '</div>'+
        '<div class="section-title">💎 道具一览</div>'+
        '<div class="item-quick">'+
          '<div class="iq-item" style="--accent:#C77DFF"><span>💎</span><span>攒钻 '+stats.pdAmount+'</span></div>'+
        '</div>'+
        '<div class="section-title">⚙️ 设置</div>'+
        '<div class="settings-group">'+
          '<div class="settings-row">'+
            '<span>深色模式</span>'+
            '<label class="toggle"><input type="checkbox" id="dark-toggle"'+(dark?' checked':'')+'><span class="toggle-slider"></span></label>'+
          '</div>'+
          '<label class="settings-row" for="show-outfits-toggle">'+
            '<span>显示底栏套装入口</span>'+
            '<span class="toggle"><input type="checkbox" id="show-outfits-toggle"'+(Router.isTabVisible('outfits')?' checked':'')+'><span class="toggle-slider"></span></span>'+
          '</label>'+
          '<label class="settings-row" for="show-notes-toggle">'+
            '<span>显示底栏记录入口</span>'+
            '<span class="toggle"><input type="checkbox" id="show-notes-toggle"'+(Router.isTabVisible('notes')?' checked':'')+'><span class="toggle-slider"></span></span>'+
          '</label>'+
          '<button class="settings-row settings-btn" id="export-data">导出数据 <span style="color:var(--text2)">JSON</span></button>'+
          '<button class="settings-row settings-btn danger" id="clear-data">清除所有数据</button>'+
        '</div>'+
        '<div class="about-line">以闪亮之名 · 衣橱助手 v1.0</div>'+
      '</div>';

    container.querySelector('#overview-entry').addEventListener('click', function(){ Router.go('profile', {sub:'overview'}); });
    container.querySelector('#dark-toggle').addEventListener('change', function(){ var v=this.checked; Storage.set(DARK_KEY,v); applyTheme(v); });
    container.querySelector('#show-outfits-toggle').addEventListener('change', function(){ Router.setTabVisible('outfits', this.checked); });
    container.querySelector('#show-notes-toggle').addEventListener('change', function(){ Router.setTabVisible('notes', this.checked); });
    container.querySelector('#export-data').addEventListener('click', function(){
      var all = { outfits_v2: Storage.get('outfits_v2',[]), purple_diamond_log: Storage.get('purple_diamond_log',[]), exported: new Date().toISOString() };
      var blob = new Blob([JSON.stringify(all,null,2)], {type:'application/json'});
      var a = document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download = 'yishan_closet_'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
    container.querySelector('#clear-data').addEventListener('click', function(){
      if (confirm('确定删除所有数据吗？此操作不可恢复。')) { Storage.remove('outfits_v2'); Storage.remove('purple_diamond_log'); Storage.remove('spending_log'); Router.refresh(); }
    });
  }

  applyTheme(isDark());
  window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', function(e){
    if (Storage.get(DARK_KEY,null)===null) applyTheme(e.matches);
  });

  var STATUSES = [
    { key: '未抽齐', color: '#B08898', bg: '#F5F0F3' },
    { key: '抽裙',   color: '#5B9BD5', bg: '#EEF4FB' },
    { key: '全齐',   color: '#5BAF6B', bg: '#EDF7EF' },
    { key: '扩裙',   color: '#9B7FD4', bg: '#F4F0FB' },
    { key: '全扩',   color: '#E8A840', bg: '#FFF9EC' },
    { key: '特姿',   color: '#FF7BA6', bg: '#FFF0F5' }
  ];

  function renderOverview(container) {
    var t = document.getElementById('nav-title'); if (t) t.textContent = '衣橱总览';
    var outfits = Storage.get('outfits_v2', []).filter(function(o){ return COLLECTED.indexOf(o.status)!==-1; });
    var groupBy = container._ovGroup || 'status';
    container._ovGroup = groupBy;

    // 分组
    var groups = {};
    outfits.forEach(function(o){
      var key = groupBy === 'status' ? (o.status||'未抽齐') : (o.category||'未知');
      if (!groups[key]) groups[key] = [];
      groups[key].push(o);
    });

    var order = groupBy === 'status'
      ? ['全扩','扩裙','全齐','抽裙','特姿']
      : ['限时六星','陪跑五星','限时五星','盲盒','潮流密码'];

    var listHtml = outfits.length === 0
      ? '<div class="empty-cute">还没有已收集的套装</div>'
      : order.filter(function(k){return groups[k]&&groups[k].length>0;}).map(function(k){
          return '<div class="ov-group"><div class="ov-group-title">'+k+' · '+(groups[k].length)+'</div>'+
            '<div class="ov-grid">'+
            groups[k].map(function(o){
              var st = STATUSES.find(function(s){return s.key===o.status;})||STATUSES[0];
              var poster = o.photo || (o.photos ? o.photos[o.coverIndex||0] : '') || 'posters/'+encodeURIComponent(o.fullName)+'.jpg';
              return '<div class="ov-item">'+
                '<div class="ov-poster" style="background-image:url('+poster+')"></div>'+
                '<span class="ov-name">'+esc(o.name)+'</span>'+
                '<span class="ov-status" style="--st-color:'+st.color+';--st-bg:'+st.bg+'">'+st.key+'</span>'+
              '</div>';
            }).join('')+
            '</div></div>';
        }).join('');

    container.innerHTML = '<div class="page" style="animation:none">'+
      '<button class="back-btn" id="ov-back">← 返回</button>'+
      '<div class="ov-toggle">'+
        '<button class="ov-tg-btn'+(groupBy==='status'?' active':'')+'" data-gb="status">按收集状态</button>'+
        '<button class="ov-tg-btn'+(groupBy==='type'?' active':'')+'" data-gb="type">按套装类型</button>'+
      '</div>'+
      '<div class="ov-list">'+listHtml+'</div>'+
    '</div>';

    container.querySelector('#ov-back').addEventListener('click',function(){ window.history.back(); });
    container.querySelectorAll('.ov-tg-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        container._ovGroup = btn.getAttribute('data-gb');
        renderOverview(container);
      });
    });
  }

  function esc(s) { var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  ToolRegistry.register({
    id: 'profile', title: '我的', icon: '✨',
    tab: true,
    tabIcon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 00-16 0"/></svg>',
    paramNames: ['sub'],
    render: render
  });
})();
