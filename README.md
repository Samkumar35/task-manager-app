# Daymark — Task Management Application

A lightweight, user-scoped task management web application built for the **Graduate Support Engineer Trainee Assessment**. Users authenticate via Google Sign-In and manage personal tasks across **Planned**, **In Progress**, and **Complete** states.

- **Live Application URL:** `https://task-manager-app-eta-jade.vercel.app`
- **Source Code Repository:** `https://github.com/Samkumar35/task-manager-app`

---

## 1. Tech Stack & Architecture

- **Frontend:** Vanilla JavaScript, HTML5, and CSS3 bundled with **Vite**
- **Backend:** Python 3.10+ with **FastAPI** (deployed as Vercel serverless functions under `/api`)
- **Authentication:** **Firebase Authentication** (Google Sign-In on frontend; Firebase Admin SDK Bearer ID token verification on backend)
- **Database:** **Cloud Firestore** with strict user-scoped path isolation (`users/{uid}/tasks/{taskId}`)
- **Hosting:** **Vercel**

---

## 2. User Documentation

### How to Access & Log In (Live App)
1. Open **https://task-manager-app-eta-jade.vercel.app** in any modern web browser.
2. Click **Continue with Google** on the landing screen.
3. Choose your Google account in the authentication popup.
4. Once authenticated, your personal workspace opens automatically.

### How to Use the Application
- **Create a Task:** Type a task title in the *"What needs to get done?"* input field, optionally add a short description under *"Add a note (optional)"*, and click **Add task +**. New tasks default to the **Planned** status.
- **View Tasks:** All tasks belonging to your Google account load automatically, showing their title, optional note, and current status.
- **Update Task Status:** Use the status controls on any task item to switch between **Planned**, **In Progress**, and **Complete**. Changes persist immediately to Cloud Firestore.
- **Delete a Task:** Click the delete option on a task card to permanently remove it from your list.
- **Sign Out:** Click **Sign out** in the top-right header to end your session.

### Local Setup & Installation Instructions
If you want to run this project locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Samkumar35/task-manager-app.git
   cd task-manager-app
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env` in the project root and populate your Firebase Web SDK keys (`VITE_FIREBASE_*`) and your single-line Firebase Admin service account JSON (`FIREBASE_PRIVATE_KEY_JSON`).

3. **Start the FastAPI backend (Terminal 1):**
   ```bash
   python -m venv venv
   # On Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn api.index:app --reload --host 127.0.0.1 --port 8000
   ```

4. **Start the Vite frontend (Terminal 2):**
   ```bash
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 3. Identified Gaps, Assumptions & Design Decisions

The assessment prompt intentionally omitted several product details. The following assumptions were made to improve usability while keeping the scope intentionally minimal:

- **Per-User Data Isolation:** The prompt did not specify multi-user separation. Each user's tasks are scoped strictly under `users/{uid}/tasks/{taskId}` in Firestore, and every backend API route verifies the caller's Firebase ID token before reading or writing data.
- **Task Schema & Optional Description:** Beyond a task name and status, an optional short note/description field and server-generated `created_at` timestamp were added so users can add brief context and view tasks in chronological order.
- **Input Validation:** Empty or whitespace-only task titles are blocked on both the client and backend (`422` / `400` validation) to prevent blank entries.
- **Task Deletion:** Although only Create, View, and Status Update were explicitly listed, a simple **Delete** action was included so users can clean up completed or mistaken tasks.
- **Default Status:** Newly created tasks automatically start in the **Planned** state rather than requiring users to pick a status during creation.

---

## 4. Known Limitations & User Warnings

- **Serverless Cold-Start Latency:** Because the FastAPI backend runs as a serverless function on Vercel's free tier, the very first API request after a period of inactivity may take 1–3 seconds to respond while the Python runtime initializes.
- **Popup Blockers:** Google Sign-In uses a browser popup (`signInWithPopup`). Users with strict browser popup blockers enabled must allow popups for `task-manager-app-eta-jade.vercel.app` to sign in.
- **Internet Connection Required:** Because authentication and task storage rely on Firebase Cloud services, offline task creation or caching is not supported.
- **Permanent Deletion:** Deleting a task immediately removes the document from Firestore without an undo prompt or trash bin.

---

## 5. AI Usage Summary

### AI Tools Used
- **OpenAI Codex (CLI / IDE Agent):** Used to scaffold the repository structure, generate the FastAPI backend routes, Firestore database connector, Vite Vanilla JS frontend, CSS styling, and local `.env` configuration.
- **Gemini:** Used for architectural validation, security/credential hygiene guidance, troubleshooting Git/Vercel/Firebase deployment steps, and structuring project documentation.

### How AI Tools Were Used
- **Architecture & Scaffolding:** Used AI to design a clean separation between the Vite frontend (`src/`) and Vercel-compatible FastAPI serverless endpoints (`api/`), including local Vite dev-server proxying (`/api` -> `127.0.0.1:8000`).
- **Boilerplate & UI Generation:** Generated Firebase Authentication helpers, FastAPI Bearer token verification middleware, Firestore CRUD endpoints, and minimalist CSS styling.
- **Deployment & Troubleshooting:** Used AI to resolve repository initialization, Vercel environment variable formatting, and Firebase OAuth authorized domain configuration.

### Manual Modifications & Fixes Made to AI Output
1. **Corrected Authentication Method (`Email/Password` -> `Google Sign-In`):** Initial architecture planning drafted email/password authentication; manually aligned the specification to use Google OAuth (`GoogleAuthProvider`) to satisfy Functional Requirement #1.
2. **Fixed Corrupted `VITE_FIREBASE_AUTH_DOMAIN` Value:** During `.env` generation, clipboard URL formatting stripped the subdomain prefix down to `://firebaseapp.com`. Manually corrected `VITE_FIREBASE_AUTH_DOMAIN` to `task-manager-app-a600e.firebaseapp.com` so Google Sign-In popups resolve properly.
3. **Service Account Credential Rotation:** Replaced an exposed Firebase Admin service account key with a newly generated private key and updated both local `.env` and Vercel production environment variables.
4. **Authorized Domain Whitelisting:** Manually configured `task-manager-app-eta-jade.vercel.app` (stripping the `https://` protocol prefix) in Firebase Authentication settings so OAuth worked in production.

### Example Prompts Used
#### Prompt 1 — Initial Project Scaffolding & Architecture
> Build a clean, lightweight Task Management Web Application for a technical assessment. Keep the UI simple, modern, and strictly scoped to the core requirements without unnecessary bloat.
>
> **1. Tech Stack & Architecture**
> - **Backend:** Python 3.10+, FastAPI, Uvicorn (configured for Vercel serverless deployment under `/api`).
> - **Authentication:** Firebase Authentication using **Google Sign-In** (popup) on the frontend, and Firebase Admin SDK Bearer ID token verification on the backend.
> - **Database:** Cloud Firestore with user-scoped data isolation (`users/{uid}/tasks/{taskId}`).
> - **Frontend:** Vanilla JavaScript, HTML5, and CSS bundled with Vite.
> - **Deployment:** Vercel configuration (`vercel.json`).
>
> **2. Core Functional Requirements**
> 1. **Google Authentication:** Allow users to sign in and sign out using Google Authentication via Firebase. Protect all task API routes with a FastAPI dependency that verifies the Firebase Bearer ID token and extracts the user's `uid`.
> 2. **Create Tasks:** Allow authenticated users to create a new task with a required `title` (validate against empty/whitespace-only inputs), an optional short `description`, a default `status` of `"Planned"`, and a `created_at` server timestamp.
> 3. **View Tasks:** Display only the logged-in user's tasks, sorted by creation time, clearly grouped or badge-labeled by status.
> 4. **Update Task Status:** Allow users to easily switch any task's status between the exact three states: `"Planned"`, `"In Progress"`, and `"Complete"`. (Also include a clean Delete button per task for basic usability).
>
> **3. Exact Folder Structure & Specific Configuration**
> - Create `api/index.py`, `api/database.py`, `api/auth.py`, `api/routes/tasks.py`, `src/main.js`, `src/firebase.js`, `src/style.css`, `index.html`, `package.json`, `requirements.txt`, `vercel.json`, `.env.example`, and `.gitignore`.
> - Initialize `firebase_admin` safely in `api/database.py` by parsing `FIREBASE_PRIVATE_KEY_JSON` (handling escaped `\n` newlines in `private_key` properly).
> - Prefix all API routes with `/api` and configure `vite.config.js` to proxy `/api` requests to `http://127.0.0.1:8000` during local development.
> - Generate all files with clean, well-commented, production-ready code, and include error handling for invalid tokens, network errors, and empty task titles.

#### Prompt 2 — Local Environment Setup & Build Verification
> Now let's configure the local environment, install dependencies, and verify the application setup:
> 1. Read the Firebase service account JSON file located at: `<REDACTED_LOCAL_PATH>`
> 2. Create a `.env` file in the root directory (confirming `.env` is already ignored in `.gitignore`).
> 3. Populate `.env` with the exact minified single-line JSON string for `FIREBASE_PRIVATE_KEY_JSON` alongside the Firebase Web SDK configuration values (`VITE_FIREBASE_API_KEY="<REDACTED>"`, `VITE_FIREBASE_AUTH_DOMAIN="task-manager-app-a600e.firebaseapp.com"`, `VITE_FIREBASE_PROJECT_ID="<REDACTED>"`, `VITE_FIREBASE_STORAGE_BUCKET="<REDACTED>"`, `VITE_FIREBASE_MESSAGING_SENDER_ID="<REDACTED>"`, `VITE_FIREBASE_APP_ID="<REDACTED>"`).
> 4. Check if a Python virtual environment (`venv`) exists; if not, create one and install all packages from `requirements.txt`.
> 5. Run `npm install` to install all frontend dependencies.
> 6. Verify that both the FastAPI app (`api/index.py`) and Vite production build (`npm run build`) initialize/build cleanly with zero syntax or import errors, and give me the exact commands to run both servers locally for testing.
