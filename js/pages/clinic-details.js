/* ============================================================
   DentaBook — Clinic Detail Page Logic
   ============================================================ */
(function () {

  /* ------------------------------------------------------------
     Read and validate clinic ID from URL
  ------------------------------------------------------------ */
  const clinicId = getQueryParam('clinic');

  if (!clinicId) {
    showToast('No clinic selected.', 'warning');
    setTimeout(() => window.location.href = 'clinics.html', 700);
    return;
  }

  const clinic = getClinicById(clinicId);

  if (!clinic) {
    showToast('Clinic not found.', 'error');
    setTimeout(() => window.location.href = 'clinics.html', 700);
    return;
  }

  /* ------------------------------------------------------------
     Breadcrumb and clinic header
  ------------------------------------------------------------ */
  document.getElementById('breadcrumbName').textContent = clinic.name;

  document.getElementById('clinicHeader').innerHTML = `
    <div class="clinic-header">
      <div class="clinic-header__icon"></div>
      <div class="clinic-header__info">
        <h2 class="clinic-header__name">${clinic.name}</h2>
        <p class="card__meta"> ${clinic.address}</p>
        <p class="card__meta"> ${clinic.hours}</p>
        <p class="card__meta"> ${clinic.phone}</p>
      </div>
    </div>
  `;

  /* ------------------------------------------------------------
     Dentist cards — "Any Available" + individual dentists
  ------------------------------------------------------------ */
  const grid = document.getElementById('dentistGrid');
  const clinicDentists = DENTISTS.filter(d => d.clinics.includes(clinicId));

  // "Any Available" card first
  const anyCard = document.createElement('article');
  anyCard.className = 'card card--dashed';
  anyCard.innerHTML = `
    <div class="card__icon card__icon--soft"></div>
    <h3 class="card__title">Any Available Dentist</h3>
    <p class="card__meta">Let the clinic assign the first available dentist for your slot.</p>
    <div class="card__footer">
      <button class="btn btn--primary btn--sm" data-dentist="any">Select</button>
    </div>
  `;
  grid.appendChild(anyCard);

  // Individual dentist cards
  clinicDentists.forEach(dentist => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card__icon"></div>
      <h3 class="card__title">${dentist.name}</h3>
      <p class="card__meta"> ${dentist.specialty}</p>
      <p class="card__meta">${dentist.bio}</p>
      <div class="card__footer">
        <button class="btn btn--primary btn--sm" data-dentist="${dentist.id}">Select</button>
      </div>
    `;
    grid.appendChild(card);
  });

  /* ------------------------------------------------------------
     Dentist selection — save to draft, jump to booking wizard
     (wizard lives in /booking/, so use relative path)
  ------------------------------------------------------------ */
  grid.querySelectorAll('button[data-dentist]').forEach(btn => {
    btn.addEventListener('click', () => {
      const draft = DB.get('booking_draft', {});
      draft.clinicId  = clinicId;
      draft.dentistId = btn.getAttribute('data-dentist');
      DB.set('booking_draft', draft);

      showToast('Dentist selected. Choose a time slot.', 'success');
      setTimeout(() => window.location.href = '../booking/wizard.html?step=4', 700);
    });
  });

})();