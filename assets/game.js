// Simple typing game engine (visual/logic only)
(() => {
  const wordBanks = {
    easy: "the quick brown fox jumps over the lazy dog this is practice typing".split(' '),
    medium: ("learning to type quickly requires practice focus stamina and accurate finger placement words will flow into paragraphs").split(' '),
    hard: ("accelerated proficiency emerges via deliberate practice dense vocabulary varied punctuation and sustained concentration sessions").split(' ')
  };

  // DOM
  const modeEl = document.getElementById('mode');
  const levelEl = document.getElementById('customLevel');
  const levelVal = document.getElementById('levelVal');
  const customLabel = document.getElementById('customLabel');
  const customInputEl = document.getElementById('customInput');
  const customInputLabel = document.getElementById('customInputLabel');
  const timerInput = document.getElementById('timerInput');
  const generateBtn = document.getElementById('generateBtn');
  const resetBtn = document.getElementById('resetBtn');
  const targetText = document.getElementById('targetText');
  const inputArea = document.getElementById('inputArea'); // capture box (hidden or visible)
  const timeLeftEl = document.getElementById('timeLeft');
  const errorsEl = document.getElementById('errors');
  const accuracyEl = document.getElementById('accuracy');
  const wpsEl = document.getElementById('wps');
  const resultModal = document.getElementById('resultModal');
  const closeModal = document.getElementById('closeModal');
  const replayBtn = document.getElementById('replay');

  const resTime = document.getElementById('resTime');
  const resWords = document.getElementById('resWords');
  const resErrors = document.getElementById('resErrors');
  const resAcc = document.getElementById('resAcc');
  const resWps = document.getElementById('resWps');
  const resRating = document.getElementById('resRating');

  let timer = null;
  let totalTime = 0;
  let startTime = null;

  // state
  let units = [];         // array of units (words or sentences or words for hard)
  let isCompound = false; // true => hard mode continuous word flow (many words shown at once)
  let currentIndex = 0;
  let totalTypedChars = 0;
  let totalErrorsCount = 0;

  levelEl && levelEl.addEventListener('input', ()=> { levelVal.textContent = levelEl.value; });

  modeEl && modeEl.addEventListener('change', () => {
    if (modeEl.value === 'custom') {
      customLabel.style.display = 'inline-block';
      if (customInputLabel) customInputLabel.style.display = 'block';
    }
    else {
      customLabel.style.display = 'none';
      if (customInputLabel) customInputLabel.style.display = 'none';
    }
  });

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Prevent copy/paste/contextmenu on the prompt to avoid cheating
  if (targetText) {
    ['copy','cut','paste'].forEach(ev => targetText.addEventListener(ev, e => e.preventDefault()));
    targetText.addEventListener('contextmenu', e => e.preventDefault());
  }

  function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  // Generate units depending on mode:
  // easy -> array of single words (one word shown at a time)
  // medium -> array of sentences (one sentence shown at a time)
  // hard -> array of words (continuous paragraph shown at once)
  function generateUnits(mode, customLevel = 5, totalUnits = 80) {
    const unitsOut = [];
    // If custom mode and user provided input, use that as the source.
    if (mode === 'custom') {
      const raw = (customInputEl && customInputEl.value) ? String(customInputEl.value) : '';
      const tokens = raw.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
      // further split on whitespace to get words
      const wordsPool = tokens.length ? tokens.join(' ').split(/\s+/).map(s=>s.trim()).filter(Boolean) : [];
      // map customLevel to easy/medium/hard behavior: 1-3 easy, 4-7 medium, 8-10 hard
      if (customLevel <= 3) {
        // easy: single words (one at a time). If user supplied sentences, break into words.
        if (wordsPool.length === 0) {
          // fallback to default bank
          for (let i=0;i<totalUnits;i++) unitsOut.push(pickRandom(wordBanks.easy));
        } else {
          for (let i=0;i<totalUnits;i++) unitsOut.push(pickRandom(wordsPool));
        }
        isCompound = false;
        return unitsOut;
      } else if (customLevel <= 7) {
        // medium: build short sentences (5-10 words) using user's words if available
        const sentenceCount = Math.max(6, Math.floor(totalUnits/10));
        const pool = wordsPool.length ? wordsPool : wordBanks.medium.concat(wordBanks.easy);
        for (let i=0;i<sentenceCount;i++){
          const len = 5 + Math.floor(Math.random()*6); // 5..10 words
          const words = [];
          for (let j=0;j<len;j++) words.push(pickRandom(pool));
          let sentence = words.join(' ');
          sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
          unitsOut.push(sentence);
        }
        isCompound = false;
        return unitsOut;
      } else {
        // hard: continuous paragraph (many words shown at once)
        const pool = wordsPool.length ? wordsPool : wordBanks.hard.concat(wordBanks.medium, wordBanks.easy);
        const desired = Math.max(80, totalUnits);
        const w = [];
        for (let i=0;i<desired;i++) w.push(pickRandom(pool));
        let s = w.join(' ');
        s = s.replace(/ (\w{5,}) /g, (m,p)=> Math.random() < 0.12 ? (p+', ') : (' '+p+' '));
        s = s.charAt(0).toUpperCase() + s.slice(1) + '.';
        unitsOut.push(...s.trim().split(/\s+/));
        isCompound = true;
        return unitsOut;
      }
    }
    if (mode === 'easy') {
      for (let i=0;i<totalUnits;i++){
        const bank = Math.random() < 0.2 ? wordBanks.medium : wordBanks.easy;
        unitsOut.push(pickRandom(bank));
      }
      isCompound = false;
    } else if (mode === 'medium') {
      for (let i=0;i<Math.max(8,totalUnits/8);i++){
        const len = 6 + Math.floor(Math.random()*7); // 6..12 words
        const words = [];
        for (let j=0;j<len;j++){
          const bank = Math.random() < 0.35 ? wordBanks.hard : wordBanks.medium;
          words.push(pickRandom(bank));
        }
        let sentence = words.join(' ');
        sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
        unitsOut.push(sentence);
      }
      isCompound = false;
    } else { // hard (continuous paragraph - many words)
      const bank = wordBanks.hard.concat(wordBanks.medium, wordBanks.easy);
      const desired = Math.max(80, totalUnits);
      const w = [];
      for (let i=0;i<desired;i++) w.push(pickRandom(bank));
      // create a paragraph string then split into words (preserve punctuation sparsely)
      let s = w.join(' ');
      s = s.replace(/ (\w{5,}) /g, (m,p)=> Math.random() < 0.12 ? (p+', ') : (' '+p+' '));
      s = s.charAt(0).toUpperCase() + s.slice(1) + '.';
      unitsOut.push(...s.trim().split(/\s+/));
      isCompound = true;
    }
    return unitsOut;
  }

  function renderCurrentView() {
    if (!targetText) return;
    targetText.innerHTML = '';
    if (isCompound) {
      // show many words inline, each as .word
      for (let i=0;i<units.length;i++){
        const w = units[i];
        const span = document.createElement('span');
        span.className = 'word';
        span.dataset.index = i;
        span.textContent = w;
        targetText.appendChild(span);
        const sp = document.createElement('span');
        sp.className = 'wspace';
        sp.textContent = ' ';
        targetText.appendChild(sp);
      }
      highlightCurrentCompound();
    } else {
      // show only current unit (word or sentence)
      const cur = units[currentIndex] || '';
      const span = document.createElement('span');
      span.className = 'word current';
      span.dataset.index = currentIndex;
      span.textContent = cur;
      targetText.appendChild(span);
    }
  }

  function highlightCurrentCompound(){
    const spans = targetText.querySelectorAll('.word');
    spans.forEach(s => s.classList.remove('current'));
    const cur = targetText.querySelector(`.word[data-index="${currentIndex}"]`);
    if(cur) cur.classList.add('current');
    const currentEl = targetText.querySelector('.word.current');
    if(currentEl) currentEl.scrollIntoView({block:'center', inline:'nearest', behavior:'smooth'});
  }

  function removeCurrentUnit(markIncorrect = false) {
    if (isCompound) {
      const el = targetText.querySelector(`.word[data-index="${currentIndex}"]`);
      if (el) {
        el.classList.add('removed');
        el.textContent = '';
      }
      currentIndex++;
      highlightCurrentCompound();
    } else {
      // for single-unit modes, advance to next unit and render it
      currentIndex++;
      if (currentIndex >= units.length) {
        // finished
        clearInterval(timer);
        endGame();
        return;
      }
      renderCurrentView();
    }
  }

  function updateStatusDisplay(){
    const removedWords = targetText.querySelectorAll('.word.removed').length;
    const secondsElapsed = Math.max(1, Math.floor((Date.now() - startTime)/1000) || 1);
    const wps = (removedWords / secondsElapsed) || 0;
    wpsEl.textContent = wps.toFixed(2);
    errorsEl.textContent = totalErrorsCount;
    const acc = totalTypedChars ? Math.round(((totalTypedChars - totalErrorsCount)/totalTypedChars)*100) : 100;
    accuracyEl.textContent = acc + '%';
  }

  function endGame() {
    const removedWords = targetText.querySelectorAll('.word.removed').length;
    const seconds = Math.max(1, Math.floor((Date.now() - startTime)/1000));
    const wps = removedWords / seconds;

    const errors = totalErrorsCount;
    const typedChars = totalTypedChars;
    const correctChars = Math.max(0, typedChars - errors);
    const acc = typedChars ? Math.round((correctChars / typedChars) * 100) : 100;

    const mode = (modeEl && modeEl.value) ? modeEl.value : 'medium';
    let difficultyMultiplier = 1.0;
    if (mode === 'easy') difficultyMultiplier = 0.92;
    else if (mode === 'medium') difficultyMultiplier = 1.00;
    else if (mode === 'hard') difficultyMultiplier = 1.12;
    else if (mode === 'custom') {
      const lvl = (levelEl && Number(levelEl.value)) ? Number(levelEl.value) : 5;
      difficultyMultiplier = 1 + ((lvl - 5) * 0.03);
      difficultyMultiplier = Math.max(0.85, Math.min(1.35, difficultyMultiplier));
    }

    const targetWpsByMode = { easy: 1.6, medium: 2.6, hard: 4.5, custom: 3.5 };
    const targetWps = targetWpsByMode[mode] || 3.2;
    const normalizedWps = Math.max(0, Math.min(1, wps / targetWps));

    const accContribution = acc;
    const speedContribution = normalizedWps * 100;
    const rawScore = (accContribution * 0.75) + (speedContribution * 0.25);
    const score = rawScore * difficultyMultiplier;

    let rating = 'Needs Practice';
    if (score >= 92 && acc >= 96) rating = 'Platinum';
    else if (score >= 80 && acc >= 92) rating = 'Gold';
    else if (score >= 68 && acc >= 88) rating = 'Silver';
    else if (score >= 50 && acc >= 80) rating = 'Bronze';
    else rating = 'Needs Practice';

    resTime.textContent = seconds;
    resWords.textContent = removedWords;
    resErrors.textContent = errors;
    resAcc.textContent = acc + '%';
    resWps.textContent = wps.toFixed(2);
    resRating.textContent = rating + ' • ' + Math.round(score) + ' pts';

    resultModal.classList.remove('hidden');
  }

  // disable backspace/delete globally (prevent navigation/edit)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      return;
    }
  });

  // handle input from inputArea (typed characters). inputArea may be visible or hidden.
  function onInput() {
    if (!units.length) return;
    const curUnit = units[currentIndex] || '';
    const val = inputArea.value.replace(/\r\n/g,'').replace(/\n/g,'');
    const added = val.length - (inputArea._lastLen || 0);
    if (added > 0) totalTypedChars += added;
    inputArea._lastLen = val.length;

    // compare character-by-character up to unit length
    const lenTarget = curUnit.length;
    const attempt = val.slice(0, lenTarget);
    // count char mismatches up to attempt length
    let errs = 0;
    for (let i=0;i<attempt.length;i++){
      if (attempt[i] !== curUnit[i]) errs++;
    }

    // If user has typed at least the required characters for this unit -> remove/advance
    if (val.length >= lenTarget) {
      // record errors
      totalErrorsCount += errs + Math.max(0, val.length - lenTarget); // extra chars beyond target count as errors
      // remove unit from view to avoid confusion (per request)
      removeCurrentUnit(errs > 0);
      // reset input for next unit
      inputArea.value = '';
      inputArea._lastLen = 0;
      updateStatusDisplay();
      // if finished in compound mode all words exhausted -> endGame will trigger in removeCurrentUnit or timer tick
      if (!isCompound && currentIndex < units.length) {
        // show next unit immediately
        renderCurrentView();
      }
    } else {
      // live feedback: highlight characters inside current word/sentence
      const curSpan = targetText.querySelector(`.word[data-index="${currentIndex}"]`) || targetText.querySelector('.word.current');
      if (curSpan) {
        const expected = curUnit;
        let html = '';
        for (let i=0;i<expected.length;i++){
          const ch = expected[i] === ' ' ? '\u00A0' : escapeHtml(expected[i]);
          const typedCh = val[i];
          let cls = '';
          if (typeof typedCh === 'undefined') cls = '';
          else cls = (typedCh === expected[i]) ? ' char-ok' : ' char-wrong';
          html += `<span class="char${cls}">${ch}</span>`;
        }
        curSpan.innerHTML = html;
      }
    }
  }

  generateBtn && generateBtn.addEventListener('click', () => {
    // reset
    clearInterval(timer);
    startTime = null;
    totalTypedChars = 0;
    totalErrorsCount = 0;
    currentIndex = 0;
    units = [];

  const mode = modeEl ? modeEl.value : 'medium';
    const customLevel = levelEl ? Number(levelEl.value) : 5;
    const seconds = Math.max(10, Math.min(600, Number(timerInput.value) || 60));
  units = generateUnits(mode, customLevel, 120);
    renderCurrentView();
    if (inputArea) { inputArea.value = ''; inputArea._lastLen = 0; inputArea.focus(); }
    // start timer
    totalTime = seconds;
    timeLeftEl.textContent = seconds;
    startTime = Date.now();
    timer = setInterval(()=>{
      const left = Math.max(0, totalTime - Math.floor((Date.now() - startTime)/1000));
      timeLeftEl.textContent = left;
      updateStatusDisplay();
      if (left <= 0) {
        clearInterval(timer);
        endGame();
      }
    },250);
  });

  resetBtn && resetBtn.addEventListener('click', () => {
    clearInterval(timer);
    timer = null;
    startTime = null;
    totalTypedChars = 0;
    totalErrorsCount = 0;
    currentIndex = 0;
    units = [];
    if (inputArea) { inputArea.value = ''; inputArea._lastLen = 0; }
    if (targetText) targetText.innerHTML = '';
    timeLeftEl && (timeLeftEl.textContent = '0');
    errorsEl && (errorsEl.textContent = '0');
    accuracyEl && (accuracyEl.textContent = '100%');
    wpsEl && (wpsEl.textContent = '0.00');
    if (resultModal) resultModal.classList.add('hidden');
  });

  inputArea && inputArea.addEventListener('input', onInput);

  closeModal && closeModal.addEventListener('click', ()=> resultModal.classList.add('hidden'));
  replayBtn && replayBtn.addEventListener('click', ()=> { resultModal.classList.add('hidden'); generateBtn && generateBtn.click(); });

  // initial clear
  if (targetText) targetText.innerHTML = '';
})();