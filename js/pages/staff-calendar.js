/* ============================================================
   DentaBook — Staff Calendar
   ============================================================ */
(function () {

  if (!requireStaff()) return;

  const session = Session.get();
  const clinic  = getClinicById(session.clinicId);

  document.getElementById('clinicName').textContent = clinic?.name || 'Clinic';
  document.getElementById('staffRole').textContent  = session.staffRole || 'Staff';


  /* ============================================================
     BUILD 7-DAY RANGE (today + next 6)
     ============================================================ */

  const days = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const first = days[0];
  const last  = days[6];
  document.getElementById('weekLabel').textContent =
    `${first.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ` +
    `${last.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;


  /* ============================================================
     LOAD APPOINTMENTS FOR THIS CLINIC
     ============================================================ */

  const combined = [...APPOINTMENTS, ...DB.get('appointments', [])];
  const map = new Map();
  combined.forEach(a => map.set(a.id, a));
  const all = [...map.values()].filter(a => a.clinicId === session.clinicId);


  /* ============================================================
     RENDER
     ============================================================ */

  const grid = document.getElementById('calGrid');

  days.forEach(day => {
    const iso = day.toISOString().slice(0, 10);
    const items = all
      .filter(a => a.start.startsWith(iso))
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    const col = document.createElement('div');
    col.className = 'cal-day';
    col.innerHTML = `
      <div class="cal-day__head">
        <strong>${day.toLocaleDateString('en-PH', { weekday: 'short' })}</strong>
        <span>${day.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
      </div>
      <div class="cal-day__body"></div>
    `;

    const body = col.querySelector('.cal-day__body');

    if (items.length === 0) {
      body.innerHTML = `<span class="cal-day__empty">No appointments</span>`;
    } else {
      items.forEach(a => {
        const service = getServiceById(a.serviceId);
        const time = new Date(a.start).toLocaleTimeString('en-PH', {
          hour: 'numeric', minute: '2-digit', hour12: true,
        });
        const patient = a.patientName ||
          PATIENTS.find(p => p.id === a.patientId)?.name || '—';

        const block = document.createElement('div');
        block.className = `cal-block status-${a.status}`;
        block.innerHTML = `
          <strong>${time}</strong>
          <span>${patient}</span>
          <span>${service?.name || ''}</span>
        `;
        block.title = `${a.id} · ${patient} · ${getStatusLabel(a.status)}`;
        block.addEventListener('click', () => {
          alert(`${a.id}\n${patient}\n${service?.name}\n${getStatusLabel(a.status)}`);
        });
        body.appendChild(block);
      });
    }

    grid.appendChild(col);
  });

})();