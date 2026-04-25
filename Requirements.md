# 🎓 Grasp — Adaptive Learning Assistant

An intelligent AI-powered learning companion that helps users learn new concepts effectively through Socratic dialogue, personalized content, and real-time adaptation to user pace and understanding.

---

## Challenge Brief

> Create an intelligent assistant that helps users learn new concepts effectively. The system should personalise content and adapt to user pace and understanding.

---

## Problem Statement

Traditional learning tools fall into two categories — passive content (video courses, articles) and mechanical repetition (flashcards, static quizzes). Neither adapts to the learner in real-time.

Research shows that 1-on-1 tutoring produces dramatically better outcomes (Bloom's 2 Sigma Problem, 1984 — tutored students outperform 98% of classroom-taught peers), but it doesn't scale with human tutors.

**Grasp bridges this gap** by using AI to deliver personalized, Socratic tutoring that adapts to each learner's pace, understanding, and learning style — at scale.

---

## Solution Overview

Grasp is a web-based learning assistant where users pick any topic and learn through a conversational AI tutor. The AI doesn't lecture — it asks guiding questions, detects confusion, adapts its teaching strategy, and ensures conceptual understanding before moving forward.

Every session is persisted to a local ChromaDB vector database. When a learner returns to a topic, the system retrieves relevant prior context — concepts already mastered, strategies that worked, and gaps that remain — and injects it into the AI's memory before the session begins.

### Core Learning Loop

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  1. Assess  │────▶│  2. Teach    │────▶│  3. Verify      │
│  Knowledge  │     │  (Socratic)  │     │  Understanding  │
└─────────────┘     └──────────────┘     └─────────────────┘
       ▲                                         │
       │            ┌──────────────┐              │
       └────────────│  4. Adapt &  │◀─────────────┘
                    │  Review      │
                    └──────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  5. Memory      │
                 │  (ChromaDB)     │
                 └─────────────────┘
```

---

## Key Features

### 1. Topic Flexibility
- 8 preset learning domains: Python, JavaScript, React, SQL, Data Structures, Machine Learning, Physics, Mathematics
- Custom topic input — user can type any subject they want to learn
- No pre-built content needed; AI generates everything dynamically

### 2. Socratic Tutoring Engine
- AI teaches by asking guiding questions, not by lecturing
- Encourages the learner to discover answers through reasoning
- Falls back to direct explanation only when the learner is stuck
- Keeps responses short and conversational (3-5 sentences)

### 3. Real-Time Comprehension Detection
- Analyzes user responses to gauge understanding level
- Classifies comprehension as: None → Emerging → Developing → Solid
- Detects misconceptions vs. knowledge gaps vs. mastery
- Tracks confidence signals from response quality and accuracy

### 4. Adaptive Teaching Strategies
The AI dynamically switches between teaching methods based on learner needs:

| Strategy | When Used |
|---|---|
| Socratic questioning | Default — guides learner to discover answers |
| Analogies | When abstract concept needs grounding |
| Worked examples | When learner needs concrete demonstration |
| Direct explanation | When learner is stuck after multiple attempts |
| Review | When reinforcing previously covered concepts |

### 5. Mastery Gates
- Learner must demonstrate understanding before the AI moves to the next concept
- Prevents knowledge gaps from accumulating
- AI verifies with check questions before progressing

### 6. Concept Tracking & Progress Visualization
- Every concept covered is tracked and displayed
- Current concept, mastery level, and difficulty are shown in the header
- Active teaching strategy is visible to the user
- Progress panel shows full learning journey at a glance

### 7. Adaptive Difficulty
- AI adjusts difficulty based on learner performance
- Tracks three levels: Beginner → Intermediate → Advanced
- Scales up when learner demonstrates solid understanding
- Scales down when learner struggles

### 8. Persistent Memory (ChromaDB)
- Every session is stored as embeddings in a local ChromaDB vector database
- On new sessions, relevant prior context is retrieved and injected into the AI prompt
- Three ChromaDB collections: `sessions`, `conversation_turns`, `concepts_mastered`
- Enables spaced repetition and seamless session resumption across browser restarts

---

## Technical Architecture

### Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React (JSX) + Vite | Single-page web application |
| UI Framework | Tailwind CSS + CSS variables | Theming, light/dark mode support |
| Backend | Python FastAPI | API proxy, memory orchestration |
| AI Engine | Gemini API (gemini-2.0-flash) | Socratic tutoring, comprehension analysis |
| Memory / Vector DB | ChromaDB (persistent, embedded) | Long-term learning memory across sessions |
| Embeddings | ChromaDB default (sentence-transformers) | Semantic similarity for memory retrieval |

### System Architecture

```
┌─────────────────────────────────────────┐
│            Frontend (React + Vite)       │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  Setup      │  │   Topic Grid /   │  │
│  │  Screen     │  │   Chat Session   │  │
│  └──────┬──────┘  └────────┬─────────┘  │
│         │                  │            │
│  ┌──────▼──────────────────▼─────────┐  │
│  │         State Manager              │  │
│  │  - messages[], sessionMeta         │  │
│  │  - mastery, difficulty, strategy   │  │
│  └──────────────┬────────────────────┘  │
└─────────────────┼───────────────────────┘
                  │ HTTP (localhost:8000)
                  ▼
┌─────────────────────────────────────────┐
│         Backend (Python FastAPI)         │
│  ┌────────────────────────────────────┐ │
│  │  POST /api/chat                    │ │
│  │  POST /api/sessions                │ │
│  │  GET  /api/memory/context          │ │
│  │  GET  /api/health                  │ │
│  └──────────┬──────────────┬──────────┘ │
└─────────────┼──────────────┼────────────┘
              │              │
              ▼              ▼
┌─────────────────┐  ┌──────────────────────┐
│  Gemini API     │  │  ChromaDB (local)     │
│  gemini-2.0-    │  │  ┌────────────────┐  │
│  flash          │  │  │  sessions      │  │
│                 │  │  │  conv_turns    │  │
│  system_instr.  │  │  │  concepts_     │  │
│  + chat history │  │  │  mastered      │  │
└─────────────────┘  └──────────────────────┘
```

### AI Integration Design

The backend uses Gemini's `system_instruction` parameter to configure the tutor. Every request includes:

1. **Teach Socratically** — ask questions first, guide to discovery
2. **Detect understanding** — analyze response quality for mastery signals
3. **Adapt strategy** — switch teaching methods based on learner needs
4. **Retrieve memory** — prior context from ChromaDB injected into system prompt
5. **Track progress** — output structured JSON metadata with every response containing:
   - `concepts_taught` — list of concepts covered
   - `current_concept` — what's being taught now
   - `mastery_signals` — none / emerging / developing / solid
   - `difficulty_level` — beginner / intermediate / advanced
   - `teaching_strategy` — which approach the AI is currently using

The JSON tracking block is parsed server-side and stored in ChromaDB; the clean text is returned to the frontend.

### Memory System (ChromaDB)

ChromaDB runs in **persistent embedded mode** (no separate server needed) — data is stored to `./backend/chroma_db/` on disk.

| Collection | Documents | Metadata Fields |
|---|---|---|
| `sessions` | Session summary | `topic`, `started_at`, `total_concepts`, `final_difficulty` |
| `conversation_turns` | Each message (user + AI) | `session_id`, `role`, `timestamp`, `mastery_signals`, `teaching_strategy` |
| `concepts_mastered` | Each mastered concept | `session_id`, `topic`, `mastery_level`, `strategy_that_worked` |

**Memory Retrieval Flow:**
1. User selects topic → backend queries `concepts_mastered` for that topic
2. Backend queries `sessions` for prior sessions on same/related topics
3. Retrieved context is injected into the Gemini system prompt: "The learner has previously covered: X, Y, Z at intermediate level..."
4. After each AI response, the turn is stored in `conversation_turns`
5. When mastery gate passes, concept is stored in `concepts_mastered`

---

## Application Screens

### Screen 0: Setup — API Key Configuration
- Shown on first launch if no Gemini API key is configured
- Prompts user to enter their Gemini API key
- Key stored in browser localStorage and sent with every backend request
- Links to Google AI Studio to obtain a free key

### Screen 1: Home — Topic Selection
- Grid of 8 preset topic cards with icons and descriptions
- Custom topic input field with start button
- Clean, centered layout with minimal cognitive load

### Screen 2: Chat — Learning Session
- **Header**: Topic name, concepts covered count, current concept, active teaching strategy, progress toggle
- **Progress panel** (collapsible): Understanding level indicator, difficulty level, concept count, tag cloud of all covered concepts
- **Chat area**: Scrollable conversation with user/AI message bubbles
- **Input bar**: Text input with send button, keyboard enter support

---

## How Personalization Works

### Adaptation Signals

The AI collects these signals from each user response:

| Signal | What It Tells |
|---|---|
| Response accuracy | Does the learner understand the concept? |
| Response depth | Surface-level or deep understanding? |
| Misconceptions | Wrong mental model that needs correcting |
| Confidence cues | Tentative language vs. certain statements |
| Question patterns | What the learner asks about reveals gaps |
| Prior memory | What was learned in previous sessions (from ChromaDB) |

### Adaptation Actions

Based on signals, the AI takes these actions:

| Signal Detected | AI Response |
|---|---|
| Correct + confident | Advance to next concept |
| Correct + tentative | Verify with another question before advancing |
| Partially correct | Provide targeted clarification on the gap |
| Misconception detected | Re-teach using a different approach (analogy, example) |
| Completely lost | Simplify, break into smaller pieces, try visual explanation |
| Prior mastery found | Acknowledge previous knowledge, build on it |

---

## Design Principles

1. **Simple over complex** — one screen does the heavy lifting; no unnecessary navigation
2. **Conversation-first** — learning happens through dialogue, not content consumption
3. **Visible intelligence** — the user can see the AI adapting (strategy labels, mastery indicators)
4. **No dead ends** — the AI always has a fallback teaching strategy
5. **Encouragement built in** — the AI celebrates breakthroughs and normalizes confusion
6. **Dark mode support** — full theming via CSS variables
7. **Memory-first** — every session contributes to long-term learner profile

---

## Future Enhancements (Post-Challenge)

- **Spaced repetition engine** — use ChromaDB timestamps to schedule concept reviews at optimal intervals
- **Knowledge graph visualization** — interactive graph built from `concepts_mastered` collection
- **Multi-modal content** — AI generates diagrams, code playgrounds, and interactive examples
- **Learning streaks & gamification** — daily goals, XP, and streak tracking for motivation
- **Multi-user support** — user IDs in ChromaDB metadata to isolate learner profiles
- **Export & share** — download learning summaries and concept maps from ChromaDB

---

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js 18+ and npm
- Python 3.10+
- Gemini API key (free at [Google AI Studio](https://aistudio.google.com))

### Setup

**1. Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Add your Gemini API key to .env:  GEMINI_API_KEY=your_key_here
uvicorn main:app --reload
```

**2. Frontend**
```bash
cd frontend
npm install
npm run dev
```

**3. First Launch**
- Open http://localhost:5173
- If no API key is detected, the Setup screen will prompt you to enter your Gemini API key
- Select a topic and start learning

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
│       ├── App.jsx
│       ├── components/
│       │   ├── SetupScreen.jsx        # API key onboarding
│       │   ├── TopicSelection.jsx     # Screen 1
│       │   ├── ChatSession.jsx        # Screen 2
│       │   ├── ChatHeader.jsx
│       │   ├── ProgressPanel.jsx
│       │   ├── ChatArea.jsx
│       │   ├── MessageBubble.jsx
│       │   └── ChatInput.jsx
│       ├── hooks/
│       │   ├── useLearningSession.js  # Session state + backend calls
│       │   └── useTheme.js
│       └── utils/
│           ├── api.js                 # Backend HTTP client
│           └── parseMetadata.js       # JSON block parser
├── backend/
│   ├── main.py                        # FastAPI app + CORS
│   ├── requirements.txt
│   ├── .env.example
│   ├── chroma_db/                     # Auto-created, persisted to disk
│   ├── routers/
│   │   ├── chat.py                    # POST /api/chat
│   │   ├── sessions.py                # POST/GET /api/sessions
│   │   └── health.py                  # GET /api/health
│   ├── services/
│   │   ├── gemini_service.py          # Gemini API wrapper
│   │   ├── chroma_service.py          # ChromaDB read/write
│   │   └── memory_service.py          # Memory retrieval + injection
│   ├── prompts/
│   │   └── tutor_prompt.py            # Socratic system prompt builder
│   └── models/
│       └── schemas.py                 # Pydantic request/response models
└── diagrams/                          # Architecture diagrams
```

---

## Challenge Alignment

| Challenge Requirement | How Grasp Addresses It |
|---|---|
| Helps users learn new concepts | Socratic AI tutor (Gemini) teaches any topic through guided conversation |
| Personalise content | AI adapts explanations, analogies, examples to individual learner |
| Adapt to user pace | Mastery gates prevent rushing; difficulty scales with performance |
| Adapt to understanding | Real-time comprehension detection with 4-level mastery tracking |
| Persistent personalization | ChromaDB memory stores prior learning across sessions |

---

*Built for the challenge with focus on simplicity, intelligence, and genuine learning effectiveness.*
