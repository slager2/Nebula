# Nebula: Cosmic Skill Tree & Life RPG

Nebula is a gamified "Life-RPG" system built for INTP developers who want to turn their learning paths and daily routines into an interactive, Path of Exile-style skill tree. 

It leverages **Go/Fiber** on the backend for blazing-fast game economy logic, **PostgreSQL** for persistence, **Google Gemini** for AI-generated dynamic skill trees, and **React + Force Graph** for the frontend visualization.

## 🌟 Core Features

- **The Cosmic Skill Tree:** A node-based visualization of your learning path.
- **AI Auto-Generation:** Enter a topic (e.g., "Rust Programming"), and Gemini instantly builds a logical, sequential constellation of skills to learn.
- **Daily Operations:** Complete daily real-life tasks to earn EXP and Level Up.
- **Skill Points System:** Use earned Skill Points to unlock nodes on your constellations, proving mastery over sub-topics.

## 🏗️ Tech Stack

### Backend (`/backend`)
- **Language:** Go 1.24
- **Framework:** Fiber v2 (Fast HTTP routing)
- **Database:** PostgreSQL (via GORM with Transaction locking)
- **AI Native:** Natively integrates with `generativelanguage.googleapis.com`

### Frontend (`/frontend`)
- **Environment:** React / Next.js
- **Visualization:** `react-force-graph-2d` for the autonomous physics-based constellation rendering.
- **Styling:** Tailwind CSS (Deep space / glassmorphism aesthetic)

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
- [Docker & Docker Compose](https://www.docker.com/) OR a local PostgreSQL instance.
- [Go 1.24+](https://golang.org/dl/)
- [Node.js 18+](https://nodejs.org/en/)
- A Google Gemini API Key

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file based on the provided template and add your API credentials:
   ```env
   GEMINI_API_KEY=your_key_here
   ```
3. Boot up the database and backend using Docker:
   ```bash
   docker-compose up --build
   ```
   *(Alternatively, run `go run main.go` if you are running Postgres natively)*

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## 🎮 Game Economy Logic

- **Dailies:** Completing a daily task grants Base EXP.
- **Leveling:** `EXP Required = Level * 100`. Leveling up grants +1 Skill Point.
- **Unlocking:** Nodes cost 1 Skill Point and require their direct Parent Node to be unlocked first. All logic is protected against race conditions using Row-Level Locking in PostgreSQL.
