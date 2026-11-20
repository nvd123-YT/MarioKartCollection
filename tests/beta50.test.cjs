const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('Discord presence follows whether the launcher window is visible', () => {
  const lib = read('src-tauri/src/lib.rs');
  assert.match(lib, /let hidden = w\.is_minimized\(\)\.unwrap_or\(false\) \|\| !w\.is_visible\(\)\.unwrap_or\(true\);/);
  assert.match(lib, /discord::send\(discord::Msg::Shown\(!hidden\)\);/);
});
