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
            return {
                "success": False,
                "error": "AI service not configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY"
            }
        
        # Create analysis prompt
        prompt = self._create_analysis_prompt(
            extracted_text, company_name, ticker, document_type
        )
        
        try:
            if self.provider == "openai":
                response = self._analyze_with_openai(prompt)
            else:
                response = self._analyze_with_anthropic(prompt)
            
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
    
    def _analyze_with_openai(self, prompt: str) -> str:
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
    
    def _analyze_with_anthropic(self, prompt: str) -> str:
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
