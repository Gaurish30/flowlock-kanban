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
  const HISTORY_KEY = 'flowlock_task_history';

  // Default Seed Data if Storage is empty
  const defaultProjects = [
    {
      id: 'board-1',
      title: 'Payment Gateway Integration',
      desc: 'Track tasks and lock downstream dependencies automatically.',
      ownerId: currentUser.id,
      members: [currentUser.id],
      tasks: [
        { id: 'FL-101', title: 'Define API Contracts', desc: 'OAuth2 contract and payload definition', status: 'done', dependencies: [], assigneeId: currentUser.id },
        { id: 'FL-102', title: 'Setup Stripe Webhooks', desc: 'Listen to customer payment events', status: 'in-progress', dependencies: ['FL-101'], assigneeId: null },
        { id: 'FL-103', title: 'Build Checkout Modal', desc: 'React component state and payment form', status: 'todo', dependencies: ['FL-102'], assigneeId: null }
      ]
    }
  ];

  let globalProjects = JSON.parse(localStorage.getItem(GLOBAL_PROJECTS_KEY) || 'null');
  if (!globalProjects || !Array.isArray(globalProjects) || globalProjects.length === 0) {
    globalProjects = defaultProjects;
    localStorage.setItem(GLOBAL_PROJECTS_KEY, JSON.stringify(globalProjects));
  }

  // --- Helpers for User and Task History ---
  function getAllUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }

  function getTaskHistory() {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  }

  function recordTaskCompletion(task, boardId) {
    const history = getTaskHistory();
    const allUsers = getAllUsers();
    const assignee = allUsers.find(u => u.id === task.assigneeId) || currentUser;

    const logEntry = {
      id: `LOG-${Date.now()}`,
      taskId: task.id,
      taskTitle: task.title,
      userId: assignee.id,
      userName: assignee.name || assignee.email || 'User',
      boardId: boardId,
      completedAt: new Date().toISOString()
    };

    history.unshift(logEntry); // add newest entry at top
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
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
    if (typeof renderGraphView === 'function') {
      renderGraphView();
    }
  }

  // --- Task Claiming Handler ---
  function claimTask(taskId) {
    const board = getCurrentBoard();
    const task = board?.tasks?.find(t => t.id === taskId);

    if (!task) return;

    task.assigneeId = currentUser.id;
    saveState();
    loadCurrentBoard();
    showAlert(`✅ You have claimed task "${task.title}"!`);
  }

  // --- Kanban View Renderer ---
  function renderKanban() {
    const board = getCurrentBoard();
    if (!board) return;

    const allUsers = getAllUsers();
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
      const isFinished = task.status === 'done';
      const assignee = allUsers.find(u => u.id === task.assigneeId);
      const isAssignedToMe = task.assigneeId === currentUser.id;

      const card = document.createElement('div');
      card.className = `task-card ${locked || isFinished ? 'is-locked' : ''} ${task.isFinalGoal ? 'is-milestone' : ''}`;
      
      const canUserMove = isAssignedToMe && !locked && !isFinished;
      card.draggable = canUserMove;
      card.dataset.taskId = task.id;

      if (isFinished) {
        card.setAttribute('title', '🔒 Completed: Finished tasks are locked and cannot be moved.');
      } else if (locked) {
        card.setAttribute('title', '🔒 Locked: Complete all prerequisite tasks first.');
      } else if (!task.assigneeId) {
        card.setAttribute('title', '⚡ Claim this task to start moving it!');
      } else if (!isAssignedToMe) {
        card.setAttribute('title', `👤 Assigned to ${assignee ? assignee.name : 'another user'}. Only they can move this task.`);
      }

      card.innerHTML = `
        <div class="task-header">
          <span class="task-id">${task.isFinalGoal ? '🏁 ' + task.id : task.id}</span>
          ${isFinished ? '<span class="badge-locked" style="background:#10b981; color:#fff;">Done</span>' : (locked ? '<span class="badge-locked">🔒 Blocked</span>' : '<span class="badge-ready">Ready</span>')}
        </div>
        <div class="task-title">${task.title}</div>
        ${task.desc ? `<div class="task-desc">${task.desc}</div>` : ''}
        ${task.dependencies && task.dependencies.length > 0 ? `
          <div class="task-deps-list">
            ${task.dependencies.map(d => `<span class="dep-tag">${task.isFinalGoal ? 'Requires ' + d : 'Blocked by ' + d}</span>`).join('')}
          </div>
        ` : ''}
        <div class="task-footer" style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between;">
          <div class="assignee-badge" style="font-size: 12px; color: #555; display: flex; align-items: center; gap: 4px;">
            ${assignee ? `
              <span class="user-pill" title="Assigned to ${assignee.name}" style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-weight: 500;">
                👤 ${isAssignedToMe ? 'Me' : assignee.name}
              </span>
            ` : `
              <span class="unassigned-pill" style="background: #f3f4f6; color: #6b7280; padding: 2px 6px; border-radius: 4px;">
                Unassigned
              </span>
            `}
          </div>
          ${!task.assigneeId && !locked && !isFinished ? `
            <button class="btn-claim-task" data-id="${task.id}" style="font-size: 11px; padding: 3px 8px; background: #2563eb; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
              ⚡ Claim Task
            </button>
          ` : ''}
        </div>
      `;

      card.addEventListener('dragstart', (e) => {
        if (isFinished) {
          e.preventDefault();
          showAlert(`🔒 Task "${task.title}" is finished and cannot be moved!`);
          return false;
        }

        if (locked) {
          e.preventDefault();
          showAlert(`🔒 Task "${task.title}" is locked by prerequisite dependencies!`);
          return false;
        }

        if (!task.assigneeId) {
          e.preventDefault();
          showAlert(`⚡ You must claim "${task.title}" before moving it!`);
          return false;
        }

        if (!isAssignedToMe) {
          e.preventDefault();
          showAlert(`✋ Only ${assignee ? assignee.name : 'the assigned user'} can move this task!`);
          return false;
        }

        e.dataTransfer.setData('text/plain', task.id);
      });

      if (columns[task.status]) {
        columns[task.status].appendChild(card);
      }
    });

    document.querySelectorAll('.btn-claim-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.id;
        claimTask(taskId);
      });
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

        if (task.status === 'done') {
          showAlert(`🔒 Task "${task.title}" is finished and cannot be moved out of Done!`);
          return;
        }

        if (task.assigneeId !== currentUser.id) {
          showAlert(`✋ You cannot move task "${task.title}" because it is not assigned to you!`);
          return;
        }

        if (isTaskLocked(task, board)) {
          showAlert(`⚠️ Cannot move "${task.title}". Complete all blocker dependencies first!`);
          return;
        }

        // Prompt & Record Completion
        if (targetStatus === 'done' && task.status !== 'done') {
          const confirmFinish = confirm(`Are you sure you want to mark task "${task.title}" as Finished?`);
          if (!confirmFinish) {
            return;
          }
          // Log task completion for leaderboard
          recordTaskCompletion(task, board.id);
        }

        task.status = targetStatus;

        enforceDependencyCascade(board);
        saveState();
        loadCurrentBoard();
      });
    });
  }

  // --- Leaderboard & History Modal Functionality ---
  // --- Leaderboard & History Modal Functionality (Project-Specific) ---
  function renderLeaderboard() {
    const modalLeaderboard = document.getElementById('modal-leaderboard');
    if (!modalLeaderboard) {
      console.error('Leaderboard modal (#modal-leaderboard) is missing from DOM!');
      return;
    }

    const currentBoard = getCurrentBoard();
    if (!currentBoard) return;

    const allUsers = getAllUsers();
    const history = getTaskHistory();

    // 1. Filter completed task counts ONLY for the currently active board/project
    const userCounts = {};
    
    // Initialize count for board members/owner
    const memberIds = currentBoard.members || [currentBoard.ownerId];
    memberIds.forEach(id => { userCounts[id] = 0; });

    (currentBoard.tasks || []).forEach(t => {
      if (t.status === 'done' && t.assigneeId) {
        userCounts[t.assigneeId] = (userCounts[t.assigneeId] || 0) + 1;
      }
    });

    // Ensure current user is tracked
    if (userCounts[currentUser.id] === undefined) {
      userCounts[currentUser.id] = 0;
    }

    // Get list of project user objects
    const projectUsers = allUsers.filter(u => userCounts.hasOwnProperty(u.id));
    
    // Add fallback user object if currentUser isn't in allUsers storage yet
    if (!projectUsers.some(u => u.id === currentUser.id)) {
      projectUsers.push(currentUser);
    }

    // Sort project members by completed tasks for THIS project
    const sortedUsers = [...projectUsers].sort((a, b) => (userCounts[b.id] || 0) - (userCounts[a.id] || 0));

    // Render Project Rankings
    const rankingsContainer = document.getElementById('leaderboard-rankings-container');
    if (rankingsContainer) {
      rankingsContainer.innerHTML = sortedUsers.map((usr, index) => {
        const count = userCounts[usr.id] || 0;
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 18px;">${medal}</span>
              <div>
                <div style="font-weight: 600; font-size: 14px; color: #111827;">
                  ${usr.name || usr.email} ${usr.id === currentUser.id ? '(You)' : ''}
                </div>
                <div style="font-size: 12px; color: #6b7280;">${usr.email || ''}</div>
              </div>
            </div>
            <div style="font-weight: 700; font-size: 15px; color: #2563eb;">
              ${count} task${count === 1 ? '' : 's'}
            </div>
          </div>
        `;
      }).join('');
    }

    // 2. Filter Activity History Log strictly for THIS project
    const activityContainer = document.getElementById('activity-log-container');
    if (activityContainer) {
      const projectHistory = history.filter(log => log.boardId === currentBoard.id);

      if (projectHistory.length === 0) {
        activityContainer.innerHTML = '<div style="font-size: 13px; color: #9ca3af; text-align: center; padding: 12px;">No task completions logged for this project yet.</div>';
      } else {
        activityContainer.innerHTML = projectHistory.slice(0, 10).map(log => `
          <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 6px 4px; border-bottom: 1px solid #e5e7eb;">
            <span><strong>${log.userName}</strong> completed <em>"${log.taskTitle}"</em></span>
            <span style="color: #9ca3af;">${new Date(log.completedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        `).join('');
      }
    }

    // Open Modal
    modalLeaderboard.classList.remove('hidden');
    modalLeaderboard.style.display = 'flex';
  }
  // Helper to safely close leaderboard modal
  function closeLeaderboardModal() {
    const modalLeaderboard = document.getElementById('modal-leaderboard');
    if (modalLeaderboard) {
      modalLeaderboard.classList.add('hidden');
      modalLeaderboard.style.display = 'none';
    }
  }

  // --- Global Event Delegation for Leaderboard & Buttons ---
  document.addEventListener('click', (e) => {
    // Open Leaderboard button click
    const leaderboardBtn = e.target.closest('#btn-view-leaderboard');
    if (leaderboardBtn) {
      e.preventDefault();
      renderLeaderboard();
      return;
    }

    // Close Leaderboard button click (X or Footer Close)
    if (e.target.closest('#close-leaderboard-modal') || e.target.closest('#btn-close-leaderboard')) {
      closeLeaderboardModal();
      return;
    }

    // Close modal when clicking backdrop area
    const modalLeaderboard = document.getElementById('modal-leaderboard');
    if (modalLeaderboard && e.target === modalLeaderboard) {
      closeLeaderboardModal();
    }
  });

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
    if (typeof renderGraphView === 'function') {
      renderGraphView();
    }
  });

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
      assigneeId: currentUser.id,
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
  const assigneeSelect = document.getElementById('task-assignee-select');

  document.getElementById('btn-add-task')?.addEventListener('click', () => {
    const board = getCurrentBoard();
    const allUsers = getAllUsers();

    if (assigneeSelect) {
      assigneeSelect.innerHTML = '<option value="">-- Unassigned --</option>';
      const memberIds = board.members || [board.ownerId];

      memberIds.forEach(mId => {
        const u = allUsers.find(usr => usr.id === mId) || { id: mId, name: mId };
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.name + (u.id === currentUser.id ? ' (You)' : '');
        assigneeSelect.appendChild(opt);
      });
    }

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
    const selectedAssignee = assigneeSelect ? assigneeSelect.value : null;

    const checkedBoxes = document.querySelectorAll('input[name="dep-task"]:checked');
    const selectedDeps = Array.from(checkedBoxes).map(cb => cb.value);

    const newTask = {
      id: `FL-${Math.floor(100 + Math.random() * 900)}`,
      title: titleInput.value.trim(),
      desc: descInput ? descInput.value.trim() : '',
      status: 'todo',
      assigneeId: selectedAssignee || null,
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
    const allUsers = getAllUsers();
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