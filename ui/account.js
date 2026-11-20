'use strict';
// Local save discovery, backups and restore. Account, sign-in and hosted sync UI are intentionally absent.
const CLOUD_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6A3.8 3.8 0 0 1 17.5 18z"/></svg>';
S.account = { signedIn: false };
S.saves = {};
const whenText = (ts) => (ts ? new Date(ts * 1000).toLocaleString(curLocale(), timeOpts({ month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })) : '');
const inTV = () => document.body.classList.contains('tv-on');

// ---------- a game's Saves tab ----------
async function loadSaves(id) {
  S.saves[id] = S.saves[id] && S.saves[id] !== 'loading' ? Object.assign(S.saves[id], { busy: true }) : 'loading';
  try { S.saves[id] = await invoke('saves_info', { id }); } catch (e) { S.saves[id] = { error: String(e && e.message ? e.message : e) }; }
  if (S.view === 'game' && S.arg === id && S.tab === 'saves') refreshGame();
  // Whatever just changed the tab (Sync Now, Back Up Now, the cloud switch) changed the badge too.
  loadSaveStatus(saveIdOf(id));
}
const FROM = { player: N_('You picked this folder'), developer: N_('Set by its developer'), catalog: N_('Set by the game project') };
// A folder its developer or RecompLauncher named is the right one: it's said in green, with a
// shield, so the player sees there's nothing to set up. One the player picked is said plainly.
const SET_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/></svg>';
const spotSet = (p) => p.from === 'developer' || p.from === 'catalog';
// Nobody (the player, its developer or RecompLauncher) has said where this game saves. Nothing is
// guessed: the player picks the folder, and until then nothing of it is backed up.
const SAVES_UNKNOWN = N_('The launcher doesn\'t know where this game saves');
const SAVES_UNKNOWN_HELP = N_('Nothing is backed up or sent to the cloud until you pick the folder where it keeps its saves.');
const SAVES_PICK = N_('Pick a Folder');
const savesUnknown = (s) => !!(s && Array.isArray(s.spots) && !s.spots.length);
window.savesUnknown = savesUnknown;
const SHARE_SAVES = N_('Share saves between versions');
const SHARE_SAVES_HELP = N_('Ask before copying a newer save from another installed version.');
const saveShareTitle = (id) => !subOf(id) && verGroup(byId(id))?.id;
const saveShareOn = (title) => ((S.settings.ui || {}).save_share_titles || []).includes(title);
async function toggleSaveShare(title) {
  const current = (S.settings.ui || {}).save_share_titles || [];
  await saveUi({ save_share_titles: current.includes(title) ? current.filter((x) => x !== title) : [...current, title] }, true);
}
// The tab, top to bottom: where its saves stand (with the one thing to do about it), every save
// in one list, its settings, and where it saves. A game nobody has said the save folder of leads
// with picking it instead, since nothing else works until then.
function savesTab(a) {
  const id = a.id, s = S.saves[id], g = S.library[id] || {};
  if (!s || s === 'loading') { if (!s) loadSaves(id); return `<div class="stack"><div class="card"><p class="muted" style="margin:0">${esc(t('Loading…'))}</p></div></div>`; }
  if (s.error) return `<div class="stack"><div class="card"><p style="margin:0">${esc(t(s.error))}</p></div></div>`;
  if (savesUnknown(s)) return `<div class="stack">${unknownCard(id)}${historyCard(id, s, g, true)}${savesSettingsCard(id)}</div>`;
  return `<div class="stack">${saveStatusCard(id, s)}${historyCard(id, s, g, false)}${savesSettingsCard(id)}${whereCard(id, s)}</div>`;
}

// Nobody has said where it saves: nothing is backed up or uploaded, even with cloud saves on, so
// it's red like a problem, and Pick a Folder is the way out.
function unknownCard(id) {
  return `<div class="card svs sb-bad" role="status"><div class="svs-row"><span class="svs-ico">${badgeIcon('alert', 30)}</span><div class="k"><b>${esc(t(SAVES_UNKNOWN))}</b><span>${esc(t(SAVES_UNKNOWN_HELP))}</span></div><span class="acts"><button type="button" class="btn sm main" data-act="saves-place" data-id="${esc(id)}">${esc(t(SAVES_PICK))}</button></span></div></div>`;
}

// A folder its developer set that's too big to look through: the player can't change it, so
// the way out is telling the developer.
const FOLDER_SET_TOO_BIG = N_('Its save folder is too big to look through, so cloud saves are paused for this game. Your saves stay on this PC. Its developer can fix where it saves: report it to them.');

// Where its saves stand, in the same words and colours as the line above Play, and the one thing
// to do about it.
function saveStatusCard(id, s) {
  const b = saveBadgeFor(id);
  if (!b) return '';
  const sid = saveIdOf(id);
  const st = S.saveStat[sid] || {};
  const step = saveNextStep(st, S.savePhase[sid], S.running.has(parentId(sid)));
  const btn = step ? '<button type="button" class="btn sm main" data-act="' + step.act + '" data-id="' + esc(id) + '"' + (s.busy ? ' disabled' : '') + '>' + esc(t(step.label)) + '</button>' : '';
  const rows = b.rows.map(([k, v]) => k + ': ' + v).join(' · ');
  return '<div class="card svs sb-' + b.tone + '" role="status"><div class="svs-row"><span class="svs-ico">' + badgeIcon(b.mark, 30) + '</span><div class="k"><b>' + esc(b.label) + (b.note ? ' <small>· ' + esc(b.note) + '</small>' : '') + '</b>' + (b.text ? '<span>' + esc(b.text) + '</span>' : '') + (rows ? '<small>' + esc(rows) + '</small>' : '') + '</div><span class="acts">' + btn + '</span></div></div>';
}
function statusCardText(st, b) {
  if (st.known === false) return t('The launcher does not know this game\'s save folder yet. Pick it below to enable local backups.');
  return b.text;
}
function saveNextStep(st, phase, running) {
  if (phase || running || !st || st.known !== false) return null;
  return { act: 'saves-place', label: N_('Pick a Folder') };
}

// Every save in one list, newest first. A copy kept on this PC and the same save in the cloud
// (the same checksum) are one row, marked as being in both places. The one in the game's folder
// now is Current.
function saveHistory(s) {
  const rows = (Array.isArray(s.local) ? s.local : []).map((c) => ({
    when: c.when, device: c.device, played: c.played, files: c.files, size: c.size,
    hash: c.hash, name: c.name, v: null, current: false, deletable: false,
  }));
  rows.sort((a, b) => b.when - a.when);
  const now = s.current && rows.find((r) => r.hash === s.current);
  if (now) now.current = true;
  return rows;
}
function historyMarks() {
  return [{ k: 'pc', label: t('On this device') }];
}
const MARK_ICONS = {
  pc: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
  cloud: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6A3.8 3.8 0 0 1 17.5 18z"/></svg>',
  other: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 6h14v9H5zM2 19h20"/></svg>',
};

const BIN_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
const CURRENT_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

// Details under a save: how long the game had been played then, its files and size.
function historyDetails(r) {
  const played = r.played ? tf('{time} played', { time: fmtTime(r.played) }) : '';
  const files = r.files ? tn(r.files, '1 file', '{n} files') : '';
  return [played, files, fmtB(r.size)].filter(Boolean).join(' · ');
}

function historyRow(id, r) {
  const marks = historyMarks(r).map((m) => '<span class="svm svm-' + m.k + '">' + MARK_ICONS[m.k] + esc(m.label) + '</span>').join('');
  const which = r.name ? 'data-name="' + esc(r.name) + '"' : '';
  const put = '<button type="button" class="btn sm" data-act="saves-restore" data-id="' + esc(id) + '" ' + which + '>' + esc(t('Restore')) + '</button>';
  const side = r.current ? '<span class="svh-cur">' + CURRENT_ICON + esc(t('In the game now')) + '</span>' : put;
  return '<div class="set-row svh-row' + (r.current ? ' cur' : '') + '"><div class="k"><b>' + esc(whenText(r.when)) + '</b><span class="svh-marks">' + marks + '</span><span>' + esc(historyDetails(r)) + '</span></div><span class="acts">' + side + '</span></div>';
}

// The newest few; the rest one click away, so a long history doesn't push the settings far down.
const HISTORY_SHOWN = 6;
S.savesMore = new Set();
// The newest few, and always down to the one in the game now: after an older save is restored,
// its row stays where its date puts it and the list reaches it.
function historyShown(id, rows) {
  if (S.savesMore.has(id)) return rows;
  const current = rows.findIndex((r) => r.current);
  return rows.slice(0, Math.max(HISTORY_SHOWN, current + 1));
}

// Show older saves, or, once they're all shown, fewer again: { more, label }, or null when the
// list is short. `more`: how many are hidden.
function historyToggle(id, rows, more) {
  if (more) return { more: true, label: tn(more, 'Show 1 older save', 'Show {n} older saves') };
  if (S.savesMore.has(id) && rows.length > HISTORY_SHOWN) return { more: false, label: t('Show fewer saves') };
  return null;
}

function historyCard(id, s, g, unknown) {
  const rows = saveHistory(s);
  const shown = historyShown(id, rows);
  const more = rows.length - shown.length;
  const backups = '<button type="button" class="btn sm" data-act="saves-open-backups" data-id="' + esc(id) + '">' + esc(t('Open Backups')) + '</button>';
  const now = '<button type="button" class="btn sm main" data-act="saves-now" data-id="' + esc(id) + '"' + (s.busy ? ' disabled' : '') + '>' + esc(t('Back up now')) + '</button>';
  const acts = unknown ? (s.local && s.local.length ? backups : '') : backups + now;
  const emptyText = unknown ? t('No backups yet.') : g.last_played ? t('No saves found yet. Check the game project\'s documentation for its save location.') : t('Play it once and its saves are copied here after.');
  const list = rows.length ? shown.map((r) => historyRow(id, r)).join('') : '<p class="set-empty">' + esc(emptyText) + '</p>';
  const toggle = historyToggle(id, rows, more);
  const toggleBtn = toggle ? '<button type="button" class="btn sm svh-more" data-act="' + (toggle.more ? 'saves-more' : 'saves-less') + '" data-id="' + esc(id) + '">' + esc(toggle.label) + '</button>' : '';
  return '<div class="card"><div class="card-h"><h3>' + esc(t('Save History')) + '</h3><span class="acts">' + acts + '</span></div>' + list + toggleBtn + '</div>';
}

// Sharing saves between its versions, for a game with more than one. Cloud saves on or off is in
// the game's Manage section; here the status card only offers to turn them on.
function savesSettingsCard(id) {
  const shareTitle = saveShareTitle(id);
  if (!shareTitle) return '';
  return `<div class="card"><h3 style="margin-bottom:6px">${esc(t('Settings'))}</h3><div class="set-row"><div class="k"><b>${esc(t(SHARE_SAVES))}</b><span>${esc(t(SHARE_SAVES_HELP))}</span></div><button type="button" class="switch" role="switch" aria-checked="${saveShareOn(shareTitle)}" aria-label="${esc(t(SHARE_SAVES))}" data-act="saves-share" data-id="${esc(id)}"></button></div></div>`;
}

// Where the game keeps its saves. A folder its developer (or RecompLauncher) named is only shown,
// with a way to open it: saying where is what recomplauncher.json is for, so there's nothing to
// change. Changing it and more folders are for a folder the player picked, which only counts
// while nobody has named one (saves::spots).
function whereCard(id, s) {
  const picked = s.spots.filter((p) => p.from === 'player').length;
  const rows = s.spots.map((p) => spotRow(id, p, picked > 1)).join('');
  const add = picked ? `<div class="set-row"><div class="k"><b>${esc(t('Saves in more than one folder?'))}</b><span>${esc(t('Add another folder used by this game. Local backups cover every folder.'))}</span></div><span class="acts"><button type="button" class="btn sm" data-act="saves-place-add" data-id="${esc(id)}">${esc(t('Add a Folder'))}</button></span></div>` : '';
  return `<div class="card"><h3 style="margin-bottom:6px">${esc(t('Where it saves'))}</h3>${rows}${add}</div>`;
}

function spotRow(id, p, many) {
  const from = esc(t(FROM[p.from] || ''));
  const notYet = p.exists ? '' : ` · ${esc(t('Not there yet'))}`;
  const said = spotSet(p) ? `<span class="svp-set${p.from === 'catalog' ? ' ours' : ''}">${SET_ICON}${from}</span>${notYet}` : `${from}${notYet}`;
  const open = p.exists ? `<button type="button" class="btn sm" data-act="saves-open" data-id="${esc(id)}" title="${esc(t('Where the game keeps its saves'))}">${esc(t('Open'))}</button>` : '';
  let acts = open;
  if (many) acts = `<button type="button" class="btn sm" data-act="saves-place-remove" data-id="${esc(id)}" data-t="${esc(p.template)}">${esc(t('Take Off the List'))}</button>`;
  else if (p.from === 'player') acts = `${open}<button type="button" class="btn sm" data-act="saves-place" data-id="${esc(id)}">${esc(t('Change'))}</button>`;
  return `<div class="set-row"><div class="k"><b class="path">${esc(p.path)}</b><span>${said}</span></div><span class="acts">${acts}</span></div>`;
}

const savesChanged = (id) => { delete S.saves[id]; if (S.view === 'game' && S.arg === id && S.tab === 'saves') loadSaves(id); };

// ---------- the cloud save status above Play ----------
// Where a game's saves stand, on its page above Play and above Big Picture's game buttons, so the
// player doesn't have to open the Saves tab to see whether the last save reached the cloud. Only
// a coloured line, not a button: what to do about it is on the Saves tab. Hovering it says more.
// saves_status answers from this PC alone (it never asks the website); the save-sync event says
// when something runs or ends, and the status is asked again then.
S.saveStat = {};
S.savePhase = {};
const statLoading = new Set();

// A game of several that keeps its own saves goes by its own id; any other by its recomp's.
function saveIdOf(id) {
  const s = subOf(id);
  const own = s && Array.isArray(s.game.saves) && s.game.saves.length;
  return own ? id : parentId(id);
}

async function loadSaveStatus(sid) {
  if (statLoading.has(sid)) return;
  statLoading.add(sid);
  try { S.saveStat[sid] = await invoke('saves_status', { id: sid }); } catch (e) { S.saveStat[sid] = null; }
  statLoading.delete(sid);
  paintSaveBadges(sid);
  refreshSavesTab(sid);
}

// "12 min ago" for the last sync: ago() only goes down to "today", too coarse for "did that
// session's save go up?".
function sinceText(ts) {
  if (!ts) return '';
  const secs = Math.max(0, Date.now() / 1000 - ts);
  if (secs < 60) return t('just now');
  if (secs < 3600) return tn(Math.floor(secs / 60), '1 min ago', '{n} min ago');
  if (secs < 86400) return tn(Math.floor(secs / 3600), '1 hour ago', '{n} hours ago');
  return ago(ts);
}

// What a problem kept by the last sync looks like, by its kind. The backend's own words say why
// (in the tooltip); these say it short.
function saveBadgeInfo(st, phase, running) {
  if (st.known === false) return { tone: 'dim', mark: 'off', label: t('Saves folder not set'), note: '', head: t('Pick the folder where this game saves'), text: t('Choose its save folder on the Saves tab to enable local backups.'), rows: [] };
  const newest = st.newest ? [[t('Last backup'), whenText(st.newest.when)]] : [];
  if (running) return { tone: 'cy', mark: 'play', label: t('Playing now'), note: '', head: t('Local backup after play'), text: t('The launcher keeps a local copy of this game\'s saves after the session.'), rows: newest };
  if (st.newest) return { tone: 'ok', mark: 'check', label: t('Backed up on this device'), note: sinceText(st.newest.when), head: t('Local save backup ready'), text: t('A copy of this game\'s saves is stored on this device.'), rows: newest };
  return { tone: 'dim', mark: 'dash', label: t('No backup yet'), note: '', head: t('No local save backup yet'), text: t('Play the game once. The launcher will keep a copy of its saves after the session.'), rows: [] };
}

const BADGE_MARKS = {
  check: '<path d="m9.4 13.4 2 2 3.4-3.6"/>',
  'check-run': '<path class="sb-spin" d="M14.6 13a2.6 2.6 0 1 1-1-2"/>',
  up: '<path class="sb-bob" d="M12 16.2v-5.4m0 0-2.3 2.3M12 10.8l2.3 2.3"/>',
  down: '<path class="sb-bob" d="M12 10.8v5.4m0 0-2.3-2.3M12 16.2l2.3-2.3"/>',
  clock: '<path d="M12 11v2.4l1.6 1"/>',
  alert: '<path d="M12 10.6v2.8M12 15.7h.01"/>',
  conflict: '<path d="M10 10.6v5.2m-1.6-1.6L10 15.8l1.6-1.6M14 15.8v-5.2m-1.6 1.6L14 10.6l1.6 1.6"/>',
  off: '<path d="M4 4l16 16"/>',
  dash: '<path d="M10 13.4h4"/>',
  play: '<path d="M11 11v4.4l3.4-2.2z" fill="currentColor" stroke="none"/>',
};
const badgeIcon = (mark, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6A3.8 3.8 0 0 1 17.5 18z"/>${BADGE_MARKS[mark] || ''}</svg>`;

// The tooltip: the heading, its line, then each row on its own line.
const badgeTip = (b) => [b.head, b.text, ...b.rows.map(([k, v]) => `${k}: ${v}`)].filter(Boolean).join('\n');

// The status for a game page id, or null while it's not known (or not installed).
function saveBadgeFor(id) {
  if (!S.library[parentId(id)]) return null;
  const sid = saveIdOf(id);
  const st = S.saveStat[sid];
  if (st === undefined) loadSaveStatus(sid);
  if (!st) return null;
  const b = saveBadgeInfo(st, S.savePhase[sid], S.running.has(parentId(sid)));
  return { ...b, tip: badgeTip(b) };
}

function badgeInner(pageId) {
  const b = saveBadgeFor(pageId);
  if (!b) return '';
  const note = b.note ? `<small>${esc(b.note)}</small>` : '';
  return `<span class="sbadge-line sb-${b.tone}" title="${esc(b.tip)}">${badgeIcon(b.mark)}<b>${esc(b.label)}</b>${note}</span>`;
}

// The status on a game page, above Play. It says changes out loud to a screen reader.
function saveBadge(a) {
  if (!S.library[parentId(a.id)]) return '';
  const sid = saveIdOf(a.id);
  return `<div class="sbadge" role="status" aria-label="${esc(t('Cloud saves'))}" data-save-badge="${esc(sid)}" data-page="${esc(a.id)}">${badgeInner(a.id)}</div>`;
}

// Redraws the status lines on screen (one game's, or all of them), and Big Picture's game page.
function paintSaveBadges(sid) {
  for (const el of $$('[data-save-badge]')) {
    if (sid && el.dataset.saveBadge !== sid) continue;
    el.innerHTML = badgeInner(el.dataset.page);
  }
  if (window.tvRefresh && inTV()) window.tvRefresh();
}

// The Saves tab leads with the same status, so it's drawn again when the status changes. Not from
// paintSaveBadges: drawing the game page paints the badges, and that would go round forever.
function refreshSavesTab(sid) {
  if (inTV() || S.view !== 'game' || S.tab !== 'saves' || !S.saves[S.arg]) return;
  if (saveIdOf(S.arg) === sid) refreshGame();
}

// Refresh each game's local backup badge when its save status is read again.
function forgetSaveStatus() {
  S.saveStat = {};
  S.savePhase = {};
  paintSaveBadges();
}

window.saveBadge = saveBadge;
window.saveBadgeFor = saveBadgeFor;
window.saveBadgeIcon = badgeIcon;
window.paintSaveBadges = paintSaveBadges;

// ---------- the Saves page: every game's saves in one place ----------
const CARD_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M9 3v3.5M12 3v3.5M15 3v3.5M8.5 12h7v5h-7z"/></svg>';
let savesAllBusy = null;
async function loadSavesAll() {
  if (savesAllBusy) return savesAllBusy;
  savesAllBusy = (async () => {
    // Never left empty: an empty answer would ask again on every redraw, without end.
    try { S.savesAll = (await invoke('saves_overview')) || { games: [] }; } catch (e) { S.savesAll = { error: String(e && e.message ? e.message : e), games: [] }; }
    savesAllBusy = null;
    if (S.view === 'saves') render(true);
  })();
  return savesAllBusy;
}
// A row of blocks that fill up, like the space on a memory card.
function blocks(frac, n = 32) {
  const on = frac > 0 ? Math.max(1, Math.round(Math.min(1, frac) * n)) : 0;
  return `<div class="blocks" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i${i < on ? ' class="on"' : ''}></i>`).join('')}</div>`;
}
// Where the copies are kept: beside each game in its library (the path shown is the library's
// .backups folder), or a folder the player picked (another drive, a NAS, a folder Drive, OneDrive
// or Dropbox keeps in sync).
function rootCard(o) {
  const mine = !!o.chosen;
  const note = mine && o.reachable === false ? t('Your folder can\'t be reached right now. Copies stay beside each game until it\'s back, then go to it.') : mine ? t('Copies of your saves go here.') : t('Copies of your saves are kept with each game, in its library\'s .backups folder. Pick a folder on another drive, a NAS, or one that Drive, OneDrive or Dropbox keeps in sync, and they go there instead.');
  return `<div class="card"><div class="set-row"><div class="k"><b>${esc(t('Backup Folder'))}</b><span><span class="path">${esc(mine ? o.chosen : (o.root || ''))}</span><br>${esc(note)}</span></div>
    <span class="acts"><button type="button" class="btn sm" data-act="saves-root-open">${esc(t('Open the folder'))}</button><button type="button" class="btn sm" data-act="saves-root-pick">${esc(t('Change'))}</button>${mine ? `<button type="button" class="btn sm" data-act="saves-root-reset">${esc(t('Use the Usual Place'))}</button>` : ''}</span></div></div>`;
}
function pageSaves() {
  const o = S.savesAll;
  if (!o) { loadSavesAll(); return `<div class="loading">${esc(t('Loading…'))}</div>`; }
  const games = (o.games || []).map((x) => ({ ...x, g: S.library[x.id] || {}, a: byId(x.id) })).filter((x) => x.g.name || x.a);
  const withSaves = games.filter((x) => x.copies).sort((a, b) => (b.newest?.when || 0) - (a.newest?.when || 0));
  const none = games.filter((x) => !x.copies).sort((a, b) => (a.g.name || '').localeCompare(b.g.name || ''));
  const copies = withSaves.reduce((n, x) => n + x.copies, 0), size = withSaves.reduce((n, x) => n + x.size, 0);
  const pcCard = `<div class="mc"><div class="mc-top"><span class="mc-ico">${CARD_ICON}</span><div><b>${esc(t('On this PC'))}</b><span>${esc(tn(withSaves.length, '1 game with saves', '{n} games with saves'))}</span></div><strong>${esc(fmtB(size) || '0 KB')}</strong></div>
      ${blocks(withSaves.length ? withSaves.length / Math.max(games.length, 1) : 0)}
      <p>${esc(tn(copies, '1 copy kept', '{n} copies kept'))} · ${esc(t('The newest ten of each game'))}</p></div>`;
  const cloudCard = `<div class="mc"><div class="mc-top"><span class="mc-ico">${CARD_ICON}</span><div><b>${esc(t('Local backups'))}</b><span>${esc(t('No account or online sync is needed.'))}</span></div></div><p>${esc(t('Save copies stay on this device. You can inspect, restore and back them up at any time.'))}</p></div>`;
  const slot = (x, i) => {
    const a = x.a || { id: x.id, name: x.g.name }, n = x.newest;
    const cloud = `<span class="tag">${esc(t('On this device'))}</span>`;
    return `<div class="slot" style="--i:${i}"><button type="button" class="slot-main" data-act="saves-game" data-id="${esc(x.id)}"><span class="slot-art">${a.cover ? pic(a.cover) : ''}</span>
        <span class="slot-txt"><b>${esc(a.name)}</b><span title="${esc(whenText(n.when))}">${esc(tf('Last saved {when}', { when: ago(n.when) }))}${n.device ? ' · ' + esc(n.device) : ''}</span></span>
        <span class="slot-meta">${cloud}<span class="slot-n">${esc(tn(x.copies, '1 copy', '{n} copies'))}<small>${esc(fmtB(x.size))}</small></span></span></button>
      <button type="button" class="icon-btn" data-act="saves-now" data-id="${esc(x.id)}" title="${esc(t('Back up now'))}" aria-label="${esc(t('Back up now'))} · ${esc(a.name)}"${S.running.has(x.id) || x.known === false ? ' disabled' : ''}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V9m0 0-4.5 4.5M12 9l4.5 4.5M5 4h14"/></svg></button></div>`;
  };
  const empty = !games.length
    ? `<div class="empty">${CARD_ICON.replace('width="20" height="20"', 'width="44" height="44"')}<h2>${esc(t('No games yet'))}</h2><p>${esc(t('Install a game and play it once. Its saves are copied here after every session.'))}</p></div>`
    : '';
  return `<div class="page saves-page"><div class="head"><div><h1>${esc(t('Saves'))}</h1><p>${esc(t('After every session the launcher keeps a copy of each game\'s saves. Pick a game to restore an older one.'))}</p></div></div>
    ${o.error ? `<div class="card"><p style="margin:0">${esc(t(o.error))}</p></div>` : ''}
    <div class="mcs">${pcCard}${cloudCard}</div>
    ${rootCard(o)}
    ${withSaves.length ? `<section class="shelf"><div class="shelf-h"><h2>${esc(t('Games'))}</h2></div><div class="slots">${withSaves.map(slot).join('')}</div></section>` : ''}
    ${none.length ? `<section class="shelf"><div class="shelf-h"><h2>${esc(t('No saves yet'))}</h2><span class="muted">${esc(t('Play them once and their saves show up here.'))}</span></div><div class="slots dim">${none.map((x) => { const a = x.a || { id: x.id, name: x.g.name }; return `<button type="button" class="slot-main mini" data-act="saves-game" data-id="${esc(x.id)}"><span class="slot-art">${a.cover ? pic(a.cover) : ''}</span><span class="slot-txt"><b>${esc(a.name)}</b><span>${esc(x.found ? t('Saves found, copied after you play') : t('Not played yet'))}</span></span></button>`; }).join('')}</div></section>` : ''}
    ${empty}</div>`;
}
window.pageSaves = pageSaves;
window.loadSavesAll = loadSavesAll;

// ---------- before Play ----------
// Asks once per game, while signed in, whether its saves go to the cloud; then brings in a newer
// save from another PC, or asks which to keep. false: don't start it.
// `cards`: on the desktop the choices are big cards to click (a heading, a green tag such as
// Newer, and their `lines`), not buttons under the text. Big Picture's sheet is the same either way.
async function ask(title, text, buttons, cards) {
  if (inTV() && window.tvAsk) {
    // A button marked last (one that changes things for good) goes to the end of the list, away from the first focus.
    const list = buttons.filter((b) => !b.last).concat(buttons.filter((b) => b.last));
    const i = await window.tvAsk(title, list.map((b) => ({ label: b.label, sub: b.sub, tag: b.tag, icon: b.icon })));
    return i == null || i < 0 ? null : list[i].v;
  }
  const card = (b, i) => `<button type="button" class="pick-card pick-btn" data-x="b${i}"><b>${esc(b.label)}${b.tag ? ` <em class="pick-newer">${esc(b.tag)}</em>` : ''}</b>${(b.lines || []).map((l) => `<span>${esc(l)}</span>`).join('')}</button>`;
  const button = (b, i) => `<button type="button" class="btn${b.main ? ' main' : ''}" data-x="b${i}">${esc(b.label)}</button>`;
  const choices = cards ? `<div class="pick-two">${buttons.map(card).join('')}</div>` : `<div class="acts ${buttons.length === 3 ? 'grid3' : 'grid2'}">${buttons.map(button).join('')}</div>`;
  return new Promise((res) => {
    let picked = null;
    const box = modal(`<h2>${esc(title)}</h2>${text}${choices}`, (x, close) => {
      const i = Number(String(x.dataset.x).slice(1));
      if (!isNaN(i) && buttons[i]) { picked = buttons[i].v; close(); }
    }, title);
    // The button marked focus starts focused (not one that changes things for good, which may come first).
    const f = buttons.findIndex((b) => b.focus);
    if (f >= 0) { const el = box.querySelector(`[data-x="b${f}"]`); if (el) el.focus(); }
    new MutationObserver((m, o) => { if (!box.isConnected) { o.disconnect(); res(picked); } }).observe(document.body, { childList: true });
  });
}
async function beforePlay(id) {
  const title = saveShareTitle(id);
  if (!title || !saveShareOn(title)) return true;
  let offer;
  try { offer = await invoke('saves_share', { id, selection: null }); } catch (e) { fail(e); return true; }
  if (!offer) return true;
  const current = offer.destinationWhen == null ? t('No save yet') : whenText(offer.destinationWhen);
  const newer = whenText(offer.sourceWhen);
  const compatibility = t('Copy only if both versions support the same save format.');
  const picked = await ask(tf('Use the newer save from {name}?', { name: offer.name }),
    `<div class="pick-two"><div class="pick-card"><b>${esc(t('This version'))}</b><span>${esc(current)}</span></div><div class="pick-card"><b>${esc(offer.name)}</b><span>${esc(newer)}</span></div></div><p>${esc(compatibility)} ${esc(t('If you copy it, the current save is backed up first.'))}</p>`,
    [{ label: t('Keep saves separate'), sub: current, v: 'keep', focus: true },
      { label: t('Copy the newer save'), sub: `${newer} · ${compatibility}`, v: 'copy', main: true },
      { label: t('Turn off sharing'), v: 'off', last: true }]);
  if (picked == null) return false;
  if (picked === 'off' && saveShareOn(title)) await toggleSaveShare(title);
  if (picked === 'copy') {
    try { await invoke('saves_share', { id, selection: offer.selection }); } catch (e) { fail(e); return false; }
    savesChanged(id);
    toast(t('The newer save was copied.'));
  }
  return true;
}
// ---------- actions ----------
window.accountAct = async (act, el) => {
  const id = el.dataset.id;
  switch (act) {
    case 'saves-share': {
      const title = saveShareTitle(id);
      if (title) await toggleSaveShare(title);
      return refreshGame();
    }
    case 'saves-now': {
      el.disabled = true;
      try { const c = await invoke('saves_backup', { id }); toast(c ? t('Backed up.') : t('Nothing changed since the last copy.')); } catch (e) { fail(e); }
      if (S.view === 'saves') { el.disabled = false; return loadSavesAll(); }
      return loadSaves(id);
    }
    case 'saves-game': closeMenu(); S.nextTab = 'saves'; return go('game', id, el.querySelector('.slot-art'));
    case 'saves-root-open': return invoke('saves_open_root').catch(fail);
    case 'saves-root-pick': case 'saves-root-reset': {
      let path = null;
      if (act === 'saves-root-pick') {
        const p = await pickFile({ title: t('A folder for the copies of your saves'), directory: true }).catch(fail);
        if (!p) return;
        path = typeof p === 'string' ? p : p.path;
      }
      el.disabled = true;
      let r;
      try { r = await invoke('saves_set_root', { path }); } catch (e) { el.disabled = false; return fail(e); }
      S.settings.save_dir = r.custom ? r.path : null;
      toast(!r.custom ? t('Copies of your saves are kept with each game again.') : r.moved ? tn(r.moved, 'One game\'s copies moved there. New ones go there too.', '{n} games\' copies moved there. New ones go there too.') : t('New copies of your saves go there from now on.'));
      return loadSavesAll();
    }
    case 'saves-more': S.savesMore.add(id); return refreshGame();
    case 'saves-less': S.savesMore.delete(id); return refreshGame();
    case 'saves-open': return invoke('saves_open', { id }).catch(fail);
    case 'saves-open-backups': return invoke('saves_open_backups', { id }).catch(fail);
    case 'saves-place': {
      // The player knows better (a game that saves somewhere else): their folder from now on.
      const p = await pickFile({ title: t('The folder where the game keeps its saves'), directory: true }).catch(fail);
      if (!p) return;
      try { S.library[id] = await invoke('saves_set_place', { id, path: typeof p === 'string' ? p : p.path }); } catch (e) { return fail(e); }
      toast(t('Saved. Local backups use that folder now.'));
      return loadSaves(id);
    }
    case 'saves-place-add': {
      const p = await pickFile({ title: t('Another folder where the game keeps its saves'), directory: true }).catch(fail);
      if (!p) return;
      try { S.library[id] = await invoke('saves_add_place', { id, path: typeof p === 'string' ? p : p.path }); } catch (e) { return fail(e); }
      toast(t('Added. Local backups cover that folder too.'));
      return loadSaves(id);
    }
    case 'saves-place-remove': try { S.library[id] = await invoke('saves_remove_place', { id, template: el.dataset.t || '' }); } catch (e) { return fail(e); } return loadSaves(id);
    case 'saves-restore': {
      const v = await ask(t('Restore this save?'), `<p>${esc(t('The game goes back to this save. What\'s there now is kept as a copy first, so you can switch back.'))}</p>`,
        [{ label: t('Cancel'), v: null }, { label: t('Restore'), v: 'yes', main: true }]);
      if (v !== 'yes') return;
      try { await invoke('saves_restore', { id, name: el.dataset.name || null, v: el.dataset.v || null }); toast(t('That save is back in place.')); } catch (e) { fail(e); }
      return loadSaves(id);
    }
  }
  return null;
};

T.event.listen('saves', ({ payload }) => { if (S.view === 'saves') loadSavesAll(); if (payload && payload.id) { delete S.saves[payload.id]; loadSaveStatus(payload.id); if (S.view === 'game' && S.arg === payload.id && S.tab === 'saves') loadSaves(payload.id); } });
// Who's signed in: what's remembered first, then the website's answer.
