// ============================================================
// dependency_graph.js
// Standalone FlowLock Dependency Graph with Popover Details
// ============================================================

(function () {
  const GLOBAL_PROJECTS_KEY = 'flowlock_global_projects';

  function graphGetCurrentBoard() {
    const projects = JSON.parse(
      localStorage.getItem(GLOBAL_PROJECTS_KEY) || '[]'
    );

    if (!Array.isArray(projects) || projects.length === 0) return null;

    const selector = document.getElementById('board-selector');
    const selectedId = selector ? selector.value : null;

    const urlParams = new URLSearchParams(window.location.search);
    const urlBoardId = urlParams.get('board');

    const boardId = selectedId || urlBoardId;

    if (boardId) {
      return projects.find(b => b.id === boardId) || projects[0];
    }

    return projects[0];
  }

  function graphIsTaskLocked(task, board) {
    if (!task || !board) return false;

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

  // --- Popover Side-Center Positioning Logic ---
  function openNodePopover(task, board, nodePos, nodeElement, cardWidth, cardHeight) {
    const popover = document.getElementById('graph-node-popover');
    const container = document.getElementById('graph-canvas-container');
    if (!popover || !container) return;

    document.querySelectorAll('.graph-node.active-node').forEach(el => el.classList.remove('active-node'));
    if (nodeElement) nodeElement.classList.add('active-node');

    const isLocked = graphIsTaskLocked(task, board);
    const allUsers = JSON.parse(localStorage.getItem('flowlock_all_users') || '[]');
    const assignee = allUsers.find(u => u.id === task.assigneeId);

    document.getElementById('popover-task-id').textContent = task.id || 'N/A';
    document.getElementById('popover-task-title').textContent = task.title || 'Untitled Task';
    
    const statusEl = document.getElementById('popover-task-status');
    if (isLocked) {
      statusEl.textContent = '🔒 BLOCKED';
      statusEl.className = 'popover-status-pill locked';
    } else {
      statusEl.textContent = (task.status || 'TODO').toUpperCase();
      statusEl.className = `popover-status-pill ${task.status === 'done' ? 'done' : ''}`;
    }

    document.getElementById('popover-task-assignee').textContent = assignee 
      ? (assignee.name || assignee.email) 
      : 'Unassigned';

    const depsContainer = document.getElementById('popover-task-deps');
    const deps = task.dependencies || [];
    if (deps.length === 0) {
      depsContainer.innerHTML = '<span style="color:#64748b; font-size:0.75rem;">None</span>';
    } else {
      depsContainer.innerHTML = deps.map(depId => {
        const depTask = (board.tasks || []).find(t => t.id === depId);
        const isDepDone = depTask && depTask.status === 'done';
        return `<span class="popover-dep-badge" style="border-left: 3px solid ${isDepDone ? '#22c55e' : '#f59e0b'};">${depId} ${isDepDone ? '✓' : '⏳'}</span>`;
      }).join('');
    }

    const lockInfoEl = document.getElementById('popover-task-lock-reason');
    if (task.isFinalGoal) {
      lockInfoEl.textContent = isLocked 
        ? 'Locked until all precursor project tasks reach Done status.' 
        : '🎉 All dependencies resolved! Final Goal ready.';
    } else if (isLocked) {
      const unresolved = deps.filter(dId => {
        const depTask = (board.tasks || []).find(t => t.id === dId);
        return !depTask || depTask.status !== 'done';
      });
      lockInfoEl.textContent = `Blocked by: ${unresolved.join(', ')}`;
    } else {
      lockInfoEl.textContent = 'Task is unlocked and ready.';
    }

    popover.classList.remove('hidden');

    const popoverWidth = 290;
    const gap = 16;

    const topCenterY = nodePos.posY + (cardHeight / 2);

    let leftPos = nodePos.posX + cardWidth + gap;
    popover.classList.remove('popover-left');

    const maxScrollWidth = container.scrollWidth || 2000;
    if (leftPos + popoverWidth > maxScrollWidth - 20) {
      leftPos = nodePos.posX - popoverWidth - gap;
      popover.classList.add('popover-left');
    }

    popover.style.left = `${leftPos}px`;
    popover.style.top = `${topCenterY}px`;
  }

  function closePopover() {
    const popover = document.getElementById('graph-node-popover');
    if (popover) popover.classList.add('hidden');
    document.querySelectorAll('.graph-node.active-node').forEach(el => el.classList.remove('active-node'));
  }

  function renderGraphView() {
    const board = graphGetCurrentBoard();
    const nodesLayer = document.getElementById('graph-nodes-layer');
    const svg = document.getElementById('dependency-svg');
    if (!nodesLayer || !svg) return;

    closePopover();
    nodesLayer.innerHTML = '';

    svg.innerHTML = `
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1"/>
        </marker>
        <marker id="arrow-locked" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b"/>
        </marker>
        <marker id="arrow-goal" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6"/>
        </marker>
      </defs>
    `;

    if (!board || !board.tasks || board.tasks.length === 0) return;

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
    const levelSpacingY = 180;
    const nodeSpacingX = 270;

    const nodePositions = {};
    const outgoingPorts = {};
    const incomingPorts = {};

    const hasIsolated = isolatedTasks.length > 0;
    const dagStartX = hasIsolated ? 340 : 60;

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

        node.addEventListener('click', (e) => {
          e.stopPropagation();
          openNodePopover(task, board, { posX, posY }, node, cardWidth, cardHeight);
        });

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

          const locked = graphIsTaskLocked(task, board);
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

          node.addEventListener('click', (e) => {
            e.stopPropagation();
            openNodePopover(task, board, { posX, posY }, node, cardWidth, cardHeight);
          });

          nodesLayer.appendChild(node);
        });
      });

      // Render Dynamic Connectors (Orthogonal Straight Lines)
      const edges = [];
      dagTasks.forEach(task => {
        const reducedDeps = directDependencies[task.id] || [];
        reducedDeps.forEach(parentId => {
          if (nodePositions[parentId] && nodePositions[task.id]) {
            const edge = {
              parentId,
              childId: task.id,
              isLocked: graphIsTaskLocked(task, board),
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
        const parentLocked = parentTask ? graphIsTaskLocked(parentTask, board) : false;

        const isBlocked = !parentDone || parentLocked || edge.isLocked;

        const parentPos = nodePositions[edge.parentId];
        const childPos = nodePositions[edge.childId];

        const outIndex = outgoingPorts[edge.parentId].indexOf(edge);
        const outTotal = outgoingPorts[edge.parentId].length;
        const inIndex = incomingPorts[edge.childId].indexOf(edge);
        const inTotal = incomingPorts[edge.childId].length;

        const padX = 20;
        const availableWidth = cardWidth - (padX * 2);

        const outX = parentPos.posX + (outTotal === 1 ? cardWidth / 2 : padX + (availableWidth / (outTotal - 1)) * outIndex);
        const outY = parentPos.posY + cardHeight;

        const inX = childPos.posX + (inTotal === 1 ? cardWidth / 2 : padX + (availableWidth / (inTotal - 1)) * inIndex);
        const inY = childPos.posY;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Straight line path routing logic
        if (Math.abs(outX - inX) < 1) {
          // Pure vertical straight line
          path.setAttribute('d', `M ${outX} ${outY} L ${inX} ${inY}`);
        } else {
          // Orthogonal step-line (vertical -> horizontal -> vertical)
          const midY = outY + (inY - outY) / 2;
          path.setAttribute('d', `M ${outX} ${outY} L ${outX} ${midY} L ${inX} ${midY} L ${inX} ${inY}`);
        }

        let strokeColor = '#6366f1';
        let markerUrl = 'url(#arrow)';
        let isDashed = false;

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

    const maxGraphX = Math.max(containerWidth, maxX + cardWidth + 320);
    const maxGraphY = Math.max(containerHeight, maxY + cardHeight + 100);

    svg.setAttribute('width', `${maxGraphX}px`);
    svg.setAttribute('height', `${maxGraphY}px`);
    nodesLayer.style.width = `${maxGraphX}px`;
    nodesLayer.style.height = `${maxGraphY}px`;
  }

  // Event Handlers to Dismiss Popover
  document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-graph-popover');
    if (closeBtn) closeBtn.addEventListener('click', closePopover);

    document.addEventListener('click', (e) => {
      const popover = document.getElementById('graph-node-popover');
      if (popover && !popover.contains(e.target) && !e.target.closest('.graph-node')) {
        closePopover();
      }
    });
  });

  window.renderGraphView = renderGraphView;
})();