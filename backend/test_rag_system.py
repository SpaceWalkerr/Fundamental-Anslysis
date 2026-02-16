#!/usr/bin/env python3
"""
Test Script for Full Analysis Pipeline
Tests: Upload → Extract → AI Analysis → RAG Chat
"""
import requests
import json
import time
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000"
TEST_EMAIL = "testuser@example.com"
TEST_PASSWORD = "TestPassword123!"

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

def print_step(message):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{message}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def print_success(message):
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message):
    print(f"{RED}✗ {message}{RESET}")

def print_info(message):
    print(f"{YELLOW}ℹ {message}{RESET}")


def test_authentication():
    """Test user registration and login"""
    print_step("Step 1: Authentication")
    
    # Try login first
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    
    if response.status_code == 200:
        print_success("Login successful")
        token = response.json()["access_token"]
        return token
    
    print_info("User doesn't exist, registering...")
    
    # Register new user
    response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": "Test User"
        }
    )
    
    if response.status_code == 201:
        print_success("Registration successful")
        token = response.json()["access_token"]
        return token
    else:
        print_error(f"Authentication failed: {response.text}")
        return None


def test_file_upload(token):
    """Test file upload and processing"""
    print_step("Step 2: File Upload & Processing")
    
    # Create a simple test PDF content (you can also use a real PDF file)
    test_pdf_path = "test_financial_document.pdf"
    
    if not Path(test_pdf_path).exists():
        print_info(f"No test file found at {test_pdf_path}")
        print_info("Please place a financial PDF document at that location")
        return None
    
    headers = {"Authorization": f"Bearer {token}"}
    
    with open(test_pdf_path, "rb") as f:
        files = {"file": (test_pdf_path, f, "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/analysis/upload",
            files=files,
            headers=headers
        )
    
    if response.status_code == 200:
        data = response.json()
        print_success("File uploaded successfully")
        print_info(f"File ID: {data['file_id']}")
        print_info(f"Extracted text length: {data['metadata'].get('extracted_text_length', 0)}")
        print_info(f"Chunks created: {data['metadata'].get('chunks_created', 0)}")
        print_info(f"Chunks embedded: {data['metadata'].get('chunks_embedded', 0)}")
        return data['file_id']
    else:
        print_error(f"Upload failed: {response.text}")
        return None


def test_ai_analysis(token, file_id):
    """Test AI-powered financial analysis"""
    print_step("Step 3: AI Financial Analysis")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(
        f"{BASE_URL}/api/analysis/analyze",
        json={"file_id": file_id},
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print_success("Analysis completed")
        print_info(f"Report ID: {data['report_id']}")
        print_info(f"Status: {data['status']}")
        
        if "analysis" in data:
            analysis = data["analysis"]
            print(f"\n{GREEN}Analysis Summary:{RESET}")
            print(f"  Overall Score: {analysis.get('overall_score', 'N/A')}/10")
            print(f"  Investment Assessment: {analysis.get('investment_assessment', 'N/A')}")
            
            strengths = analysis.get('strengths', [])
            if strengths:
                print(f"\n  {GREEN}Strengths:{RESET}")
                for strength in strengths[:3]:
                    print(f"    • {strength}")
            
            red_flags = analysis.get('red_flags', [])
            if red_flags:
                print(f"\n  {RED}Red Flags:{RESET}")
                for flag in red_flags[:3]:
                    print(f"    • {flag}")
        
        return data['report_id']
    else:
        print_error(f"Analysis failed: {response.text}")
        return None


def test_rag_chat(token, report_id):
    """Test RAG-powered document chat"""
    print_step("Step 4: RAG Document Chat")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test questions
    questions = [
        "What is the company's revenue?",
        "What are the main financial risks?",
        "How is the company's profitability?"
    ]
    
    for i, question in enumerate(questions, 1):
        print(f"\n{BLUE}Question {i}: {question}{RESET}")
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "report_id": report_id,
                "message": question
            },
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("Response received")
            print(f"\n{GREEN}Answer:{RESET}")
            print(f"  {data['content']}")
            
            sources = data.get('sources', [])
            if sources:
                print(f"\n  {YELLOW}Sources: {len(sources)} relevant chunks{RESET}")
                for idx, source in enumerate(sources[:2], 1):
                    print(f"    {idx}. Relevance: {source.get('similarity_score', 0):.2f}")
        else:
            print_error(f"Chat failed: {response.text}")
        
        # Small delay between questions
        time.sleep(1)


def test_vector_store_stats(token):
    """Test vector store statistics"""
    print_step("Step 5: Vector Store Statistics")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # This endpoint may not exist yet, but we can check the server
    response = requests.get(f"{BASE_URL}/health", headers=headers)
    
    if response.status_code == 200:
        print_success("Server health check passed")
    else:
        print_info("Health check endpoint not available")


def main():
    """Run all tests"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}  RAG Financial Analysis System - Integration Test{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    print_info(f"Testing against: {BASE_URL}")
    print_info("Make sure the backend server is running!")
    print_info("Make sure you have added OPENAI_API_KEY or ANTHROPIC_API_KEY to .env")
    
    input("\nPress Enter to continue...")
    
    # Step 1: Authentication
    token = test_authentication()
    if not token:
        print_error("Authentication failed. Exiting.")
        return
    
    # Step 2: File Upload
    file_id = test_file_upload(token)
    if not file_id:
        print_error("File upload failed. Exiting.")
        return
    
    # Step 3: AI Analysis
    report_id = test_ai_analysis(token, file_id)
    if not report_id:
        print_error("AI analysis failed. Exiting.")
        return
    
    # Step 4: RAG Chat
    test_rag_chat(token, report_id)
    
    # Step 5: Stats
    test_vector_store_stats(token)
    
    print(f"\n{GREEN}{'='*60}{RESET}")
    print(f"{GREEN}  All tests completed!{RESET}")
    print(f"{GREEN}{'='*60}{RESET}\n")


if __name__ == "__main__":
    main()
