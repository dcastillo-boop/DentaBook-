/* ============================================================
   DentaBook — Staff Dashboard
   ============================================================ */
(function () {

  if (!requireStaff()) return;

  const session = Session.get();
  const clinic  = getClinicById(session.clinicId);

  document.getElementById('clinicName').textContent = clinic?.name || 'Clinic';
  document.getElementById('staffRole').textContent  = session.staffRole || 'Staff';

  const firstName = session.name?.split(' ')[0] || 'Staff';
  document.getElementById('welcomeText').textContent = `Welcome, ${firstName} `;
  document.getElementById('todayText').textContent =
    new Date().toLocaleDateString('en-PH', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });


  /* ============================================================
     DATA HELPERS
     ============================================================ */

  function getClinicAppointments() {
    const combined = [...APPOINTMENTS, ...DB.get('appointments', [])];
    const map = new Map();
    combined.forEach(a => map.set(a.id, a));
    return [...map.values()]
      .filter(a => a.clinicId === session.clinicId)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }

  function getPatientName(a) {
    return a.patientName ||
           PATIENTS.find(p => p.id === a.patientId)?.name ||
           'Unknown Patient';
  }

  function getPatientPhone(a) {
    return a.patientPhone ||
           PATIENTS.find(p => p.id === a.patientId)?.phone || '';
  }

  function updateAppointment(id, patch) {
    const stored = DB.get('appointments', []);
    const idx = stored.findIndex(a => a.id === id);
    if (idx !== -1) {
      Object.assign(stored[idx], patch);
    } else {
      const seed = APPOINTMENTS.find(a => a.id === id);
      if (!seed) return;
      stored.push({ ...seed, ...patch });
    }
    DB.set('appointments', stored);
  }


  /* ============================================================
     STATS
     ============================================================ */

  function renderStats() {
    const list = getClinicAppointments();
    const todayStr = new Date().toISOString().slice(0, 10);

    const pending   = list.filter(a => a.status === 'pending').length;
    const todayConf = list.filter(a =>
      a.status === 'confirmed' && a.start.startsWith(todayStr)).length;
    const completed = list.filter(a => a.status === 'completed').length;
    const cancelled = list.filter(a =>
      ['cancelled', 'rejected'].includes(a.status)).length;

    const stats = [
      { label: 'Pending',         value: pending   },
      { label: 'Confirmed Today', value: todayConf },
      { label: 'Completed',       value: completed },
      { label: 'Cancelled',       value: cancelled },
    ];

    document.getElementById('statsRow').innerHTML = stats.map(s => `
      <div class="staff-stat">
        <div class="staff-stat__label">${s.label}</div>
        <div class="staff-stat__value">${s.value}</div>
      </div>
    `).join('');
  }


  /* ============================================================
     PENDING APPROVALS
     ============================================================ */

  function renderPending() {
    const list = getClinicAppointments().filter(a => a.status === 'pending');
    document.getElementById('pendingCount').textContent =
      list.length === 0 ? '' : `${list.length} awaiting action`;

    const body = document.getElementById('pendingBody');

    if (list.length === 0) {
      body.innerHTML = `<tr><td colspan="5" class="staff-empty">
        <div class="staff-empty__icon"></div>
        No pending approvals. Great job!
      </td></tr>`;
      return;
    }

    body.innerHTML = list.map(a => {
      const service = getServiceById(a.serviceId);
      const dentist = a.dentistId === 'any'
        ? { name: 'Any Available' }
        : getDentistById(a.dentistId);

      return `
        <tr>
          <td><strong class="text-purple">${a.id}</strong></td>
          <td>
            ${getPatientName(a)}<br/>
            <span class="text-muted text-xs">${getPatientPhone(a)}</span>
          </td>
          <td>
            ${service?.name || '—'}<br/>
            <span class="text-muted text-xs">with ${dentist?.name}</span>
          </td>
          <td>${formatDateTime(a.start)}</td>
          <td>
            <div class="cell-actions">
              <button class="btn btn--primary btn--sm" data-action="approve" data-id="${a.id}">Approve</button>
              <button class="btn btn--danger btn--sm"  data-action="reject"  data-id="${a.id}">Reject</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    body.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        if (action === 'approve') handleApprove(id);
        if (action === 'reject')  handleReject(id);
      });
    });
  }

  function handleApprove(id) {
    const appt = getClinicAppointments().find(a => a.id === id);
    if (!appt) return;
    if (!confirm(`Approve booking ${id}?`)) return;

    updateAppointment(id, {
      status: 'confirmed',
      approvedBy: session.userId,
      approvedAt: new Date().toISOString(),
    });

    sendSms(
      getPatientPhone(appt),
      'BOOKING_APPROVED',
      `Your appointment ${id} at ${clinic.name} is confirmed for ${formatDateTime(appt.start)}.`
    );

    showToast(`Booking ${id} approved.`, 'success');
    refresh();
  }

  function handleReject(id) {
    const appt = getClinicAppointments().find(a => a.id === id);
    if (!appt) return;

    const reason = prompt('Reason for rejection (optional):', '');
    if (reason === null) return;

    updateAppointment(id, {
      status: 'rejected',
      notes: reason || 'Rejected by staff.',
      updatedAt: new Date().toISOString(),
    });

    sendSms(
      getPatientPhone(appt),
      'BOOKING_REJECTED',
      `Your booking ${id} was not approved. Please rebook or contact ${clinic.name}.`
    );

    showToast(`Booking ${id} rejected.`, 'warning');
    refresh();
  }


  /* ============================================================
     TODAY'S APPOINTMENTS
     ============================================================ */

  function renderToday() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const list = getClinicAppointments().filter(a =>
      a.start.startsWith(todayStr) &&
      ['pending', 'confirmed', 'completed', 'no-show'].includes(a.status)
    );

    const body = document.getElementById('todayBody');

    if (list.length === 0) {
      body.innerHTML = `<tr><td colspan="5" class="staff-empty">
        <div class="staff-empty__icon"></div>
        No appointments scheduled for today.
      </td></tr>`;
      return;
    }

    body.innerHTML = list.map(a => {
      const service = getServiceById(a.serviceId);
      const dentist = a.dentistId === 'any'
        ? { name: 'Any Available' }
        : getDentistById(a.dentistId);
      const time = new Date(a.start).toLocaleTimeString('en-PH', {
        hour: 'numeric', minute: '2-digit', hour12: true,
      });

      return `
        <tr>
          <td><strong>${time}</strong></td>
          <td>${getPatientName(a)}</td>
          <td>${service?.name || '—'}</td>
          <td>${dentist?.name}</td>
          <td>
            <span class="badge ${getStatusClass(a.status)}">${getStatusLabel(a.status)}</span>
          </td>
        </tr>
      `;
    }).join('');
  }


  /* ============================================================
     REFRESH + BOOT
     ============================================================ */

  function refresh() {
    renderStats();
    renderPending();
    renderToday();
  }

  refresh();

})();