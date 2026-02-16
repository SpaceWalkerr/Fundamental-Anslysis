"""
PDF Text Extraction Utility
Extracts text from PDF files using pdfplumber and PyPDF2
"""
import pdfplumber
from PyPDF2 import PdfReader
from typing import Dict, List
import io


def extract_text_from_pdf(file_content: bytes) -> Dict[str, any]:
    """
    Extract text from PDF file
    
    Args:
        file_content: PDF file content as bytes
        
    Returns:
        Dictionary with extracted text and metadata
    """
    result = {
        "text": "",
        "pages": [],
        "total_pages": 0,
        "extraction_method": "pdfplumber",
        "success": True,
        "error": None
    }
    
    try:
        # Try pdfplumber first (better for structured data)
        pdf_file = io.BytesIO(file_content)
        
        with pdfplumber.open(pdf_file) as pdf:
            result["total_pages"] = len(pdf.pages)
            
            for page_num, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text() or ""
                
                result["pages"].append({
                    "page_number": page_num,
                    "text": page_text,
                    "char_count": len(page_text)
                })
                
                result["text"] += page_text + "\n\n"
        
        # Clean up extracted text
        result["text"] = result["text"].strip()
        result["char_count"] = len(result["text"])
        result["word_count"] = len(result["text"].split())
        
    except Exception as pdfplumber_error:
        # Fallback to PyPDF2
        try:
            result["extraction_method"] = "pypdf2"
            pdf_file = io.BytesIO(file_content)
            reader = PdfReader(pdf_file)
            
            result["total_pages"] = len(reader.pages)
            
            for page_num, page in enumerate(reader.pages, start=1):
                page_text = page.extract_text() or ""
                
                result["pages"].append({
                    "page_number": page_num,
                    "text": page_text,
                    "char_count": len(page_text)
                })
                
                result["text"] += page_text + "\n\n"
            
            result["text"] = result["text"].strip()
            result["char_count"] = len(result["text"])
            result["word_count"] = len(result["text"].split())
            
        except Exception as pypdf_error:
            result["success"] = False
            result["error"] = f"PDF extraction failed: {str(pypdf_error)}"
            result["pdfplumber_error"] = str(pdfplumber_error)
            result["pypdf2_error"] = str(pypdf_error)
    
    return result


def extract_tables_from_pdf(file_content: bytes) -> List[Dict]:
    """
    Extract tables from PDF file
    
    Args:
        file_content: PDF file content as bytes
        
    Returns:
        List of tables with their data
    """
    tables = []
    
    try:
        pdf_file = io.BytesIO(file_content)
        
        with pdfplumber.open(pdf_file) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                page_tables = page.extract_tables()
                
                if page_tables:
                    for table_num, table in enumerate(page_tables, start=1):
                        tables.append({
                            "page_number": page_num,
                            "table_number": table_num,
                            "data": table,
                            "row_count": len(table),
                            "column_count": len(table[0]) if table else 0
                        })
    
    except Exception as e:
        print(f"Error extracting tables: {str(e)}")
    
    return tables
