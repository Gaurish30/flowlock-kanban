document.addEventListener('DOMContentLoaded', () => {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const panelLogin = document.getElementById('panel-login');
  const panelRegister = document.getElementById('panel-register');

  const getUsersFromStorage = () => {
    return JSON.parse(localStorage.getItem('flowlock_users') || '[]');
  };

  const saveUserToStorage = (newUser) => {
    const users = getUsersFromStorage();
    users.push(newUser);
    localStorage.setItem('flowlock_users', JSON.stringify(users));
  };

  const findUserByEmail = (email) => {
    const users = getUsersFromStorage();
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  };

  function switchTab(target) {
    clearErrors();
    if (target === 'login') {
      tabLogin?.classList.add('active');
      tabLogin?.setAttribute('aria-selected', 'true');
      tabRegister?.classList.remove('active');
      tabRegister?.setAttribute('aria-selected', 'false');

      panelLogin?.classList.add('active');
      panelRegister?.classList.remove('active');
    } else {
      tabRegister?.classList.add('active');
      tabRegister?.setAttribute('aria-selected', 'true');
      tabLogin?.classList.remove('active');
      tabLogin?.setAttribute('aria-selected', 'false');

      panelRegister?.classList.add('active');
      panelLogin?.classList.remove('active');
    }
  }

  tabLogin?.addEventListener('click', () => switchTab('login'));
  tabRegister?.addEventListener('click', () => switchTab('register'));

  function clearErrors() {
    document.querySelectorAll('.form-input').forEach((input) => input.classList.remove('invalid'));
  }

  // --- SIGN IN ---
  panelLogin?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const emailError = document.getElementById('login-email-error');
    const passwordError = document.getElementById('login-password-error');

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let isValid = true;

    if (!email || !emailInput.checkValidity()) {
      emailInput.classList.add('invalid');
      if (emailError) emailError.textContent = 'Please enter a valid email.';
      isValid = false;
    }

    if (!password) {
      passwordInput.classList.add('invalid');
      if (passwordError) passwordError.textContent = 'Password is required.';
      isValid = false;
    }

    if (!isValid) return;

    const existingUser = findUserByEmail(email);

    if (!existingUser) {
      emailInput.classList.add('invalid');
      if (emailError) emailError.textContent = 'No account found. Please sign up first.';
      return;
    }

    if (existingUser.password !== password) {
      passwordInput.classList.add('invalid');
      if (passwordError) passwordError.textContent = 'Incorrect password.';
      return;
    }

    // Save Active Session with User ID
    localStorage.setItem('flowlock_authenticated', 'true');
    localStorage.setItem('flowlock_current_user', JSON.stringify({
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email
    }));

    window.location.href = 'projects.html';
  });

  // --- SIGN UP ---
  panelRegister?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const passwordInput = document.getElementById('reg-password');
    const nameError = document.getElementById('reg-name-error');
    const emailError = document.getElementById('reg-email-error');
    const passwordError = document.getElementById('reg-password-error');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let isValid = true;

    if (!name) {
      nameInput.classList.add('invalid');
      if (nameError) nameError.textContent = 'Name is required.';
      isValid = false;
    }

    if (!email || !emailInput.checkValidity()) {
      emailInput.classList.add('invalid');
      if (emailError) emailError.textContent = 'Valid email required.';
      isValid = false;
    }

    if (!password || password.length < 8) {
      passwordInput.classList.add('invalid');
      if (passwordError) passwordError.textContent = 'Must be at least 8 characters.';
      isValid = false;
    }

    if (!isValid) return;

    if (findUserByEmail(email)) {
      emailInput.classList.add('invalid');
      if (emailError) emailError.textContent = 'Account with this email already exists.';
      return;
    }

    // Generate Unique User ID
    const userId = `usr_${Date.now()}`;
    const newUser = { id: userId, name, email, password, createdAt: new Date().toISOString() };
    saveUserToStorage(newUser);

    // Set Active Session
    localStorage.setItem('flowlock_authenticated', 'true');
    localStorage.setItem('flowlock_current_user', JSON.stringify({ id: userId, name, email }));

    window.location.href = 'projects.html';
  });
});