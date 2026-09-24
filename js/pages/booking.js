/* ============================================================
   DentaBook — Booking Wizard
   ============================================================ */
(function () {

  /* ------------------------------------------------------------
     Step definitions
  ------------------------------------------------------------ */
  const STEPS = [
    { n: 1, label: 'Service' },
    { n: 2, label: 'Clinic' },
    { n: 3, label: 'Dentist' },
    { n: 4, label: 'Date & Time' },
    { n: 5, label: 'Verify' },
    { n: 6, label: 'Review' },
    { n: 7, label: 'Done' },
  ];

  /* ------------------------------------------------------------
     State
  ------------------------------------------------------------ */
  let draft = DB.get('booking_draft', {});
  let currentStep = parseInt(getQueryParam('step') || '1', 10);
  if (currentStep < 1 || currentStep > 7) currentStep = 1;

  /* ------------------------------------------------------------
     DOM refs
  ------------------------------------------------------------ */
  const stepperEl = document.getElementById('stepper');
  const contentEl = document.getElementById('wizardContent');
  const navEl     = document.getElementById('wizardNav');
  const backBtn   = document.getElementById('backBtn');
  const summaryEl = document.getElementById('summaryBar');


  /* ============================================================
     GUARDS + NAVIGATION
     ============================================================ */

  function getEarliestIncompleteStep() {
    if (!draft.serviceId)              return 1;
    if (!draft.clinicId)               return 2;
    if (!draft.dentistId)              return 3;
    if (!draft.start)                  return 4;
    if (!Session.get()?.phoneVerified) return 5;
    return 6;
  }

  function guardStep(step) {
    const earliest = getEarliestIncompleteStep();
    if (step > earliest) {
      showToast('Please complete the earlier steps first.', 'warning');
      goToStep(earliest);
      return false;
    }
    return true;
  }

  function goToStep(n) {
    const url = new URL(window.location);
    url.searchParams.set('step', n);
    window.location.href = url.toString();
  }


  /* ============================================================
     STEPPER + SUMMARY
     ============================================================ */

  function renderStepper() {
    stepperEl.innerHTML = '';

    STEPS.forEach((step, idx) => {
      const item = document.createElement('div');
      item.className = 'stepper__item';
      if (step.n < currentStep)   item.classList.add('is-done');
      if (step.n === currentStep) item.classList.add('is-active');

      item.innerHTML = `
        <div class="stepper__dot">${step.n < currentStep ? '✓' : step.n}</div>
        <div class="stepper__label">${step.label}</div>
      `;
      stepperEl.appendChild(item);

      if (idx < STEPS.length - 1) {
        const line = document.createElement('div');
        line.className = 'stepper__line' + (step.n < currentStep ? ' is-done' : '');
        stepperEl.appendChild(line);
      }
    });
  }

  function renderSummary() {
    const parts = [];
    if (draft.serviceId) parts.push(getServiceById(draft.serviceId)?.name);
    if (draft.clinicId)  parts.push(getClinicById(draft.clinicId)?.name);
    if (draft.start)     parts.push(formatDateTime(draft.start));
    summaryEl.innerHTML = parts.length ? `<strong>${parts.join(' · ')}</strong>` : '';
  }


  /* ============================================================
     STEP 1 — SERVICE
     ============================================================ */

  function renderStep1() {
    contentEl.innerHTML = `
      <div class="wizard__title">
        <h1>Choose a Service</h1>
        <p>What kind of dental treatment do you need?</p>
      </div>
      <div class="select-grid" id="grid"></div>
    `;

    const grid = document.getElementById('grid');

    SERVICES.forEach(svc => {
      const card = document.createElement('div');
      card.className = 'select-card' + (draft.serviceId === svc.id ? ' is-selected' : '');
      card.innerHTML = `
        <div class="select-card__icon">${svc.icon}</div>
        <div class="select-card__title">${svc.name}</div>
        <div class="select-card__meta"> ${svc.duration} min · from ₱${svc.price.toLocaleString()}</div>
        <div class="select-card__meta">${svc.description}</div>
      `;
      card.addEventListener('click', () => {
        draft.serviceId = svc.id;
        draft.clinicId = null;
        draft.dentistId = null;
        draft.start = null;
        draft.end = null;
        DB.set('booking_draft', draft);
        goToStep(2);
      });
      grid.appendChild(card);
    });
  }


  /* ============================================================
     STEP 2 — CLINIC
     ============================================================ */

  function renderStep2() {
    const clinics = CLINICS.filter(c =>
      SERVICES.some(s => s.clinicId === c.id && s.id === draft.serviceId)
    );

    contentEl.innerHTML = `
      <div class="wizard__title">
        <h1>Choose a Clinic</h1>
        <p>These clinics offer <strong>${getServiceById(draft.serviceId)?.name}</strong>.</p>
      </div>
      <div class="select-grid" id="grid"></div>
    `;

    const grid = document.getElementById('grid');

    clinics.forEach(clinic => {
      const card = document.createElement('div');
      card.className = 'select-card' + (draft.clinicId === clinic.id ? ' is-selected' : '');
      card.innerHTML = `
        <div class="select-card__icon"></div>
        <div class="select-card__title">${clinic.name}</div>
        <div class="select-card__meta"> ${clinic.address}</div>
        <div class="select-card__meta"> ${clinic.hours}</div>
      `;
      card.addEventListener('click', () => {
        draft.clinicId = clinic.id;
        draft.dentistId = null;
        draft.start = null;
        draft.end = null;
        DB.set('booking_draft', draft);
        goToStep(3);
      });
      grid.appendChild(card);
    });
  }


  /* ============================================================
     STEP 3 — DENTIST
     ============================================================ */

  function renderStep3() {
    const list = DENTISTS.filter(d => d.clinics.includes(draft.clinicId));

    contentEl.innerHTML = `
      <div class="wizard__title">
        <h1>Choose a Dentist</h1>
        <p>Pick a specific dentist or let the clinic assign one.</p>
      </div>
      <div class="select-grid" id="grid"></div>
    `;

    const grid = document.getElementById('grid');

    // "Any Available" option
    const anyCard = document.createElement('div');
    anyCard.className = 'select-card select-card--dashed' +
      (draft.dentistId === 'any' ? ' is-selected' : '');
    anyCard.innerHTML = `
      <div class="select-card__icon"></div>
      <div class="select-card__title">Any Available Dentist</div>
      <div class="select-card__meta">The clinic will assign the first available dentist.</div>
    `;
    anyCard.addEventListener('click', () => {
      draft.dentistId = 'any';
      draft.start = null;
      draft.end = null;
      DB.set('booking_draft', draft);
      goToStep(4);
    });
    grid.appendChild(anyCard);

    // Individual dentists
    list.forEach(d => {
      const card = document.createElement('div');
      card.className = 'select-card' + (draft.dentistId === d.id ? ' is-selected' : '');
      card.innerHTML = `
        <div class="select-card__icon"></div>
        <div class="select-card__title">${d.name}</div>
        <div class="select-card__meta">🩺 ${d.specialty}</div>
        <div class="select-card__meta">${d.bio}</div>
      `;
      card.addEventListener('click', () => {
        draft.dentistId = d.id;
        draft.start = null;
        draft.end = null;
        DB.set('booking_draft', draft);
        goToStep(4);
      });
      grid.appendChild(card);
    });
  }


  /* ============================================================
     STEP 4 — DATE & TIME
     ============================================================ */

  function renderStep4() {
    // Next 14 days (starting tomorrow)
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

    // Effective dentist for slot generation (falls back if "any")
    const effectiveDentistId = draft.dentistId === 'any'
      ? DENTISTS.find(d => d.clinics.includes(draft.clinicId))?.id
      : draft.dentistId;

    const service = getServiceById(draft.serviceId);

    contentEl.innerHTML = `
      <div class="wizard__title">
        <h1>Pick a Date & Time</h1>
        <p>Available slots for <strong>${service?.name}</strong> (${service?.duration} min).</p>
      </div>
      <div class="slot-layout">
        <div class="date-panel">
          <h3>Choose a Date</h3>
          <div class="date-list" id="dateList"></div>
        </div>
        <div class="slot-panel" id="slotPanel">
          <h3>Available Times</h3>
          <p class="text-muted text-sm">Select a date to see available slots.</p>
        </div>
      </div>
    `;

    const dateList = document.getElementById('dateList');
    const slotPanel = document.getElementById('slotPanel');

    // Date chips
    dates.forEach(d => {
      const chip = document.createElement('button');
      chip.className = 'date-chip' + (draft.start?.startsWith(d.iso) ? ' is-selected' : '');
      chip.innerHTML = `<strong>${d.day}</strong><span>${d.date}</span>`;
      chip.addEventListener('click', () => {
        dateList.querySelectorAll('.date-chip')
          .forEach(c => c.classList.remove('is-selected'));
        chip.classList.add('is-selected');
        renderSlots(d.iso);
      });
      dateList.appendChild(chip);
    });

    // Slot grid
    function renderSlots(dateStr) {
      const slots = generateSlotsForDate(dateStr, effectiveDentistId, draft.serviceId);
      const groups = groupSlots(slots);

      if (!slots.some(s => s.available)) {
        slotPanel.innerHTML = `
          <h3>Available Times</h3>
          <div class="slot-empty">
            No available slots on this date.<br/>Please pick another day.
          </div>
        `;
        return;
      }

      slotPanel.innerHTML = '<h3>Available Times</h3>';

      ['Morning', 'Afternoon'].forEach(groupName => {
        const groupSlots = groups[groupName];
        if (!groupSlots.length) return;

        const group = document.createElement('div');
        group.className = 'slot-group';
        group.innerHTML = `<h4>${groupName}</h4>`;

        const grid = document.createElement('div');
        grid.className = 'slot-grid';

        groupSlots.forEach(slot => {
          const btn = document.createElement('button');
          btn.className = 'slot-btn';
          btn.textContent = slot.label;
          btn.disabled = !slot.available;
          if (draft.start === slot.start) btn.classList.add('is-selected');

          btn.addEventListener('click', () => {
            draft.start = slot.start;
            draft.end   = slot.end;
            DB.set('booking_draft', draft);

            slotPanel.querySelectorAll('.slot-btn')
              .forEach(b => b.classList.remove('is-selected'));
            btn.classList.add('is-selected');
            renderSummary();

            setTimeout(() => {
              if (Session.get()?.phoneVerified) goToStep(6);
              else                              goToStep(5);
            }, 500);
          });

          grid.appendChild(btn);
        });

        group.appendChild(grid);
        slotPanel.appendChild(group);
      });
    }

    function groupSlots(slots) {
      const out = { Morning: [], Afternoon: [] };
      slots.forEach(s => {
        const h = new Date(s.start).getHours();
        (h < 12 ? out.Morning : out.Afternoon).push(s);
      });
      return out;
    }

    // If a date is already selected, restore slots
    if (draft.start) renderSlots(draft.start.slice(0, 10));
  }


  /* ============================================================
     STEP 5 — OTP VERIFICATION
     ============================================================ */

  function renderStep5() {
    // Already verified? Skip ahead.
    if (Session.get()?.phoneVerified) {
      goToStep(6);
      return;
    }

    const session = Session.get();

    // Ensure a pending OTP exists
    let pending = DB.get('pending_otp');
    if (!pending || !pending.code) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      pending = {
        userId: session.userId,
        code: otp,
        phone: session.phone,
        expiresAt: Date.now() + 5 * 60 * 1000,
      };
      DB.set('pending_otp', pending);
      sendSms(session.phone, 'OTP', `Your DentaBook verification code is ${otp}`);
    }

    contentEl.innerHTML = `
      <div class="wizard__title">
        <h1>Verify Your Phone</h1>
        <p>We sent a 6-digit code to <strong>${session.phone}</strong>.</p>
      </div>
      <div class="wizard-otp-card">
        <div class="otp-demo">
          <strong>Demo mode:</strong> Your OTP is <code>${pending.code}</code>
        </div>

        <div class="otp-inputs" id="otpInputs">
          <input type="text" inputmode="numeric" maxlength="1" />
          <input type="text" inputmode="numeric" maxlength="1" />
          <input type="text" inputmode="numeric" maxlength="1" />
          <input type="text" inputmode="numeric" maxlength="1" />
          <input type="text" inputmode="numeric" maxlength="1" />
          <input type="text" inputmode="numeric" maxlength="1" />
        </div>

        <button class="btn btn--primary btn--block btn--lg" id="verifyOtpBtn" type="button">
          Verify
        </button>
      </div>
    `;

    const inputs    = Array.from(document.querySelectorAll('#otpInputs input'));
    const inputsBox = document.getElementById('otpInputs');
    const verifyBtn = document.getElementById('verifyOtpBtn');

    // Auto-advance between boxes
    inputs.forEach((input, i) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 1);
        input.value = val;
        input.classList.toggle('is-filled', !!val);
        inputsBox.classList.remove('is-invalid');
        if (val && i < inputs.length - 1) inputs[i + 1].focus();
        if (inputs.every(inp => inp.value)) verify();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && i > 0) {
          inputs[i - 1].focus();
          inputs[i - 1].value = '';
          inputs[i - 1].classList.remove('is-filled');
        }
      });
    });

    inputs[0].focus();
    verifyBtn.addEventListener('click', verify);

    function verify() {
      const entered = inputs.map(i => i.value).join('');

      if (entered.length !== 6) {
        showToast('Please enter all 6 digits.', 'warning');
        return;
      }
      if (entered !== pending.code) {
        inputsBox.classList.add('is-invalid');
        showToast('Incorrect code. Please try again.', 'error');
        inputs.forEach(i => { i.value = ''; i.classList.remove('is-filled'); });
        inputs[0].focus();
        return;
      }
      if (Date.now() > pending.expiresAt) {
        showToast('Code expired. Please request a new one.', 'error');
        return;
      }

      // Success — mark as verified
      const sess = Session.get();
      sess.phoneVerified = true;
      Session.set(sess);

      const users = DB.get('users', []);
      const idx = users.findIndex(u => u.id === sess.userId);
      if (idx !== -1) {
        users[idx].phoneVerified = true;
        DB.set('users', users);
      }
      DB.remove('pending_otp');

      showToast('Phone verified! ', 'success');
      setTimeout(() => goToStep(6), 700);
    }
  }


  /* ============================================================
     STEP 6 — REVIEW + SUBMIT
     ============================================================ */

  function renderStep6() {
    const service = getServiceById(draft.serviceId);
    const clinic  = getClinicById(draft.clinicId);
    const dentist = draft.dentistId === 'any'
      ? { name: 'Any Available Dentist' }
      : getDentistById(draft.dentistId);

    contentEl.innerHTML = `
      <div class="wizard__title">
        <h1>Review Your Booking</h1>
        <p>Please check everything before submitting.</p>
      </div>

      <div class="review-card">
        <div class="review-row"><span>Patient</span><span>${Session.get()?.name}</span></div>
        <div class="review-row"><span>Phone</span><span>${Session.get()?.phone}</span></div>
        <div class="review-row"><span>Service</span><span>${service.name}</span></div>
        <div class="review-row"><span>Duration</span><span>${service.duration} minutes</span></div>
        <div class="review-row"><span>Clinic</span><span>${clinic.name}</span></div>
        <div class="review-row"><span>Address</span><span>${clinic.address}</span></div>
        <div class="review-row"><span>Dentist</span><span>${dentist.name}</span></div>
        <div class="review-row"><span>Date & Time</span><span>${formatDateTime(draft.start)}</span></div>
        <div class="review-row">
          <span>Estimated Fee</span>
          <span>₱${service.price.toLocaleString()} (pay in person)</span>
        </div>

        <div class="form-group mt-3">
          <label class="form-label" for="notes">Notes (optional)</label>
          <textarea id="notes" class="form-control" rows="3"
            placeholder="Any information you want to share with the clinic...">${draft.notes || ''}</textarea>
        </div>

        <div class="terms-row">
          <input type="checkbox" id="agree" />
          <label for="agree">
            I understand that this booking is <strong>pending staff approval</strong>
            and that I can cancel or reschedule up to <strong>24 hours</strong>
            before the appointment.
          </label>
        </div>

        <button class="btn btn--primary btn--block btn--lg" id="submitBtn" type="button" disabled>
          Submit Booking Request
        </button>
      </div>
    `;

    const agree     = document.getElementById('agree');
    const submitBtn = document.getElementById('submitBtn');
    const notes     = document.getElementById('notes');

    agree.addEventListener('change', () => {
      submitBtn.disabled = !agree.checked;
    });

    submitBtn.addEventListener('click', () => {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      const patient = Session.get();
      const appointment = {
        id: generateBookingRef(),
        patientId: patient.userId,
        patientName: patient.name,
        patientPhone: patient.phone,
        clinicId: draft.clinicId,
        dentistId: draft.dentistId,
        serviceId: draft.serviceId,
        start: draft.start,
        end: draft.end,
        status: 'pending',
        notes: notes.value.trim(),
        createdAt: new Date().toISOString(),
      };

      DB.push('appointments', appointment);

      sendSms(
        appointment.patientPhone,
        'BOOKING_SUBMITTED',
        `Your booking request ${appointment.id} at ${clinic.name} is pending approval.`
      );

      // Remember the booking for step 7, and clear the draft
      DB.set('last_booking_id', appointment.id);
      DB.remove('booking_draft');

      setTimeout(() => goToStep(7), 500);
    });
  }


  /* ============================================================
     STEP 7 — CONFIRMATION
     ============================================================ */

  function renderStep7() {
    const refId = DB.get('last_booking_id');
    const booking = DB.get('appointments', []).find(a => a.id === refId);

    if (!booking) {
      contentEl.innerHTML = `
        <div class="wizard__title">
          <h1>Booking not found</h1>
          <p>Please start a new booking.</p>
          <a href="../public/services.html" class="btn btn--primary">Browse Services</a>
        </div>
      `;
      navEl.classList.add('is-hidden');
      return;
    }

    const service = getServiceById(booking.serviceId);
    const clinic  = getClinicById(booking.clinicId);
    const dentist = booking.dentistId === 'any'
      ? { name: 'Any Available Dentist' }
      : getDentistById(booking.dentistId);

    contentEl.innerHTML = `
      <div class="confirm-wrap">
        <div class="confirm-icon">✓</div>
        <h1>Booking Request Submitted!</h1>
        <p>
          Your request is now <strong>pending staff approval</strong>.
          You'll receive an SMS as soon as the clinic reviews it.
        </p>

        <div class="ref-box">
          <strong>${booking.id}</strong>
          <span>Booking Reference</span>
        </div>

        <div class="badge badge--pending mb-3">Pending Approval</div>

        <div class="review-card text-left mb-3">
          <div class="review-row"><span>Service</span><span>${service.name}</span></div>
          <div class="review-row"><span>Clinic</span><span>${clinic.name}</span></div>
          <div class="review-row"><span>Dentist</span><span>${dentist.name}</span></div>
          <div class="review-row"><span>Date & Time</span><span>${formatDateTime(booking.start)}</span></div>
        </div>

        <p class="text-muted text-sm mb-3">
           An SMS has been sent to ${booking.patientPhone}.
        </p>

        <div class="confirm-actions">
          <a href="../patient/dashboard.html" class="btn btn--primary">View My Appointments</a>
          <a href="../public/services.html" class="btn btn--secondary">Book Another</a>
        </div>
      </div>
    `;

    navEl.classList.add('is-hidden');
  }


  /* ============================================================
     BOTTOM NAV
     ============================================================ */

  function updateNavBar() {
    // Hidden on step 1 (nothing to go back to) and step 7 (done)
    if (currentStep === 1 || currentStep === 7) {
      navEl.classList.add('is-hidden');
      return;
    }

    navEl.classList.remove('is-hidden');

    // Back button label reflects what the user is going back to
    backBtn.textContent =
      currentStep === 2 ? '← Change Service' :
      currentStep === 3 ? '← Change Clinic'  :
      currentStep === 4 ? '← Change Dentist' :
      '← Back';

    backBtn.onclick = () => goToStep(currentStep - 1);
  }


  /* ============================================================
     BOOT
     ============================================================ */

  function boot() {
    // Guard: must be logged in
    if (!Session.get()) {
      showToast('Please log in to book an appointment.', 'warning');
      setTimeout(() => window.location.href = '../auth/login.html', 900);
      return;
    }

    // Guard: don't jump ahead
    if (!guardStep(currentStep)) return;

    renderStepper();
    renderSummary();
    updateNavBar();

    switch (currentStep) {
      case 1: renderStep1(); break;
      case 2: renderStep2(); break;
      case 3: renderStep3(); break;
      case 4: renderStep4(); break;
      case 5: renderStep5(); break;
      case 6: renderStep6(); break;
      case 7: renderStep7(); break;
    }
  }

  boot();

})();