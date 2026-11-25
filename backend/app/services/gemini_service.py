import json
import logging
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timezone

from google import genai
from google.genai import types

from app.core.config import settings, get_gemini_api_key, mask_api_key
from app.models.company import Company
from app.models.financial_record import FinancialRecord
from app.models.analysis_history import AnalysisHistory
from app.schemas.ai import (
    AiStatusResponse,
    AiFinancialAnalysisResponse,
    AiChatResponse,
    ChatMessage,
    AiScenarioExplainRequest,
    AiScenarioExplainResponse,
    RecommendationItem,
    ActionPlanItem,
)
from app.services.financial_engine import FinancialEngine, FinancialEngineInput

logger = logging.getLogger("valora.gemini")

class GeminiNotConfiguredError(Exception):
    """Raised when Gemini API key is missing."""
    pass

class GeminiApiError(Exception):
    """Raised when Gemini API call fails."""
    pass

class GeminiService:
    @staticmethod
    def is_configured() -> bool:
        """Returns True if a valid non-empty Gemini API key is configured."""
        return bool(get_gemini_api_key())

    @staticmethod
    def get_status() -> AiStatusResponse:
        """Checks configuration status of Gemini without leaking the key."""
        key = get_gemini_api_key()
        if not key:
            return AiStatusResponse(
                is_configured=False,
                masked_key=None,
                model=settings.GEMINI_MODEL,
                service_status="unconfigured",
                message="Gemini API key is not configured. Please add your key in AI Settings."
            )
        return AiStatusResponse(
            is_configured=True,
            masked_key=mask_api_key(key),
            model=settings.GEMINI_MODEL,
            service_status="ready",
            message="Gemini AI Financial Analyst is active and ready."
        )

    @staticmethod
    def validate_key(api_key: str) -> Tuple[bool, Optional[str]]:
        """
        Validates a Gemini API key by making a lightweight test request.
        Does not log or expose the raw key.
        """
        cleaned = api_key.strip()
        if not cleaned:
            return False, "API key cannot be empty."
        try:
            client = genai.Client(api_key=cleaned)
            # Minimal prompt to verify authentication with fallback support
            response, _ = GeminiService._generate_with_fallback(
                client=client,
                contents="Ping",
                config=types.GenerateContentConfig(
                    max_output_tokens=5,
                    temperature=0.0
                )
            )
            if response and response.text:
                return True, None
            return False, "Received empty response from Gemini."
        except Exception as e:
            err_msg = str(e)
            # Remove any occurrence of key from error message
            if cleaned in err_msg:
                err_msg = err_msg.replace(cleaned, "[MASKED_KEY]")
            logger.warning("Gemini key validation failed: %s", err_msg)
            return False, f"Gemini connection failed: {err_msg}"

    @staticmethod
    def _get_client(explicit_key: Optional[str] = None) -> genai.Client:
        key = explicit_key or get_gemini_api_key()
        if not key:
            raise GeminiNotConfiguredError(
                "Gemini API key is not configured. Please set your key in AI Settings or via GEMINI_API_KEY."
            )
        return genai.Client(api_key=key)

    @staticmethod
    def _generate_with_fallback(client: genai.Client, contents: Any, config: types.GenerateContentConfig) -> Tuple[Any, str]:
        """
        Executes Gemini generation with automatic fallback to high-availability flash models
        if the primary model experiences temporary quota or capacity limits.
        """
        candidate_models = [settings.GEMINI_MODEL]
        for m in ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash"]:
            if m not in candidate_models:
                candidate_models.append(m)

        last_err = None
        for model_name in candidate_models:
            try:
                resp = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config
                )
                if resp and resp.text:
                    return resp, model_name
            except Exception as e:
                last_err = e
                logger.warning("Gemini model %s encountered exception: %s. Trying fallback model...", model_name, str(e)[:120])
                continue
        raise last_err or GeminiApiError("All candidate Gemini models failed.")

    @staticmethod
    def analyze_company(
        company: Company,
        record: FinancialRecord,
        analysis: Optional[AnalysisHistory] = None
    ) -> AiFinancialAnalysisResponse:
        """
        Runs comprehensive executive shareholder value analysis using Gemini.
        Grounded strictly in backend-calculated metrics.
        """
        client = GeminiService._get_client()

        # If analysis history not provided, calculate real-time
        if not analysis:
            engine_in = FinancialEngineInput(
                revenue=record.revenue,
                operating_profit=record.operating_profit,
                net_profit=record.net_profit,
                tax_rate=record.tax_rate,
                total_debt=record.total_debt,
                shareholders_equity=record.shareholders_equity,
                invested_capital=record.invested_capital,
                wacc=record.wacc,
                prev_revenue=record.prev_revenue,
                prev_operating_profit=record.prev_operating_profit,
                prev_net_profit=record.prev_net_profit,
                prev_total_debt=record.prev_total_debt,
                prev_invested_capital=record.prev_invested_capital,
                prev_shareholders_equity=record.prev_shareholders_equity,
                prev_wacc=record.prev_wacc,
            )
            calc = FinancialEngine.calculate(engine_in)
        else:
            calc = analysis

        prompt = f"""
You are the Chief Financial Officer and Senior Valuation Analyst for VALORA AI.
Analyze the following corporate financial data and calculated shareholder value metrics for:
Company: {company.name} ({company.ticker})
Sector: {company.sector}
Fiscal Period: {record.fiscal_year}

=== FINANCIAL STATEMENTS (VERIFIED GROUND TRUTH) ===
- Total Revenue: ${record.revenue:,.2f}
- Operating Profit (EBIT): ${record.operating_profit:,.2f}
- Net Profit: ${record.net_profit:,.2f}
- Corporate Tax Rate: {record.tax_rate}%
- Total Debt: ${record.total_debt:,.2f}
- Shareholders' Equity: ${record.shareholders_equity:,.2f}
- Invested Capital: ${record.invested_capital:,.2f}
- WACC (Hurdle Rate): {record.wacc}%
- Prior Year Revenue: ${record.prev_revenue or 0:,.2f}
- Prior Year Operating Profit: ${record.prev_operating_profit or 0:,.2f}

=== DETERMINISTIC METRICS (COMPUTED BY VALORA ENGINE) ===
- NOPAT: ${calc.nopat:,.2f}
- Capital Charge: ${calc.capital_charge:,.2f}
- Economic Value Added (EVA): ${calc.eva:,.2f} (Verdict: {'Value Accretive' if calc.is_value_creating else 'Value Dilutive / Destroying'})
- ROIC: {calc.roic:.2f}% vs WACC: {record.wacc:.2f}% (Spread: {calc.value_spread:.2f}%)
- Return on Equity (ROE): {calc.roe:.2f}%
- Return on Investment (ROI): {calc.roi:.2f}%
- Operating Margin: {calc.operating_margin:.2f}%
- Net Profit Margin: {calc.net_profit_margin:.2f}%
- Debt Ratio: {calc.debt_ratio:.2f}%
- Debt-to-Equity: {calc.debt_to_equity:.2f}x
- Shareholder Value Score: {calc.shareholder_value_score}/100 ({calc.score_classification})

CRITICAL INSTRUCTIONS:
1. Do NOT recalculate or contradict any of the numbers above. All numbers are verified by the Valora Financial Engine.
2. Provide deep, board-level strategic diagnostic commentary:
   - Why is the company creating or destroying value?
   - Evaluate the ROIC vs WACC spread.
   - Assess capital structure solvency (Debt to Equity) and interest burden.
   - Formulate actionable, prioritized recommendations across Capital Allocation, Debt Management, and Profitability.
   - For each recommendation, provide the financial reasoning, expected impact, priority ('High', 'Medium', 'Low'), and suggested timeframe.
   - Provide a 4-step prioritized action plan and short/long-term outlooks.
"""

        try:
            response, used_model = GeminiService._generate_with_fallback(
                client=client,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AiFinancialAnalysisResponse,
                    temperature=0.2,
                )
            )

            if not response.text:
                raise GeminiApiError("Gemini returned empty response text.")

            data = json.loads(response.text)
            # Ensure identifiers are consistent
            data["company_name"] = company.name
            data["ticker"] = company.ticker
            data["fiscal_year"] = record.fiscal_year
            data["model_used"] = used_model
            data["generated_at"] = datetime.now(timezone.utc).isoformat()

            return AiFinancialAnalysisResponse.model_validate(data)
        except GeminiNotConfiguredError:
            raise
        except Exception as e:
            err_msg = str(e)
            logger.error("Gemini financial analysis error: %s", err_msg)
            raise GeminiApiError(f"AI Financial Analysis failed: {err_msg}")

    @staticmethod
    def chat(
        company: Company,
        record: FinancialRecord,
        analysis: Optional[AnalysisHistory],
        user_message: str,
        history: List[ChatMessage]
    ) -> AiChatResponse:
        """
        Interactive advisory chat grounded in the selected company's financial metrics.
        Enforces company context isolation and prevents hallucination.
        """
        client = GeminiService._get_client()

        # If analysis history not provided, calculate real-time
        if not analysis:
            engine_in = FinancialEngineInput(
                revenue=record.revenue,
                operating_profit=record.operating_profit,
                net_profit=record.net_profit,
                tax_rate=record.tax_rate,
                total_debt=record.total_debt,
                shareholders_equity=record.shareholders_equity,
                invested_capital=record.invested_capital,
                wacc=record.wacc,
                prev_revenue=record.prev_revenue,
                prev_operating_profit=record.prev_operating_profit,
                prev_net_profit=record.prev_net_profit,
                prev_total_debt=record.prev_total_debt,
                prev_invested_capital=record.prev_invested_capital,
                prev_shareholders_equity=record.prev_shareholders_equity,
                prev_wacc=record.prev_wacc,
            )
            calc = FinancialEngine.calculate(engine_in)
        else:
            calc = analysis

        system_instruction = f"""
You are the Valora AI Executive Valuation Agent advising the executive leadership of {company.name} ({company.ticker}).
Sector: {company.sector}
Fiscal Period: {record.fiscal_year}

=== CURRENT FINANCIAL METRICS (SOURCE OF TRUTH) ===
- Revenue: ${record.revenue:,.2f}
- Operating Profit (EBIT): ${record.operating_profit:,.2f} (Margin: {calc.operating_margin:.2f}%)
- Net Profit: ${record.net_profit:,.2f} (Margin: {calc.net_profit_margin:.2f}%)
- Tax Rate: {record.tax_rate}%
- Invested Capital: ${record.invested_capital:,.2f}
- Hurdle WACC: {record.wacc:.2f}%
- NOPAT: ${calc.nopat:,.2f}
- Capital Charge: ${calc.capital_charge:,.2f}
- Economic Value Added (EVA): ${calc.eva:,.2f} ({'Value Accretive' if calc.is_value_creating else 'Value Dilutive'})
- ROIC: {calc.roic:.2f}% | Spread vs WACC: {calc.value_spread:.2f}%
- ROE: {calc.roe:.2f}% | ROI: {calc.roi:.2f}%
- Total Debt: ${record.total_debt:,.2f} | Shareholders' Equity: ${record.shareholders_equity:,.2f}
- Debt-to-Equity: {calc.debt_to_equity:.2f}x | Debt Ratio: {calc.debt_ratio:.2f}%
- Shareholder Value Score: {calc.shareholder_value_score}/100 ({calc.score_classification})

CORE OPERATING DIRECTIVES:
1. Strict Context Isolation: You are evaluating ONLY {company.name}. Do NOT reference or mix data from other companies.
2. Grounded Valuation: Ground every response in the actual calculated metrics above. Never invent alternate values.
3. Concise & Strategic: Be concise, clear, and actionable. Avoid generic fluff. Explain exact levers (e.g. margin expansion, debt paydown, working capital release, or capex hurdle thresholds).
"""

        # Format conversation messages
        contents = []
        for h in history[-8:]:  # Keep recent context window
            role = "user" if h.role == "user" else "model"
            contents.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=h.content)]
            ))

        # Append current user question
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_message)]
        ))

        try:
            response, used_model = GeminiService._generate_with_fallback(
                client=client,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.3,
                    max_output_tokens=750,
                )
            )

            reply_text = response.text or "I was unable to generate a response for this query."

            # Detect referenced financial metrics for UI tags
            metrics_found = []
            keywords = ["EVA", "ROIC", "ROE", "WACC", "NOPAT", "Debt", "Margin", "Invested Capital", "Spread"]
            for kw in keywords:
                if kw.lower() in reply_text.lower():
                    metrics_found.append(kw)

            return AiChatResponse(
                reply=reply_text,
                company_id=company.id,
                company_name=company.name,
                ticker=company.ticker,
                metrics_referenced=metrics_found,
                model_used=used_model
            )
        except GeminiNotConfiguredError:
            raise
        except Exception as e:
            err_msg = str(e)
            logger.error("Gemini chat error: %s", err_msg)
            raise GeminiApiError(f"AI Assistant inquiry failed: {err_msg}")

    @staticmethod
    def explain_scenario(
        company: Company,
        request: AiScenarioExplainRequest
    ) -> AiScenarioExplainResponse:
        """
        Interprets a calculated scenario simulation without recalculating the numbers.
        """
        client = GeminiService._get_client()

        prompt = f"""
You are the Valora AI Executive Valuation Agent interpreting a simulated strategic capital allocation decision.
Company: {company.name} ({company.ticker})
Sector: {company.sector}
Scenario Name: {request.scenario_name}
Scenario Category: {request.scenario_type}

=== ASSUMPTIONS APPLIED ===
{json.dumps(request.assumptions, indent=2)}

=== BASELINE FINANCIAL METRICS ===
{json.dumps(request.baseline_metrics, indent=2)}

=== PROJECTED FINANCIAL OUTCOMES (CALCULATED BY VALORA ENGINE) ===
{json.dumps(request.projected_metrics, indent=2)}

CRITICAL INSTRUCTIONS:
1. The numbers above were calculated by the deterministic Valora Financial Engine. Do NOT recalculate or modify them.
2. Provide an executive summary of what changed and why it matters.
3. Render a verdict: 'Value Accretive', 'Value Dilutive', or 'Neutral'.
4. Explain the impact on EVA, ROIC vs WACC spread, and balance sheet solvency.
5. Provide 2-4 concrete strategic recommendations for leadership based on this scenario.
"""

        try:
            response, used_model = GeminiService._generate_with_fallback(
                client=client,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AiScenarioExplainResponse,
                    temperature=0.2,
                )
            )

            if not response.text:
                raise GeminiApiError("Gemini returned empty response for scenario interpretation.")

            data = json.loads(response.text)
            data["model_used"] = used_model
            return AiScenarioExplainResponse.model_validate(data)
        except GeminiNotConfiguredError:
            raise
        except Exception as e:
            err_msg = str(e)
            logger.error("Gemini scenario explanation error: %s", err_msg)
            raise GeminiApiError(f"Scenario AI interpretation failed: {err_msg}")
