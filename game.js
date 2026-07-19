/* ========================================
   WPM Strikes Back — Game Logic
   ======================================== */
(() => {
  'use strict';

  // ========== WORD LIST ==========
  const WORDS = [
    'the','be','to','of','and','that','have','with','this','will',
    'from','they','say','her','she','or','an','my','one','all',
    'would','there','their','what','so','up','out','if','about','who',
    'get','which','go','me','when','make','can','like','time','no',
    'just','him','know','take','people','into','year','your','good','some',
    'could','them','see','other','than','then','now','look','only','come',
    'its','over','think','also','back','after','use','two','how','our',
    'work','first','well','way','even','new','want','because','any','day',
    'give','most','find','here','thing','many','right','still','life','long',
    'great','small','world','hand','high','keep','large','part','move','try',
    'never','start','city','run','live','night','man','point','read','last',
    'school','need','light','home','story','help','while','turn','few','left',
    'game','play','might','old','begin','area','side','water','group','carry',
    'state','both','air','book','house','near','line','open','hard','force',
    'river','below','plant','food','face','head','stand','own','page','should',
    'answer','grow','study','learn','change','system','sound','music','power',
    'fight','speed','blast','storm','brave','swift','flame','steel','stone','frost',
    'chaos','blade','guard','clash','crush','drift','flash','glide','hover','lunar',
    'orbit','phase','pulse','surge','vapor','warp','alpha','bravo',
    'delta','sigma','theta','omega','ultra','hyper','turbo','cyber','pixel','voxel',
    'quantum','gravity','rocket','engine','cosmic','nebula','photon','plasma','fusion',
    'vector','matrix','cipher','primal','strike','shield','charge','impact','launch',
    'ignite','escape','shadow','spirit','dragon','knight','legend','mystic','arcane',
    'energy','battle','attack','defend','evade','combo','focus','skill','level','arena'
  ];

  // ========== DOM REFERENCES ==========
  const canvas      = document.getElementById('gameCanvas');
  const ctx         = canvas.getContext('2d');
  const hud         = document.getElementById('hud');
  const hudPoints   = document.getElementById('hudPoints');
  const hudTimer    = document.getElementById('hudTimer');
  const hudWpm      = document.getElementById('hudWpm');
  const wordBox     = document.getElementById('wordBox');
  const wordInner   = document.getElementById('wordInner');
  const startHint   = document.getElementById('startHint');
  const startScr    = document.getElementById('startScreen');
  const resScr      = document.getElementById('resultsScreen');
  const btnStart    = document.getElementById('btnStart');
  const btnReplay   = document.getElementById('btnReplay');
  const btnPause    = document.getElementById('btnPause');
  const btnRestart  = document.getElementById('btnRestart');
  const pauseOverlay= document.getElementById('pauseOverlay');
  const dur30       = document.getElementById('dur30');
  const dur60       = document.getElementById('dur60');
  const flashHit    = document.getElementById('flashHit');
  const flashAttack = document.getElementById('flashAttack');

  // ========== GAME STATE ==========
  let W, H;
  let gameState = 'menu'; // menu | ready | playing | paused | results
  let matchDuration = 30;
  let timeLeft = 30;
  let timerInterval = null;
  let timerStarted = false;

  // Words & typing
  let wordList = [];
  let allChars = [];  // { char, wordIdx, charIdx, state }
  let globalCharIndex = 0;
  let currentWordIdx = 0;
  let totalCharsTyped = 0;
  let totalKeystrokes = 0;
  let correctKeystrokes = 0;
  let wordsCompleted = 0;
  let fightPoints = 0;

  // Characters (positioned in upper area)
  let player   = { x:0, y:0, w:0, h:0, state:'idle', stateTimer:0, hp:100 };
  let opponent  = { x:0, y:0, w:0, h:0, state:'idle', stateTimer:0, hp:100 };

  // Visual effects
  let particles = [];
  let saberClashParticles = [];
  let stars = [];
  let lastTime = 0;


  // ================================================================
  //  LAYOUT & INITIALIZATION
  // ================================================================

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    positionCharacters();
    initStars();
  }
  window.addEventListener('resize', resize);

  function positionCharacters() {
    const charW = Math.min(60, W * 0.07);
    const charH = charW * 2;
    // Characters in upper portion of the screen
    const groundY = H * 0.48;
    const centerX = W / 2;
    const gap = charW * 0.8;

    player.w = charW; player.h = charH;
    player.x = centerX - gap - charW;
    player.y = groundY - charH;

    opponent.w = charW; opponent.h = charH;
    opponent.x = centerX + gap;
    opponent.y = groundY - charH;
  }

  function initStars() {
    stars = [];
    const count = Math.floor((W * H) / 5000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.6 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 2 + 1
      });
    }
  }


  // ================================================================
  //  WORD GENERATION & DOM
  // ================================================================

  function generateWords() {
    wordList = [];
    for (let i = 0; i < 200; i++) {
      wordList.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
    }
    allChars = [];
    for (let w = 0; w < wordList.length; w++) {
      for (let c = 0; c < wordList[w].length; c++) {
        allChars.push({ char: wordList[w][c], wordIdx: w, charIdx: c, state: 'untyped' });
      }
      if (w < wordList.length - 1) {
        allChars.push({ char: ' ', wordIdx: w, charIdx: -1, state: 'untyped' });
      }
    }
    globalCharIndex = 0;
    currentWordIdx = 0;
    renderWordDOM();
  }

  function renderWordDOM() {
    let html = '';
    for (let w = 0; w < wordList.length; w++) {
      html += `<span class="word-span" data-word="${w}">`;
      for (let c = 0; c < wordList[w].length; c++) {
        html += `<span class="char char-untyped" data-wi="${w}" data-ci="${c}"></span>`;
      }
      html += '</span> ';
    }
    wordInner.innerHTML = html;
    updateCharDOM();
  }

  function updateCharDOM() {
    let charIdx = 0;
    const charEls = wordInner.querySelectorAll('.char');

    // Check if cursor is sitting on a space (between words)
    const cursorOnSpace = globalCharIndex < allChars.length && allChars[globalCharIndex].char === ' ';
    // If on space, find the last char of the word before the space
    let cursorAfterWordIdx = -1, cursorAfterCharIdx = -1;
    if (cursorOnSpace) {
      const wi = allChars[globalCharIndex].wordIdx;
      cursorAfterWordIdx = wi;
      cursorAfterCharIdx = wordList[wi].length - 1;
    }

    for (let w = 0; w < wordList.length; w++) {
      for (let c = 0; c < wordList[w].length; c++) {
        const el = charEls[charIdx];
        if (!el) break;
        const ac = allChars.find(a => a.wordIdx === w && a.charIdx === c);

        el.textContent = wordList[w][c];
        el.className = 'char';

        if (ac) {
          if (ac.state === 'correct') el.classList.add('char-correct');
          else if (ac.state === 'error') el.classList.add('char-error');
          else if (ac.state === 'skipped') el.classList.add('char-skipped');
          else el.classList.add('char-untyped');
        }

        const globalIdx = getGlobalIndex(w, c);
        if (globalIdx === globalCharIndex) {
          el.classList.add('char-cursor');
        }

        // Show cursor after last char of word when cursor is on the space
        if (cursorOnSpace && w === cursorAfterWordIdx && c === cursorAfterCharIdx) {
          el.style.borderRight = '2px solid #fbbf24';
          el.style.paddingRight = '1px';
        } else {
          el.style.borderRight = '';
          el.style.paddingRight = '';
        }

        charIdx++;
      }
    }
    scrollToCurrentLine();
  }

  function getGlobalIndex(wordIdx, charIdx) {
    let idx = 0;
    for (let w = 0; w < wordIdx; w++) {
      idx += wordList[w].length + 1;
    }
    idx += charIdx;
    return idx;
  }

  // Find the word index for a given global char index
  function getWordIdxAtGlobal(gi) {
    if (gi >= allChars.length) return wordList.length - 1;
    return allChars[gi].wordIdx;
  }

  // Jump globalCharIndex to the start of a given word
  function jumpToWord(wordIdx) {
    let idx = 0;
    for (let w = 0; w < wordIdx; w++) {
      idx += wordList[w].length + 1;
    }
    globalCharIndex = idx;
    currentWordIdx = wordIdx;
  }

  function scrollToCurrentLine() {
    const cursorEl = wordInner.querySelector('.char-cursor');
    if (!cursorEl) return;
    const wordSpan = cursorEl.closest('.word-span');
    if (!wordSpan) return;
    const innerRect = wordInner.getBoundingClientRect();
    const wordRect = wordSpan.getBoundingClientRect();
    const relativeTop = wordRect.top - innerRect.top;
    const lineHeight = wordRect.height + 12;
    const currentLine = Math.floor(relativeTop / lineHeight);
    if (currentLine > 0) {
      const scrollY = (currentLine) * lineHeight;
      wordInner.style.transform = `translateY(-${scrollY}px)`;
    } else {
      wordInner.style.transform = 'translateY(0)';
    }
  }


  // ================================================================
  //  PARTICLES & VISUAL EFFECTS
  // ================================================================

  function spawnParticles(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = Math.random() * speed + speed * 0.3;
      particles.push({
        x, y, vx: Math.cos(angle)*vel, vy: Math.sin(angle)*vel,
        life:1, decay: Math.random()*0.02+0.015,
        size: Math.random()*4+2, color
      });
    }
  }

  function spawnSaberClash() {
    const clashX = (player.x + player.w + opponent.x) / 2;
    const clashY = player.y + player.h * 0.3;
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = Math.random() * 5 + 2;
      saberClashParticles.push({
        x: clashX, y: clashY,
        vx: Math.cos(angle)*vel, vy: Math.sin(angle)*vel,
        life: 1, decay: Math.random()*0.03+0.02,
        size: Math.random()*3+1,
        color: Math.random() > 0.5 ? '#60a5fa' : '#f87171'
      });
    }
  }

  function spawnAttackEffect() {
    const tx = opponent.x + opponent.w / 2;
    const ty = opponent.y + opponent.h * 0.35;
    spawnParticles(tx, ty, '#60a5fa', 12, 4);
    spawnParticles(tx, ty, '#93c5fd', 8, 3);
    spawnSaberClash();
    flashAttack.style.background = 'radial-gradient(circle at 50% 30%, rgba(96,165,250,0.12), transparent)';
    flashAttack.style.opacity = '1';
    setTimeout(() => { flashAttack.style.opacity = '0'; }, 150);
  }

  function spawnHitEffect() {
    const tx = player.x + player.w / 2;
    const ty = player.y + player.h * 0.35;
    spawnParticles(tx, ty, '#f87171', 10, 3);
    spawnParticles(tx, ty, '#fb923c', 6, 2);
    spawnSaberClash();
    flashHit.style.background = 'radial-gradient(circle at 50% 30%, rgba(248,113,113,0.1), transparent)';
    flashHit.style.opacity = '1';
    setTimeout(() => { flashHit.style.opacity = '0'; }, 120);
  }


  // ================================================================
  //  CHARACTER ACTIONS
  // ================================================================

  function playerAttack() {
    player.state = 'attack'; player.stateTimer = 22;
    opponent.state = 'hurt'; opponent.stateTimer = 16;
    opponent.hp = Math.max(0, opponent.hp - 5);
    spawnAttackEffect();
  }

  function playerGotHit() {
    player.state = 'hurt'; player.stateTimer = 14;
    opponent.state = 'attack'; opponent.stateTimer = 18;
    player.hp = Math.max(0, player.hp - 3);
    spawnHitEffect();
  }


  // ================================================================
  //  KEYBOARD INPUT
  // ================================================================

  document.addEventListener('keydown', (e) => {
    // Unpause on any key
    if (gameState === 'paused') {
      e.preventDefault();
      resumeGame();
      return;
    }

    if (gameState !== 'ready' && gameState !== 'playing') return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Tab' || e.key === 'Escape') return;

    // Backspace: go back one char within the current word
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (globalCharIndex <= 0) return;

      // Find the start of the current word
      const curWordIdx = getWordIdxAtGlobal(
        // If sitting on a space, the word is the one before it
        (globalCharIndex < allChars.length && allChars[globalCharIndex].char === ' ')
          ? globalCharIndex - 1
          : globalCharIndex
      );
      const wordStartIdx = getGlobalIndex(curWordIdx, 0);

      // Don't backspace past the start of the current word
      if (globalCharIndex <= wordStartIdx) return;

      globalCharIndex--;
      // Reset the char we backed into
      if (globalCharIndex < allChars.length && allChars[globalCharIndex].charIdx >= 0) {
        allChars[globalCharIndex].state = 'untyped';
      }
      updateCharDOM();
      updateHUD();
      return;
    }

    if (e.key.length !== 1 && e.key !== ' ') return;
    e.preventDefault();

    // Start timer on first keypress
    if (gameState === 'ready') {
      gameState = 'playing';
      timerStarted = true;
      startHint.classList.remove('visible');
      startTimer();
    }

    if (globalCharIndex >= allChars.length) return;

    // ===== SPACE: confirm word and move to next =====
    if (e.key === ' ') {
      const curWordIdx = getWordIdxAtGlobal(globalCharIndex);

      // If cursor is already on a space char, just advance
      if (globalCharIndex < allChars.length && allChars[globalCharIndex].char === ' ') {
        // Word was already fully typed — check if perfect
        const wordPerfect = !allChars.some(a => a.wordIdx === curWordIdx && a.charIdx >= 0 &&
          (a.state === 'error' || a.state === 'skipped'));
        wordsCompleted++;
        fightPoints += wordList[curWordIdx].length * 10;
        if (wordPerfect) {
          playerAttack();
        } else {
          playerGotHit();
        }
        // Skip past the space
        allChars[globalCharIndex].state = 'correct';
        totalCharsTyped++;
        globalCharIndex++;
        currentWordIdx = getWordIdxAtGlobal(globalCharIndex);
      } else {
        // Still in the middle of a word — mark remaining as skipped
        for (let i = globalCharIndex; i < allChars.length; i++) {
          if (allChars[i].wordIdx !== curWordIdx) break;
          if (allChars[i].charIdx >= 0 && allChars[i].state === 'untyped') {
            allChars[i].state = 'skipped';
          }
        }
        wordsCompleted++;
        // Word had skipped chars, so Vader attacks
        playerGotHit();
        // Move past the space to next word
        const nextWordIdx = curWordIdx + 1;
        if (nextWordIdx < wordList.length) {
          const spaceIdx = getGlobalIndex(curWordIdx, wordList[curWordIdx].length - 1) + 1;
          if (spaceIdx < allChars.length && allChars[spaceIdx].char === ' ') {
            allChars[spaceIdx].state = 'correct';
          }
          jumpToWord(nextWordIdx);
        }
      }
      totalKeystrokes++;
      updateCharDOM();
      updateHUD();
      return;
    }

    totalKeystrokes++;
    const expected = allChars[globalCharIndex].char;

    // Don't type letters if cursor is sitting on a space (must press space)
    if (allChars[globalCharIndex].char === ' ') {
      updateCharDOM();
      updateHUD();
      return;
    }

    if (e.key === expected) {
      // Correct letter
      allChars[globalCharIndex].state = 'correct';
      correctKeystrokes++;
      totalCharsTyped++;
      globalCharIndex++;

      // Do NOT auto-skip space — cursor stops at the space, user must press space
      updateCharDOM();
    } else {
      // Error — mark as error and advance cursor within the word
      allChars[globalCharIndex].state = 'error';
      globalCharIndex++;

      // If we hit the space boundary, stop here (don't auto-advance)
      // Cursor will sit on the space; user must press space to continue
      updateCharDOM();
    }

    updateHUD();
  });

  function updateHUD() {
    hudPoints.textContent = fightPoints;
    if (timerStarted) {
      const elapsed = matchDuration - timeLeft;
      const wpm = elapsed > 0 ? Math.round((totalCharsTyped / 5) / (elapsed / 60)) : 0;
      hudWpm.textContent = wpm;
    }
  }


  // ================================================================
  //  CANVAS DRAWING — BACKGROUND
  // ================================================================

  function drawStars(dt) {
    for (const s of stars) {
      s.twinkle += s.twinkleSpeed * dt;
      const brightness = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.twinkle));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,210,255,${brightness * 0.6})`;
      ctx.fill();
    }
  }

  function drawArena() {
    const groundY = H * 0.48;
    const grad = ctx.createLinearGradient(0, groundY, 0, groundY + H * 0.15);
    grad.addColorStop(0, 'rgba(60,30,120,0.1)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, groundY, W, H * 0.15);

    // Horizon glow
    const hGlow = ctx.createRadialGradient(W/2, groundY, 0, W/2, groundY, W*0.4);
    hGlow.addColorStop(0, 'rgba(100,60,220,0.05)');
    hGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = hGlow;
    ctx.fillRect(0, groundY - 30, W, 60);

    // Grid
    ctx.strokeStyle = 'rgba(167,139,250,0.03)';
    ctx.lineWidth = 1;
    const sp = 40;
    for (let x = 0; x < W; x += sp) { ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x, groundY + H*0.12); ctx.stroke(); }
    for (let y = groundY; y < groundY + H*0.12; y += sp) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  function drawNebula() {
    const t = performance.now() * 0.0001;
    const blobs = [
      { x:W*0.2, y:H*0.25, r:W*0.35, c:'rgba(100,40,180,0.025)' },
      { x:W*0.8, y:H*0.2, r:W*0.3, c:'rgba(30,60,180,0.02)' },
      { x:W*0.5, y:H*0.6, r:W*0.4, c:'rgba(40,120,160,0.015)' },
    ];
    for (const b of blobs) {
      const ox = Math.sin(t*2+b.x)*30, oy = Math.cos(t*1.5+b.y)*20;
      const g = ctx.createRadialGradient(b.x+ox,b.y+oy,0,b.x+ox,b.y+oy,b.r);
      g.addColorStop(0, b.c); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    }
  }


  // ================================================================
  //  CANVAS DRAWING — LIGHTSABER
  // ================================================================

  function drawLightsaber(x, y, length, coreColor, glowColor, isSlashing) {
    // Hilt
    ctx.fillStyle = '#888';
    ctx.fillRect(x - 1.5, y + length - 4, 7, 14);
    ctx.fillStyle = '#666';
    ctx.fillRect(x - 0.5, y + length + 6, 5, 4);
    ctx.fillStyle = '#aaa';
    ctx.fillRect(x, y + length - 6, 4, 4);

    // Blade glow (outer)
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = isSlashing ? 28 : 16;
    ctx.fillStyle = glowColor;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(x - 1, y, 6, length);
    ctx.restore();

    // Blade core
    ctx.save();
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = isSlashing ? 20 : 12;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 0.5, y, 3, length);
    ctx.restore();

    // Color overlay
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = coreColor;
    ctx.fillRect(x + 0.5, y, 3, length);
    ctx.restore();

    // Tip glow
    ctx.save();
    const tipGrad = ctx.createRadialGradient(x + 2, y, 0, x + 2, y, 8);
    tipGrad.addColorStop(0, glowColor);
    tipGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = tipGrad;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(x - 6, y - 6, 16, 12);
    ctx.restore();
  }

  function drawHPBar(ch, bx, by, isPlayer) {
    const barW = ch.w * 1.3, barH = 5;
    const barX = bx + (ch.w - barW) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, by, barW, barH);
    const pct = ch.hp / 100;
    const g = ctx.createLinearGradient(barX, 0, barX + barW * pct, 0);
    if (isPlayer) {
      g.addColorStop(0, '#60a5fa'); g.addColorStop(1, '#38bdf8');
    } else {
      g.addColorStop(0, '#ef4444'); g.addColorStop(1, '#f87171');
    }
    ctx.fillStyle = g;
    ctx.fillRect(barX, by, barW * pct, barH);
  }


  // ================================================================
  //  CANVAS DRAWING — LUKE SKYWALKER
  // ================================================================

  function drawLuke(ch) {
    const bw = ch.w / 8, bh = ch.h / 16;
    let ox = 0, oy = 0;
    const now = performance.now();

    if (ch.state === 'attack') {
      ox = Math.sin((ch.stateTimer / 22) * Math.PI) * 15;
    } else if (ch.state === 'hurt') {
      ox = Math.sin(ch.stateTimer * 30) * 5;
      oy = -Math.sin((ch.stateTimer / 14) * Math.PI) * 4;
    }

    const bx = ch.x + ox, by = ch.y + oy;
    const isHurt = ch.state === 'hurt' && ch.stateTimer > 0;
    const isAttack = ch.state === 'attack' && ch.stateTimer > 0;

    const skin = isHurt ? '#ffaaaa' : '#f0c8a0';
    const tunic = isHurt ? '#887766' : '#2c2c2c';
    const hair = '#c8a050';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(ch.x + ch.w/2, ch.y + ch.h + 3, ch.w*0.45, 5, 0, 0, Math.PI*2);
    ctx.fill();

    // Hair
    ctx.fillStyle = hair;
    ctx.fillRect(bx + bw*2.2, by - bh*0.5, bw*3.6, bh*1.2);
    ctx.fillRect(bx + bw*2, by + bh*0.3, bw*0.8, bh*1.5);
    // Face
    ctx.fillStyle = skin;
    ctx.fillRect(bx + bw*2.5, by + bh*0.5, bw*3, bh*2.8);
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx + bw*3, by + bh*1.3, bw*0.8, bh*0.5);
    ctx.fillRect(bx + bw*4.2, by + bh*1.3, bw*0.8, bh*0.5);
    ctx.fillStyle = '#3b6db5';
    ctx.fillRect(bx + bw*3.3, by + bh*1.4, bw*0.4, bh*0.35);
    ctx.fillRect(bx + bw*4.5, by + bh*1.4, bw*0.4, bh*0.35);
    // Mouth
    ctx.fillStyle = isAttack ? '#ddd' : '#c49080';
    ctx.fillRect(bx + bw*3.5, by + bh*2.5, bw*1, bh*0.25);

    // Body
    const bodyX = bx + bw*2, bodyY = by + bh*3.5;
    ctx.fillStyle = tunic;
    ctx.fillRect(bodyX, bodyY, bw*4, bh*4.5);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(bodyX + bw*1.5, bodyY, bw*0.4, bh*4.5);
    // Belt
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(bodyX, bodyY + bh*3.8, bw*4, bh*0.7);

    // Arms
    ctx.fillStyle = skin;
    const armY = bodyY + bh*0.5;
    if (isAttack) {
      ctx.fillRect(bx + bw*6, armY - bh, bw*1.2, bh*2);
      drawLightsaber(bx + bw*7.2, armY - bh*5, bh*6, '#60a5fa', '#93c5fd', true);
    } else {
      ctx.fillRect(bx + bw*6, armY, bw*1.2, bh*2.5);
      drawLightsaber(bx + bw*6.8, armY - bh*4, bh*5.5, '#60a5fa', '#93c5fd', false);
    }
    ctx.fillStyle = tunic;
    ctx.fillRect(bodyX - bw*1, armY + bh*0.5, bw*1.2, bh*2.5);
    ctx.fillStyle = skin;
    ctx.fillRect(bodyX - bw*1, armY + bh*2.5, bw*1.2, bh*0.8);

    // Legs
    ctx.fillStyle = '#1a1a1a';
    const legY = bodyY + bh*4.5;
    const legBob = ch.state === 'idle' ? Math.sin(now * 0.003) * 1.5 : 0;
    ctx.fillRect(bodyX + bw*0.3, legY + legBob, bw*1.5, bh*5);
    ctx.fillRect(bodyX + bw*2.2, legY - legBob, bw*1.5, bh*5);
    // Boots
    ctx.fillStyle = '#222';
    ctx.fillRect(bodyX + bw*0.1, legY + bh*4.5 + legBob, bw*1.8, bh*1.5);
    ctx.fillRect(bodyX + bw*2.0, legY + bh*4.5 - legBob, bw*1.8, bh*1.5);

    drawHPBar(ch, bx, by - 18, true);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `bold ${Math.max(10, bw*1.1)}px 'Outfit',sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('LUKE', ch.x + ch.w/2, by - 24);
  }


  // ================================================================
  //  CANVAS DRAWING — DARTH VADER
  // ================================================================

  function drawVader(ch) {
    const bw = ch.w / 8, bh = ch.h / 16;
    let ox = 0, oy = 0;
    const now = performance.now();

    if (ch.state === 'attack') {
      ox = -Math.sin((ch.stateTimer / 18) * Math.PI) * 15;
    } else if (ch.state === 'hurt') {
      ox = Math.sin(ch.stateTimer * 30) * 5;
      oy = -Math.sin((ch.stateTimer / 16) * Math.PI) * 4;
    }

    const bx = ch.x + ox, by = ch.y + oy;
    const isHurt = ch.state === 'hurt' && ch.stateTimer > 0;
    const isAttack = ch.state === 'attack' && ch.stateTimer > 0;

    const helmet = isHurt ? '#555' : '#1a1a1a';
    const armor  = isHurt ? '#444' : '#111';
    const visor  = isHurt ? '#ff6666' : '#cc2222';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(ch.x + ch.w/2, ch.y + ch.h + 3, ch.w*0.5, 5, 0, 0, Math.PI*2);
    ctx.fill();

    // Helmet
    const headX = bx + bw*2, headY = by;
    ctx.fillStyle = helmet;
    ctx.fillRect(headX, headY, bw*4, bh*3.5);
    ctx.fillRect(headX + bw*0.5, headY - bh*0.5, bw*3, bh*1);
    ctx.fillStyle = visor;
    ctx.fillRect(headX + bw*0.5, headY + bh*1.2, bw*1.2, bh*0.5);
    ctx.fillRect(headX + bw*2.3, headY + bh*1.2, bw*1.2, bh*0.5);
    ctx.fillStyle = '#333';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(headX + bw*1, headY + bh*2.2 + i*bh*0.35, bw*2, bh*0.2);
    }
    ctx.fillStyle = '#222';
    ctx.fillRect(headX - bw*0.3, headY + bh*1, bw*0.6, bh*2.5);
    ctx.fillRect(headX + bw*3.7, headY + bh*1, bw*0.6, bh*2.5);

    // Body
    const bodyX = bx + bw*1.5, bodyY = by + bh*3.5;
    ctx.fillStyle = armor;
    ctx.fillRect(bodyX, bodyY, bw*5, bh*5);
    ctx.fillStyle = '#222';
    ctx.fillRect(bodyX + bw*1, bodyY + bh*0.5, bw*3, bh*2);
    ctx.fillStyle = '#3a86c4';
    ctx.fillRect(bodyX + bw*1.3, bodyY + bh*0.8, bw*0.6, bh*0.4);
    ctx.fillStyle = '#cc4444';
    ctx.fillRect(bodyX + bw*2.2, bodyY + bh*0.8, bw*0.6, bh*0.4);
    ctx.fillStyle = '#44cc44';
    ctx.fillRect(bodyX + bw*1.3, bodyY + bh*1.5, bw*0.6, bh*0.4);
    // Belt
    ctx.fillStyle = '#333';
    ctx.fillRect(bodyX, bodyY + bh*4, bw*5, bh*0.8);
    ctx.fillStyle = '#666';
    ctx.fillRect(bodyX + bw*2, bodyY + bh*4, bw*1, bh*0.8);
    // Cape
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(bodyX - bw*0.5, bodyY - bh*0.5, bw*0.8, bh*8);
    ctx.fillRect(bodyX + bw*4.7, bodyY - bh*0.5, bw*0.8, bh*8);

    // Arms
    if (isAttack) {
      ctx.fillStyle = armor;
      ctx.fillRect(bx - bw*1, bodyY + bh*0.5, bw*2.5, bh*1.5);
      drawLightsaber(bx - bw*1.5, bodyY - bh*4, bh*6, '#ef4444', '#fca5a5', true);
    } else {
      ctx.fillStyle = armor;
      ctx.fillRect(bodyX - bw*1.5, bodyY + bh*0.5, bw*1.8, bh*2.5);
      drawLightsaber(bx + bw*0.2, bodyY - bh*3.5, bh*5, '#ef4444', '#fca5a5', false);
    }
    ctx.fillStyle = armor;
    ctx.fillRect(bodyX + bw*5, bodyY + bh*0.5, bw*1.2, bh*3);

    // Legs
    ctx.fillStyle = '#0d0d0d';
    const legY = bodyY + bh*5;
    const legBob = ch.state === 'idle' ? Math.sin(now * 0.003 + 1) * 1.5 : 0;
    ctx.fillRect(bodyX + bw*0.5, legY + legBob, bw*1.8, bh*5);
    ctx.fillRect(bodyX + bw*2.7, legY - legBob, bw*1.8, bh*5);
    ctx.fillStyle = '#111';
    ctx.fillRect(bodyX + bw*0.3, legY + bh*4.5 + legBob, bw*2, bh*1.5);
    ctx.fillRect(bodyX + bw*2.5, legY + bh*4.5 - legBob, bw*2, bh*1.5);

    drawHPBar(ch, bx, by - 18, false);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `bold ${Math.max(10, bw*1.1)}px 'Outfit',sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('VADER', ch.x + ch.w/2, by - 24);
  }


  // ================================================================
  //  CANVAS DRAWING — AMBIENT & PARTICLES
  // ================================================================

  function drawSaberAmbientGlow() {
    const lukeGlow = ctx.createRadialGradient(
      player.x + player.w, player.y + player.h * 0.2, 0,
      player.x + player.w, player.y + player.h * 0.2, player.h * 0.8
    );
    lukeGlow.addColorStop(0, 'rgba(96,165,250,0.06)');
    lukeGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = lukeGlow;
    ctx.fillRect(player.x - player.w, player.y - player.h*0.5, player.w*4, player.h*2);

    const vaderGlow = ctx.createRadialGradient(
      opponent.x, opponent.y + opponent.h * 0.2, 0,
      opponent.x, opponent.y + opponent.h * 0.2, opponent.h * 0.8
    );
    vaderGlow.addColorStop(0, 'rgba(239,68,68,0.06)');
    vaderGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = vaderGlow;
    ctx.fillRect(opponent.x - opponent.w*2, opponent.y - opponent.h*0.5, opponent.w*5, opponent.h*2);
  }

  function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color; ctx.shadowBlur = 6;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    for (let i = saberClashParticles.length - 1; i >= 0; i--) {
      const p = saberClashParticles[i];
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0) { saberClashParticles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }


  // ================================================================
  //  MAIN GAME LOOP
  // ================================================================

  function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, W, H);
    drawNebula();
    drawStars(dt);

    if (gameState === 'ready' || gameState === 'playing' || gameState === 'paused') {
      drawArena();
      drawSaberAmbientGlow();

      if (gameState !== 'paused') {
        if (player.stateTimer > 0) {
          player.stateTimer--;
          if (player.stateTimer <= 0) player.state = 'idle';
        }
        if (opponent.stateTimer > 0) {
          opponent.stateTimer--;
          if (opponent.stateTimer <= 0) opponent.state = 'idle';
        }
      }

      drawLuke(player);
      drawVader(opponent);
      drawParticles();
    }

    requestAnimationFrame(gameLoop);
  }


  // ================================================================
  //  TIMER & GAME FLOW
  // ================================================================

  function startTimer() {
    timeLeft = matchDuration;
    hudTimer.textContent = timeLeft;
    hudTimer.classList.remove('warning');
    timerInterval = setInterval(() => {
      if (gameState === 'paused') return;
      timeLeft--;
      hudTimer.textContent = timeLeft;
      if (timeLeft <= 10) hudTimer.classList.add('warning');
      if (timeLeft <= 0) endGame();
    }, 1000);
  }

  function pauseGame() {
    if (gameState !== 'playing') return;
    gameState = 'paused';
    pauseOverlay.classList.add('visible');
    btnPause.innerHTML = '<span class="btn-icon">▶</span> Resume';
  }

  function resumeGame() {
    if (gameState !== 'paused') return;
    gameState = 'playing';
    pauseOverlay.classList.remove('visible');
    btnPause.innerHTML = '<span class="btn-icon">⏸</span> Pause';
  }

  function startGame() {
    gameState = 'ready';
    timerStarted = false;
    startScr.classList.add('hidden');
    resScr.classList.add('hidden');
    hud.classList.add('visible');
    wordBox.classList.add('visible');
    startHint.classList.add('visible');
    pauseOverlay.classList.remove('visible');

    hudTimer.textContent = matchDuration;
    hudTimer.classList.remove('warning');
    btnPause.innerHTML = '<span class="btn-icon">⏸</span> Pause';

    totalCharsTyped = 0; totalKeystrokes = 0;
    correctKeystrokes = 0; wordsCompleted = 0; fightPoints = 0;
    player.hp = 100; opponent.hp = 100;
    player.state = 'idle'; opponent.state = 'idle';
    particles = []; saberClashParticles = [];

    hudPoints.textContent = '0'; hudWpm.textContent = '0';

    positionCharacters();
    generateWords();
  }

  function endGame() {
    clearInterval(timerInterval);
    gameState = 'results';

    hud.classList.remove('visible');
    wordBox.classList.remove('visible');
    startHint.classList.remove('visible');
    pauseOverlay.classList.remove('visible');

    const elapsed = matchDuration;
    const wpm = Math.round((totalCharsTyped / 5) / (elapsed / 60));
    const accuracy = totalKeystrokes > 0 ? Math.round((correctKeystrokes / totalKeystrokes) * 100) : 0;

    const verdictEl = document.getElementById('resultVerdict');
    const subEl     = document.getElementById('resultSub');

    if (opponent.hp <= 0 || player.hp > opponent.hp) {
      verdictEl.textContent = '🏆 Victory!';
      verdictEl.className = 'result-verdict verdict-win';
      subEl.textContent = 'The Force is strong with you!';
    } else if (player.hp < opponent.hp) {
      verdictEl.textContent = '💀 Defeated';
      verdictEl.className = 'result-verdict verdict-lose';
      subEl.textContent = 'The Dark Side prevails...';
    } else {
      verdictEl.textContent = '⚔️ Draw!';
      verdictEl.className = 'result-verdict verdict-win';
      subEl.textContent = 'A disturbance in the Force.';
    }

    document.getElementById('resWpm').textContent = wpm;
    document.getElementById('resPoints').textContent = fightPoints;
    document.getElementById('resAccuracy').textContent = accuracy + '%';
    document.getElementById('resDuration').textContent = matchDuration + 's';

    resScr.classList.remove('hidden');
  }


  // ================================================================
  //  UI EVENT LISTENERS
  // ================================================================

  btnPause.addEventListener('click', () => {
    if (gameState === 'playing') pauseGame();
    else if (gameState === 'paused') resumeGame();
  });

  btnRestart.addEventListener('click', () => {
    clearInterval(timerInterval);
    pauseOverlay.classList.remove('visible');
    startGame();
  });

  dur30.addEventListener('click', () => {
    matchDuration = 30;
    dur30.classList.add('active'); dur60.classList.remove('active');
  });
  dur60.addEventListener('click', () => {
    matchDuration = 60;
    dur60.classList.add('active'); dur30.classList.remove('active');
  });

  btnStart.addEventListener('click', startGame);
  btnReplay.addEventListener('click', () => {
    resScr.classList.add('hidden');
    const modeSelect = document.getElementById('modeSelect');
    if (modeSelect) {
      setTimeout(() => { modeSelect.classList.remove('hidden'); }, 300);
    } else {
      setTimeout(() => { startScr.classList.remove('hidden'); }, 300);
    }
  });

  // Prevent zoom & context menu
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('gesturechange', e => e.preventDefault());
  document.addEventListener('contextmenu', e => e.preventDefault());


  // ================================================================
  //  INIT
  // ================================================================

  resize();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
})();
