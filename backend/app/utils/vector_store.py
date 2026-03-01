"""
Vector Store Service using ChromaDB
Handles document embeddings and semantic search for RAG
"""
from typing import List, Dict, Optional
import os
import uuid
from datetime import datetime


class VectorStoreService:
    """
    Vector store service for document embeddings and retrieval
    Uses ChromaDB for storage and sentence-transformers for embeddings
    """
    
    def __init__(
        self,
        persist_directory: str = "./chroma_db",
        embedding_model: str = "all-MiniLM-L6-v2"
    ):
        """
        Initialize vector store service
        
        Args:
            persist_directory: Directory to persist ChromaDB data
            embedding_model: Sentence transformer model name
        """
        # Import chromadb only when needed
        try:
            import chromadb
            from chromadb.config import Settings
            from sentence_transformers import SentenceTransformer
        except ImportError as e:
            raise ImportError(
                "ChromaDB and sentence-transformers are required for document analysis features. "
                "Install with: pip install chromadb sentence-transformers"
            ) from e
        
        self.persist_directory = persist_directory
        
        # Create directory if it doesn't exist
        os.makedirs(persist_directory, exist_ok=True)
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Initialize embedding model
        self.embedding_model = SentenceTransformer(embedding_model)
        
        # Collection name for financial documents
        self.collection_name = "financial_documents"
        
        # Get or create collection
        try:
            self.collection = self.client.get_collection(self.collection_name)
        except:
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}  # Use cosine similarity
            )
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for text using sentence transformer
        
        Args:
            text: Text to embed
            
        Returns:
            List[float]: Embedding vector
        """
        embedding = self.embedding_model.encode(text, convert_to_tensor=False)
        return embedding.tolist()
    
    def add_document_chunks(
        self,
        document_id: str,
        chunks: List[Dict],
        metadata: Optional[Dict] = None
    ) -> int:
        """
        Add document chunks to vector store
        
        Args:
            document_id: Unique document identifier
            chunks: List of text chunks from text_chunker
            metadata: Additional metadata for the document
            
        Returns:
            int: Number of chunks added
        """
        if not chunks:
            return 0
        
        ids = []
        embeddings = []
        documents = []
        metadatas = []
        
        base_metadata = metadata or {}
        base_metadata['document_id'] = document_id
        base_metadata['added_at'] = datetime.utcnow().isoformat()
        
        for i, chunk in enumerate(chunks):
            # Generate unique ID for chunk
            chunk_id = f"{document_id}_chunk_{i}"
            ids.append(chunk_id)
            
            # Get chunk text
            chunk_text = chunk.get('text', '')
            documents.append(chunk_text)
            
            # Generate embedding
            embedding = self.embed_text(chunk_text)
            embeddings.append(embedding)
            
            # Combine metadata
            chunk_metadata = {
                **base_metadata,
                'chunk_index': i,
                'chunk_size': chunk.get('size', len(chunk_text)),
                'start_pos': chunk.get('start', 0),
                'end_pos': chunk.get('end', len(chunk_text))
            }
            metadatas.append(chunk_metadata)
        
        # Add to collection
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
        
        return len(chunks)
    
    def search(
        self,
        query: str,
        n_results: int = 5,
        document_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Search for relevant chunks using semantic similarity
        
        Args:
            query: Search query
            n_results: Number of results to return
            document_id: Optional filter by document ID
            user_id: Optional filter by user ID
            
        Returns:
            List[Dict]: Relevant chunks with content and metadata
        """
        # Generate query embedding
        query_embedding = self.embed_text(query)
        
        # Build where filter
        where_filter = {}
        if document_id:
            where_filter['document_id'] = document_id
        if user_id:
            where_filter['user_id'] = user_id
        
        # Search collection
        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_filter if where_filter else None
            )
        except Exception as e:
            print(f"Search error: {e}")
            return []
        
        # Format results
        formatted_results = []
        if results and results['documents']:
            for i in range(len(results['documents'][0])):
                formatted_results.append({
                    'text': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i],
                    'distance': results['distances'][0][i] if 'distances' in results else None,
                    'id': results['ids'][0][i]
                })
        
        return formatted_results
    
    def delete_document(self, document_id: str) -> int:
        """
        Delete all chunks for a document
        
        Args:
            document_id: Document ID to delete
            
        Returns:
            int: Number of chunks deleted
        """
        try:
            # Get all chunks for document
            results = self.collection.get(
                where={"document_id": document_id}
            )
            
            if results and results['ids']:
                # Delete chunks
                self.collection.delete(ids=results['ids'])
                return len(results['ids'])
            
            return 0
        except Exception as e:
            print(f"Delete error: {e}")
            return 0
    
    def get_collection_stats(self) -> Dict:
        """
        Get statistics about the collection
        
        Returns:
            Dict: Collection statistics
        """
        try:
            count = self.collection.count()
            return {
                "total_chunks": count,
                "collection_name": self.collection_name,
                "persist_directory": self.persist_directory
            }
        except Exception as e:
            print(f"Stats error: {e}")
            return {}
    
    def reset_collection(self):
        """
        Reset the entire collection (WARNING: Deletes all data)
        """
        self.client.delete_collection(self.collection_name)
        self.collection = self.client.create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )


# Global instance (singleton pattern)
_vector_store_instance = None


def get_vector_store() -> VectorStoreService:
    """
    Get or create global vector store instance
    
    Returns:
        VectorStoreService: Vector store instance
    """
    global _vector_store_instance
    
    if _vector_store_instance is None:
        # Use backend directory for persistence
        persist_dir = os.path.join(os.path.dirname(__file__), "../..", "chroma_db")
        _vector_store_instance = VectorStoreService(persist_directory=persist_dir)
    
    return _vector_store_instance
