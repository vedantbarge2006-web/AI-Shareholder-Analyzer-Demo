import io
import datetime
from typing import Optional, List, Dict, Any

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.models.company import Company
from app.models.financial_record import FinancialRecord
from app.models.analysis_history import AnalysisHistory
from app.schemas.financial import ValueAnalysisOutputSchema


class ExcelReportService:
    """
    Generates professional multi-tab Excel workbooks for VALORA AI
    audits with rich styling, number formatting, and conditional highlighting.
    """

    # Color Palette
    COLOR_PRIMARY = "0F172A"       # Deep Slate 900
    COLOR_SECONDARY = "1E293B"     # Slate 800
    COLOR_TEXT_LIGHT = "FFFFFF"
    COLOR_ACCENT = "059669"        # Emerald 600
    COLOR_BG_LIGHT = "F8FAFC"      # Slate 50
    COLOR_BORDER = "CBD5E1"        # Slate 300
    
    # Conditional Fills
    FILL_POS_BG = "D1FAE5"         # Light Emerald
    COLOR_POS_TXT = "065F46"       # Dark Emerald
    FILL_NEG_BG = "FEE2E2"         # Light Rose
    COLOR_NEG_TXT = "991B1B"       # Dark Rose

    @classmethod
    def generate_workbook(
        cls,
        company: Company,
        record: FinancialRecord,
        analysis: ValueAnalysisOutputSchema,
        ai_data: Optional[Dict[str, Any]] = None,
        history: Optional[List[AnalysisHistory]] = None,
    ) -> bytes:
        wb = openpyxl.Workbook()
        
        # Styles
        font_brand = Font(name="Calibri", size=15, bold=True, color=cls.COLOR_TEXT_LIGHT)
        font_sheet_title = Font(name="Calibri", size=13, bold=True, color=cls.COLOR_PRIMARY)
        font_section_hdr = Font(name="Calibri", size=11, bold=True, color=cls.COLOR_TEXT_LIGHT)
        font_tbl_hdr = Font(name="Calibri", size=10, bold=True, color=cls.COLOR_TEXT_LIGHT)
        font_bold = Font(name="Calibri", size=10, bold=True, color=cls.COLOR_PRIMARY)
        font_regular = Font(name="Calibri", size=10, color="1E293B")
        font_muted = Font(name="Calibri", size=9, italic=True, color="64748B")

        fill_primary = PatternFill(start_color=cls.COLOR_PRIMARY, end_color=cls.COLOR_PRIMARY, fill_type="solid")
        fill_secondary = PatternFill(start_color=cls.COLOR_SECONDARY, end_color=cls.COLOR_SECONDARY, fill_type="solid")
        fill_subtle = PatternFill(start_color=cls.COLOR_BG_LIGHT, end_color=cls.COLOR_BG_LIGHT, fill_type="solid")
        fill_pos = PatternFill(start_color=cls.FILL_POS_BG, end_color=cls.FILL_POS_BG, fill_type="solid")
        font_pos = Font(name="Calibri", size=10, bold=True, color=cls.COLOR_POS_TXT)
        fill_neg = PatternFill(start_color=cls.FILL_NEG_BG, end_color=cls.FILL_NEG_BG, fill_type="solid")
        font_neg = Font(name="Calibri", size=10, bold=True, color=cls.COLOR_NEG_TXT)

        thin_side = Side(border_style="thin", color=cls.COLOR_BORDER)
        border_box = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
        border_bottom_double = Border(bottom=Side(border_style="double", color=cls.COLOR_PRIMARY), top=thin_side)

        align_left = Alignment(horizontal="left", vertical="center")
        align_right = Alignment(horizontal="right", vertical="center")
        align_center = Alignment(horizontal="center", vertical="center")

        # Number Formats
        FMT_CURRENCY = '"$"#,##0'
        FMT_PERCENT = '0.00%'
        FMT_RATIO = '0.00"x"'
        FMT_POINTS = '#,##0" pts"'

        # =========================================================================
        # SHEET 1: EXECUTIVE VALUATION
        # =========================================================================
        ws1 = wb.active
        ws1.title = "Executive Valuation"
        ws1.views.sheetView[0].showGridLines = True

        # Header Title Banner
        ws1.merge_cells("A1:G1")
        ws1["A1"] = f"VALORA AI — EXECUTIVE SHAREHOLDER VALUE AUDIT"
        ws1["A1"].font = font_brand
        ws1["A1"].fill = fill_primary
        ws1["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
        ws1.row_dimensions[1].height = 36

        # Subtitle
        ws1["A2"] = f"Enterprise Valuation & Economic Value Added (EVA®) Audit • Certified on {datetime.date.today().strftime('%B %d, %Y')}"
        ws1["A2"].font = font_muted
        ws1.row_dimensions[2].height = 20

        # Company Metadata Table
        ws1["A4"] = "Company Name:"
        ws1["A4"].font = font_bold
        ws1["B4"] = company.name
        ws1["B4"].font = font_regular

        ws1["D4"] = "Stock Ticker:"
        ws1["D4"].font = font_bold
        ws1["E4"] = company.ticker
        ws1["E4"].font = font_bold

        ws1["A5"] = "Sector:"
        ws1["A5"].font = font_bold
        ws1["B5"] = company.sector
        ws1["B5"].font = font_regular

        ws1["D5"] = "Reporting Period:"
        ws1["D5"].font = font_bold
        ws1["E5"] = record.fiscal_year or "FY 2024"
        ws1["E5"].font = font_bold

        ws1["A6"] = "Invested Capital:"
        ws1["A6"].font = font_bold
        ws1["B6"] = record.invested_capital
        ws1["B6"].number_format = FMT_CURRENCY
        ws1["B6"].font = font_regular

        ws1["D6"] = "WACC Hurdle Rate:"
        ws1["D6"].font = font_bold
        ws1["E6"] = record.wacc / 100.0
        ws1["E6"].number_format = FMT_PERCENT
        ws1["E6"].font = font_bold

        ws1["A7"] = "Value Creation Status:"
        ws1["A7"].font = font_bold
        ws1["B7"] = "VALUE ACCRETIVE (+EVA)" if analysis.is_value_creating else "VALUE DILUTIVE (-EVA)"
        ws1["B7"].fill = fill_pos if analysis.is_value_creating else fill_neg
        ws1["B7"].font = font_pos if analysis.is_value_creating else font_neg

        ws1["D7"] = "Shareholder Score:"
        ws1["D7"].font = font_bold
        ws1["E7"] = f"{analysis.shareholder_value_score} / 100 ({analysis.score_classification})"
        ws1["E7"].font = font_bold

        # Section: Key Metric Scorecard Table
        ws1["A9"] = "Key Valuation & Capital Productivity Scorecard"
        ws1["A9"].font = font_sheet_title

        headers_s1 = ["Metric", "Description / Basis", "Current Period", "Prior Period", "Hurdle / Benchmark", "Variance / Spread", "Status"]
        for col_idx, h in enumerate(headers_s1, start=1):
            cell = ws1.cell(row=10, column=col_idx, value=h)
            cell.font = font_tbl_hdr
            cell.fill = fill_secondary
            cell.alignment = align_center if col_idx > 2 else align_left
            cell.border = border_box
        ws1.row_dimensions[10].height = 24

        rows_s1 = [
            ("Revenue", "Topline gross revenue", record.revenue, record.prev_revenue, "Expansion Target", (analysis.revenue_growth or 0) / 100.0, "Topline Volume", FMT_CURRENCY, True),
            ("Operating Profit (EBIT)", "Core operating earnings", record.operating_profit, record.prev_operating_profit, f"Margin: {analysis.operating_margin:.1f}%", None, "Operating Earnings", FMT_CURRENCY, False),
            ("NOPAT", "Operating Profit after tax", analysis.nopat, analysis.prev_nopat, f"Tax Rate: {record.tax_rate:.1f}%", None, "Core Operating Cash", FMT_CURRENCY, False),
            ("Capital Charge", "Invested Capital × WACC Hurdle", analysis.capital_charge, analysis.prev_capital_charge, f"Hurdle: {record.wacc:.1f}%", None, "Required Hurdle", FMT_CURRENCY, False),
            ("Economic Value Added (EVA®)", "NOPAT − Capital Charge", analysis.eva, analysis.prev_eva, "> $0.00 Surplus", (analysis.eva_growth or 0) / 100.0, "Value Accretive" if analysis.is_value_creating else "Value Dilutive", FMT_CURRENCY, True),
            ("Return on Invested Capital (ROIC)", "NOPAT ÷ Invested Capital", analysis.roic / 100.0, (analysis.prev_roic or 0) / 100.0 if analysis.prev_roic else None, record.wacc / 100.0, (analysis.value_spread or 0) / 100.0, "Beats Hurdle" if analysis.roic >= record.wacc else "Sub-Hurdle", FMT_PERCENT, True),
            ("ROIC - WACC Value Spread", "Economic spread over cost of capital", analysis.value_spread / 100.0, (analysis.prev_value_spread or 0) / 100.0 if analysis.prev_value_spread else None, "> 0.00% Spread", None, "Positive Spread" if analysis.value_spread >= 0 else "Negative Spread", FMT_PERCENT, False),
            ("Return on Equity (ROE)", "Net Profit ÷ Shareholders' Equity", analysis.roe / 100.0, (analysis.prev_roe or 0) / 100.0 if analysis.prev_roe else None, 0.12, None, "Accretive Return" if analysis.roe >= 12 else "Sub-benchmark", FMT_PERCENT, False),
            ("Return on Investment (ROI)", "Net Profit ÷ Invested Capital", analysis.roi / 100.0, (analysis.prev_roi or 0) / 100.0 if analysis.prev_roi else None, "Capital Benchmark", None, "Capital Efficiency", FMT_PERCENT, False),
            ("Debt Ratio (Leverage)", "Total Debt ÷ Total Capital", analysis.debt_ratio / 100.0, (analysis.prev_debt_ratio or 0) / 100.0 if analysis.prev_debt_ratio else None, "< 40.0% Target", (analysis.debt_ratio_change or 0) / 100.0, "Prudent" if analysis.debt_ratio <= 40 else "High Leverage", FMT_PERCENT, True),
            ("Debt-to-Equity Ratio", "Total Debt ÷ Shareholders' Equity", analysis.debt_to_equity, None, "< 1.00x Target", None, "Conservative" if analysis.debt_to_equity <= 1.0 else "Elevated Debt", FMT_RATIO, False),
            ("Operating Profit Margin", "EBIT ÷ Revenue", analysis.operating_margin / 100.0, None, "Industry Norm", None, "Margin Health", FMT_PERCENT, False),
            ("Net Profit Margin", "Net Profit ÷ Revenue", analysis.net_profit_margin / 100.0, None, "Bottom-line Conversion", None, "Net Margin", FMT_PERCENT, False),
        ]

        curr_row = 11
        for row_data in rows_s1:
            name, desc, cur_val, prev_val, hurdle, var_val, status_str, num_fmt, is_var_pct = row_data
            ws1.cell(row=curr_row, column=1, value=name).font = font_bold if "EVA" in name or "ROIC" in name else font_regular
            ws1.cell(row=curr_row, column=2, value=desc).font = font_muted
            
            c_val = ws1.cell(row=curr_row, column=3, value=cur_val)
            c_val.font = font_bold if "EVA" in name or "ROIC" in name else font_regular
            if num_fmt and cur_val is not None:
                c_val.number_format = num_fmt
            c_val.alignment = align_right

            p_val = ws1.cell(row=curr_row, column=4, value=prev_val if prev_val is not None else "N/A")
            if isinstance(prev_val, (int, float)) and num_fmt:
                p_val.number_format = num_fmt
                p_val.alignment = align_right
            else:
                p_val.alignment = align_center

            h_cell = ws1.cell(row=curr_row, column=5, value=hurdle)
            if isinstance(hurdle, (int, float)):
                h_cell.number_format = FMT_PERCENT
                h_cell.alignment = align_right
            else:
                h_cell.alignment = align_center

            v_cell = ws1.cell(row=curr_row, column=6, value=var_val if var_val is not None else "—")
            if isinstance(var_val, (int, float)):
                v_cell.number_format = FMT_PERCENT
                v_cell.alignment = align_right
            else:
                v_cell.alignment = align_center

            s_cell = ws1.cell(row=curr_row, column=7, value=status_str)
            s_cell.alignment = align_center

            # Conditional Highlights
            if "EVA" in name:
                c_val.fill = fill_pos if analysis.is_value_creating else fill_neg
                c_val.font = font_pos if analysis.is_value_creating else font_neg
                s_cell.fill = fill_pos if analysis.is_value_creating else fill_neg
                s_cell.font = font_pos if analysis.is_value_creating else font_neg
            elif "Spread" in name:
                c_val.fill = fill_pos if analysis.value_spread >= 0 else fill_neg
                c_val.font = font_pos if analysis.value_spread >= 0 else font_neg

            for col in range(1, 8):
                ws1.cell(row=curr_row, column=col).border = border_box

            ws1.row_dimensions[curr_row].height = 20
            curr_row += 1

        # =========================================================================
        # SHEET 2: FINANCIAL STATEMENTS & INPUTS
        # =========================================================================
        ws2 = wb.create_sheet(title="Financial Statements")
        ws2.views.sheetView[0].showGridLines = True

        ws2.merge_cells("A1:F1")
        ws2["A1"] = f"{company.name} — Statement Figures & Baseline Comparison"
        ws2["A1"].font = font_brand
        ws2["A1"].fill = fill_primary
        ws2["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
        ws2.row_dimensions[1].height = 32

        headers_s2 = ["Financial Statement Item", "Current Period Value", "Prior Period Value", "YoY Change ($)", "YoY Growth (%)", "Classification"]
        for col_idx, h in enumerate(headers_s2, start=1):
            cell = ws2.cell(row=3, column=col_idx, value=h)
            cell.font = font_tbl_hdr
            cell.fill = fill_secondary
            cell.alignment = align_center if col_idx > 1 else align_left
            cell.border = border_box
        ws2.row_dimensions[3].height = 24

        items_s2 = [
            ("Gross Revenue", record.revenue, record.prev_revenue, "Income Statement", FMT_CURRENCY),
            ("Operating Profit (EBIT)", record.operating_profit, record.prev_operating_profit, "Income Statement", FMT_CURRENCY),
            ("Net Profit After Tax", record.net_profit, record.prev_net_profit, "Income Statement", FMT_CURRENCY),
            ("Effective Corporate Tax Rate", record.tax_rate / 100.0, (record.prev_wacc or record.wacc) / 100.0 if False else record.tax_rate / 100.0, "Tax Assumptions", FMT_PERCENT),
            ("Total Debt (Short & Long Term)", record.total_debt, record.prev_total_debt, "Balance Sheet", FMT_CURRENCY),
            ("Shareholders' Equity (Book Value)", record.shareholders_equity, record.prev_shareholders_equity, "Balance Sheet", FMT_CURRENCY),
            ("Total Invested Capital", record.invested_capital, record.prev_invested_capital, "Capital Base", FMT_CURRENCY),
            ("Weighted Average Cost of Capital (WACC)", record.wacc / 100.0, (record.prev_wacc / 100.0) if record.prev_wacc else None, "Hurdle Assumption", FMT_PERCENT),
        ]

        curr_row = 4
        for name, cur, prev, category, num_fmt in items_s2:
            ws2.cell(row=curr_row, column=1, value=name).font = font_regular
            c_val = ws2.cell(row=curr_row, column=2, value=cur)
            c_val.number_format = num_fmt
            c_val.alignment = align_right

            p_val = ws2.cell(row=curr_row, column=3, value=prev if prev is not None else "N/A")
            if isinstance(prev, (int, float)):
                p_val.number_format = num_fmt
                p_val.alignment = align_right
            else:
                p_val.alignment = align_center

            # Delta ($) and Delta (%)
            if prev is not None and isinstance(prev, (int, float)) and num_fmt == FMT_CURRENCY:
                delta_d = cur - prev
                delta_p = (cur - prev) / prev if prev != 0 else 0
                d_cell = ws2.cell(row=curr_row, column=4, value=delta_d)
                d_cell.number_format = FMT_CURRENCY
                d_cell.alignment = align_right
                p_cell = ws2.cell(row=curr_row, column=5, value=delta_p)
                p_cell.number_format = FMT_PERCENT
                p_cell.alignment = align_right
            else:
                ws2.cell(row=curr_row, column=4, value="—").alignment = align_center
                ws2.cell(row=curr_row, column=5, value="—").alignment = align_center

            ws2.cell(row=curr_row, column=6, value=category).alignment = align_left

            for col in range(1, 7):
                ws2.cell(row=curr_row, column=col).border = border_box
            ws2.row_dimensions[curr_row].height = 20
            curr_row += 1

        # =========================================================================
        # SHEET 3: SCORE ATTRIBUTION BREAKDOWN
        # =========================================================================
        ws3 = wb.create_sheet(title="Score Attribution")
        ws3.views.sheetView[0].showGridLines = True

        ws3.merge_cells("A1:E1")
        ws3["A1"] = f"{company.name} — Shareholder Value Creation Score Breakdown"
        ws3["A1"].font = font_brand
        ws3["A1"].fill = fill_primary
        ws3["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
        ws3.row_dimensions[1].height = 32

        headers_s3 = ["Scoring Component", "Attributed Points", "Allowed Range", "Benchmark Hurdle", "Interpretation"]
        for col_idx, h in enumerate(headers_s3, start=1):
            cell = ws3.cell(row=3, column=col_idx, value=h)
            cell.font = font_tbl_hdr
            cell.fill = fill_secondary
            cell.alignment = align_center if col_idx > 1 else align_left
            cell.border = border_box
        ws3.row_dimensions[3].height = 24

        bd = analysis.score_breakdown
        score_rows_s3 = [
            ("Base Score", bd.base_score if bd else 50, "50 pts", "Neutral baseline", "Standard market-neutral anchor"),
            ("Value Spread Points (ROIC - WACC)", bd.value_spread_points if bd else 0.0, "-25 to +25 pts", "WACC Hurdle Rate", "Rewards excess capital returns above investor cost of capital"),
            ("ROE Performance Points", bd.roe_points if bd else 0.0, "-15 to +15 pts", "12.0% Equity Hurdle", "Evaluates equity return productivity vs institutional hurdle"),
            ("Topline Revenue Growth Points", bd.growth_points if bd else 0.0, "-10 to +10 pts", "0.0% YoY", "Incentivizes profitable revenue expansion"),
            ("Balance Sheet Solvency Points", bd.solvency_points if bd else 0.0, "-15 to +5 pts", "Debt/Equity <= 0.6x", "Penalizes excessive financial leverage and rewards balance sheet safety"),
            ("FINAL SHAREHOLDER VALUE SCORE", bd.final_score if bd else analysis.shareholder_value_score, "0 to 100 pts", "75+ Strong Creator", bd.classification if bd else analysis.score_classification),
        ]

        curr_row = 4
        for name, pts, rng, hurdle, interp in score_rows_s3:
            ws3.cell(row=curr_row, column=1, value=name).font = font_bold if "FINAL" in name else font_regular
            p_cell = ws3.cell(row=curr_row, column=2, value=pts)
            p_cell.font = font_bold if "FINAL" in name else font_regular
            p_cell.alignment = align_right
            if isinstance(pts, (int, float)):
                p_cell.number_format = '#,##0.0" pts"' if isinstance(pts, float) else '#,##0" pts"'

            ws3.cell(row=curr_row, column=3, value=rng).alignment = align_center
            ws3.cell(row=curr_row, column=4, value=hurdle).alignment = align_left
            ws3.cell(row=curr_row, column=5, value=interp).alignment = align_left

            if "FINAL" in name:
                ws3.cell(row=curr_row, column=1).fill = fill_pos if analysis.is_value_creating else fill_neg
                p_cell.fill = fill_pos if analysis.is_value_creating else fill_neg

            for col in range(1, 6):
                ws3.cell(row=curr_row, column=col).border = border_box
            ws3.row_dimensions[curr_row].height = 22 if "FINAL" in name else 20
            curr_row += 1

        # =========================================================================
        # SHEET 4: HISTORICAL AUDITS ARCHIVE (When available)
        # =========================================================================
        if history and len(history) > 0:
            ws4 = wb.create_sheet(title="Audit History")
            ws4.views.sheetView[0].showGridLines = True

            ws4.merge_cells("A1:H1")
            ws4["A1"] = f"{company.name} — Historical Shareholder Value Audit Snapshots"
            ws4["A1"].font = font_brand
            ws4["A1"].fill = fill_primary
            ws4["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
            ws4.row_dimensions[1].height = 32

            headers_s4 = ["Audit ID", "Date Recorded", "Fiscal Period", "EVA ($)", "ROIC (%)", "ROE (%)", "Debt Ratio (%)", "Value Score"]
            for col_idx, h in enumerate(headers_s4, start=1):
                cell = ws4.cell(row=3, column=col_idx, value=h)
                cell.font = font_tbl_hdr
                cell.fill = fill_secondary
                cell.alignment = align_center if col_idx > 1 else align_left
                cell.border = border_box
            ws4.row_dimensions[3].height = 24

            curr_row = 4
            for h in history:
                ws4.cell(row=curr_row, column=1, value=f"AUD-{h.id:04d}").font = font_bold
                ws4.cell(row=curr_row, column=2, value=h.created_at.strftime("%Y-%m-%d %H:%M") if h.created_at else "N/A").alignment = align_center
                ws4.cell(row=curr_row, column=3, value=h.period).alignment = align_center
                
                c_eva = ws4.cell(row=curr_row, column=4, value=h.eva)
                c_eva.number_format = FMT_CURRENCY
                c_eva.alignment = align_right
                if h.eva >= 0:
                    c_eva.font = font_pos
                else:
                    c_eva.font = font_neg

                c_roic = ws4.cell(row=curr_row, column=5, value=h.roic / 100.0)
                c_roic.number_format = FMT_PERCENT
                c_roic.alignment = align_right

                c_roe = ws4.cell(row=curr_row, column=6, value=h.roe / 100.0)
                c_roe.number_format = FMT_PERCENT
                c_roe.alignment = align_right

                c_debt = ws4.cell(row=curr_row, column=7, value=h.debt_ratio / 100.0)
                c_debt.number_format = FMT_PERCENT
                c_debt.alignment = align_right

                c_score = ws4.cell(row=curr_row, column=8, value=f"{h.shareholder_value_score}/100")
                c_score.alignment = align_center
                c_score.font = font_bold

                for col in range(1, 9):
                    ws4.cell(row=curr_row, column=col).border = border_box
                ws4.row_dimensions[curr_row].height = 20
                curr_row += 1

        # =========================================================================
        # Auto-fit Column Widths across all sheets
        # =========================================================================
        for sheet in wb.worksheets:
            for col in sheet.columns:
                max_len = 0
                col_letter = get_column_letter(col[0].column)
                for cell in col:
                    # Ignore title rows with merged cells for width calculation
                    if cell.row in [1, 2]:
                        continue
                    if cell.value:
                        val_str = str(cell.value)
                        max_len = max(max_len, len(val_str))
                sheet.column_dimensions[col_letter].width = max(max_len + 4, 12)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
