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
    
    def analyze_financial_document(
        self,
        extracted_text: str,
        company_name: str,
        ticker: str,
        document_type: str = "financial_report",
        investor_style: str = "balanced",
        horizon: str = "long_term",
        tier: str = "free",
        region: str = None,
    ) -> Dict[str, any]:
        """
        Analyze financial document and generate comprehensive report

        Args:
            extracted_text: Text extracted from document
            company_name: Company name
            ticker: Stock ticker symbol
            document_type: Type of document
            investor_style: beginner|value|growth|income|trader|balanced — tailors tone + focus
            horizon: long_term|medium|short — tailors the recommendation window
            tier: free|premium|enterprise — premium unlocks deeper scenario sections

        Returns:
            Dictionary with analysis results
        """
        if not self.is_available():
            return {
                "success": False,
                "error": "AI service not configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY"
            }

        # Create analysis prompt
        prompt = self._create_analysis_prompt(
            extracted_text, company_name, ticker, document_type,
            investor_style=investor_style, horizon=horizon, tier=tier,
            region=region,
        )
        
        try:
            if self.provider == "openai":
                response, tokens_used = self._analyze_with_openai(prompt)
            else:
                response, tokens_used = self._analyze_with_anthropic(prompt)

            # Parse response
            analysis = self._parse_analysis_response(response)
            analysis["success"] = True
            # Real token cost of this generation, for wallet metering.
            analysis["tokens_used"] = tokens_used

            return analysis

        except Exception as e:
            return {
                "success": False,
                "error": f"AI analysis failed: {str(e)}"
            }
    
    # How each investor style shifts the lens of the analysis + the voice.
    _STYLE_GUIDANCE = {
        "beginner": "The reader is new to investing. Explain every ratio in one plain-English phrase, avoid jargon, and be encouraging but honest. Emphasise what the numbers mean for a first-time investor.",
        "value": "The reader is a value investor. Focus on valuation vs intrinsic worth, margin of safety, balance-sheet strength, free cash flow, and whether the price offers a discount.",
        "growth": "The reader is a growth investor. Focus on revenue/earnings growth rates, reinvestment, market expansion, operating leverage, and durability of the growth story.",
        "income": "The reader is an income investor. Focus on dividend yield, payout ratio, dividend coverage, cash-flow stability, and the sustainability of distributions.",
        "trader": "The reader is a shorter-term, momentum-aware trader. Focus on recent trend, catalysts, earnings surprises, and near-term risks, while still grounding everything in fundamentals.",
        "balanced": "The reader is a balanced long-term investor. Give a well-rounded view of quality, valuation and risk.",
    }
    _HORIZON_GUIDANCE = {
        "long_term": "Frame the recommendation for a multi-year holding period.",
        "medium": "Frame the recommendation for a 6–18 month horizon.",
        "short": "Frame the recommendation for a shorter, catalyst-driven horizon.",
    }

    # Currency symbol + market conventions per region bucket. Keeps reports in
    # the reader's own currency and market vocabulary.
    _REGION_MARKET = {
        "IN": ("₹", "INR", "Indian market conventions (NSE/BSE, crore/lakh, figures in ₹)."),
        "US": ("$", "USD", "US market conventions (NYSE/NASDAQ, millions/billions, figures in $)."),
        "GB": ("£", "GBP", "UK market conventions (LSE, millions/billions, figures in £)."),
        "EU": ("€", "EUR", "Eurozone market conventions (figures in €)."),
        "AE": ("AED ", "AED", "UAE market conventions (figures in AED)."),
        "SG": ("S$", "SGD", "Singapore market conventions (SGX, figures in S$)."),
        "GLOBAL": ("$", "USD", "international market conventions (figures in $)."),
    }

    # Map a ticker's exchange suffix to a region, as a fallback when the caller
    # doesn't pass an explicit region.
    _SUFFIX_REGION = {
        ".NS": "IN", ".BO": "IN", ".L": "GB", ".PA": "EU", ".DE": "EU",
        ".AS": "EU", ".MI": "EU", ".SI": "SG", ".AE": "AE", ".DU": "AE",
    }

    def _resolve_market(self, ticker: str, region: str):
        """Return (symbol, currency_code, conventions_note) for the report."""
        code = (region or "").upper()
        if code not in self._REGION_MARKET:
            code = None
            tk = (ticker or "").upper()
            for suffix, rc in self._SUFFIX_REGION.items():
                if tk.endswith(suffix):
                    code = rc
                    break
            if code is None:
                code = "GLOBAL"  # bare/US-style tickers → USD
        return self._REGION_MARKET[code]

    def _create_analysis_prompt(
        self,
        text: str,
        company_name: str,
        ticker: str,
        doc_type: str,
        investor_style: str = "balanced",
        horizon: str = "long_term",
        tier: str = "free",
        region: str = None,
    ) -> str:
        """Create a personalised, anti-hallucination analysis prompt."""

        # Truncate text if too long (keep first and last portions)
        max_length = 30000
        if len(text) > max_length:
            mid_point = max_length // 2
            text = text[:mid_point] + "\n\n[... content truncated ...]\n\n" + text[-mid_point:]

        style_note = self._STYLE_GUIDANCE.get(investor_style, self._STYLE_GUIDANCE["balanced"])
        horizon_note = self._HORIZON_GUIDANCE.get(horizon, self._HORIZON_GUIDANCE["long_term"])
        cur_symbol, cur_code, market_note = self._resolve_market(ticker, region)
        is_pro = tier in ("premium", "enterprise")

        # Premium-only sections: the deeper, scenario-driven analysis that makes
        # a paid report feel like it came from an analyst, not a template.
        pro_schema = ""
        if is_pro:
            pro_schema = """,
  "personalized_take": "2-3 sentences written directly to THIS investor given their style and horizon — what this specific company means for them and why.",
  "bull_case": ["3-4 concrete, document-grounded reasons this investment could work out well"],
  "bear_case": ["3-4 concrete, document-grounded risks that could make this a poor investment"],
  "what_to_watch": ["3-4 specific metrics, events or disclosures to monitor next quarter, drawn from the document"],
  "peer_context": "1-2 sentences on how these fundamentals compare to typical peers in this sector (qualitative if no peer data is in the document).",
  "data_confidence": {"score": 0, "note": "How complete the source document was for this analysis, and what was missing."}"""

        pro_rules = ""
        if is_pro:
            pro_rules = (
                "- Fill personalized_take, bull_case, bear_case, what_to_watch, peer_context and data_confidence.\n"
                "- data_confidence.score is 0-10 reflecting how much hard financial data the document actually contained.\n"
            )

        prompt = f"""You are a senior equity research analyst writing a fundamental analysis of {company_name} (Ticker: {ticker}) for a specific reader.

WHO YOU ARE WRITING FOR:
{style_note}
{horizon_note}

MARKET & CURRENCY CONTEXT:
Write all monetary figures using the "{cur_symbol}" symbol ({cur_code}). Use {market_note}
If the source document reports figures in a different currency, keep them as stated but make the reporting currency explicit; do not invent exchange rates.

SOURCE DOCUMENT (this is your ONLY source of facts):
{text}

Return ONLY a valid JSON object with EXACTLY this shape (no markdown, no commentary):

{{
  "company": "<official company name from the document>",
  "ticker": "{ticker}",
  "exchange": "<exchange if stated in the document, else 'N/A'>",
  "overall_score": <number 0-10, weighted average of the category scores>,
  "summary": "<2-3 sentence executive summary in plain English>",
  "plain_english": "<ONE sentence a busy person could read and instantly get the verdict>",
  "metrics": {{
    "profitability": {{"score": <0-10>, "label": "<Excellent|Strong|Good|Fair|Poor>", "details": "<what the document shows about profitability>"}},
    "liquidity":     {{"score": <0-10>, "label": "<...>", "details": "<...>"}},
    "solvency":      {{"score": <0-10>, "label": "<...>", "details": "<...>"}},
    "efficiency":    {{"score": <0-10>, "label": "<...>", "details": "<...>"}}
  }},
  "key_ratios": [
    {{"name": "<ratio name>", "value": "<value computed FROM the document, or 'N/A'>", "benchmark": "<a reasonable reference range, labelled as guidance>", "interpretation": "<one line>"}}
  ],
  "strengths": ["<specific strengths grounded in the document>"],
  "red_flags": ["<specific risks grounded in the document>"],
  "investment_assessment": "<3-4 paragraphs: 1) financial health, 2) growth prospects & risks, 3) valuation, 4) a clear Buy/Hold/Sell with rationale for THIS reader's style and horizon>"{pro_schema}
}}

CRITICAL RULES — CREDIBILITY DEPENDS ON THESE:
- Use ONLY numbers that appear in, or can be directly computed from, the source document.
- If a ratio or figure is NOT available in the document, set its value to "N/A" and say so — NEVER invent or estimate a number.
- Do not carry over any example values; every figure must trace back to this specific document.
- Score each metric 0-10 (labels: 9-10 Excellent, 7-8 Strong, 5-6 Good, 3-4 Fair, 0-2 Poor).
- overall_score = weighted average of the four category scores.
- Speak directly and specifically to the reader described above; tailor emphasis and language to their style.
- Be balanced: a good analyst names the risks as clearly as the strengths.
{pro_rules}- Return ONLY valid JSON. No prose before or after.
"""
        return prompt
    
    def _analyze_with_openai(self, prompt: str):
        """Analyze using OpenAI. Returns (json_text, total_tokens)."""
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

        tokens = getattr(getattr(response, "usage", None), "total_tokens", 0) or 0
        return response.choices[0].message.content, int(tokens)

    def _analyze_with_anthropic(self, prompt: str):
        """Analyze using Anthropic Claude. Returns (json_text, total_tokens)."""
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

        usage = getattr(response, "usage", None)
        tokens = (getattr(usage, "input_tokens", 0) or 0) + (getattr(usage, "output_tokens", 0) or 0)
        return response.content[0].text, int(tokens)
    
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
