# Grasp — Implementation Plan

## Overview

Full-stack application: React frontend (Vite) + Python FastAPI backend. The backend proxies all AI calls to Gemini and owns the ChromaDB memory layer. The frontend never holds the Gemini API key at rest — it is entered once on the Setup screen and sent as a request header; the backend uses it per-request.

---

## Project Structure

```
grasp-learning-assistant/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                        # Root: screen router + global state
│       ├── index.css                      # CSS custom properties (light + dark)
│       ├── components/
│       │   ├── SetupScreen.jsx            # Screen 0 — API key onboarding
│       │   ├── TopicSelection.jsx         # Screen 1 — topic grid + custom input
│       │   ├── ChatSession.jsx            # Screen 2 — full chat layout
│       │   ├── ChatHeader.jsx             # Topic, concept count, strategy badge, toggle
│       │   ├── ProgressPanel.jsx          # Collapsible: mastery bar, difficulty, tags
│       │   ├── ChatArea.jsx               # Scrollable message list
│       │   ├── MessageBubble.jsx          # Individual AI / user message
│       │   └── ChatInput.jsx              # Textarea + send button
│       ├── hooks/
│       │   ├── useLearningSession.js      # Session state + backend API calls
│       │   └── useTheme.js                # Light/dark toggle + localStorage
│       └── utils/
│           ├── api.js                     # Backend HTTP client (replaces claudeApi)
│           └── parseMetadata.js           # Strips JSON block, returns {cleanText, meta}
└── backend/
    ├── main.py                            # FastAPI app, CORS config
    ├── requirements.txt
    ├── .env.example                       # GEMINI_API_KEY placeholder
    ├── chroma_db/                         # Auto-created by ChromaDB on first run
    ├── routers/
    │   ├── chat.py                        # POST /api/chat
    │   ├── sessions.py                    # POST /api/sessions, GET /api/sessions/{id}
    │   └── health.py                      # GET /api/health (checks API key presence)
    ├── services/
    │   ├── gemini_service.py              # google-generativeai wrapper
    │   ├── chroma_service.py              # ChromaDB read/write operations
    │   └── memory_service.py             # Context retrieval + prompt injection
    ├── prompts/
    │   └── tutor_prompt.py               # System prompt builder (Socratic rules + JSON format)
    └── models/
        └── schemas.py                     # Pydantic models for all request/response shapes
```

---

## Phase 1 — Backend Scaffolding

**Tasks:**
1. Create `backend/` directory, set up Python virtual environment
2. Install dependencies (see `requirements.txt` below)
3. Create `main.py` with FastAPI app + CORS middleware (allow `localhost:5173`)
4. Add `.env.example` with `GEMINI_API_KEY=` placeholder

**`requirements.txt`:**
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
google-generativeai==0.8.3
chromadb==0.5.20
python-dotenv==1.0.1
pydantic==2.9.0
httpx==0.27.0
```

**CORS Config:**
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Phase 2 — Frontend Scaffolding

**Tasks:**
1. `npm create vite@latest frontend -- --template react`
2. Install Tailwind CSS (`tailwindcss`, `@tailwindcss/vite`)
3. Configure `vite.config.js` — add proxy: `/api → http://localhost:8000`
4. Set up `index.css` with CSS custom properties for theming
5. Strip Vite boilerplate from `App.jsx` and `main.jsx`

**CSS Variables (light + dark):**
```css
:root {
  --bg-primary, --bg-secondary, --bg-surface
  --text-primary, --text-secondary, --text-muted
  --accent, --accent-hover
  --border, --shadow
  --user-bubble-bg, --ai-bubble-bg
  --mastery-none, --mastery-emerging, --mastery-developing, --mastery-solid
}
[data-theme="dark"] { /* override each variable */ }
```

---

## Phase 3 — Pydantic Schemas

**File:** `backend/models/schemas.py`

```python
class ChatRequest(BaseModel):
    session_id: str
    topic: str
    message: str
    history: list[dict]          # [{role, content}] — last 20 turns max

class ChatResponse(BaseModel):
    reply: str                   # clean text, metadata stripped
    meta: SessionMeta
    session_id: str

class SessionMeta(BaseModel):
    concepts_taught: list[str]
    current_concept: str
    mastery_signals: Literal["none", "emerging", "developing", "solid"]
    difficulty_level: Literal["beginner", "intermediate", "advanced"]
    teaching_strategy: Literal["socratic", "analogies", "worked_examples",
                                "direct_explanation", "review"]

class StartSessionRequest(BaseModel):
    topic: str

class MemoryContext(BaseModel):
    prior_concepts: list[str]    # concepts mastered in previous sessions
    prior_difficulty: str        # last known difficulty level
    session_count: int           # how many times this topic was studied
```

---

## Phase 4 — ChromaDB Service

**File:** `backend/services/chroma_service.py`

ChromaDB runs in **persistent embedded mode** — no separate server needed.

```python
import chromadb
client = chromadb.PersistentClient(path="./chroma_db")
```

**Three collections:**

```python
# 1. sessions — one doc per session
sessions_col = client.get_or_create_collection("sessions")
# doc: "{topic} session started {date}"
# metadata: {topic, started_at, total_concepts, final_difficulty, user_id}

# 2. conversation_turns — one doc per message turn
turns_col = client.get_or_create_collection("conversation_turns")
# doc: "{role}: {message content}"
# metadata: {session_id, role, timestamp, mastery_signals, teaching_strategy}

# 3. concepts_mastered — one doc per mastered concept
concepts_col = client.get_or_create_collection("concepts_mastered")
# doc: "{concept} in {topic}"
# metadata: {session_id, topic, mastery_level, strategy_that_worked, mastered_at}
```

**Key operations:**
```python
def store_turn(session_id, role, content, meta): ...
def store_concept(session_id, topic, concept, mastery_level, strategy): ...
def get_prior_context(topic) -> MemoryContext: ...
    # query concepts_mastered WHERE topic == topic
    # return list of prior concepts + last difficulty
```

---

## Phase 5 — Gemini Service

**File:** `backend/services/gemini_service.py`

```python
import google.generativeai as genai

def get_gemini_response(api_key: str, system_prompt: str,
                        history: list[dict], user_message: str) -> str:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=system_prompt,
    )
    # Convert history: Claude format {role, content} → Gemini {role, parts}
    # Note: Gemini uses "model" not "assistant" for AI turns
    gemini_history = [
        {"role": "user" if m["role"] == "user" else "model",
         "parts": [m["content"]]}
        for m in history
    ]
    chat = model.start_chat(history=gemini_history)
    response = chat.send_message(user_message)
    return response.text
```

**Model:** `gemini-2.0-flash`
**Max output tokens:** `1024` (short, conversational responses)

---

## Phase 6 — Memory Service + System Prompt

**File:** `backend/services/memory_service.py`

```python
def build_memory_context(topic: str) -> str:
    context = chroma_service.get_prior_context(topic)
    if not context.prior_concepts:
        return ""
    return f"""
PRIOR LEARNING CONTEXT (from ChromaDB memory):
- The learner has previously studied this topic {context.session_count} time(s).
- Concepts already mastered: {', '.join(context.prior_concepts)}
- Last known difficulty: {context.prior_difficulty}
Build on this foundation. Do not re-teach mastered concepts from scratch.
"""
```

**File:** `backend/prompts/tutor_prompt.py`

The system prompt instructs Gemini to:
1. **Role** — Act as a Socratic tutor for `{topic}`. Never lecture. Ask guiding questions.
2. **Teaching strategies** — Use the 5 strategies. Default = Socratic.
3. **Comprehension detection** — Assess each user response. Map to: none / emerging / developing / solid.
4. **Mastery gates** — Do not advance until mastery_signals reaches "solid".
5. **Difficulty** — Start at beginner (or last known level from memory). Scale accordingly.
6. **Response length** — 3–5 sentences max per turn.
7. **Memory context** — Injected block from `memory_service.build_memory_context()`
8. **JSON metadata block** — Every response MUST end with:

```
---GRASP_META---
{
  "concepts_taught": ["..."],
  "current_concept": "...",
  "mastery_signals": "none|emerging|developing|solid",
  "difficulty_level": "beginner|intermediate|advanced",
  "teaching_strategy": "socratic|analogies|worked_examples|direct_explanation|review"
}
---END_META---
```

---

## Phase 7 — Backend Routes

### `routers/health.py`
```
GET /api/health
Response: { "status": "ok", "api_key_configured": bool }
```
Frontend calls this on load to decide whether to show SetupScreen.

### `routers/chat.py`
```
POST /api/chat
Header: X-API-Key: <gemini_key>
Body: ChatRequest
Steps:
  1. Retrieve memory context for topic (ChromaDB)
  2. Build system prompt with memory context injected
  3. Call gemini_service.get_gemini_response()
  4. Parse ---GRASP_META--- block from response
  5. Store turn in ChromaDB (conversation_turns)
  6. If mastery_signals == "solid", store concept (concepts_mastered)
  7. Return ChatResponse (clean text + parsed meta)
```

### `routers/sessions.py`
```
POST /api/sessions        — create session record in ChromaDB
GET  /api/sessions/{id}   — retrieve session history for display
```

---

## Phase 8 — Frontend: API Client

**File:** `frontend/src/utils/api.js`

```js
const BASE = '/api';  // proxied to localhost:8000 via vite.config.js

export async function startSession(topic, apiKey) { ... }
export async function sendMessage(sessionId, topic, message, history, apiKey) { ... }
export async function checkHealth() { ... }

// API key is read from localStorage and sent in X-API-Key header
function getHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  };
}
```

**File:** `frontend/src/utils/parseMetadata.js` — unchanged from original design.

---

## Phase 9 — Frontend State Architecture

All session state lives in `useLearningSession.js`. App-level state in `App.jsx`.

```js
// App.jsx
const [screen, setScreen] = useState('setup' | 'home' | 'chat');
const [apiKey, setApiKey] = useState(() => localStorage.getItem('grasp_api_key') || '');

// Startup logic:
useEffect(() => {
  checkHealth().then(({ api_key_configured }) => {
    if (!apiKey && !api_key_configured) setScreen('setup');
    else setScreen('home');
  });
}, []);

// useLearningSession.js
const [messages, setMessages]       = useState([]);
const [sessionMeta, setSessionMeta] = useState({ ... });
const [sessionId, setSessionId]     = useState(null);
const [progressOpen, setProgressOpen] = useState(false);
const [isLoading, setIsLoading]     = useState(false);
const messagesEndRef = useRef(null);

// State transitions:
// selectTopic(topic) → POST /api/sessions → setSessionId → fire opening message
// sendMessage(text)  → POST /api/chat    → parse meta → store in ChromaDB (backend)
// resetSession()     → clear state → setScreen('home')
// saveApiKey(key)    → localStorage.setItem → setApiKey → setScreen('home')
```

---

## Phase 10 — SetupScreen Component

**File:** `frontend/src/components/SetupScreen.jsx`

- Shown only when: no `grasp_api_key` in localStorage AND backend health check returns `api_key_configured: false`
- Layout:
  - App logo + title
  - Explanation of what Gemini API key is needed for
  - Link to Google AI Studio (free key)
  - Input field for API key (password type, toggle visibility)
  - "Start Learning" button — validates key is non-empty, saves to localStorage, transitions to home

---

## Phase 11 — Remaining UI Components

Same design as original plan. All components unchanged except:

- **`App.jsx`** — 3-screen router (`setup` | `home` | `chat`), passes `apiKey` to `useLearningSession`
- **`useLearningSession.js`** — calls `api.js` instead of `claudeApi.js`; metadata now returned by backend (already parsed)
- **`TopicSelection.jsx`** — unchanged
- **`ChatSession.jsx`**, **`ChatHeader.jsx`**, **`ProgressPanel.jsx`**, **`ChatArea.jsx`**, **`MessageBubble.jsx`**, **`ChatInput.jsx`** — unchanged from original design

---

## Phase 12 — Build Sequence (recommended order)

| Step | File | Layer | Dependency |
|---|---|---|---|
| 1 | `backend/models/schemas.py` | Backend | None |
| 2 | `backend/services/chroma_service.py` | Backend | None |
| 3 | `backend/services/gemini_service.py` | Backend | None |
| 4 | `backend/prompts/tutor_prompt.py` | Backend | None |
| 5 | `backend/services/memory_service.py` | Backend | Steps 2, 4 |
| 6 | `backend/routers/health.py` | Backend | None |
| 7 | `backend/routers/sessions.py` | Backend | Step 2 |
| 8 | `backend/routers/chat.py` | Backend | Steps 2–5 |
| 9 | `backend/main.py` | Backend | Steps 6–8 |
| 10 | `frontend/src/index.css` | Frontend | None |
| 11 | `frontend/src/utils/api.js` | Frontend | None |
| 12 | `frontend/src/utils/parseMetadata.js` | Frontend | None |
| 13 | `frontend/src/hooks/useTheme.js` | Frontend | None |
| 14 | `frontend/src/hooks/useLearningSession.js` | Frontend | Steps 11–12 |
| 15 | `frontend/src/App.jsx` | Frontend | Step 14 |
| 16 | `frontend/src/components/SetupScreen.jsx` | Frontend | Step 15 |
| 17 | `frontend/src/components/TopicSelection.jsx` | Frontend | Step 15 |
| 18 | `frontend/src/components/MessageBubble.jsx` | Frontend | None |
| 19 | `frontend/src/components/ChatInput.jsx` | Frontend | None |
| 20 | `frontend/src/components/ChatArea.jsx` | Frontend | Step 18 |
| 21 | `frontend/src/components/ProgressPanel.jsx` | Frontend | None |
| 22 | `frontend/src/components/ChatHeader.jsx` | Frontend | None |
| 23 | `frontend/src/components/ChatSession.jsx` | Frontend | Steps 20–22 |
| 24 | Wire `App.jsx` routing | Frontend | Steps 16, 17, 23 |

---

## Phase 13 — Edge Cases & Error Handling

| Scenario | Handling |
|---|---|
| No Gemini API key | SetupScreen shown before any other screen |
| Invalid API key | Backend returns 401; frontend shows inline error on SetupScreen |
| Gemini API call fails | Backend returns 502; frontend shows retry toast |
| ChromaDB write fails | Log warning; session continues without memory persistence |
| Malformed JSON metadata | Backend returns last known meta; logs parse error |
| Empty Gemini response | Backend returns fallback "I had trouble responding" |
| Very long conversation | Trim `history[]` to last 20 turns before sending to Gemini |
| Network timeout | 30-second timeout on backend; surface error to user |
| First-time topic | `get_prior_context()` returns empty; AI starts from beginner |

---

## Phase 14 — Final Polish

- [ ] Loading skeleton for initial AI message
- [ ] Smooth CSS transitions on progress panel open/close
- [ ] Animate mastery level changes (pulse on upgrade)
- [ ] Keyboard accessibility (focus management, ARIA labels)
- [ ] Mobile responsive layout (stack header items vertically)
- [ ] ChromaDB `chroma_db/` added to `.gitignore`
- [ ] `README.md` with full setup instructions (backend + frontend)
- [ ] Backend startup message: "ChromaDB initialized at ./chroma_db"

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| AI Provider | Gemini API (gemini-2.0-flash) | No Claude API key needed; Gemini free tier available |
| API key storage | localStorage → X-API-Key header | No backend .env needed for demo; user controls their key |
| Backend | Python FastAPI | Required for ChromaDB (Python-native); also keeps API key server-side per request |
| Vector DB | ChromaDB persistent embedded | No separate server process; data on disk; Python-native |
| Embedding model | ChromaDB default (sentence-transformers) | No extra API calls; runs locally |
| Memory retrieval | Query by topic at session start | Injects prior context into Gemini system prompt once per session |
| Message history | Last 20 turns sent to Gemini | Maintains conversation context without exceeding token limits |
| Metadata format | Delimited JSON block in Gemini response | Reliable parsing without function calling overhead |
| CORS proxy | Vite dev proxy → localhost:8000 | Avoids CORS errors in dev; production would use nginx or same origin |
