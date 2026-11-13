/* Pomodoro Time · Autor: Gabriel Paspuel.
   Calendario, temas, audio, avisos y juegos de descanso. Sin dependencias. */
(() => {
  'use strict';
  const PREFS_KEY = 'pomodoro.time.preferences.v1';
  const tracks = {
    lofi: { file: 'lofi.mp3', name: 'Lo-fi · Tarde tranquila', note: 'Composición original: teclas cálidas y un ritmo suave, sin anuncios.' },
    white: { file: 'white.mp3', name: 'Ruido blanco', note: 'Un fondo uniforme para suavizar las distracciones.' },
    rain: { file: 'rain.mp3', name: 'Lluvia suave', note: 'Textura de lluvia sintetizada. Una tarde tranquila, estés donde estés.' },
    breeze: { file: 'breeze.mp3', name: 'Brisa del bosque', note: 'Ruido marrón suave y profundo, como una brisa entre los árboles.' }
  };
  const dateKey = value => {
    const d = new Date(value);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  function readPreferences() {
    let value = {};
    try { value = JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { /* Defaults work without storage. */ }
    return {
      theme: ['light', 'dark'].includes(value.theme) ? value.theme : null,
      notifications: value.notifications === true,
      track: Object.hasOwn(tracks, value.track) ? value.track : 'lofi',
      volume: Number.isFinite(value.volume) ? Math.max(0, Math.min(1, value.volume)) : .35
    };
  }

  function create(controller) {
    const $ = id => document.getElementById(id);
    const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
    let prefs = readPreferences();
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const audio = $('focus-audio');
    let playing = false;
    let playRequest = 0;
    let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let selectedDay = new Date();
    let gameType = 'memory';
    let gameSession = null;
    let delayedMove = null;
    let memory = [], flipped = [], matched = new Set(), attempts = 0;
    let board = Array(9).fill(null), computerTurn = false;

    function savePreferences() {
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }
      catch { controller.toast('Este navegador no permite guardar las preferencias.'); }
    }

    function applyTheme() {
      const dark = prefs.theme === 'dark' || (!prefs.theme && media?.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      $('theme-button').innerHTML = icon(dark ? 'sun' : 'moon');
      $('theme-button').setAttribute('aria-pressed', String(dark));
      $('theme-button').setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#18251e' : '#294c3a');
    }

    function permission() { return 'Notification' in window ? window.Notification.permission : 'unsupported'; }
    function renderNotificationSettings() {
      const status = permission();
      const enabled = status === 'granted' && prefs.notifications;
      $('notification-dot').hidden = !enabled;
      $('notification-button').setAttribute('aria-label', `Notificaciones de escritorio: ${enabled ? 'activadas' : 'desactivadas'}`);
      $('notification-status').textContent = status === 'unsupported' ? 'Este navegador no admite notificaciones de escritorio.' : !window.isSecureContext ? 'Abre la app con HTTPS o en localhost para activar los avisos.' : status === 'denied' ? 'El permiso está bloqueado. Puedes cambiarlo en los ajustes del sitio de tu navegador.' : enabled ? 'Avisos activados. Te avisaremos al finalizar cada sesión.' : status === 'granted' ? 'El navegador tiene permiso. Puedes activar los avisos de esta app.' : 'Actívalos cuando quieras. El navegador te pedirá permiso.';
      $('notification-enable').disabled = status === 'unsupported' || status === 'denied' || !window.isSecureContext;
      $('notification-enable').textContent = enabled ? 'Desactivar notificaciones' : 'Activar notificaciones';
      $('notification-test').disabled = !enabled;
    }
    async function sendNotification(title, body, tag) {
      if (!prefs.notifications || permission() !== 'granted') return false;
      const options = { body, icon: './assets/icon.svg', tag, data: { url: './' } };
      try {
        const registration = await navigator.serviceWorker?.getRegistration?.();
        if (registration?.showNotification) await registration.showNotification(title, options);
        else {
          const notification = new window.Notification(title, options);
          notification.onclick = () => { window.focus(); notification.close(); };
        }
        return true;
      } catch {
        controller.toast('El navegador no pudo mostrar el aviso. Comprueba sus permisos y los del sistema.');
        return false;
      }
    }

    function syncAudio() {
      $('audio-track').value = prefs.track;
      $('audio-volume').value = Math.round(prefs.volume * 100);
      $('volume-value').textContent = `${Math.round(prefs.volume * 100)}%`;
      audio.volume = prefs.volume;
      $('audio-note').textContent = tracks[prefs.track].note;
      $('audio-play').innerHTML = icon(playing ? 'pause' : 'play');
      $('audio-play').setAttribute('aria-label', playing ? 'Pausar sonido de fondo' : 'Reproducir sonido de fondo');
      $('audio-play').setAttribute('aria-pressed', String(playing));
      $('audio-playing').hidden = !playing;
      $('sound-button').setAttribute('aria-pressed', String(playing));
      $('sound-icon').innerHTML = `<use href="#i-${playing ? 'sound' : 'mute'}"/>`;
      $('sound-label').textContent = playing ? tracks[prefs.track].name : 'Sonido de fondo';
    }
    function stopAudio() { ++playRequest; audio.pause(); playing = false; syncAudio(); }
    async function startAudio() {
      const request = ++playRequest;
      const source = `./assets/audio/${tracks[prefs.track].file}`;
      if (audio.getAttribute('src') !== source) audio.src = source;
      audio.volume = prefs.volume;
      try {
        await audio.play();
        if (request !== playRequest) return;
        playing = true; syncAudio();
      } catch {
        if (request !== playRequest) return;
        playing = false; syncAudio();
        controller.toast('No se pudo reproducir el audio. Pulsa reproducir para intentarlo de nuevo.');
      }
    }
    function toggleAudio() { if (playing || !audio.paused) stopAudio(); else startAudio(); }

    function renderCalendar() {
      const sessions = controller.getState().sessions;
      const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      const offset = (new Date(year, month, 1).getDay() + 6) % 7;
      const counts = new Map();
      sessions.forEach(session => { const key = dateKey(session.at); counts.set(key, (counts.get(key) || 0) + 1); });
      $('calendar-month').textContent = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(calendarMonth);
      let html = '<span class="calendar-empty" aria-hidden="true"></span>'.repeat(offset);
      for (let day = 1; day <= days; day++) {
        const date = new Date(year, month, day), key = dateKey(date), count = counts.get(key) || 0;
        const label = new Intl.DateTimeFormat('es-ES', { dateStyle: 'full' }).format(date);
        const today = key === dateKey(Date.now());
        html += `<button class="calendar-day ${count >= 4 ? 'busy' : count ? 'has-sessions' : ''} ${today ? 'is-today' : ''} ${key === dateKey(selectedDay) ? 'selected' : ''}" data-calendar-day="${day}" aria-label="${label}: ${count} ${count === 1 ? 'sesión' : 'sesiones'}" aria-pressed="${key === dateKey(selectedDay)}" ${today ? 'aria-current="date"' : ''}><span>${day}</span><small>${count ? `${count} ${count === 1 ? 'sesión' : 'sesiones'}` : '—'}</small></button>`;
      }
      $('calendar-days').innerHTML = html;
      const monthly = sessions.filter(session => { const d = new Date(session.at); return d.getFullYear() === year && d.getMonth() === month; });
      $('month-sessions').textContent = monthly.length;
      $('month-minutes').textContent = monthly.length * 20;
      $('month-active-days').textContent = new Set(monthly.map(session => dateKey(session.at))).size;
      const daily = sessions.filter(session => dateKey(session.at) === dateKey(selectedDay)).sort((a, b) => b.at - a.at);
      $('calendar-selected-date').textContent = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDay);
      $('day-summary').textContent = daily.length ? `${daily.length} ${daily.length === 1 ? 'sesión completada' : 'sesiones completadas'} · ${daily.length * 20} minutos de enfoque` : 'Aún no hay sesiones completadas este día.';
      $('day-sessions').innerHTML = daily.length ? daily.map(session => `<div class="session-entry"><span>${icon('leaf')}</span><div><strong>Enfoque completado</strong><small>${new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(session.at))} · 20 minutos</small></div>${icon('check')}</div>`).join('') : `<div class="empty-day">${icon('leaf')}<p>Hay espacio para un pequeño paso.<br>Tu próximo enfoque aparecerá aquí.</p></div>`;
    }

    // Every entry point and every delayed move checks the live timer, not the UI.
    function canPlay() {
      const state = controller.getState();
      return state.mode === 'rest' && state.timers.work.endAt === null && state.timers.rest.endAt !== null && controller.remaining('rest') > 0;
    }
    function cancelMove() { if (delayedMove !== null) clearTimeout(delayedMove); delayedMove = null; }
    function guardGame() {
      if (canPlay()) return true;
      cancelMove();
      if ($('games-dialog').open) $('games-dialog').close();
      gameSession = null;
      return false;
    }
    function onTimerUpdate() {
      const allowed = canPlay();
      const button = $('games-open');
      if (button.disabled === allowed) {
        button.disabled = !allowed;
        button.innerHTML = `${icon(allowed ? 'game' : 'lock')} ${allowed ? 'Elegir minijuego' : 'Solo en el descanso'}`;
      }
      $('games-lock-copy').textContent = allowed ? 'Tu descanso está en marcha. Despeja la mente con una partida.' : 'Los minijuegos se abren durante un descanso en marcha.';
      $('break-time').hidden = !allowed;
      if (allowed) {
        const time = controller.clock(controller.remaining('rest'));
        $('break-time').textContent = time; $('game-countdown').textContent = time;
        if ($('games-dialog').open && gameSession !== controller.getState().timers.rest.id) { cancelMove(); $('games-dialog').close(); gameSession = null; }
      } else guardGame();
    }
    function freshGame() {
      if (!guardGame()) return;
      cancelMove();
      gameSession = controller.getState().timers.rest.id;
      if (gameType === 'memory') {
        memory = ['🌿', '☀️', '🌸', '🍄', '🌙', '🦋'].flatMap(value => [value, value]);
        for (let i = memory.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [memory[i], memory[j]] = [memory[j], memory[i]]; }
        flipped = []; matched = new Set(); attempts = 0;
      } else { board = Array(9).fill(null); computerTurn = false; }
      renderGame();
    }
    function result(cells) {
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for (const [a,b,c] of lines) if (cells[a] && cells[a] === cells[b] && cells[b] === cells[c]) return cells[a];
      return cells.every(Boolean) ? 'draw' : null;
    }
    function renderGame() {
      if (!guardGame()) return;
      document.querySelectorAll('[data-game]').forEach(button => {
        const active = button.dataset.game === gameType;
        button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
      });
      $('game-board').className = `game-board ${gameType === 'memory' ? 'memory-board' : 'ttt-board'}`;
      if (gameType === 'memory') {
        $('game-status').textContent = matched.size === memory.length ? `¡Todas las parejas encontradas! ${attempts} intentos. Disfruta del resto de tu pausa.` : `${matched.size / 2} de 6 parejas · ${attempts} intentos`;
        $('game-board').innerHTML = memory.map((value, i) => {
          const revealed = flipped.includes(i) || matched.has(i);
          return `<button data-memory-index="${i}" class="memory-tile ${revealed ? 'revealed' : ''} ${matched.has(i) ? 'matched' : ''}" aria-label="Tarjeta ${i + 1}: ${revealed ? value : 'oculta'}" ${revealed || flipped.length === 2 ? 'disabled' : ''}>${revealed ? value : icon('flower')}</button>`;
        }).join('');
      } else {
        const winner = result(board);
        $('game-status').textContent = winner === 'X' ? '¡Tres en raya! Una pequeña victoria para tu descanso.' : winner === 'O' ? 'Esta vez gana el bosque. ¿Otra partida?' : winner === 'draw' ? '¡Empate! Buena partida.' : computerTurn ? 'El bosque está pensando…' : 'Tu turno. Tú eres X; el bosque es O.';
        $('game-board').innerHTML = board.map((value, i) => `<button data-ttt-index="${i}" class="ttt-tile ${value === 'O' ? 'forest-move' : ''}" aria-label="Fila ${Math.floor(i / 3) + 1}, columna ${i % 3 + 1}: ${value || 'vacía'}" ${value || winner || computerTurn ? 'disabled' : ''}>${value || ''}</button>`).join('');
      }
    }
    function flipCard(index) {
      if (!guardGame() || gameSession !== controller.getState().timers.rest.id || !Number.isInteger(index) || index < 0 || index >= memory.length || flipped.length >= 2 || matched.has(index) || flipped.includes(index)) return;
      flipped.push(index);
      if (flipped.length === 2) {
        attempts++;
        const [a,b] = flipped;
        if (memory[a] === memory[b]) { matched.add(a); matched.add(b); flipped = []; }
        else delayedMove = setTimeout(() => {
          delayedMove = null;
          if (!guardGame() || gameSession !== controller.getState().timers.rest.id) return;
          flipped = []; renderGame();
        }, 850);
      }
      renderGame();
    }
    function computerMove() {
      for (const player of ['O', 'X']) {
        for (let i = 0; i < 9; i++) {
          if (board[i]) continue;
          const candidate = [...board]; candidate[i] = player;
          if (result(candidate) === player) return i;
        }
      }
      return [4,0,8,2,6,1,3,5,7].find(i => !board[i]);
    }
    function playSquare(index) {
      if (!guardGame() || gameSession !== controller.getState().timers.rest.id || !Number.isInteger(index) || index < 0 || index > 8 || board[index] || result(board) || computerTurn) return;
      board[index] = 'X';
      if (!result(board)) {
        computerTurn = true;
        delayedMove = setTimeout(() => {
          delayedMove = null;
          if (!guardGame() || gameSession !== controller.getState().timers.rest.id) return;
          const next = computerMove();
          if (next !== undefined) board[next] = 'O';
          computerTurn = false; renderGame();
        }, 420);
      }
      renderGame();
    }

    $('theme-button').addEventListener('click', () => { prefs.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; savePreferences(); applyTheme(); });
    media?.addEventListener?.('change', () => { if (!prefs.theme) applyTheme(); });
    $('notification-button').addEventListener('click', () => { renderNotificationSettings(); $('notification-dialog').showModal(); });
    $('notification-enable').addEventListener('click', async () => {
      if (permission() === 'unsupported' || !window.isSecureContext) return;
      if (permission() === 'granted' && prefs.notifications) prefs.notifications = false;
      else {
        try { prefs.notifications = (permission() === 'granted' ? 'granted' : await window.Notification.requestPermission()) === 'granted'; }
        catch { controller.toast('Abre la app en una pestaña propia para permitir las notificaciones.'); }
      }
      savePreferences(); renderNotificationSettings();
    });
    $('notification-test').addEventListener('click', () => sendNotification('Pomodoro Time · Todo listo', 'Te avisaremos cuando llegue el momento de cambiar de ritmo.', 'pomodoro-test'));
    $('audio-play').addEventListener('click', toggleAudio);
    $('audio-track').addEventListener('change', () => {
      const next = $('audio-track').value;
      if (!Object.hasOwn(tracks, next)) return;
      const resume = playing || !audio.paused;
      stopAudio(); prefs.track = next; savePreferences(); syncAudio();
      if (resume) startAudio();
    });
    $('audio-volume').addEventListener('input', () => { prefs.volume = Math.max(0, Math.min(1, Number($('audio-volume').value) / 100)); syncAudio(); savePreferences(); });
    audio.addEventListener('pause', () => { playing = false; syncAudio(); });
    audio.addEventListener('error', () => { playing = false; syncAudio(); });
    $('calendar-prev').addEventListener('click', () => { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1); selectedDay = new Date(calendarMonth); renderCalendar(); });
    $('calendar-next').addEventListener('click', () => { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1); selectedDay = new Date(calendarMonth); renderCalendar(); });
    $('calendar-today').addEventListener('click', () => { selectedDay = new Date(); calendarMonth = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1); renderCalendar(); });
    $('calendar-days').addEventListener('click', event => {
      const button = event.target.closest('[data-calendar-day]');
      if (!button) return;
      const day = Number(button.dataset.calendarDay);
      if (!Number.isInteger(day) || day < 1 || day > new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()) return;
      selectedDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day); renderCalendar();
    });
    $('games-open').addEventListener('click', () => { if (!guardGame()) return; freshGame(); $('games-dialog').showModal(); });
    document.querySelectorAll('[data-game]').forEach(button => {
      const select = type => { if (!guardGame()) return; gameType = type; freshGame(); };
      button.addEventListener('click', () => select(button.dataset.game));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); select(event.key === 'Home' ? 'memory' : event.key === 'End' ? 'ttt' : gameType === 'memory' ? 'ttt' : 'memory'); $(`${gameType === 'memory' ? 'memory' : 'ttt'}-tab`).focus();
      });
    });
    $('game-reset').addEventListener('click', freshGame);
    $('game-board').addEventListener('click', event => {
      if (!guardGame()) return;
      const memoryButton = event.target.closest('[data-memory-index]');
      const tttButton = event.target.closest('[data-ttt-index]');
      if (gameType === 'memory' && memoryButton) flipCard(Number(memoryButton.dataset.memoryIndex));
      if (gameType === 'ttt' && tttButton) playSquare(Number(tttButton.dataset.tttIndex));
    });
    $('games-dialog').addEventListener('close', () => { cancelMove(); gameSession = null; });
    window.addEventListener('storage', event => {
      if (event.key !== PREFS_KEY) return;
      const previousTrack = prefs.track; prefs = readPreferences();
      applyTheme(); renderNotificationSettings();
      if (previousTrack !== prefs.track) stopAudio();
      syncAudio();
    });
    window.addEventListener('focus', renderNotificationSettings);
    applyTheme(); renderNotificationSettings(); syncAudio(); renderCalendar(); onTimerUpdate();
    return {
      onTimerUpdate,
      onStateUpdate: renderCalendar,
      toggleAudio,
      onFinish(mode, timer) {
        if (Date.now() - timer.at > 60_000) return;
        sendNotification(mode === 'work' ? 'Enfoque completado · Pomodoro Time' : 'Descanso terminado · Pomodoro Time', mode === 'work' ? '¡20 minutos completados! Es hora de respirar y tomarte un descanso.' : 'Tus 5 minutos de descanso han terminado. Tu siguiente enfoque te espera.', `pomodoro-${mode}-${timer.id}`);
      }
    };
  }
  window.PomodoroFeatures = { create };
})();
