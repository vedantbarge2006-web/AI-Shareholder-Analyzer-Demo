# VALORA AI — Financial Engine & Gemini AI Backend API

Production-grade valuation backend for **VALORA AI — AI-Based Shareholder Value Creation Analyzer**. Powered by FastAPI, Google GenAI SDK (`google-genai`), Pydantic v2, SQLAlchemy, and a persistent SQLite database.

---

## 1. System Architecture

```
backend/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── health.py           # Health check & DB connectivity
│   │   │   ├── companies.py        # Company CRUD lifecycle
│   │   │   ├── financials.py       # Deterministic valuation & persistence
│   │   │   ├── analysis.py         # Historical valuation snapshots
│   │   │   ├── scenarios.py        # Capital allocation scenario simulator
│   │   │   ├── ai.py               # Gemini AI analysis, chat copilot & settings
│   │   │   └── __init__.py         # API router aggregation
│   ├── core/
│   │   ├── config.py               # App settings, Gemini key security & CORS
│   │   └── database.py             # SQLAlchemy engine, SessionLocal, Base
│   ├── models/
│   │   ├── company.py              # Companies table model
│   │   ├── financial_record.py     # FinancialRecords table model
│   │   ├── analysis_history.py     # AnalysisHistory table model
│   │   └── scenario_history.py     # ScenarioHistory table model
│   ├── schemas/
│   │   ├── company.py              # Pydantic v2 schemas for companies
│   │   ├── financial.py            # Financial input/output & score breakdown
│   │   ├── analysis.py             # Historical analysis schemas
│   │   ├── scenario.py             # Scenario simulation schemas
│   │   └── ai.py                   # Gemini AI request/response schemas
│   ├── services/
│   │   ├── financial_engine.py     # Pure deterministic financial math
│   │   ├── analysis_service.py     # Analysis persistence & query logic
│   │   ├── scenario_service.py     # Strategic scenario projections
│   │   └── gemini_service.py       # Google GenAI integration & advisory chat
│   ├── utils/
│   │   └── seed_data.py            # Idempotent database seeder (Apex, Nexus, Titan)
│   └── main.py                     # FastAPI application entry point & lifespan
├── tests/
│   ├── conftest.py                 # Shared pytest fixtures & in-memory DB isolation
│   ├── test_financial_engine.py    # Unit tests for financial math & attribution
│   ├── test_api_endpoints.py       # REST API integration tests
│   └── test_ai_service.py          # Gemini AI integration tests with mock responses
├── requirements.txt                # Python dependencies
├── verify_system.py                # End-to-end verification script
├── .gemini_key                     # Secure local backend key storage (not checked in)
└── valora.db                       # Persistent SQLite database (local storage)
```

---

## 2. Gemini AI Integration (Phase 3)

The application integrates Google Gemini through the official `google-genai` Python SDK:

- **Configurable Model**: Default is `gemini-2.5-flash` (configurable via `GEMINI_MODEL`).
- **Security & Key Management**:
  - API keys are stored exclusively in the backend configuration (`backend/.gemini_key` or `GEMINI_API_KEY`).
  - Keys are never transmitted to client browsers, browser localStorage, or logs.
  - Status endpoints return masked keys (`AIzaSy...4f8x`).
- **Strict Financial Grounding**:
  - The Python Financial Engine is the **single source of truth** for all metrics.
  - Gemini **never recalculates, hallucinates, or modifies** numbers; it interprets computed EVA, ROIC, ROE, Spread, and leverage metrics.
- **Company Context Isolation**:
  - Chat and analysis sessions isolate the active corporate profile, preventing cross-contamination between companies.
- **Graceful Failure & Reliability**:
  - The application remains 100% operational in standalone mode even without an AI key configured.
  - Structured responses are validated using Pydantic schemas.

---

## 3. Financial Formulas & Engine Rules

All calculations are executed deterministically on the Python backend:

| Metric | Mathematical Formula | Handling & Constraints |
| :--- | :--- | :--- |
| **NOPAT** | $\text{EBIT} \times (1 - \text{Tax Rate})$ | Flexible input: accepts both `21.0` and `0.21` seamlessly. |
| **Capital Charge** | $\text{Invested Capital} \times \text{WACC}$ | Flexible input: accepts both `8.5` and `0.085` seamlessly. |
| **EVA** | $\text{NOPAT} - \text{Capital Charge}$ | Positive = Value Creation; Negative = Value Destruction. |
| **ROIC** | $(\text{NOPAT} \div \text{Invested Capital}) \times 100$ | Safe zero-division protection ($\text{Invested Capital} > 0$). |
| **ROE** | $(\text{Net Profit} \div \text{Shareholders' Equity}) \times 100$ | Safe zero-division protection ($\text{Equity} > 0$). |
| **ROI** | $(\text{Net Profit} \div \text{Invested Capital}) \times 100$ | Capital productivity ratio. |
| **ROIC-WACC Spread**| $\text{ROIC} - \text{WACC}$ | Core economic profit spread. |
| **Debt Ratio** | $(\text{Total Debt} \div [\text{Total Debt} + \text{Equity}]) \times 100$ | Solvency metric. |
| **Debt-to-Equity** | $\text{Total Debt} \div \text{Shareholders' Equity}$ | Capital structure leverage. |
| **Operating Margin**| $(\text{EBIT} \div \text{Revenue}) \times 100$ | Operational efficiency. |
| **Net Profit Margin**| $(\text{Net Profit} \div \text{Revenue}) \times 100$ | Bottom-line efficiency. |
| **Revenue Growth** | $\frac{\text{Rev}_t - \text{Rev}_{t-1}}{\text{Rev}_{t-1}} \times 100$ | Handled safely if prior year value is missing or zero. |
| **Net Profit Growth**| $\frac{\text{Profit}_t - \text{Profit}_{t-1}}{\text{Profit}_{t-1}} \times 100$ | Safe handling of negative profits. |

---

## 4. REST API Endpoints

### Core Financial Endpoints
- `GET /api/v1/health`: Server health & SQLite connection.
- `GET /api/v1/companies`: List stored companies.
- `POST /api/v1/companies`: Register new enterprise profile.
- `POST /api/v1/analyze`: Calculate valuation metrics, score attribution, and persist to SQLite.
- `POST /api/v1/financials/calculate`: Stateless instant valuation without saving.
- `POST /api/v1/financial-records`: Store balance sheet & income statement record.
- `GET /api/v1/financial-records/{company_id}`: All financial records for a company.
- `GET /api/v1/analysis/history/{company_id}`: Valuation history snapshots.
- `POST /api/v1/scenarios/compare`: Compare multiple strategic capital allocation scenarios.

### Gemini AI Endpoints (Phase 3)
- `GET /api/v1/ai/status`: Current Gemini AI configuration, masked key, and model.
- `POST /api/v1/ai/settings`: Validate and save a Gemini API key.
- `DELETE /api/v1/ai/settings`: Remove saved Gemini API key.
- `POST /api/v1/ai/analyze/{company_id}`: Generate structured valuation diagnostics, strengths, weaknesses, risks, and prioritized action plan.
- `POST /api/v1/ai/chat/{company_id}`: Interactive advisory chat grounded in the selected company's metrics.
- `POST /api/v1/ai/explain-scenario/{company_id}`: Strategic AI interpretation of calculated scenario outcomes.

---

## 5. Running the Backend & Tests

### Setup Environment
```powershell
cd backend
python -m pip install -r requirements.txt
```

### Run Server
```powershell
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Run Automated Tests (19 tests)
```powershell
$env:PYTHONPATH="backend;backend/tests"
python -m pytest backend/tests -v
```

### Run End-to-End Verification
```powershell
python backend/verify_system.py
```
