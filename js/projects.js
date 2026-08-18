document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================
     FLOWLOCK PROJECT PORTFOLIO

     JavaScript concepts used:
     - Variables
     - Functions
     - Arrays
     - Objects
     - Array methods
     - DOM manipulation
     - Event handling
     - Form validation
     - Local Storage
     - JSON
     - Template literals
     ========================================================== */


  /* ==========================================================
     AUTHENTICATION CHECK
     ========================================================== */

  const isAuthenticated =
    localStorage.getItem('flowlock_authenticated') === 'true';


  const currentUser =
    JSON.parse(
      localStorage.getItem('flowlock_current_user') || 'null'
    );


  if (!isAuthenticated || !currentUser) {

    window.location.href = 'auth.html';

    return;
  }


  /* ==========================================================
     LEGACY USER SUPPORT
     ========================================================== */

  if (!currentUser.id) {

    currentUser.id =
      `usr_${Date.now()}`;


    localStorage.setItem(
      'flowlock_current_user',
      JSON.stringify(currentUser)
    );

  }


  /* ==========================================================
     USER DETAILS
     ========================================================== */

  const userNameDisplay =
    document.getElementById('user-name-display');


  const userAvatar =
    document.getElementById('user-avatar');


  if (userNameDisplay) {

    userNameDisplay.textContent =
      currentUser.name || 'User';

  }


  if (userAvatar) {

    const firstLetter =
      (currentUser.name || 'U')
        .charAt(0)
        .toUpperCase();


    userAvatar.textContent =
      firstLetter;

  }


  /* ==========================================================
     STORAGE KEYS
     ========================================================== */

  const GLOBAL_PROJECTS_KEY =
    'flowlock_global_projects';


  const USERS_KEY =
    'flowlock_users';


  const DEMO_CLEANUP_KEY =
    'flowlock_demo_project_removed_v1';


  /* ==========================================================
     GET PROJECT DATA

     IMPORTANT:
     We DO NOT create any default project.

     New users start with:
     []
     ========================================================== */

  function loadProjects() {

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            GLOBAL_PROJECTS_KEY
          ) || '[]'
        );


      return Array.isArray(saved)
        ? saved
        : [];

    } catch (error) {

      console.error(
        'Unable to read FlowLock projects:',
        error
      );


      return [];
    }

  }


  let globalProjects =
    loadProjects();


  /* ==========================================================
     REMOVE OLD TEST PROJECT

     This cleans the demo project that your previous JS stored:

     board-1
     Payment Gateway Integration

     This runs only once.
     ========================================================== */

  function removeOldDemoProject() {

    const cleanupAlreadyDone =
      localStorage.getItem(
        DEMO_CLEANUP_KEY
      ) === 'true';


    if (cleanupAlreadyDone) {

      return;
    }


    const oldLength =
      globalProjects.length;


    globalProjects =
      globalProjects.filter((project) => {

        const isOldDemo =
          project.id === 'board-1' &&
          project.title ===
            'Payment Gateway Integration';


        return !isOldDemo;

      });


    if (
      globalProjects.length !== oldLength
    ) {

      saveGlobalProjects();

    }


    localStorage.setItem(
      DEMO_CLEANUP_KEY,
      'true'
    );

  }


  /* ==========================================================
     SAVE PROJECTS
     ========================================================== */

  function saveGlobalProjects() {

    localStorage.setItem(
      GLOBAL_PROJECTS_KEY,
      JSON.stringify(globalProjects)
    );

  }


  removeOldDemoProject();


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


      return Array.isArray(users)
        ? users
        : [];

    } catch (error) {

      return [];
    }

  }


  /* ==========================================================
     ESCAPE USER TEXT BEFORE HTML OUTPUT
     ========================================================== */

  function escapeHTML(value = '') {

    const div =
      document.createElement('div');


    div.textContent =
      String(value);


    return div.innerHTML;

  }


  /* ==========================================================
     GET PROJECTS ACCESSIBLE TO THIS USER

     User can see project when:
     1. User owns it
     OR
     2. User was invited
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
          ) &&
          project.members.includes(
            currentUser.id
          );


        return isOwner || isMember;

      }
    );

  }


  /* ==========================================================
     PROJECT METRICS
     ========================================================== */

  function getProjectMetrics(project) {

    const tasks =
      Array.isArray(project.tasks)
        ? project.tasks
        : [];


    const total =
      tasks.length;


    if (total === 0) {

      return {

        total: 0,

        done: 0,

        blocked: 0,

        percent: 0,

        health: 'ON TRACK'

      };
    }


    /* completed tasks */

    const done =
      tasks.filter(
        (task) =>
          task.status === 'done'
      ).length;


    /* blocked tasks */

    const blocked =
      tasks.filter((task) => {

        if (
          !Array.isArray(task.dependencies) ||
          task.dependencies.length === 0
        ) {

          return false;
        }


        return task.dependencies.some(
          (dependencyId) => {

            const dependencyTask =
              tasks.find(
                (taskItem) =>
                  taskItem.id ===
                  dependencyId
              );


            return (
              !dependencyTask ||
              dependencyTask.status !== 'done'
            );

          }
        );

      }).length;


    const percent =
      Math.round(
        (done / total) * 100
      );


    let health =
      'ON TRACK';


    if (percent === 100) {

      health =
        'COMPLETED';

    } else if (blocked > 0) {

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


    if (totalProjectsElement) {

      totalProjectsElement.textContent =
        projects.length;

    }


    if (blockedElement) {

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


    if (completionElement) {

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
     OPEN CREATE PROJECT MODAL
     ========================================================== */

  const newProjectModal =
    document.getElementById(
      'modal-new-project'
    );


  function openCreateModal() {

    if (!newProjectModal) {

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
      () => titleInput?.focus(),
      50
    );

  }


  /* ==========================================================
     CLOSE CREATE PROJECT MODAL
     ========================================================== */

  function closeCreateModal() {

    newProjectModal?.classList.add(
      'hidden'
    );

  }


  /* ==========================================================
     EMPTY STATE
     ========================================================== */

  function renderEmptyState(
    container,
    type = 'empty'
  ) {

    if (type === 'search') {

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


    document
      .getElementById(
        'empty-create-project'
      )
      ?.addEventListener(
        'click',
        openCreateModal
      );

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


    if (!container) {

      return;
    }


    container.innerHTML =
      '';


    const accessibleProjects =
      getUserAccessibleProjects();


    /* ========================================
       USER HAS ZERO PROJECTS
       ======================================== */

    if (
      accessibleProjects.length === 0
    ) {

      renderEmptyState(
        container,
        'empty'
      );


      return;
    }


    /* ========================================
       SEARCH + FILTER
       ======================================== */

    const filteredProjects =
      accessibleProjects.filter(
        (project) => {

          const metrics =
            getProjectMetrics(
              project
            );


          const title =
            project.title || '';


          const description =
            project.desc || '';


          const query =
            searchQuery.toLowerCase();


          const matchesSearch =

            title
              .toLowerCase()
              .includes(query)

            ||

            description
              .toLowerCase()
              .includes(query);


          if (!matchesSearch) {

            return false;
          }


          if (
            currentFilter ===
            'active'
          ) {

            return (
              metrics.percent < 100
            );
          }


          if (
            currentFilter ===
            'blocked'
          ) {

            return (
              metrics.health ===
              'BLOCKED'
            );
          }


          if (
            currentFilter ===
            'completed'
          ) {

            return (
              metrics.percent === 100
            );
          }


          return true;

        }
      );


    /* ========================================
       FILTER FOUND NOTHING
       ======================================== */

    if (
      filteredProjects.length === 0
    ) {

      renderEmptyState(
        container,
        'search'
      );


      return;
    }


    /* ========================================
       CREATE PROJECT CARDS
       ======================================== */

    filteredProjects.forEach(
      (project) => {

        const metrics =
          getProjectMetrics(
            project
          );


        const isOwner =
          project.ownerId ===
          currentUser.id;


        const card =
          document.createElement(
            'article'
          );


        card.className =
          'project-card';


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
          Array.isArray(project.members)

            ? project.members.length

            : 1;


card.innerHTML = `
  <div>

    <div class="project-card-header">

      <div>
        <div class="project-title">
          ${title}
        </div>

        <div class="project-role">
          ${isOwner ? '👑 Owner' : '👥 Member'}
          •
          ${memberCount}
          ${memberCount === 1 ? 'member' : 'members'}
        </div>
      </div>

      <span class="health-badge ${badgeClass}">
        ${metrics.health}
      </span>

    </div>


    <p class="project-desc">
      ${description}
    </p>


    <div class="project-progress-wrapper">

      <div class="progress-header">
        <span>Progress</span>
        <span>${metrics.percent}%</span>
      </div>

      <div class="progress-track">
        <div
          class="progress-fill"
          style="width: ${metrics.percent}%"
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
      href="app.html?board=${encodeURIComponent(project.id)}"
      class="launch-project"
    >
      Launch →
    </a>


    <button
      type="button"
      class="invite-project btn-invite-member"
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


    addProjectCardListeners();

  }


  /* ==========================================================
     PROJECT CARD EVENT LISTENERS
     ========================================================== */

  function addProjectCardListeners() {

  // ================= DELETE PROJECT =================

  document
    .querySelectorAll('.btn-delete-project')
    .forEach((button) => {

      button.addEventListener('click', (event) => {

        const idToDelete =
          event.currentTarget.dataset.deleteId.trim();


        const project =
          globalProjects.find(
            (item) => item.id === idToDelete
          );


        if (!project) {

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


        if (!confirmDelete) {
          return;
        }


        globalProjects =
          globalProjects.filter(
            (item) => item.id !== idToDelete
          );


        saveGlobalProjects();


        renderProjects();

      });

    });


  // ================= INVITE MEMBER =================

  document
    .querySelectorAll('.btn-invite-member')
    .forEach((button) => {

      button.addEventListener('click', (event) => {

        activeInviteBoardId =
          event.currentTarget.dataset.inviteId.trim();


        openInvitePrompt();

      });

    });



  }


  /* ==========================================================
     INVITE MEMBER
     ========================================================== */

  function openInvitePrompt() {

    const emailInput =
      prompt(
        'Enter the registered email address of the user you want to invite:'
      );


    if (!emailInput) {

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
        (user) =>
          (
            user.email || ''
          )
            .toLowerCase() ===
          email
      );


    if (!targetUser) {

      alert(
        '❌ User not found. They must create a FlowLock account first.'
      );


      return;
    }


    const project =
      globalProjects.find(
        (item) =>
          item.id ===
          activeInviteBoardId
      );


    if (!project) {

      return;
    }


    if (
      !Array.isArray(
        project.members
      )
    ) {

      project.members =
        [project.ownerId];

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
      `✅ ${targetUser.name} has been added to "${project.title}".`
    );


    renderProjects();

  }


  /* ==========================================================
     SEARCH
     ========================================================== */

  document
    .getElementById(
      'project-search'
    )
    ?.addEventListener(
      'input',
      (event) => {

        searchQuery =
          event.target.value.trim();


        renderProjects();

      }
    );


  /* ==========================================================
     FILTER BUTTONS
     ========================================================== */

  document
    .querySelectorAll(
      '.filter-btn'
    )
    .forEach((button) => {

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


          event.currentTarget
            .classList
            .add(
              'active'
            );


          currentFilter =
            event.currentTarget
              .dataset
              .filter;


          renderProjects();

        }
      );

    });


  /* ==========================================================
     OPEN MODAL BUTTONS
     ========================================================== */

  document
    .getElementById(
      'btn-new-project-hub'
    )
    ?.addEventListener(
      'click',
      openCreateModal
    );


  document
    .getElementById(
      'close-project-modal'
    )
    ?.addEventListener(
      'click',
      closeCreateModal
    );


  document
    .getElementById(
      'btn-cancel-hub-project'
    )
    ?.addEventListener(
      'click',
      closeCreateModal
    );


  /* ==========================================================
     CLOSE MODAL WHEN CLICKING BACKDROP
     ========================================================== */

  newProjectModal
    ?.addEventListener(
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


  /* ==========================================================
     ESC KEY
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
     CREATE PROJECT FORM
     ========================================================== */

  document
    .getElementById(
      'form-hub-create-project'
    )
    ?.addEventListener(
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
          titleInput.value.trim();


        const description =
          descriptionInput.value.trim();


        /* simple form validation */

        if (!title) {

          alert(
            'Please enter a project name.'
          );


          titleInput.focus();


          return;
        }


        /* Create plain JS object */

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
            new Date().toISOString()

        };


        /* Array method */

        globalProjects.push(
          newProject
        );


        /* Local Storage + JSON */

        saveGlobalProjects();


        event.currentTarget.reset();


        closeCreateModal();


        /*
         * Open the new EMPTY project.
         */

        window.location.href =
          `app.html?board=${newProject.id}`;

      }
    );


  /* ==========================================================
     LOGOUT
     ========================================================== */

  document
    .getElementById(
      'btn-projects-logout'
    )
    ?.addEventListener(
      'click',
      () => {

        localStorage.removeItem(
          'flowlock_authenticated'
        );


        localStorage.removeItem(
          'flowlock_current_user'
        );


        window.location.href =
          'index.html';

      }
    );


  /* ==========================================================
     INITIAL RENDER
     ========================================================== */

  renderProjects();

});