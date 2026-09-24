/* ============================================================
   DentaBook — Staff SMS Log
   ============================================================ */
(function () {

  if (!requireStaff()) return;

  const session = Session.get();
  const clinic  = getClinicById(session.clinicId);

  document.getElementById('clinicName').textContent = clinic?.name || 'Clinic';
  document.getElementById('staffRole').textContent  = session.staffRole || 'Staff';


  /* ============================================================
     RENDER
     ============================================================ */

  function render() {
    const log = DB.get('sms_log', []);
    const body = document.getElementById('tableBody');

    if (log.length === 0) {
      body.innerHTML = `<tr><td colspan="5" class="staff-empty">
        <div class="staff-empty__icon"></div>
        No SMS sent yet. Actions like approving a booking will show up here.
      </td></tr>`;
      return;
    }

    const sorted = [...log].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    body.innerHTML = sorted.map(s => `
      <tr>
        <td class="text-nowrap">${formatDateTime(s.sentAt)}</td>
        <td><strong>${s.phone}</strong></td>
        <td><span class="badge badge--reschedule">${s.type}</span></td>
        <td class="text-sm">${s.message}</td>
        <td><span class="badge badge--confirmed">${s.status}</span></td>
      </tr>
    `).join('');
  }


  /* ============================================================
     CLEAR LOG
     ============================================================ */

  document.getElementById('clearBtn').addEventListener('click', () => {
    if (!confirm('Clear the entire SMS log? This cannot be undone.')) return;
    DB.set('sms_log', []);
    showToast('SMS log cleared.', 'info');
    render();
  });


  /* ============================================================
     BOOT
     ============================================================ */

  render();

})();