/* ============================================================
   DentaBook — Shared JavaScript (js/main.js)
   ============================================================ */


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
   1. NAVBAR
   ------------------------------------------------------------
------------------------------------------------------------ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  navbar.addEventListener('click', (e) => {
    // Toggle mobile menu when the hamburger is clicked
    if (e.target.closest('.navbar__toggle')) {
      navbar.classList.toggle('is-open');
      return;
    }
    // Auto-close menu when a nav link is clicked
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
   2. SESSION-AWARE NAVBAR
   ------------------------------------------------------------
   Rewrites BOTH .navbar__links and .navbar__actions based on
   the current session role.

     Guest   → Home · Services · Clinics · Patient Login · Staff Login
     Patient → Home · Services · Clinics · My Appointments
     Staff   → Dashboard · Appointments · Calendar · Dentists · Services · SMS Log
------------------------------------------------------------ */
function renderNavbarAuth() {
  const linksList = document.querySelector('.navbar__links');
  const actions   = document.querySelector('.navbar__actions');
  if (!actions) return;

  const session = Session.get();

  // Preserve the hamburger button before we replace the actions area
  const hamburgerHTML = actions.querySelector('.navbar__toggle')?.outerHTML || '';

  // Body flag for staff-only CSS hooks
  document.body.classList.toggle('is-staff', session?.role === 'staff');

  /* ---------- NAV LINKS ---------- */
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

  /* ---------- ACTIONS ---------- */
  if (session?.role === 'patient') {
    const first = session.name?.split(' ')[0] || 'Patient';
    actions.innerHTML = `
      <span class="navbar__greeting">Hi, <strong>${first}</strong></span>
      <a href="${url('patient/dashboard.html')}" class="btn btn--ghost btn--sm">My Appointments</a>
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
   3. TOAST
------------------------------------------------------------ */
function showToast(message, type = 'info', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
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
   4. MODAL HELPERS
------------------------------------------------------------ */
function createModal(innerHtml) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal-box">' + innerHtml + '</div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => overlay.remove());
  });

  return overlay;
}

function closeModal(overlay) {
  if (overlay) overlay.remove();
}


/* ------------------------------------------------------------
   5. LOCALSTORAGE DB
------------------------------------------------------------ */
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
   7. SIMULATED SMS
------------------------------------------------------------ */
function sendSms(phone, type, message) {
  const entry = {
    id: 'sms-' + Date.now(),
    phone, type, message,
    sentAt: new Date().toISOString(),
    status: 'sent',
  };
  DB.push('sms_log', entry);
  showToast(' SMS sent to ' + phone, 'info');
  console.log('[SMS MOCK]', entry);
  return entry;
}


/* ------------------------------------------------------------
   8. SLOT GENERATOR
------------------------------------------------------------ */
function generateSlotsForDate(dateStr, dentistId, serviceId) {
  const service = getServiceById(serviceId);
  if (!service) return [];

  const slots = [];
  const start = new Date(dateStr + 'T09:00:00');
  const end   = new Date(dateStr + 'T17:00:00');

  const all = [...(typeof APPOINTMENTS !== 'undefined' ? APPOINTMENTS : []),
               ...DB.get('appointments', [])];
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
   ------------------------------------------------------------
------------------------------------------------------------ */
function initAll() {
  initNavbar();
  renderNavbarAuth();
  highlightActiveNav();
}

// main.js is loaded at the bottom of <body>, so the DOM is
// already parsed. Run once, immediately.
initAll();