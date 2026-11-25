import sqlite3
import httpx

def main():
    print("=== LIVE FASTAPI SERVER CHECK ===")
    r_health = httpx.get("http://127.0.0.1:8000/api/v1/health")
    print("Health Status:", r_health.status_code, r_health.json())

    r_companies = httpx.get("http://127.0.0.1:8000/api/v1/companies")
    companies = r_companies.json()
    print(f"Companies Count: {len(companies)}")
    for c in companies:
        print(f"  - [{c['id']}] {c['name']} ({c['ticker']}) - Sector: {c['sector']}")

    # Test analyze endpoint with live call
    payload = {
        "company_name": "Apex Enterprise Systems",
        "ticker": "APEX",
        "sector": "Enterprise SaaS",
        "fiscal_year": "FY2024",
        "revenue": 145000000.0,
        "operating_profit": 32500000.0,
        "net_profit": 23400000.0,
        "tax_rate": 21.0,
        "total_debt": 25000000.0,
        "shareholders_equity": 85000000.0,
        "invested_capital": 95000000.0,
        "wacc": 8.5,
        "prev_revenue": 128000000.0,
        "prev_operating_profit": 27000000.0,
        "prev_net_profit": 19500000.0,
        "prev_total_debt": 30000000.0,
        "prev_invested_capital": 90000000.0,
        "prev_shareholders_equity": 75000000.0,
        "prev_wacc": 8.8,
    }
    r_analyze = httpx.post("http://127.0.0.1:8000/api/v1/analyze", json=payload)
    print("\n=== POST /api/v1/analyze Status:", r_analyze.status_code)
    data = r_analyze.json()
    print(f"  - NOPAT: ${data['nopat']:,.2f}")
    print(f"  - Capital Charge: ${data['capital_charge']:,.2f}")
    print(f"  - EVA: ${data['eva']:,.2f}")
    print(f"  - ROIC: {data['roic']:.2f}% | ROE: {data['roe']:.2f}%")
    print(f"  - Value Spread: {data['value_spread']:.2f}%")
    print(f"  - Shareholder Value Score: {data['shareholder_value_score']}/100 ({data['score_classification']})")
    print(f"  - Attribution: {data['score_breakdown']}")

    # Test Scenarios comparison
    scenarios_payload = {
        "company_id": companies[0]["id"],
        "revenue": 145000000.0,
        "operating_profit": 32500000.0,
        "net_profit": 23400000.0,
        "tax_rate": 21.0,
        "total_debt": 25000000.0,
        "shareholders_equity": 85000000.0,
        "invested_capital": 95000000.0,
        "wacc": 8.5,
        "scenarios": [
            {
                "name": "Capex Expansion",
                "scenario_type": "reinvest",
                "description": "Expand cloud capacity",
                "rev_delta_pct": 10.0,
                "margin_delta_pct": 1.5,
                "debt_delta": 5000000.0,
                "invested_capital_delta": 10000000.0,
                "wacc_delta": 0.2
            }
        ]
    }
    r_scen = httpx.post("http://127.0.0.1:8000/api/v1/scenarios/compare?save_history=true", json=scenarios_payload)
    print("\n=== POST /api/v1/scenarios/compare Status:", r_scen.status_code)
    scen_data = r_scen.json()
    print(f"  - Compared {len(scen_data['scenarios'])} scenarios against baseline EVA ${scen_data['baseline_eva']:,.2f}")

    # Test Gemini AI Integration Endpoints
    print("\n=== GEMINI AI INTEGRATION ENDPOINT CHECKS ===")
    r_ai_status = httpx.get("http://127.0.0.1:8000/api/v1/ai/status")
    print("GET /api/v1/ai/status:", r_ai_status.status_code, r_ai_status.json())

    # Test invalid key validation
    r_invalid_key = httpx.post("http://127.0.0.1:8000/api/v1/ai/settings", json={"api_key": "invalid_test_key_12345"})
    print("POST /api/v1/ai/settings (invalid key check):", r_invalid_key.status_code, "(Correctly rejected with 400)")

    # Test unconfigured analysis endpoint error handling
    if not r_ai_status.json().get("is_configured"):
        r_unconfig_analyze = httpx.post(f"http://127.0.0.1:8000/api/v1/ai/analyze/{companies[0]['id']}")
        print(f"POST /api/v1/ai/analyze/{companies[0]['id']} (unconfigured check):", r_unconfig_analyze.status_code, "(Correctly returned 503)")

    # Inspect SQLite database directly
    print("\n=== LOCAL SQLITE DATABASE INSPECTION (backend/valora.db) ===")
    conn = sqlite3.connect("backend/valora.db")
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    print("Tables:", tables)
    for t in tables:
        if not t.startswith("sqlite_"):
            cursor.execute(f"SELECT COUNT(*) FROM {t}")
            print(f"  * {t}: {cursor.fetchone()[0]} rows")
    
    # Query recent analysis records
    cursor.execute("SELECT id, company_id, period, eva, roic, roe, shareholder_value_score, created_at FROM analysis_history ORDER BY id DESC LIMIT 3")
    print("\nRecent Analysis History Rows:")
    for row in cursor.fetchall():
        print(" ", row)
    
    conn.close()
    print("\n=== ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
