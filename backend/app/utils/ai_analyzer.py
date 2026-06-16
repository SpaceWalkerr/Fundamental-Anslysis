"""
AI Service for Financial Analysis Report Generation
Uses OpenAI GPT-4 or Anthropic Claude
"""
from typing import Dict, List, Optional
import openai
from anthropic import Anthropic
import json

from app.core.config import settings


class AIAnalyzer:
    """AI-powered financial document analyzer"""
    
    def __init__(self, provider: str = "openai"):
        """
        Initialize AI analyzer
        
        Args:
            provider: 'openai' or 'anthropic'
        """
        self.provider = provider
        
        if provider == "openai" and settings.OPENAI_API_KEY:
            openai.api_key = settings.OPENAI_API_KEY
            self.model = settings.OPENAI_MODEL
        elif provider == "anthropic" and settings.ANTHROPIC_API_KEY:
            self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            self.model = settings.ANTHROPIC_MODEL
        else:
            self.provider = None
    
    def is_available(self) -> bool:
        """Check if AI service is configured"""
        return self.provider is not None
    
    async def analyze_financial_document(
        self,
        extracted_text: str,
        company_name: str,
        ticker: str,
        document_type: str = "financial_report"
    ) -> Dict[str, any]:
        """
        Analyze financial document and generate comprehensive report
        
        Args:
            extracted_text: Text extracted from document
            company_name: Company name
            ticker: Stock ticker symbol
            document_type: Type of document
            
        Returns:
            Dictionary with analysis results
        """
        if not self.is_available():
            return self._generate_mock_analysis(extracted_text, company_name, ticker)
        
        # Create analysis prompt
        prompt = self._create_analysis_prompt(
            extracted_text, company_name, ticker, document_type
        )
        
        try:
            if self.provider == "openai":
                response = await self._analyze_with_openai(prompt)
            else:
                response = await self._analyze_with_anthropic(prompt)
            
            # Parse response
            analysis = self._parse_analysis_response(response)
            analysis["success"] = True
            
            return analysis
            
        except Exception as e:
            return {
                "success": False,
                "error": f"AI analysis failed: {str(e)}"
            }
    
    def _create_analysis_prompt(
        self,
        text: str,
        company_name: str,
        ticker: str,
        doc_type: str
    ) -> str:
        """Create detailed analysis prompt"""
        
        # Truncate text if too long (keep first and last portions)
        max_length = 30000
        if len(text) > max_length:
            mid_point = max_length // 2
            text = text[:mid_point] + "\n\n[... content truncated ...]\n\n" + text[-mid_point:]
        
        prompt = f"""You are an expert financial analyst. Analyze the following financial document for {company_name} (Ticker: {ticker}) and provide a comprehensive fundamental analysis report.

FINANCIAL DOCUMENT:
{text}

Please provide a detailed analysis in the following JSON format:

{{
  "company": "{company_name}",
  "ticker": "{ticker}",
  "exchange": "NASDAQ",
  "overall_score": 7.5,
  "summary": "Brief 2-3 sentence executive summary",
  "metrics": {{
    "profitability": {{
      "score": 8.2,
      "label": "Strong",
      "details": "Explanation of profitability metrics"
    }},
    "liquidity": {{
      "score": 7.5,
      "label": "Good",
      "details": "Explanation of liquidity position"
    }},
    "solvency": {{
      "score": 7.8,
      "label": "Good",
      "details": "Explanation of debt and solvency"
    }},
    "efficiency": {{
      "score": 8.0,
      "label": "Strong",
      "details": "Explanation of operational efficiency"
    }}
  }},
  "key_ratios": [
    {{"name": "P/E Ratio", "value": "24.5x", "benchmark": "Industry: 22.1x", "interpretation": "Slightly above industry average"}},
    {{"name": "ROE", "value": "22.3%", "benchmark": "Industry: 18.4%", "interpretation": "Strong return on equity"}},
    {{"name": "Current Ratio", "value": "1.8", "benchmark": "Healthy: >1.5", "interpretation": "Good liquidity"}},
    {{"name": "Debt-to-Equity", "value": "0.45", "benchmark": "Target: <1.0", "interpretation": "Conservative leverage"}},
    {{"name": "ROE", "value": "22.3%", "benchmark": "Industry: 18.4%", "interpretation": "Strong return on equity"}},
    {{"name": "Profit Margin", "value": "18.5%", "benchmark": "Industry: 15.2%", "interpretation": "Above average profitability"}}
  ],
  "strengths": [
    "Strong revenue growth and market position",
    "Healthy profit margins above industry average",
    "Conservative debt levels and strong balance sheet",
    "Consistent cash flow generation"
  ],
  "red_flags": [
    "Increasing competition in core markets",
    "Rising operational costs",
    "Dependence on key products"
  ],
  "investment_assessment": "Detailed 3-4 paragraph investment recommendation covering: 1) Financial health summary, 2) Growth prospects and risks, 3) Valuation assessment, 4) Final recommendation (Buy/Hold/Sell with rationale)"
}}

IMPORTANT:
- Provide specific numbers and ratios from the document
- Score each metric from 0-10 (10 being excellent)
- Overall score should be weighted average of category scores
- Label scores: 9-10="Excellent", 7-8="Strong", 5-6="Good", 3-4="Fair", 0-2="Poor"
- Be objective and balanced in assessment
- Return ONLY valid JSON, no additional text

"""
        return prompt
    
    async def _analyze_with_openai(self, prompt: str) -> str:
        """Analyze using OpenAI GPT-4"""
        response = openai.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert financial analyst specializing in fundamental analysis. Provide detailed, data-driven insights in JSON format."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=4000,
            response_format={"type": "json_object"}
        )
        
        return response.choices[0].message.content
    
    async def _analyze_with_anthropic(self, prompt: str) -> str:
        """Analyze using Anthropic Claude"""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4000,
            temperature=0.3,
            system="You are an expert financial analyst specializing in fundamental analysis. Provide detailed, data-driven insights in JSON format.",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        return response.content[0].text
    
    def _parse_analysis_response(self, response: str) -> Dict:
        """Parse AI response and extract structured data"""
        try:
            # Try to parse as JSON
            data = json.loads(response)
            
            # Validate required fields
            required_fields = ["company", "ticker", "overall_score", "summary", "metrics", "key_ratios", "strengths", "red_flags", "investment_assessment"]
            
            for field in required_fields:
                if field not in data:
                    raise ValueError(f"Missing required field: {field}")
            
            return data
            
        except json.JSONDecodeError:
            # If not valid JSON, try to extract JSON from markdown code blocks
            import re
            json_match = re.search(r'```json\n(.*?)\n```', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            
            # If still can't parse, return error
            raise ValueError("Failed to parse AI response as JSON")
    
    async def generate_executive_summary(
        self,
        full_analysis: Dict,
        max_length: int = 500
    ) -> str:
        """
        Generate a concise executive summary from full analysis
        
        Args:
            full_analysis: Full analysis results
            max_length: Maximum length in characters
            
        Returns:
            Executive summary text
        """
        if not self.is_available():
            return full_analysis.get("summary", "")
        
        prompt = f"""Based on this financial analysis, provide a concise executive summary in {max_length} characters or less:

Overall Score: {full_analysis['overall_score']}/10
Company: {full_analysis['company']} ({full_analysis['ticker']})

Metrics:
- Profitability: {full_analysis['metrics']['profitability']['score']}/10
- Liquidity: {full_analysis['metrics']['liquidity']['score']}/10
- Solvency: {full_analysis['metrics']['solvency']['score']}/10
- Efficiency: {full_analysis['metrics']['efficiency']['score']}/10

Key Strengths:
{chr(10).join('- ' + s for s in full_analysis['strengths'][:3])}

Red Flags:
{chr(10).join('- ' + r for r in full_analysis['red_flags'][:2])}

Provide a 2-3 sentence executive summary highlighting the most important findings."""

        try:
            if self.provider == "openai":
                response = openai.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                    max_tokens=200
                )
                return response.choices[0].message.content
            else:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
                
        except Exception:
            return full_analysis.get("summary", "")

    def _parse_metrics_from_text(self, text: str) -> Dict[str, float]:
        import re
        metrics = {}
        for line in text.split("\n"):
            if ":" in line:
                parts = line.split(":", 1)
                key = parts[0].strip().lower()
                val = parts[1].strip().replace("%", "")
                try:
                    match = re.search(r"[-+]?\d*\.\d+|\d+", val)
                    if match:
                        metrics[key] = float(match.group())
                except:
                    pass
        return metrics

    def _generate_mock_analysis(self, text: str, company_name: str, ticker: str) -> Dict:
        parsed = self._parse_metrics_from_text(text)
        
        pe = parsed.get("p/e ratio") or parsed.get("pe_ratio") or 25.0
        peg_ratio = parsed.get("peg ratio") or parsed.get("peg_ratio") or 1.2
        roe = parsed.get("roe (return on equity)") or parsed.get("roe") or 15.0
        current_ratio = parsed.get("current ratio") or parsed.get("current_ratio") or 1.5
        debt_to_equity = parsed.get("debt to equity") or parsed.get("debt_to_equity") or 0.8
        profit_margin = parsed.get("profit margin") or parsed.get("profit_margin") or 12.0
        revenue_growth = parsed.get("revenue growth") or parsed.get("revenue_growth") or 8.0
        
        # Calculate health scores (out of 10)
        prof_score = min(10.0, max(2.0, (profit_margin / 4.0) + (roe / 10.0)))
        prof_label = "Excellent" if prof_score >= 9 else "Strong" if prof_score >= 7 else "Good" if prof_score >= 5 else "Fair" if prof_score >= 3 else "Poor"
        
        liq_score = min(10.0, max(2.0, current_ratio * 4.0)) if current_ratio < 2.0 else min(10.0, max(6.0, 10.0 - (current_ratio - 2.0) * 2))
        liq_label = "Excellent" if liq_score >= 9 else "Strong" if liq_score >= 7 else "Good" if liq_score >= 5 else "Fair" if liq_score >= 3 else "Poor"
        
        solv_score = min(10.0, max(1.0, 10.0 - (debt_to_equity * 4.0)))
        solv_label = "Excellent" if solv_score >= 9 else "Strong" if solv_score >= 7 else "Good" if solv_score >= 5 else "Fair" if solv_score >= 3 else "Poor"
        
        eff_score = min(10.0, max(2.0, 5.0 + (revenue_growth / 4.0)))
        eff_label = "Excellent" if eff_score >= 9 else "Strong" if eff_score >= 7 else "Good" if eff_score >= 5 else "Fair" if eff_score >= 3 else "Poor"
        
        overall_score = round((prof_score + liq_score + solv_score + eff_score) / 4.0, 1)
        
        key_ratios = [
            {"name": "P/E Ratio", "value": f"{pe:.1f}x", "benchmark": "Industry Avg: 22.0x", "interpretation": "Premium" if pe > 25 else "Discounted" if pe < 15 else "Fair Value"},
            {"name": "PEG Ratio", "value": f"{peg_ratio:.2f}", "benchmark": "Healthy: <1.0", "interpretation": "Undervalued" if peg_ratio < 1.0 else "Overvalued" if peg_ratio > 2.0 else "Fair Value"},
            {"name": "Debt-to-Equity", "value": f"{debt_to_equity:.2f}", "benchmark": "Target: <1.0", "interpretation": "Low Leverage" if debt_to_equity < 0.5 else "Moderate Leverage" if debt_to_equity <= 1.2 else "High Leverage"},
            {"name": "ROE", "value": f"{roe:.1f}%", "benchmark": "Target: >15%", "interpretation": "High" if roe > 20 else "Healthy" if roe >= 10 else "Low"},
            {"name": "Profit Margin", "value": f"{profit_margin:.1f}%", "benchmark": "Industry Avg: 10%", "interpretation": "High Margin" if profit_margin > 15 else "Standard"}
        ]
        
        if "operating margin" in parsed or "operating_margin" in parsed:
            op_margin = parsed.get("operating margin") or parsed.get("operating_margin") or 12.0
            key_ratios.append({"name": "Operating Margin", "value": f"{op_margin:.1f}%", "benchmark": "Industry: 12%", "interpretation": "Efficient" if op_margin > 15 else "Standard"})
            
        strengths = [
            f"Strong profitability profile with an estimated Return on Equity of {roe:.1f}%.",
            f"Consistent revenue growth trajectory with a reported {revenue_growth:.1f}% year-over-year expansion.",
            f"Healthy operational efficiency with net margins sustained at {profit_margin:.1f}%."
        ]
        if debt_to_equity < 1.0:
            strengths.append(f"Low leverage risk with a debt-to-equity ratio of {debt_to_equity:.2f}, indicating a solid financial foundation.")
        else:
            strengths.append(f"Aggressive growth deployment supported by structural debt-to-equity leverage of {debt_to_equity:.2f}.")
            
        red_flags = []
        if pe > 35:
            red_flags.append(f"Valuation risk: The P/E ratio is high at {pe:.1f}x, which demands premium growth performance.")
        if current_ratio < 1.2:
            red_flags.append(f"Working capital constraints: Current ratio is low at {current_ratio:.2f}, highlighting short-term liquidity risk.")
        if debt_to_equity > 1.5:
            red_flags.append(f"Solvency risk: Debt-to-equity leverage is elevated at {debt_to_equity:.2f}, which increases vulnerability to interest rate shifts.")
        if revenue_growth < 2.0:
            red_flags.append(f"Stagnating expansion: Quarterly revenue growth has slowed to {revenue_growth:.1f}%.")
            
        if not red_flags:
            red_flags = [
                "Intensifying sectoral competition threatening long-term margins.",
                "Evolving regulatory changes and policy updates in regional markets.",
                "Macroeconomic tailwinds (inflation/interest rate volatility) affecting capital efficiency."
            ]
            
        summary = f"{company_name} ({ticker}) exhibits a strong core fundamental structure. The company demonstrates {prof_label.lower()} profitability alongside a {liq_label.lower()} short-term liquidity stance. While it faces some sector-specific challenges, its solid business model warrants long-term investor consideration."
        
        investment_assessment = f"From an investment perspective, {company_name} presents a solid risk-to-reward scenario. The company's strong performance in profitability ({prof_score:.1f}/10) and operating efficiency is supported by stable revenue growth. However, investors should monitor the valuation relative to growth prospects, especially with a current P/E of {pe:.1f}x. Based on these ratios and balance sheet health, we rate this as a stable asset with moderate growth potential."
        
        return {
            "success": True,
            "company": company_name,
            "ticker": ticker,
            "exchange": "NSE" if ticker.endswith((".NS", ".BO")) else "NASDAQ",
            "overall_score": overall_score,
            "summary": summary,
            "metrics": {
                "profitability": {"score": round(prof_score, 1), "label": prof_label, "details": f"Profit margin: {profit_margin:.1f}%, ROE: {roe:.1f}%"},
                "liquidity": {"score": round(liq_score, 1), "label": liq_label, "details": f"Current ratio: {current_ratio:.2f}"},
                "solvency": {"score": round(solv_score, 1), "label": solv_label, "details": f"Debt-to-Equity ratio: {debt_to_equity:.2f}"},
                "efficiency": {"score": round(eff_score, 1), "label": eff_label, "details": f"Revenue Growth: {revenue_growth:.1f}%"}
            },
            "key_ratios": key_ratios,
            "strengths": strengths,
            "red_flags": red_flags,
            "investment_assessment": investment_assessment
        }
