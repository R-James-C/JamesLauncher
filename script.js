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
  { title: "MUTT", artist: "Lean Thomas" },

  // { title: "SONG TITLE", artist: "ARTIST NAME" },
];

/* Folder names, in case you ever rename them */
const MUSIC_FOLDER = "Music";
const COVERS_FOLDER = "Covers";

/* File extensions your files use. Change if yours differ
   (e.g. some covers might be .jpg instead of .png). */
const AUDIO_EXT = "mp3";
const COVER_EXT = "png";

/* Builds "Music/Lean Thomas/MUTT.mp3" style paths, safely
   encoding spaces/special characters in folder & file names. */
function buildPath(folder, artist, title, ext){
  const parts = [folder, artist, `${title}.${ext}`];
  return parts.map(p => encodeURIComponent(p)).join('/');
}

SONGS.forEach(song => {
  song.src = buildPath(MUSIC_FOLDER, song.artist, song.title, AUDIO_EXT);
  song.cover = buildPath(COVERS_FOLDER, song.artist, song.title, COVER_EXT);
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
const heroCover = document.getElementById('heroCover');
const heroTitle = document.getElementById('heroTitle');
const heroArtist = document.getElementById('heroArtist');

const ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
const ICON_PAUSE = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';

const FALLBACK_COVER = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#12181f"/><circle cx="100" cy="100" r="34" fill="none" stroke="#2f80ed" stroke-width="6"/><circle cx="100" cy="100" r="6" fill="#2f80ed"/></svg>'
);

let current = 0;

function formatTime(s){
  if(!isFinite(s)) return "0:00";
  const m = Math.floor(s/60);
  const sec = Math.floor(s%60).toString().padStart(2,'0');
  return m + ":" + sec;
}

function renderList(){
  trackList.innerHTML = "";
  if(SONGS.length === 0){
    trackList.innerHTML = '<div class="status">No songs yet — add one at the top of script.js.</div>';
    return;
  }
  SONGS.forEach((song, i) => {
    const row = document.createElement('div');
    row.className = 'track-row' + (i === current ? ' active' : '');
    row.onclick = () => loadTrack(i, true);
    row.innerHTML = `
      <div class="track-index">${i+1}</div>
      <div class="track-thumb"><img src="${song.cover}" onerror="this.src='${FALLBACK_COVER}'"></div>
      <div class="track-meta">
        <div class="track-title">${song.title}</div>
        <div class="track-artist">${song.artist}</div>
      </div>
      <div class="track-dur"></div>
    `;
    trackList.appendChild(row);
  });
}

function loadTrack(i, autoplay){
  if(SONGS.length === 0) return;
  current = (i + SONGS.length) % SONGS.length;
  const song = SONGS[current];
  audio.src = song.src;
  heroCover.src = song.cover;
  heroCover.onerror = () => heroCover.src = FALLBACK_COVER;
  heroTitle.textContent = song.title;
  heroArtist.textContent = song.artist;
  statusEl.textContent = "";
  statusEl.classList.remove('error');
  renderList();
  if(autoplay){
    audio.play().catch(()=>{});
  }
}

function setPlayingUI(isPlaying){
  const icon = document.getElementById('playIcon');
  icon.outerHTML = isPlaying
    ? `<svg id="playIcon" viewBox="0 0 24 24" fill="currentColor">${ICON_PAUSE}</svg>`
    : `<svg id="playIcon" viewBox="0 0 24 24" fill="currentColor">${ICON_PLAY}</svg>`;
  eq.classList.toggle('playing', isPlaying);
}

document.getElementById('playBtn').addEventListener('click', () => {
  if(SONGS.length === 0) return;
  if(audio.paused) audio.play().catch(()=>{});
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
  if(SONGS.length > 1) loadTrack(current + 1, true);
});
audio.addEventListener('error', () => {
  const song = SONGS[current];
  statusEl.textContent = song
    ? `Couldn't load "${song.title}" — check that ${song.src} exists in your repo.`
    : "Couldn't load this song.";
  statusEl.classList.add('error');
});

bar.addEventListener('click', (e) => {
  if(!audio.duration) return;
  const rect = bar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  audio.currentTime = pct * audio.duration;
});

volume.addEventListener('input', () => { audio.volume = volume.value; });
audio.volume = volume.value;

prevBtn.addEventListener('click', () => loadTrack(current - 1, true));
nextBtn.addEventListener('click', () => loadTrack(current + 1, true));
prevBtn.disabled = SONGS.length <= 1;
nextBtn.disabled = SONGS.length <= 1;

function setTheme(name){
  document.documentElement.dataset.theme = name;
  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.classList.toggle('selected', el.dataset.theme === name);
  });
}

// init
renderList();
if(SONGS.length > 0) loadTrack(0, false);
