document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================
     FLOWLOCK PROJECT PORTFOLIO

     Component 1 concepts:
     - const / let
     - functions
     - arrays
     - objects
     - find()
     - filter()
     - forEach()
     - DOM manipulation
     - event handling
     - form validation
     - localStorage
     - JSON
     - template literals
     ========================================================== */


  /* ==========================================================
     AUTHENTICATION
     ========================================================== */

  const isAuthenticated =
    localStorage.getItem(
      'flowlock_authenticated'
    ) === 'true';


  const currentUser =
    JSON.parse(
      localStorage.getItem(
        'flowlock_current_user'
      ) || 'null'
    );


  if (
    !isAuthenticated ||
    !currentUser
  ) {

    window.location.href =
      'auth.html?mode=login';

    return;

  }


  /*
   * Legacy support for old users
   * created before IDs existed.
   */

  if (!currentUser.id) {

    currentUser.id =
      `usr_${Date.now()}`;


    localStorage.setItem(
      'flowlock_current_user',
      JSON.stringify(
        currentUser
      )
    );

  }



  /* ==========================================================
     STORAGE KEYS
     ========================================================== */

  const GLOBAL_PROJECTS_KEY =
    'flowlock_global_projects';


  const USERS_KEY =
    'flowlock_users';


  /*
   * Every user gets their own
   * remembered workspace.
   *
   * Example:
   *
   * flowlock_last_project_usr_123
   */

  const LAST_PROJECT_KEY =
    `flowlock_last_project_${currentUser.id}`;



  /* ==========================================================
     USER DETAILS
     ========================================================== */

  const userNameDisplay =
    document.getElementById(
      'user-name-display'
    );


  const userAvatar =
    document.getElementById(
      'user-avatar'
    );


  if (userNameDisplay) {

    userNameDisplay.textContent =
      currentUser.name ||
      'User';

  }


  if (userAvatar) {

    userAvatar.textContent =

      (
        currentUser.name ||
        'U'
      )

        .charAt(0)

        .toUpperCase();

  }



  /* ==========================================================
     LOAD PROJECTS
     ========================================================== */

  function loadProjects() {

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            GLOBAL_PROJECTS_KEY
          ) || '[]'
        );


      return Array.isArray(
        saved
      )
        ? saved
        : [];

    }

    catch (error) {

      console.error(
        'Unable to read projects:',
        error
      );


      return [];

    }

  }



  /* ==========================================================
     SAVE PROJECTS
     ========================================================== */

  function saveGlobalProjects() {

    localStorage.setItem(

      GLOBAL_PROJECTS_KEY,

      JSON.stringify(
        globalProjects
      )

    );

  }



  /* ==========================================================
     GET REGISTERED USERS
     ========================================================== */

  function getAllUsers() {

    try {

      const users =
        JSON.parse(
          localStorage.getItem(
            USERS_KEY
          ) || '[]'
        );


      return Array.isArray(
        users
      )
        ? users
        : [];

    }

    catch (error) {

      console.error(
        'Unable to read users:',
        error
      );


      return [];

    }

  }



  /* ==========================================================
     GLOBAL PROJECT ARRAY
     ========================================================== */

  let globalProjects =
    loadProjects();



  /* ==========================================================
     REMOVE OLD TEST PROJECT

     Older version automatically created:

     board-1
     Payment Gateway Integration

     This version checks every time.
     ========================================================== */

  function removeOldDemoProject() {

    const oldLength =
      globalProjects.length;


    globalProjects =
      globalProjects.filter(
        (project) => {

          return !(

            project.id ===
              'board-1'

            &&

            project.title ===
              'Payment Gateway Integration'

          );

        }
      );


    /*
     * Save only if something
     * was removed.
     */

    if (
      globalProjects.length !==
      oldLength
    ) {

      saveGlobalProjects();

    }


    /*
     * Also remove it from
     * remembered workspace.
     */

    if (

      localStorage.getItem(
        LAST_PROJECT_KEY
      ) === 'board-1'

    ) {

      localStorage.removeItem(
        LAST_PROJECT_KEY
      );

    }

  }


  removeOldDemoProject();



  /* ==========================================================
     SAFE HTML OUTPUT
     ========================================================== */

  function escapeHTML(
    value = ''
  ) {

    const helper =
      document.createElement(
        'div'
      );


    helper.textContent =
      String(value);


    return helper.innerHTML;

  }



  /* ==========================================================
     PROJECTS ACCESSIBLE TO CURRENT USER

     Project visible when:

     1. user owns it
     OR
     2. user was invited
     ========================================================== */

  function getUserAccessibleProjects() {

    return globalProjects.filter(
      (project) => {


        const isOwner =

          project.ownerId ===
          currentUser.id;


        const isMember =

          Array.isArray(
            project.members
          )

          &&

          project.members.includes(
            currentUser.id
          );


        return (
          isOwner ||
          isMember
        );

      }
    );

  }



  /* ==========================================================
     PROJECT METRICS
     ========================================================== */

  function getProjectMetrics(
    project
  ) {

    const tasks =

      Array.isArray(
        project.tasks
      )

        ? project.tasks
        : [];


    const total =
      tasks.length;



    /* -------------------------
       Empty project
       ------------------------- */

    if (total === 0) {

      return {

        total: 0,

        done: 0,

        blocked: 0,

        percent: 0,

        health:
          'ON TRACK'

      };

    }



    /* -------------------------
       Completed tasks
       ------------------------- */

    const done =

      tasks.filter(
        (task) => {

          return (
            task.status ===
            'done'
          );

        }
      ).length;



    /* -------------------------
       Blocked tasks
       ------------------------- */

    const blocked =

      tasks.filter(
        (task) => {


          if (

            !Array.isArray(
              task.dependencies
            )

            ||

            task.dependencies.length ===
              0

          ) {

            return false;

          }



          return task.dependencies.some(
            (dependencyId) => {


              const dependencyTask =

                tasks.find(
                  (taskItem) => {

                    return (
                      taskItem.id ===
                      dependencyId
                    );

                  }
                );


              return (

                !dependencyTask

                ||

                dependencyTask.status !==
                  'done'

              );

            }
          );

        }
      ).length;



    /* -------------------------
       Progress %
       ------------------------- */

    const percent =
      Math.round(
        (
          done /
          total
        ) * 100
      );



    /* -------------------------
       Health status
       ------------------------- */

    let health =
      'ON TRACK';


    if (
      percent === 100
    ) {

      health =
        'COMPLETED';

    }

    else if (
      blocked > 0
    ) {

      health =
        'BLOCKED';

    }



    return {

      total,

      done,

      blocked,

      percent,

      health

    };

  }



  /* ==========================================================
     SUMMARY STATS
     ========================================================== */

  function updateSummaryStats() {

    const projects =
      getUserAccessibleProjects();


    let totalTasks =
      0;


    let completedTasks =
      0;


    let blockedTasks =
      0;



    projects.forEach(
      (project) => {


        const metrics =
          getProjectMetrics(
            project
          );


        totalTasks +=
          metrics.total;


        completedTasks +=
          metrics.done;


        blockedTasks +=
          metrics.blocked;

      }
    );



    const totalProjectsElement =
      document.getElementById(
        'stat-total-projects'
      );


    const blockedElement =
      document.getElementById(
        'stat-active-blockers'
      );


    const completionElement =
      document.getElementById(
        'stat-completion-rate'
      );



    if (
      totalProjectsElement
    ) {

      totalProjectsElement.textContent =
        projects.length;

    }



    if (
      blockedElement
    ) {

      blockedElement.textContent =
        blockedTasks;

    }



    const completionRate =

      totalTasks > 0

        ? Math.round(
            (
              completedTasks /
              totalTasks
            ) * 100
          )

        : 0;



    if (
      completionElement
    ) {

      completionElement.textContent =
        `${completionRate}%`;

    }

  }



  /* ==========================================================
     FILTER STATE
     ========================================================== */

  let currentFilter =
    'all';


  let searchQuery =
    '';


  let activeInviteBoardId =
    null;



  /* ==========================================================
     CREATE PROJECT MODAL
     ========================================================== */

  const newProjectModal =
    document.getElementById(
      'modal-new-project'
    );



  function openCreateModal() {

    if (
      !newProjectModal
    ) {

      return;

    }


    newProjectModal.classList.remove(
      'hidden'
    );


    const titleInput =
      document.getElementById(
        'hub-project-title'
      );


    setTimeout(
      () => {

        if (
          titleInput
        ) {

          titleInput.focus();

        }

      },

      50
    );

  }



  function closeCreateModal() {

    if (
      newProjectModal
    ) {

      newProjectModal.classList.add(
        'hidden'
      );

    }

  }



  /* ==========================================================
     LANDING PAGE CREATE WORKSPACE

     Landing page sends:

     projects.html?create=1

     This automatically opens the modal.
     ========================================================== */

  if (

    window.location.search.includes(
      'create=1'
    )

  ) {

    openCreateModal();

  }



  /* ==========================================================
     EMPTY STATE
     ========================================================== */

  function renderEmptyState(
    container,
    type = 'empty'
  ) {


    /* -------------------------
       Search empty state
       ------------------------- */

    if (
      type === 'search'
    ) {

      container.innerHTML = `

        <div class="empty-projects-state">

          <span class="empty-icon">
            🔍
          </span>


          <h2>
            No Matching Projects
          </h2>


          <p>

            We couldn't find a project matching
            your search or current filter.

          </p>


          <span class="empty-scribble">

            try another filter ↗

          </span>

        </div>

      `;


      return;

    }



    /* -------------------------
       No projects
       ------------------------- */

    container.innerHTML = `

      <div class="empty-projects-state">

        <span class="empty-icon">
          📌
        </span>


        <h2>
          Your Board is Empty
        </h2>


        <p>

          You haven't created a FlowLock project yet.

          Create your first project and start building
          your dependency graph from scratch.

        </p>


        <button

          type="button"

          id="empty-create-project"

          class="empty-create-btn"

        >

          + Create First Project

        </button>


        <span class="empty-scribble">

          no demo tasks • this space is yours ✓

        </span>

      </div>

    `;

  }



  /* ==========================================================
     RENDER PROJECTS
     ========================================================== */

  function renderProjects() {


    updateSummaryStats();



    const container =
      document.getElementById(
        'projects-container'
      );


    if (
      !container
    ) {

      return;

    }


    container.innerHTML =
      '';



    const accessibleProjects =
      getUserAccessibleProjects();



    /* ========================================================
       NO PROJECTS
       ======================================================== */

    if (

      accessibleProjects.length ===
      0

    ) {

      renderEmptyState(
        container,
        'empty'
      );


      return;

    }



    /* ========================================================
       SEARCH + FILTER
       ======================================================== */

    const filteredProjects =

      accessibleProjects.filter(
        (project) => {


          const metrics =
            getProjectMetrics(
              project
            );


          const title =
            project.title ||
            '';


          const description =
            project.desc ||
            '';


          const query =
            searchQuery.toLowerCase();



          const matchesSearch =

            title
              .toLowerCase()
              .includes(
                query
              )

            ||

            description
              .toLowerCase()
              .includes(
                query
              );



          if (
            !matchesSearch
          ) {

            return false;

          }



          /* Active */

          if (
            currentFilter ===
            'active'
          ) {

            return (
              metrics.percent <
              100
            );

          }



          /* Blocked */

          if (
            currentFilter ===
            'blocked'
          ) {

            return (
              metrics.health ===
              'BLOCKED'
            );

          }



          /* Completed */

          if (
            currentFilter ===
            'completed'
          ) {

            return (
              metrics.percent ===
              100
            );

          }



          return true;

        }
      );



    /* ========================================================
       FILTER FOUND NOTHING
       ======================================================== */

    if (

      filteredProjects.length ===
      0

    ) {

      renderEmptyState(
        container,
        'search'
      );


      return;

    }



    /* ========================================================
       CREATE PROJECT CARDS
       ======================================================== */

    filteredProjects.forEach(
      (project) => {


        const metrics =
          getProjectMetrics(
            project
          );


        const isOwner =

          project.ownerId ===
          currentUser.id;



        const title =
          escapeHTML(
            project.title ||
            'Untitled Project'
          );


        const description =
          escapeHTML(
            project.desc ||
            'No description provided.'
          );



        const memberCount =

          Array.isArray(
            project.members
          )

            ? project.members.length

            : 1;



        let badgeClass =
          'health-on-track';



        if (
          metrics.health ===
          'BLOCKED'
        ) {

          badgeClass =
            'health-blocked';

        }



        if (
          metrics.health ===
          'COMPLETED'
        ) {

          badgeClass =
            'health-completed';

        }



        const card =
          document.createElement(
            'article'
          );


        card.className =
          'project-card';



        card.innerHTML = `

          <div>


            <div class="project-card-header">


              <div>


                <div class="project-title">

                  ${title}

                </div>


                <div class="project-role">

                  ${
                    isOwner
                      ? '👑 Owner'
                      : '👥 Member'
                  }

                  •

                  ${memberCount}

                  ${
                    memberCount === 1
                      ? 'member'
                      : 'members'
                  }

                </div>


              </div>


              <span
                class="health-badge ${badgeClass}"
              >

                ${metrics.health}

              </span>


            </div>



            <p class="project-desc">

              ${description}

            </p>



            <div class="project-progress-wrapper">


              <div class="progress-header">

                <span>
                  Progress
                </span>

                <span>
                  ${metrics.percent}%
                </span>

              </div>



              <div class="progress-track">

                <div

                  class="progress-fill"

                  style="
                    width:
                    ${metrics.percent}%;
                  "

                ></div>

              </div>


            </div>



            <div class="project-meta-pills">

              <span>
                📋 ${metrics.total} Tasks
              </span>

              <span>
                🔒 ${metrics.blocked} Blocked
              </span>

              <span>
                ✓ ${metrics.done} Done
              </span>

            </div>


          </div>



          <div class="project-actions">


            <a

              href="app.html?board=${encodeURIComponent(
                project.id
              )}"

              class="launch-project"

              data-project-id="${project.id}"

            >

              Launch →

            </a>



            <button

              type="button"

              class="
                invite-project
                btn-invite-member
              "

              data-invite-id="${project.id}"

            >

              + Invite

            </button>



            ${
              isOwner

                ? `

                    <button

                      type="button"

                      class="btn-delete-project"

                      data-delete-id="${project.id}"

                    >

                      Delete

                    </button>

                  `

                : ''
            }


          </div>

        `;



        container.appendChild(
          card
        );

      }
    );

  }



  /* ==========================================================
     PROJECT CARD EVENTS

     Event delegation is used here.

     This fixes the previous problem where buttons
     sometimes stopped working after renderProjects()
     recreated the cards.
     ========================================================== */

  const projectsContainer =
    document.getElementById(
      'projects-container'
    );



  if (
    projectsContainer
  ) {

    projectsContainer.addEventListener(
      'click',
      (event) => {



        /* ======================================================
           CREATE FIRST PROJECT
           ====================================================== */

        const emptyCreateButton =

          event.target.closest(
            '#empty-create-project'
          );


        if (
          emptyCreateButton
        ) {

          openCreateModal();

          return;

        }



        /* ======================================================
           LAUNCH PROJECT

           Remember this workspace.
           ====================================================== */

        const launchLink =

          event.target.closest(
            '.launch-project'
          );


        if (
          launchLink
        ) {


          const projectId =
            launchLink.dataset.projectId;


          if (
            projectId
          ) {

            localStorage.setItem(

              LAST_PROJECT_KEY,

              projectId

            );

          }


          /*
           * Do NOT use preventDefault().
           *
           * The link should still open app.html.
           */

          return;

        }



        /* ======================================================
           DELETE PROJECT
           ====================================================== */

        const deleteButton =

          event.target.closest(
            '.btn-delete-project'
          );


        if (
          deleteButton
        ) {


          const idToDelete =
            deleteButton
              .dataset
              .deleteId;



          const project =

            globalProjects.find(
              (item) => {

                return (
                  item.id ===
                  idToDelete
                );

              }
            );



          if (
            !project
          ) {

            console.error(
              'Project not found:',
              idToDelete
            );


            return;

          }



          const confirmDelete =

            confirm(

              `Are you sure you want to delete "${project.title}"?`

            );



          if (
            !confirmDelete
          ) {

            return;

          }



          globalProjects =

            globalProjects.filter(
              (item) => {

                return (
                  item.id !==
                  idToDelete
                );

              }
            );



          /*
           * If this was the workspace shown as
           * Continue Workspace on index.html,
           * remove it.
           */

          if (

            localStorage.getItem(
              LAST_PROJECT_KEY
            ) ===
            idToDelete

          ) {

            localStorage.removeItem(
              LAST_PROJECT_KEY
            );

          }



          saveGlobalProjects();


          renderProjects();


          return;

        }



        /* ======================================================
           INVITE MEMBER
           ====================================================== */

        const inviteButton =

          event.target.closest(
            '.btn-invite-member'
          );


        if (
          inviteButton
        ) {


          activeInviteBoardId =

            inviteButton
              .dataset
              .inviteId;


          openInvitePrompt();

        }


      }
    );

  }



  /* ==========================================================
     INVITE MEMBER
     ========================================================== */

  function openInvitePrompt() {


    const emailInput =

      prompt(

        'Enter the registered email address of the user you want to invite:'

      );



    if (
      !emailInput
    ) {

      return;

    }



    const email =

      emailInput

        .trim()

        .toLowerCase();



    const users =
      getAllUsers();



    const targetUser =

      users.find(
        (user) => {

          return (

            (
              user.email ||
              ''
            )

              .toLowerCase() ===
            email

          );

        }
      );



    if (
      !targetUser
    ) {

      alert(

        '❌ User not found. They must create a FlowLock account first.'

      );


      return;

    }



    const project =

      globalProjects.find(
        (item) => {

          return (

            item.id ===
            activeInviteBoardId

          );

        }
      );



    if (
      !project
    ) {

      return;

    }



    if (

      !Array.isArray(
        project.members
      )

    ) {

      project.members =
        [
          project.ownerId
        ];

    }



    if (

      project.members.includes(
        targetUser.id
      )

    ) {

      alert(

        '⚠️ This user is already a member of this project.'

      );


      return;

    }



    project.members.push(
      targetUser.id
    );



    saveGlobalProjects();



    alert(

      `✅ ${
        targetUser.name ||
        targetUser.email
      } has been added to "${project.title}".`

    );



    renderProjects();

  }



  /* ==========================================================
     SEARCH
     ========================================================== */

  const projectSearch =
    document.getElementById(
      'project-search'
    );


  if (
    projectSearch
  ) {

    projectSearch.addEventListener(
      'input',
      (event) => {


        searchQuery =
          event.target
            .value
            .trim();


        renderProjects();

      }
    );

  }



  /* ==========================================================
     FILTERS
     ========================================================== */

  document

    .querySelectorAll(
      '.filter-btn'
    )

    .forEach(
      (button) => {


        button.addEventListener(
          'click',
          (event) => {


            document

              .querySelectorAll(
                '.filter-btn'
              )

              .forEach(
                (filterButton) => {


                  filterButton

                    .classList

                    .remove(
                      'active'
                    );


                }
              );



            event
              .currentTarget
              .classList
              .add(
                'active'
              );



            currentFilter =

              event
                .currentTarget
                .dataset
                .filter;



            renderProjects();

          }
        );

      }
    );



  /* ==========================================================
     MODAL BUTTONS
     ========================================================== */

  const newProjectButton =
    document.getElementById(
      'btn-new-project-hub'
    );


  const closeProjectButton =
    document.getElementById(
      'close-project-modal'
    );


  const cancelProjectButton =
    document.getElementById(
      'btn-cancel-hub-project'
    );



  if (
    newProjectButton
  ) {

    newProjectButton.addEventListener(
      'click',
      openCreateModal
    );

  }



  if (
    closeProjectButton
  ) {

    closeProjectButton.addEventListener(
      'click',
      closeCreateModal
    );

  }



  if (
    cancelProjectButton
  ) {

    cancelProjectButton.addEventListener(
      'click',
      closeCreateModal
    );

  }



  /* ==========================================================
     CLICK OUTSIDE MODAL
     ========================================================== */

  if (
    newProjectModal
  ) {

    newProjectModal.addEventListener(
      'click',
      (event) => {


        if (

          event.target ===
          newProjectModal

        ) {

          closeCreateModal();

        }


      }
    );

  }



  /* ==========================================================
     ESCAPE KEY
     ========================================================== */

  document.addEventListener(
    'keydown',
    (event) => {


      if (
        event.key ===
        'Escape'
      ) {

        closeCreateModal();

      }


    }
  );



  /* ==========================================================
     CREATE PROJECT
     ========================================================== */

  const createProjectForm =
    document.getElementById(
      'form-hub-create-project'
    );



  if (
    createProjectForm
  ) {

    createProjectForm.addEventListener(
      'submit',
      (event) => {


        event.preventDefault();



        const titleInput =
          document.getElementById(
            'hub-project-title'
          );


        const descriptionInput =
          document.getElementById(
            'hub-project-desc'
          );



        const title =
          titleInput
            .value
            .trim();



        const description =
          descriptionInput
            .value
            .trim();



        /* ======================================================
           VALIDATION
           ====================================================== */

        if (
          !title
        ) {

          alert(
            'Please enter a project name.'
          );


          titleInput.focus();


          return;

        }



        /* ======================================================
           CREATE PROJECT OBJECT
           ====================================================== */

        const newProject = {


          id:
            `board-${Date.now()}`,


          title:
            title,


          desc:
            description,


          ownerId:
            currentUser.id,


          members: [
            currentUser.id
          ],


          tasks: [],


          createdAt:
            new Date()
              .toISOString()


        };



        /* ======================================================
           ADD PROJECT
           ====================================================== */

        globalProjects.push(
          newProject
        );



        /* ======================================================
           SAVE PROJECT
           ====================================================== */

        saveGlobalProjects();



        /* ======================================================
           REMEMBER THIS WORKSPACE

           This is important for index.html.

           When the user comes back to landing page
           it will show:

           Continue Workspace →
           ====================================================== */

        localStorage.setItem(

          LAST_PROJECT_KEY,

          newProject.id

        );



        /* ======================================================
           RESET FORM
           ====================================================== */

        event
          .currentTarget
          .reset();



        closeCreateModal();



        /* ======================================================
           OPEN NEW EMPTY PROJECT
           ====================================================== */

        window.location.href =

          `app.html?board=${encodeURIComponent(
            newProject.id
          )}`;


      }
    );

  }



  /* ==========================================================
     LOGOUT
     ========================================================== */

  const logoutButton =
    document.getElementById(
      'btn-projects-logout'
    );



  if (
    logoutButton
  ) {

    logoutButton.addEventListener(
      'click',
      () => {


        localStorage.removeItem(
          'flowlock_authenticated'
        );


        localStorage.removeItem(
          'flowlock_current_user'
        );


        /*
         * IMPORTANT:
         *
         * Do NOT remove LAST_PROJECT_KEY.
         *
         * The user should be able to login later
         * and continue their previous workspace.
         */


        window.location.href =
          'index.html';


      }
    );

  }



  /* ==========================================================
     INITIAL RENDER
     ========================================================== */

  renderProjects();

});