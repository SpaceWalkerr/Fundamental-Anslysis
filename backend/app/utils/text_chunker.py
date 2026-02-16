"""
Text Chunking Utility
Splits large documents into chunks for embedding and retrieval
"""
from typing import List, Dict
import re


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    min_chunk_size: int = 100
) -> List[Dict[str, any]]:
    """
    Split text into overlapping chunks
    
    Args:
        text: Text to chunk
        chunk_size: Maximum characters per chunk
        chunk_overlap: Number of characters to overlap between chunks
        min_chunk_size: Minimum size for a chunk
        
    Returns:
        List of dictionaries with chunk data
    """
    if not text or len(text) < min_chunk_size:
        return []
    
    chunks = []
    start = 0
    chunk_id = 0
    
    # Clean text
    text = re.sub(r'\s+', ' ', text).strip()
    
    while start < len(text):
        # Calculate end position
        end = start + chunk_size
        
        # If this is not the last chunk, try to break at sentence boundary
        if end < len(text):
            # Look for sentence ending
            sentence_end = max(
                text.rfind('. ', start, end),
                text.rfind('! ', start, end),
                text.rfind('? ', start, end),
                text.rfind('\n', start, end)
            )
            
            # If found a sentence boundary, use it
            if sentence_end > start + min_chunk_size:
                end = sentence_end + 1
        
        # Extract chunk
        chunk_text = text[start:end].strip()
        
        if len(chunk_text) >= min_chunk_size:
            chunks.append({
                "chunk_id": chunk_id,
                "text": chunk_text,
                "start_char": start,
                "end_char": end,
                "char_count": len(chunk_text),
                "word_count": len(chunk_text.split())
            })
            chunk_id += 1
        
        # Move start position with overlap
        start = end - chunk_overlap
        
        # Prevent infinite loop
        if start <= chunks[-1]["start_char"] if chunks else 0:
            start = end
    
    return chunks


def chunk_by_pages(
    pages: List[Dict[str, any]],
    max_chunk_size: int = 2000
) -> List[Dict[str, any]]:
    """
    Chunk text by pages, combining small pages
    
    Args:
        pages: List of page dictionaries with 'text' and 'page_number'
        max_chunk_size: Maximum characters per chunk
        
    Returns:
        List of chunk dictionaries
    """
    chunks = []
    current_chunk = ""
    current_pages = []
    chunk_id = 0
    
    for page in pages:
        page_text = page.get("text", "")
        page_num = page.get("page_number", 0)
        
        # If adding this page exceeds max size, save current chunk
        if current_chunk and len(current_chunk) + len(page_text) > max_chunk_size:
            chunks.append({
                "chunk_id": chunk_id,
                "text": current_chunk.strip(),
                "pages": current_pages.copy(),
                "char_count": len(current_chunk),
                "word_count": len(current_chunk.split())
            })
            chunk_id += 1
            current_chunk = ""
            current_pages = []
        
        # Add page to current chunk
        current_chunk += page_text + "\n\n"
        current_pages.append(page_num)
    
    # Add final chunk
    if current_chunk:
        chunks.append({
            "chunk_id": chunk_id,
            "text": current_chunk.strip(),
            "pages": current_pages,
            "char_count": len(current_chunk),
            "word_count": len(current_chunk.split())
        })
    
    return chunks


def chunk_by_sections(text: str, section_markers: List[str] = None) -> List[Dict[str, any]]:
    """
    Chunk text by sections based on markers
    
    Args:
        text: Text to chunk
        section_markers: List of regex patterns for section markers
        
    Returns:
        List of chunk dictionaries
    """
    if section_markers is None:
        # Default financial report section markers
        section_markers = [
            r'(?i)^#+\s+.*$',  # Markdown headers
            r'(?i)^(executive summary|introduction|overview)',
            r'(?i)^(income statement|balance sheet|cash flow)',
            r'(?i)^(assets|liabilities|equity)',
            r'(?i)^(revenue|expenses|profit)',
            r'(?i)^(notes to financial statements)',
            r'(?i)^(management discussion|md&a)',
        ]
    
    chunks = []
    current_section = ""
    current_title = "Introduction"
    chunk_id = 0
    
    lines = text.split('\n')
    
    for line in lines:
        # Check if line is a section marker
        is_section = False
        for pattern in section_markers:
            if re.match(pattern, line.strip()):
                # Save previous section
                if current_section.strip():
                    chunks.append({
                        "chunk_id": chunk_id,
                        "title": current_title,
                        "text": current_section.strip(),
                        "char_count": len(current_section),
                        "word_count": len(current_section.split())
                    })
                    chunk_id += 1
                
                # Start new section
                current_title = line.strip()
                current_section = ""
                is_section = True
                break
        
        if not is_section:
            current_section += line + "\n"
    
    # Add final section
    if current_section.strip():
        chunks.append({
            "chunk_id": chunk_id,
            "title": current_title,
            "text": current_section.strip(),
            "char_count": len(current_section),
            "word_count": len(current_section.split())
        })
    
    return chunks
