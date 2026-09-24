/* ============================================================
   DentaBook — OTP Verification Page Logic
   ============================================================ */
(function () {

  /* ------------------------------------------------------------
     Guard: must have a session
  ------------------------------------------------------------ */
  if (!Session.get()) {
    showToast('Please register or log in first.', 'warning');
    setTimeout(() => window.location.href = 'login.html', 800);
    return;
  }

  const session   = Session.get();
  const pending   = DB.get('pending_otp');
  const inputs    = Array.from(document.querySelectorAll('#otpInputs input'));
  const form      = document.getElementById('otpForm');
  const inputsBox = document.getElementById('otpInputs');
  const demoEl    = document.getElementById('demoCode');

  /* ------------------------------------------------------------
     Show phone + demo code
  ------------------------------------------------------------ */
  document.getElementById('phoneDisplay').textContent =
    pending?.phone || session?.phone || 'your phone';
  if (pending?.code) demoEl.textContent = pending.code;

  /* ------------------------------------------------------------
     Auto-advance between boxes
  ------------------------------------------------------------ */
  inputs.forEach((input, i) => {

    // Input: keep only digits, move forward
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      input.value = val.slice(0, 1);
      input.classList.toggle('is-filled', input.value !== '');
      inputsBox.classList.remove('is-invalid');

      if (input.value && i < inputs.length - 1) inputs[i + 1].focus();
      if (inputs.every(inp => inp.value !== '')) form.requestSubmit();
    });

    // Backspace: move back when empty
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) {
        inputs[i - 1].focus();
        inputs[i - 1].value = '';
        inputs[i - 1].classList.remove('is-filled');
      }
    });

    // Paste: fill all boxes from a pasted code
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData)
        .getData('text').replace(/\D/g, '').slice(0, 6);
      if (!text) return;

      text.split('').forEach((ch, idx) => {
        if (inputs[idx]) {
          inputs[idx].value = ch;
          inputs[idx].classList.add('is-filled');
        }
      });

      const nextEmpty = inputs.findIndex(inp => inp.value === '');
      (nextEmpty !== -1 ? inputs[nextEmpty] : inputs[5]).focus();
      if (inputs.every(inp => inp.value !== '')) form.requestSubmit();
    });
  });

  inputs[0].focus();

  /* ------------------------------------------------------------
     Submit
  ------------------------------------------------------------ */
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const entered = inputs.map(i => i.value).join('');

    if (entered.length !== 6) {
      inputsBox.classList.add('is-invalid');
      showToast('Please enter all 6 digits.', 'warning');
      return;
    }

    if (!pending || !pending.code) {
      showToast('No OTP found. Please log in again.', 'error');
      setTimeout(() => window.location.href = 'login.html', 900);
      return;
    }

    if (Date.now() > pending.expiresAt) {
      inputsBox.classList.add('is-invalid');
      showToast('Code expired. Please request a new one.', 'error');
      return;
    }

    if (entered !== pending.code) {
      inputsBox.classList.add('is-invalid');
      showToast('Incorrect code. Please try again.', 'error');
      inputs.forEach(i => {
        i.value = '';
        i.classList.remove('is-filled');
      });
      inputs[0].focus();
      return;
    }

    /* ---------- SUCCESS ---------- */

    // Update session
    const sess = Session.get();
    sess.phoneVerified = true;
    Session.set(sess);

    // Update user record
    const users = DB.get('users', []);
    const idx = users.findIndex(u => u.id === sess.userId);
    if (idx !== -1) {
      users[idx].phoneVerified = true;
      DB.set('users', users);
    }

    DB.remove('pending_otp');

    showToast('Phone verified successfully! ', 'success');

    // Where to go next?
    const draft = DB.get('booking_draft', null);
    const inBookingFlow = draft && draft.serviceId;

    setTimeout(() => {
      if (inBookingFlow) window.location.href = '../booking/wizard.html?step=5';
      else               window.location.href = '../patient/dashboard.html';
    }, 900);
  });

  /* ------------------------------------------------------------
     Resend countdown (30s)
  ------------------------------------------------------------ */
  const resendLink  = document.getElementById('resendLink');
  const countdownEl = document.getElementById('countdown');
  let seconds = 30;

  const timer = setInterval(() => {
    seconds--;
    countdownEl.textContent = seconds;
    if (seconds <= 0) {
      clearInterval(timer);
      resendLink.classList.remove('is-disabled');
      resendLink.textContent = 'Resend code';
    }
  }, 1000);

  resendLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (resendLink.classList.contains('is-disabled')) return;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const sess = Session.get();

    DB.set('pending_otp', {
      userId: sess.userId,
      code: otp,
      phone: sess.phone,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    demoEl.textContent = otp;
    sendSms(sess.phone, 'OTP', `Your new DentaBook verification code is ${otp}`);

    // Restart countdown
    seconds = 30;
    resendLink.classList.add('is-disabled');
    resendLink.innerHTML = 'Resend in <span id="countdown">30</span>s';

    setTimeout(() => {
      const el = document.getElementById('countdown');
      const newTimer = setInterval(() => {
        if (!el) { clearInterval(newTimer); return; }
        seconds--;
        el.textContent = seconds;
        if (seconds <= 0) {
          clearInterval(newTimer);
          resendLink.classList.remove('is-disabled');
          resendLink.textContent = 'Resend code';
        }
      }, 1000);
    }, 10);
  });

})();