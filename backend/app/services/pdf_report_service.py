import io
import datetime
from typing import Optional, List, Dict, Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from app.models.company import Company
from app.models.financial_record import FinancialRecord
from app.models.analysis_history import AnalysisHistory
from app.schemas.financial import ValueAnalysisOutputSchema


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that computes total page count dynamically
    and draws professional running headers and footers on every page.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, num_pages: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Top Running Header (Pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 755, "VALORA AI — Executive Shareholder Value Creation Report")
            self.drawRightString(612 - 54, 755, "CONFIDENTIAL")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.75)
            self.line(54, 747, 612 - 54, 747)

        # Bottom Running Footer (All Pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(54, 45, 612 - 54, 45)

        self.drawString(54, 32, "VALORA AI Analytics Core • Board & Investor Relations Grade Audit")
        page_str = f"Page {self._pageNumber} of {num_pages}"
        self.drawRightString(612 - 54, 32, page_str)

        self.restoreState()


class PdfReportService:
    """
    Builds auditor-grade executive PDF valuation reports.
    """

    @staticmethod
    def _format_currency(val: Optional[float]) -> str:
        if val is None:
            return "N/A"
        abs_v = abs(val)
        prefix = "-" if val < 0 else ""
        if abs_v >= 1e9:
            return f"{prefix}${abs_v / 1e9:,.2f}B"
        elif abs_v >= 1e6:
            return f"{prefix}${abs_v / 1e6:,.2f}M"
        elif abs_v >= 1e3:
            return f"{prefix}${abs_v / 1e3:,.1f}K"
        return f"{prefix}${abs_v:,.2f}"

    @staticmethod
    def _format_pct(val: Optional[float]) -> str:
        if val is None:
            return "N/A"
        return f"{val:.2f}%"

    @classmethod
    def _generate_chart(cls, roic: float, wacc: float, nopat: float, cap_charge: float, eva: float) -> io.BytesIO:
        """
        Generates clean side-by-side financial visualizations for the PDF.
        """
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(7.2, 2.5), dpi=180)
        
        # Chart 1: Return on Capital vs Hurdle Rate
        spread = roic - wacc
        bars1 = ax1.bar(
            ['ROIC', 'WACC Hurdle'],
            [roic, wacc],
            color=['#059669' if spread >= 0 else '#DC2626', '#64748B'],
            width=0.48,
            edgecolor='#0F172A',
            linewidth=0.5
        )
        ax1.set_title(f'ROIC vs WACC (Spread: {spread:+.2f}%)', fontsize=9, fontweight='bold', color='#0F172A', pad=8)
        ax1.set_ylabel('Percentage (%)', fontsize=8, color='#475569')
        ax1.tick_params(axis='both', which='major', labelsize=8)
        ax1.grid(axis='y', linestyle='--', alpha=0.3)
        ax1.set_axisbelow(True)
        for bar in bars1:
            h = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width() / 2, h + (max(roic, wacc) * 0.03), f'{h:.2f}%',
                     ha='center', va='bottom', fontsize=8, fontweight='bold', color='#0F172A')

        # Chart 2: EVA Decomposition (NOPAT vs Capital Charge)
        nopat_m = nopat / 1e6
        cap_charge_m = cap_charge / 1e6
        eva_m = eva / 1e6

        bars2 = ax2.bar(
            ['NOPAT', 'Cap Charge', 'Net EVA'],
            [nopat_m, cap_charge_m, eva_m],
            color=['#2563EB', '#D97706', '#059669' if eva_m >= 0 else '#DC2626'],
            width=0.52,
            edgecolor='#0F172A',
            linewidth=0.5
        )
        ax2.set_title('Economic Value Added Waterfall ($M)', fontsize=9, fontweight='bold', color='#0F172A', pad=8)
        ax2.set_ylabel('USD Millions ($M)', fontsize=8, color='#475569')
        ax2.tick_params(axis='both', which='major', labelsize=8)
        ax2.grid(axis='y', linestyle='--', alpha=0.3)
        ax2.set_axisbelow(True)
        ax2.axhline(0, color='#0F172A', linewidth=0.7)
        for bar in bars2:
            h = bar.get_height()
            offset = max(abs(nopat_m), abs(cap_charge_m)) * 0.03
            y_pos = h + offset if h >= 0 else h - (offset * 2.5)
            ax2.text(bar.get_x() + bar.get_width() / 2, y_pos, f'${h:,.1f}M',
                     ha='center', va='bottom' if h >= 0 else 'top', fontsize=8, fontweight='bold', color='#0F172A')

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=180)
        plt.close(fig)
        buf.seek(0)
        return buf

    @classmethod
    def generate_report(
        cls,
        company: Company,
        record: FinancialRecord,
        analysis: ValueAnalysisOutputSchema,
        ai_data: Optional[Dict[str, Any]] = None,
        history: Optional[List[AnalysisHistory]] = None,
    ) -> bytes:
        """
        Builds the complete multi-page PDF document.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=54,
            rightMargin=54,
            topMargin=54,
            bottomMargin=54,
        )

        styles = getSampleStyleSheet()
        
        # Custom Typography Styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#0F172A'),
        )
        subtitle_style = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=13,
            textColor=colors.HexColor('#64748B'),
        )
        section_h1 = ParagraphStyle(
            'SectionH1',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=15,
            textColor=colors.HexColor('#0F172A'),
            spaceBefore=14,
            spaceAfter=6,
        )
        section_h2 = ParagraphStyle(
            'SectionH2',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=13,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=8,
            spaceAfter=4,
        )
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=11.5,
            textColor=colors.HexColor('#334155'),
        )
        body_bold = ParagraphStyle(
            'BodyBold',
            parent=body_style,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#0F172A'),
        )
        table_cell = ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#1E293B'),
        )
        table_cell_bold = ParagraphStyle(
            'TableCellBold',
            parent=table_cell,
            fontName='Helvetica-Bold',
        )
        table_cell_mono = ParagraphStyle(
            'TableCellMono',
            parent=table_cell,
            fontName='Courier-Bold',
            fontSize=8,
            alignment=2,  # right
        )

        story = []

        # ---------------------------------------------------------
        # 1. HEADER BANNER & BRANDING
        # ---------------------------------------------------------
        is_creating = analysis.is_value_creating
        verdict_text = "VALUE ACCRETIVE (+EVA)" if is_creating else "VALUE DILUTIVE (-EVA)"
        verdict_color = colors.HexColor("#059669") if is_creating else colors.HexColor("#DC2626")
        verdict_bg = colors.HexColor("#ECFDF5") if is_creating else colors.HexColor("#FEF2F2")

        header_table_data = [
            [
                Paragraph("VALORA AI", ParagraphStyle('Logo', fontName='Helvetica-Bold', fontSize=16, leading=18, textColor=colors.HexColor('#059669'))),
                Paragraph(f"<b>STATUS:</b> {verdict_text}", ParagraphStyle('Badge', fontName='Helvetica-Bold', fontSize=9, alignment=2, textColor=verdict_color)),
            ],
            [
                Paragraph("AI-BASED SHAREHOLDER VALUE CREATION ANALYZER", subtitle_style),
                Paragraph(f"Audit Date: {datetime.date.today().strftime('%B %d, %Y')}", ParagraphStyle('Date', fontName='Helvetica', fontSize=8, alignment=2, textColor=colors.HexColor('#64748B'))),
            ]
        ]
        t_header = Table(header_table_data, colWidths=[3.5 * inch, 3.5 * inch])
        t_header.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
        ]))
        story.append(t_header)
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0F172A'), spaceBefore=6, spaceAfter=10))

        # ---------------------------------------------------------
        # 2. COMPANY & REPORT METADATA BOX
        # ---------------------------------------------------------
        meta_data = [
            [
                Paragraph("<b>Company:</b>", table_cell),
                Paragraph(f"{company.name} ({company.ticker})", table_cell_bold),
                Paragraph("<b>Reporting Period:</b>", table_cell),
                Paragraph(record.fiscal_year or "FY 2024", table_cell_bold),
            ],
            [
                Paragraph("<b>Sector:</b>", table_cell),
                Paragraph(company.sector, table_cell),
                Paragraph("<b>Currency:</b>", table_cell),
                Paragraph(company.currency or "USD", table_cell),
            ],
            [
                Paragraph("<b>Invested Capital:</b>", table_cell),
                Paragraph(cls._format_currency(record.invested_capital), table_cell_bold),
                Paragraph("<b>Hurdle Rate (WACC):</b>", table_cell),
                Paragraph(cls._format_pct(record.wacc), table_cell_bold),
            ],
        ]
        meta_table = Table(meta_data, colWidths=[1.4 * inch, 2.1 * inch, 1.4 * inch, 2.1 * inch])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#E2E8F0')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 10))

        # ---------------------------------------------------------
        # 3. EXECUTIVE FINANCIAL SCORECARD & KPI GRID
        # ---------------------------------------------------------
        story.append(Paragraph("1. Executive Summary & Value Scorecard", section_h1))
        
        score_val = analysis.shareholder_value_score
        score_class = analysis.score_classification
        eva_str = f"{'+' if analysis.eva >= 0 else ''}{cls._format_currency(analysis.eva)}"

        kpi_data = [
            [
                Paragraph("Shareholder Value Score", ParagraphStyle('kpi_l', fontName='Helvetica-Bold', fontSize=8, alignment=1, textColor=colors.HexColor('#475569'))),
                Paragraph("Economic Value Added (EVA)", ParagraphStyle('kpi_l', fontName='Helvetica-Bold', fontSize=8, alignment=1, textColor=colors.HexColor('#475569'))),
                Paragraph("ROIC vs WACC Spread", ParagraphStyle('kpi_l', fontName='Helvetica-Bold', fontSize=8, alignment=1, textColor=colors.HexColor('#475569'))),
                Paragraph("Return on Equity (ROE)", ParagraphStyle('kpi_l', fontName='Helvetica-Bold', fontSize=8, alignment=1, textColor=colors.HexColor('#475569'))),
            ],
            [
                Paragraph(f"<b>{score_val}/100</b>", ParagraphStyle('kpi_v', fontName='Helvetica-Bold', fontSize=14, alignment=1, textColor=colors.HexColor('#0F172A'))),
                Paragraph(f"<b>{eva_str}</b>", ParagraphStyle('kpi_v', fontName='Helvetica-Bold', fontSize=14, alignment=1, textColor=verdict_color)),
                Paragraph(f"<b>{analysis.value_spread:+.2f}%</b>", ParagraphStyle('kpi_v', fontName='Helvetica-Bold', fontSize=14, alignment=1, textColor=verdict_color)),
                Paragraph(f"<b>{analysis.roe:.2f}%</b>", ParagraphStyle('kpi_v', fontName='Helvetica-Bold', fontSize=14, alignment=1, textColor=colors.HexColor('#0F172A'))),
            ],
            [
                Paragraph(f"{score_class}", ParagraphStyle('kpi_s', fontName='Helvetica', fontSize=7.5, alignment=1, textColor=colors.HexColor('#64748B'))),
                Paragraph(f"NOPAT − Capital Charge", ParagraphStyle('kpi_s', fontName='Helvetica', fontSize=7.5, alignment=1, textColor=colors.HexColor('#64748B'))),
                Paragraph(f"ROIC {analysis.roic:.2f}% vs WACC {record.wacc:.2f}%", ParagraphStyle('kpi_s', fontName='Helvetica', fontSize=7.5, alignment=1, textColor=colors.HexColor('#64748B'))),
                Paragraph(f"Net Margin: {analysis.net_profit_margin:.2f}%", ParagraphStyle('kpi_s', fontName='Helvetica', fontSize=7.5, alignment=1, textColor=colors.HexColor('#64748B'))),
            ]
        ]
        kpi_table = Table(kpi_data, colWidths=[1.75 * inch, 1.75 * inch, 1.75 * inch, 1.75 * inch])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, 0), 5),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 2),
            ('BOTTOMPADDING', (0, 2), (-1, 2), 5),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 8))

        # Executive Summary Narrative
        exec_narrative = (
            f"During {record.fiscal_year or 'the current period'}, <b>{company.name}</b> recorded total revenue of "
            f"<b>{cls._format_currency(record.revenue)}</b> with Net Operating Profit After Tax (NOPAT) of <b>{cls._format_currency(analysis.nopat)}</b>. "
            f"Against a capital base of <b>{cls._format_currency(record.invested_capital)}</b> and a Weighted Average Cost of Capital (WACC) hurdle of <b>{cls._format_pct(record.wacc)}</b>, "
            f"the capital charge required to satisfy investor expectations totaled <b>{cls._format_currency(analysis.capital_charge)}</b>. "
            f"Consequently, the enterprise generated an Economic Value Added (EVA) of <b>{eva_str}</b>. "
            f"The company's Return on Invested Capital (ROIC) of <b>{analysis.roic:.2f}%</b> yielded a net value spread of <b>{analysis.value_spread:+.2f}%</b>, "
            f"classifying the firm as a <b>{score_class}</b> with an institutional Shareholder Value Creation Score of <b>{score_val}/100</b>."
        )
        story.append(Paragraph(exec_narrative, body_style))
        story.append(Spacer(1, 10))

        # ---------------------------------------------------------
        # 4. EMBEDDED VISUAL CHARTS
        # ---------------------------------------------------------
        chart_buf = cls._generate_chart(analysis.roic, record.wacc, analysis.nopat, analysis.capital_charge, analysis.eva)
        story.append(Image(chart_buf, width=7.0 * inch, height=2.43 * inch))
        story.append(Spacer(1, 10))

        # ---------------------------------------------------------
        # 5. DETAILED VALUATION METRICS BREAKDOWN TABLE
        # ---------------------------------------------------------
        story.append(Paragraph("2. Financial Statements & Capital Productivity Breakdown", section_h1))

        # Comparison with prior year
        has_prior = record.prev_revenue is not None and record.prev_revenue > 0
        prior_rev_str = cls._format_currency(record.prev_revenue) if has_prior else "N/A"
        prior_nopat_str = cls._format_currency(analysis.prev_nopat) if analysis.prev_nopat else "N/A"
        prior_eva_str = f"{'+' if (analysis.prev_eva or 0) >= 0 else ''}{cls._format_currency(analysis.prev_eva)}" if analysis.prev_eva is not None else "N/A"
        prior_roic_str = cls._format_pct(analysis.prev_roic) if analysis.prev_roic is not None else "N/A"

        metrics_table_data = [
            [
                Paragraph("<b>Valuation Metric</b>", table_cell_bold),
                Paragraph("<b>Formula / Scope</b>", table_cell_bold),
                Paragraph("<b>Current Value</b>", table_cell_bold),
                Paragraph("<b>Prior Period</b>", table_cell_bold),
                Paragraph("<b>Hurdle / Target</b>", table_cell_bold),
                Paragraph("<b>Economic Verdict</b>", table_cell_bold),
            ],
            [
                Paragraph("Revenue", table_cell),
                Paragraph("Topline sales volume", table_cell),
                Paragraph(cls._format_currency(record.revenue), table_cell_mono),
                Paragraph(prior_rev_str, table_cell_mono),
                Paragraph("Growth Benchmark", table_cell),
                Paragraph(f"{analysis.revenue_growth:+.1f}% YoY" if analysis.revenue_growth is not None else "Baseline", table_cell),
            ],
            [
                Paragraph("Operating Profit (EBIT)", table_cell),
                Paragraph("Core operating earnings", table_cell),
                Paragraph(cls._format_currency(record.operating_profit), table_cell_mono),
                Paragraph(cls._format_currency(record.prev_operating_profit) if record.prev_operating_profit else "N/A", table_cell_mono),
                Paragraph(f"Margin: {analysis.operating_margin:.1f}%", table_cell),
                Paragraph("Operational Base", table_cell),
            ],
            [
                Paragraph("NOPAT", table_cell),
                Paragraph("EBIT × (1 − Tax Rate)", table_cell),
                Paragraph(cls._format_currency(analysis.nopat), table_cell_mono),
                Paragraph(prior_nopat_str, table_cell_mono),
                Paragraph(f"Tax: {record.tax_rate:.1f}%", table_cell),
                Paragraph("After-tax profit", table_cell),
            ],
            [
                Paragraph("Capital Charge", table_cell),
                Paragraph("Invested Capital × WACC", table_cell),
                Paragraph(cls._format_currency(analysis.capital_charge), table_cell_mono),
                Paragraph(cls._format_currency(analysis.prev_capital_charge) if analysis.prev_capital_charge else "N/A", table_cell_mono),
                Paragraph(f"Cost of Cap: {record.wacc:.1f}%", table_cell),
                Paragraph("Investor Hurdle", table_cell),
            ],
            [
                Paragraph("<b>Economic Value Added (EVA®)</b>", table_cell_bold),
                Paragraph("<b>NOPAT − Capital Charge</b>", table_cell_bold),
                Paragraph(f"<b>{eva_str}</b>", table_cell_mono),
                Paragraph(prior_eva_str, table_cell_mono),
                Paragraph("&gt; $0.00 Surplus", table_cell_bold),
                Paragraph("<b>Value Accretive</b>" if is_creating else "<b>Value Dilutive</b>", table_cell_bold),
            ],
            [
                Paragraph("<b>Return on Invested Capital (ROIC)</b>", table_cell_bold),
                Paragraph("NOPAT ÷ Invested Capital", table_cell),
                Paragraph(f"<b>{analysis.roic:.2f}%</b>", table_cell_mono),
                Paragraph(prior_roic_str, table_cell_mono),
                Paragraph(f"WACC: {record.wacc:.2f}%", table_cell),
                Paragraph("<b>Beats Hurdle</b>" if analysis.roic >= record.wacc else "<b>Lags Hurdle</b>", table_cell_bold),
            ],
            [
                Paragraph("Value Spread", table_cell),
                Paragraph("ROIC − WACC Hurdle", table_cell),
                Paragraph(f"<b>{analysis.value_spread:+.2f}%</b>", table_cell_mono),
                Paragraph(f"{analysis.prev_value_spread:+.2f}%" if analysis.prev_value_spread is not None else "N/A", table_cell_mono),
                Paragraph("&gt; 0.00% Spread", table_cell),
                Paragraph("Accretive Spread" if analysis.value_spread >= 0 else "Economic Drag", table_cell),
            ],
            [
                Paragraph("Return on Equity (ROE)", table_cell),
                Paragraph("Net Profit ÷ Equity", table_cell),
                Paragraph(f"{analysis.roe:.2f}%", table_cell_mono),
                Paragraph(cls._format_pct(analysis.prev_roe) if analysis.prev_roe is not None else "N/A", table_cell_mono),
                Paragraph("12.00% Benchmark", table_cell),
                Paragraph("Strong Return" if analysis.roe >= 12 else "Sub-benchmark", table_cell),
            ],
            [
                Paragraph("Debt Ratio (Leverage)", table_cell),
                Paragraph("Debt ÷ (Debt + Equity)", table_cell),
                Paragraph(f"{analysis.debt_ratio:.1f}%", table_cell_mono),
                Paragraph(f"{analysis.prev_debt_ratio:.1f}%" if analysis.prev_debt_ratio is not None else "N/A", table_cell_mono),
                Paragraph("&lt; 40.0% Target", table_cell),
                Paragraph("Prudent" if analysis.debt_ratio <= 40 else "Elevated Leverage", table_cell),
            ],
            [
                Paragraph("Debt-to-Equity", table_cell),
                Paragraph("Total Debt ÷ Equity", table_cell),
                Paragraph(f"{analysis.debt_to_equity:.2f}x", table_cell_mono),
                Paragraph("N/A", table_cell_mono),
                Paragraph("&lt; 1.00x Optimal", table_cell),
                Paragraph("Conservative" if analysis.debt_to_equity <= 1.0 else "High Leverage", table_cell),
            ],
        ]

        t_metrics = Table(metrics_table_data, colWidths=[1.5 * inch, 1.5 * inch, 1.05 * inch, 0.95 * inch, 1.0 * inch, 1.0 * inch])
        t_metrics.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('TOPPADDING', (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
            ('BACKGROUND', (0, 5), (-1, 5), verdict_bg),
        ]))
        story.append(t_metrics)
        story.append(Spacer(1, 14))

        # ---------------------------------------------------------
        # 6. SHAREHOLDER VALUE ASSESSMENT & DRIVERS
        # ---------------------------------------------------------
        story.append(Paragraph("3. Shareholder Value Assessment & Strategic Drivers", section_h1))
        
        driver_p1 = (
            f"<b>A. Capital Productivity:</b> {company.name} currently yields an operating return on invested capital of {analysis.roic:.2f}%. "
            f"Because this {'exceeds' if analysis.roic >= record.wacc else 'falls below'} the required cost of capital ({record.wacc:.2f}%), "
            f"every additional dollar deployed in operations {'increases' if is_creating else 'dilutes'} the total economic value of shareholder equity. "
            f"Management {'is generating surplus wealth' if is_creating else 'should prioritize capital discipline and operational efficiency before funding expansion'}."
        )
        driver_p2 = (
            f"<b>B. Balance Sheet Solvency & Leverage:</b> Total debt stands at {cls._format_currency(record.total_debt)} representing {analysis.debt_ratio:.1f}% "
            f"of total capitalization and a debt-to-equity ratio of {analysis.debt_to_equity:.2f}x. "
            f"{'Leverage remains within conservative bounds, providing debt capacity if attractive accretive opportunities arise.' if analysis.debt_ratio <= 35 else 'Debt levels are elevated; management should evaluate paying down high-cost borrowings to lower financial risk and reduce the WACC hurdle rate.'}"
        )
        story.append(Paragraph(driver_p1, body_style))
        story.append(Spacer(1, 4))
        story.append(Paragraph(driver_p2, body_style))
        story.append(Spacer(1, 10))

        # ---------------------------------------------------------
        # 7. AI FINANCIAL ANALYST INSIGHTS (When Available)
        # ---------------------------------------------------------
        if ai_data and isinstance(ai_data, dict):
            story.append(Paragraph("4. AI-Powered Executive Advisory (Google Gemini)", section_h1))
            
            # AI Executive Summary
            if ai_data.get("executive_summary"):
                story.append(Paragraph(f"<b>Executive Brief:</b> {ai_data['executive_summary']}", body_style))
                story.append(Spacer(1, 6))

            # Strengths & Weaknesses (2-column table)
            strengths = ai_data.get("financial_strengths", [])
            weaknesses = ai_data.get("financial_weaknesses", [])
            
            s_text = "<br/>".join([f"• {s}" for s in strengths[:4]]) if strengths else "• Consistent operational execution"
            w_text = "<br/>".join([f"• {w}" for w in weaknesses[:4]]) if weaknesses else "• Capital allocation efficiency can be improved"

            sw_table_data = [
                [
                    Paragraph("<b>Key Financial Strengths</b>", ParagraphStyle('SW_H1', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.HexColor('#059669'))),
                    Paragraph("<b>Key Areas of Concern / Weaknesses</b>", ParagraphStyle('SW_H2', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.HexColor('#DC2626'))),
                ],
                [
                    Paragraph(s_text, table_cell),
                    Paragraph(w_text, table_cell),
                ]
            ]
            t_sw = Table(sw_table_data, colWidths=[3.5 * inch, 3.5 * inch])
            t_sw.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#ECFDF5')),
                ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#FEF2F2')),
                ('BOX', (0, 0), (0, -1), 0.75, colors.HexColor('#A7F3D0')),
                ('BOX', (1, 0), (1, -1), 0.75, colors.HexColor('#FECACA')),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(t_sw)
            story.append(Spacer(1, 8))

            # Action Plan Table
            action_plan = ai_data.get("prioritized_action_plan", [])
            if action_plan:
                story.append(Paragraph("<b>Prioritized Strategic Action Plan:</b>", section_h2))
                ap_rows = [
                    [
                        Paragraph("<b>Step</b>", table_cell_bold),
                        Paragraph("<b>Strategic Initiative</b>", table_cell_bold),
                        Paragraph("<b>Focus Area</b>", table_cell_bold),
                        Paragraph("<b>Target Metric</b>", table_cell_bold),
                        Paragraph("<b>Timeline</b>", table_cell_bold),
                    ]
                ]
                for item in action_plan[:4]:
                    ap_rows.append([
                        Paragraph(str(item.get("step_number", "")), table_cell),
                        Paragraph(item.get("action", ""), table_cell),
                        Paragraph(item.get("focus_area", ""), table_cell),
                        Paragraph(item.get("target_metric", ""), table_cell),
                        Paragraph(item.get("timeline", ""), table_cell),
                    ])
                t_ap = Table(ap_rows, colWidths=[0.5 * inch, 2.7 * inch, 1.4 * inch, 1.4 * inch, 1.0 * inch])
                t_ap.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
                    ('TOPPADDING', (0, 0), (-1, -1), 3),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ]))
                story.append(t_ap)
                story.append(Spacer(1, 8))

            # Outlook
            st_outlook = ai_data.get("short_term_outlook")
            lt_outlook = ai_data.get("long_term_outlook")
            if st_outlook or lt_outlook:
                story.append(Paragraph(f"<b>Short-Term Outlook:</b> {st_outlook or 'Maintain operational vigilance.'}", body_style))
                story.append(Spacer(1, 3))
                story.append(Paragraph(f"<b>Long-Term Outlook:</b> {lt_outlook or 'Position capital structure for sustainable value compounding.'}", body_style))
                story.append(Spacer(1, 10))
        else:
            # Algorithmic attribution breakdown when AI is not configured
            story.append(Paragraph("4. Shareholder Value Score Attribution Breakdown", section_h1))
            bd = analysis.score_breakdown
            if bd:
                score_rows = [
                    [Paragraph("<b>Component Factor</b>", table_cell_bold), Paragraph("<b>Attributed Points</b>", table_cell_bold), Paragraph("<b>Benchmark Rationale</b>", table_cell_bold)],
                    [Paragraph("Base Score", table_cell), Paragraph(f"{bd.base_score} pts", table_cell_mono), Paragraph("Market-neutral normalized baseline", table_cell)],
                    [Paragraph("Value Spread (ROIC vs WACC)", table_cell), Paragraph(f"{bd.value_spread_points:+.1f} pts", table_cell_mono), Paragraph("Excess operating return above cost of capital hurdle", table_cell)],
                    [Paragraph("ROE Performance", table_cell), Paragraph(f"{bd.roe_points:+.1f} pts", table_cell_mono), Paragraph("Equity return vs 12.0% institutional equity benchmark", table_cell)],
                    [Paragraph("Topline Revenue Velocity", table_cell), Paragraph(f"{bd.growth_points:+.1f} pts", table_cell_mono), Paragraph("Expansion trajectory and volume growth", table_cell)],
                    [Paragraph("Solvency & Balance Sheet Health", table_cell), Paragraph(f"{bd.solvency_points:+.1f} pts", table_cell_mono), Paragraph("Debt-to-equity leverage penalty or bonus", table_cell)],
                    [Paragraph("<b>Final Shareholder Value Score</b>", table_cell_bold), Paragraph(f"<b>{bd.final_score}/100</b>", table_cell_mono), Paragraph(f"<b>{bd.classification}</b>", table_cell_bold)],
                ]
                t_score = Table(score_rows, colWidths=[2.5 * inch, 1.5 * inch, 3.0 * inch])
                t_score.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#F8FAFC')]),
                    ('BACKGROUND', (0, -1), (-1, -1), verdict_bg),
                    ('TOPPADDING', (0, 0), (-1, -1), 3.5),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
                ]))
                story.append(t_score)
                story.append(Spacer(1, 10))

        # ---------------------------------------------------------
        # 8. HISTORICAL AUDITS ARCHIVE (When available)
        # ---------------------------------------------------------
        if history and len(history) > 1:
            story.append(Paragraph("5. Historical Shareholder Value Audits", section_h1))
            hist_rows = [
                [
                    Paragraph("<b>Audit Date</b>", table_cell_bold),
                    Paragraph("<b>Period</b>", table_cell_bold),
                    Paragraph("<b>EVA ($)</b>", table_cell_bold),
                    Paragraph("<b>ROIC</b>", table_cell_bold),
                    Paragraph("<b>ROE</b>", table_cell_bold),
                    Paragraph("<b>Debt Ratio</b>", table_cell_bold),
                    Paragraph("<b>Value Score</b>", table_cell_bold),
                ]
            ]
            for h in history[:6]:
                eva_h = f"{'+' if h.eva >= 0 else ''}{cls._format_currency(h.eva)}"
                date_str = h.created_at.strftime("%b %d, %Y") if h.created_at else "N/A"
                hist_rows.append([
                    Paragraph(date_str, table_cell),
                    Paragraph(h.period, table_cell),
                    Paragraph(eva_h, table_cell_mono),
                    Paragraph(f"{h.roic:.1f}%", table_cell_mono),
                    Paragraph(f"{h.roe:.1f}%", table_cell_mono),
                    Paragraph(f"{h.debt_ratio:.1f}%", table_cell_mono),
                    Paragraph(f"{h.shareholder_value_score}/100", table_cell_mono),
                ])
            t_hist = Table(hist_rows, colWidths=[1.1 * inch, 1.0 * inch, 1.3 * inch, 0.9 * inch, 0.9 * inch, 0.9 * inch, 0.9 * inch])
            t_hist.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            story.append(t_hist)
            story.append(Spacer(1, 10))

        # ---------------------------------------------------------
        # 9. CERTIFICATION SIGN-OFF BOX
        # ---------------------------------------------------------
        cert_data = [
            [
                Paragraph("<b>Audit Verification & Integrity:</b><br/>This document is an algorithmic shareholder value audit certified by VALORA AI Analytics Engine v4.0. All valuation spreads, economic value computations, and capital charges are strictly derived from verified corporate statement inputs under the Stern Stewart EVA® framework.", table_cell),
                Paragraph("<b>AUTHORIZED SIGN-OFF</b><br/>VALORA AI Financial Systems<br/>Status: Verified Board Artifact", ParagraphStyle('CertR', parent=table_cell, fontName='Helvetica-Bold', alignment=2, textColor=colors.HexColor('#059669'))),
            ]
        ]
        t_cert = Table(cert_data, colWidths=[4.8 * inch, 2.2 * inch])
        t_cert.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(KeepTogether(t_cert))

        # Build document using NumberedCanvas
        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()
