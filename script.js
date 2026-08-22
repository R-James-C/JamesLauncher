/* ============================================================
   YOUR SONGS — this is the only part you should need to edit.

   Your files live like this:
     Music/<Artist>/<Song Title>.mp3
     Covers/<Artist>/<Song Title>.png

   So for each song, just give the title and artist EXACTLY as
   they're spelled in your folders/filenames — the player builds
   the file paths for you below. To add a new song, copy a line
   and change the title/artist.
   ============================================================ */
const SONGS = [
  { title: "MUTT", artist: "Leon Thomas" },
   { title: "Earrings", artist: "Malcolm Todd" },

  // { title: "SONG TITLE", artist: "ARTIST NAME" },
];

/* Folder names, in case you ever rename them */
const MUSIC_FOLDER = "Music";
const COVERS_FOLDER = "Covers";

/* File extensions your files use. Change if yours differ
   (e.g. some covers might be .jpg instead of .png). */
const AUDIO_EXT = "mp3";
const COVER_EXT = "png";

/* Builds "Music/Leon Thomas/MUTT.mp3" style paths, safely
   encoding spaces/special characters in folder & file names. */
function buildPath(folder, artist, title, ext){
  const parts = [folder, artist, `${title}.${ext}`];
  return parts.map(p => encodeURIComponent(p)).join('/');
}

SONGS.forEach(song => {
  song.src = buildPath(MUSIC_FOLDER, song.artist, song.title, AUDIO_EXT);
  song.cover = buildPath(COVERS_FOLDER, song.artist, song.title, COVER_EXT);
  song.duration = null;
});

/* ============================================================
   Player logic — no need to touch anything below this line
   ============================================================ */
const audio = document.getElementById('audio');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const eq = document.getElementById('eq');
const bar = document.getElementById('bar');
const barFill = document.getElementById('barFill');
const curTimeEl = document.getElementById('curTime');
const durTimeEl = document.getElementById('durTime');
const volume = document.getElementById('volume');
const statusEl = document.getElementById('status');
const trackList = document.getElementById('trackList');
const libraryList = document.getElementById('libraryList');
const playlistNavList = document.getElementById('playlistNavList');
const headerCover = document.getElementById('headerCover');
const playlistEyebrow = document.getElementById('playlistEyebrow');
const playlistTitleEl = document.getElementById('playlistTitle');
const playlistMeta = document.getElementById('playlistMeta');
const deletePlaylistBtn = document.getElementById('deletePlaylistBtn');
const pbCover = document.getElementById('pbCover');
const pbTitle = document.getElementById('pbTitle');
const pbArtist = document.getElementById('pbArtist');
const bigPlayBtn = document.getElementById('bigPlayBtn');
const customColorInput = document.getElementById('customColorInput');
const customDot = document.getElementById('customDot');
const navHome = document.getElementById('navHome');

const ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
const ICON_PAUSE = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';
const ICON_MENU = '<circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/>';

const FALLBACK_COVER = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#12181f"/><circle cx="100" cy="100" r="34" fill="none" stroke="#2f80ed" stroke-width="6"/><circle cx="100" cy="100" r="6" fill="#2f80ed"/></svg>'
);

/* ---------- persistence keys ---------- */
const LS_MODE = 'sneakPlayer:mode';
const LS_ACCENT = 'sneakPlayer:accent';
const LS_CUSTOM = 'sneakPlayer:customColor';
const LS_PLAYLISTS = 'sneakPlayer:playlists';

/* ---------- state ---------- */
let current = 0;                                   // absolute index into SONGS
let activeQueue = SONGS.map((_, i) => i);           // absolute indices for the list currently shown
let activeView = { type: 'library' };               // { type:'library' } | { type:'playlist', id }
let playlists = loadPlaylists();
let openMenuEl = null;
let statusTimer = null;

function formatTime(s){
  if(!isFinite(s) || s === null) return "--:--";
  const m = Math.floor(s/60);
  const sec = Math.floor(s%60).toString().padStart(2,'0');
  return m + ":" + sec;
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function showStatus(msg){
  statusEl.textContent = msg;
  statusEl.classList.add('visible');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => statusEl.classList.remove('visible'), 5000);
}

/* ============================================================
   PLAYLISTS — stored in localStorage as [{id, name, indices}]
   ============================================================ */
function loadPlaylists(){
  try{
    const raw = localStorage.getItem(LS_PLAYLISTS);
    if(!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }catch(e){
    return [];
  }
}

function savePlaylists(){
  try{
    localStorage.setItem(LS_PLAYLISTS, JSON.stringify(playlists));
  }catch(e){
    showStatus("Couldn't save playlists — your browser storage may be full or disabled.");
  }
}

function genId(){
  return 'pl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function createPlaylist(name){
  const pl = { id: genId(), name: name || 'New Playlist', indices: [] };
  playlists.push(pl);
  savePlaylists();
  renderPlaylistNav();
  return pl;
}

function createPlaylistPrompt(){
  const name = prompt('Playlist name:');
  if(!name || !name.trim()) return;
  const pl = createPlaylist(name.trim());
  showPlaylist(pl.id);
}

function deletePlaylist(id, evt){
  if(evt) evt.stopPropagation();
  const pl = playlists.find(p => p.id === id);
  if(!pl) return;
  if(!confirm(`Delete playlist "${pl.name}"? This can't be undone.`)) return;
  playlists = playlists.filter(p => p.id !== id);
  savePlaylists();
  renderPlaylistNav();
  if(activeView.type === 'playlist' && activeView.id === id){
    showLibrary();
  }
}

function toggleSongInPlaylist(plId, songIndex){
  const pl = playlists.find(p => p.id === plId);
  if(!pl) return;
  const idx = pl.indices.indexOf(songIndex);
  if(idx > -1) pl.indices.splice(idx, 1);
  else pl.indices.push(songIndex);
  savePlaylists();
  renderPlaylistNav();
  if(activeView.type === 'playlist' && activeView.id === plId){
    activeQueue = pl.indices.slice();
    renderList();
    renderHeader();
    updateTransportState();
  }
}

function renderPlaylistNav(){
  playlistNavList.innerHTML = "";
  if(playlists.length === 0){
    playlistNavList.innerHTML = '<div class="playlist-empty-hint">None yet — create one below, or use the ⋮ menu on any song.</div>';
    return;
  }
  playlists.forEach(pl => {
    const isActive = activeView.type === 'playlist' && activeView.id === pl.id;
    const item = document.createElement('div');
    item.className = 'playlist-nav-item' + (isActive ? ' active' : '');
    item.onclick = () => showPlaylist(pl.id);
    item.innerHTML = `
      <span class="pl-name">${escapeHtml(pl.name)}</span>
      <span class="pl-count">${pl.indices.length}</span>
      <button class="playlist-del" title="Delete playlist">×</button>
    `;
    item.querySelector('.playlist-del').addEventListener('click', (e) => deletePlaylist(pl.id, e));
    playlistNavList.appendChild(item);
  });
}

/* ---------- track "add to playlist" popover ---------- */
function openTrackMenu(evt, songIndex){
  evt.stopPropagation();
  closeTrackMenu();
  const btn = evt.currentTarget;
  const rect = btn.getBoundingClientRect();

  const itemsHtml = playlists.length
    ? playlists.map(p => `
        <label class="track-menu-item">
          <input type="checkbox" data-pl="${p.id}" ${p.indices.includes(songIndex) ? 'checked' : ''}>
          <span>${escapeHtml(p.name)}</span>
        </label>`).join('')
    : `<div class="track-menu-empty">No playlists yet</div>`;

  const menu = document.createElement('div');
  menu.className = 'track-menu';
  menu.innerHTML = `
    <div class="track-menu-heading">Add to playlist</div>
    ${itemsHtml}
    <div class="track-menu-new">
      <input type="text" placeholder="New playlist" id="trackMenuNewName">
      <button id="trackMenuNewBtn">Add</button>
    </div>
  `;
  document.body.appendChild(menu);

  const menuRect = menu.getBoundingClientRect();
  let top = rect.bottom + 4;
  let left = rect.right - menuRect.width;
  if(left < 8) left = 8;
  if(top + menuRect.height > window.innerHeight - 8) top = rect.top - menuRect.height - 4;
  menu.style.top = top + 'px';
  menu.style.left = left + 'px';

  menu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => toggleSongInPlaylist(cb.dataset.pl, songIndex));
  });
  menu.querySelector('#trackMenuNewBtn').addEventListener('click', () => {
    const nameInput = menu.querySelector('#trackMenuNewName');
    const name = nameInput.value.trim();
    if(!name) return;
    const pl = createPlaylist(name);
    pl.indices.push(songIndex);
    savePlaylists();
    renderPlaylistNav();
    closeTrackMenu();
  });

  openMenuEl = menu;
  setTimeout(() => document.addEventListener('click', outsideMenuClick), 0);
}

function outsideMenuClick(e){
  if(openMenuEl && !openMenuEl.contains(e.target)) closeTrackMenu();
}

function closeTrackMenu(){
  if(openMenuEl){
    openMenuEl.remove();
    openMenuEl = null;
    document.removeEventListener('click', outsideMenuClick);
  }
}

/* ============================================================
   VIEWS — library (all songs) vs a specific playlist
   ============================================================ */
function showLibrary(){
  activeView = { type: 'library' };
  activeQueue = SONGS.map((_, i) => i);
  navHome.classList.add('active');
  renderPlaylistNav();
  renderHeader();
  renderList();
  updateTransportState();
}

function showPlaylist(id){
  const pl = playlists.find(p => p.id === id);
  if(!pl) return;
  activeView = { type: 'playlist', id };
  activeQueue = pl.indices.slice();
  navHome.classList.remove('active');
  renderPlaylistNav();
  renderHeader();
  renderList();
  updateTransportState();
}

/* ============================================================
   Rendering
   ============================================================ */
function prefetchDurations(){
  SONGS.forEach((song, i) => {
    const probe = new Audio();
    probe.preload = "metadata";
    probe.addEventListener('loadedmetadata', () => {
      song.duration = probe.duration;
      updateDurationCell(i);
    });
    probe.src = song.src;
  });
}

function updateDurationCell(i){
  document.querySelectorAll(`[data-dur-index="${i}"]`).forEach(cell => {
    cell.textContent = formatTime(SONGS[i].duration);
  });
}

function renderLibrary(){
  libraryList.innerHTML = "";
  SONGS.forEach((song, i) => {
    const item = document.createElement('div');
    item.className = 'library-item' + (i === current ? ' active' : '');
    item.onclick = () => { showLibrary(); loadTrack(i, true); };
    item.innerHTML = `
      <div class="library-thumb"><img src="${song.cover}" onerror="this.src='${FALLBACK_COVER}'"></div>
      <div class="library-text">
        <div class="library-title">${escapeHtml(song.title)}</div>
        <div class="library-artist">${escapeHtml(song.artist)}</div>
      </div>
    `;
    libraryList.appendChild(item);
  });
}

function renderList(){
  trackList.innerHTML = "";
  if(activeQueue.length === 0){
    trackList.innerHTML = activeView.type === 'playlist'
      ? '<div class="empty-state">This playlist is empty — use the ⋮ menu on any song in Home to add one.</div>'
      : '<div class="empty-state">No songs yet — add one at the top of script.js.</div>';
    return;
  }
  activeQueue.forEach((songIndex, pos) => {
    const song = SONGS[songIndex];
    const row = document.createElement('div');
    row.className = 'track-row' + (songIndex === current ? ' active' : '');
    row.onclick = () => loadTrack(songIndex, true);
    row.innerHTML = `
      <div class="track-index">
        <span class="num">${pos + 1}</span>
        <span class="play-glyph"><svg viewBox="0 0 24 24">${ICON_PLAY}</svg></span>
      </div>
      <div class="track-title-cell">
        <div class="track-thumb"><img src="${song.cover}" onerror="this.src='${FALLBACK_COVER}'"></div>
        <div class="track-meta">
          <div class="track-title">${escapeHtml(song.title)}</div>
          <div class="track-subartist">${escapeHtml(song.artist)}</div>
        </div>
      </div>
      <div class="track-artist-cell">${escapeHtml(song.artist)}</div>
      <div class="track-dur" data-dur-index="${songIndex}">${formatTime(song.duration)}</div>
      <button class="track-menu-btn" title="Add to playlist"><svg viewBox="0 0 24 24" fill="currentColor">${ICON_MENU}</svg></button>
    `;
    row.querySelector('.track-menu-btn').addEventListener('click', (e) => openTrackMenu(e, songIndex));
    trackList.appendChild(row);
  });
}

function renderHeader(){
  if(activeView.type === 'playlist'){
    const pl = playlists.find(p => p.id === activeView.id);
    const name = pl ? pl.name : 'Playlist';
    const count = pl ? pl.indices.length : 0;
    playlistEyebrow.textContent = 'Playlist';
    playlistTitleEl.textContent = name;
    playlistMeta.textContent = count === 1 ? '1 song' : `${count} songs`;
    const coverIndex = pl && pl.indices.length ? pl.indices[0] : null;
    headerCover.src = coverIndex !== null ? SONGS[coverIndex].cover : FALLBACK_COVER;
    deletePlaylistBtn.style.display = '';
    deletePlaylistBtn.onclick = () => deletePlaylist(activeView.id);
  } else {
    playlistEyebrow.textContent = 'Playlist';
    playlistTitleEl.textContent = 'Your Music';
    const count = SONGS.length;
    playlistMeta.textContent = count === 1 ? '1 song' : `${count} songs`;
    headerCover.src = SONGS.length ? SONGS[0].cover : FALLBACK_COVER;
    deletePlaylistBtn.style.display = 'none';
  }
  headerCover.onerror = () => headerCover.src = FALLBACK_COVER;
}

/* ============================================================
   Playback
   ============================================================ */
function loadTrack(i, autoplay){
  if(SONGS.length === 0) return;
  current = ((i % SONGS.length) + SONGS.length) % SONGS.length;
  const song = SONGS[current];
  audio.src = song.src;
  pbCover.src = song.cover;
  pbCover.onerror = () => pbCover.src = FALLBACK_COVER;
  pbTitle.textContent = song.title;
  pbArtist.textContent = song.artist;
  renderList();
  renderLibrary();
  if(autoplay){
    audio.play().catch(()=>{});
  }
}

function stepTrack(delta){
  if(activeQueue.length === 0) return;
  let pos = activeQueue.indexOf(current);
  if(pos === -1) pos = 0;
  pos = (pos + delta + activeQueue.length) % activeQueue.length;
  loadTrack(activeQueue[pos], true);
}

function updateTransportState(){
  const disabled = activeQueue.length <= 1;
  prevBtn.disabled = disabled;
  nextBtn.disabled = disabled;
}

function setPlayingUI(isPlaying){
  const icon = document.getElementById('playIcon');
  icon.outerHTML = isPlaying
    ? `<svg id="playIcon" viewBox="0 0 24 24" fill="currentColor">${ICON_PAUSE}</svg>`
    : `<svg id="playIcon" viewBox="0 0 24 24" fill="currentColor">${ICON_PLAY}</svg>`;
  const bigIcon = document.getElementById('bigPlayIcon');
  bigIcon.outerHTML = isPlaying
    ? `<svg id="bigPlayIcon" viewBox="0 0 24 24" fill="currentColor">${ICON_PAUSE}</svg>`
    : `<svg id="bigPlayIcon" viewBox="0 0 24 24" fill="currentColor">${ICON_PLAY}</svg>`;
  eq.classList.toggle('playing', isPlaying);
}

document.getElementById('playBtn').addEventListener('click', () => {
  if(SONGS.length === 0) return;
  if(audio.paused) audio.play().catch(()=>{});
  else audio.pause();
});

bigPlayBtn.addEventListener('click', () => {
  if(SONGS.length === 0) return;
  if(!audio.src) loadTrack(current, true);
  else if(audio.paused) audio.play().catch(()=>{});
  else audio.pause();
});

audio.addEventListener('play', () => setPlayingUI(true));
audio.addEventListener('pause', () => setPlayingUI(false));

audio.addEventListener('timeupdate', () => {
  if(!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  barFill.style.width = pct + "%";
  curTimeEl.textContent = formatTime(audio.currentTime);
});
audio.addEventListener('loadedmetadata', () => {
  durTimeEl.textContent = formatTime(audio.duration);
});
audio.addEventListener('ended', () => {
  if(activeQueue.length > 1) stepTrack(1);
});
audio.addEventListener('error', () => {
  const song = SONGS[current];
  if(song) showStatus(`Couldn't load "${song.title}" — check that ${song.src} exists in your repo.`);
});

bar.addEventListener('click', (e) => {
  if(!audio.duration) return;
  const rect = bar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  audio.currentTime = pct * audio.duration;
});

volume.addEventListener('input', () => { audio.volume = volume.value; });
audio.volume = volume.value;

prevBtn.addEventListener('click', () => stepTrack(-1));
nextBtn.addEventListener('click', () => stepTrack(1));

navHome.addEventListener('click', showLibrary);

/* ============================================================
   THEME — mode (light/dark) and accent (blue/orange/custom)
   are independent, so any accent works in either mode.
   ============================================================ */
function lightenHex(hex, amt){
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function setMode(mode){
  document.documentElement.dataset.mode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.mode === mode);
  });
  try{ localStorage.setItem(LS_MODE, mode); }catch(e){}
}

function setAccent(name, customHex){
  let accent, accentSoft;
  if(name === 'blue'){
    accent = '#2f80ed'; accentSoft = '#9ad4ff';
  } else if(name === 'orange'){
    accent = '#ff7a29'; accentSoft = '#ffb27a';
  } else {
    name = 'custom';
    accent = customHex || customColorInput.value || '#a259ff';
    accentSoft = lightenHex(accent, 90);
    try{ localStorage.setItem(LS_CUSTOM, accent); }catch(e){}
    customColorInput.value = accent;
  }
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-soft', accentSoft);
  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.classList.toggle('selected', el.dataset.accent === name);
  });
  customDot.style.background = name === 'custom' ? accent : (localStorage.getItem(LS_CUSTOM) || '#a259ff');
  try{ localStorage.setItem(LS_ACCENT, name); }catch(e){}
}

customColorInput.addEventListener('input', () => setAccent('custom', customColorInput.value));

/* ============================================================
   init
   ============================================================ */
let savedMode = 'dark';
let savedAccent = 'blue';
let savedCustom = '#a259ff';
try{
  savedMode = localStorage.getItem(LS_MODE) || 'dark';
  savedAccent = localStorage.getItem(LS_ACCENT) || 'blue';
  savedCustom = localStorage.getItem(LS_CUSTOM) || '#a259ff';
}catch(e){}

customColorInput.value = savedCustom;
setMode(savedMode);
setAccent(savedAccent, savedCustom);

showLibrary();
prefetchDurations();
if(SONGS.length > 0) loadTrack(0, false);
