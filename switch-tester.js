/**
 * Switch Tester Module
 * 
 * A keyboard switch tester that lets users press every key on their keyboard
 * to verify each switch is working. Tracks tested keys and shows progress.
 * 
 * Wrapped in an IIFE to avoid polluting the global scope.
 * Uses capture-phase event listeners to intercept keys before game.js sees them.
 */
(() => {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────────
  /** @type {'select' | 'switchTester' | 'typingGame'} */
  let currentMode = 'select';

  /** Set of data-key values that have been tested */
  const testedKeys = new Set();

  // ─── Key Code → data-key Mapping ────────────────────────────────────
  const KEY_MAP = {
    'Escape': 'esc',
    'F1': 'f1', 'F2': 'f2', 'F3': 'f3', 'F4': 'f4',
    'F5': 'f5', 'F6': 'f6', 'F7': 'f7', 'F8': 'f8',
    'F9': 'f9', 'F10': 'f10', 'F11': 'f11', 'F12': 'f12',
    'Backquote': 'backquote', 'Digit1': '1', 'Digit2': '2', 'Digit3': '3',
    'Digit4': '4', 'Digit5': '5', 'Digit6': '6', 'Digit7': '7',
    'Digit8': '8', 'Digit9': '9', 'Digit0': '0',
    'Minus': 'minus', 'Equal': 'equal', 'Backspace': 'backspace',
    'Tab': 'tab',
    'KeyQ': 'q', 'KeyW': 'w', 'KeyE': 'e', 'KeyR': 'r', 'KeyT': 't',
    'KeyY': 'y', 'KeyU': 'u', 'KeyI': 'i', 'KeyO': 'o', 'KeyP': 'p',
    'BracketLeft': 'bracketleft', 'BracketRight': 'bracketright',
    'Backslash': 'backslash',
    'CapsLock': 'caps',
    'KeyA': 'a', 'KeyS': 's', 'KeyD': 'd', 'KeyF': 'f', 'KeyG': 'g',
    'KeyH': 'h', 'KeyJ': 'j', 'KeyK': 'k', 'KeyL': 'l',
    'Semicolon': 'semicolon', 'Quote': 'quote', 'Enter': 'enter',
    'ShiftLeft': 'shift-left', 'ShiftRight': 'shift-right',
    'KeyZ': 'z', 'KeyX': 'x', 'KeyC': 'c', 'KeyV': 'v', 'KeyB': 'b',
    'KeyN': 'n', 'KeyM': 'm',
    'Comma': 'comma', 'Period': 'period', 'Slash': 'slash',
    'ControlLeft': 'ctrl-left', 'AltLeft': 'alt-left',
    'MetaLeft': 'win-left', 'Space': 'space',
    'MetaRight': 'win-right', 'AltRight': 'alt-right',
    'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
    'PrintScreen': 'printscreen', 'ScrollLock': 'scrolllock', 'Pause': 'pause',
    'Insert': 'insert', 'Home': 'home', 'PageUp': 'pageup',
    'Delete': 'delete', 'End': 'end', 'PageDown': 'pagedown',
    'NumLock': 'numlock',
    'Fn': 'fn'
  };

  // ─── DOM References ──────────────────────────────────────────────────
  const modeSelect         = document.getElementById('modeSelect');
  const switchTesterScreen = document.getElementById('switchTesterScreen');
  const startScreen        = document.getElementById('startScreen');
  const btnSwitchTest      = document.getElementById('btnSwitchTest');
  const btnTypingSpeed     = document.getElementById('btnTypingSpeed');
  const btnBack            = document.getElementById('btnBack');
  const testedCountEl      = document.getElementById('testedCount');
  const testedProgressEl   = document.getElementById('testedProgress');

  /** All key elements on the keyboard layout */
  const allKeyElements = document.querySelectorAll('.key');

  /** Total number of keys available to test */
  const totalKeys = allKeyElements.length;

  // ─── Helpers ─────────────────────────────────────────────────────────

  /**
   * Check if the switch tester is currently the active mode.
   * @returns {boolean}
   */
  function isTesterActive() {
    return currentMode === 'switchTester';
  }

  /**
   * Find a key element by its data-key attribute value.
   * @param {string} dataKey - The data-key attribute to match.
   * @returns {HTMLElement|null}
   */
  function findKeyElement(dataKey) {
    return document.querySelector(`.key[data-key="${dataKey}"]`);
  }

  /**
   * Update the tested count display and progress bar.
   */
  function updateProgress() {
    const count = testedKeys.size;
    testedCountEl.textContent = count;

    // Calculate percentage and update the progress bar width
    const pct = totalKeys > 0 ? (count / totalKeys) * 100 : 0;
    testedProgressEl.style.width = `${pct}%`;
  }

  /**
   * Mark a key as active (pressed) and tested.
   * @param {string} dataKey - The data-key attribute value.
   */
  function activateKey(dataKey) {
    const el = findKeyElement(dataKey);
    if (!el) return;

    el.classList.add('active', 'tested');

    // Track unique tested keys
    if (!testedKeys.has(dataKey)) {
      testedKeys.add(dataKey);
      updateProgress();
    }
  }

  /**
   * Remove the active (pressed) state from a key, keeping tested.
   * @param {string} dataKey - The data-key attribute value.
   */
  function deactivateKey(dataKey) {
    const el = findKeyElement(dataKey);
    if (!el) return;

    el.classList.remove('active');
  }

  /**
   * Reset all tested/active states and the progress counter.
   */
  function resetTester() {
    testedKeys.clear();

    allKeyElements.forEach((el) => {
      el.classList.remove('active', 'tested');
    });

    updateProgress();
  }

  // ─── Mode Switching ──────────────────────────────────────────────────

  /**
   * Show a screen element and hide the others.
   * @param {'select' | 'switchTester' | 'typingGame'} mode
   */
  function switchMode(mode) {
    currentMode = mode;

    // Hide all screens first
    modeSelect.classList.add('hidden');
    switchTesterScreen.classList.add('hidden');
    startScreen.classList.add('hidden');

    // Show the target screen
    switch (mode) {
      case 'select':
        modeSelect.classList.remove('hidden');
        break;
      case 'switchTester':
        switchTesterScreen.classList.remove('hidden');
        break;
      case 'typingGame':
        startScreen.classList.remove('hidden');
        break;
    }
  }

  // ─── Mode Selection Buttons ──────────────────────────────────────────

  btnSwitchTest.addEventListener('click', () => {
    switchMode('switchTester');
  });

  btnTypingSpeed.addEventListener('click', () => {
    switchMode('typingGame');
  });

  btnBack.addEventListener('click', () => {
    resetTester();
    switchMode('select');
  });

  // ─── Keyboard Events (Capture Phase) ────────────────────────────────
  // Using capture: true so these fire BEFORE game.js listeners.
  // We call stopPropagation() when the tester is active to prevent
  // game.js from receiving the events.

  document.addEventListener('keydown', (e) => {
    if (!isTesterActive()) return;

    // Prevent default browser behaviour for most keys
    // (Tab would move focus, Space would scroll, etc.)
    e.preventDefault();
    e.stopPropagation();

    // Look up the data-key for this physical key
    const dataKey = KEY_MAP[e.code];
    if (dataKey) {
      activateKey(dataKey);
    }
  }, { capture: true });

  document.addEventListener('keyup', (e) => {
    if (!isTesterActive()) return;

    e.preventDefault();
    e.stopPropagation();

    const dataKey = KEY_MAP[e.code];
    if (dataKey) {
      deactivateKey(dataKey);
    }
  }, { capture: true });

  // ─── Mouse Events on Key Elements ───────────────────────────────────
  // Allow users to click keys with the mouse as well.

  allKeyElements.forEach((el) => {
    const dataKey = el.getAttribute('data-key');
    if (!dataKey) return;

    el.addEventListener('mousedown', (e) => {
      if (!isTesterActive()) return;
      e.preventDefault(); // prevent text selection
      activateKey(dataKey);
    });

    el.addEventListener('mouseup', (e) => {
      if (!isTesterActive()) return;
      deactivateKey(dataKey);
    });

    // Also deactivate if the mouse leaves the key while pressed
    el.addEventListener('mouseleave', (e) => {
      if (!isTesterActive()) return;
      deactivateKey(dataKey);
    });
  });

  // ─── Initial State ──────────────────────────────────────────────────
  // Ensure the page starts on the mode selection screen.
  // The start screen (typing game) should be hidden by default.
  startScreen.classList.add('hidden');
  switchTesterScreen.classList.add('hidden');

  // Initialize progress display
  const totalKeyCountEl = document.getElementById('totalKeyCount');
  if (totalKeyCountEl) totalKeyCountEl.textContent = totalKeys;
  updateProgress();
})();
