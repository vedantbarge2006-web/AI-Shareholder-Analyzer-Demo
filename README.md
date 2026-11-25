# VALORA AI — AI-Based Shareholder Value Creation Analyzer

Valora AI is a professional fintech analytics platform that evaluates whether corporate financial decisions create or destroy shareholder value. It combines modern financial engineering (Stern Stewart EVA®, DuPont ROE decomposition, ROIC vs WACC spread analysis) with an AI copilot and strategic scenario simulator.

---

## 🏛️ Project Architecture

```
AI_SHAREHOLDER ANALYZER/
├── frontend/                      # React 18 + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/           # Recharts performance, waterfall, value trends, scenarios
│   │   │   │   ├── PerformanceChart.tsx
│   │   │   │   ├── RevenueExpensesChart.tsx
│   │   │   │   └── ValueTrendChart.tsx
│   │   │   ├── common/           # MetricCard, ScoreMeter, Badge, Tooltip
│   │   │   │   ├── MetricCard.tsx
│   │   │   │   ├── ScoreMeter.tsx
│   │   │   │   └── Badge.tsx
│   │   │   └── layout/           # Sidebar, Header, App Layout
│   │   │       ├── Header.tsx
│   │   │       ├── Layout.tsx
│   │   │       └── Sidebar.tsx
│   │   ├── context/
│   │   │   └── FinancialDataContext.tsx   # Global reactive financial state & live calculations
│   │   ├── data/
│   │   │   └── mockFinancialData.ts       # Realistic presets (Apex, Nexus, Titan) & history
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx              # Executive KPIs, charts, activities, score
│   │   │   ├── FinancialInput.tsx         # Balance sheet & income statement inputs
│   │   │   ├── ValueAnalysis.tsx          # EVA equation, DuPont ROE, comparison table
│   │   │   ├── AiInsights.tsx             # Risk matrices, opportunity cards, AI copilot
│   │   │   ├── ScenarioSimulator.tsx      # Capex, deleveraging, dividend levers & charts
│   │   │   └── Reports.tsx                # Formal shareholder value report & history
│   │   ├── types/
│   │   │   └── financial.ts               # Core domain TypeScript interfaces
│   │   └── utils/
│   │       └── financialFormulas.ts       # Mathematical implementations of EVA, ROIC, ROE
├── backend/                       # FastAPI (Phase 2 Ready)
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py         # REST endpoints (/api/v1/analyze, /api/v1/health)
│   │   ├── schemas/
│   │   │   └── financial.py      # Pydantic v2 validation models
│   │   ├── services/
│   │   │   └── analyzer.py       # Core valuation engine matching frontend logic
│   │   └── main.py               # FastAPI application with CORS
│   └── requirements.txt
└── README.md
```

---

## 📐 Core Financial Formulas Implemented

1. **Economic Value Added (EVA)**:
   $$\text{EVA} = \text{NOPAT} - (\text{Invested Capital} \times \text{WACC})$$
   Where $\text{NOPAT} = \text{Operating Profit (EBIT)} \times (1 - \text{Tax Rate})$.

2. **Return on Equity (ROE)**:
   $$\text{ROE} = \left(\frac{\text{Net Profit}}{\text{Shareholders' Equity}}\right) \times 100$$
   *DuPont 3-Way*: $\text{Net Profit Margin} \times \text{Asset Turnover} \times \text{Financial Leverage}$.

3. **Return on Invested Capital (ROIC)**:
   $$\text{ROIC} = \left(\frac{\text{NOPAT}}{\text{Invested Capital}}\right) \times 100$$

4. **Economic Value Spread**:
   $$\text{Value Spread} = \text{ROIC} - \text{WACC}$$
   *Positive Spread = Value Creation; Negative Spread = Value Destruction.*

5. **Shareholder Value Score (0–100)**:
   A composite index combining value spread, ROE hurdle performance, revenue growth, and solvency ratios.

---

## 🚀 Getting Started

### 1. Frontend (Active)
```bash
cd frontend
npm install
npm run dev
```
The application will be running at `http://localhost:5173`.

To build for production:
```bash
npm run build
```

### 2. Backend (FastAPI - Ready for Phase 2)
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Interactive docs at `http://localhost:8000/docs`.

---

## ✨ Features Breakdown

- **Executive Value Dashboard**: Real-time KPI cards, composite 0–100 score gauge, multi-year performance charts, cost structure waterfall, and corporate activity feed.
- **Financial Data Input**: Interactive form for all balance sheet, income statement, and hurdle rate inputs with 1-click company presets (Apex Global Technologies, Nexus Supply & Freight, Titan Heavy Materials) and prior year comparative baselines.
- **Value Analysis**: Step-by-step visual EVA decomposition ($NOPAT - Capital Charge$), DuPont 3-factor breakdown, and benchmark audit variance tables.
- **Valora AI Copilot**: Financial commentary cards, risk matrices, and interactive Q&A sandbox.
- **Scenario Simulator**: Real-time sliders for Capex, operating margins, deleveraging, and WACC hurdle shifts with side-by-side comparative charts.
- **Reports & Audits**: Print-ready formal shareholder value report, historical snapshot archive, and simulated export triggers (PDF / Excel / CSV).
