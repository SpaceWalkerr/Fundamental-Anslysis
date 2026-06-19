"""
RAG Chat Service
Handles retrieval-augmented generation for document Q&A
"""
from typing import List, Dict, Optional
import logging
import openai
import anthropic
from app.core.config import settings
from app.utils.vector_store import get_vector_store

logger = logging.getLogger(__name__)


class RAGChatService:
    """
    Retrieval-Augmented Generation service for document chat
    """
    
    def __init__(self):
        """Initialize RAG chat service with AI clients"""
        self.vector_store = get_vector_store()
        
        # Initialize OpenAI client if key is available
        if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "":
            self.openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            self.openai_client = None
        
        # Initialize Anthropic client if key is available
        if settings.ANTHROPIC_API_KEY and settings.ANTHROPIC_API_KEY != "":
            self.anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            self.anthropic_model = settings.ANTHROPIC_MODEL
            self.anthropic_model_candidates = self._get_anthropic_model_candidates()
        else:
            self.anthropic_client = None
            self.anthropic_model = None
            self.anthropic_model_candidates = []
    
    def chat(
        self,
        question: str,
        document_id: Optional[str] = None,
        conversation_history: Optional[List[Dict]] = None,
        n_context_chunks: int = 5,
        additional_context: Optional[str] = None,
        use_openai: bool = False
    ) -> Dict:
        """
        Answer a question using RAG
        
        Args:
            question: User's question
            document_id: Optional document ID to limit search scope
            conversation_history: Previous messages in conversation
            n_context_chunks: Number of relevant chunks to retrieve
            use_openai: Whether to use OpenAI (True) or Anthropic (False)
            
        Returns:
            Dict with answer, sources, and metadata
        """
        # Step 1: Retrieve relevant document chunks
        relevant_chunks = self.vector_store.search(
            query=question,
            n_results=n_context_chunks,
            document_id=document_id
        )
        
        if not relevant_chunks:
            return {
                "answer": "I don't have enough information to answer this question. Please make sure a document has been uploaded and processed.",
                "sources": [],
                "confidence": "low"
            }
        
        # Step 2: Build context from retrieved chunks and include any
        # additional context (e.g., extracted metrics) passed by caller.
        context_text = self._build_context(relevant_chunks)
        if additional_context:
            context_text = f"{additional_context}\n\n{context_text}"
        
        # Step 3: Create prompt with context and question
        system_prompt = self._create_system_prompt()
        user_prompt = self._create_user_prompt(question, context_text)
        
        # Step 4: Generate answer using AI
        if use_openai and self.openai_client:
            answer = self._generate_answer_openai(
                system_prompt,
                user_prompt,
                conversation_history
            )
        elif not use_openai and self.anthropic_client:
            answer = self._generate_answer_anthropic(
                system_prompt,
                user_prompt,
                conversation_history
            )
        elif self.anthropic_client:
            answer = self._generate_answer_anthropic(
                system_prompt,
                user_prompt,
                conversation_history
            )
        elif self.openai_client:
            answer = self._generate_answer_openai(
                system_prompt,
                user_prompt,
                conversation_history
            )
        else:
            answer = self._generate_mock_rag_answer(question, relevant_chunks)

        # Step 5: Format response with sources
        sources = self._format_sources(relevant_chunks)
        answer_with_sources = answer
        confidence = self._calculate_confidence(sources)

        return {
            "answer": answer_with_sources,
            "sources": sources,
            "confidence": confidence,
            "chunks_used": len(relevant_chunks)
        }
    
    def _build_context(self, chunks: List[Dict]) -> str:
        """Build context text from retrieved chunks"""
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            text = chunk.get('text', '')
            context_parts.append(f"[Context {i}]\n{text}")
        
        return "\n\n".join(context_parts)
    
    def _create_system_prompt(self) -> str:
        """Create system prompt for RAG"""
        return """You are a financial analysis assistant helping users understand their financial documents.

Your role:
- Answer questions based ONLY on the provided context from the documents
- Be precise and cite specific numbers, metrics, or facts from the context
- If the context doesn't contain enough information, clearly state that
- Explain complex financial concepts in simple terms
- Highlight important insights, trends, or red flags

Guidelines:
- Use a professional but friendly tone
- Structure answers clearly with bullet points when appropriate
- When discussing numbers, always include currency and units
- If comparing values, explain the significance of the comparison
- Never make up information not present in the context
- For simple factual questions, answer briefly and directly
- Only provide detailed financial analysis when explicitly requested
- Keep responses focused on the user's question
"""

    def _create_user_prompt(self, question: str, context: str) -> str:
        """Create user prompt with question and context"""
        return f"""Based on the following context from financial documents, answer the user's question.

CONTEXT:
{context}

QUESTION:
{question}

Instructions:
- Answer ONLY using information from the provided context.
- If the information is not available, clearly say so.
- For simple questions, give a short and direct answer in 3-5 bullet points.
- For detailed analysis requests, provide a comprehensive analysis.
- Do not discuss Revenue Growth, EPS, PE Ratio, Debt, Cash Flow, Risks, or Valuation unless they are relevant to the question.
- Keep answers concise and focused.
- Use tables only when necessary.
- Do not repeat information.
- Cite specific figures and metrics when available.

Provide a clear, accurate answer based on the context above."""

    def _generate_answer_openai(
        self,
        system_prompt: str,
        user_prompt: str,
        conversation_history: Optional[List[Dict]] = None
    ) -> str:
        """Generate answer using OpenAI"""
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history[-6:])  # Last 3 exchanges
        
        # Add current question
        messages.append({"role": "user", "content": user_prompt})
        
        try:
            response = self.openai_client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                temperature=0.3,  # Lower temperature for more factual responses
                max_tokens=3000
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            return "Sorry, I couldn't generate a response right now."
    
    def _get_anthropic_model_candidates(self) -> List[str]:
        """Return Anthropic model IDs to try for RAG answers."""
        return [
            self.anthropic_model,
            "claude-opus-4-8",
            "claude-haiku-4-5-20251001",
            "claude-sonnet-4-6",
            "claude-fable-5"
        ]

    def _generate_answer_anthropic(
        self,
        system_prompt: str,
        user_prompt: str,
        conversation_history: Optional[List[Dict]] = None
    ) -> str:
        """Generate answer using Anthropic Claude with fallback candidates."""
        messages = []
        
        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history[-6:])  # Last 3 exchanges
        
        # Add current question
        messages.append({"role": "user", "content": user_prompt})

        last_exception = None
        for model in [m for m in self.anthropic_model_candidates if m]:
            try:
                response = self.anthropic_client.messages.create(
                    model=model,
                    system=system_prompt,
                    messages=messages,
                    max_tokens=3000
                )
                full_text = ""
                for block in response.content:
                    if hasattr(block, "text"):
                        full_text += block.text
                return full_text
            except Exception as e:
                last_exception = e
                message = str(e).lower()
                logger.error(f"Claude model {model} failed: {e}")
                if "model not found" in message or "unknown model" in message or "invalid model" in message:
                    continue
                break

        logger.error("All Anthropic Claude model candidates failed.")
        return "Sorry, I couldn't generate a response right now."
    
    def _format_sources(self, chunks: List[Dict]) -> List[Dict]:
        """Format source information from chunks"""
        sources = []
        for chunk in chunks:
            metadata = chunk.get('metadata', {})
            distance = chunk.get('distance')
            relevance_score = 0.0
            if isinstance(distance, (int, float)):
                relevance_score = 1.0 - max(0.0, min(1.0, distance))

            pages = metadata.get('pages') or chunk.get('pages')
            page_info = None
            if pages:
                page_list = sorted(set(pages))
                page_info = (
                    f"Page {page_list[0]}" if len(page_list) == 1
                    else "Pages " + ", ".join(str(p) for p in page_list)
                )

            section_title = metadata.get('title') or chunk.get('title')

            excerpt = chunk.get('text', '')
            if excerpt:
                excerpt = excerpt.strip().replace('\n', ' ')
                if len(excerpt) > 240:
                    excerpt = excerpt[:240].rsplit(' ', 1)[0] + '...'
            sources.append({
                "chunk_id": chunk.get('id', ''),
                "document_id": metadata.get('document_id', ''),
                "report_id": metadata.get('report_id', ''),
                "chunk_index": metadata.get('chunk_index', 0),
                "page_info": page_info,
                "section_title": section_title,
                "relevance_score": relevance_score,
                "excerpt": excerpt
            })
        return sources

    def _append_sources(self, answer: str, sources: List[Dict]) -> str:
        """Append inline source references to the answer text."""
        if not sources:
            return answer

        source_lines = []
        for source in sources:
            parts = []
            if source.get('section_title'):
                parts.append(source['section_title'])
            if source.get('page_info'):
                parts.append(source['page_info'])
            if not parts:
                parts.append(f"Document {source.get('document_id', 'unknown')}")

            source_lines.append(f"Source: {' | '.join(parts)}")

        return f"{answer}\n\n{chr(10).join(source_lines)}"

    def _calculate_confidence(self, sources: List[Dict]) -> str:
        """Calculate a confidence label using retrieval relevance scores."""
        if not sources:
            return "low"

        scores = [s.get('relevance_score', 0.0) for s in sources if isinstance(s.get('relevance_score'), (int, float))]
        if not scores:
            return "low"

        avg_score = sum(scores) / len(scores)
        if avg_score >= 0.80:
            return "high"
        if avg_score >= 0.60:
            return "medium"
        return "low"

    def _generate_mock_rag_answer(self, question: str, chunks: List[Dict]) -> str:
        """Generate a structured mock answer from retrieved context chunks matching question keywords"""
        import re
        question_lower = question.lower()
        
        # Extract keywords to search sentences for relevance
        words = [
            w for w in re.findall(r'\w+', question_lower) 
            if len(w) > 3 and w not in [
                "what", "when", "where", "which", "how", "many", 
                "much", "company", "ticker", "ratio", "ratios", 
                "financial", "report", "please", "about", "there"
            ]
        ]
        
        matched_sentences = []
        for chunk in chunks:
            text = chunk.get('text', '')
            # Split text into sentences using simple regex
            sentences = re.split(r'(?<=[.!?])\s+', text)
            for sentence in sentences:
                sentence_strip = sentence.strip()
                if not sentence_strip:
                    continue
                sentence_lower = sentence_strip.lower()
                matches = sum(1 for w in words if w in sentence_lower)
                if matches > 0:
                    matched_sentences.append((matches, sentence_strip))
        
        # Sort matched sentences by keyword overlap count
        matched_sentences.sort(key=lambda x: x[0], reverse=True)
        
        if matched_sentences:
            best_matches = [s[1] for s in matched_sentences[:4]]
            context_summary = " ".join(best_matches)
            answer = f"Based on the retrieved sections from the financial document, here are the most relevant details:\n\n{context_summary}\n\nFeel free to ask more specific questions about the company's financial indicators, solvency, or operational growth."
        else:
            # Fallback snippet
            snippet = chunks[0].get('text', '')[:350].strip() + "..." if chunks else "No relevant context chunks found."
            answer = (
                f"Regarding your query: \"{question}\"\n\n"
                f"I scanned the report and retrieved the following document excerpt:\n\n\"{snippet}\"\n\n"
                "I couldn't generate a full generative response at this time, but the excerpt above is based on the document context."
            )
            
        return answer

    
    def generate_summary(
        self,
        document_id: str,
        use_openai: bool = False
    ) -> Dict:
        """
        Generate a summary of the entire document
        
        Args:
            document_id: Document to summarize
            use_openai: Whether to use OpenAI or Anthropic
            
        Returns:
            Dict with summary and key points
        """
        # Retrieve top chunks from document (get a good sample)
        chunks = self.vector_store.search(
            query="financial summary key metrics performance",
            n_results=10,
            document_id=document_id
        )
        
        if not chunks:
            return {
                "summary": "Unable to generate summary - no content found.",
                "key_points": []
            }
        
        context = self._build_context(chunks)
        
        system_prompt = "You are a financial analyst creating executive summaries."
        user_prompt = f"""Please provide a concise executive summary of this financial document.

DOCUMENT CONTENT:
{context}

Provide:
1. A 2-3 paragraph executive summary
2. 5-7 key points or highlights
3. Any notable concerns or opportunities

Format as:
EXECUTIVE SUMMARY:
[summary text]

KEY POINTS:
- Point 1
- Point 2
..."""
        
        if use_openai and self.openai_client:
            summary = self._generate_answer_openai(system_prompt, user_prompt)
        elif not use_openai and self.anthropic_client:
            summary = self._generate_answer_anthropic(system_prompt, user_prompt)
        else:
            summary = "AI service not configured."
        
        return {
            "summary": summary,
            "chunks_analyzed": len(chunks)
        }
