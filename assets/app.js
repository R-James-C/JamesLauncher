/* =========================================================
   James Launcher — shared app-page behavior
   Included by every /apps/<name>/index.html page
   ========================================================= */

function jlPlayLaunchSequence(onDone){
  const overlay = document.createElement('div');
  overlay.className = 'launch-overlay';
  overlay.innerHTML = `
    <div class="glyph">JL</div>
    <div class="launch-log" id="launch-log">Opening</div>
    <div class="launch-bar"><div class="fill" id="launch-fill"></div></div>
  `;
  document.body.appendChild(overlay);
  const log = overlay.querySelector('#launch-log');
  const fill = overlay.querySelector('#launch-fill');
  const steps = [
    ['Opening', 20],
    ['Connecting', 55],
    ['Almost there', 85],
    ['<span class="accent">Ready</span>', 100]
  ];
  let i = 0;
  const tick = () => {
    if(i >= steps.length){
      setTimeout(() => { overlay.remove(); onDone(); }, 160);
      return;
    }
    log.innerHTML = steps[i][0];
    fill.style.width = steps[i][1] + '%';
    i++;
    setTimeout(tick, 240);
  };
  tick();
}

function jlInitAppPage(config){
  // config: { name, url, appId }
  const detailView = document.getElementById('detail-view');
  const runView = document.getElementById('run-view');
  const launchBtn = document.getElementById('launch-btn');
  const exitBtn = document.getElementById('exit-btn');
  const frameWrap = document.getElementById('frame-wrap');
  const fallback = document.getElementById('run-fallback');
  const tryEmbedBtn = document.getElementById('fb-try-embed-btn');
  const openBtn = document.getElementById('fb-open-btn');

  function resetRunView(){
    // Always start on the fallback card — never show a raw blocked iframe by surprise.
    if(fallback) fallback.style.display = 'flex';
    const existingFrame = document.getElementById('run-iframe');
    if(existingFrame) existingFrame.remove();
  }

  function mountIframe(){
    if(fallback) fallback.style.display = 'none';
    let iframe = document.getElementById('run-iframe');
    if(!iframe){
      iframe = document.createElement('iframe');
      iframe.id = 'run-iframe';
      iframe.setAttribute('allow', 'autoplay; fullscreen; gamepad; xr-spatial-tracking');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-pointer-lock');
      iframe.src = config.url;
      frameWrap.appendChild(iframe);
    }
  }

  function markUsed(){
    try{
      const stamp = new Date().toISOString().slice(0,10);
      localStorage.setItem('jl_lastused_' + config.appId, stamp);
      const label = document.getElementById('last-used-label');
      if(label) label.textContent = 'Last used ' + stamp;
    }catch(e){}
  }

  function enterRun(){
    jlPlayLaunchSequence(() => {
      detailView.style.display = 'none';
      runView.style.display = 'grid';
      resetRunView();
      markUsed();
    });
  }

  if(launchBtn) launchBtn.addEventListener('click', enterRun);
  if(exitBtn){
    exitBtn.addEventListener('click', () => {
      runView.style.display = 'none';
      detailView.style.display = 'block';
    });
  }
  if(openBtn){
    openBtn.addEventListener('click', () => window.open(config.url, '_blank', 'noopener'));
  }
  if(tryEmbedBtn){
    tryEmbedBtn.addEventListener('click', mountIframe);
  }

  const fsBtn = document.getElementById('fullscreen-btn');
  if(fsBtn){
    fsBtn.addEventListener('click', () => {
      if(document.fullscreenElement){
        document.exitFullscreen();
      }else if(frameWrap.requestFullscreen){
        frameWrap.requestFullscreen().catch(() => {});
      }
    });
  }

  const volSlider = document.getElementById('volume-slider');
  if(volSlider){
    const label = document.getElementById('volume-label');
    volSlider.addEventListener('input', () => {
      label.textContent = (volSlider.value == 0 ? '\u{1F507}' : '\u{1F50A}') + ' ' + volSlider.value + '%';
    });
  }

  // Restore "last used" label on load
  try{
    const stamp = localStorage.getItem('jl_lastused_' + config.appId);
    const label = document.getElementById('last-used-label');
    if(label && stamp) label.textContent = 'Last used ' + stamp;
  }catch(e){}
}
