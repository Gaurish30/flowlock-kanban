document.addEventListener('DOMContentLoaded', () => {
  // 1. Verify User Authentication Session
  const isAuthenticated = localStorage.getItem('flowlock_authenticated') === 'true';
  const currentUser = JSON.parse(localStorage.getItem('flowlock_current_user') || 'null');

  if (!isAuthenticated || !currentUser) {
    window.location.href = 'auth.html';
    return;
  }

  // Update User Header Info
  const userNameElem = document.getElementById('user-name-display');
  const userAvatarElem = document.getElementById('user-avatar');
  if (userNameElem) userNameElem.textContent = currentUser.name;
  if (userAvatarElem) userAvatarElem.textContent = currentUser.name.charAt(0).toUpperCase();

  // Storage Key specific to this registered user
  const USER_STORAGE_KEY = `flowlock_boards_${currentUser.email}`;

  // Default Board Data if new user
  const defaultBoards = [
    {
      id: 'board-1',
      title: 'Payment Gateway Integration',
      desc: 'Track tasks and lock downstream dependencies automatically.',
      tasks: [
        { id: 'FL-101', title: 'Define API Specs', desc: 'OAuth2 contract', status: 'done', dependencies: [] },
        { id: 'FL-102', title: 'Setup Stripe Webhooks', desc: 'Listen to charge events', status: 'in-progress', dependencies: ['FL-101'] },
        { id: 'FL-103', title: 'Frontend Checkout UI', desc: 'React components', status: 'todo', dependencies: ['FL-102'] }
      ]
    },
    {
      id: 'board-2',
      title: 'OAuth2 Authentication Refactor',
      desc: 'Migrate legacy sessions to JWT with Refresh Tokens.',
      tasks: [
        { id: 'FL-201', title: 'Redis Cache Setup', desc: 'In-memory token store', status: 'done', dependencies: [] },
        { id: 'FL-202', title: 'Token Rotation Engine', desc: 'Refresh token handlers', status: 'in-progress', dependencies: ['FL-201'] }
      ]
    }
  ];

  // Load User's Private Boards
  let userBoards = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || JSON.stringify(defaultBoards));

  // Determine requested board ID from URL query params (e.g., app.html?board=board-1)
  const urlParams = new URLSearchParams(window.location.search);
  const requestedBoardId = urlParams.get('board');

  let currentBoardId = requestedBoardId || userBoards[0]?.id || 'board-1';

  // UI Elements
  const boardSelector = document.getElementById('board-selector');
  const boardTitle = document.getElementById('current-board-title');
  const boardDesc = document.getElementById('current-board-desc');
  const alertBanner = document.getElementById('dependency-alert');
  const alertText = document.getElementById('alert-text');

  // --- Board Switcher & Persistence ---
  function saveState() {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userBoards));
  }

  function getCurrentBoard() {
    return userBoards.find(b => b.id === currentBoardId) || userBoards[0];
  }

  function renderBoardSelector() {
    if (!boardSelector) return;
    boardSelector.innerHTML = '';
    userBoards.forEach(board => {
      const option = document.createElement('option');
      option.value = board.id;
      option.textContent = board.title;
      if (board.id === currentBoardId) option.selected = true;
      boardSelector.appendChild(option);
    });
  }

  function loadCurrentBoard() {
    const board = getCurrentBoard();
    if (!board) return;
    currentBoardId = board.id;
    if (boardTitle) boardTitle.textContent = board.title;
    if (boardDesc) boardDesc.textContent = board.desc || 'No description provided.';
    
    renderKanbanTasks();
    renderGraphView();
  }

  boardSelector?.addEventListener('change', (e) => {
    currentBoardId = e.target.value;
    // Update URL query string without reloading page
    const newUrl = `${window.location.pathname}?board=${currentBoardId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    loadCurrentBoard();
  });

  // --- Dependency & Lock Logic ---
  function isTaskLocked(task, board) {
    if (!task.dependencies || task.dependencies.length === 0) return false;
    // Task is locked if ANY prerequisite task is not in status "done"
    return task.dependencies.some(depId => {
      const depTask = board.tasks.find(t => t.id === depId);
      return !depTask || depTask.status !== 'done';
    });
  }

  function showBlockerAlert(msg) {
    if (!alertBanner || !alertText) return;
    alertText.textContent = msg;
    alertBanner.classList.remove('hidden');
    setTimeout(() => alertBanner.classList.add('hidden'), 4000);
  }

  // --- Kanban Render Engine ---
  function renderKanbanTasks() {
    const board = getCurrentBoard();
    if (!board) return;

    const columns = {
      'todo': document.getElementById('col-todo'),
      'in-progress': document.getElementById('col-in-progress'),
      'review': document.getElementById('col-review'),
      'done': document.getElementById('col-done')
    };

    const counts = { 'todo': 0, 'in-progress': 0, 'review': 0, 'done': 0 };

    Object.values(columns).forEach(col => {
      if (col) col.innerHTML = '';
    });

    board.tasks.forEach(task => {
      counts[task.status] = (counts[task.status] || 0) + 1;
      const locked = isTaskLocked(task, board);

      const card = document.createElement('div');
      card.className = `task-card ${locked ? 'is-locked' : ''}`;
      card.draggable = true;
      card.dataset.taskId = task.id;

      card.innerHTML = `
        <div class="task-header">
          <span class="task-id">${task.id}</span>
          ${locked ? '<span class="badge-locked">🔒 Blocked</span>' : '<span class="badge-ready">Ready</span>'}
        </div>
        <div class="task-title">${task.title}</div>
        ${task.desc ? `<div style="font-size: 0.8rem; color: var(--text-tertiary); margin-bottom: 8px;">${task.desc}</div>` : ''}
        ${task.dependencies && task.dependencies.length > 0 ? `
          <div class="task-deps-list">
            ${task.dependencies.map(d => `<span class="dep-tag">Blocked by ${d}</span>`).join('')}
          </div>
        ` : ''}
      `;

      // Drag Event Handler
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', task.id);
      });

      if (columns[task.status]) {
        columns[task.status].appendChild(card);
      }
    });

    // Update Counter Badges
    const countTodo = document.getElementById('count-todo');
    const countInProgress = document.getElementById('count-in-progress');
    const countReview = document.getElementById('count-review');
    const countDone = document.getElementById('count-done');

    if (countTodo) countTodo.textContent = counts['todo'];
    if (countInProgress) countInProgress.textContent = counts['in-progress'];
    if (countReview) countReview.textContent = counts['review'];
    if (countDone) countDone.textContent = counts['done'];

    setupDropZones();
  }

  // --- Drag & Drop with Dependency Enforcement ---
  function setupDropZones() {
    const cols = document.querySelectorAll('.column-body');
    const board = getCurrentBoard();

    cols.forEach(col => {
      col.addEventListener('dragover', e => e.preventDefault());

      col.addEventListener('drop', e => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        const targetStatus = col.dataset.status;
        const task = board.tasks.find(t => t.id === taskId);

        if (!task) return;

        // Dependency Enforcer: Reject completion if prerequisite blockers exist
        if (targetStatus === 'done' && isTaskLocked(task, board)) {
          showBlockerAlert(`⚠️ Cannot move "${task.title}" to Done. Prerequisite blocker tasks must be finished first!`);
          return;
        }

        task.status = targetStatus;
        saveState();
        loadCurrentBoard();
      });
    });
  }

  // --- View Toggle Engine (Kanban vs Graph) ---
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

  // --- Dependency Graph Renderer ---
  function renderGraphView() {
    const board = getCurrentBoard();
    const nodesLayer = document.getElementById('graph-nodes-layer');
    const svg = document.getElementById('dependency-svg');
    if (!nodesLayer || !svg) return;

    nodesLayer.innerHTML = '';
    svg.innerHTML = '';

    const positions = [
      { x: 40, y: 180 },
      { x: 300, y: 100 },
      { x: 300, y: 260 },
      { x: 560, y: 180 },
      { x: 800, y: 180 }
    ];

    board.tasks.forEach((task, idx) => {
      const pos = positions[idx % positions.length];
      const locked = isTaskLocked(task, board);

      const node = document.createElement('div');
      node.className = `graph-node ${task.status === 'done' ? 'done' : ''} ${locked ? 'locked' : ''}`;
      node.style.left = `${pos.x}px`;
      node.style.top = `${pos.y}px`;
      node.id = `node-${task.id}`;

      node.innerHTML = `
        <strong style="display:block; font-size:0.8rem; color:var(--text-secondary);">${task.id}</strong>
        <span style="font-weight:600; font-size:0.875rem;">${task.title}</span>
        <div style="margin-top:6px; font-size:0.75rem; font-weight: 600; color: ${locked ? 'var(--warning)' : 'var(--success)'}">
          ${locked ? '🔒 Blocked' : task.status.toUpperCase()}
        </div>
      `;

      nodesLayer.appendChild(node);
    });
  }

  // --- Modal Controls: Create Task ---
  const taskModal = document.getElementById('modal-task');
  const boardModal = document.getElementById('modal-board');
  const depsSelect = document.getElementById('task-dependencies');

  document.getElementById('btn-add-task')?.addEventListener('click', () => {
    const board = getCurrentBoard();
    if (!depsSelect) return;
    depsSelect.innerHTML = '';
    
    board.tasks.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.id} — ${t.title}`;
      depsSelect.appendChild(opt);
    });
    
    taskModal?.classList.remove('hidden');
  });

  document.getElementById('close-task-modal')?.addEventListener('click', () => taskModal?.classList.add('hidden'));
  document.getElementById('btn-cancel-task')?.addEventListener('click', () => taskModal?.classList.add('hidden'));

  document.getElementById('form-create-task')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const board = getCurrentBoard();
    const titleInput = document.getElementById('task-title');
    const descInput = document.getElementById('task-desc');

    const title = titleInput ? titleInput.value.trim() : '';
    const desc = descInput ? descInput.value.trim() : '';
    const selectedDeps = depsSelect ? Array.from(depsSelect.selectedOptions).map(o => o.value) : [];

    const newTask = {
      id: `FL-${Math.floor(100 + Math.random() * 900)}`,
      title,
      desc,
      status: 'todo',
      dependencies: selectedDeps
    };

    board.tasks.push(newTask);
    saveState();
    taskModal?.classList.add('hidden');
    document.getElementById('form-create-task')?.reset();
    loadCurrentBoard();
  });

  // --- Modal Controls: Create New Project Board ---
  document.getElementById('btn-create-board')?.addEventListener('click', () => boardModal?.classList.remove('hidden'));
  document.getElementById('close-board-modal')?.addEventListener('click', () => boardModal?.classList.add('hidden'));
  document.getElementById('btn-cancel-board')?.addEventListener('click', () => boardModal?.classList.add('hidden'));

  document.getElementById('form-create-board')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('board-title');
    const descInput = document.getElementById('board-desc');

    const title = titleInput ? titleInput.value.trim() : '';
    const desc = descInput ? descInput.value.trim() : '';

    const newBoard = {
      id: `board-${Date.now()}`,
      title,
      desc,
      tasks: []
    };

    userBoards.push(newBoard);
    currentBoardId = newBoard.id;
    saveState();
    renderBoardSelector();
    
    // Update URL query string
    const newUrl = `${window.location.pathname}?board=${currentBoardId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    loadCurrentBoard();
    boardModal?.classList.add('hidden');
    document.getElementById('form-create-board')?.reset();
  });

  // --- Sign Out ---
  document.getElementById('btn-app-logout')?.addEventListener('click', () => {
    localStorage.removeItem('flowlock_authenticated');
    localStorage.removeItem('flowlock_current_user');
    window.location.href = 'index.html';
  });

  // Boot Application State
  renderBoardSelector();
  loadCurrentBoard();
});