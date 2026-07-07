from fastapi import FastAPI, UploadFile, File
import pypdf
import io

app = FastAPI(title="Resume Analyzer ML Service")

# A simple health check route
@app.get("/")
def read_root():
    return {"status": "Active", "message": "ML Microservice is running!"}

# The main extraction route
@app.post("/analyze")
async def analyze_resume(file: UploadFile = File(...)):
    # 1. Read the uploaded file into memory
    content = await file.read()
    
    # 2. Extract text using PyPDF
    try:
        pdf_reader = pypdf.PdfReader(io.BytesIO(content))
        extracted_text = ""
        for page in pdf_reader.pages:
            extracted_text += page.extract_text() or ""
    except Exception as e:
        return {"error": f"Could not parse PDF: {str(e)}"}

    # 3. Mock ML Processing (To be replaced with real ML models later)
    mock_skills = []
    text_lower = extracted_text.lower()
    
    # Very basic keyword matching just to prove the pipeline works
    if "python" in text_lower: mock_skills.append("Python")
    if "react" in text_lower: mock_skills.append("React")
    if "node" in text_lower: mock_skills.append("Node.js")
    if "machine learning" in text_lower: mock_skills.append("Machine Learning")

    # 4. Return the structured JSON
    return {
        "filename": file.filename,
        "raw_text_length": len(extracted_text),
        "skills_detected": mock_skills,
        "match_score": 85 # Dummy score for the MVP
    }