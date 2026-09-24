/* ============================================================
   DentaBook — Staff Appointments List
   ============================================================ */
(function () {

  if (!requireStaff()) return;

  const session = Session.get();
  const clinic  = getClinicById(session.clinicId);

  document.getElementById('clinicName').textContent = clinic?.name || 'Clinic';
  document.getElementById('staffRole').textContent  = session.staffRole || 'Staff';


  /* ============================================================
     DATA HELPERS
     ============================================================ */

  function getClinicAppointments() {
    const combined = [...APPOINTMENTS, ...DB.get('appointments', [])];
    const map = new Map();
    combined.forEach(a => map.set(a.id, a));
    return [...map.values()]
      .filter(a => a.clinicId === session.clinicId)
      .sort((a, b) => new Date(b.start) - new Date(a.start));
  }

  function getPatientName(a) {
    return a.patientName ||
           PATIENTS.find(p => p.id === a.patientId)?.name || 'Unknown';
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
     FILTERS
     ============================================================ */

  const searchInput   = document.getElementById('searchInput');
  const statusFilter  = document.getElementById('statusFilter');
  const dentistFilter = document.getElementById('dentistFilter');

  DENTISTS
    .filter(d => d.clinics.includes(session.clinicId))
    .forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      dentistFilter.appendChild(opt);
    });

  [searchInput, statusFilter, dentistFilter].forEach(el =>
    el.addEventListener('input', render));


  /* ============================================================
     RENDER
     ============================================================ */

  function render() {
    const q          = searchInput.value.toLowerCase().trim();
    const statusVal  = statusFilter.value;
    const dentistVal = dentistFilter.value;

    let list = getClinicAppointments();

    if (q) {
      list = list.filter(a =>
        a.id.toLowerCase().includes(q) ||
        getPatientName(a).toLowerCase().includes(q)
      );
    }

    if (statusVal === 'cancelled') {
      list = list.filter(a => ['cancelled', 'rejected'].includes(a.status));
    } else if (statusVal) {
      list = list.filter(a => a.status === statusVal);
    }

    if (dentistVal) {
      list = list.filter(a => a.dentistId === dentistVal);
    }

    document.getElementById('countText').textContent =
      `${list.length} appointment${list.length === 1 ? '' : 's'}`;

    const body = document.getElementById('tableBody');

    if (list.length === 0) {
      body.innerHTML = `<tr><td colspan="7" class="staff-empty">
        <div class="staff-empty__icon"></div>
        No appointments match your filters.
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
          <td><strong class="text-purple text-sm">${a.id}</strong></td>
          <td>
            ${getPatientName(a)}<br/>
            <span class="text-muted text-xs">${getPatientPhone(a)}</span>
          </td>
          <td>${service?.name || '—'}</td>
          <td>${dentist?.name || '—'}</td>
          <td>${formatDateTime(a.start)}</td>
          <td>
            <span class="badge ${getStatusClass(a.status)}">${getStatusLabel(a.status)}</span>
          </td>
          <td><div class="cell-actions">${buildActions(a)}</div></td>
        </tr>
      `;
    }).join('');

    body.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        handleAction(action, id);
      });
    });
  }

  function buildActions(a) {
    switch (a.status) {
      case 'pending':
        return `
          <button class="btn btn--primary btn--sm" data-action="approve" data-id="${a.id}">Approve</button>
          <button class="btn btn--danger btn--sm"  data-action="reject"  data-id="${a.id}">Reject</button>
        `;
      case 'confirmed':
        return `
          <button class="btn btn--secondary btn--sm" data-action="reschedule" data-id="${a.id}">Reschedule</button>
          <button class="btn btn--primary btn--sm"   data-action="complete"   data-id="${a.id}">Complete</button>
          <button class="btn btn--danger btn--sm"    data-action="noshow"     data-id="${a.id}">No-show</button>
        `;
      case 'reschedule':
        return `
          <button class="btn btn--primary btn--sm" data-action="approveResch" data-id="${a.id}">Approve New Time</button>
          <button class="btn btn--danger btn--sm"  data-action="rejectResch"  data-id="${a.id}">Reject Request</button>
        `;
      default:
        return `<span class="text-muted text-xs">No actions</span>`;
    }
  }


  /* ============================================================
     ACTION HANDLERS
     ============================================================ */

  function handleAction(action, id) {
    const appt = getClinicAppointments().find(a => a.id === id);
    if (!appt) return;

    switch (action) {
      case 'approve': {
        if (!confirm(`Approve ${id}?`)) return;
        updateAppointment(id, {
          status: 'confirmed',
          approvedBy: session.userId,
          approvedAt: new Date().toISOString(),
        });
        sendSms(getPatientPhone(appt), 'BOOKING_APPROVED',
          `Your appointment ${id} is confirmed for ${formatDateTime(appt.start)}.`);
        showToast(`${id} approved.`, 'success');
        break;
      }

      case 'reject': {
        const reason = prompt('Reason (optional):', '');
        if (reason === null) return;
        updateAppointment(id, {
          status: 'rejected',
          notes: reason || 'Rejected by staff.',
          updatedAt: new Date().toISOString(),
        });
        sendSms(getPatientPhone(appt), 'BOOKING_REJECTED',
          `Your booking ${id} was not approved. Please rebook or contact the clinic.`);
        showToast(`${id} rejected.`, 'warning');
        break;
      }

      case 'complete': {
        if (!confirm(`Mark ${id} as completed?`)) return;
        updateAppointment(id, {
          status: 'completed',
          updatedAt: new Date().toISOString(),
        });
        showToast(`${id} marked completed.`, 'success');
        break;
      }

      case 'noshow': {
        if (!confirm(`Mark ${id} as no-show?`)) return;
        updateAppointment(id, {
          status: 'no-show',
          updatedAt: new Date().toISOString(),
        });
        sendSms(getPatientPhone(appt), 'NO_SHOW',
          `You missed your appointment ${id}. Please contact the clinic.`);
        showToast(`${id} marked no-show.`, 'warning');
        break;
      }

      case 'reschedule': {
        const newDate = prompt('Enter new date (YYYY-MM-DD):');
        if (!newDate) return;

        const service = getServiceById(appt.serviceId);
        const slots = generateSlotsForDate(newDate, appt.dentistId, service.id);
        const slot = slots.find(s => s.available);

        if (!slot) {
          showToast('No slots on that date.', 'warning');
          return;
        }

        updateAppointment(id, {
          start: slot.start,
          end: slot.end,
          status: 'confirmed',
          updatedAt: new Date().toISOString(),
        });
        sendSms(getPatientPhone(appt), 'RESCHEDULED',
          `Your appointment ${id} has been moved to ${formatDateTime(slot.start)}.`);
        showToast(`${id} rescheduled.`, 'success');
        break;
      }

      case 'approveResch': {
        const reqs = DB.get('reschedule_requests', []);
        const req = reqs.find(r => r.appointmentId === id && r.status === 'pending');
        if (!req) {
          showToast('No pending reschedule request found.', 'warning');
          return;
        }

        updateAppointment(id, {
          start: req.proposedStart,
          end: req.proposedEnd,
          status: 'confirmed',
          updatedAt: new Date().toISOString(),
        });
        req.status = 'approved';
        DB.set('reschedule_requests', reqs);

        sendSms(getPatientPhone(appt), 'RESCHEDULE_APPROVED',
          `Your reschedule request for ${id} is approved. New time: ${formatDateTime(req.proposedStart)}.`);
        showToast('Reschedule approved.', 'success');
        break;
      }

      case 'rejectResch': {
        const reqs = DB.get('reschedule_requests', []);
        const req = reqs.find(r => r.appointmentId === id && r.status === 'pending');
        if (!req) {
          showToast('No pending reschedule request found.', 'warning');
          return;
        }
        req.status = 'rejected';
        DB.set('reschedule_requests', reqs);

        updateAppointment(id, {
          status: 'confirmed',
          updatedAt: new Date().toISOString(),
        });
        sendSms(getPatientPhone(appt), 'RESCHEDULE_REJECTED',
          `Your reschedule request for ${id} was rejected. Original time kept.`);
        showToast('Reschedule request rejected.', 'warning');
        break;
      }
    }

    render();
  }


  render();

})();