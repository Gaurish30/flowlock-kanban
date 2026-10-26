document.addEventListener('DOMContentLoaded', () => {

  const form =
    document.getElementById('forgot-form');

  const emailInput =
    document.getElementById('forgot-email');

  const passwordInput =
    document.getElementById('forgot-password');

  const confirmInput =
    document.getElementById('forgot-confirm-password');


  const emailError =
    document.getElementById('forgot-email-error');

  const passwordError =
    document.getElementById('forgot-password-error');

  const confirmError =
    document.getElementById('forgot-confirm-error');

  const resetMessage =
    document.getElementById('reset-message');


  function clearErrors() {

    document
      .querySelectorAll('.form-input')
      .forEach((input) => {
        input.classList.remove('invalid');
      });

  }


  function getUsers() {

    return JSON.parse(
      localStorage.getItem('flowlock_users') || '[]'
    );

  }


  form?.addEventListener('submit', (event) => {

    event.preventDefault();

    clearErrors();


    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value;

    const confirmPassword =
      confirmInput.value;


    let valid = true;


    if (
      !email ||
      !emailInput.checkValidity()
    ) {

      emailInput.classList.add('invalid');

      emailError.textContent =
        'Please enter a valid email address.';

      valid = false;

    }


    if (
      !password ||
      password.length < 8
    ) {

      passwordInput.classList.add('invalid');

      passwordError.textContent =
        'Password must contain at least 8 characters.';

      valid = false;

    }


    if (
      !confirmPassword ||
      confirmPassword !== password
    ) {

      confirmInput.classList.add('invalid');

      confirmError.textContent =
        'Passwords do not match.';

      valid = false;

    }


    if (!valid) return;


    const users =
      getUsers();


    const userIndex =
      users.findIndex(
        (user) =>
          user.email.toLowerCase() ===
          email.toLowerCase()
      );


    if (userIndex === -1) {

      emailInput.classList.add('invalid');

      emailError.textContent =
        'No FlowLock account was found with this email.';

      return;

    }


    /*
     * Component-1 demo storage.
     *
     * For production this must be handled
     * server-side with password hashing
     * and reset tokens.
     */

    users[userIndex].password =
      password;


    users[userIndex].passwordUpdatedAt =
      new Date().toISOString();


    localStorage.setItem(
      'flowlock_users',
      JSON.stringify(users)
    );


    resetMessage.textContent =
      '✓ Password updated! You can sign in now.';


    resetMessage.style.color =
      '#16763a';


    form.animate(
      [
        {
          transform: 'scale(1)'
        },

        {
          transform: 'scale(1.015)'
        },

        {
          transform: 'scale(1)'
        }
      ],
      {
        duration: 420,
        easing: 'ease'
      }
    );


    passwordInput.value = '';
    confirmInput.value = '';

  });


  /*
   * Entrance animation
   */

  document
    .querySelector('.auth-card')
    ?.animate(
      [
        {
          opacity: 0,
          transform:
            'translateY(35px) rotate(-2deg) scale(.94)'
        },

        {
          opacity: 1,
          transform:
            'translateY(0) rotate(-0.4deg) scale(1)'
        }
      ],
      {
        duration: 800,
        easing:
          'cubic-bezier(.16,1,.3,1)',
        fill: 'both'
      }
    );

});