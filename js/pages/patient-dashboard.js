/* ============================================================
   DentaBook — Patient Dashboard
   ============================================================ */
(function () {

  if (!requirePatient()) return;

  const session = Session.get();

  /* ------------------------------------------------------------
     Welcome header
  ------------------------------------------------------------ */
  const firstName = session.name?.split(' ')[0] || 'Patient';
  document.getElementById('welcomeText').textContent = `Hello, ${firstName} `;


  /* ============================================================
     DATA
     ============================================================ */

  function getAllAppointments() {
    const combined = [...APPOINTMENTS, ...DB.get('appointments', [])];
    return combined
      .filter(a => a.patientId === session.userId)
      .sort((a, b) => new Date(b.start) - new Date(a.start));
  }

  /**
   * Update an appointment status. If it's only in APPOINTMENTS,
   * copy it into DB.appointments first so the change persists.
   */
  function updateAppointmentStatus(apptId, newStatus, note) {
    const stored = DB.get('appointments', []);
    const idx = stored.findIndex(a => a.id === apptId);

    if (idx !== -1) {
      stored[idx].status = newStatus;
      stored[idx].updatedAt = new Date().toISOString();
      if (note) stored[idx].notes = note;
      DB.set('appointments', stored);
      return;
    }

    const seed = APPOINTMENTS.find(a => a.id === apptId);
    if (seed) {
      const updated = {
        ...seed,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      if (note) updated.notes = note;
      stored.push(updated);
      DB.set('appointments', stored);
    }
  }


  /* ============================================================
     STATS
     ============================================================ */

  function renderStats() {
    const list = getAllAppointments();
    const now = Date.now();

    const upcoming  = list.filter(a =>
      new Date(a.start).getTime() > now &&
      ['pending', 'confirmed', 'reschedule'].includes(a.status)
    ).length;
    const pending   = list.filter(a => a.status === 'pending').length;
    const confirmed = list.filter(a => a.status === 'confirmed').length;
    const completed = list.filter(a => a.status === 'completed').length;

    const stats = [
      { icon: '', value: upcoming,  label: 'Upcoming' },
      { icon: '', value: pending,   label: 'Pending' },
      { icon: '', value: confirmed, label: 'Confirmed' },
      { icon: '', value: completed, label: 'Completed' },
    ];

    document.getElementById('statsRow').innerHTML = stats.map(s => `
      <div class="stat">
        <div class="stat__icon">${s.icon}</div>
        <div>
          <div class="stat__value">${s.value}</div>
          <div class="stat__label">${s.label}</div>
        </div>
      </div>
    `).join('');
  }


  /* ============================================================
     TABS
     ============================================================ */

  const TABS = [
    { key: 'all',       label: 'All' },
    { key: 'pending',   label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];
  let activeTab = 'all';

  function renderTabs() {
    const row = document.getElementById('tabsRow');
    row.innerHTML = '';

    TABS.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'tab' + (t.key === activeTab ? ' is-active' : '');
      btn.textContent = t.label;
      btn.addEventListener('click', () => {
        activeTab = t.key;
        renderTabs();
        renderList();
      });
      row.appendChild(btn);
    });
  }


  /* ============================================================
     APPOINTMENT LIST
     ============================================================ */

  function renderList() {
    const all = getAllAppointments();

    const filtered =
      activeTab === 'all'       ? all :
      activeTab === 'cancelled' ? all.filter(a => ['cancelled', 'rejected'].includes(a.status)) :
                                  all.filter(a => a.status === activeTab);

    const listEl = document.getElementById('apptList');

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon"></div>
          <h3>No appointments here</h3>
          <p>When you book an appointment, it will appear in this list.</p>
          <a href="../public/services.html" class="btn btn--primary">Book an Appointment</a>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(a => {
      const service = getServiceById(a.serviceId);
      const clinic  = getClinicById(a.clinicId);
      const dentist = a.dentistId === 'any'
        ? { name: 'Any Available Dentist' }
        : getDentistById(a.dentistId);

      const hoursUntil = (new Date(a.start).getTime() - Date.now()) / 3600000;
      const canActNow  = hoursUntil > 24;
      const isFinal    = ['completed', 'cancelled', 'rejected', 'no-show'].includes(a.status);

      let actions = `<a href="appointment-detail.html?id=${a.id}"
                       class="btn btn--secondary btn--sm">View Details</a>`;

      if (!isFinal && a.status === 'pending') {
        actions += `<button class="btn btn--danger btn--sm"
                      data-action="cancel" data-id="${a.id}">Cancel</button>`;
      } else if (a.status === 'confirmed' && canActNow) {
        actions += `<button class="btn btn--danger btn--sm"
                      data-action="cancel" data-id="${a.id}">Cancel</button>`;
        actions += `<button class="btn btn--secondary btn--sm"
                      data-action="reschedule" data-id="${a.id}">Reschedule</button>`;
      }

      return `
        <article class="appt-card">
          <div class="appt-card__icon">${service?.icon || ''}</div>
          <div class="appt-card__info">
            <h3>${service?.name || 'Service'}</h3>
            <p class="appt-card__meta"> ${clinic?.name || 'Clinic'}</p>
            <p class="appt-card__meta"> ${dentist?.name || 'Dentist'}</p>
            <p class="appt-card__meta"> ${formatDateTime(a.start)}</p>
            <p class="appt-card__ref">
              <span class="badge ${getStatusClass(a.status)}">${getStatusLabel(a.status)}</span>
              <span class="text-xs">Ref: ${a.id}</span>
            </p>
          </div>
          <div class="appt-card__actions">${actions}</div>
        </article>
      `;
    }).join('');

    // Wire action buttons
    listEl.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id     = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        if (action === 'cancel')     openCancelModal(id);
        if (action === 'reschedule') openRescheduleModal(id);
      });
    });
  }


  /* ============================================================
     CANCEL MODAL
     ============================================================ */

  function openCancelModal(apptId) {
    const appt = getAllAppointments().find(a => a.id === apptId);
    if (!appt) return;

    const modal = createModal(`
      <h3>Cancel Appointment?</h3>
      <p>
        You're about to cancel
        <strong>${getServiceById(appt.serviceId)?.name}</strong>
        on <strong>${formatDateTime(appt.start)}</strong>.
      </p>
      <p class="text-sm text-muted">
        This cannot be undone. You'll receive an SMS confirmation.
      </p>
      <div class="modal-box__actions">
        <button class="btn btn--secondary" type="button" data-close>Keep Appointment</button>
        <button class="btn btn--danger" type="button" id="confirmCancelBtn">Yes, Cancel</button>
      </div>
    `);

    modal.querySelector('#confirmCancelBtn').addEventListener('click', () => {
      updateAppointmentStatus(apptId, 'cancelled', 'Patient cancelled.');
      sendSms(session.phone, 'CANCELLED',
        `Your appointment ${apptId} has been cancelled.`);

      closeModal(modal);
      showToast('Appointment cancelled.', 'success');
      renderStats();
      renderList();
    });
  }


  /* ============================================================
     RESCHEDULE MODAL
     ============================================================ */

  function openRescheduleModal(apptId) {
    const appt = getAllAppointments().find(a => a.id === apptId);
    if (!appt) return;

    const service = getServiceById(appt.serviceId);

    // Next 14 days starting tomorrow
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push({
        iso:  d.toISOString().slice(0, 10),
        day:  d.toLocaleDateString('en-PH', { weekday: 'short' }),
        date: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      });
    }

    const modal = createModal(`
      <h3>Request a Reschedule</h3>
      <p>
        Your clinic will review and approve the new time.
        The original time stays until then.
      </p>

      <div class="mt-3">
        <label class="form-label">Choose a New Date</label>
        <div class="resch-dates" id="reschDates"></div>
      </div>

      <div id="reschSlots">
        <p class="resch-empty">Select a date to see slots.</p>
      </div>

      <div class="modal-box__actions">
        <button class="btn btn--secondary" type="button" data-close>Cancel</button>
        <button class="btn btn--primary" type="button" id="submitReschBtn" disabled>
          Submit Request
        </button>
      </div>
    `);

    const datesRow = modal.querySelector('#reschDates');

    // Build date chips
    dates.forEach(d => {
      const btn = document.createElement('button');
      btn.className = 'tab';
      btn.type = 'button';
      btn.innerHTML = `
        <strong>${d.day}</strong><br/>
        <span class="text-xs">${d.date}</span>
      `;
      btn.addEventListener('click', () => {
        datesRow.querySelectorAll('.tab').forEach(x => x.classList.remove('is-active'));
        btn.classList.add('is-active');
        renderReschSlots(d.iso);
      });
      datesRow.appendChild(btn);
    });

    let chosenStart = null;
    let chosenEnd   = null;

    function renderReschSlots(dateStr) {
      const slots = generateSlotsForDate(dateStr, appt.dentistId, service.id);
      const box = modal.querySelector('#reschSlots');

      if (!slots.some(s => s.available)) {
        box.innerHTML = `<p class="resch-empty">No slots available on this date.</p>`;
        return;
      }

      box.innerHTML = `
        <label class="form-label mt-3">Available Times</label>
        <div class="resch-slots" id="reschSlotGrid"></div>
      `;

      const grid = box.querySelector('#reschSlotGrid');
      slots.forEach(slot => {
        const btn = document.createElement('button');
        btn.className = 'slot-btn';
        btn.type = 'button';
        btn.textContent = slot.label;
        btn.disabled = !slot.available;
        btn.addEventListener('click', () => {
          grid.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          chosenStart = slot.start;
          chosenEnd   = slot.end;
          modal.querySelector('#submitReschBtn').disabled = false;
        });
        grid.appendChild(btn);
      });
    }

    modal.querySelector('#submitReschBtn').addEventListener('click', () => {
      if (!chosenStart) return;

      DB.push('reschedule_requests', {
        appointmentId: apptId,
        proposedStart: chosenStart,
        proposedEnd:   chosenEnd,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      updateAppointmentStatus(apptId, 'reschedule', 'Patient requested a new time.');

      sendSms(session.phone, 'RESCHEDULE_REQUESTED',
        `Your reschedule request for ${apptId} has been sent to the clinic.`);

      closeModal(modal);
      showToast('Reschedule request sent.', 'success');
      renderStats();
      renderList();
    });
  }


  /* ============================================================
     BOOT
     ============================================================ */

  renderStats();
  renderTabs();
  renderList();

})();