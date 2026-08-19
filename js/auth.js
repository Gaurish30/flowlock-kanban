document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================
     FLOWLOCK AUTH CONTROLLER
     ========================================================== */

  const authCard = document.getElementById('auth-card');

  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');

  const panelLogin = document.getElementById('panel-login');
  const panelRegister = document.getElementById('panel-register');


  /* ==========================================================
     LOCAL STORAGE FUNCTIONS
     ========================================================== */

  const getUsersFromStorage = () => {

    try {

      const users = JSON.parse(
        localStorage.getItem('flowlock_users') || '[]'
      );

      return Array.isArray(users)
        ? users
        : [];

    } catch (error) {

      console.error(
        'Unable to read FlowLock users:',
        error
      );

      return [];
    }

  };


  const saveUserToStorage = (newUser) => {

    const users = getUsersFromStorage();

    users.push(newUser);

    localStorage.setItem(
      'flowlock_users',
      JSON.stringify(users)
    );

  };


  const findUserByEmail = (email) => {

    const users = getUsersFromStorage();

    return users.find(
      (user) =>
        (user.email || '').toLowerCase() ===
        email.toLowerCase()
    );

  };


  /* ==========================================================
     CLEAR ERRORS
     ========================================================== */

  function clearErrors() {

    document
      .querySelectorAll('.form-input')
      .forEach((input) => {

        input.classList.remove('invalid');

      });

  }


  /* ==========================================================
     SWITCH LOGIN / SIGNUP TAB
     ========================================================== */

  function switchTab(target) {

    clearErrors();


    /* ---------------- LOGIN ---------------- */

    if (target === 'login') {

      tabLogin?.classList.add('active');

      tabLogin?.setAttribute(
        'aria-selected',
        'true'
      );


      tabRegister?.classList.remove('active');

      tabRegister?.setAttribute(
        'aria-selected',
        'false'
      );


      panelLogin?.classList.add('active');

      panelRegister?.classList.remove('active');


      authCard?.classList.remove(
        'register-mode'
      );

      authCard?.classList.add(
        'login-mode'
      );

    }


    /* ---------------- REGISTER ---------------- */

    else {

      tabRegister?.classList.add('active');

      tabRegister?.setAttribute(
        'aria-selected',
        'true'
      );


      tabLogin?.classList.remove('active');

      tabLogin?.setAttribute(
        'aria-selected',
        'false'
      );


      panelRegister?.classList.add('active');

      panelLogin?.classList.remove('active');


      authCard?.classList.remove(
        'login-mode'
      );

      authCard?.classList.add(
        'register-mode'
      );

    }

  }


  /* ==========================================================
     LOGIN / SIGNUP URL MODE

     auth.html?mode=login
     auth.html?mode=signup
     ========================================================== */

  authCard?.classList.add(
    'login-mode'
  );


  const authPageQuery =
    window.location.search;


  if (
    authPageQuery.includes(
      'mode=signup'
    )
  ) {

    switchTab('register');

  } else {

    switchTab('login');

  }


  /* ==========================================================
     TAB BUTTON EVENTS
     ========================================================== */

  tabLogin?.addEventListener(
    'click',
    () => {

      switchTab('login');

    }
  );


  tabRegister?.addEventListener(
    'click',
    () => {

      switchTab('register');

    }
  );


  /* ==========================================================
     SIGN IN
     ========================================================== */

  panelLogin?.addEventListener(
    'submit',
    (event) => {

      event.preventDefault();

      clearErrors();


      const emailInput =
        document.getElementById(
          'login-email'
        );


      const passwordInput =
        document.getElementById(
          'login-password'
        );


      const emailError =
        document.getElementById(
          'login-email-error'
        );


      const passwordError =
        document.getElementById(
          'login-password-error'
        );


      const email =
        emailInput.value.trim();


      const password =
        passwordInput.value;


      let isValid = true;


      /* ======================================================
         EMAIL VALIDATION
         ====================================================== */

      if (
        !email ||
        !emailInput.checkValidity()
      ) {

        emailInput.classList.add(
          'invalid'
        );


        if (emailError) {

          emailError.textContent =
            'Please enter a valid email.';

        }


        isValid = false;

      }


      /* ======================================================
         PASSWORD VALIDATION
         ====================================================== */

      if (!password) {

        passwordInput.classList.add(
          'invalid'
        );


        if (passwordError) {

          passwordError.textContent =
            'Password is required.';

        }


        isValid = false;

      }


      if (!isValid) {

        return;

      }


      /* ======================================================
         FIND USER
         ====================================================== */

      const existingUser =
        findUserByEmail(email);


      if (!existingUser) {

        emailInput.classList.add(
          'invalid'
        );


        if (emailError) {

          emailError.textContent =
            'No account found. Please sign up first.';

        }


        return;

      }


      /* ======================================================
         CHECK PASSWORD
         ====================================================== */

      if (
        existingUser.password !== password
      ) {

        passwordInput.classList.add(
          'invalid'
        );


        if (passwordError) {

          passwordError.textContent =
            'Incorrect password.';

        }


        return;

      }


      /* ======================================================
         SAVE ACTIVE SESSION
         ====================================================== */

      localStorage.setItem(
        'flowlock_authenticated',
        'true'
      );


      localStorage.setItem(
        'flowlock_current_user',
        JSON.stringify({

          id: existingUser.id,

          name: existingUser.name,

          email: existingUser.email

        })
      );


      /*
       * IMPORTANT
       *
       * Go to landing page after login.
       *
       * landing.js will check:
       *
       * Does this user have projects?
       *
       * YES → Continue Workspace
       *
       * NO  → Create New Project
       */

      window.location.href =
        'index.html';

    }
  );


  /* ==========================================================
     SIGN UP
     ========================================================== */

  panelRegister?.addEventListener(
    'submit',
    (event) => {

      event.preventDefault();

      clearErrors();


      const nameInput =
        document.getElementById(
          'reg-name'
        );


      const emailInput =
        document.getElementById(
          'reg-email'
        );


      const passwordInput =
        document.getElementById(
          'reg-password'
        );


      const nameError =
        document.getElementById(
          'reg-name-error'
        );


      const emailError =
        document.getElementById(
          'reg-email-error'
        );


      const passwordError =
        document.getElementById(
          'reg-password-error'
        );


      const name =
        nameInput.value.trim();


      const email =
        emailInput.value.trim();


      const password =
        passwordInput.value;


      let isValid = true;


      /* ======================================================
         NAME VALIDATION
         ====================================================== */

      if (!name) {

        nameInput.classList.add(
          'invalid'
        );


        if (nameError) {

          nameError.textContent =
            'Name is required.';

        }


        isValid = false;

      }


      /* ======================================================
         EMAIL VALIDATION
         ====================================================== */

      if (
        !email ||
        !emailInput.checkValidity()
      ) {

        emailInput.classList.add(
          'invalid'
        );


        if (emailError) {

          emailError.textContent =
            'Valid email required.';

        }


        isValid = false;

      }


      /* ======================================================
         PASSWORD VALIDATION
         ====================================================== */

      if (
        !password ||
        password.length < 8
      ) {

        passwordInput.classList.add(
          'invalid'
        );


        if (passwordError) {

          passwordError.textContent =
            'Must be at least 8 characters.';

        }


        isValid = false;

      }


      if (!isValid) {

        return;

      }


      /* ======================================================
         PREVENT DUPLICATE ACCOUNT
         ====================================================== */

      if (
        findUserByEmail(email)
      ) {

        emailInput.classList.add(
          'invalid'
        );


        if (emailError) {

          emailError.textContent =
            'Account with this email already exists.';

        }


        return;

      }


      /* ======================================================
         CREATE USER OBJECT
         ====================================================== */

      const userId =
        `usr_${Date.now()}`;


      const newUser = {

        id: userId,

        name: name,

        email: email,

        password: password,

        createdAt:
          new Date().toISOString()

      };


      /* ======================================================
         SAVE USER
         ====================================================== */

      saveUserToStorage(
        newUser
      );


      /* ======================================================
         SAVE ACTIVE SESSION
         ====================================================== */

      localStorage.setItem(
        'flowlock_authenticated',
        'true'
      );


      localStorage.setItem(
        'flowlock_current_user',
        JSON.stringify({

          id: userId,

          name: name,

          email: email

        })
      );


      /*
       * IMPORTANT:
       *
       * We DO NOT create a fake/default project here.
       *
       * New user's project list stays empty.
       */


      /* ======================================================
         RETURN TO LANDING PAGE
         ====================================================== */

      window.location.href =
        'index.html';

    }
  );


  /* ==========================================================
     AUTH ENTRANCE ANIMATION
     ========================================================== */

  function runEntranceAnimations() {


    /* Check reduced motion setting */

    const reduceMotion =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;


    if (reduceMotion) {

      return;

    }


    /* ======================================================
       HEADER
       ====================================================== */

    const header =
      document.querySelector(
        '.auth-header'
      );


    if (header) {

      header.animate(

        [

          {

            opacity: 0,

            transform:
              'translateX(-50%) translateY(-25px)'

          },


          {

            opacity: 1,

            transform:
              'translateX(-50%) translateY(0)'

          }

        ],

        {

          duration: 650,

          easing:
            'cubic-bezier(.22,1,.36,1)',

          fill: 'both'

        }

      );

    }


    /* ======================================================
       MAIN AUTH CARD
       ====================================================== */

    const card =
      document.querySelector(
        '.auth-card'
      );


    if (card) {

      card.animate(

        [

          {

            opacity: 0,

            transform:
              'translateY(35px) rotate(-2deg) scale(.94)'

          },


          {

            opacity: 1,

            transform:
              'translateY(0) rotate(-0.35deg) scale(1)'

          }

        ],

        {

          duration: 850,

          delay: 130,

          easing:
            'cubic-bezier(.16,1,.3,1)',

          fill: 'both'

        }

      );

    }


    /* ======================================================
       STICKY NOTES
       ====================================================== */

    const notes =
      document.querySelectorAll(
        '.board-note'
      );


    notes.forEach(
      (note, index) => {


        const direction =
          index % 2 === 0
            ? '-35px'
            : '35px';


        note.animate(

          [

            {

              opacity: 0,

              transform:
                `translateX(${direction}) rotate(0deg) scale(.86)`

            },


            {

              opacity: 1

            }

          ],

          {

            duration: 700,

            delay:
              300 + index * 130,

            easing:
              'cubic-bezier(.34,1.56,.64,1)',

            fill: 'both'

          }

        );

      }
    );


    /* ======================================================
       DOODLES
       ====================================================== */

    const sketchElements =
      document.querySelectorAll(
        `
          .sketch-arrow,
          .checkbox-doodle,
          .paperclip-doodle,
          .corner-tape-doodle,
          .mini-flowchart,
          .sketch-text,
          .sketch-star
        `
      );


    sketchElements.forEach(
      (element, index) => {

        element.animate(

          [

            {

              opacity: 0,

              transform:
                'translateY(15px) scale(.75) rotate(-5deg)'

            },


            {

              opacity: 1

            }

          ],

          {

            duration: 540,

            delay:
              500 + index * 80,

            easing:
              'cubic-bezier(.34,1.56,.64,1)',

            fill: 'both'

          }

        );

      }
    );

  }


  runEntranceAnimations();


  /* ==========================================================
     GOOGLE / GITHUB AUTH
     ========================================================== */

  const googleAuthButton =
    document.getElementById(
      'google-auth-btn'
    );


  const githubAuthButton =
    document.getElementById(
      'github-auth-btn'
    );


  const oauthNote =
    document.getElementById(
      'oauth-note'
    );


  /* ==========================================================
     SOCIAL LOGIN MESSAGE
     ========================================================== */

  function showOAuthMessage(provider) {

    if (!oauthNote) {

      return;

    }


    oauthNote.textContent =
      `${provider} sign-in needs OAuth configuration before it can authenticate a real account.`;


    oauthNote.classList.add(
      'visible'
    );

  }


  /* ==========================================================
     GOOGLE BUTTON
     ========================================================== */

  googleAuthButton?.addEventListener(
    'click',
    () => {

      showOAuthMessage(
        'Google'
      );

    }
  );


  /* ==========================================================
     GITHUB BUTTON
     ========================================================== */

  githubAuthButton?.addEventListener(
    'click',
    () => {

      showOAuthMessage(
        'GitHub'
      );

    }
  );

});