![Uploading image.png…]()

# ⚡ FlowLock — Dependency-Aware Graph Kanban

<p align="center">
  <b>Plan smarter. Respect dependencies. Unlock work automatically.</b>
</p>

<p align="center">
  FlowLock is a dependency-aware Kanban system that combines traditional task management with graph algorithms to prevent blocked work, detect circular dependencies, and automatically unlock tasks when their prerequisites are completed.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-Frontend-orange?style=for-the-badge&logo=html5" />
  <img src="https://img.shields.io/badge/CSS3-UI-blue?style=for-the-badge&logo=css3" />
  <img src="https://img.shields.io/badge/JavaScript-Vanilla-yellow?style=for-the-badge&logo=javascript" />
  <img src="https://img.shields.io/badge/Graph-DFS-purple?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Storage-LocalStorage-green?style=for-the-badge" />
</p>

---

# 🚀 About FlowLock

Traditional Kanban boards tell you:

> **Where is the task?**

FlowLock goes one step further and asks:

> **Is this task actually ready to move forward?**

In real software projects, tasks are rarely independent.

For example:

```text
Database Schema
      ↓
Authentication API
      ↓
Login Interface
```

The `Login Interface` should not start before the `Authentication API` is ready.

A normal Kanban board may still allow someone to drag that task into **In Progress**.

FlowLock does not.

```text
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│    TO DO     │ → │ IN PROGRESS  │ → │     DONE     │
└──────────────┘   └──────────────┘   └──────────────┘

          🔒 Blocked tasks cannot move forward
```

FlowLock models project work as a **Directed Dependency Graph**, allowing the board to understand relationships between tasks.

---

# 💡 The Problem

Imagine this project:

```text
Database Schema
      │
      ▼
Authentication API
      │
      ▼
Login Interface
```

Suppose:

```text
Database Schema      ✅ Done
Authentication API   ⏳ In Progress
Login Interface      📋 To Do
```

The Login Interface depends on Authentication API.

Therefore FlowLock automatically shows:

```text
FL-103
Login Interface

🔒 LOCKED

Blocked by:
Authentication API
```

The task cannot move forward.

Once Authentication API becomes:

```text
✅ DONE
```

FlowLock automatically changes the dependent task to:

```text
🔓 READY
```

No manual dependency checking is required.

---

# ✨ Core Features

### 📋 Interactive Kanban Board

A familiar three-column workflow:

```text
TO DO → IN PROGRESS → DONE
```

Create, edit, delete and manage tasks directly from the workspace.

### 🖱️ Native Drag & Drop

Tasks can be moved between columns using native browser Drag and Drop functionality without requiring a frontend framework.

### 🔗 Multiple Task Dependencies

One task can depend on multiple prerequisite tasks.

```text
              Database Schema
                    │
                    ▼
User Dashboard ◄ Authentication API
```

For example:

```text
User Dashboard
├── Database Schema
└── Authentication API
```

Both dependencies must be completed before the dashboard task becomes available.

### 🔒 Smart Task Locking

Blocked tasks remain protected until all prerequisites are completed.

```text
Task: User Profile Dashboard

🔒 LOCKED

Waiting for:
• Authentication API
• Database Schema
```

### 🔓 Automatic Unlocking

Complete the final blocker and FlowLock automatically unlocks dependent tasks.

```text
Before

Task A ✅
Task B ⏳
   │
   ▼
Task C 🔒
```

```text
After

Task A ✅
Task B ✅
   │
   ▼
Task C 🔓
```

### 🔄 Circular Dependency Detection

FlowLock prevents impossible dependency structures such as:

```text
A → B
B → C
C → A
```

This would create an infinite dependency loop.

FlowLock detects it before allowing the dependency to be saved.

### 👤 User-Based Projects

Users can create their own workspaces and access projects where they are owners or invited members.

### 🤝 Member Invitations

Project owners can invite other registered users to collaborate on their project.

### 🔎 Search & Filtering

Projects can be searched and filtered based on their current state.

### 📊 Project Metrics

FlowLock calculates information such as:

```text
Total Projects
Total Tasks
Completed Tasks
Blocked Tasks
Completion Rate
```

### 🎬 Interactive Landing Page

The landing page includes:

```text
Animated dependency nodes
Interactive graph simulator
Dynamic task locking demonstration
Graph theory explanation
Smooth scrolling
GSAP animations
User-aware navigation
```

---

# 🕸️ Why Graphs?

FlowLock represents every task as a **node**.

Dependencies are represented as **directed edges**.

```text
Task A ─────────► Task B
```

means:

> Task B depends on Task A.

A larger project may look like:

```text
                 ┌──────────────┐
                 │ Database     │
                 │ Schema       │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │ Auth API     │
                 └──────┬───────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
      ┌──────────────┐    ┌──────────────┐
      │ Login UI     │    │ User Profile │
      └──────────────┘    └──────────────┘
```

This makes FlowLock more than a visual task board.

It becomes a **graph-driven workflow engine**.

---

# 🧠 Algorithms Behind FlowLock

## 1. Directed Acyclic Graph — DAG

FlowLock attempts to maintain project dependencies as a Directed Acyclic Graph.

```text
A → B → C
```

is valid.

But:

```text
A → B → C → A
```

is not valid because it contains a cycle.

---

## 2. DFS Cycle Detection

FlowLock uses the idea of **Depth-First Search** to inspect dependency chains.

Typical DFS states:

```text
0 = Unvisited
1 = Visiting
2 = Completely Processed
```

If DFS reaches another node that is already in the `Visiting` state, the graph contains a cycle.

```text
A
↓
B
↓
C
↓
A  ← cycle detected
```

The invalid dependency can then be rejected.

---

## 3. Dependency Traversal

Suppose Task C depends on Task A and Task B:

```text
Task A ───┐
          │
          ▼
        Task C
          ▲
          │
Task B ───┘
```

FlowLock checks:

```text
Task A == DONE
AND
Task B == DONE
```

Only then:

```text
Task C = UNLOCKED
```

---

## 4. Cascading State Changes

Dependencies may form long chains.

```text
A → B → C → D
```

Completing A may unlock B.

Completing B may unlock C.

Completing C may unlock D.

This creates a workflow where task availability changes dynamically based on the graph.

---

# 🧪 Interactive Dependency Simulator

FlowLock includes an interactive dependency simulator on the landing page.

Consider:

```text
Task A ───┐
          │
          ▼
        Task C
          ▲
          │
Task B ───┘
```

Initially:

```text
Task A → ⏳ IN PROGRESS
Task B → ⏳ IN PROGRESS
Task C → 🔒 LOCKED
```

Complete Task A:

```text
Task A → ✅ COMPLETED
Task B → ⏳ IN PROGRESS
Task C → 🔒 PARTIALLY LOCKED
```

Complete Task B:

```text
Task A → ✅ COMPLETED
Task B → ✅ COMPLETED
Task C → 🔓 UNLOCKED
```

This gives users a quick visual explanation of the same dependency logic used by FlowLock.

---

# 👤 User-Aware Experience

The landing page adapts according to authentication state.

## Guest User

```text
Log In
Sign Up
Get Started Free
```

## Logged In — No Project

```text
Welcome, User 👋

+ Create New Project
My Projects
```

## Logged In — Existing Project

```text
Welcome back, User 👋

Continue Workspace →
My Projects
Sign Out
```

FlowLock remembers the user's most recently used workspace.

---

# 🗂️ Project Management

Each project contains information similar to:

```javascript
{
  id,
  title,
  desc,
  ownerId,
  members,
  tasks,
  createdAt
}
```

A user can access a project if they own it:

```javascript
project.ownerId === currentUser.id
```

or if they are a project member:

```javascript
project.members.includes(currentUser.id)
```

---

# 📊 Project Health

FlowLock calculates project statistics dynamically.

Example:

```text
24 Total Tasks
14 Completed
6 In Progress
4 Blocked
```

Projects can also receive health labels such as:

```text
🟢 ON TRACK

🔴 BLOCKED

✅ COMPLETED
```

---

# 🎨 Design Philosophy

FlowLock intentionally avoids the typical generic dashboard design.

The interface is inspired by:

```text
📌 Pinboards
📝 Sticky Notes
📐 Graph Paper
🕸️ Dependency Diagrams
🪵 Walnut Boards
✏️ Hand-drawn Engineering Notes
```

The aim is to make task relationships visually understandable rather than hiding dependencies inside descriptions and menus.

---

# 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | UI and responsive design |
| Vanilla JavaScript | Core application logic |
| LocalStorage | Browser-side persistence |
| DOM API | Dynamic UI rendering |
| Drag & Drop API | Kanban movement |
| DFS | Cycle detection |
| Graph Data Structures | Dependency modelling |
| GSAP | UI animations |
| ScrollTrigger | Scroll-based animation |
| Lenis | Smooth scrolling |

---

# 📚 JavaScript Concepts Demonstrated

FlowLock is built using core JavaScript concepts including:

```text
Variables
let / const
Functions
Arrow Functions
Arrays
Objects
Array Methods
find()
filter()
forEach()
some()
DOM Manipulation
Event Listeners
Form Handling
Form Validation
Local Storage
JSON
Template Literals
ES6 Features
Drag and Drop
```

---

# 📁 Project Structure

```text
flowlock-kanban/
│
├── index.html
├── auth.html
├── forgot.html
├── projects.html
├── app.html
├── testbed.html
│
├── css/
│   ├── landing.css
│   ├── auth.css
│   ├── projects.css
│   └── app.css
│
├── js/
│   ├── landing.js
│   ├── auth.js
│   ├── forgot.js
│   ├── projects.js
│   ├── app.js
│   └── testbed.js
│
└── README.md
```

---

# 💾 Browser Storage

The current frontend implementation uses browser `localStorage`.

### Registered Users

```text
flowlock_users
```

### Authentication State

```text
flowlock_authenticated
```

### Current User

```text
flowlock_current_user
```

### Projects

```text
flowlock_global_projects
```

### Last Opened Workspace

```text
flowlock_last_project_<USER_ID>
```

This allows FlowLock to remember which workspace the user was previously working on.

---

# 🔄 Application Flow

```text
                  ┌─────────────────┐
                  │   Landing Page  │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Sign Up / Login │
                  └────────┬────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Personalized Landing│
                └─────────┬───────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
        No Existing Project    Existing Project
                │                   │
                ▼                   ▼
         Create Project       Continue Workspace
                │                   │
                └─────────┬─────────┘
                          │
                          ▼
                 ┌────────────────┐
                 │ Kanban Board   │
                 └───────┬────────┘
                         │
                         ▼
                  Create Tasks
                         │
                         ▼
                Add Dependencies
                         │
                         ▼
                 Graph Validation
                         │
                         ▼
                  Smart Locking
                         │
                         ▼
               Complete Blocker
                         │
                         ▼
                  Auto Unlock
```

---

# ⚙️ Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/Gaurish30/flowlock-kanban.git
```

## 2. Enter the project directory

```bash
cd flowlock-kanban
```

## 3. Open the project in VS Code

```bash
code .
```

## 4. Run the application

For the easiest setup, use the **Live Server** extension in VS Code.

Open:

```text
index.html
```

Then:

```text
Right Click → Open with Live Server
```

---

# 🧭 Example Workflow

Imagine we want to build authentication.

First create:

```text
FL-101
Database Schema
```

Then:

```text
FL-102
Authentication API

Depends on:
FL-101
```

Finally:

```text
FL-103
Login Interface

Depends on:
FL-102
```

The graph becomes:

```text
FL-101
Database Schema
     │
     ▼
FL-102
Authentication API
     │
     ▼
FL-103
Login Interface
```

Initially:

```text
Database Schema       → Ready
Authentication API    → 🔒 Locked
Login Interface       → 🔒 Locked
```

Complete the database:

```text
Database Schema       → ✅ Done
Authentication API    → 🔓 Ready
Login Interface       → 🔒 Locked
```

Complete the API:

```text
Database Schema       → ✅ Done
Authentication API    → ✅ Done
Login Interface       → 🔓 Ready
```

This is the core FlowLock workflow.

---

# 🔐 Security Note

The current authentication implementation uses browser storage and is intended for frontend demonstration and evaluation.

It is **not production authentication**.

A production version should use:

```text
Backend Authentication
Database Storage
Password Hashing
Secure Sessions
HTTP-only Cookies
Authorization Middleware
OAuth Providers
```

---

# 🗺️ Roadmap

- [x] Landing Page
- [x] Authentication UI
- [x] User-based Projects
- [x] Project Creation
- [x] Project Search & Filters
- [x] Project Invitations
- [x] Kanban Interface
- [x] Task Dependencies
- [x] Dependency Locking
- [x] Interactive Graph Simulator
- [ ] Backend Authentication
- [ ] Database Integration
- [ ] Real-time Multi-user Collaboration
- [ ] Activity History
- [ ] Advanced Dependency Graph View
- [ ] Critical Path Analysis
- [ ] Team Permissions
- [ ] Notifications
- [ ] Cloud Deployment

---

# 🎯 Project Goal

FlowLock demonstrates how a theoretical Computer Science concept can solve a real software engineering problem.

Instead of learning graphs only as:

```text
Vertices
Edges
DFS
Traversal
Cycle Detection
```

FlowLock applies them to:

```text
Task Management
Workflow Control
Dependency Validation
Task Locking
Automatic Unlocking
Project Collaboration
```

This connects **Data Structures & Algorithms** with practical software development.

---

# 💡 What Makes FlowLock Different?

Traditional project-management systems mainly answer:

> **What is everyone working on?**

FlowLock also answers:

> **Can this task actually start yet?**

That changes the Kanban board from a passive task tracker into a **dependency-aware workflow controller**.

---

# ⚡ FlowLock

```text
PLAN
  ↓
CONNECT
  ↓
LOCK
  ↓
COMPLETE
  ↓
UNLOCK
  ↓
SHIP 🚀
```

<p align="center">
  <b>Work should move forward only when its dependencies are ready.</b>
</p>

<p align="center">
  ⚡ <b>FlowLock — Kanban Powered by Directed Dependency Graphs</b> 🕸️
</p>
