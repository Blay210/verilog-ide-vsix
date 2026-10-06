import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTime, formatRulerTime, parseTime, rulerLabels, timelineRuler } from '@rtl-dev/waveform';

const measure = (text: string) => text.length * 7;
test('long absolute labels split exactly and remain independent of the viewport', () => {
  const cases = [
    { tick: 9002193029001n, scale: { magnitude: 1, unit: 'ns' } as const, label: '9002.193029001 s' },
    { tick: 9007199254740993n, scale: { magnitude: 1, unit: 'ps' } as const, label: '9007 s\n199,254,740,993 ps' },
    { tick: 9002193029001001n, scale: { magnitude: 10, unit: 'fs' } as const, label: '90 s\n21,930,290,010,010 fs' }
  ];
  for (const { tick, scale, label } of cases) {
    assert.equal(formatRulerTime(tick, scale), label);
    const lines = label.split('\n').map(line => line.replaceAll(',', ''));
    assert.equal(lines.reduce((sum, line) => sum + parseTime(line, scale), 0n), tick);
    const multilineMeasure = (text: string) => Math.max(...text.split('\n').map(measure));
    for (const start of [tick - 100n, tick - 200n]) {
      const layout = timelineRuler(start, tick + 200n, 600, t => formatRulerTime(t, scale), multilineMeasure);
      for (const [index, item] of layout.labels.entries()) {
        assert.ok(item.x + multilineMeasure(item.text) <= 596);
        if (index) assert.ok(layout.labels[index - 1].x + multilineMeasure(layout.labels[index - 1].text) + 8 <= item.x);
      }
    }
  }
  assert.equal(formatRulerTime(20n, { magnitude: 1, unit: 'ns' }), '20 ns');
  assert.equal(formatRulerTime(9003000000000n, { magnitude: 1, unit: 'ns' }), '9003 s', 'whole-second carry remains absolute');
});
function check(from: bigint, to: bigint, width: number) {
  const labels = rulerLabels(from, to, width, tick => formatTime(tick, { magnitude: 1, unit: 'ps' }), measure);
  for (const [i, label] of labels.entries()) {
    assert.ok(label.x >= 4);
    assert.ok(label.x + measure(label.text) <= width - 4);
    if (i) assert.ok(labels[i - 1].x + measure(labels[i - 1].text) + 8 <= label.x);
  }
  assert.equal(new Set(labels.map(label => label.text)).size, labels.length);
  return labels;
}
test('large offset ruler retains exact endpoints without colliding labels', () => {
  const from = 9007199254740993n, to = from + 191n;
  const labels = check(from, to, 558);
  assert.equal(labels[0].text, '9007.199254740993 s');
  assert.equal(labels.at(-1)?.text, '9007.199254741184 s');
  assert.ok(labels.length < 6);
  check(0n, to, 558);
});

test('major and minor ticks use aligned readable intervals without changing exact time', () => {
  const layout = timelineRuler(0n, 41200n, 800, tick => formatTime(tick,{magnitude:1,unit:'ps'}), measure);
  assert.deepEqual(layout.ticks.filter(t=>t.major).map(t=>t.tick),[0n,10000n,20000n,30000n,40000n]);
  assert.ok(layout.ticks.some(t=>!t.major));assert.equal(layout.ticks[1].tick,2000n);
  assert.deepEqual(layout.labels.map(l=>l.text),['0 ps','10 ns','20 ns','30 ns','40 ns']);
  for(const width of [80,250,800]) {
    const ruler=timelineRuler(8240n,41200n,width,String,measure);
    assert.ok(ruler.ticks.length<=60);
    for(const [i,label] of ruler.labels.entries()) {
      assert.ok(label.x>=4 && label.x+measure(label.text)<=width-4);
      if(i)assert.ok(ruler.labels[i-1].x+measure(ruler.labels[i-1].text)+8<=label.x);
    }
  }
  const origin=9007199254740993n;
  const large=timelineRuler(origin,origin+191n,800,String,measure);
  assert.ok(large.ticks.every(t=>t.tick>=origin && t.tick<=origin+191n));
  assert.ok(large.ticks.filter(t=>t.major).every(t=>t.tick%50n===0n));
  assert.deepEqual(timelineRuler(0n,1n,Number.NaN,String,measure),{ticks:[],labels:[]});
});
test('narrow and one-tick rulers avoid clipping and duplicate timestamps', () => {
  assert.equal(check(0n, 1910n, 800).length, 6);
  check(0n, 1910n, 80);
  assert.equal(check(0n, 1n, 800).length, 2);
  assert.deepEqual(rulerLabels(0n, 1n, 8, String, measure), []);
  assert.deepEqual(rulerLabels(0n, 1n, Number.NaN, String, measure), []);
});
