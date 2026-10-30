// Run: node scripts/test_diamond_chart.cjs (no browser storage is changed).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync('js/diamond-chart.js', 'utf8'), context);
function element() {
  return {innerHTML:'',textContent:'',value:0,disabled:false,events:{},
    addEventListener(name,fn){this.events[name]=fn;},
    getBoundingClientRect(){return {left:0,width:390};},setPointerCapture(){}};
}
function fixture(log) {
  const selectors=['svg','input','.pd-point-detail','.pd-chart-range'];
  const nodes=Object.fromEntries(selectors.map(s=>[s,element()]));
  const buttons=['in','out','all','latest'].map(mode=>Object.assign(element(),{getAttribute(){return mode;}}));
  buttons.forEach(b=>nodes['[data-zoom="'+b.getAttribute()+'"]']=b);
  const host={isConnected:true,clientWidth:390,innerHTML:'',querySelector(s){assert.ok(nodes[s],s);return nodes[s];},querySelectorAll(){return buttons;}};
  context.DiamondChart.mount(host,log);
  return {host,nodes,buttons,svg:nodes.svg};
}
const log=[{date:'2026-01-01',amount:0},{date:'2026-10-01',amount:23000,note:'日常积攒'},
  {date:'2026-10-15',amount:3000,note:'抽某个池子 <script>alert(1)</script>'},{date:'2026-10-30',amount:8000}];
const f=fixture(log);
const initialRange=f.nodes['.pd-chart-range'].textContent;
assert.match(f.svg.innerHTML,/钻量/);assert.match(f.svg.innerHTML,/日期/);
assert.match(f.svg.innerHTML,/&lt;script&gt;/);assert.ok(!f.svg.innerHTML.includes('<script>'));
f.buttons.find(b=>b.getAttribute()==='in').events.click();
assert.notEqual(f.nodes['.pd-chart-range'].textContent,initialRange);
f.nodes.input.value=0;f.nodes.input.events.input();
assert.match(f.nodes['.pd-chart-range'].textContent,/2026-01-01/);
f.buttons.find(b=>b.getAttribute()==='latest').events.click();
const before=f.nodes['.pd-chart-range'].textContent;
f.svg.events.pointerdown({pointerId:1,pointerType:'touch',clientX:200});
f.svg.events.pointermove({pointerId:1,clientX:280});
assert.notEqual(f.nodes['.pd-chart-range'].textContent,before);
f.svg.events.pointerup({pointerId:1});
f.svg.events.pointerdown({pointerId:1,pointerType:'touch',clientX:130});
f.svg.events.pointerdown({pointerId:2,pointerType:'touch',clientX:230});
const beforePinch=f.nodes['.pd-chart-range'].textContent;
f.svg.events.pointermove({pointerId:2,clientX:330});
assert.notEqual(f.nodes['.pd-chart-range'].textContent,beforePinch);
f.svg.events.pointercancel({pointerId:1});f.svg.events.pointercancel({pointerId:2});
f.buttons.find(b=>b.getAttribute()==='all').events.click();
assert.equal(f.nodes.input.disabled,true);
assert.ok(!/NaN|Infinity/.test(f.svg.innerHTML));
for(const amount of [0,10000]) {
  const single=fixture([{date:'2026-10-30',amount,note:'单条记录'}]);
  assert.ok(!/NaN|Infinity/.test(single.svg.innerHTML));
  assert.equal(single.nodes.input.disabled,true);
}
assert.match(fixture([]).host.innerHTML,/添加记录/);
console.log('PASS: date axes, zoom, pan, horizontal pinch, note escaping, single/zero/empty histories');
