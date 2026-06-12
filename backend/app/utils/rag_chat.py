"""
RAG Chat Service
Handles retrieval-augmented generation for document Q&A
"""
from typing import List, Dict, Optional
import openai
import anthropic
from app.core.config import settings
from app.utils.vector_store import get_vector_store


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
        else:
            self.anthropic_client = None
    
    def chat(
        self,
        question: str,
        document_id: Optional[str] = None,
        conversation_history: Optional[List[Dict]] = None,
        n_context_chunks: int = 5,
        use_openai: bool = True
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
        
        # Step 2: Build context from retrieved chunks
        context_text = self._build_context(relevant_chunks)
        
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
        else:
            answer = self._generate_mock_rag_answer(question, relevant_chunks)
        
        # Step 5: Format response with sources
        sources = self._format_sources(relevant_chunks)
        
        return {
            "answer": answer,
            "sources": sources,
            "confidence": "high" if len(relevant_chunks) >= 3 else "medium",
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
- Never make up information not present in the context"""
    
    def _create_user_prompt(self, question: str, context: str) -> str:
        """Create user prompt with question and context"""
        return f"""Based on the following context from financial documents, please answer the question.

CONTEXT:
{context}

QUESTION:
{question}

Please provide a clear, accurate answer based on the context above. If the context doesn't contain relevant information, say so."""
    
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
                max_tokens=1000
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error generating response: {str(e)}"
    
    def _generate_answer_anthropic(
        self,
        system_prompt: str,
        user_prompt: str,
        conversation_history: Optional[List[Dict]] = None
    ) -> str:
        """Generate answer using Anthropic Claude"""
        messages = []
        
        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history[-6:])  # Last 3 exchanges
        
        # Add current question
        messages.append({"role": "user", "content": user_prompt})
        
        try:
            response = self.anthropic_client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                system=system_prompt,
                messages=messages,
                temperature=0.3,
                max_tokens=1000
            )
            return response.content[0].text
        except Exception as e:
            return f"Error generating response: {str(e)}"
    
    def _format_sources(self, chunks: List[Dict]) -> List[Dict]:
        """Format source information from chunks"""
        sources = []
        for chunk in chunks:
            metadata = chunk.get('metadata', {})
            sources.append({
                "chunk_id": chunk.get('id', ''),
                "document_id": metadata.get('document_id', ''),
                "chunk_index": metadata.get('chunk_index', 0),
                "relevance_score": 1 - (chunk.get('distance', 1.0) if chunk.get('distance') else 0.5)
            })
        return sources

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
            answer = f"Based on the retrieved sections from the financial document, here is the relevant details:\n\n{context_summary}\n\nFeel free to ask more specific questions about the company's financial indicators, solvency, or operational growth."
        else:
            # Fallback snippet
            snippet = chunks[0].get('text', '')[:350].strip() + "..." if chunks else "No relevant context chunks found."
            answer = f"Regarding your query: \"{question}\"\n\nI scanned the report and retrieved the following document excerpt:\n\n\"{snippet}\"\n\n(To enable full generative answers, configure OPENAI_API_KEY or ANTHROPIC_API_KEY in the backend settings)."
            
        return answer

    
    def generate_summary(
        self,
        document_id: str,
        use_openai: bool = True
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
