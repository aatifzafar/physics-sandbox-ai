# PhysicsAI — Text-to-3D Physics Simulation Sandbox

PhysicsAI is an AI-powered educational physics simulation platform that converts natural language physics prompts into deterministic 3D interactive simulations with step-by-step AI explanations.

---

## 🏛 Architecture

```
USER PROMPT
    │
    ▼
FRONTEND (React + Vite + Canvas 3D Viewport)
    │
    │  POST /api/simulations/generate
    ▼
BACKEND (Node.js + Express + TypeScript)
    │
    ▼
GEMINI API (@google/genai structured extraction)
    │
    ▼
ZOD SCHEMA VALIDATION (Physics bounds & type validation)
    │
    ▼
DETERMINISTIC PHYSICS ENGINE (TypeScript RK4 & Kinematics)
    ├── Projectile Motion (Trajectory, Apex, Flight Time, Range)
    ├── Simple Pendulum (Runge-Kutta 4th-Order, Damping, Energy)
    └── Harmonic Oscillator (Mass-Spring, Damping Regimes, Energy)
    │
    ▼
EDUCATIONAL EXPLANATION GENERATOR (LaTeX equations & observations)
    │
    ▼
FRONTEND 3D VISUALIZATION & AI EXPLANATION SIDEBAR
```

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Set GEMINI_API_KEY in backend/.env
npm run dev
```

The backend server runs on `http://localhost:5000`.

### 2. Frontend Setup

In a separate terminal:

```bash
npm install
# Optional: create .env with VITE_API_URL=http://localhost:5000
npm run dev
```

The frontend app will open at `http://localhost:5173`.

---

## 🧪 Testing

Run automated tests on the deterministic physics engines, schema validation, and API routes:

```bash
cd backend
npm test
```

---

## 🎯 Supported Physics Simulations

1. **Projectile Motion (`projectile`)**
   - Natural language: "Simulate a projectile launched at 20 m/s at 45 degrees."
   - Kinematic engine: calculates trajectory points, maximum apex height, total flight time, horizontal range, and velocity components.

2. **Simple Pendulum Dynamics (`pendulum`)**
   - Natural language: "Show a pendulum of length 2 meters released at 30 degrees with damping."
   - Numerical engine: 4th-order Runge-Kutta (RK4) integration of non-linear pendulum ODE with damping and mechanical energy tracking.

3. **Mass-Spring Harmonic Oscillator (`harmonic_oscillator`)**
   - Natural language: "Simulate a 1kg mass on a spring with stiffness 50 N/m and 1m displacement."
   - Dynamic engine: computes position, velocity, acceleration, kinetic/potential energy, natural period, and damping regime classification.

---

## 🔒 Security & API Isolation

- **Gemini API Key:** Exists exclusively in backend environment variables (`backend/.env`).
- **Zero Frontend Secret Exposure:** No AI keys or credentials exist in React code or Vite bundles.
- **Deterministic Math:** AI performs natural language understanding and educational synthesis; all numerical calculations are computed deterministically in TypeScript.
- **CORS & Helmet:** Configured to enforce trusted origin communication via `FRONTEND_URL`.

---

## 🌐 Independent Deployment

### Frontend (Static Site / CDN)
- **Platforms:** Render Static Site, Vercel, AWS S3 + CloudFront
- **Build Command:** `npm run build`
- **Environment Variable:** `VITE_API_URL=https://your-backend-url.onrender.com`

### Backend (Web Service)
- **Platforms:** Render Web Service, AWS App Runner, AWS Elastic Beanstalk, AWS ECS
- **Root Directory:** `backend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Environment Variables:**
  - `PORT`: Provided dynamically by host
  - `GEMINI_API_KEY`: Your Google Gemini API key
  - `GEMINI_MODEL`: `gemini-2.5-flash`
  - `FRONTEND_URL`: `https://your-frontend.onrender.com`
  - `NODE_ENV`: `production`
