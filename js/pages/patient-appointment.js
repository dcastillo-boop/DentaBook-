/* ============================================================
   Patient Appointment Detail 
   ============================================================ */
(async function () {

  if (!requirePatient()) return;

  await Api.loadAppointments();

  const session = Session.get();
  const apptId  = getQueryParam('id');

  if (!apptId) {
    showToast('No appointment selected.', 'warning');
    setTimeout(() => window.location.href = 'dashboard.html', 700);
    return;
  }

  const appt = (window.APPOINTMENTS_CACHE || []).find(a => a.id === apptId);

  if (!appt || appt.patientId !== session.userId) {
    showToast('Appointment not found.', 'error');
    setTimeout(() => window.location.href = 'dashboard.html', 700);
    return;
  }


  /* ----------------------------------------------------------
     Render
  ---------------------------------------------------------- */
  function render() {
    const service = getServiceById(appt.serviceId);
    const clinic  = getClinicById(appt.clinicId);
    const dentist = appt.dentistId === 'any'
      ? { name: 'Any Available Dentist' }
      : getDentistById(appt.dentistId);

    const hoursUntil = (new Date(appt.start).getTime() - Date.now()) / 3600000;
    const canActNow  = hoursUntil > 24;

    let actions = '';
    if (appt.status === 'pending') {
      actions = `
        <button class="btn btn--danger btn--block" type="button" id="cancelBtn">
          Cancel Booking
        </button>
        <p class="action-hint">Pending bookings can be cancelled anytime.</p>
      `;
    } else if (appt.status === 'confirmed' && canActNow) {
      actions = `
        <button class="btn btn--secondary btn--block" type="button" id="reschedBtn">
          Request Reschedule
        </button>
        <button class="btn btn--danger btn--block" type="button" id="cancelBtn">
          Cancel Appointment
        </button>
        <p class="action-hint">
          You can cancel or reschedule up to 24 hours before your appointment.
        </p>
      `;
    } else if (appt.status === 'confirmed' && !canActNow) {
      actions = `
        <div class="info-note">
          Your appointment is less than 24 hours away.
          Please contact the clinic directly to make changes.
        </div>
      `;
    } else if (appt.status === 'reschedule') {
      actions = `
        <div class="info-note">
          Your reschedule request is pending staff approval.
        </div>
      `;
    }

    const timeline = [
      {
        label: 'Booking Created',
        date:  appt.createdAt || appt.start,
        note:  'Request submitted by patient.',
      },
      {
        label: getStatusLabel(appt.status),
        date:  appt.updatedAt || appt.start,
        note:  appt.notes || '',
      },
    ];

    document.getElementById('detailRoot').innerHTML = `
      <p class="detail-breadcrumb">
        <a href="dashboard.html">My Appointments</a> ›
        <span>${appt.id}</span>
      </p>

      <div class="detail-layout">
        <div>
          <div class="detail-card">
            <div class="detail-card__head">
              <h2>${service?.name}</h2>
              <span class="badge ${getStatusClass(appt.status)}">
                ${getStatusLabel(appt.status)}
              </span>
            </div>
            <p class="detail-card__ref">Booking Ref: ${appt.id}</p>

            <dl class="row-list">
              <div class="row-list__item"><dt>Clinic</dt><dd>${clinic.name}</dd></div>
              <div class="row-list__item"><dt>Address</dt><dd>${clinic.address}</dd></div>
              <div class="row-list__item"><dt>Dentist</dt><dd>${dentist.name}</dd></div>
              <div class="row-list__item"><dt>Date &amp; Time</dt><dd>${formatDateTime(appt.start)}</dd></div>
              <div class="row-list__item"><dt>Duration</dt><dd>${service?.duration} minutes</dd></div>
              <div class="row-list__item"><dt>Estimated Fee</dt><dd>₱${service?.price.toLocaleString()} (pay in person)</dd></div>
              ${appt.notes ? `<div class="row-list__item"><dt>Notes</dt><dd>${appt.notes}</dd></div>` : ''}
            </dl>
          </div>

          <div class="detail-card">
            <h2>Status History</h2>
            <div class="timeline">
              ${timeline.map(t => `
                <div class="tl-item">
                  <strong>${t.label}</strong>
                  <span>${formatDateTime(t.date)}</span>
                  ${t.note ? `<span class="is-note">${t.note}</span>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <aside>
          <div class="detail-card">
            <h2>Actions</h2>
            <div class="action-stack">
              ${actions || '<p class="text-muted text-sm">No actions available for this appointment.</p>'}
            </div>
          </div>

          <div class="detail-card clinic-contact">
            <h2>Clinic Contact</h2>
            <p>${clinic.name}</p>
            <p>${clinic.phone}</p>
            <p>${clinic.hours}</p>
          </div>
        </aside>
      </div>
    `;

    document.getElementById('cancelBtn')?.addEventListener('click', handleCancel);
    document.getElementById('reschedBtn')?.addEventListener('click', handleReschedule);
  }


  /* ----------------------------------------------------------
     Actions
  ---------------------------------------------------------- */
  async function handleCancel() {
    if (!confirm('Cancel this appointment?')) return;

    try {
      await updateStatus('cancelled', 'Cancelled by patient.');
      sendSms(session.phone, 'CANCELLED',
        `Your appointment ${appt.id} has been cancelled.`);
      showToast('Appointment cancelled.', 'success');
      setTimeout(render, 300);
    } catch (err) {
      showToast(err.message || 'Cancel failed.', 'error');
    }
  }

  async function handleReschedule() {
    const newDate = prompt('Enter new date (YYYY-MM-DD):');
    if (!newDate) return;

    const service = getServiceById(appt.serviceId);
    const slots = generateSlotsForDate(newDate, appt.dentistId, service.id);
    const slot = slots.find(s => s.available);

    if (!slot) {
      showToast('No slots available on that date.', 'warning');
      return;
    }

    try {
      await updateStatus('reschedule', 'Patient requested a new time.');

      DB.push('reschedule_requests', {
        appointmentId: appt.id,
        proposedStart: slot.start,
        proposedEnd:   slot.end,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      sendSms(session.phone, 'RESCHEDULE_REQUESTED',
        `Your reschedule request for ${appt.id} has been sent.`);

      showToast('Reschedule request submitted.', 'success');
      setTimeout(render, 300);
    } catch (err) {
      showToast(err.message || 'Reschedule failed.', 'error');
    }
  }


  /* ----------------------------------------------------------
     Helpers
  ---------------------------------------------------------- */
  async function updateStatus(newStatus, note) {
    const patch = { status: newStatus, updatedAt: new Date().toISOString() };
    if (note) patch.notes = note;
    const updated = await Api.updateAppointment(appt.id, patch);
    Object.assign(appt, updated);
  }


  /* ----------------------------------------------------------
     Boot
  ---------------------------------------------------------- */
  render();

})();