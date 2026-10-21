
/* ------------------------------------------------------------
   0. PATH RESOLVER
------------------------------------------------------------ */
const SUBFOLDERS = ['auth', 'booking', 'patient', 'staff', 'public'];

const BASE_PATH = (function () {
  const p = window.location.pathname;
  return SUBFOLDERS.some(f => p.includes('/' + f + '/')) ? '../' : '';
})();

function url(path) {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  return BASE_PATH + path;
}


/* ------------------------------------------------------------
   0b. SKIP LINK (accessibility)
------------------------------------------------------------ */
function injectSkipLink() {
  if (document.querySelector('.skip-link')) return;

  const main = document.querySelector('main');
  if (!main) return;

  if (!main.id) main.id = 'main';
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');

  const skip = document.createElement('a');
  skip.href = '#main';
  skip.className = 'skip-link';
  skip.textContent = 'Skip to content';

  skip.addEventListener('click', (e) => {
    e.preventDefault();
    main.focus();
    main.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.body.insertBefore(skip, document.body.firstChild);
}


/* ------------------------------------------------------------
   0c. API CLIENT
   ------------------------------------------------------------
    */
const Api = {
  _cache: {
    appointments: [],
    smsLog: [],
  },

  async _fetch(path, options = {}) {
    const res = await fetch(path, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || ('Request failed: ' + res.status));
    }
    return res.json();
  },

  /* ---- Appointments ---- */
  async loadAppointments() {
    try {
      this._cache.appointments = await this._fetch('/api/appointments');
    } catch (err) {
      console.error('[Api] loadAppointments failed:', err);
      this._cache.appointments = [];
    }
    window.APPOINTMENTS_CACHE = this._cache.appointments;
    return this._cache.appointments;
  },

  async createAppointment(appointment) {
    const created = await this._fetch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(appointment),
    });
    this._cache.appointments.push(created);
    window.APPOINTMENTS_CACHE = this._cache.appointments;
    return created;
  },

  async updateAppointment(id, patch) {
    const updated = await this._fetch('/api/appointments/' + id, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    const idx = this._cache.appointments.findIndex(a => a.id === id);
    if (idx !== -1) this._cache.appointments[idx] = updated;
    window.APPOINTMENTS_CACHE = this._cache.appointments;
    return updated;
  },

  /* ---- SMS Log ---- */
  async loadSmsLog() {
    try {
      this._cache.smsLog = await this._fetch('/api/sms-log');
    } catch (err) {
      console.error('[Api] loadSmsLog failed:', err);
      this._cache.smsLog = [];
    }
    return this._cache.smsLog;
  },

  async createSms(entry) {
    const created = await this._fetch('/api/sms-log', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
    this._cache.smsLog.push(created);
    return created;
  },
};

window.Api = Api;


/* ------------------------------------------------------------
   1. NAVBAR (event delegation)
------------------------------------------------------------ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  navbar.addEventListener('click', (e) => {
    if (e.target.closest('.navbar__toggle')) {
      navbar.classList.toggle('is-open');
      return;
    }
    if (e.target.closest('.navbar__links a')) {
      navbar.classList.remove('is-open');
    }
  });
}

function highlightActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.navbar__links a').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (/^(https?:|mailto:|tel:|#)/.test(href)) return;
    const clean = href.replace(/^(\.\.\/)+/, '');
    link.classList.toggle('is-active', path.endsWith(clean));
  });
}


/* ------------------------------------------------------------
   2. NAVBAR
   ------------------------------------------------------------
    */
function renderNavbarAuth() {
  const linksList = document.querySelector('.navbar__links');
  const actions   = document.querySelector('.navbar__actions');
  if (!actions) return;

  const session = Session.get();
  const hamburgerHTML = actions.querySelector('.navbar__toggle')?.outerHTML || '';

  document.body.classList.toggle('is-staff', session?.role === 'staff');

  /* ---- NAV LINKS ---- */
  if (linksList) {
    if (session?.role === 'staff') {
      linksList.innerHTML = `
        <li><a href="${url('staff/dashboard.html')}">Dashboard</a></li>
        <li><a href="${url('staff/appointments.html')}">Appointments</a></li>
        <li><a href="${url('staff/calendar.html')}">Calendar</a></li>
        <li><a href="${url('staff/dentists.html')}">Dentists</a></li>
        <li><a href="${url('staff/services.html')}">Services</a></li>
        <li><a href="${url('staff/sms-log.html')}">SMS Log</a></li>
      `;
    } else if (session?.role === 'patient') {
      linksList.innerHTML = `
        <li><a href="${url('index.html')}">Home</a></li>
        <li><a href="${url('public/services.html')}">Services</a></li>
        <li><a href="${url('public/clinics.html')}">Clinics</a></li>
        <li><a href="${url('patient/dashboard.html')}">My Appointments</a></li>
      `;
    } else {
      linksList.innerHTML = `
        <li><a href="${url('index.html')}">Home</a></li>
        <li><a href="${url('public/services.html')}">Services</a></li>
        <li><a href="${url('public/clinics.html')}">Clinics</a></li>
        <li><a href="${url('auth/login.html')}">Patient Login</a></li>
        <li><a href="${url('staff/login.html')}">Staff Login</a></li>
      `;
    }
  }

  /* ---- ACTIONS ---- */
  if (session?.role === 'patient') {
    const first = session.name?.split(' ')[0] || 'Patient';
    actions.innerHTML = `
      <span class="navbar__greeting">Hi, <strong>${first}</strong></span>
      <button class="btn btn--primary btn--sm" id="navLogoutBtn">Log Out</button>
      ${hamburgerHTML}
    `;
    actions.querySelector('#navLogoutBtn')
      ?.addEventListener('click', () => Session.logout());

  } else if (session?.role === 'staff') {
    actions.innerHTML = `
      <span class="navbar__greeting">Staff: <strong>${session.name || 'User'}</strong></span>
      <button class="btn btn--primary btn--sm" id="navLogoutBtn">Log Out</button>
      ${hamburgerHTML}
    `;
    actions.querySelector('#navLogoutBtn')
      ?.addEventListener('click', () => Session.logout());

  } else {
    actions.innerHTML = `
      <a href="${url('auth/login.html')}" class="btn btn--ghost btn--sm">Log In</a>
      <a href="${url('public/services.html')}" class="btn btn--primary btn--sm">Book Now</a>
      ${hamburgerHTML}
    `;
  }
}


/* ------------------------------------------------------------
   3. TOAST (aria-live for screen readers)
------------------------------------------------------------ */
function showToast(message, type = 'info', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast toast--' + type;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}


/* ------------------------------------------------------------
   4. MODAL HELPERS (a11y + focus trap)
------------------------------------------------------------ */
function createModal(innerHtml, ariaLabel = 'Dialog') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', ariaLabel);

  overlay._previousFocus = document.activeElement;

  overlay.innerHTML = '<div class="modal-box" tabindex="-1">' + innerHtml + '</div>';
  document.body.appendChild(overlay);

  const box = overlay.querySelector('.modal-box');
  box.focus();

  function onKey(e) {
    if (e.key === 'Escape') { closeModal(overlay); return; }
    if (e.key !== 'Tab') return;

    const focusable = overlay.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
  document.addEventListener('keydown', onKey);
  overlay._onKey = onKey;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
  overlay.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(overlay));
  });

  return overlay;
}

function closeModal(overlay) {
  if (!overlay) return;
  if (overlay._onKey) document.removeEventListener('keydown', overlay._onKey);

  const previousFocus = overlay._previousFocus;
  overlay.remove();

  if (previousFocus && typeof previousFocus.focus === 'function') {
    previousFocus.focus();
  }
}


/* ------------------------------------------------------------
   5. LOCALSTORAGE DB
   ------------------------------------------------------------
 */
const DB = {
  prefix: 'dentabook_',
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.warn('DB.get("' + key + '") failed:', err);
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (err) {
      console.warn('DB.set("' + key + '") failed:', err);
    }
  },
  push(key, item) {
    const list = this.get(key, []);
    list.push(item);
    this.set(key, list);
    return list;
  },
  remove(key) { localStorage.removeItem(this.prefix + key); },
  clearAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .forEach(k => localStorage.removeItem(k));
  },
};


/* ------------------------------------------------------------
   6. SESSION + GUARDS
------------------------------------------------------------ */
const Session = {
  set(user) { DB.set('session', user); },
  get()     { return DB.get('session'); },
  clear()   { DB.remove('session'); },
  isPatient() { return this.get()?.role === 'patient'; },
  isStaff()   { return this.get()?.role === 'staff'; },
  logout() {
    this.clear();
    showToast('Logged out.', 'info');
    setTimeout(() => window.location.href = url('index.html'), 600);
  },
};

function requirePatient() {
  if (!Session.isPatient()) {
    showToast('Please log in as a patient first.', 'warning');
    setTimeout(() => window.location.href = url('auth/login.html'), 800);
    return false;
  }
  return true;
}

function requireStaff() {
  if (!Session.isStaff()) {
    showToast('Staff access required.', 'warning');
    setTimeout(() => window.location.href = url('staff/login.html'), 800);
    return false;
  }
  return true;
}


/* ------------------------------------------------------------
   7. SIMULATED SMS (async — persists to server)
------------------------------------------------------------ */
async function sendSms(phone, type, message) {
  try {
    const entry = await Api.createSms({ phone, type, message });
    showToast('SMS sent to ' + phone, 'info');
    return entry;
  } catch (err) {
    console.error('[sendSms] failed:', err);
    showToast('SMS log failed to save (server offline?)', 'warning');
    return null;
  }
}


/* ------------------------------------------------------------
   8. SLOT GENERATOR
   ------------------------------------------------------------
   Reads from window.APPOINTMENTS_CACHE (populated by
   Api.loadAppointments()).
------------------------------------------------------------ */
function generateSlotsForDate(dateStr, dentistId, serviceId) {
  const service = getServiceById(serviceId);
  if (!service) return [];

  const slots = [];
  const start = new Date(dateStr + 'T09:00:00');
  const end   = new Date(dateStr + 'T17:00:00');

  const all = window.APPOINTMENTS_CACHE || [];
  const taken = all
    .filter(a =>
      a.dentistId === dentistId &&
      a.start.startsWith(dateStr) &&
      ['pending', 'confirmed'].includes(a.status)
    )
    .map(a => ({
      start: new Date(a.start).getTime(),
      end:   new Date(a.end).getTime(),
    }));

  for (let t = start.getTime(); t + service.duration * 60000 <= end.getTime(); t += 30 * 60000) {
    const s = t;
    const e = t + service.duration * 60000;
    const conflict = taken.some(r => s < r.end && e > r.start);
    slots.push({
      start: new Date(s).toISOString(),
      end:   new Date(e).toISOString(),
      label: new Date(s).toLocaleTimeString('en-PH', {
        hour: 'numeric', minute: '2-digit', hour12: true,
      }),
      available: !conflict,
    });
  }
  return slots;
}


/* ------------------------------------------------------------
   9. UTILITIES
------------------------------------------------------------ */
function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function generateBookingRef() {
  const year = new Date().getFullYear();
  const num = Math.floor(100 + Math.random() * 900);
  return 'DTB-' + year + '-00' + num;
}

function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}


/* ------------------------------------------------------------
   10. INIT
------------------------------------------------------------ */
function initAll() {
  injectSkipLink();
  initNavbar();
  renderNavbarAuth();
  highlightActiveNav();
}

initAll();
document.addEventListener('DOMContentLoaded', initAll);