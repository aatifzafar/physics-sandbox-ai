# PhysicsAI Backend

Deterministic Physics Engine and Gemini-Powered Natural Language Processing Service for PhysicsAI.

## Architecture

```
User Prompt (Natural Language)
          │
          ▼
Express API (POST /api/simulations/generate)
          │
          ▼
Gemini API (@google/genai structured output)
          │
          ▼
Zod Schema Validation (Physics bounds checking)
          │
          ▼
Deterministic Physics Engine (TypeScript RK4 & Kinematics)
   ├── Projectile Motion (Trajectory, Apex, Flight Time, Range)
   ├── Pendulum Dynamics (Runge-Kutta 4th-Order, Damping, Energy)
   └── Harmonic Oscillator (Mass-Spring, Damping Regimes, Energy)
          │
          ▼
Educational Explanation Generator
          │
          ▼
Structured JSON Response { simulation, explanation }
```

## Supported Simulation Types

1. **Projectile Motion (`projectile`)**
   - Parameters: `initialVelocity` ($v_0$), `angle` ($\theta$), `gravity` ($g$), `initialHeight` ($y_0$).
   - Calculates: Trajectory points $(t, x, y, z)$, maximum height, time of flight, horizontal range, velocity vectors.

2. **Simple Pendulum (`pendulum`)**
   - Parameters: `length` ($L$), `initialAngle` ($\theta_0$), `mass` ($m$), `gravity` ($g$), `damping` ($c$), `initialAngularVelocity` ($\omega_0$).
   - Calculates: Non-linear Runge-Kutta 4th-order trajectory $(t, x, y, z, \theta, \omega)$, natural period, energy partition ($KE, PE, E_{total}$).

3. **Harmonic Oscillator (`harmonic_oscillator`)**
   - Parameters: `mass` ($m$), `springConstant` ($k$), `initialDisplacement` ($x_0$), `initialVelocity` ($v_0$), `damping` ($c$).
   - Calculates: Position over time $x(t)$, velocity $v(t)$, natural frequency, damping ratio $\zeta$, damping regime (undamped, underdamped, critically damped, overdamped), total energy.

---

## Environment Variables

Create `.env` inside `/backend`:

```env
PORT=5000
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

> [!NOTE]
> `GEMINI_API_KEY` is loaded strictly on the backend. It is never exposed in client bundles or API payloads.

---

## Getting Started

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Run in Development Mode
```bash
npm run dev
```

### 3. Run Tests
```bash
npm test
```

### 4. Build and Run in Production
```bash
npm run build
npm start
```

---

## API Endpoints

### Health Check
```http
GET /api/health
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "PhysicsAI backend is running",
  "timestamp": "2026-09-03T05:57:56.123Z"
}
```

### Generate Simulation
```http
POST /api/simulations/generate
Content-Type: application/json

{
  "prompt": "Simulate projectile motion with initial velocity 20 m/s at 45 degrees."
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "simulation": {
    "id": "sim_1725343000_abc12345",
    "type": "projectile",
    "parameters": {
      "initialVelocity": 20,
      "angle": 45,
      "gravity": 9.81,
      "initialHeight": 0
    },
    "trajectory": [
      { "t": 0, "x": 0, "y": 0, "z": 0, "vx": 14.14, "vy": 14.14, "vz": 0 }
    ],
    "results": {
      "maximumHeight": 10.19,
      "timeOfFlight": 2.88,
      "range": 40.77,
      "initialVelocityX": 14.14,
      "initialVelocityY": 14.14
    }
  },
  "explanation": {
    "title": "Projectile Motion",
    "summary": "A projectile launched at an initial velocity of 20 m/s at 45° under constant gravity.",
    "keyConcepts": [
      "Horizontal motion maintains uniform constant velocity.",
      "Vertical motion is uniformly accelerated downward."
    ],
    "equations": [
      "x(t) = v_0 \\cos\\theta\\; t",
      "y(t) = v_0 \\sin\\theta\\; t - \\tfrac{1}{2} g t^2"
    ],
    "simulationSteps": [
      "Decompose initial velocity into components.",
      "Compute coordinates over time."
    ],
    "observations": [
      "Maximum height attained is 10.19 m.",
      "Total time of flight is 2.88 s.",
      "Total range is 40.77 m."
    ]
  }
}
```

---

## Deployment

### Render Web Service
1. **Root Directory:** `backend`
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start`
4. **Environment Variables:**
   - `GEMINI_API_KEY`: `<Your Gemini API key>`
   - `GEMINI_MODEL`: `gemini-2.5-flash`
   - `FRONTEND_URL`: `https://your-frontend.onrender.com`
   - `NODE_ENV`: `production`

### AWS (Elastic Beanstalk / App Runner / ECS)
- The backend is 100% stateless and listens on `process.env.PORT`.
- Set container environment variables in AWS Task Definition or App Runner console.
