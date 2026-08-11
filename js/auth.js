document.addEventListener('DOMContentLoaded', () => {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const panelLogin = document.getElementById('panel-login');
  const panelRegister = document.getElementById('panel-register');

  // --- Helper Functions for LocalStorage "Database" ---
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

  // --- Tab Switcher Logic ---
  function switchTab(target) {
    clearErrors();
    if (target === 'login') {
      tabLogin.classList.add('active');
      tabLogin.setAttribute('aria-selected', 'true');
      tabRegister.classList.remove('active');
      tabRegister.setAttribute('aria-selected', 'false');

      panelLogin.classList.add('active');
      panelRegister.classList.remove('active');
    } else {
      tabRegister.classList.add('active');
      tabRegister.setAttribute('aria-selected', 'true');
      tabLogin.classList.remove('active');
      tabLogin.setAttribute('aria-selected', 'false');

      panelRegister.classList.add('active');
      panelLogin.classList.remove('active');
    }
  }

  tabLogin?.addEventListener('click', () => switchTab('login'));
  tabRegister?.addEventListener('click', () => switchTab('register'));

  function clearErrors() {
    document.querySelectorAll('.form-input').forEach((input) => input.classList.remove('invalid'));
  }

  // ==========================================
  // 1. SIGN IN FORM SUBMISSION
  // ==========================================
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

    // Basic format checks
    if (!email || !emailInput.checkValidity()) {
      emailInput.classList.add('invalid');
      emailError.textContent = 'Please enter a valid email address.';
      isValid = false;
    }

    if (!password) {
      passwordInput.classList.add('invalid');
      passwordError.textContent = 'Password is required.';
      isValid = false;
    }

    if (!isValid) return;

    // Check credentials against LocalStorage database
    const existingUser = findUserByEmail(email);

    if (!existingUser) {
      emailInput.classList.add('invalid');
      emailError.textContent = 'No account found with this email. Please sign up first.';
      return;
    }

    if (existingUser.password !== password) {
      passwordInput.classList.add('invalid');
      passwordError.textContent = 'Incorrect password. Please try again.';
      return;
    }

    // Authenticate and save current active user profile
    localStorage.setItem('flowlock_authenticated', 'true');
    localStorage.setItem('flowlock_current_user', JSON.stringify({ name: existingUser.name, email: existingUser.email }));

    // Redirect to landing page with active session
    window.location.href = 'index.html';
  });

  // ==========================================
  // 2. CREATE ACCOUNT FORM SUBMISSION
  // ==========================================
  panelRegister?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const passwordInput = document.getElementById('reg-password');
    const emailError = document.getElementById('reg-email-error');
    const nameError = document.getElementById('reg-name-error');
    const passwordError = document.getElementById('reg-password-error');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let isValid = true;

    if (!name) {
      nameInput.classList.add('invalid');
      nameError.textContent = 'Name is required.';
      isValid = false;
    }

    if (!email || !emailInput.checkValidity()) {
      emailInput.classList.add('invalid');
      emailError.textContent = 'Valid work email required.';
      isValid = false;
    }

    if (!password || password.length < 8) {
      passwordInput.classList.add('invalid');
      passwordError.textContent = 'Must be at least 8 characters.';
      isValid = false;
    }

    if (!isValid) return;

    // Check if email already exists
    if (findUserByEmail(email)) {
      emailInput.classList.add('invalid');
      emailError.textContent = 'An account with this email already exists. Sign in instead.';
      return;
    }

    // Save new user account to LocalStorage
    const newUser = { name, email, password, createdAt: new Date().toISOString() };
    saveUserToStorage(newUser);

    // Authenticate and save active user profile
    localStorage.setItem('flowlock_authenticated', 'true');
    localStorage.setItem('flowlock_current_user', JSON.stringify({ name: newUser.name, email: newUser.email }));

    // Redirect back to home
    window.location.href = 'index.html';
  });
});