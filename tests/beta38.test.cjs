const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '../ui', f), 'utf8');
const app = read('app.js'), tv = read('tv.js'), css = read('app.css'), account = read('account.js');

test('the game page title has the whole width above the details and buttons', () => {
  assert.match(app, /<div class="gp-name">.*<h1 class="\$\{a\.name\.length > 34 \? 'long' : ''\}">/);
  assert.match(css, /grid-template-areas:"cover name name" "cover title side"/);
  assert.match(css, /@container gp \(max-width:1260px\)\{[^}]*"cover name" "cover title" "cover side"/);
  assert.doesNotMatch(css, /\.gp-title h1\{/);
});

test('the left stick can be left out of moving around, on the desktop and in Big Picture', () => {
  assert.match(app, /sw\('pad_stick', st\.pad_stick !== false/);
  assert.match(tv, /sw\('pad_stick', t\('Move with the left stick'/);
});

test('system icons are vector images', () => {
  assert.match(app, /--m:url\(img\/\$\{k\}\.svg\)/);
  for (const k of ['windows', 'linux', 'macos']) assert.ok(fs.existsSync(path.join(__dirname, '../ui/img', k + '.svg')), k);
});

test('the Saves page never asks again and again for an empty answer', () => {
  assert.match(account, /S\.savesAll = \(await invoke\('saves_overview'\)\) \|\| \{ games: \[\] \}/);
});

test('removed account and achievement pages are not reachable in Big Picture', () => {
  assert.doesNotMatch(tv, /pageAchTV|achGameTV|case 'account'|window\.tvSignIn/);
});
