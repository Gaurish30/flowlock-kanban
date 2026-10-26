document.addEventListener("DOMContentLoaded", () => {

  // Simple demo state
  const state = {
    db: false,
    auth: false,
    api: false,
    checkout: false
  };


  // Task click
  window.toggleTask = function (task) {

    // Payment API locked until DB + Auth complete
    if (task === "api" && (!state.db || !state.auth)) {
      addLog("🔒 Payment API is locked. Complete Database Schema and Auth Endpoints first.");
      return;
    }

    // Checkout locked until Payment API complete
    if (task === "checkout" && !state.api) {
      addLog("🔒 Checkout UI is locked. Complete Payment API first.");
      return;
    }


    // Toggle task
    state[task] = !state[task];


    // If prerequisite reopened, dependent tasks reset
    if ((!state.db || !state.auth)) {
      state.api = false;
      state.checkout = false;
    }

    if (!state.api) {
      state.checkout = false;
    }


    addLog(
      state[task]
        ? `✅ ${getTaskName(task)} completed.`
        : `↩️ ${getTaskName(task)} reopened.`
    );


    render();
  };


  // Update UI
  function render() {

    updateNode("db", false);

    updateNode("auth", false);

    const apiLocked =
      !state.db || !state.auth;

    updateNode("api", apiLocked);


    const checkoutLocked =
      !state.api;

    updateNode("checkout", checkoutLocked);


    updateProgress();
  }


  // Update single sticky note
  function updateNode(task, locked) {

    const node =
      document.getElementById(`node-${task}`);

    const tag =
      document.getElementById(`tag-${task}`);

    if (!node || !tag) return;


    node.classList.remove(
      "is-done",
      "is-locked"
    );


    // Completed
    if (state[task]) {

      node.classList.add("is-done");

      tag.textContent = "✓ COMPLETED";

      return;
    }


    // Locked
    if (locked) {

      node.classList.add("is-locked");

      tag.textContent = "🔒 LOCKED";

      return;
    }


    // Available
    tag.textContent = "⏳ IN PROGRESS";
  }


  // Progress bar
  function updateProgress() {

    const completed =
      Object.values(state)
        .filter(Boolean)
        .length;

    const total = 4;

    const percentage =
      (completed / total) * 100;


    document.getElementById("simProgress")
      .style.width = `${percentage}%`;

    document.getElementById("simProgressText")
      .textContent =
        `${completed} / ${total} Tasks Completed`;
  }


  // Activity log
  function addLog(message) {

    const log =
      document.getElementById("activityLog");

    const li =
      document.createElement("li");

    li.textContent = message;

    log.prepend(li);
  }


  function getTaskName(task) {

    const names = {
      db: "Database Schema",
      auth: "Auth Endpoints",
      api: "Payment API Gateway",
      checkout: "Checkout UI Flow"
    };

    return names[task];
  }


  // Reset button
  window.resetSimulator = function () {

    state.db = false;
    state.auth = false;
    state.api = false;
    state.checkout = false;


    document.getElementById("activityLog").innerHTML = `
      <li>
        📌 Simulation reset. Complete FL-101 and FL-102 to unlock Payment API.
      </li>
    `;


    render();
  };


  // Initial render
  render();

});