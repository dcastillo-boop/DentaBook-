/* ============================================================
   DentaBook — Patient Login Page Logic
   ============================================================ */
(function () {

  const form       = document.getElementById('loginForm');
  const identifier = document.getElementById('identifier');
  const password   = document.getElementById('password');

  function setInvalid(input, invalid) {
    input.classList.toggle('is-invalid', invalid);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const id  = identifier.value.trim().toLowerCase();
    const pwd = password.value;

    if (!id || !pwd) {
      setInvalid(identifier, !id);
      setInvalid(password, !pwd);
      showToast('Please fill in both fields.', 'error');
      return;
    }

    // Match by email OR normalized phone
    const users = DB.get('users', []);
    const user = users.find(u =>
      u.role === 'patient' && (
        u.email.toLowerCase() === id ||
        u.phone.replace(/[\s\-()]/g, '') === id.replace(/[\s\-()]/g, '')
      )
    );

    if (!user || user.password !== pwd) {
      setInvalid(password, true);
      showToast('Incorrect email/phone or password.', 'error');
      return;
    }

    // Session
    Session.set({
      userId: user.id,
      role: 'patient',
      name: user.name,
      email: user.email,
      phone: user.phone,
      phoneVerified: user.phoneVerified === true,
    });

    showToast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');

    const draft = DB.get('booking_draft', null);
    const inBookingFlow = draft && draft.serviceId;

    setTimeout(() => {

      // 1. Phone not verified → OTP
      if (!user.phoneVerified) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        DB.set('pending_otp', {
          userId: user.id,
          code: otp,
          phone: user.phone,
          expiresAt: Date.now() + 5 * 60 * 1000,
        });
        sendSms(user.phone, 'OTP', `Your DentaBook verification code is ${otp}`);
        window.location.href = 'otp.html';
        return;
      }

      // 2. In a booking flow → wizard
      if (inBookingFlow) {
        window.location.href = '../booking/wizard.html?step=4';
        return;
      }

      // 3. Default → dashboard
      window.location.href = '../patient/dashboard.html';
    }, 700);
  });

})();