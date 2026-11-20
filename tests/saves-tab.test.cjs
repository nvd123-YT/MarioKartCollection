const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const account = read('ui/account.js'), tv = read('ui/tv.js'), app = read('ui/app.js');
const lib = read('src-tauri/src/lib.rs'), cloud = read('src-tauri/src/cloud.rs');

test('desktop save UI offers local history, manual backup and restore', () => {
  assert.match(account, /function historyCard\(/);
  assert.match(account, /data-act="saves-open-backups"/);
  assert.match(account, /data-act="saves-now"/);
  assert.match(account, /data-act="saves-restore"/);
  assert.match(account, /invoke\('saves_backup'/);
  assert.match(account, /invoke\('saves_restore'/);
  assert.match(account, /function loadSaveStatus/);
  assert.match(account, /invoke\('saves_status'/);
});

test('Big Picture retains local save backup, history and restore controls', () => {
  assert.match(tv, /data-tvact="gs-backup"/);
  assert.match(tv, /data-tvact="gs-restore"/);
  assert.match(tv, /data-tvact="gs-place"/);
  assert.match(tv, /invoke\('saves_backup'/);
  assert.match(tv, /invoke\('saves_restore'/);
});

test('local saves shared between alternate builds remain available', () => {
  assert.match(account, /invoke\('saves_share'/);
  assert.match(tv, /invoke\('saves_share'/);
  assert.match(lib, /cloud::saves_share/);
});

test('account/cloud sync actions are not exposed by the launcher', () => {
  assert.doesNotMatch(account, /saves_cloud|saves_check|saves_pick|acc-signin|beforeCloudPlay|syncCloudNow/);
  assert.doesNotMatch(tv, /saves_cloud|saves_check|saves_cloud_delete|gs-cloud|gs-sync|S\.account/);
  assert.doesNotMatch(lib, /cloud::account_start|cloud::account_state|cloud::saves_cloud|cloud::saves_check|cloud::saves_pick|cloud::saves_cloud_delete/);
  assert.match(cloud, /pub fn token\(_dir: &Path\) -> Option<String>[\s\S]*?None/);
});

test('Records are separate from local game save backups', () => {
  assert.match(app, /function pageRecords\(\)/);
  assert.match(app, /mk_records/);
  assert.match(account, /window\.pageSaves = pageSaves/);
});
