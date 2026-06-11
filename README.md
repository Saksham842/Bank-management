# LedgerPro: AI-Powered Wealth Management & Intelligent Ledger

**LedgerPro** is a modern, high-fidelity, full-stack financial tracking and wealth management platform. It integrates standard accounting ledger principles with advanced natural language query processing, AI-driven transaction categorization, multi-factor authentication (MFA/2FA), and beautiful responsive visualization dashboards.

The application features a **premium dark glassmorphism theme** designed to wow at first glance, featuring smooth GSAP and Framer Motion micro-interactions, rich gradients, and custom high-contrast components.

---

## 🌟 Platform Capabilities

### 1. 🤖 Intelligent Natural Language Processing (NLP) & AI
* **Conversational AI Advisor (Streaming):** Chat with a streaming financial assistant powered by Google Gemini (`gemini-1.5-flash`). It analyzes up to 30 of your recent transactions in real-time, streaming custom budget recommendations and cash flow insights over Server-Sent Events (SSE).
* **SMS & Narration Parser:** Copy and paste raw bank SMS messages or transactions (e.g., `"Alert: ₹45,000 credited to Account XXXX9876 by salary NEFT"`). The engine parses merchant, amount, category, ledger type, and date to automatically pre-fill your forms.
* **Hybrid Classification Pipeline:** Implements a layered NLP pipeline using **Compromise.js** and **Natural** for fast rule-based local classifications, with fallback to **Google Gemini** for fuzzy, zero-shot categorizations.

### 2. 📊 Rich Data Visualizations & Reports
* **Premium Recharts Dashboards:**
  * **Balance Trend:** A smooth, glowing violet-to-indigo gradient area chart representing your net worth growth.
  * **Spending Breakdown:** A customized donut chart tracking major spending centers with premium dark glass tooltip card highlights.
  * **Income vs Expense Comparison:** A clean, dual-colored monthly bar chart mapping inflows versus outflows.
* **Daily Spending Heatmap:** A sleek, dark-to-violet intensity calendar contribution grid (similar to GitHub's contribution board) showing your transaction frequencies and volumes over the last 365 days.
* **Format-Rich Export Utilities:** One-click downloads for **Excel Sheets** (`xlsx`) and beautifully rendered **PDF Ledgers** (`pdfkit`) containing fully formatted accounts, transactions, and category breakdowns.

### 3. 🔒 Bank-Grade Security & Authentication
* **Speakeasy TOTP Multi-Factor Authentication (MFA):** Set up Time-based One-time Passwords (TOTP) compatible with Google Authenticator, Authy, or Microsoft Authenticator. Generates a glowing, interactive QR scanner overlay on the front-end settings panel.
* **Double-Cookie JWT Sessions:** Employs cryptographically secured short-lived JWT Access Tokens combined with Secure HTTP-Only Refresh cookies to completely insulate users from XSS and CSRF.
* **Granular Session Rates:** Backend includes robust rate-limiting and route verification schemes to secure endpoints against raw-force exploits.

### 4. 🎨 Premium Modern UI/UX (Aesthetics First)
* **Glassmorphic Design System:** Styled with a deep space black background (`#060912`), dark translucent panels (`.glass-panel`), glowing borders, HSL colors, and noise textures.
* **Responsive Interactions:** Adaptive layouts featuring custom inputs (`.input-premium`), buttons (`.btn-primary`, `.btn-secondary`), and glowing status badges.
* **Fluid Motion Mechanics:** Seamless layout transitions powered by **Framer Motion** combined with scroll-triggered landing and dashboard reveals built with **GSAP (ScrollTrigger)**.

---

## 🛠️ Unified Architecture & Tech Stack

The entire application is built using a lightweight, lightning-fast full-stack JavaScript environment (no TypeScript, ensuring clean and native execution):

### Frontend (Client)
* **Core:** React 18, Vite (Fast Hot Module Replacement)
* **Styling:** Tailwind CSS, PostCSS (Utility-first system configured with HSL design tokens)
* **State Management:** Zustand (Sleek, reactive client state)
* **Visualizations:** Recharts (SVG-based reactive graphs)
* **Animations:** Framer Motion, GSAP (ScrollTrigger)
* **Utilities:** Axios (with secure session cookies), Lucide Icons, Zod, React Hook Form, Numeral.js

### Backend (Server)
* **Core:** Node.js, Express (RESTful controllers and structured middleware architecture)
* **Database:** MongoDB (using Mongoose schemas with compound indexes)
* **Authentication/Security:** JSON Web Tokens (JWT), Speakeasy (MFA TOTP), bcryptjs, Cookie-Parser, Express Rate Limit
* **Integrations:** `@google/generative-ai` (Gemini API integration), `@xenova/transformers`, Compromise, Natural, Socket.io (Real-time balance synchronization)
* **Exporters:** PDFKit, SheetJS (`xlsx`), Nodemailer (Email notifications and budget threshold alerts)

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.x or newer)
* **MongoDB** (Local database instance or a free MongoDB Atlas cloud cluster)
* **Google Gemini API Key** (Free, no credit card required. Get yours at [Google AI Studio API Key Manager](https://aistudio.google.com/app/apikey))

### Directory Layout
```text
├── backend/          # Node.js/Express Server & Database Schemas
└── frontend/         # React, Vite, Tailwind Client (Plain JavaScript/JSX only)
```

### 1. Backend Server Setup
1. **Navigate to the server directory:**
   ```bash
   cd backend
   ```
2. **Install node modules:**
   ```bash
   npm install
   ```
3. **Configure your environmental overrides:**
   Create a `.env` file inside the `backend` folder and supply the following variables:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/Ledger
   JWT_SECRET=your_jwt_secret_signing_key_here
   JWT_REFRESH_SECRET=your_jwt_refresh_signing_key_here
   GEMINI_API_KEY=your_google_gemini_api_key
   FRONTEND_URL=http://localhost:5173
   
   # Optional SMTP credentials for email alerts (Gmail OAuth / App Passwords)
   EMAIL_USER=your_email@gmail.com
   CLIENT_ID=your_google_client_id
   CLIENT_SECRET=your_google_client_secret
   REFRESH_TOKEN=your_google_refresh_token
   ```
4. **Boot up the developer server:**
   ```bash
   npm run dev
   ```

5. **(Optional) Seed the database with test data:**
   ```bash
   npm run seed
   ```
   This creates a test user with 90 days of sample transactions, goals, and anomaly data.

### 2. Frontend Client Setup
1. **Navigate to the client directory:**
   ```bash
   cd ../frontend
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Boot up the Vite dev server:**
   ```bash
   npm run dev
   ```
4. **Build the optimized distribution bundles:**
   ```bash
   npm run build
   ```

### 3. Authentication Flow & Test User

The application uses JWT-based authentication with MongoDB. All routes except `/login`, `/register`, and `/` require a valid access token.

**Auth flow:**
1. **Register** at `/register` → Creates a user in MongoDB → Redirects to onboarding
2. **Onboarding** at `/onboarding` → Collects name/income → Saves profile to database
3. **Login** at `/login` → Authenticates against MongoDB → Redirects to dashboard
4. **Dashboard** at `/dashboard` → Protected route (requires auth)

**Test User** (created by running `npm run seed` in the `backend/` folder):
```text
Email:    test@ledgerpro.com
Password: test123
```

The seed script creates a user with:
- 90 days of sample transactions (salary credits, food, transport, shopping, bills, health, entertainment)
- 2 anomaly transactions (outlier spending) for testing the anomaly detection feature
- 2 financial goals (Emergency Fund, New Laptop) with contribution history
- Initial financial health score computation

To clear and re-seed, simply run `npm run seed` again — it removes existing test data before inserting.

---

## 🌐 Full-Stack Production Deployment Guide

Follow these steps to deploy LedgerPro to the cloud using free hosting resources:

### 🔑 Part 1: How to Get a Free Google Gemini API Key
The application uses Google Gemini (the `gemini-1.5-flash` model) for parsing natural language queries, categorizing transactions automatically, and delivering conversational wealth planning insights. The Gemini API is **100% free** and requires no credit cards to get started.

1. **Get an API Key:**
   * Go to the [Google AI Studio API Key Manager](https://aistudio.google.com/app/apikey).
   * Sign in with your standard Google Account (Gmail).
2. **Create Key:**
   * Click **Create API Key**.
   * Choose to create the key in a new Google Cloud project or an existing one.
   * **Important:** Copy the generated key immediately and save it somewhere secure.
3. **Add to Project:**
   * Paste this key into your `backend/.env` file:
     ```env
     GEMINI_API_KEY=AIzaSy...
     ```

### ☁️ Part 2: Deploying the MongoDB Database (Atlas)
1. Sign up on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free-tier Shared Cluster.
3. Add a Database User with read and write permissions (note the password).
4. Go to **Network Access** and add IP Address `0.0.0.0/0` to allow connections from all deployment environments.
5. Copy your connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/databaseName
   ```

### 🖥️ Part 3: Deploying the Backend API (Render)
We recommend using **Render** (free tier available) to host the Express server.

1. **Sign Up:** Go to [Render](https://render.com/) and connect your GitHub repository.
2. **Create Web Service:**
   * Click **New +** and select **Web Service**.
   * Connect your project repository.
3. **Configure Service Settings:**
   * **Name:** `ledger-backend`
   * **Region:** Choose closest to your database (e.g., `Oregon` or `Singapore`).
   * **Branch:** `main` (or the branch you push to).
   * **Root Directory:** `backend` (isolates backend from frontend).
   * **Runtime:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `node server.js`
4. **Environment Variables:**
   * Click **Advanced** -> **Add Environment Variable**. Add the following:
     * `PORT` = `10000` (Render handles port routing automatically, but good to define)
     * `MONGO_URI` = `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/databaseName` (your Atlas URI)
     * `JWT_SECRET` = `R02HFaPESZwyUKKioDAPLu25KRLAB9wOyiJ8fV9GrkM` (any long random key)
     * `JWT_REFRESH_SECRET` = `another_long_random_string`
     * `GEMINI_API_KEY` = `your_free_gemini_api_key`
     * `FRONTEND_URL` = `https://your-frontend-app.vercel.app` (You will update this once frontend is deployed)
     * `CLIENT_ID` = `your_google_client_id` (optional for SMTP/email)
     * `CLIENT_SECRET` = `your_google_client_secret` (optional)
     * `REFRESH_TOKEN` = `your_google_refresh_token` (optional)
     * `EMAIL_USER` = `vanshmalik501@gmail.com`
5. **Deploy:** Click **Create Web Service**. Once deployed, copy your backend URL (e.g., `https://ledger-backend.onrender.com`).

### 🎨 Part 4: Deploying the Frontend (Vercel)
We recommend deploying the React frontend to **Vercel** (highest performance for static Vite applications).

1. **Sign Up:** Go to [Vercel](https://vercel.com/) and link your GitHub.
2. **Create Project:** Click **Add New** -> **Project** and import your repository.
3. **Configure Build Settings:**
   * **Framework Preset:** `Vite` (Vercel automatically detects this).
   * **Root Directory:** `frontend` (points Vercel to compile inside the client directory).
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
4. **Environment Variables:**
   * Add the backend URL variable:
     * `VITE_API_URL` = `https://ledger-backend.onrender.com/api` (Use your actual backend URL from Render)
5. **Deploy:** Click **Deploy**. Vercel will build the frontend assets and host them. Copy your live frontend domain name (e.g., `https://ledgerpro-app.vercel.app`).

### 🔄 Part 5: Final Handshake (Connecting Front and Back)
1. Go back to your **Render Web Service** dashboard for the backend.
2. Under **Environment Variables**, update `FRONTEND_URL` to your live Vercel URL:
   ```text
   FRONTEND_URL = https://ledgerpro-app.vercel.app
   ```
3. Save changes. Render will automatically redeploy the backend with the new CORS permissions.
4. Open your live Vercel website, sign up, test transactions, try NLP search, and enjoy your fully deployed application!

---

## 💻 Core Developer Competencies Highlighted
* **High-Contrast Dark Aesthetic:** Clean, premium dark layouts with perfect typographical readability across device screens.
* **AI Toolchain Pipeline:** Native integration of Gemini streaming alongside local NLP models to deliver predictive UX answers.
* **Production Build Integrity:** 100% standard plain JavaScript structure compiling with zero warnings and pristine lint safety.
