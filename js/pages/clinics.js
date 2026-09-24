/* ============================================================
   DentaBook — Clinics Page Logic
   ============================================================ */
(function () {

  const gridEl  = document.getElementById('clinicGrid');
  const emptyEl = document.getElementById('emptyState');
  const search  = document.getElementById('searchInput');

  /* ------------------------------------------------------------
     Render clinics filtered by search keyword
  ------------------------------------------------------------ */
  function render(keyword) {
    const q = (keyword || '').toLowerCase().trim();

    const filtered = CLINICS.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    );

    gridEl.innerHTML = '';

    if (filtered.length === 0) {
      emptyEl.classList.remove('is-hidden');
      return;
    }
    emptyEl.classList.add('is-hidden');

    filtered.forEach(clinic => {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <div class="card__icon"></div>
        <h3 class="card__title">${clinic.name}</h3>
        <p class="card__meta"> ${clinic.address}</p>
        <p class="card__meta"> ${clinic.hours}</p>
        <p class="card__meta"> ${clinic.phone}</p>
        <div class="card__footer">
          <a href="clinic-detail.html?clinic=${clinic.id}"
             class="btn btn--primary btn--sm">View Services</a>
        </div>
      `;
      gridEl.appendChild(card);
    });
  }

  /* ------------------------------------------------------------
     Live search
  ------------------------------------------------------------ */
  search.addEventListener('input', e => render(e.target.value));

  /* ------------------------------------------------------------
     Boot
  ------------------------------------------------------------ */
  render('');

})();