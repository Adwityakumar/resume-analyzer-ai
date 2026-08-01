import io
import json

from dotenv import load_dotenv
load_dotenv()  # loads GEMINI_API_KEY and other vars from .env at startup

import pypdf
from fastapi import FastAPI, File, HTTPException, Request, UploadFile

from .schemas import JobDemoAnalyzeRequest, JobMatchResponse, RoleKeypoints
from .services.job_matcher import analyze_job_match

app = FastAPI(title="Resume Analyzer ML Service")


@app.get("/")
def read_root():
    return {"status": "Active", "message": "ML Microservice is running!"}


@app.post("/analyze")
async def analyze_resume(file: UploadFile = File(...)):
    content = await file.read()

    try:
        extracted_text = _extract_pdf_text(content)
    except Exception as exc:
        return {"error": f"Could not parse PDF: {str(exc)}"}

    mock_skills = []
    text_lower = extracted_text.lower()

    if "python" in text_lower:
        mock_skills.append("Python")
    if "react" in text_lower:
        mock_skills.append("React")
    if "node" in text_lower:
        mock_skills.append("Node.js")
    if "machine learning" in text_lower:
        mock_skills.append("Machine Learning")

    return {
        "filename": file.filename,
        "raw_text_length": len(extracted_text),
        "skills_detected": mock_skills,
        "match_score": 85,
    }


@app.post("/jobdemo/analyze", response_model=JobMatchResponse)
async def analyze_jobdemo(request: Request):
    payload = await _build_jobdemo_payload(request)
    return analyze_job_match(payload)


async def _build_jobdemo_payload(request: Request) -> JobDemoAnalyzeRequest:
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" not in content_type:
        body = await request.json()
        return JobDemoAnalyzeRequest.model_validate(body)

    form = await request.form()
    resume_text = str(form.get("resumeText") or "")
    role = str(form.get("role") or "")
    job_description = str(form.get("jobDescription") or "")
    role_keypoints_raw = form.get("roleKeypoints")
    resume_file = form.get("resumeFile")

    if resume_file is not None and hasattr(resume_file, "read"):
        file_bytes = await resume_file.read()
        filename = (resume_file.filename or "").lower()
        content_type = (resume_file.content_type or "").lower()

        if content_type == "application/pdf" or filename.endswith(".pdf"):
            resume_text = _extract_pdf_text(file_bytes)
        else:
            resume_text = file_bytes.decode("utf-8", errors="ignore")

    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="resumeText or resumeFile is required.")

    if not role_keypoints_raw:
        raise HTTPException(status_code=400, detail="roleKeypoints is required.")

    role_keypoints = RoleKeypoints.model_validate(json.loads(str(role_keypoints_raw)))

    return JobDemoAnalyzeRequest(
        resumeText=resume_text,
        role=role,
        jobDescription=job_description,
        roleKeypoints=role_keypoints,
    )


def _extract_pdf_text(content: bytes) -> str:
    pdf_reader = pypdf.PdfReader(io.BytesIO(content))
    extracted_text = ""
    for page in pdf_reader.pages:
        extracted_text += page.extract_text() or ""
    return extracted_text
