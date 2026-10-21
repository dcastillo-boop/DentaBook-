/* ============================================================
  Clinics Page 
   */
(function () {

  const gridEl  = document.getElementById('clinicGrid');
  const emptyEl = document.getElementById('emptyState');
  const search  = document.getElementById('searchInput');

  function render(keyword) {
    const q = (keyword || '').toLowerCase().trim();

    // Read the current booking draft
    const draft = DB.get('booking_draft', {});
    const selectedServiceId = draft.serviceId;

    let filtered = CLINICS.filter(c => {
      // Step 1 — service filter
      if (selectedServiceId) {
        const offersService = SERVICES.some(
          s => s.clinicId === c.id && s.id === selectedServiceId
        );
        if (!offersService) return false;
      }

      // Step 2 — search filter
      return c.name.toLowerCase().includes(q) ||
             c.address.toLowerCase().includes(q);
    });

    // Render
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
        <p class="card__meta">${clinic.address}</p>
        <p class="card__meta">${clinic.hours}</p>
        <p class="card__meta">${clinic.phone}</p>
        <div class="card__footer">
          <a href="clinic-detail.html?clinic=${clinic.id}"
             class="btn btn--primary btn--sm">View Services</a>
        </div>
      `;
      gridEl.appendChild(card);
    });
  }

  search.addEventListener('input', e => render(e.target.value));

  render('');
})();