/* ============================================================
   DentaBook — Staff Dentists List
   ============================================================ */
(function () {

  if (!requireStaff()) return;

  const session = Session.get();
  const clinic  = getClinicById(session.clinicId);

  document.getElementById('clinicName').textContent = clinic?.name || 'Clinic';
  document.getElementById('staffRole').textContent  = session.staffRole || 'Staff';

  // "+ Add Dentist" placeholder
  document.querySelector('[data-feature="add-dentist"]')
    ?.addEventListener('click', () =>
      showToast('Add Dentist is a Milestone 2 feature.', 'info'));


  /* ============================================================
     RENDER LIST
     ============================================================ */

  const list = DENTISTS.filter(d => d.clinics.includes(session.clinicId));
  const body = document.getElementById('tableBody');

  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="staff-empty">
      <div class="staff-empty__icon"></div>
      No dentists assigned to this clinic yet.
    </td></tr>`;
    return;
  }

  body.innerHTML = list.map(d => `
    <tr>
      <td><strong>${d.name}</strong></td>
      <td>${d.specialty}</td>
      <td class="text-muted text-sm">${d.bio}</td>
      <td><span class="badge badge--confirmed">Active</span></td>
      <td>
        <button class="btn btn--secondary btn--sm" data-feature="edit-dentist">Edit</button>
      </td>
    </tr>
  `).join('');

  body.querySelectorAll('[data-feature="edit-dentist"]').forEach(btn => {
    btn.addEventListener('click', () =>
      showToast('Editing is a Milestone 2 feature.', 'info'));
  });

})();