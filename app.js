/**
 * DAILY PLANNER & SCHEDULE ENGINE
 * Автоматически генерирует и обновляет персональное расписание на каждый день недели.
 * Включает ОБЛАЧНУЮ СИНХРОНИЗАЦИЮ по PIN-коду (ПК + Телефон), генерацию QR-кода и PWA.
 */

(() => {
  'use strict';

  // --- Constants and Key Identifiers ---
  const STORAGE_KEYS = {
    TASKS: 'daily_tasks_data',
    HABITS: 'daily_habits_data',
    NOTES: 'daily_notes_data',
    LAST_ACTIVE_DATE: 'daily_last_active_date',
    SETTINGS: 'daily_settings',
    THEME: 'daily_ui_theme',
    STREAK: 'daily_user_streak',
    INITIALIZED_SCHEDULE: 'daily_schedule_v2_initialized',
    SYNC_PIN: 'daily_cloud_sync_pin',
    LAST_SYNC_TS: 'daily_last_sync_timestamp'
  };

  const THEMES = ['glass', 'warm-neu', 'dark'];

  // Надежный облачный канал мгновенной синхронизации ПК + Телефон (без регистрации)
  const CLOUD_SYNC_ENDPOINT = 'https://ntfy.sh/daily_planner_sync_';

  // Векторные монохромные иконки в дизайн-стиле squircle
  const ICONS = {
    water: `<svg viewBox="0 0 24 24"><path d="M12 3C8 8.5 6 12 6 15a6 6 0 0 0 12 0c0-3-2-6.5-6-12Z" fill="currentColor"/></svg>`,
    book: `<svg viewBox="0 0 24 24"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" fill="none" stroke="currentColor" stroke-width="2.2"/><line x1="6" y1="6" x2="16" y2="6" stroke="currentColor" stroke-width="2"/></svg>`,
    run: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="currentColor"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
    star: `<svg viewBox="0 0 24 24"><path d="M12 2.5 L14.5 9.5 L21.5 12 L14.5 14.5 L12 21.5 L9.5 14.5 L2.5 12 L9.5 9.5 Z" fill="currentColor"/></svg>`,
    target: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2.2"/></svg>`,
    code: `<svg viewBox="0 0 24 24"><path d="m8 9-4 3 4 3M16 9l4 3-4 3M13 6l-2 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
    work: `<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2.2"/></svg>`,
    personal: `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>`,
    study: `<svg viewBox="0 0 24 24"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M6 6h10M6 10h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    health: `<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
    clock: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="12 7 12 12 15 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    repeat: `<svg viewBox="0 0 24 24"><path d="m17 2 4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 13v1a4 4 0 0 1-4 4H3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    rollover: `<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" fill="none" stroke="currentColor" stroke-width="2"/></svg>`
  };

  // =========================================================================
  // ШАБЛОНЫ ВАШЕГО РАСПИСАНИЯ ПО ДНЯМ НЕДЕЛИ
  // =========================================================================

  // 1. Понедельник, Среда, Пятница (без тренировки)
  const SCHEDULE_MON_WED_FRI = [
    { time: '05:30', title: 'Подъём, душ, стакан воды', category: 'health', priority: 'high' },
    { time: '05:45–06:30', title: 'Готовка на весь день (завтрак, обед, ужин)', category: 'personal', priority: 'medium' },
    { time: '06:30–06:45', title: 'Завтрак', category: 'health', priority: 'medium' },
    { time: '06:45–07:00', title: 'Английский (приложение, 15 мин)', category: 'study', priority: 'high' },
    { time: '07:00–07:40', title: 'Дорога на работу', category: 'personal', priority: 'low' },
    { time: '07:40–09:00', title: 'Чтение или английский', category: 'study', priority: 'medium' },
    { time: '09:00–20:00', title: 'Работа (обед: еда + 15 мин английский)', category: 'work', priority: 'high' },
    { time: '20:00–20:40', title: 'Дорога домой', category: 'personal', priority: 'low' },
    { time: '20:40–21:10', title: 'Ужин (разогреть)', category: 'health', priority: 'medium' },
    { time: '21:10–21:30', title: 'Душ', category: 'health', priority: 'low' },
    { time: '21:30–21:45', title: 'Учёба (15 мин)', category: 'study', priority: 'high' },
    { time: '21:45–22:15', title: 'Чтение (10–20 мин)', category: 'study', priority: 'medium' },
    { time: '22:15–22:45', title: 'Свободное время', category: 'personal', priority: 'low' },
    { time: '22:45–23:00', title: 'Подготовка ко сну', category: 'health', priority: 'medium' },
    { time: '23:00', title: 'Отбой', category: 'health', priority: 'high' }
  ];

  // 2. Вторник, Четверг (тренировка)
  const SCHEDULE_TUE_THU = [
    { time: '05:00', title: 'Подъём, душ, быстрый перекус', category: 'health', priority: 'high' },
    { time: '05:15–05:45', title: 'Готовка на день (простая: омлет/каша/курица с рисом, до 30 мин)', category: 'personal', priority: 'medium' },
    { time: '05:45–06:00', title: 'Сборы', category: 'personal', priority: 'low' },
    { time: '06:00–06:30', title: 'Дорога до зала (выход)', category: 'personal', priority: 'medium' },
    { time: '07:30–08:30', title: 'Тренировка в зале', category: 'health', priority: 'high' },
    { time: '08:30–09:00', title: 'Дорога на работу', category: 'personal', priority: 'low' },
    { time: '09:00–20:00', title: 'Работа (обед: еда + английский)', category: 'work', priority: 'high' },
    { time: '20:00–20:40', title: 'Дорога домой', category: 'personal', priority: 'low' },
    { time: '20:40–21:10', title: 'Ужин', category: 'health', priority: 'medium' },
    { time: '21:10–21:30', title: 'Душ', category: 'health', priority: 'low' },
    { time: '21:30–21:45', title: 'Учёба', category: 'study', priority: 'high' },
    { time: '21:45–22:15', title: 'Чтение', category: 'study', priority: 'medium' },
    { time: '22:15–22:45', title: 'Свободное время', category: 'personal', priority: 'low' },
    { time: '22:45–23:00', title: 'Подготовка ко сну', category: 'health', priority: 'medium' },
    { time: '23:00', title: 'Отбой', category: 'health', priority: 'high' }
  ];

  // 3. Суббота
  const SCHEDULE_SAT = [
    { time: '06:30', title: 'Подъём, душ, завтрак', category: 'health', priority: 'high' },
    { time: '07:00–07:45', title: 'Готовка на день', category: 'personal', priority: 'medium' },
    { time: '07:45–08:15', title: 'Английский', category: 'study', priority: 'high' },
    { time: '08:15–09:00', title: 'Дорога', category: 'personal', priority: 'low' },
    { time: '09:00–19:00', title: 'Работа', category: 'work', priority: 'high' },
    { time: '19:00–20:00', title: 'Дорога домой', category: 'personal', priority: 'low' },
    { time: '20:00–21:00', title: 'Ужин', category: 'health', priority: 'medium' },
    { time: '21:00–22:00', title: 'Прогулка или свободное время', category: 'personal', priority: 'low' },
    { time: '22:00–23:00', title: 'Чтение, отдых', category: 'study', priority: 'medium' },
    { time: '23:00', title: 'Отбой', category: 'health', priority: 'high' }
  ];

  // 4. Воскресенье
  const SCHEDULE_SUN = [
    { time: '07:30', title: 'Подъём, душ, завтрак', category: 'health', priority: 'high' },
    { time: '08:00–08:45', title: 'Готовка на день', category: 'personal', priority: 'medium' },
    { time: '08:45–09:20', title: 'Английский (35 мин)', category: 'study', priority: 'high' },
    { time: '09:20–10:00', title: 'Дорога на работу', category: 'personal', priority: 'low' },
    { time: '10:00–17:00', title: 'Работа', category: 'work', priority: 'high' },
    { time: '17:00–17:40', title: 'Дорога домой', category: 'personal', priority: 'low' },
    { time: '17:40–18:30', title: 'Ужин', category: 'health', priority: 'medium' },
    { time: '18:30–20:00', title: 'Прогулка (раз в неделю)', category: 'personal', priority: 'medium' },
    { time: '20:00–21:00', title: 'Чтение, отдых', category: 'study', priority: 'medium' },
    { time: '21:00–21:30', title: 'Планирование недели', category: 'study', priority: 'high' },
    { time: '21:30–22:30', title: 'Свободное время', category: 'personal', priority: 'low' },
    { time: '22:30–23:00', title: 'Подготовка ко сну', category: 'health', priority: 'medium' },
    { time: '23:00', title: 'Отбой', category: 'health', priority: 'high' }
  ];

  function getTemplateForDate(date) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
      return { type: 'mon_wed_fri', name: 'Пн / Ср / Пт (без тренировки)', items: SCHEDULE_MON_WED_FRI };
    } else if (dayOfWeek === 2 || dayOfWeek === 4) {
      return { type: 'tue_thu', name: 'Вт / Чт (день тренировки)', items: SCHEDULE_TUE_THU };
    } else if (dayOfWeek === 6) {
      return { type: 'sat', name: 'Суббота (с 06:30)', items: SCHEDULE_SAT };
    } else {
      return { type: 'sun', name: 'Воскресенье (с 07:30)', items: SCHEDULE_SUN };
    }
  }

  // --- App State ---
  let state = {
    currentDateKey: getTodayKey(),
    viewDateKey: getTodayKey(),
    activeFilter: 'all',
    activeCategory: 'all',
    searchQuery: '',
    soundEnabled: true,
    themeIndex: 0,
    ambientPlaying: false,
    ambientTrackIndex: 0,
    audioCtx: null,
    syncPin: '',
    syncStatus: 'offline', // 'offline', 'synced', 'syncing'
    lastSyncTimestamp: 0,
    days: {},
    habits: [],
    settings: {
      rolloverIncomplete: true
    },
    streak: { count: 1, lastCompletedDate: '' }
  };

  const AMBIENT_TRACKS = [
    { title: 'Глубокий Фокус', desc: 'Теплый розовый шум' },
    { title: 'Чистый Разум', desc: 'Альфа-частота 432 Гц' },
    { title: 'Дзен Студия', desc: 'Мягкий монохромный гул' }
  ];

  // --- Date Utilities ---
  function getTodayKey() {
    const now = new Date();
    return formatDateKey(now);
  }

  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseDateKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatHumanDate(date) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('ru-RU', options);
  }

  function getDayName(date) {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[date.getDay()];
  }

  function ensureDaySchedule(dateKey) {
    const dateObj = parseDateKey(dateKey);
    const template = getTemplateForDate(dateObj);

    if (!state.days[dateKey]) {
      state.days[dateKey] = {
        scheduleType: template.type,
        scheduleName: template.name,
        notes: '',
        tasks: template.items.map((item, idx) => ({
          id: `sched_${dateKey}_${idx}`,
          title: item.title,
          category: item.category,
          priority: item.priority,
          time: item.time,
          isScheduleItem: true,
          completed: false,
          createdAt: Date.now()
        }))
      };
    } else {
      if (!state.days[dateKey].tasks || state.days[dateKey].tasks.length === 0) {
        state.days[dateKey].scheduleType = template.type;
        state.days[dateKey].scheduleName = template.name;
        state.days[dateKey].tasks = template.items.map((item, idx) => ({
          id: `sched_${dateKey}_${idx}`,
          title: item.title,
          category: item.category,
          priority: item.priority,
          time: item.time,
          isScheduleItem: true,
          completed: false,
          createdAt: Date.now()
        }));
      }
    }
  }

  // --- PIN Generator & URL params check ---
  function generateRandomPin() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function checkUrlSyncParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get('pin');
    if (pinParam && pinParam.trim().length >= 4) {
      const cleanPin = pinParam.trim().toUpperCase();
      state.syncPin = cleanPin;
      localStorage.setItem(STORAGE_KEYS.SYNC_PIN, cleanPin);
      showToast(`Связан PIN из ссылки: ${cleanPin}`);
      initRealtimeSync();
      // Сразу подтягиваем облачные данные
      pullFromCloud(true);
      return true;
    }
    return false;
  }

  // --- LocalStorage Layer ---
  function loadFromStorage() {
    try {
      const storedDays = localStorage.getItem(STORAGE_KEYS.TASKS);
      const isV2Init = localStorage.getItem(STORAGE_KEYS.INITIALIZED_SCHEDULE);

      if (storedDays && isV2Init) {
        state.days = JSON.parse(storedDays);
      } else {
        state.days = {};
        ensureDaySchedule(state.currentDateKey);
        localStorage.setItem(STORAGE_KEYS.INITIALIZED_SCHEDULE, 'true');
      }

      const storedHabits = localStorage.getItem(STORAGE_KEYS.HABITS);
      if (storedHabits) {
        state.habits = JSON.parse(storedHabits);
      } else {
        state.habits = [
          { id: 'h1', title: 'Английский (каждый день)', icon: 'star', completedDates: [] },
          { id: 'h2', title: 'Чтение (10–30 мин)', icon: 'book', completedDates: [] },
          { id: 'h3', title: 'Стакан воды + душ утром', icon: 'water', completedDates: [] },
          { id: 'h4', title: 'Учёба / Проект', icon: 'code', completedDates: [] }
        ];
      }

      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (storedSettings) state.settings = { ...state.settings, ...JSON.parse(storedSettings) };

      const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (storedTheme && THEMES.includes(storedTheme)) {
        state.themeIndex = THEMES.indexOf(storedTheme);
      }

      const storedStreak = localStorage.getItem(STORAGE_KEYS.STREAK);
      if (storedStreak) state.streak = JSON.parse(storedStreak);

      // Загрузка PIN кода
      let pin = localStorage.getItem(STORAGE_KEYS.SYNC_PIN);
      if (!pin) {
        pin = generateRandomPin();
        localStorage.setItem(STORAGE_KEYS.SYNC_PIN, pin);
      }
      state.syncPin = pin;

      const lastTs = localStorage.getItem(STORAGE_KEYS.LAST_SYNC_TS);
      if (lastTs) state.lastSyncTimestamp = Number(lastTs);
    } catch (e) {
      console.warn('Storage warning:', e);
    }
  }

  function saveToStorage(andPushToCloud = true) {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.days));
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(state.habits));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
      localStorage.setItem(STORAGE_KEYS.THEME, THEMES[state.themeIndex]);
      localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(state.streak));
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, state.currentDateKey);
      localStorage.setItem(STORAGE_KEYS.SYNC_PIN, state.syncPin);

      if (andPushToCloud && state.syncPin) {
        debouncedPushToCloud();
      }
    } catch (e) {
      console.error('Save error:', e);
    }
  }

  // =========================================================================
  // ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ (ПК + ТЕЛЕФОН В РЕАЛЬНОМ ВРЕМЕНИ)
  // =========================================================================

  let cloudPushTimeout = null;
  let sseConnection = null;

  function initRealtimeSync() {
    if (!state.syncPin) return;

    if (sseConnection) {
      try { sseConnection.close(); } catch (e) {}
      sseConnection = null;
    }

    try {
      const topicUrl = `${CLOUD_SYNC_ENDPOINT}${state.syncPin}/sse`;
      sseConnection = new EventSource(topicUrl);

      sseConnection.onmessage = (event) => {
        try {
          if (!event.data) return;
          const entry = JSON.parse(event.data);
          if (entry.event === 'message' && entry.message) {
            const remoteData = JSON.parse(entry.message);
            applyRemoteData(remoteData, true);
          }
        } catch (e) {
          // ignore keepalive/ping
        }
      };

      sseConnection.onopen = () => {
        updateSyncUI('synced', 'Синхронизировано');
      };

      sseConnection.onerror = () => {
        // SSE авто-переподключается
      };
    } catch (err) {
      console.warn('Realtime SSE notice:', err);
    }
  }

  function applyRemoteData(remoteData, showNotification = true) {
    if (!remoteData || !remoteData.updatedAt) return;

    // Если данные с другого устройства свежее локальных — обновляем
    if (remoteData.updatedAt > (state.lastSyncTimestamp || 0)) {
      if (remoteData.days) state.days = remoteData.days;
      if (remoteData.habits) state.habits = remoteData.habits;
      if (remoteData.streak) state.streak = remoteData.streak;
      if (remoteData.settings) state.settings = { ...state.settings, ...remoteData.settings };

      state.lastSyncTimestamp = remoteData.updatedAt;
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TS, String(state.lastSyncTimestamp));
      saveToStorage(false); // сохраняем в local без повторного пуша
      renderAll();
      updateSyncUI('synced', 'Синхронизировано');
      if (showNotification) showToast('Данные синхронизированы с устройством');
    } else {
      updateSyncUI('synced', 'Синхронизировано');
    }
  }

  function debouncedPushToCloud() {
    clearTimeout(cloudPushTimeout);
    cloudPushTimeout = setTimeout(() => {
      pushToCloud();
    }, 600);
  }

  async function pushToCloud() {
    if (!state.syncPin) return;

    try {
      updateSyncUI('syncing', 'Синхронизация...');

      const payload = {
        updatedAt: Date.now(),
        days: state.days,
        habits: state.habits,
        streak: state.streak,
        settings: state.settings
      };

      const response = await fetch(`${CLOUD_SYNC_ENDPOINT}${state.syncPin}`, {
        method: 'POST',
        headers: {
          'Title': 'Daily Planner Sync',
          'Priority': 'default'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        state.lastSyncTimestamp = payload.updatedAt;
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TS, String(state.lastSyncTimestamp));
        updateSyncUI('synced', 'Синхронизировано');
      } else {
        updateSyncUI('offline', 'Оффлайн');
      }
    } catch (err) {
      console.warn('Cloud sync push warning:', err);
      updateSyncUI('offline', 'Оффлайн');
    }
  }

  async function pullFromCloud(forceOverWrite = false) {
    if (!state.syncPin) return;

    try {
      updateSyncUI('syncing', 'Загрузка...');

      const response = await fetch(`${CLOUD_SYNC_ENDPOINT}${state.syncPin}/json?poll=1&t=${Date.now()}`);
      if (!response.ok) {
        updateSyncUI('offline', 'Связан (Ожидание сети)');
        return;
      }

      const text = await response.text();
      if (!text || !text.trim()) {
        updateSyncUI('synced', 'Синхронизировано');
        return;
      }

      const lines = text.trim().split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]);
          if (entry.event === 'message' && entry.message) {
            const cloudData = JSON.parse(entry.message);
            if (forceOverWrite || (cloudData.updatedAt > (state.lastSyncTimestamp || 0))) {
              applyRemoteData(cloudData, forceOverWrite);
            }
            break;
          }
        } catch (e) {}
      }
      updateSyncUI('synced', 'Синхронизировано');
    } catch (err) {
      updateSyncUI('offline', 'Оффлайн');
    }
  }

  function startCloudPoller() {
    initRealtimeSync();

    // Фоновая проверка каждые 12 секунд для надежности при выходе из спящего режима
    setInterval(() => {
      pullFromCloud(false);
    }, 12000);
  }

  function updateSyncUI(status, label) {
    state.syncStatus = status;
    const badge = document.getElementById('btn-sync-status-indicator');
    const text = document.getElementById('sync-status-text');
    if (!badge || !text) return;

    badge.className = `cloud-sync-badge ${status}`;
    text.textContent = label;
  }

  function getSyncUrl() {
    return `${window.location.origin}${window.location.pathname}?pin=${state.syncPin}`;
  }

  function renderSyncModal() {
    const pinEl = document.getElementById('current-sync-pin');
    if (pinEl) pinEl.textContent = state.syncPin;

    // Генерируем ссылку для телефона
    const syncUrl = getSyncUrl();

    // Рисуем QR-код
    const canvas = document.getElementById('sync-qr-canvas');
    if (canvas && window.QRCode) {
      window.QRCode.toCanvas(canvas, syncUrl, {
        width: 170,
        margin: 1,
        color: {
          dark: '#111827',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('QR code render error:', error);
      });
    }
  }

  // --- Day Rollover & Midnight Refresh ---
  function checkAndHandleDayRollover() {
    const today = getTodayKey();
    const lastActive = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_DATE) || today;

    ensureDaySchedule(today);

    if (lastActive !== today) {
      const yesterdayData = state.days[lastActive];
      if (yesterdayData && yesterdayData.tasks) {
        if (state.settings.rolloverIncomplete) {
          const manualIncomplete = yesterdayData.tasks.filter(t => !t.completed && !t.isScheduleItem);
          manualIncomplete.forEach(task => {
            const alreadyExists = state.days[today].tasks.some(t => t.id === task.id || t.title === task.title);
            if (!alreadyExists) {
              state.days[today].tasks.push({
                ...task,
                rolledOverFrom: lastActive
              });
            }
          });
        }
      }

      state.currentDateKey = today;
      state.viewDateKey = today;
      saveToStorage(true);
      showToast('Новый день начался. Расписание загружено.');
    } else {
      state.currentDateKey = today;
    }
  }

  function startMidnightScheduler() {
    setInterval(() => {
      const liveToday = getTodayKey();
      if (liveToday !== state.currentDateKey) {
        checkAndHandleDayRollover();
        updateDateTimeDisplay();
        renderAll();
      }
    }, 10000);
  }

  // --- Sound Synthesizer ---
  function playClickSound(type = 'click') {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'complete') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'delete') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(750, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      }
    } catch (e) {}
  }

  function getAudioContext() {
    if (!state.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioContextClass();
    }
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
    return state.audioCtx;
  }

  let ambientNodes = null;

  function toggleAmbientSound() {
    const ctx = getAudioContext();
    const playIcon = document.getElementById('ambient-play-icon');
    if (state.ambientPlaying) {
      if (ambientNodes) {
        ambientNodes.gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        setTimeout(() => {
          if (ambientNodes) {
            ambientNodes.osc1.stop();
            ambientNodes = null;
          }
        }, 450);
      }
      state.ambientPlaying = false;
      playIcon.innerHTML = `<polygon points="6 4 20 12 6 20 6 4" fill="currentColor"/>`;
      document.getElementById('ambient-state-text').textContent = 'Пауза';
    } else {
      startAmbientSynth();
      state.ambientPlaying = true;
      playIcon.innerHTML = `<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>`;
      document.getElementById('ambient-state-text').textContent = AMBIENT_TRACKS[state.ambientTrackIndex].desc;
    }
  }

  function startAmbientSynth() {
    const ctx = getAudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 420;

    const baseFreqs = [196, 216, 164];
    const freq = baseFreqs[state.ambientTrackIndex] || 216;

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, ctx.currentTime);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.5, ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.8);

    osc1.start();
    osc2.start();

    ambientNodes = { osc1, osc2, gain, filter };
  }

  // --- Clock & Header Time ---
  function updateDateTimeDisplay() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const clockEl = document.getElementById('clock-display');
    if (clockEl) clockEl.textContent = `${hours}:${minutes}`;

    const dayNameEl = document.getElementById('day-name-display');
    if (dayNameEl) dayNameEl.textContent = getDayName(now);

    const dateDisplayEl = document.getElementById('date-display');
    if (dateDisplayEl) dateDisplayEl.textContent = formatHumanDate(now);
  }

  // --- Tasks Renderer ---
  function renderTasks() {
    ensureDaySchedule(state.viewDateKey);

    const currentDayData = state.days[state.viewDateKey] || { tasks: [], notes: '' };
    const tasksListContainer = document.getElementById('tasks-list');
    const emptyState = document.getElementById('empty-state-view');
    const viewTitle = document.getElementById('current-view-title');
    const countBadge = document.getElementById('task-count-badge');

    const isToday = state.viewDateKey === state.currentDateKey;
    const viewDateObj = parseDateKey(state.viewDateKey);
    const dayOfWeekName = getDayName(viewDateObj);
    const scheduleTemplate = getTemplateForDate(viewDateObj);

    viewTitle.textContent = isToday 
      ? `Планы на Сегодня (${scheduleTemplate.name})`
      : `${dayOfWeekName}: ${formatHumanDate(viewDateObj)} (${scheduleTemplate.name})`;

    let tasks = [...currentDayData.tasks];

    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || (t.time && t.time.toLowerCase().includes(q)));
    }

    if (state.activeCategory !== 'all') {
      tasks = tasks.filter(t => t.category === state.activeCategory);
    }

    if (state.activeFilter === 'active') {
      tasks = tasks.filter(t => !t.completed);
    } else if (state.activeFilter === 'completed') {
      tasks = tasks.filter(t => t.completed);
    }

    countBadge.textContent = `${tasks.length} ${getNounEnding(tasks.length, 'пункт', 'пункта', 'пунктов')}`;
    tasksListContainer.innerHTML = '';

    if (tasks.length === 0) {
      emptyState.style.display = 'flex';
      tasksListContainer.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      tasksListContainer.style.display = 'flex';

      const catLabels = {
        work: 'Работа',
        personal: 'Личное',
        study: 'Учёба',
        health: 'Здоровье'
      };

      tasks.forEach(task => {
        const itemEl = document.createElement('div');
        itemEl.className = `task-item-card ${task.completed ? 'is-completed' : ''}`;
        itemEl.setAttribute('data-id', task.id);
        itemEl.setAttribute('data-priority', task.priority || 'medium');

        itemEl.innerHTML = `
          <button class="task-check-circle ${task.completed ? 'checked' : ''}" title="${task.completed ? 'Отменить' : 'Выполнено'}"></button>
          <div class="task-content-main">
            <span class="task-title">${escapeHtml(task.title)}</span>
            <div class="task-badges">
              ${task.time ? `
                <span class="badge-tag badge-time">
                  ${ICONS.clock} ${task.time}
                </span>` : ''}
              <span class="badge-tag badge-cat ${task.category}">
                ${ICONS[task.category] || ''} ${catLabels[task.category] || task.category}
              </span>
              ${task.isScheduleItem ? `
                <span class="badge-tag badge-recurring" title="Часть регулярного расписания">
                  ${ICONS.repeat} Режим дня
                </span>` : ''}
              ${task.rolledOverFrom ? `
                <span class="badge-tag badge-time" title="Перенесена">
                  ${ICONS.rollover} С прошлого дня
                </span>` : ''}
            </div>
          </div>
          <button class="task-delete-btn" title="Удалить пункт">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        `;

        const checkBtn = itemEl.querySelector('.task-check-circle');
        checkBtn.addEventListener('click', () => toggleTaskComplete(task.id));

        const delBtn = itemEl.querySelector('.task-delete-btn');
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteTask(task.id);
        });

        tasksListContainer.appendChild(itemEl);
      });
    }

    renderStats();
  }

  function renderStats() {
    const currentDayData = state.days[state.viewDateKey] || { tasks: [] };
    const total = currentDayData.tasks.length;
    const completed = currentDayData.tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-done').textContent = completed;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('progress-percentage').textContent = `${pct}%`;
    document.getElementById('progress-bar-fill').style.width = `${pct}%`;
  }

  // --- Calendar Renderer ---
  let calDisplayMonth = new Date().getMonth();
  let calDisplayYear = new Date().getFullYear();

  function renderCalendar() {
    const daysGrid = document.getElementById('cal-days-grid');
    const monthYearTitle = document.getElementById('cal-month-year');
    daysGrid.innerHTML = '';

    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    monthYearTitle.textContent = `${monthNames[calDisplayMonth]} ${calDisplayYear}`;

    const firstDayIndex = (new Date(calDisplayYear, calDisplayMonth, 1).getDay() + 6) % 7;
    const lastDayOfMonth = new Date(calDisplayYear, calDisplayMonth + 1, 0).getDate();
    const prevMonthLastDay = new Date(calDisplayYear, calDisplayMonth, 0).getDate();

    for (let x = firstDayIndex; x > 0; x--) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.textContent = prevMonthLastDay - x + 1;
      daysGrid.appendChild(cell);
    }

    for (let i = 1; i <= lastDayOfMonth; i++) {
      const cell = document.createElement('div');
      const cellDateKey = `${calDisplayYear}-${String(calDisplayMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      cell.className = 'cal-day-cell';
      cell.textContent = i;

      if (cellDateKey === state.currentDateKey) {
        cell.classList.add('today');
      }
      if (cellDateKey === state.viewDateKey) {
        cell.classList.add('selected');
      }

      cell.classList.add('has-tasks');

      cell.addEventListener('click', () => {
        state.viewDateKey = cellDateKey;
        ensureDaySchedule(cellDateKey);
        playClickSound();
        renderAll();
      });

      daysGrid.appendChild(cell);
    }
  }

  // --- Habits Renderer ---
  function renderHabits() {
    const container = document.getElementById('habits-container');
    container.innerHTML = '';

    state.habits.forEach(habit => {
      const isDoneToday = habit.completedDates && habit.completedDates.includes(state.currentDateKey);
      const streak = calculateHabitStreak(habit);
      const iconSvg = ICONS[habit.icon] || ICONS.star;

      const el = document.createElement('div');
      el.className = `habit-item ${isDoneToday ? 'done' : ''}`;
      el.innerHTML = `
        <div class="habit-left">
          <div class="squircle-habit-icon">
            ${iconSvg}
          </div>
          <div>
            <div class="habit-title">${escapeHtml(habit.title)}</div>
            <div class="habit-streak">${streak > 0 ? `Стрик: ${streak} дн.` : 'Каждый день'}</div>
          </div>
        </div>
        <button class="habit-toggle-btn" title="Отметить на сегодня">${isDoneToday ? '✓' : ''}</button>
      `;

      el.querySelector('.habit-toggle-btn').addEventListener('click', () => {
        toggleHabit(habit.id);
      });

      container.appendChild(el);
    });
  }

  function calculateHabitStreak(habit) {
    if (!habit.completedDates || habit.completedDates.length === 0) return 0;
    return habit.completedDates.length;
  }

  function toggleHabit(habitId) {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;

    if (!habit.completedDates) habit.completedDates = [];
    const idx = habit.completedDates.indexOf(state.currentDateKey);
    if (idx >= 0) {
      habit.completedDates.splice(idx, 1);
      playClickSound('click');
    } else {
      habit.completedDates.push(state.currentDateKey);
      playClickSound('complete');
      showToast(`Фокус "${habit.title}" выполнен!`);
    }

    saveToStorage(true);
    renderHabits();
  }

  function renderNotes() {
    const textarea = document.getElementById('daily-notes-textarea');
    const dayData = state.days[state.viewDateKey] || { notes: '' };
    textarea.value = dayData.notes || '';
  }

  // --- Task CRUD ---
  function addTask(title, category, priority, time, isRecurring) {
    if (!title.trim()) return;

    ensureDaySchedule(state.viewDateKey);

    const newTask = {
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title.trim(),
      category: category || 'work',
      priority: priority || 'medium',
      time: time || '',
      isScheduleItem: false,
      isRecurring: Boolean(isRecurring),
      completed: false,
      createdAt: Date.now()
    };

    state.days[state.viewDateKey].tasks.push(newTask);
    saveToStorage(true);
    playClickSound('click');
    showToast('Задача добавлена в расписание');
    renderTasks();
    renderCalendar();
  }

  function toggleTaskComplete(taskId) {
    const currentDay = state.days[state.viewDateKey];
    if (!currentDay) return;

    const task = currentDay.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    saveToStorage(true);

    if (task.completed) {
      playClickSound('complete');
      checkAllTasksCompleted();
    } else {
      playClickSound('click');
    }

    renderTasks();
  }

  function deleteTask(taskId) {
    const currentDay = state.days[state.viewDateKey];
    if (!currentDay) return;

    currentDay.tasks = currentDay.tasks.filter(t => t.id !== taskId);
    saveToStorage(true);
    playClickSound('delete');
    renderTasks();
    renderCalendar();
  }

  function clearCompletedTasks() {
    const currentDay = state.days[state.viewDateKey];
    if (!currentDay) return;

    const beforeLen = currentDay.tasks.length;
    currentDay.tasks = currentDay.tasks.filter(t => !t.completed);
    if (beforeLen !== currentDay.tasks.length) {
      saveToStorage(true);
      playClickSound('delete');
      showToast('Завершенные пункты очищены');
      renderTasks();
    }
  }

  function checkAllTasksCompleted() {
    const currentDay = state.days[state.viewDateKey];
    if (!currentDay || currentDay.tasks.length === 0) return;

    const allDone = currentDay.tasks.every(t => t.completed);
    if (allDone) {
      showToast('Отличный день! Все дела по расписанию выполнены!');
      updateStreak();
    }
  }

  function updateStreak() {
    if (state.streak.lastCompletedDate !== state.currentDateKey) {
      state.streak.count = (state.streak.count || 0) + 1;
      state.streak.lastCompletedDate = state.currentDateKey;
      saveToStorage(true);
      const el = document.getElementById('streak-counter');
      if (el) el.textContent = `Стрик: ${state.streak.count} ${getNounEnding(state.streak.count, 'день', 'дня', 'дней')}`;
    }
  }

  function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2600);
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getNounEnding(number, one, two, five) {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) return five;
    n %= 10;
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return two;
    return five;
  }

  function applyTheme() {
    const theme = THEMES[state.themeIndex];
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  function cycleTheme() {
    state.themeIndex = (state.themeIndex + 1) % THEMES.length;
    applyTheme();
    playClickSound();
    const names = {
      'glass': 'Студийный фрост',
      'warm-neu': 'Теплый неоморфизм',
      'dark': 'Глубокий космос'
    };
    showToast(`Тема: ${names[THEMES[state.themeIndex]]}`);
  }

  function renderAll() {
    renderCalendar();
    renderTasks();
    renderHabits();
    renderNotes();
  }

  // --- Listeners ---
  function initListeners() {
    const form = document.getElementById('new-task-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const titleInput = document.getElementById('task-title-input');
      const catSelect = document.getElementById('task-category-select');
      const prioritySelect = document.getElementById('task-priority-select');
      const timeInput = document.getElementById('task-time-input');
      const recurringCheck = document.getElementById('task-recurring-input');

      addTask(
        titleInput.value,
        catSelect.value,
        prioritySelect.value,
        timeInput.value,
        recurringCheck.checked
      );

      titleInput.value = '';
      timeInput.value = '';
      recurringCheck.checked = false;
      titleInput.focus();
    });

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderTasks();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInput.focus();
      }
    });

    document.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        state.activeFilter = e.currentTarget.getAttribute('data-filter');
        playClickSound();
        renderTasks();
      });
    });

    document.querySelectorAll('.cat-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        state.activeCategory = e.currentTarget.getAttribute('data-cat');
        playClickSound();
        renderTasks();
      });
    });

    document.getElementById('btn-show-all-tags').addEventListener('click', () => {
      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      const allPill = document.querySelector('.cat-pill[data-cat="all"]');
      if (allPill) allPill.classList.add('active');
      state.activeCategory = 'all';
      renderTasks();
    });

    document.getElementById('btn-clear-completed').addEventListener('click', clearCompletedTasks);

    document.getElementById('cal-prev').addEventListener('click', () => {
      calDisplayMonth--;
      if (calDisplayMonth < 0) {
        calDisplayMonth = 11;
        calDisplayYear--;
      }
      playClickSound();
      renderCalendar();
    });

    document.getElementById('cal-next').addEventListener('click', () => {
      calDisplayMonth++;
      if (calDisplayMonth > 11) {
        calDisplayMonth = 0;
        calDisplayYear++;
      }
      playClickSound();
      renderCalendar();
    });

    document.getElementById('cal-today-btn').addEventListener('click', () => {
      const now = new Date();
      calDisplayMonth = now.getMonth();
      calDisplayYear = now.getFullYear();
      state.viewDateKey = state.currentDateKey;
      ensureDaySchedule(state.viewDateKey);
      playClickSound();
      renderAll();
    });

    const notesArea = document.getElementById('daily-notes-textarea');
    let saveTimeout;
    notesArea.addEventListener('input', (e) => {
      const status = document.getElementById('notes-status');
      status.textContent = 'Сохранение...';
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        if (!state.days[state.viewDateKey]) {
          state.days[state.viewDateKey] = { tasks: [], notes: '' };
        }
        state.days[state.viewDateKey].notes = e.target.value;
        saveToStorage(true);
        status.textContent = 'Сохранено';
      }, 500);
    });

    document.getElementById('btn-theme-toggle').addEventListener('click', cycleTheme);

    document.getElementById('btn-sound-toggle').addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      const icon = document.getElementById('icon-sound');
      if (state.soundEnabled) {
        showToast('Звуки включены');
        icon.style.opacity = '1';
      } else {
        showToast('Звуки отключены');
        icon.style.opacity = '0.4';
      }
    });

    document.querySelector('.dock-btn[data-view="today"]').addEventListener('click', () => {
      state.viewDateKey = state.currentDateKey;
      const now = new Date();
      calDisplayMonth = now.getMonth();
      calDisplayYear = now.getFullYear();
      ensureDaySchedule(state.viewDateKey);
      playClickSound();
      renderAll();
    });

    const rolloverCheck = document.getElementById('setting-rollover');
    rolloverCheck.checked = state.settings.rolloverIncomplete;
    rolloverCheck.addEventListener('change', (e) => {
      state.settings.rolloverIncomplete = e.target.checked;
      saveToStorage(true);
      showToast(e.target.checked ? 'Перенос хвостов включен' : 'Перенос хвостов выключен');
    });

    // Тест перехода дня
    document.getElementById('btn-test-new-day').addEventListener('click', () => {
      const d = parseDateKey(state.currentDateKey);
      d.setDate(d.getDate() + 1);
      const fakeTomorrow = formatDateKey(d);

      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, state.currentDateKey);
      state.currentDateKey = fakeTomorrow;
      state.viewDateKey = fakeTomorrow;
      checkAndHandleDayRollover();
      renderAll();
      showToast(`Имитация: ${getDayName(d)} (${fakeTomorrow})`);
    });

    // --- МОДАЛЬНОЕ ОКНО СИНХРОНИЗАЦИИ ---
    const syncModal = document.getElementById('sync-modal');
    const openSyncModal = () => {
      renderSyncModal();
      syncModal.style.display = 'flex';
    };

    document.getElementById('btn-open-sync-modal').addEventListener('click', openSyncModal);
    document.getElementById('btn-sync-status-indicator').addEventListener('click', openSyncModal);
    document.getElementById('btn-sync-action-btn').addEventListener('click', openSyncModal);

    const closeSyncModal = () => {
      syncModal.style.display = 'none';
    };
    document.getElementById('btn-close-sync-modal').addEventListener('click', closeSyncModal);
    document.getElementById('btn-close-sync-modal-footer').addEventListener('click', closeSyncModal);

    // Копирование PIN
    document.getElementById('btn-copy-pin').addEventListener('click', () => {
      navigator.clipboard.writeText(state.syncPin).then(() => {
        showToast(`PIN код ${state.syncPin} скопирован!`);
      });
    });

    // Копирование прямой ссылки для телефона
    const copyLinkBtn = document.getElementById('btn-copy-sync-link');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', () => {
        const url = getSyncUrl();
        navigator.clipboard.writeText(url).then(() => {
          showToast('Ссылка скопирована! Отправьте её в мессенджер');
        }).catch(() => {
          prompt('Скопируйте ссылку вручную:', url);
        });
      });
    }

    // Подключение к существующему PIN
    document.getElementById('btn-connect-pin').addEventListener('click', () => {
      const pinInput = document.getElementById('manual-pin-input');
      const val = pinInput.value.trim().toUpperCase();
      if (!val || val.length < 4) {
        showToast('Введите корректный PIN код');
        return;
      }
      state.syncPin = val;
      localStorage.setItem(STORAGE_KEYS.SYNC_PIN, val);
      renderSyncModal();
      initRealtimeSync();
      pullFromCloud(true);
      showToast(`Подключено к PIN: ${val}`);
    });

    // Принудительная отправка
    document.getElementById('btn-force-push').addEventListener('click', () => {
      pushToCloud();
      showToast('Принудительно отправлено в облако');
    });

    // Модальное окно фокуса
    const habitModal = document.getElementById('habit-modal');
    document.getElementById('btn-add-habit-modal').addEventListener('click', () => {
      habitModal.style.display = 'flex';
    });

    document.getElementById('btn-close-modal').addEventListener('click', () => {
      habitModal.style.display = 'none';
    });
    document.getElementById('btn-cancel-modal').addEventListener('click', () => {
      habitModal.style.display = 'none';
    });

    let selectedHabitIcon = 'star';
    document.querySelectorAll('.squircle-choice').forEach(b => {
      b.addEventListener('click', (e) => {
        document.querySelectorAll('.squircle-choice').forEach(x => x.classList.remove('active'));
        e.currentTarget.classList.add('active');
        selectedHabitIcon = e.currentTarget.getAttribute('data-icon');
      });
    });

    document.getElementById('btn-save-habit').addEventListener('click', () => {
      const habitInput = document.getElementById('habit-title-input');
      const title = habitInput.value.trim();
      if (!title) return;

      state.habits.push({
        id: 'h_' + Date.now(),
        title,
        icon: selectedHabitIcon,
        completedDates: []
      });

      saveToStorage(true);
      habitInput.value = '';
      habitModal.style.display = 'none';
      playClickSound('complete');
      showToast('Новый фокус сохранен');
      renderHabits();
    });

    // Плеер
    document.getElementById('ambient-toggle').addEventListener('click', toggleAmbientSound);
    document.getElementById('ambient-next').addEventListener('click', () => {
      state.ambientTrackIndex = (state.ambientTrackIndex + 1) % AMBIENT_TRACKS.length;
      document.getElementById('ambient-title-text').textContent = AMBIENT_TRACKS[state.ambientTrackIndex].title;
      if (state.ambientPlaying) {
        toggleAmbientSound();
        toggleAmbientSound();
      }
    });
    document.getElementById('ambient-prev').addEventListener('click', () => {
      state.ambientTrackIndex = (state.ambientTrackIndex - 1 + AMBIENT_TRACKS.length) % AMBIENT_TRACKS.length;
      document.getElementById('ambient-title-text').textContent = AMBIENT_TRACKS[state.ambientTrackIndex].title;
      if (state.ambientPlaying) {
        toggleAmbientSound();
        toggleAmbientSound();
      }
    });
  }

  // --- Initial Launch ---
  function init() {
    loadFromStorage();
    checkUrlSyncParam();
    applyTheme();
    checkAndHandleDayRollover();
    initListeners();
    updateDateTimeDisplay();
    renderAll();
    startMidnightScheduler();

    // Первичная подтяжка из облака и запуск фонового поллера
    pullFromCloud(false);
    startCloudPoller();

    setInterval(updateDateTimeDisplay, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
