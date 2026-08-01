"""
llm_service.py
──────────────
Generates AI-powered resume analysis summaries using Google Gemini Flash.

Uses the google-genai SDK (the modern replacement for google-generativeai).
If GEMINI_API_KEY is not set or the API call fails, the service gracefully
degrades to a rule-based fallback so the rest of the pipeline is never blocked.
"""

import logging
import os

logger = logging.getLogger(__name__)

_client = None
_client_init_error: str | None = None


def _get_client():
    """Lazy-load the Gemini client exactly once. Returns None if unavailable."""
    global _client, _client_init_error

    if _client is not None or _client_init_error is not None:
        return _client

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        _client_init_error = "GEMINI_API_KEY not set"
        logger.warning("LLM summary disabled: GEMINI_API_KEY environment variable is not set.")
        return None

    try:
        from google import genai  # noqa: PLC0415

        _client = genai.Client(api_key=api_key)
        logger.info("Gemini client initialised successfully.")
    except Exception as exc:
        _client_init_error = str(exc)
        logger.error("Failed to initialise Gemini client: %s", exc)
        _client = None

    return _client


def generate_resume_summary(
    role_title: str,
    score: int,
    matched_skills: list[str],
    missing_skills: list[str],
    resume_snippet: str,
) -> str:
    """
    Return a 2-3 sentence professional summary of how well the candidate
    fits the role. Falls back to a rule-based string if Gemini is
    unavailable or returns an error.

    Parameters
    ----------
    role_title      : The target job title (e.g. "Backend Developer").
    score           : Overall match score 0-100.
    matched_skills  : Skills the candidate has that are required/preferred.
    missing_skills  : Required skills not found in the resume.
    resume_snippet  : First ~400 chars of the extracted resume text used as
                      context. Truncated automatically if longer.
    """
    client = _get_client()
    if client is None:
        return _fallback_summary(score, role_title)

    matched_str = ", ".join(matched_skills[:10]) if matched_skills else "none identified"
    missing_str = ", ".join(missing_skills[:6]) if missing_skills else "none"
    snippet = resume_snippet[:400].strip()

    prompt = (
        f"You are an expert career coach reviewing a resume for a {role_title} position.\n\n"
        f"Match score: {score}/100\n"
        f"Matched skills: {matched_str}\n"
        f"Missing skills: {missing_str}\n"
        f"Resume excerpt:\n{snippet}\n\n"
        "Write a 2-3 sentence professional summary of how well this candidate fits the role. "
        "Be specific, honest, and constructive. Mention the strongest matched skills and the "
        "most impactful gap if any. Do not use generic filler phrases like great opportunity."
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        text = (response.text or "").strip()
        if text:
            return text
        logger.warning("Gemini returned an empty response; using fallback summary.")
    except Exception as exc:
        logger.error("Gemini summary generation failed: %s", exc)

    return _fallback_summary(score, role_title)


def _fallback_summary(score: int, role_title: str) -> str:
    """Rule-based fallback when Gemini is unavailable."""
    if score >= 80:
        return (
            f"The resume is a strong match for the {role_title} role, "
            "covering most of the required skills and experience areas."
        )
    if score >= 50:
        return (
            f"The resume partially matches the {role_title} role. "
            "Some key skills are present, but notable gaps remain that "
            "should be addressed before applying."
        )
    return (
        f"The resume needs more role-specific evidence to be competitive for "
        f"the {role_title} position. Consider adding projects or experience "
        "that directly demonstrate the required skills."
    )


def extract_skills_from_jd(job_description: str) -> dict | None:
    """
    Extracts required and good-to-have skills from a raw job description using Gemini.
    Returns a dictionary like {"requiredSkills": [...], "goodToHave": [...]} or None on failure.
    """
    client = _get_client()
    if client is None or not job_description.strip():
        return None

    prompt = (
        "You are an expert technical recruiter. Read the following job description and extract the key skills.\n"
        "Categorize them into 'requiredSkills' and 'goodToHave'.\n"
        "Return ONLY a valid JSON object matching this schema exactly:\n"
        '{"requiredSkills": ["skill1", "skill2"], "goodToHave": ["skill3"]}\n\n'
        f"Job Description:\n{job_description}"
    )

    try:
        import json
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        text = (response.text or "").strip()
        if text:
            extracted = json.loads(text)
            return {
                "requiredSkills": extracted.get("requiredSkills", []),
                "goodToHave": extracted.get("goodToHave", [])
            }
    except Exception as exc:
        logger.error("Failed to extract skills from JD: %s", exc)

    return None

