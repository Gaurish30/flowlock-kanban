document.addEventListener('DOMContentLoaded', () => {
  // 1. Session Verification
  const isAuthenticated = localStorage.getItem('flowlock_authenticated') === 'true';
  const currentUser = JSON.parse(localStorage.getItem('flowlock_current_user') || 'null');

  if (!isAuthenticated || !currentUser) {
    window.location.href = 'auth.html';
    return;
  }

  // Header User Display
  const userAvatar = document.getElementById('user-avatar');
  const userNameDisplay = document.getElementById('user-name-display');
  if (userAvatar) userAvatar.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
  if (userNameDisplay) userNameDisplay.textContent = currentUser.name || 'User';

  // Storage Keys
  const GLOBAL_PROJECTS_KEY = 'flowlock_global_projects';
  const USERS_KEY = 'flowlock_users';

  // Default Seed Data if Storage is empty
  const defaultProjects = [
    {
      id: 'board-1',
      title: 'Payment Gateway Integration',
      desc: 'Track tasks and lock downstream dependencies automatically.',
      ownerId: currentUser.id,
      members: [currentUser.id],
      tasks: [
        { id: 'FL-101', title: 'Define API Contracts', desc: 'OAuth2 contract and payload definition', status: 'done', dependencies: [] },
        { id: 'FL-102', title: 'Setup Stripe Webhooks', desc: 'Listen to customer payment events', status: 'in-progress', dependencies: ['FL-101'] },
        { id: 'FL-103', title: 'Build Checkout Modal', desc: 'React component state and payment form', status: 'todo', dependencies: ['FL-102'] }
      ]
    }
  ];

  let globalProjects = JSON.parse(localStorage.getItem(GLOBAL_PROJECTS_KEY) || 'null');
  if (!globalProjects || !Array.isArray(globalProjects) || globalProjects.length === 0) {
    globalProjects = defaultProjects;
    localStorage.setItem(GLOBAL_PROJECTS_KEY, JSON.stringify(globalProjects));
  }

  // Get requested board ID from URL params (?board=...)
  const urlParams = new URLSearchParams(window.location.search);
  let currentBoardId = urlParams.get('board');

  function saveState() {
    localStorage.setItem(GLOBAL_PROJECTS_KEY, JSON.stringify(globalProjects));
  }

  function getAccessibleProjects() {
    return globalProjects.filter(p => 
      p.ownerId === currentUser.id || (p.members && p.members.includes(currentUser.id))
    );
  }

  function getCurrentBoard() {
    const accessible = getAccessibleProjects();
    return accessible.find(b => b.id === currentBoardId) || accessible[0] || globalProjects[0];
  }

  // --- Board Dropdown Header ---
  const boardSelector = document.getElementById('board-selector');
  function renderBoardSelector() {
    if (!boardSelector) return;
    boardSelector.innerHTML = '';
    const accessible = getAccessibleProjects();

    accessible.forEach(board => {
      const option = document.createElement('option');
      option.value = board.id;
      option.textContent = board.title;
      if (board.id === currentBoardId) option.selected = true;
      boardSelector.appendChild(option);
    });
  }

  boardSelector?.addEventListener('change', (e) => {
    currentBoardId = e.target.value;
    const newUrl = `${window.location.pathname}?board=${currentBoardId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    loadCurrentBoard();
  });

  // --- Dependency Blocker Check ---
  function isTaskLocked(task, board) {
    if (!task) return false;

    // Final Goal is locked if ANY non-goal task is incomplete
    if (task.isFinalGoal) {
      return (board.tasks || [])
        .filter(t => !t.isFinalGoal)
        .some(t => t.status !== 'done');
    }

    if (!task.dependencies || task.dependencies.length === 0) return false;

    return task.dependencies.some(depId => {
      const depTask = (board.tasks || []).find(t => t.id === depId);
      return !depTask || depTask.status !== 'done';
    });
  }

  // --- Recursive Dependency Cascade Reset ---
  function enforceDependencyCascade(board) {
    if (!board || !board.tasks) return;

    const demotedTitles = [];
    let changed = true;

    while (changed) {
      changed = false;
      board.tasks.forEach(task => {
        if (task.status === 'done' && isTaskLocked(task, board)) {
          task.status = 'todo';
          demotedTitles.push(task.title);
          changed = true;
        }
      });
    }

    if (demotedTitles.length > 0) {
      saveState();
      showAlert(`⚠️ ${demotedTitles.length} dependent task(s) demoted back to To-Do because prerequisite tasks became incomplete!`);
    }
  }

  const alertBanner = document.getElementById('dependency-alert');
  const alertText = document.getElementById('alert-text');
  function showAlert(msg) {
    if (!alertBanner || !alertText) return;
    alertText.textContent = msg;
    alertBanner.classList.remove('hidden');
    setTimeout(() => alertBanner.classList.add('hidden'), 4000);
  }

  // --- Load Board Content ---
  const currentBoardTitle = document.getElementById('current-board-title');
  const currentBoardDesc = document.getElementById('current-board-desc');

  function loadCurrentBoard() {
    const board = getCurrentBoard();
    if (!board) return;
    currentBoardId = board.id;

    if (currentBoardTitle) currentBoardTitle.textContent = board.title;
    if (currentBoardDesc) currentBoardDesc.textContent = board.desc || 'No description provided.';

    enforceDependencyCascade(board);

    renderKanban();
    renderGraphView();
  }

  // --- Kanban View Renderer ---
  function renderKanban() {
    const board = getCurrentBoard();
    if (!board) return;

    const columns = {
      'todo': document.getElementById('col-todo'),
      'in-progress': document.getElementById('col-in-progress'),
      'review': document.getElementById('col-review'),
      'done': document.getElementById('col-done')
    };

    const counts = { 'todo': 0, 'in-progress': 0, 'review': 0, 'done': 0 };
    Object.values(columns).forEach(col => { if (col) col.innerHTML = ''; });

    (board.tasks || []).forEach(task => {
      counts[task.status] = (counts[task.status] || 0) + 1;
      const locked = isTaskLocked(task, board);

      const card = document.createElement('div');
      card.className = `task-card ${locked ? 'is-locked' : ''} ${task.isFinalGoal ? 'is-milestone' : ''}`;
      
      card.draggable = !locked;
      card.dataset.taskId = task.id;

      if (locked) {
        card.setAttribute('title', '🔒 Locked: Complete all prerequisite tasks to enable dragging.');
      }

      card.innerHTML = `
        <div class="task-header">
          <span class="task-id">${task.isFinalGoal ? '🏁 ' + task.id : task.id}</span>
          ${locked ? '<span class="badge-locked">🔒 Blocked</span>' : '<span class="badge-ready">Ready</span>'}
        </div>
        <div class="task-title">${task.title}</div>
        ${task.desc ? `<div class="task-desc">${task.desc}</div>` : ''}
        ${task.dependencies && task.dependencies.length > 0 ? `
          <div class="task-deps-list">
            ${task.dependencies.map(d => `<span class="dep-tag">${task.isFinalGoal ? 'Requires ' + d : 'Blocked by ' + d}</span>`).join('')}
          </div>
        ` : ''}
      `;

      card.addEventListener('dragstart', (e) => {
        if (locked) {
          e.preventDefault();
          showAlert(`🔒 Task "${task.title}" is locked by prerequisite dependencies!`);
          return false;
        }
        e.dataTransfer.setData('text/plain', task.id);
      });

      if (columns[task.status]) {
        columns[task.status].appendChild(card);
      }
    });

    ['todo', 'in-progress', 'review', 'done'].forEach(st => {
      const el = document.getElementById(`count-${st}`);
      if (el) el.textContent = counts[st] || 0;
    });

    setupDropZones();
  }

  function setupDropZones() {
    const cols = document.querySelectorAll('.column-body');
    const board = getCurrentBoard();

    cols.forEach(col => {
      col.addEventListener('dragover', e => e.preventDefault());
      col.addEventListener('drop', e => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        const targetStatus = col.dataset.status;
        const task = board?.tasks?.find(t => t.id === taskId);

        if (!task) return;

        if (isTaskLocked(task, board)) {
          showAlert(`⚠️ Cannot move "${task.title}". Complete all blocker dependencies first!`);
          return;
        }

        task.status = targetStatus;

        enforceDependencyCascade(board);

        saveState();
        loadCurrentBoard();
      });
    });
  }

  // --- View Toggles ---
  const toggleKanban = document.getElementById('toggle-kanban');
  const toggleGraph = document.getElementById('toggle-graph');
  const kanbanView = document.getElementById('kanban-view');
  const graphView = document.getElementById('graph-view');

  toggleKanban?.addEventListener('click', () => {
    toggleKanban.classList.add('active');
    toggleGraph?.classList.remove('active');
    kanbanView?.classList.add('active');
    graphView?.classList.remove('active');
  });

  toggleGraph?.addEventListener('click', () => {
    toggleGraph.classList.add('active');
    toggleKanban?.classList.remove('active');
    graphView?.classList.add('active');
    kanbanView?.classList.remove('active');
    renderGraphView();
  });

  // --- Graph View Renderer ---

  // --- Owner-Only Final Milestone Creation ---
  document.getElementById('btn-add-milestone')?.addEventListener('click', () => {
    const board = getCurrentBoard();

    if (board.ownerId !== currentUser.id) {
      showAlert('🔒 Only the Project Owner can set the Final Milestone!');
      return;
    }

    const existingGoal = board.tasks.find(t => t.isFinalGoal);
    if (existingGoal) {
      showAlert(`⚠️ Final Milestone "${existingGoal.title}" already exists!`);
      return;
    }

    if (!board.tasks || board.tasks.length === 0) {
      showAlert('⚠️ Add project tasks first before setting a final milestone!');
      return;
    }

    const goalTitle = prompt('Enter the name for the Final Project Goal:', '🏁 Project Launch');
    if (!goalTitle || !goalTitle.trim()) return;

    const allTaskIds = board.tasks.map(t => t.id);

    const goalTask = {
      id: `GOAL-${Math.floor(100 + Math.random() * 900)}`,
      title: goalTitle.trim(),
      desc: 'Final milestone node. Unlocks only when all prerequisite project tasks are complete.',
      status: 'todo',
      isFinalGoal: true,
      dependencies: allTaskIds
    };

    board.tasks.push(goalTask);
    saveState();
    loadCurrentBoard();
    showAlert(`🏁 Milestone "${goalTask.title}" created! It is locked until all tasks are Done.`);
  });

  // --- Modal: Task Creation ---
  const modalTask = document.getElementById('modal-task');
  const depsContainer = document.getElementById('task-dependencies-container');

  document.getElementById('btn-add-task')?.addEventListener('click', () => {
    const board = getCurrentBoard();
    if (depsContainer) {
      depsContainer.innerHTML = '';
      
      const availableTasks = (board.tasks || []).filter(t => !t.isFinalGoal);
      if (availableTasks.length === 0) {
        depsContainer.innerHTML = '<p class="field-hint" style="padding: 6px;">No other tasks available in this project yet.</p>';
      } else {
        availableTasks.forEach(t => {
          const label = document.createElement('label');
          label.className = 'dependency-checkbox-item';
          label.innerHTML = `
            <input type="checkbox" name="dep-task" value="${t.id}" />
            <span class="dep-item-badge">${t.id}</span>
            <span class="dep-item-title">${t.title}</span>
          `;
          depsContainer.appendChild(label);
        });
      }
    }
    modalTask?.classList.remove('hidden');
  });

  document.getElementById('close-task-modal')?.addEventListener('click', () => modalTask?.classList.add('hidden'));
  document.getElementById('btn-cancel-task')?.addEventListener('click', () => modalTask?.classList.add('hidden'));

  document.getElementById('form-create-task')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const board = getCurrentBoard();
    const titleInput = document.getElementById('task-title');
    const descInput = document.getElementById('task-desc');

    const checkedBoxes = document.querySelectorAll('input[name="dep-task"]:checked');
    const selectedDeps = Array.from(checkedBoxes).map(cb => cb.value);

    const newTask = {
      id: `FL-${Math.floor(100 + Math.random() * 900)}`,
      title: titleInput.value.trim(),
      desc: descInput ? descInput.value.trim() : '',
      status: 'todo',
      dependencies: selectedDeps
    };

    if (!board.tasks) board.tasks = [];
    board.tasks.push(newTask);

    const finalGoalTask = board.tasks.find(t => t.isFinalGoal);
    if (finalGoalTask && !finalGoalTask.dependencies.includes(newTask.id)) {
      finalGoalTask.dependencies.push(newTask.id);
    }

    saveState();
    modalTask?.classList.add('hidden');
    document.getElementById('form-create-task')?.reset();
    loadCurrentBoard();
  });

  // --- Modal: New Project Board ---
  const modalBoard = document.getElementById('modal-board');
  document.getElementById('btn-create-board')?.addEventListener('click', () => modalBoard?.classList.remove('hidden'));
  document.getElementById('close-board-modal')?.addEventListener('click', () => modalBoard?.classList.add('hidden'));
  document.getElementById('btn-cancel-board')?.addEventListener('click', () => modalBoard?.classList.add('hidden'));

  document.getElementById('form-create-board')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('board-title');
    const descInput = document.getElementById('board-desc');

    const newBoard = {
      id: `board-${Date.now()}`,
      title: titleInput.value.trim(),
      desc: descInput ? descInput.value.trim() : '',
      ownerId: currentUser.id,
      members: [currentUser.id],
      tasks: []
    };

    globalProjects.push(newBoard);
    saveState();
    currentBoardId = newBoard.id;
    modalBoard?.classList.add('hidden');
    document.getElementById('form-create-board')?.reset();
    renderBoardSelector();
    loadCurrentBoard();
  });

  // --- Modal: View Team Roles ---
  const modalRoles = document.getElementById('modal-roles');
  const rolesContainer = document.getElementById('roles-list-container');

  document.getElementById('btn-view-roles')?.addEventListener('click', () => {
    const board = getCurrentBoard();
    const allUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (!rolesContainer) return;

    rolesContainer.innerHTML = '';
    const memberIds = board.members || [board.ownerId];

    memberIds.forEach(mId => {
      const user = allUsers.find(u => u.id === mId) || { name: 'Project Member', email: mId };
      const isOwner = mId === board.ownerId;

      const card = document.createElement('div');
      card.className = 'role-member-card';
      card.innerHTML = `
        <div class="role-user-info">
          <div class="role-avatar">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
          <div class="role-details">
            <span class="role-name">${user.name}</span>
            <span class="role-email">${user.email}</span>
          </div>
        </div>
        <span class="role-badge ${isOwner ? 'owner' : 'member'}">
          ${isOwner ? '👑 Owner' : '👥 Member'}
        </span>
      `;
      rolesContainer.appendChild(card);
    });

    modalRoles?.classList.remove('hidden');
  });

  document.getElementById('close-roles-modal')?.addEventListener('click', () => modalRoles?.classList.add('hidden'));
  document.getElementById('btn-close-roles')?.addEventListener('click', () => modalRoles?.classList.add('hidden'));

  // --- Sign Out ---
  document.getElementById('btn-app-logout')?.addEventListener('click', () => {
    localStorage.removeItem('flowlock_authenticated');
    localStorage.removeItem('flowlock_current_user');
    window.location.href = 'index.html';
  });

  // Initial Execution
  renderBoardSelector();
  loadCurrentBoard();
});
