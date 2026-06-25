"""
File Processing Service
Handles file upload, extraction, and processing
"""
from typing import Dict, List, BinaryIO
import logging
import os
from datetime import datetime
from supabase import Client
import pandas as pd
from io import StringIO

logger = logging.getLogger(__name__)

from app.utils.pdf_extractor import extract_text_from_pdf, extract_tables_from_pdf
from app.utils.excel_extractor import extract_data_from_excel, get_excel_summary
from app.utils.text_chunker import chunk_text, chunk_by_pages
from app.utils.vector_store import get_vector_store


class FileProcessor:
    """Process uploaded files and extract content"""
    
    ALLOWED_EXTENSIONS = {'.pdf', '.xlsx', '.xls', '.csv'}
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    
    def __init__(self, supabase_client: Client):
        self.db = supabase_client
    
    def validate_file(self, filename: str, file_size: int) -> tuple[bool, str]:
        """
        Validate file before processing
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check file extension
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in self.ALLOWED_EXTENSIONS:
            return False, f"File type not supported. Allowed: {', '.join(self.ALLOWED_EXTENSIONS)}"
        
        # Check file size
        if file_size > self.MAX_FILE_SIZE:
            max_mb = self.MAX_FILE_SIZE / (1024 * 1024)
            return False, f"File too large. Maximum size: {max_mb}MB"
        
        return True, ""
    
    async def upload_to_storage(
        self,
        file_content: bytes,
        filename: str,
        user_id: str
    ) -> Dict[str, any]:
        """
        Upload file to Supabase Storage
        
        Returns:
            Dictionary with upload result
        """
        try:
            # Create unique file path
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            file_ext = os.path.splitext(filename)[1]
            storage_path = f"{user_id}/{timestamp}_{filename}"
            
            # Upload to Supabase Storage
            result = self.db.storage.from_('documents').upload(
                path=storage_path,
                file=file_content,
                file_options={"content-type": self.get_content_type(file_ext)}
            )
            
            return {
                "success": True,
                "storage_path": storage_path,
                "filename": filename,
                "size": len(file_content),
                "uploaded_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Upload failed: {str(e)}"
            }
    
    def process_file(self, file_content: bytes, filename: str) -> Dict[str, any]:
        """
        Process uploaded file and extract content
        
        Returns:
            Dictionary with processed content
        """
        file_ext = os.path.splitext(filename)[1].lower()
        
        result = {
            "filename": filename,
            "file_type": file_ext,
            "success": False,
            "extracted_text": "",
            "chunks": [],
            "metadata": {}
        }
        
        try:
            # Extract based on file type
            if file_ext == '.pdf':
                extraction = extract_text_from_pdf(file_content)
                
                if extraction["success"]:
                    result["extracted_text"] = extraction["text"]
                    result["metadata"] = {
                        "total_pages": extraction["total_pages"],
                        "char_count": extraction["char_count"],
                        "word_count": extraction["word_count"],
                        "extraction_method": extraction["extraction_method"]
                    }
                    
                    # Try to extract tables
                    tables = extract_tables_from_pdf(file_content)
                    if tables:
                        result["metadata"]["tables_found"] = len(tables)
                    
                    # Chunk text
                    if extraction.get("pages"):
                        result["chunks"] = chunk_by_pages(extraction["pages"])
                    else:
                        result["chunks"] = chunk_text(extraction["text"])
                    
                    result["success"] = True
                else:
                    result["error"] = extraction.get("error", "PDF extraction failed")
            
            elif file_ext in ['.xlsx', '.xls']:
                extraction = extract_data_from_excel(file_content, file_ext)
                
                if extraction["success"]:
                    result["extracted_text"] = extraction["text"]
                    result["metadata"] = {
                        "total_sheets": extraction["total_sheets"],
                        "char_count": extraction["char_count"],
                        "word_count": extraction["word_count"],
                        "sheets": [
                            {
                                "name": sheet["name"],
                                "rows": sheet["row_count"],
                                "columns": sheet["column_count"]
                            }
                            for sheet in extraction["sheets"]
                        ]
                    }
                    
                    # Chunk text
                    result["chunks"] = chunk_text(extraction["text"])
                    result["success"] = True
                else:
                    result["error"] = extraction.get("error", "Excel extraction failed")

            elif file_ext == '.csv':
                csv_text = file_content.decode('utf-8', errors='replace')
                dataframe = pd.read_csv(StringIO(csv_text))
                extracted_text = dataframe.to_csv(index=False)

                result["extracted_text"] = extracted_text
                result["metadata"] = {
                    "rows": int(dataframe.shape[0]),
                    "columns": int(dataframe.shape[1]),
                    "column_names": list(dataframe.columns),
                    "char_count": len(extracted_text),
                    "word_count": len(extracted_text.split()),
                }
                result["chunks"] = chunk_text(extracted_text)
                result["success"] = True
            
            else:
                result["error"] = f"Unsupported file type: {file_ext}"
        
        except Exception as e:
            result["error"] = f"Processing failed: {str(e)}"
        
        return result
    
    def add_to_vector_store(
        self,
        document_id: str,
        chunks: list,
        user_id: str,
        filename: str
    ) -> int:
        """
        Add document chunks to vector store for semantic search
        
        Args:
            document_id: Unique document identifier
            chunks: List of text chunks
            user_id: User ID who owns the document
            filename: Original filename
            
        Returns:
            Number of chunks added
        """
        try:
            vector_store = get_vector_store()

            # Try to include report_id from source_documents if present so
            # vectors carry report linkage for accurate source citations.
            try:
                doc_res = self.db.table('source_documents').select('report_id').eq('id', document_id).single().execute()
                report_id = doc_res.data.get('report_id') if doc_res and doc_res.data else None
            except Exception:
                report_id = None

            # Add metadata for filtering and provenance
            metadata = {
                "user_id": user_id,
                "filename": filename,
            }
            if report_id:
                metadata['report_id'] = report_id

            return vector_store.add_document_chunks(
                document_id=document_id,
                chunks=chunks,
                metadata=metadata
            )
        except Exception as e:
            print(f"Error adding to vector store: {e}")
            return 0
    
    def add_to_vector_store(
        self,
        document_id: str,
        chunks: list,
        user_id: str,
        filename: str
    ) -> int:
        """
        Add document chunks to vector store for semantic search
        
        Args:
            document_id: Unique document identifier
            chunks: List of text chunks
            user_id: User ID who owns the document
            filename: Original filename
            
        Returns:
            Number of chunks added
        """
        try:
            vector_store = get_vector_store()

            # Try to include report_id from source_documents if present so
            # vectors carry report linkage for accurate source citations.
            try:
                doc_res = self.db.table('source_documents').select('report_id').eq('id', document_id).single().execute()
                report_id = doc_res.data.get('report_id') if doc_res and doc_res.data else None
            except Exception:
                report_id = None

            # Add metadata for filtering and provenance
            metadata = {
                "user_id": user_id,
                "filename": filename,
            }
            if report_id:
                metadata['report_id'] = report_id

            return vector_store.add_document_chunks(
                document_id=document_id,
                chunks=chunks,
                metadata=metadata
            )
        except Exception as e:
            print(f"Error adding to vector store: {e}")
            return 0
    
    @staticmethod
    def get_content_type(file_ext: str) -> str:
        """Get MIME content type for file extension"""
        content_types = {
            '.pdf': 'application/pdf',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.csv': 'text/csv'
        }
        return content_types.get(file_ext.lower(), 'application/octet-stream')
    
    async def save_document_record(
        self,
        user_id: str,
        filename: str,
        file_size: int,
        file_type: str,
        storage_path: str,
        extracted_text: str = "",
        metadata: Dict = None,
        report_id: str = None
    ) -> Dict[str, any]:
        """
        Save document record to database
        
        Returns:
            Created document record
        """
        try:
            if report_id:
                # Verify referenced report exists before inserting a source document
                report_check = self.db.table('reports')\
                    .select('id')\
                    .eq('id', report_id)\
                    .single()\
                    .execute()
                if not report_check.data:
                    logger.warning(f"Referenced report_id={report_id} does not exist before inserting source_document")
                    raise ValueError(f"Referenced report_id={report_id} does not exist")
                logger.info(f"Verified report exists for report_id={report_id} before inserting source_document")

            document_data = {
                "user_id": user_id,
                "report_id": report_id,
                "file_name": filename,
                "file_size": file_size,
                "file_type": file_type,
                "storage_path": storage_path,
                "extracted_text": extracted_text,
                "metadata": metadata or {}
            }
            
            result = self.db.table('source_documents').insert(document_data).execute()
            
            if result.data:
                logger.info(f"Inserted source_document for report_id={report_id}, document_id={result.data[0].get('id')}")
                return result.data[0]
            else:
                raise Exception("Failed to create document record")
        
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Database error inserting source_document for report_id={report_id}: {e}")
            raise Exception(f"Database error: {str(e)}")
