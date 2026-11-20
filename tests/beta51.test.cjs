const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = (f) => fs.readFileSync(path.join(__dirname, '../ui', f), 'utf8');
const app = read('app.js'), tv = read('tv.js'), more = read('more.js');
const fn = (src, name) => src.match(new RegExp(`^(?:async )?function ${name}\\([^]*?^}`, 'm'))[0];
const line = (src, name) => src.match(new RegExp(`^const ${name} = .*$`, 'm'))[0];
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tf = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);

test('cards show only Easy Setup and the versions count', () => {
  const poster = fn(app, 'poster');
  assert.doesNotMatch(poster, /deckb|stb|greatOnDeck|STATE_NAME/);
  const tvPoster = tv.match(/  function poster\(a, key, sub, rank\) \{[^]*?\n  \}/)[0];
  assert.doesNotMatch(tvPoster, /deckb|stb|greatOnDeck|STATE_NAME/);
  assert.match(tvPoster, /turnkey\(a\) \? `<span class="tv-easyb\$\{vers \? ' ico' : ''\}"/);
  // The game page keeps the project's state and Great on Deck.
  assert.match(app, /const chips = \[quiet \? '' : sp, turnkey\(a\)/);
  assert.match(tv, /\$\{deckChip\}\$\{stChip\}/);
});

test("the recommended version says why, in one line", () => {
  assert.match(fn(app, 'verRow'), /rec && g\.why \? `<small class="v-why" title="\$\{esc\(g\.why\)\}">/);
  assert.match(tv, /v\.id === g\.pick \? \(g\.why \? `\$\{t\('Recommended'\)\}: \$\{g\.why\}` : t\('Recommended'\)\)/);
});

test('the build on this PC is offered under the game\'s box', () => {
  const { stepsContext } = require('./steps-context.cjs');
  const c = stepsContext();
  const su = (x) => Object.assign({ needs: 'x', kind: '', inputs: [{ id: 'base', label: 'Base', role: 'game', file: true, active: true, path: null }], prepare_options: [] }, x);
  // Set Up uses the build already in the game's folder, unless Build It Again.
  const built = c.stepsView('h', su({ prebuilt: '/home/p/Games/Hopper' }), {}, { name: 'H' });
  assert.match(built, /still here, so setup skips the build\. <button type="button" data-ss="rebuild">Build It Again<\/button>/);
});

test('files from before get no Use Them Again line', () => {
  const { stepsContext } = require('./steps-context.cjs');
  const c = stepsContext();
  const su = (x) => Object.assign({ needs: 'x', kind: '', inputs: [{ id: 'base', label: 'Base', role: 'game', file: true, active: true, path: null }], prepare_options: [] }, x);
  assert.doesNotMatch(c.stepsView('h', su({ inputs_ready: false }), {}, { name: 'H' }), /Set up before with|data-ss="relink"/);
});

test('players can be asked where each game goes, Easy Install too', () => {
  assert.match(fn(app, 'startInstall'), /\|\| \(S\.settings\.ui \|\| \{\}\)\.ask_where\)\) \{/);
  assert.match(app, /sw\('ask_where', ui\.ask_where, t\('Ask Where to Install'\), 'ui-toggle'\)/);
  assert.match(fn(app, 'locationModal'), /data-ask-where/);
});
