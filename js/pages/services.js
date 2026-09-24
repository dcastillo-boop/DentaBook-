/* ============================================================
   DentaBook — Services Page Logic
   ============================================================ */
(function () {

  const chipsEl = document.getElementById('filterChips');
  const gridEl  = document.getElementById('serviceGrid');
  const emptyEl = document.getElementById('emptyState');

  const CATEGORIES = ['All', 'General', 'Orthodontics', 'Surgery', 'Cosmetic'];
  let activeCategory = 'All';

  /* ------------------------------------------------------------
     Map a service name to a category label.
     (Our mock data has no explicit category field yet.)
  ------------------------------------------------------------ */
  function getCategory(name) {
    const n = name.toLowerCase();
    if (n.includes('clean') || n.includes('checkup')) return 'General';
    if (n.includes('braces'))                         return 'Orthodontics';
    if (n.includes('extract') || n.includes('canal')) return 'Surgery';
    if (n.includes('whiten'))                         return 'Cosmetic';
    return 'General';
  }

  /* ------------------------------------------------------------
     Filter chips
  ------------------------------------------------------------ */
  function renderChips() {
    chipsEl.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'btn btn--sm ' +
        (cat === activeCategory ? 'btn--primary' : 'btn--secondary');
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        activeCategory = cat;
        renderChips();
        renderServices();
      });
      chipsEl.appendChild(btn);
    });
  }

  /* ------------------------------------------------------------
     Service cards
  ------------------------------------------------------------ */
  function renderServices() {
    const filtered = SERVICES.filter(s =>
      activeCategory === 'All' || getCategory(s.name) === activeCategory
    );

    gridEl.innerHTML = '';

    if (filtered.length === 0) {
      emptyEl.classList.remove('is-hidden');
      return;
    }
    emptyEl.classList.add('is-hidden');

    filtered.forEach(svc => {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <div class="card__icon">${svc.icon}</div>
        <h3 class="card__title">${svc.name}</h3>
        <p class="card__meta"> ${svc.duration} min · from ₱${svc.price.toLocaleString()}</p>
        <p class="card__meta">${svc.description}</p>
        <div class="card__footer">
          <button class="btn btn--primary btn--sm" data-id="${svc.id}">
            Select Service
          </button>
        </div>
      `;
      gridEl.appendChild(card);
    });

    // Wire select buttons
    gridEl.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const serviceId = btn.getAttribute('data-id');
        const draft = DB.get('booking_draft', {});
        draft.serviceId = serviceId;
        DB.set('booking_draft', draft);

        showToast('Service selected. Choose a clinic.', 'success');
        setTimeout(() => window.location.href = 'clinics.html', 700);
      });
    });
  }

  /* ------------------------------------------------------------
     Boot
  ------------------------------------------------------------ */
  renderChips();
  renderServices();

})();