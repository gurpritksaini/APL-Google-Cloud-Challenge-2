# Grasp — Build Tasks

## Backend

### Phase 1 — Scaffolding
- [x] Create `backend/` directory and Python virtual environment
- [x] Create `requirements.txt` with pinned dependencies (fastapi, uvicorn, google-generativeai, chromadb, python-dotenv, pydantic, httpx)
- [x] Create `backend/main.py` — FastAPI app + CORS middleware (allow `localhost:5173`)
- [x] Create `backend/.env.example` with `GEMINI_API_KEY=` placeholder
- [x] Create empty `backend/routers/`, `backend/services/`, `backend/prompts/`, `backend/models/` directories with `__init__.py` files

### Phase 3 — Pydantic Schemas
- [x] Create `backend/models/schemas.py` — `ChatRequest`, `ChatResponse`, `SessionMeta`, `StartSessionRequest`, `MemoryContext`

### Phase 4 — ChromaDB Service
- [x] Create `backend/services/chroma_service.py` — persistent client, three collections (`sessions`, `conversation_turns`, `concepts_mastered`), `store_turn()`, `store_concept()`, `get_prior_context()`

### Phase 5 — Gemini Service
- [x] Create `backend/services/gemini_service.py` — `get_gemini_response()` wrapper using `gemini-2.0-flash`, history format conversion (Claude → Gemini roles)

### Phase 6 — Memory Service + System Prompt
- [x] Create `backend/services/memory_service.py` — `build_memory_context()` that queries ChromaDB and returns injected context string
- [x] Create `backend/prompts/tutor_prompt.py` — Socratic system prompt builder with memory injection and `---GRASP_META---` JSON block format

### Phase 7 — Routes
- [x] Create `backend/routers/health.py` — `GET /api/health` returning `{ status, api_key_configured }`
- [x] Create `backend/routers/sessions.py` — `POST /api/sessions`, `GET /api/sessions/{id}`
- [x] Create `backend/routers/chat.py` — `POST /api/chat`: retrieve memory → build prompt → call Gemini → parse meta → store in ChromaDB → return `ChatResponse`
- [x] Wire all routers into `backend/main.py`

---

## Frontend

### Phase 2 — Scaffolding
- [x] `npm create vite@latest frontend -- --template react`
- [x] Install Tailwind CSS (`tailwindcss`, `@tailwindcss/vite`)
- [x] Configure `vite.config.js` — proxy `/api` → `http://localhost:8000`
- [x] Create `frontend/src/index.css` with CSS custom properties for light + dark theming (all `--bg-*`, `--text-*`, `--accent`, `--border`, `--mastery-*` variables)
- [x] Strip Vite boilerplate from `App.jsx` and `main.jsx`

### Phase 8 — API Client & Utils
- [x] Create `frontend/src/utils/api.js` — `startSession()`, `sendMessage()`, `checkHealth()` with `X-API-Key` header
- [x] Create `frontend/src/utils/parseMetadata.js` — strips `---GRASP_META---` block, returns `{ cleanText, meta }`

### Phase 9 — Hooks
- [x] Create `frontend/src/hooks/useTheme.js` — light/dark toggle persisted to `localStorage`
- [x] Create `frontend/src/hooks/useLearningSession.js` — all session state (`messages`, `sessionMeta`, `sessionId`, `isLoading`), `selectTopic()`, `sendMessage()`, `resetSession()`

### Phase 10 — Setup Screen
- [x] Create `frontend/src/components/SetupScreen.jsx` — API key input (password toggle), "Start Learning" button, link to Google AI Studio

### Phase 11 — Remaining Components
- [x] Create `frontend/src/components/TopicSelection.jsx` — 8 preset topic cards + custom topic input
- [x] Create `frontend/src/components/MessageBubble.jsx` — user + AI message styling
- [x] Create `frontend/src/components/ChatInput.jsx` — textarea + send button, Enter key support
- [x] Create `frontend/src/components/ChatArea.jsx` — scrollable message list using `MessageBubble`
- [x] Create `frontend/src/components/ProgressPanel.jsx` — collapsible panel: mastery bar, difficulty, strategy, concept tags
- [x] Create `frontend/src/components/ChatHeader.jsx` — topic, concept count, strategy badge, progress toggle
- [x] Create `frontend/src/components/ChatSession.jsx` — composes Header + ProgressPanel + ChatArea + ChatInput
- [x] Wire `frontend/src/App.jsx` — 3-screen router (`setup` | `home` | `chat`), health check on mount, `apiKey` state from `localStorage`

---

## Phase 13 — Error Handling
- [x] Backend: return 401 on invalid API key, 502 on Gemini failure, fallback on malformed metadata
- [x] Frontend: show inline error on SetupScreen for 401, retry toast for 502, trim history to last 20 turns

---

## Phase 14 — Polish
- [x] Loading skeleton for initial AI message (typing dots animation in ChatArea)
- [x] Smooth CSS transitions on progress panel open/close
- [x] Mastery level upgrade animation (pulse via `masteryPulse` keyframe in index.css)
- [x] Keyboard accessibility — focus management, ARIA labels
- [x] Mobile responsive layout (stack header items vertically via `sm:` breakpoints)
- [x] Add `chroma_db/` and `.env` to `.gitignore`
- [ ] Write `README.md` with full setup instructions (backend + frontend)
- [x] Backend startup log: "ChromaDB initialized at ./chroma_db"
