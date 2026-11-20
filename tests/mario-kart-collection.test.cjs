const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/mario-kart-catalog.json'), 'utf8'));
const app = fs.readFileSync(path.join(root, 'ui/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'ui/index.html'), 'utf8');
const localSaves = fs.readFileSync(path.join(root, 'ui/account.js'), 'utf8');
const rust = fs.readFileSync(path.join(root, 'src-tauri/src/lib.rs'), 'utf8');

test('Super Circuit groups the static recomp and a separate macOS native alternative', () => {
  const group = catalog.titles.find((x) => x.name === 'Mario Kart: Super Circuit');
  assert.deepEqual(group.pc, ['mksc', 'mksc-neo']);
  const neo = catalog.apps.find((x) => x.id === 'mksc-neo');
  assert.ok(neo.systems.includes('macos'));
  assert.equal(neo.repo, 'arcanite24/mksc-neo');
  assert.match(neo.description, /not the gbarecomp static recomp/i);
});

test('DS Kart Recompiled lists its macOS package and marks the port beta in its catalogue copy', () => {
  const ds = catalog.apps.find((x) => x.id === 'mkds');
  assert.ok(ds.systems.includes('macos'));
  assert.match(ds.assets.macos, /Mac/i);
  assert.match(ds.description, /beta/i);
});

test('Mario Kart Wii groups upstream Wiicompiled and the enhanced Mac-capable build', () => {
  const group = catalog.titles.find((x) => x.name === 'Mario Kart Wii');
  assert.deepEqual(group.pc, ['mkwii', 'mkwii-enhanced']);
  const enhanced = catalog.apps.find((x) => x.id === 'mkwii-enhanced');
  assert.ok(enhanced.systems.includes('macos'));
  assert.match(enhanced.assets.macos, /\.dmg$/i);
  assert.equal(enhanced.repo, 'nvd123-YT/MarioKartWiiCompiled-Enhanced');
});

test('Records page offers time trials and manual race totals stored in launcher settings', () => {
  assert.match(html, /data-go="records"/);
  assert.match(app, /function pageRecords\(\)/);
  assert.match(app, /mk_records/);
  assert.match(app, /record-stats-save/);
  assert.match(app, /m:ss\.mmm/);
});

test('account sign-in and achievements UI are removed while local save backup UI stays', () => {
  assert.doesNotMatch(html, /achievements\.js/);
  assert.doesNotMatch(app, /v === 'achievements'/);
  assert.doesNotMatch(localSaves, /function signIn\(/);
  assert.match(localSaves, /window\.pageSaves = pageSaves/);
  assert.doesNotMatch(rust, /ach::/);
});
