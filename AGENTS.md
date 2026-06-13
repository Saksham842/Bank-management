# Project: Personal Finance Manager (Bank-management)

## Stack
- **Backend**: Node.js, Express, MongoDB, Socket.io
- **Frontend**: React, Vite, Tailwind, Recharts, Framer Motion
- **Auth**: JWT + bcrypt

## Branches

| Branch | Feature | Status |
|--------|---------|--------|
| `main` | Base app (Dashboard, Transactions, Reports, Budget, Auth) | Stable |
| `feature/investment-portfolio` | Investment Portfolio Tracker | Pushed |
| `feature/loan-tracker` | Loan & EMI Tracker | Pushed |
| `feature/cashflow-forecast` | Cash Flow Forecasting & Financial Simulator | Pushed |
| `feature/networth-tracker` | Net Worth Tracker & Asset Manager | Pushed |
| `feature/retirement-planning` | Retirement Planning & Pension Manager | Pushed |

## Backend routes
- `/api/auth` - Auth (login, register, profile)
- `/api/accounts` - Bank accounts CRUD
- `/api/transactions` - Transactions CRUD + search
- `/api/budgets` - Budgets, goals, vs-actual, recommendations, history
- `/api/ai` - AI insights
- `/api/nlp` - NLP parsing
- `/api/reports` - Reports & analytics
- `/api/retirement` - Retirement plans, pension accounts, projection, readiness, Monte Carlo, optimize

## Build
```powershell
cd frontend; npx vite build
```

## Remote
`origin` → `https://github.com/Saksham842/Bank-management.git`
