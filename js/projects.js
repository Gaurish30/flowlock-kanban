document.addEventListener('DOMContentLoaded', () => {
  const isAuthenticated = localStorage.getItem('flowlock_authenticated') === 'true';
  const currentUser = JSON.parse(localStorage.getItem('flowlock_current_user') || 'null');

  if (!isAuthenticated || !currentUser) {
    window.location.href = 'auth.html';
    return;
  }

  // Handle Legacy User Session without ID
  if (!currentUser.id) {
    currentUser.id = `usr_${Date.now()}`;
    localStorage.setItem('flowlock_current_user', JSON.stringify(currentUser));
  }

  document.getElementById('user-name-display').textContent = currentUser.name;
  document.getElementById('user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();

  const GLOBAL_PROJECTS_KEY = 'flowlock_global_projects';
  const USERS_KEY = 'flowlock_users';

  // Seed default data if database is empty
  const defaultProjects = [
    {
      id: 'board-1',
      title: 'Payment Gateway Integration',
      desc: 'Track tasks and lock downstream dependencies automatically.',
      ownerId: currentUser.id,
      members: [currentUser.id],
      tasks: [
        { id: 'FL-101', title: 'Define API Specs', status: 'done', dependencies: [] },
        { id: 'FL-102', title: 'Setup Stripe Webhooks', status: 'in-progress', dependencies: ['FL-101'] },
        { id: 'FL-103', title: 'Frontend Checkout UI', status: 'todo', dependencies: ['FL-102'] }
      ]
    }
  ];

  let globalProjects = JSON.parse(localStorage.getItem(GLOBAL_PROJECTS_KEY) || 'null');
  if (!globalProjects) {
    globalProjects = defaultProjects;
    localStorage.setItem(GLOBAL_PROJECTS_KEY, JSON.stringify(globalProjects));
  }

  let currentFilter = 'all';
  let searchQuery = '';
  let activeInviteBoardId = null;

  function saveGlobalProjects() {
    localStorage.setItem(GLOBAL_PROJECTS_KEY, JSON.stringify(globalProjects));
  }

  function getAllUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }

  // Get Projects Accessible By Current User (Owner OR Member)
  function getUserAccessibleProjects() {
    return globalProjects.filter(p => 
      p.ownerId === currentUser.id || (p.members && p.members.includes(currentUser.id))
    );
  }

  function getProjectMetrics(proj) {
    const total = proj.tasks.length;
    if (total === 0) return { total: 0, done: 0, blocked: 0, percent: 0, health: 'ON TRACK' };

    const done = proj.tasks.filter(t => t.status === 'done').length;
    const blocked = proj.tasks.filter(t => {
      if (!t.dependencies || t.dependencies.length === 0) return false;
      return t.dependencies.some(depId => {
        const depTask = proj.tasks.find(x => x.id === depId);
        return !depTask || depTask.status !== 'done';
      });
    }).length;

    const percent = Math.round((done / total) * 100);
    let health = 'ON TRACK';
    if (percent === 100) health = 'COMPLETED';
    else if (blocked > 0) health = 'BLOCKED';

    return { total, done, blocked, percent, health };
  }

  function updateSummaryStats() {
    const userProjects = getUserAccessibleProjects();
    let totalTasksAll = 0;
    let doneTasksAll = 0;
    let totalBlockersAll = 0;

    userProjects.forEach(p => {
      const m = getProjectMetrics(p);
      totalTasksAll += m.total;
      doneTasksAll += m.done;
      totalBlockersAll += m.blocked;
    });

    document.getElementById('stat-total-projects').textContent = userProjects.length;
    document.getElementById('stat-active-blockers').textContent = totalBlockersAll;

    const rate = totalTasksAll > 0 ? Math.round((doneTasksAll / totalTasksAll) * 100) : 0;
    document.getElementById('stat-completion-rate').textContent = `${rate}%`;
  }

  function renderProjects() {
    updateSummaryStats();
    const container = document.getElementById('projects-container');
    container.innerHTML = '';

    const accessibleProjects = getUserAccessibleProjects();

    const filtered = accessibleProjects.filter(p => {
      const metrics = getProjectMetrics(p);
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.desc.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (currentFilter === 'active') return metrics.percent < 100;
      if (currentFilter === 'blocked') return metrics.health === 'BLOCKED';
      if (currentFilter === 'completed') return metrics.percent === 100;

      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-secondary);">
          <h3>No projects found</h3>
          <p style="margin-top: 8px;">Create a new project or ask a team member to invite you using your ID/Email.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(p => {
      const m = getProjectMetrics(p);
      const isOwner = p.ownerId === currentUser.id;
      const card = document.createElement('div');
      card.className = 'project-card';

      let badgeClass = 'health-on-track';
      if (m.health === 'BLOCKED') badgeClass = 'health-blocked';
      if (m.health === 'COMPLETED') badgeClass = 'health-completed';

      card.innerHTML = `
        <div>
          <div class="project-card-header">
            <div>
              <div class="project-title">${p.title}</div>
              <span style="font-size:0.75rem; color:var(--text-tertiary);">
                Role: ${isOwner ? '👑 Owner' : '👥 Member'} (${p.members ? p.members.length : 1} Members)
              </span>
            </div>
            <span class="health-badge ${badgeClass}">${m.health}</span>
          </div>

          <p class="project-desc">${p.desc || 'No description provided.'}</p>

          <div class="project-progress-wrapper">
            <div class="progress-header">
              <span>Progress</span>
              <span>${m.percent}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${m.percent}%"></div>
            </div>
          </div>

          <div class="project-meta-pills">
            <span>📋 ${m.total} Tasks</span>
            <span>🔒 ${m.blocked} Blocked</span>
            <span>✅ ${m.done} Done</span>
          </div>
        </div>

        <div class="project-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
          <a href="app.html?board=${p.id}" class="btn btn-primary btn-pill btn-sm" style="flex:1; text-align:center;">Launch 🚀</a>
          <button class="btn btn-secondary btn-pill btn-sm btn-invite-member" data-invite-id="${p.id}">+ Invite</button>
          ${isOwner ? `<button class="btn-delete-project" data-delete-id="${p.id}">Delete</button>` : ''}
        </div>
      `;

      container.appendChild(card);
    });

    // Delete Button Listeners
    document.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idToDelete = e.target.dataset.deleteId;
        if (confirm('Are you sure you want to delete this project board?')) {
          globalProjects = globalProjects.filter(p => p.id !== idToDelete);
          saveGlobalProjects();
          renderProjects();
        }
      });
    });

    // Invite Button Listeners
    document.querySelectorAll('[data-invite-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        activeInviteBoardId = e.target.dataset.inviteId;
        openInviteModal();
      });
    });
  }

  // --- Invite Member Logic ---
  function openInviteModal() {
    const emailInput = prompt("Enter the registered email address of the user you want to invite:");
    if (!emailInput) return;

    const allUsers = getAllUsers();
    const targetUser = allUsers.find(u => u.email.toLowerCase() === emailInput.trim().toLowerCase());

    if (!targetUser) {
      alert("❌ User not found! Make sure they have registered an account first.");
      return;
    }

    const project = globalProjects.find(p => p.id === activeInviteBoardId);
    if (!project) return;

    if (!project.members) project.members = [project.ownerId];

    if (project.members.includes(targetUser.id)) {
      alert("⚠️ This user is already a member of this project.");
      return;
    }

    project.members.push(targetUser.id);
    saveGlobalProjects();
    alert(`✅ Success! Added ${targetUser.name} (${targetUser.email}) to "${project.title}". It will now appear on their dashboard.`);
    renderProjects();
  }

  // Filters & Search
  document.getElementById('project-search')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderProjects();
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderProjects();
    });
  });

  // Create New Project Modal
  const newModal = document.getElementById('modal-new-project');
  document.getElementById('btn-new-project-hub')?.addEventListener('click', () => newModal?.classList.remove('hidden'));
  document.getElementById('close-project-modal')?.addEventListener('click', () => newModal?.classList.add('hidden'));
  document.getElementById('btn-cancel-hub-project')?.addEventListener('click', () => newModal?.classList.add('hidden'));

  document.getElementById('form-hub-create-project')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('hub-project-title').value.trim();
    const desc = document.getElementById('hub-project-desc').value.trim();

    const newProj = {
      id: `board-${Date.now()}`,
      title,
      desc,
      ownerId: currentUser.id,
      members: [currentUser.id],
      tasks: []
    };

    globalProjects.push(newProj);
    saveGlobalProjects();
    newModal?.classList.add('hidden');
    document.getElementById('form-hub-create-project')?.reset();

    window.location.href = `app.html?board=${newProj.id}`;
  });

  // Logout
  document.getElementById('btn-projects-logout')?.addEventListener('click', () => {
    localStorage.removeItem('flowlock_authenticated');
    localStorage.removeItem('flowlock_current_user');
    window.location.href = 'index.html';
  });

  renderProjects();
});