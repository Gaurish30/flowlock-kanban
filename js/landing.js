document.addEventListener(
  'DOMContentLoaded',
  () => {

    /* ==========================================================
       FLOWLOCK LANDING CONTROLLER

       JavaScript concepts used:
       - const / let
       - Functions
       - Arrays
       - Objects
       - filter()
       - find()
       - forEach()
       - Conditions
       - DOM
       - Events
       - Local Storage
       - JSON
       - Template Literals
       ========================================================== */


    /* ==========================================================
       STORAGE KEYS
       ========================================================== */

    const AUTH_KEY =
      'flowlock_authenticated';


    const CURRENT_USER_KEY =
      'flowlock_current_user';


    const PROJECTS_KEY =
      'flowlock_global_projects';



    /* ==========================================================
       DOM ELEMENTS
       ========================================================== */

    const navActions =
      document.getElementById(
        'landing-nav-actions'
      );


    const navProjectsLink =
      document.getElementById(
        'nav-projects-link'
      );


    const navWorkspaceLink =
      document.getElementById(
        'nav-workspace-link'
      );


    const heroPrimaryAction =
      document.getElementById(
        'hero-primary-action'
      );


    const heroSecondaryAction =
      document.getElementById(
        'hero-secondary-action'
      );


    const finalPrimaryAction =
      document.getElementById(
        'final-primary-action'
      );


    const finalSecondaryAction =
      document.getElementById(
        'final-secondary-action'
      );


    const sessionNote =
      document.getElementById(
        'landing-session-note'
      );



    /* ==========================================================
       SAFE HTML
       ========================================================== */

    function escapeHTML(
      value = ''
    ) {

      const element =
        document.createElement(
          'div'
        );


      element.textContent =
        String(value);


      return element.innerHTML;

    }



    /* ==========================================================
       READ CURRENT USER
       ========================================================== */

    function getCurrentUser() {

      try {

        return JSON.parse(
          localStorage.getItem(
            CURRENT_USER_KEY
          ) || 'null'
        );

      } catch (error) {

        console.error(
          'Unable to read current user',
          error
        );


        return null;

      }

    }



    /* ==========================================================
       READ PROJECTS
       ========================================================== */

    function getProjects() {

      try {

        const projects =
          JSON.parse(
            localStorage.getItem(
              PROJECTS_KEY
            ) || '[]'
          );


        return Array.isArray(
          projects
        )
          ? projects
          : [];

      } catch (error) {

        console.error(
          'Unable to read projects',
          error
        );


        return [];

      }

    }



    /* ==========================================================
       GET PROJECTS FOR CURRENT USER

       User can see project when:
       1. user owns it
       OR
       2. user is invited as member
       ========================================================== */

    function getAccessibleProjects(
      user,
      projects
    ) {

      return projects.filter(
        (project) => {

          const isOwner =
            project.ownerId ===
            user.id;


          const isMember =
            Array.isArray(
              project.members
            )
            &&
            project.members.includes(
              user.id
            );


          return (
            isOwner ||
            isMember
          );

        }
      );

    }



    /* ==========================================================
       FIND WORKSPACE TO CONTINUE
       ========================================================== */

    function getContinueProject(
      user,
      projects
    ) {

      if (
        projects.length === 0
      ) {

        return null;

      }


      const lastProjectId =
        localStorage.getItem(
          `flowlock_last_project_${user.id}`
        );


      if (lastProjectId) {

        const savedProject =
          projects.find(
            (project) =>
              project.id ===
              lastProjectId
          );


        if (savedProject) {

          return savedProject;

        }

      }


      /*
       * Otherwise use most recently
       * created accessible project.
       */

      const copiedProjects =
        [...projects];


      copiedProjects.sort(
        (a, b) => {

          const aDate =
            new Date(
              a.createdAt || 0
            ).getTime();


          const bDate =
            new Date(
              b.createdAt || 0
            ).getTime();


          return (
            bDate -
            aDate
          );

        }
      );


      return (
        copiedProjects[0] ||
        projects[
          projects.length - 1
        ]
      );

    }



    /* ==========================================================
       UPDATE ANCHOR
       ========================================================== */

    function setAction(
      element,
      text,
      href
    ) {

      if (!element) {

        return;

      }


      element.textContent =
        text;


      element.href =
        href;

    }



    /* ==========================================================
       GUEST LANDING
       ========================================================== */

    function renderGuestState() {

      if (navActions) {

        navActions.innerHTML = `

          <a
            href="auth.html?mode=login"
            class="btn-walnut-login"
          >
            Log In
          </a>


          <a
            href="auth.html?mode=signup"
            class="btn-walnut-signup"
          >

            <span>
              Sign Up
            </span>

            <span>
              →
            </span>

          </a>

        `;

      }


      if (navProjectsLink) {

        navProjectsLink.textContent =
          'Projects';


        navProjectsLink.href =
          'auth.html?mode=login';

      }


      if (navWorkspaceLink) {

        navWorkspaceLink.textContent =
          'App Workspace';


        navWorkspaceLink.href =
          'auth.html?mode=login';

      }


      setAction(
        heroPrimaryAction,
        'Get Started Free',
        'auth.html?mode=signup'
      );


      setAction(
        heroSecondaryAction,
        'View Demo',
        '#demo'
      );


      setAction(
        finalPrimaryAction,
        'Get Started Free',
        'auth.html?mode=signup'
      );


      setAction(
        finalSecondaryAction,
        'View Engine Demo',
        '#demo'
      );


      if (sessionNote) {

        sessionNote.hidden =
          true;

      }

    }



    /* ==========================================================
       LOGGED-IN LANDING
       ========================================================== */

    function renderAuthenticatedState(
      user,
      projects
    ) {

      const displayName =
        user.name ||
        user.email ||
        'FlowLock User';


      const safeName =
        escapeHTML(
          displayName
        );


      const firstLetter =
        displayName
          .charAt(0)
          .toUpperCase();


      const continueProject =
        getContinueProject(
          user,
          projects
        );


      /* ========================================================
         NAVBAR USER
         ======================================================== */

      if (navActions) {

        navActions.innerHTML = `

          <a
            href="projects.html"
            class="nav-user-profile"
            title="Open My Projects"
          >

            <span class="nav-user-avatar">

              ${firstLetter}

            </span>


            <span class="nav-user-copy">

              <span class="nav-user-name">

                ${safeName}

              </span>


              <span class="nav-user-state">

                ${projects.length}

                ${
                  projects.length === 1
                    ? 'workspace'
                    : 'workspaces'
                }

              </span>

            </span>

          </a>


          <button
            type="button"
            class="btn-walnut-logout"
            id="landing-logout"
          >
            Sign Out
          </button>

        `;

      }


      /* ========================================================
         PROJECTS NAV
         ======================================================== */

      if (navProjectsLink) {

        navProjectsLink.textContent =
          'My Projects';


        navProjectsLink.href =
          'projects.html';

      }



      /* ========================================================
         USER HAS EXISTING PROJECT
         ======================================================== */

      if (continueProject) {

        const workspaceURL =
          `app.html?board=${encodeURIComponent(
            continueProject.id
          )}`;


        localStorage.setItem(
          `flowlock_last_project_${user.id}`,
          continueProject.id
        );


        if (navWorkspaceLink) {

          navWorkspaceLink.textContent =
            'Continue Workspace';


          navWorkspaceLink.href =
            workspaceURL;

        }


        setAction(
          heroPrimaryAction,
          'Continue Workspace →',
          workspaceURL
        );


        setAction(
          heroSecondaryAction,
          'My Projects',
          'projects.html'
        );


        setAction(
          finalPrimaryAction,
          'Continue Workspace →',
          workspaceURL
        );


        setAction(
          finalSecondaryAction,
          'My Projects',
          'projects.html'
        );


        if (sessionNote) {

          sessionNote.hidden =
            false;


          sessionNote.textContent =
            `Welcome back, ${displayName} — continue "${continueProject.title || 'your workspace'}"`;

        }

      }



      /* ========================================================
         USER HAS NO PROJECTS
         ======================================================== */

      else {

        if (navWorkspaceLink) {

          navWorkspaceLink.textContent =
            'Create Workspace';


          navWorkspaceLink.href =
            'projects.html?create=1';

        }


        setAction(
          heroPrimaryAction,
          '+ Create New Project',
          'projects.html?create=1'
        );


        setAction(
          heroSecondaryAction,
          'My Projects',
          'projects.html'
        );


        setAction(
          finalPrimaryAction,
          '+ Create New Project',
          'projects.html?create=1'
        );


        setAction(
          finalSecondaryAction,
          'My Projects',
          'projects.html'
        );


        if (sessionNote) {

          sessionNote.hidden =
            false;


          sessionNote.textContent =
            `Welcome, ${displayName} — create your first FlowLock workspace`;

        }

      }



      /* ========================================================
         SIGN OUT
         ======================================================== */

      const logoutButton =
        document.getElementById(
          'landing-logout'
        );


      logoutButton
        ?.addEventListener(
          'click',
          () => {

            localStorage.removeItem(
              AUTH_KEY
            );


            localStorage.removeItem(
              CURRENT_USER_KEY
            );


            window.location.href =
              'index.html';

          }
        );

    }



    /* ==========================================================
       INITIAL AUTH STATE
       ========================================================== */

    const isAuthenticated =
      localStorage.getItem(
        AUTH_KEY
      ) === 'true';


    const currentUser =
      getCurrentUser();


    if (
      !isAuthenticated ||
      !currentUser
    ) {

      renderGuestState();

    } else {

      const allProjects =
        getProjects();


      const userProjects =
        getAccessibleProjects(
          currentUser,
          allProjects
        );


      renderAuthenticatedState(
        currentUser,
        userProjects
      );

    }



    /* ==========================================================
       INTERACTIVE ENGINE
       ========================================================== */

    const nodeA =
      document.getElementById(
        'nodeA'
      );


    const nodeB =
      document.getElementById(
        'nodeB'
      );


    const nodeC =
      document.getElementById(
        'nodeC'
      );


    const tagA =
      document.getElementById(
        'tagA'
      );


    const tagB =
      document.getElementById(
        'tagB'
      );


    const tagC =
      document.getElementById(
        'tagC'
      );


    const descC =
      document.getElementById(
        'descC'
      );


    const edgeAC =
      document.getElementById(
        'edgeAC'
      );


    const edgeBC =
      document.getElementById(
        'edgeBC'
      );


    let taskACompleted =
      false;


    let taskBCompleted =
      false;



    /* ==========================================================
       UPDATE ENGINE
       ========================================================== */

    function updateEngineState() {

      if (
        !nodeA ||
        !nodeB ||
        !nodeC
      ) {

        return;

      }


      /* Task A */

      if (taskACompleted) {

        nodeA.classList.add(
          'is-done'
        );


        tagA.textContent =
          '✔ COMPLETED';


        tagA.className =
          'status-complete';


        edgeAC?.classList.remove(
          'engine-edge-locked'
        );


        edgeAC?.classList.add(
          'engine-edge-unlocked'
        );

      } else {

        nodeA.classList.remove(
          'is-done'
        );


        tagA.textContent =
          '⏳ IN PROGRESS';


        tagA.className =
          'status-progress';


        edgeAC?.classList.remove(
          'engine-edge-unlocked'
        );


        edgeAC?.classList.add(
          'engine-edge-locked'
        );

      }


      /* Task B */

      if (taskBCompleted) {

        nodeB.classList.add(
          'is-done'
        );


        tagB.textContent =
          '✔ COMPLETED';


        tagB.className =
          'status-complete';


        edgeBC?.classList.remove(
          'engine-edge-locked'
        );


        edgeBC?.classList.add(
          'engine-edge-unlocked'
        );

      } else {

        nodeB.classList.remove(
          'is-done'
        );


        tagB.textContent =
          '⏳ IN PROGRESS';


        tagB.className =
          'status-progress';


        edgeBC?.classList.remove(
          'engine-edge-unlocked'
        );


        edgeBC?.classList.add(
          'engine-edge-locked'
        );

      }



      /* Task C */

      if (
        taskACompleted &&
        taskBCompleted
      ) {

        nodeC.className =
          'interactive-node is-ready';


        tagC.textContent =
          '🔓 UNLOCKED';


        tagC.className =
          'status-complete';


        descC.textContent =
          'All dependencies completed. Ready to start!';

      }


      else if (
        taskACompleted
      ) {

        nodeC.className =
          'interactive-node is-locked';


        tagC.textContent =
          '🔒 PARTIALLY LOCKED';


        tagC.className =
          'status-locked';


        descC.textContent =
          'Waiting for Task B';

      }


      else if (
        taskBCompleted
      ) {

        nodeC.className =
          'interactive-node is-locked';


        tagC.textContent =
          '🔒 PARTIALLY LOCKED';


        tagC.className =
          'status-locked';


        descC.textContent =
          'Waiting for Task A';

      }


      else {

        nodeC.className =
          'interactive-node is-locked';


        tagC.textContent =
          '🔒 LOCKED';


        tagC.className =
          'status-locked';


        descC.textContent =
          'Requires Task A and Task B';

      }


      updateGraphLines();

    }



    /* ==========================================================
       ENGINE EVENTS
       ========================================================== */

    nodeA?.addEventListener(
      'click',
      () => {

        taskACompleted =
          !taskACompleted;


        updateEngineState();

      }
    );


    nodeB?.addEventListener(
      'click',
      () => {

        taskBCompleted =
          !taskBCompleted;


        updateEngineState();

      }
    );


    document
      .getElementById(
        'reset-demo-btn'
      )
      ?.addEventListener(
        'click',
        () => {

          taskACompleted =
            false;


          taskBCompleted =
            false;


          updateEngineState();

        }
      );



    /* ==========================================================
       GRAPH COORDINATE FUNCTION
       ========================================================== */

    function getCenterPoint(
      element,
      container
    ) {

      const elementRect =
        element.getBoundingClientRect();


      const containerRect =
        container.getBoundingClientRect();


      return {

        x:
          elementRect.left -
          containerRect.left +
          elementRect.width / 2,


        y:
          elementRect.top -
          containerRect.top +
          elementRect.height / 2

      };

    }



    /* ==========================================================
       UPDATE SVG GRAPH LINES
       ========================================================== */

    function updateGraphLines() {

      /* Hero graph */

      const heroBoard =
        document.querySelector(
          '.hero-board'
        );


      const heroNode1 =
        document.getElementById(
          'hero-node-one'
        );


      const heroNode2 =
        document.getElementById(
          'hero-node-two'
        );


      const heroNode3 =
        document.getElementById(
          'hero-node-three'
        );


      const heroEdge1 =
        document.getElementById(
          'hero-edge-one'
        );


      const heroEdge2 =
        document.getElementById(
          'hero-edge-two'
        );


      if (
        heroBoard &&
        heroNode1 &&
        heroNode2 &&
        heroNode3 &&
        heroEdge1 &&
        heroEdge2
      ) {

        const p1 =
          getCenterPoint(
            heroNode1,
            heroBoard
          );


        const p2 =
          getCenterPoint(
            heroNode2,
            heroBoard
          );


        const p3 =
          getCenterPoint(
            heroNode3,
            heroBoard
          );


        heroEdge1.setAttribute(
          'x1',
          p1.x
        );


        heroEdge1.setAttribute(
          'y1',
          p1.y
        );


        heroEdge1.setAttribute(
          'x2',
          p3.x
        );


        heroEdge1.setAttribute(
          'y2',
          p3.y
        );


        heroEdge2.setAttribute(
          'x1',
          p2.x
        );


        heroEdge2.setAttribute(
          'y1',
          p2.y
        );


        heroEdge2.setAttribute(
          'x2',
          p3.x
        );


        heroEdge2.setAttribute(
          'y2',
          p3.y
        );

      }



      /* Engine graph */

      const engineStage =
        document.getElementById(
          'engine-stage'
        );


      if (
        engineStage &&
        nodeA &&
        nodeB &&
        nodeC &&
        edgeAC &&
        edgeBC
      ) {

        const pointA =
          getCenterPoint(
            nodeA,
            engineStage
          );


        const pointB =
          getCenterPoint(
            nodeB,
            engineStage
          );


        const pointC =
          getCenterPoint(
            nodeC,
            engineStage
          );


        edgeAC.setAttribute(
          'x1',
          pointA.x
        );


        edgeAC.setAttribute(
          'y1',
          pointA.y
        );


        edgeAC.setAttribute(
          'x2',
          pointC.x
        );


        edgeAC.setAttribute(
          'y2',
          pointC.y
        );


        edgeBC.setAttribute(
          'x1',
          pointB.x
        );


        edgeBC.setAttribute(
          'y1',
          pointB.y
        );


        edgeBC.setAttribute(
          'x2',
          pointC.x
        );


        edgeBC.setAttribute(
          'y2',
          pointC.y
        );

      }

    }



    /* ==========================================================
       ALGORITHM GRAPH LINES
       ========================================================== */

    function updateAlgorithmLines() {

      const stage =
        document.getElementById(
          'algo-stage'
        );


      const core =
        document.getElementById(
          'algoCore'
        );


      const cards =
        document.querySelectorAll(
          '.algo-card'
        );


      if (
        !stage ||
        !core ||
        cards.length === 0
      ) {

        return;

      }


      const corePoint =
        getCenterPoint(
          core,
          stage
        );


      cards.forEach(
        (card, index) => {

          const cardPoint =
            getCenterPoint(
              card,
              stage
            );


          const line =
            document.getElementById(
              `algoLine${index + 1}`
            );


          if (!line) {

            return;

          }


          line.setAttribute(
            'x1',
            corePoint.x
          );


          line.setAttribute(
            'y1',
            corePoint.y
          );


          line.setAttribute(
            'x2',
            cardPoint.x
          );


          line.setAttribute(
            'y2',
            cardPoint.y
          );

        }
      );

    }



    /* ==========================================================
       ALGORITHM HOVER
       ========================================================== */

    document
      .querySelectorAll(
        '.algo-card'
      )
      .forEach(
        (card) => {

          card.addEventListener(
            'mouseenter',
            () => {

              document
                .querySelectorAll(
                  '.algo-edge-path'
                )
                .forEach(
                  (line) => {

                    line.classList.remove(
                      'active'
                    );

                  }
                );


              const number =
                card.dataset.algo;


              document
                .getElementById(
                  `algoLine${number}`
                )
                ?.classList.add(
                  'active'
                );

            }
          );


          card.addEventListener(
            'mouseleave',
            () => {

              document
                .querySelectorAll(
                  '.algo-edge-path'
                )
                .forEach(
                  (line) => {

                    line.classList.remove(
                      'active'
                    );

                  }
                );

            }
          );

        }
      );



    /* ==========================================================
       INITIAL GRAPH DRAW
       ========================================================== */

    setTimeout(
      () => {

        updateGraphLines();

        updateAlgorithmLines();

      },
      150
    );


    window.addEventListener(
      'resize',
      () => {

        updateGraphLines();

        updateAlgorithmLines();

      }
    );



    /* ==========================================================
       LENIS
       ========================================================== */

    if (
      typeof Lenis !==
      'undefined'
    ) {

      const lenis =
        new Lenis({

          duration:
            1.1,

          smoothWheel:
            true

        });


      function lenisAnimation(
        time
      ) {

        lenis.raf(
          time
        );


        requestAnimationFrame(
          lenisAnimation
        );

      }


      requestAnimationFrame(
        lenisAnimation
      );

    }



    /* ==========================================================
       GSAP ANIMATIONS
       ========================================================== */

    if (
      typeof gsap !==
      'undefined'
    ) {

      if (
        typeof ScrollTrigger !==
        'undefined'
      ) {

        gsap.registerPlugin(
          ScrollTrigger
        );

      }


      const heroTimeline =
        gsap.timeline();


      heroTimeline

        .from(
          '.landing-nav',
          {

            y:
              -50,

            opacity:
              0,

            duration:
              0.7,

            ease:
              'power3.out'

          }
        )

        .from(
          '.gsap-hero-title',
          {

            y:
              30,

            opacity:
              0,

            duration:
              0.7

          },
          '-=0.3'
        )

        .from(
          '.gsap-hero-p',
          {

            y:
              20,

            opacity:
              0,

            duration:
              0.6

          },
          '-=0.4'
        )

        .from(
          '.gsap-hero-btns',
          {

            y:
              20,

            opacity:
              0,

            duration:
              0.5

          },
          '-=0.3'
        )

        .from(
          '.gsap-hero-board',
          {

            scale:
              0.94,

            opacity:
              0,

            duration:
              0.7,

            onComplete:
              updateGraphLines

          },
          '-=0.4'
        );


      /* Scroll animations */

      if (
        typeof ScrollTrigger !==
        'undefined'
      ) {

        gsap.utils
          .toArray(
            '.gsap-fade-up'
          )
          .forEach(
            (element) => {

              gsap.from(
                element,
                {

                  scrollTrigger: {

                    trigger:
                      element,

                    start:
                      'top 85%'

                  },

                  y:
                    35,

                  opacity:
                    0,

                  duration:
                    0.7

                }
              );

            }
          );


        gsap.from(
          '.gsap-feature',
          {

            scrollTrigger: {

              trigger:
                '.features-grid',

              start:
                'top 80%'

            },

            y:
              35,

            opacity:
              0,

            stagger:
              0.1,

            duration:
              0.6

          }
        );


        gsap.from(
          '.gsap-step',
          {

            scrollTrigger: {

              trigger:
                '.timeline-grid',

              start:
                'top 80%'

            },

            y:
              30,

            opacity:
              0,

            stagger:
              0.12,

            duration:
              0.6

          }
        );


        /* Counters */

        const metricsBoard =
          document.querySelector(
            '.metrics-ring-board'
          );


        if (metricsBoard) {

          ScrollTrigger.create({

            trigger:
              metricsBoard,

            start:
              'top 85%',

            once:
              true,

            onEnter: () => {

              document
                .querySelectorAll(
                  '.gsap-counter'
                )
                .forEach(
                  (counter) => {

                    const target =
                      Number(
                        counter.dataset.target
                      );


                    gsap.to(
                      counter,
                      {

                        innerText:
                          target,

                        duration:
                          1.3,

                        snap: {

                          innerText:
                            1

                        }

                      }
                    );

                  }
                );

            }

          });

        }

      }

    }

  }
);