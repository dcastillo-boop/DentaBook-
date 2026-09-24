/* ============================================================
   DentaBook — Staff Services List
   ============================================================ */
(function () {

  if (!requireStaff()) return;

  const session = Session.get();
  const clinic  = getClinicById(session.clinicId);

  document.getElementById('clinicName').textContent = clinic?.name || 'Clinic';
  document.getElementById('staffRole').textContent  = session.staffRole || 'Staff';

  document.querySelector('[data-feature="add-service"]')
    ?.addEventListener('click', () =>
      showToast('Add Service is a Milestone 2 feature.', 'info'));


  /* ============================================================
     RENDER LIST
     ============================================================ */

  const list = SERVICES.filter(s => s.clinicId === session.clinicId);
  const body = document.getElementById('tableBody');

  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="staff-empty">
      <div class="staff-empty__icon"></div>
      No services set up yet.
    </td></tr>`;
    return;
  }

  body.innerHTML = list.map(s => `
    <tr>
      <td><strong>${s.icon} ${s.name}</strong></td>
      <td>${s.duration} min</td>
      <td>₱${s.price.toLocaleString()}</td>
      <td class="text-muted text-sm">${s.description}</td>
      <td>
        <button class="btn btn--secondary btn--sm" data-feature="edit-service">Edit</button>
      </td>
    </tr>
  `).join('');

  body.querySelectorAll('[data-feature="edit-service"]').forEach(btn => {
    btn.addEventListener('click', () =>
      showToast('Editing is a Milestone 2 feature.', 'info'));
  });

})();