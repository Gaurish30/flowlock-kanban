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
  if (!globalProjects) {
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

  // --- Load Board Content ---
  const currentBoardTitle = document.getElementById('current-board-title');
  const currentBoardDesc = document.getElementById('current-board-desc');

  function loadCurrentBoard() {
    const board = getCurrentBoard();
    if (!board) return;
    currentBoardId = board.id;

    if (currentBoardTitle) currentBoardTitle.textContent = board.title;
    if (currentBoardDesc) currentBoardDesc.textContent = board.desc || 'No description provided.';

    renderKanban();
    renderGraphView();
  }

  // --- Dependency Blocker Logic ---
  function isTaskLocked(task, board) {
    if (!task.dependencies || task.dependencies.length === 0) return false;
    return task.dependencies.some(depId => {
      const depTask = board.tasks.find(t => t.id === depId);
      return !depTask || depTask.status !== 'done';
    });
  }

  const alertBanner = document.getElementById('dependency-alert');
  const alertText = document.getElementById('alert-text');
  function showAlert(msg) {
    if (!alertBanner || !alertText) return;
    alertText.textContent = msg;
    alertBanner.classList.remove('hidden');
    setTimeout(() => alertBanner.classList.add('hidden'), 4000);
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
        ${task.desc ? `<div class="task-desc">${task.desc}</div>` : ''}
        ${task.dependencies && task.dependencies.length > 0 ? `
          <div class="task-deps-list">
            ${task.dependencies.map(d => `<span class="dep-tag">Blocked by ${d}</span>`).join('')}
          </div>
        ` : ''}
      `;

      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', task.id);
      });

      if (columns[task.status]) {
        columns[task.status].appendChild(card);
      }
    });

    // Update Counts
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
        const task = board.tasks.find(t => t.id === taskId);

        if (!task) return;

        if (targetStatus === 'done' && isTaskLocked(task, board)) {
          showAlert(`⚠️ Task "${task.title}" is locked. Complete all prerequisite blocker tasks before moving to Done!`);
          return;
        }

        task.status = targetStatus;
        saveState();
        loadCurrentBoard();
      });
    });
  }

  // --- Toggle Views (Kanban vs Graph) ---
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

  // --- Dependency Visualizer Engine ---
  // --- Enhanced Multi-Dependency Graph Engine ---
  function renderGraphView() {
    const board = getCurrentBoard();
    const nodesLayer = document.getElementById('graph-nodes-layer');
    const svg = document.getElementById('dependency-svg');
    if (!nodesLayer || !svg) return;

    nodesLayer.innerHTML = '';
    svg.innerHTML = `
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1"/>
        </marker>
        <marker id="arrow-locked" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b"/>
        </marker>
      </defs>
    `;

    if (!board || !board.tasks || board.tasks.length === 0) return;

    // 1. Calculate Graph Depth (Layers) for each task based on dependency chains
    const depths = {};
    function getTaskDepth(taskId, visited = new Set()) {
      if (visited.has(taskId)) return 0; // Prevent cycle loops
      visited.add(taskId);
      
      const task = board.tasks.find(t => t.id === taskId);
      if (!task || !task.dependencies || task.dependencies.length === 0) return 0;

      const maxParentDepth = Math.max(...task.dependencies.map(depId => getTaskDepth(depId, new Set(visited))));
      return maxParentDepth + 1;
    }

    board.tasks.forEach(t => {
      depths[t.id] = getTaskDepth(t.id);
    });

    // 2. Group tasks into Layer Columns
    const layers = {};
    board.tasks.forEach(task => {
      const depth = depths[task.id];
      if (!layers[depth]) layers[depth] = [];
      layers[depth].push(task);
    });

    // 3. Render Nodes with Dynamic Coordinates
    const nodeCoords = {};
    const colWidth = 260;
    const rowHeight = 110;
    const startX = 40;
    const startY = 40;

    Object.keys(layers).forEach(layerIndex => {
      const tasksInLayer = layers[layerIndex];
      tasksInLayer.forEach((task, rowIndex) => {
        const posX = startX + parseInt(layerIndex) * colWidth;
        const posY = startY + rowIndex * rowHeight;

        // Store precise bounding connection points (Right edge for output, Left edge for input)
        nodeCoords[task.id] = {
          outX: posX + 200, // right side of box
          outY: posY + 40,  // center vertical
          inX: posX,        // left side of box
          inY: posY + 40,   // center vertical
          posX,
          posY
        };

        const locked = isTaskLocked(task, board);
        const node = document.createElement('div');
        node.className = `graph-node ${task.status === 'done' ? 'done' : ''} ${locked ? 'locked' : ''}`;
        node.style.left = `${posX}px`;
        node.style.top = `${posY}px`;

        node.innerHTML = `
          <span style="font-size:0.75rem; font-weight:700; color:var(--text-tertiary); display:block;">${task.id}</span>
          <span style="font-size:0.875rem; font-weight:600; color:var(--text-primary); display:block; margin-top:2px;">${task.title}</span>
          <span style="font-size:0.7rem; font-weight:700; color:${locked ? 'var(--warning)' : 'var(--success)'}; display:block; margin-top:6px;">
            ${locked ? '🔒 BLOCKED' : task.status.toUpperCase()}
          </span>
        `;

        nodesLayer.appendChild(node);
      });
    });

    // 4. Draw Smooth Curved Bezier Paths for Multiple Dependencies
    board.tasks.forEach(task => {
      if (task.dependencies && task.dependencies.length > 0) {
        const targetCoord = nodeCoords[task.id];
        if (!targetCoord) return;

        task.dependencies.forEach((depId, idx) => {
          const sourceCoord = nodeCoords[depId];
          if (!sourceCoord) return;

          // Offset incoming arrows slightly on multi-dependency nodes so lines don't stack on top of each other
          const verticalOffset = (idx - (task.dependencies.length - 1) / 2) * 12;
          const targetY = targetCoord.inY + verticalOffset;

          // Bezier control points for smooth curving lines
          const deltaX = Math.abs(targetCoord.inX - sourceCoord.outX) / 2;
          const cp1X = sourceCoord.outX + deltaX;
          const cp1Y = sourceCoord.outY;
          const cp2X = targetCoord.inX - deltaX;
          const cp2Y = targetY;

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', `M ${sourceCoord.outX} ${sourceCoord.outY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${targetCoord.inX} ${targetY}`);

          const isLocked = isTaskLocked(task, board);
          path.setAttribute('stroke', isLocked ? '#f59e0b' : '#6366f1');
          path.setAttribute('stroke-width', '2');
          path.setAttribute('fill', 'none');
          if (isLocked) path.setAttribute('stroke-dasharray', '4 4');
          path.setAttribute('marker-end', isLocked ? 'url(#arrow-locked)' : 'url(#arrow)');

          svg.appendChild(path);
        });
      }
    });
  }

  // --- Modal: Task Creation ---
  const modalTask = document.getElementById('modal-task');
  const depsSelect = document.getElementById('task-dependencies');

  document.getElementById('btn-add-task')?.addEventListener('click', () => {
    const board = getCurrentBoard();
    if (depsSelect) {
      depsSelect.innerHTML = '';
      board.tasks.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.id} — ${t.title}`;
        depsSelect.appendChild(opt);
      });
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

    const selectedDeps = depsSelect ? Array.from(depsSelect.selectedOptions).map(o => o.value) : [];

    const newTask = {
      id: `FL-${Math.floor(100 + Math.random() * 900)}`,
      title: titleInput.value.trim(),
      desc: descInput ? descInput.value.trim() : '',
      status: 'todo',
      dependencies: selectedDeps
    };

    board.tasks.push(newTask);
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

  // Initial Load Call
  renderBoardSelector();
  loadCurrentBoard();
});