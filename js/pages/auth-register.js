/* ============================================================
   DentaBook — Register Page Logic
   ============================================================ */
(function () {

  const form   = document.getElementById('registerForm');
  const fields = {
    name:     document.getElementById('name'),
    email:    document.getElementById('email'),
    phone:    document.getElementById('phone'),
    password: document.getElementById('password'),
    confirm:  document.getElementById('confirm'),
  };

  /* ------------------------------------------------------------
     Validators
  ------------------------------------------------------------ */
  const isEmailValid = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const isPhoneValid = v => v.replace(/[\s\-()]/g, '').length >= 10;

  function setInvalid(input, invalid) {
    input.classList.toggle('is-invalid', invalid);
  }

  /* ------------------------------------------------------------
     Blur validation (better UX than on every keystroke)
  ------------------------------------------------------------ */
  fields.name.addEventListener('blur', () =>
    setInvalid(fields.name, fields.name.value.trim().length < 2));

  fields.email.addEventListener('blur', () =>
    setInvalid(fields.email, !isEmailValid(fields.email.value)));

  fields.phone.addEventListener('blur', () =>
    setInvalid(fields.phone, !isPhoneValid(fields.phone.value)));

  fields.password.addEventListener('blur', () =>
    setInvalid(fields.password, fields.password.value.length < 6));

  fields.confirm.addEventListener('blur', () =>
    setInvalid(fields.confirm, fields.confirm.value !== fields.password.value));

  /* ------------------------------------------------------------
     Submit
  ------------------------------------------------------------ */
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name     = fields.name.value.trim();
    const email    = fields.email.value.trim().toLowerCase();
    const phone    = fields.phone.value.trim();
    const password = fields.password.value;
    const confirm  = fields.confirm.value;

    const checks = {
      name:     name.length >= 2,
      email:    isEmailValid(email),
      phone:    isPhoneValid(phone),
      password: password.length >= 6,
      confirm:  confirm === password,
    };

    Object.entries(checks).forEach(([key, ok]) =>
      setInvalid(fields[key], !ok));

    if (Object.values(checks).some(ok => !ok)) {
      showToast('Please fix the errors above.', 'error');
      return;
    }

    // Prevent duplicate email
    const users = DB.get('users', []);
    if (users.some(u => u.email === email)) {
      setInvalid(fields.email, true);
      showToast('That email is already registered.', 'error');
      return;
    }

    // Create user
    const newUser = {
      id: 'pat-' + Date.now(),
      name, email, phone, password,
      role: 'patient',
      phoneVerified: false,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    DB.set('users', users);

    // Session
    Session.set({
      userId: newUser.id,
      role: 'patient',
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      phoneVerified: false,
    });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    DB.set('pending_otp', {
      userId: newUser.id,
      code: otp,
      phone,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    sendSms(phone, 'OTP', `Your DentaBook verification code is ${otp}`);

    showToast('Account created. Verifying your phone...', 'success');
    setTimeout(() => window.location.href = 'otp.html', 900);
  });

})();