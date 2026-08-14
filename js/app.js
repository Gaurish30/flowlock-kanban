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
  function renderGraphView() {
    const board = getCurrentBoard();
    const nodesLayer = document.getElementById('graph-nodes-layer');
    const svg = document.getElementById('dependency-svg');
    if (!nodesLayer || !svg) return;

    nodesLayer.innerHTML = '';

    svg.innerHTML = `
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1"/>
        </marker>
        <marker id="arrow-locked" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b"/>
        </marker>
        <marker id="arrow-goal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6"/>
        </marker>
      </defs>
    `;

    if (!board || !board.tasks || board.tasks.length === 0) return;

    // Map Dependents
    const hasDependents = {};
    board.tasks.forEach(task => {
      (task.dependencies || []).forEach(depId => {
        hasDependents[depId] = true;
      });
    });

    const isolatedTasks = [];
    const dagTasks = [];

    board.tasks.forEach(task => {
      const hasNoDeps = !task.dependencies || task.dependencies.length === 0;
      const isDependedOn = !!hasDependents[task.id];

      if (hasNoDeps && !isDependedOn && !task.isFinalGoal) {
        isolatedTasks.push(task);
      } else {
        dagTasks.push(task);
      }
    });

    const cardWidth = 200;
    const cardHeight = 80;
    const levelSpacingY = 150;
    const nodeSpacingX = 240;

    const nodePositions = {};
    const outgoingPorts = {};
    const incomingPorts = {};

    const hasIsolated = isolatedTasks.length > 0;
    const dagStartX = hasIsolated ? 320 : 60;

    // Render Standalone Tasks
    if (hasIsolated) {
      isolatedTasks.forEach((task, idx) => {
        const posX = 60;
        const posY = 40 + idx * 110;
        nodePositions[task.id] = { posX, posY };

        const node = document.createElement('div');
        node.className = 'graph-node standalone-node';
        node.style.left = `${posX}px`;
        node.style.top = `${posY}px`;
        node.style.width = `${cardWidth}px`;

        node.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.75rem; font-weight:700; color:var(--text-tertiary);">${task.id}</span>
            <span style="font-size:0.65rem; font-weight:700; background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px; color:var(--text-tertiary);">UNLINKED</span>
          </div>
          <span style="font-size:0.85rem; font-weight:600; color:var(--text-primary); display:block; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${task.title}</span>
          <span style="font-size:0.7rem; font-weight:700; color:var(--success); display:block; margin-top:4px;">
            ${task.status.toUpperCase()}
          </span>
        `;
        nodesLayer.appendChild(node);
      });
    }

    // Position DAG Tasks
    if (dagTasks.length > 0) {
      function isReachable(startId, targetId, visited = new Set()) {
        if (startId === targetId) return true;
        visited.add(startId);
        const task = dagTasks.find(t => t.id === startId);
        if (!task || !task.dependencies) return false;

        for (const parentId of task.dependencies) {
          if (!visited.has(parentId)) {
            if (isReachable(parentId, targetId, visited)) return true;
          }
        }
        return false;
      }

      const directDependencies = {};
      dagTasks.forEach(task => {
        const deps = task.dependencies || [];
        directDependencies[task.id] = deps.filter(depA => {
          return !deps.some(depB => {
            if (depA === depB) return false;
            return isReachable(depB, depA);
          });
        });
      });

      const depths = {};
      function getTaskDepth(taskId, visited = new Set()) {
        if (visited.has(taskId)) return 0;
        visited.add(taskId);
        const task = dagTasks.find(t => t.id === taskId);
        const reducedDeps = directDependencies[taskId] || [];
        if (!task || reducedDeps.length === 0) return 0;

        const maxParentDepth = Math.max(...reducedDeps.map(depId => getTaskDepth(depId, new Set(visited))));
        return maxParentDepth + 1;
      }

      dagTasks.forEach(t => { depths[t.id] = getTaskDepth(t.id); });

      const levelsMap = {};
      dagTasks.forEach(task => {
        const depth = depths[task.id];
        if (!levelsMap[depth]) levelsMap[depth] = [];
        levelsMap[depth].push(task);
      });

      const levelIndices = Object.keys(levelsMap).map(Number).sort((a, b) => a - b);

      levelIndices.forEach((levelIdx, idx) => {
        const tasksInLevel = levelsMap[levelIdx];
        const posY = 40 + levelIdx * levelSpacingY;

        if (idx === 0) {
          tasksInLevel.forEach((task, colIdx) => {
            nodePositions[task.id] = { posX: dagStartX + colIdx * nodeSpacingX, posY };
          });
        } else {
          const groups = {};

          tasksInLevel.forEach(task => {
            const parents = directDependencies[task.id] || [];
            let parentAvgX = dagStartX;

            if (parents.length > 0) {
              const sumX = parents.reduce((sum, pId) => sum + (nodePositions[pId]?.posX ?? dagStartX), 0);
              parentAvgX = sumX / parents.length;
            }

            if (!groups[parentAvgX]) groups[parentAvgX] = [];
            groups[parentAvgX].push(task);
          });

          const taskIdealX = [];
          Object.keys(groups).forEach(pAvgXStr => {
            const pAvgX = parseFloat(pAvgXStr);
            const siblings = groups[pAvgXStr];
            const count = siblings.length;

            siblings.forEach((task, sibIdx) => {
              const offset = (sibIdx - (count - 1) / 2) * nodeSpacingX;
              taskIdealX.push({ task, idealX: pAvgX + offset });
            });
          });

          taskIdealX.sort((a, b) => a.idealX - b.idealX);

          let lastX = -Infinity;
          taskIdealX.forEach(item => {
            let posX = Math.max(item.idealX, dagStartX);
            if (posX < lastX + nodeSpacingX) {
              posX = lastX + nodeSpacingX;
            }
            nodePositions[item.task.id] = { posX, posY };
            lastX = posX;
          });
        }

        // Render Connected Nodes
        tasksInLevel.forEach(task => {
          const { posX, posY } = nodePositions[task.id];
          outgoingPorts[task.id] = [];
          incomingPorts[task.id] = [];

          const locked = isTaskLocked(task, board);
          const node = document.createElement('div');

          if (task.isFinalGoal) {
            node.className = `graph-node end-goal-node ${task.status === 'done' ? 'goal-achieved' : ''}`;
            node.innerHTML = `
              <span style="font-size:0.75rem; font-weight:700; color:#c084fc; display:block;">MILESTONE</span>
              <span style="font-size:0.85rem; font-weight:700; color:#ffffff; display:block; margin-top:2px;">🏁 ${task.title}</span>
              <span style="font-size:0.7rem; font-weight:700; color:${task.status === 'done' ? 'var(--success)' : '#c084fc'}; display:block; margin-top:4px;">
                ${task.status === 'done' ? '🎉 ACHIEVED' : (locked ? '🔒 BLOCKED' : 'READY')}
              </span>
            `;
          } else {
            node.className = `graph-node ${task.status === 'done' ? 'done' : ''} ${locked ? 'locked' : ''}`;
            node.innerHTML = `
              <span style="font-size:0.75rem; font-weight:700; color:var(--text-tertiary); display:block;">${task.id}</span>
              <span style="font-size:0.85rem; font-weight:600; color:var(--text-primary); display:block; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${task.title}</span>
              <span style="font-size:0.7rem; font-weight:700; color:${locked ? 'var(--warning)' : 'var(--success)'}; display:block; margin-top:4px;">
                ${locked ? '🔒 BLOCKED' : task.status.toUpperCase()}
              </span>
            `;
          }

          node.style.left = `${posX}px`;
          node.style.top = `${posY}px`;
          node.style.width = `${cardWidth}px`;
          nodesLayer.appendChild(node);
        });
      });

      // Render Dynamic Connectors
      const edges = [];
      dagTasks.forEach(task => {
        const reducedDeps = directDependencies[task.id] || [];
        reducedDeps.forEach(parentId => {
          if (nodePositions[parentId] && nodePositions[task.id]) {
            const edge = {
              parentId,
              childId: task.id,
              isLocked: isTaskLocked(task, board),
              isGoal: task.isFinalGoal
            };
            edges.push(edge);
            outgoingPorts[parentId].push(edge);
            incomingPorts[task.id].push(edge);
          }
        });
      });

      edges.forEach(edge => {
        const parentTask = (board.tasks || []).find(t => t.id === edge.parentId);
        const parentDone = parentTask && parentTask.status === 'done';
        const parentLocked = parentTask ? isTaskLocked(parentTask, board) : false;

        // An edge is blocked if its source task is not completed, locked, or target is locked
        const isBlocked = !parentDone || parentLocked || edge.isLocked;

        const parentPos = nodePositions[edge.parentId];
        const childPos = nodePositions[edge.childId];

        const outIndex = outgoingPorts[edge.parentId].indexOf(edge);
        const outTotal = outgoingPorts[edge.parentId].length;
        const inIndex = incomingPorts[edge.childId].indexOf(edge);
        const inTotal = incomingPorts[edge.childId].length;

        const outX = parentPos.posX + (cardWidth / (outTotal + 1)) * (outIndex + 1);
        const outY = parentPos.posY + cardHeight;

        const inX = childPos.posX + (cardWidth / (inTotal + 1)) * (inIndex + 1);
        const inY = childPos.posY;

        const deltaY = Math.max(40, Math.abs(inY - outY) / 2);
        const cp1X = outX;
        const cp1Y = outY + deltaY;
        const cp2X = inX;
        const cp2Y = inY - deltaY;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${outX} ${outY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${inX} ${inY}`);

        let strokeColor = '#6366f1';
        let markerUrl = 'url(#arrow)';
        let isDashed = false;

        // Blocked edges (including blocked tasks pointing to the goal) display as amber dashed lines
        if (isBlocked) {
          strokeColor = '#f59e0b';
          markerUrl = 'url(#arrow-locked)';
          isDashed = true;
        } else if (edge.isGoal) {
          strokeColor = '#8b5cf6';
          markerUrl = 'url(#arrow-goal)';
          isDashed = false;
        }

        path.setAttribute('stroke', strokeColor);
        path.setAttribute('stroke-width', edge.isGoal ? '2.5' : '2');
        path.setAttribute('fill', 'none');
        if (isDashed) {
          path.setAttribute('stroke-dasharray', '4 4');
        }
        path.setAttribute('marker-end', markerUrl);

        svg.appendChild(path);
      });
    }

    // Dynamic Bounds Adjuster
    const allXPositions = Object.values(nodePositions).map(p => p.posX);
    const allYPositions = Object.values(nodePositions).map(p => p.posY);
    const maxX = Math.max(...allXPositions, 300);
    const maxY = Math.max(...allYPositions, 300);

    const container = document.getElementById('graph-canvas-container');
    const containerWidth = container ? container.clientWidth : 800;
    const containerHeight = container ? container.clientHeight : 600;

    const maxGraphX = Math.max(containerWidth, maxX + cardWidth + 100);
    const maxGraphY = Math.max(containerHeight, maxY + cardHeight + 100);

    svg.setAttribute('width', `${maxGraphX}px`);
    svg.setAttribute('height', `${maxGraphY}px`);
    nodesLayer.style.width = `${maxGraphX}px`;
    nodesLayer.style.height = `${maxGraphY}px`;
  }

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