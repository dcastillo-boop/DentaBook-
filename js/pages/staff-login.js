/* ============================================================
   DentaBook — Staff Login
   ============================================================ */
(function () {

  const form  = document.getElementById('staffLoginForm');
  const email = document.getElementById('email');
  const pw    = document.getElementById('password');

  function setInvalid(input, invalid) {
    input.classList.toggle('is-invalid', invalid);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const em  = email.value.trim().toLowerCase();
    const pwd = pw.value;

    if (!em || !pwd) {
      setInvalid(email, !em);
      setInvalid(pw, !pwd);
      showToast('Please fill in both fields.', 'error');
      return;
    }

    const users = DB.get('users', []);
    const user = users.find(u =>
      u.role === 'staff' &&
      u.email.toLowerCase() === em &&
      u.password === pwd
    );

    if (!user) {
      setInvalid(email, true);
      setInvalid(pw, true);
      showToast('Invalid staff credentials.', 'error');
      return;
    }

    Session.set({
      userId:   user.id,
      role:     'staff',
      name:     user.name,
      email:    user.email,
      clinicId: user.clinicId,
      staffRole: user.staffRole,
    });

    showToast(`Welcome, ${user.name.split(' ')[0]}!`, 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 700);
  });

})();