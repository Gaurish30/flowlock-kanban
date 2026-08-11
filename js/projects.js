document.addEventListener('DOMContentLoaded', () => {
  // Verify User Session
  const isAuthenticated = localStorage.getItem('flowlock_authenticated') === 'true';
  const currentUser = JSON.parse(localStorage.getItem('flowlock_current_user') || 'null');

  if (!isAuthenticated || !currentUser) {
    window.location.href = 'auth.html';
    return;
  }

  document.getElementById('user-name-display').textContent = currentUser.name;
  document.getElementById('user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();

  const USER_STORAGE_KEY = `flowlock_boards_${currentUser.email}`;

  const defaultProjects = [
    {
      id: 'board-1',
      title: 'Payment Gateway Integration',
      desc: 'Track tasks and lock downstream dependencies automatically.',
      tasks: [
        { id: 'FL-101', title: 'Define API Specs', status: 'done', dependencies: [] },
        { id: 'FL-102', title: 'Setup Stripe Webhooks', status: 'in-progress', dependencies: ['FL-101'] },
        { id: 'FL-103', title: 'Frontend Checkout UI', status: 'todo', dependencies: ['FL-102'] }
      ]
    },
    {
      id: 'board-2',
      title: 'OAuth2 Authentication Refactor',
      desc: 'Migrate legacy sessions to JWT with Refresh Tokens.',
      tasks: [
        { id: 'FL-201', title: 'Redis Cache Setup', status: 'done', dependencies: [] },
        { id: 'FL-202', title: 'Token Rotation Engine', status: 'in-progress', dependencies: ['FL-201'] }
      ]
    }
  ];

  let projects = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || JSON.stringify(defaultProjects));
  let currentFilter = 'all';
  let searchQuery = '';

  function saveProjects() {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(projects));
  }

  // Calculate Health Status
  function getProjectMetrics(proj) {
    const total = proj.tasks.length;
    if (total === 0) return { total: 0, done: 0, blocked: 0, percent: 0, health: 'ON TRACK' };

    const done = proj.tasks.filter(t => t.status === 'done').length;
    
    // Task is blocked if it depends on tasks that aren't done
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

  // Update Summary Header Cards
  function updateSummaryStats() {
    let totalTasksAll = 0;
    let doneTasksAll = 0;
    let totalBlockersAll = 0;

    projects.forEach(p => {
      const m = getProjectMetrics(p);
      totalTasksAll += m.total;
      doneTasksAll += m.done;
      totalBlockersAll += m.blocked;
    });

    document.getElementById('stat-total-projects').textContent = projects.length;
    document.getElementById('stat-active-blockers').textContent = totalBlockersAll;

    const rate = totalTasksAll > 0 ? Math.round((doneTasksAll / totalTasksAll) * 100) : 0;
    document.getElementById('stat-completion-rate').textContent = `${rate}%`;
  }

  // Render Projects Cards Grid
  function renderProjects() {
    updateSummaryStats();
    const container = document.getElementById('projects-container');
    container.innerHTML = '';

    const filtered = projects.filter(p => {
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
          <p style="margin-top: 8px;">Try adjusting your search query or create a new project.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(p => {
      const m = getProjectMetrics(p);
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

        <div class="project-actions">
          <a href="app.html?board=${p.id}" class="btn btn-primary btn-pill btn-sm" style="flex: 1; text-align: center;">Launch Workspace 🚀</a>
          <button class="btn-delete-project" data-delete-id="${p.id}">Delete</button>
        </div>
      `;

      container.appendChild(card);
    });

    // Attach Delete Event Listeners
    document.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idToDelete = e.target.dataset.deleteId;
        if (confirm('Are you sure you want to delete this project board?')) {
          projects = projects.filter(p => p.id !== idToDelete);
          saveProjects();
          renderProjects();
        }
      });
    });
  }

  // Filters & Search Event Listeners
  document.getElementById('project-search').addEventListener('input', (e) => {
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

  // Modal Control
  const newModal = document.getElementById('modal-new-project');
  document.getElementById('btn-new-project-hub').addEventListener('click', () => newModal.classList.remove('hidden'));
  document.getElementById('close-project-modal').addEventListener('click', () => newModal.classList.add('hidden'));
  document.getElementById('btn-cancel-hub-project').addEventListener('click', () => newModal.classList.add('hidden'));

  document.getElementById('form-hub-create-project').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('hub-project-title').value.trim();
    const desc = document.getElementById('hub-project-desc').value.trim();

    const newProj = {
      id: `board-${Date.now()}`,
      title,
      desc,
      tasks: []
    };

    projects.push(newProj);
    saveProjects();
    newModal.classList.add('hidden');
    document.getElementById('form-hub-create-project').reset();

    // Redirect straight to workspace for new board
    window.location.href = `app.html?board=${newProj.id}`;
  });

  // Sign Out
  document.getElementById('btn-projects-logout').addEventListener('click', () => {
    localStorage.removeItem('flowlock_authenticated');
    localStorage.removeItem('flowlock_current_user');
    window.location.href = 'index.html';
  });

  renderProjects();
});