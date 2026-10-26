# FlowLock Kanban — MVC + Express REST API + MongoDB Atlas

## Project structure

- `frontend/`: existing HTML, CSS, and browser JavaScript UI.
- `backend/models/`: Mongoose User and Task schemas.
- `backend/controllers/`: request/business logic for authentication and tasks.
- `backend/routes/`: Express route definitions.
- `backend/server.js`: middleware, route mounting, static frontend serving, and MongoDB startup.
- `server.js`: root entry point used by `npm start` and deployment platforms.

## Run locally

1. Install Node.js LTS.
2. Copy `.env.example` to `.env`.
3. Put your real MongoDB Atlas connection string in `.env` as `MONGODB_URI`. Include the database name `flowlock`; URL-encode special characters in the password.
4. In Atlas, create a database user and allow your current IP in Network Access. Do not commit or share `.env`.
5. Run `npm install`, then `npm start`.
6. Open `http://localhost:3000` and test `GET http://localhost:3000/api/health`.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API and database status |
| POST | `/api/auth/register` | Register user; password is bcrypt-hashed |
| POST | `/api/auth/login` | Verify user credentials |
| GET | `/api/tasks` | List tasks; optional `?status=todo` |
| GET | `/api/tasks/:id` | Get one task |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |

For task requests, use JSON body, e.g. `{"title":"Demo task","description":"CRUD test","status":"todo","priority":"high"}`. Valid statuses: `todo`, `in-progress`, `done`; priorities: `low`, `medium`, `high`. Import `FlowLock-REST-API.postman_collection.json` into Postman, or use Thunder Client.

## Deploy backend (Render example)

1. Push this project to the same GitHub repository your team already uses.
2. In Render, create a **Web Service** from that repository. Use build command `npm install` and start command `npm start` (the included `render.yaml` describes these settings).
3. Add environment variable `MONGODB_URI` in Render using your Atlas connection string. Do not put credentials in source code.
4. In Atlas Network Access, configure access for the deployment environment according to your security requirements. Avoid leaving broad IP access enabled longer than necessary.
5. Deploy, then test `https://YOUR-DEPLOYED-SERVICE.onrender.com/api/health` and all CRUD routes using Thunder Client. Replace `YOUR-DEPLOYED-SERVICE` with the actual host assigned by Render.
6. If the frontend is hosted with this same service, it is served by the Express backend. If you host frontend separately, update its API base URL to your deployed backend and configure CORS appropriately.

## Important scope notes before evaluation

- Registration/login and the task REST endpoints use MongoDB Atlas through Mongoose.
- The existing Kanban board/project interactions in `frontend/js/app.js` and `frontend/js/projects.js` still use browser `localStorage`; they have **not** been migrated to the task API. The APIs can be demonstrated independently in Thunder Client, but to meet a strict requirement that every board task persists in MongoDB, frontend task/project operations must also be migrated and tested.
- The current login API verifies credentials but does not issue a session/JWT, and task routes are not protected or scoped per user. This is a classroom API scaffold, not production-ready multi-user security. Add authentication/authorization before real public use.
- Keep `.env` out of Git. If a database password has ever been exposed, rotate it in Atlas.
