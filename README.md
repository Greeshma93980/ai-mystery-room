# AI Mystery Room

An AI-powered detective game. Players enter a premise, investigate a generated case, uncover clues, request limited hints, accuse a suspect, and see the solution after the accusation is final.

## Features

- Cinematic, responsive React interface with landing, case creation, investigation, and results pages.
- Gemini-generated mysteries with Easy, Medium, and Hard difficulty rules.
- Suspect profiles, progressive clue discovery, limited hints, accusation confirmation, and backend-calculated scoring.
- MongoDB persistence for case state and results.
- Culprit ID, solution, and unused hints remain server-side until the player submits an accusation.
- Structured Gemini JSON output, Zod validation, bounded retries, and safe error reporting.

## Tech stack

- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios, Lucide React
- **Backend:** Node.js 20+, Express, MongoDB Atlas, Mongoose, Google Gemini (`@google/genai`), Zod
- **Hosting configuration:** Render web service for the API and Vercel static hosting for the client

## Project structure

```text
client/                 React/Vite application
  src/components/       Shared UI components
  src/pages/            Landing, create, case, and result pages
  src/services/         Axios API client
server/                 Express API
  controllers/           Request handling and game rules
  middleware/            Error handling
  models/                Mongoose Case model
  routes/                Case API routes
  services/              Gemini generation and game helpers/tests
render.yaml              Render API service Blueprint
vercel.json              Vercel monorepo build and SPA routing config
```

## Local setup

Requirements: Node.js 20 or 22, npm, a reachable MongoDB database, and a Gemini API key.

From the project root, install dependencies:

```powershell
npm ci
```

Create local environment files without overwriting existing ones:

```powershell
if (-not (Test-Path -LiteralPath .\server\.env)) { Copy-Item .\server\.env.example .\server\.env }
if (-not (Test-Path -LiteralPath .\client\.env)) { Copy-Item .\client\.env.example .\client\.env }
```

Set the real values in `server/.env` locally. Do not commit that file. The client example points to the local backend by default.

Run both apps together:

```powershell
npm run dev
```

Or run them in separate PowerShell terminals from the project root:

```powershell
npm run dev --workspace server
```

```powershell
npm run dev --workspace client
```

The frontend is served at http://localhost:5173 and the API at http://localhost:4000. Check API and database readiness at http://localhost:4000/api/health.

### Environment variables

| Variable | File / hosting service | Required | Purpose |
| --- | --- | --- | --- |
| `MONGODB_URI` | `server/.env` / Render | Yes | MongoDB connection string |
| `GEMINI_API_KEY` | `server/.env` / Render | Yes | Gemini API credential; backend only |
| `PORT` | `server/.env` | Local optional | Local API port; defaults to `4000`. Render provides its port automatically. |
| `CLIENT_URL` | `server/.env` / Render | Production yes | Exact frontend origin allowed by API CORS, e.g. `https://your-app.vercel.app` |
| `VITE_API_URL` | `client/.env` / Vercel | Production yes | API base URL including `/api`, e.g. `https://your-api.onrender.com/api` |

`server/.env.example` and `client/.env.example` contain placeholders/default local values only. `VITE_API_URL` is embedded in the frontend at build time, so set it in Vercel before building or redeploy after changing it. Never put `GEMINI_API_KEY` or `MONGODB_URI` in a `VITE_` variable.

## Game rules

| Difficulty | Suspects | Clues | Hints | Base score |
| --- | ---: | ---: | ---: | ---: |
| Easy | 3 | 5 | 2 | 100 |
| Medium | 4 | 7 | 3 | 150 |
| Hard | 5 | 9 | 3 | 200 |

Each newly discovered clue adds 5 points. Each hint costs 10 points. Correct accusations score base points plus clue points minus hint costs, floored at zero. Incorrect accusations score zero. Accusations are final.

## API routes

- `GET /api/health`
- `POST /api/cases`
- `GET /api/cases/:id`
- `POST /api/cases/:id/clues/:clueId/discover`
- `POST /api/cases/:id/hints`
- `POST /api/cases/:id/accuse`
- `GET /api/cases/:id/result`

## Tests and build

Run backend tests:

```powershell
npm test --workspace server
```

Build the frontend for production:

```powershell
npm run build
```

## Deployment

Deployment is not automatic from this repository. Review the environment settings and deploy from the Render and Vercel dashboards when ready.

### Render API

1. Connect the GitHub repository to Render and create a Blueprint from the root `render.yaml`.
2. Provide `MONGODB_URI`, `GEMINI_API_KEY`, and `CLIENT_URL` as service environment values. Do not add the secrets to `render.yaml` or Git. If the Vercel domain is not available yet, temporarily set `CLIENT_URL` to `http://localhost:5173`.
3. Once known, set `CLIENT_URL` to the exact production Vercel origin, without a path or trailing slash. Render checks `/api/health` for service health.
4. After the service is created, copy its HTTPS URL. The API base URL is that URL followed by `/api`.

If the frontend’s production domain is not known during initial API setup, use the temporary localhost origin above, then update `CLIENT_URL` after creating the Vercel project and restart/redeploy the Render service. Only the configured origin and the two localhost development origins are allowed by CORS.

### Vercel frontend

1. Import the same repository into Vercel and keep the **Project Root Directory** at the repository root. The root `vercel.json` builds the `client` workspace and publishes `client/dist`.
2. Add `VITE_API_URL` to the Vercel project’s Production environment, using the Render HTTPS API URL plus `/api`.
3. Deploy the frontend and note its exact production origin, such as `https://your-app.vercel.app`.
4. Set that origin as Render’s `CLIENT_URL`, then restart/redeploy the API service.
5. Verify `https://your-api.onrender.com/api/health`, then open the Vercel site and generate a case.

For Vercel Preview deployments, configure a matching API CORS origin or use a separate preview API configuration. The current backend intentionally does not allow arbitrary origins.

## GitHub preparation

The root `.gitignore` excludes `.env` files, local Salesforce CLI state, dependency folders, build output, and common private key files. `.env.example` files remain trackable. Before the first commit, review `git status --short` and confirm no real `.env` file is staged.
