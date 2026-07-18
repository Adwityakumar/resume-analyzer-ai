import math
import re
from collections import Counter

from app.schemas import JobDemoAnalyzeRequest, JobMatchResponse
from app.services.embedding_service import get_embedding_backend, max_embedding_similarity


SKILL_ALIASES = {
    "Node.js": ["node.js", "nodejs", "node js", "node"],
    "Express.js": ["express.js", "expressjs", "express js", "express"],
    "REST API": ["rest api", "restful api", "rest", "api development", "restful services"],
    "JavaScript": ["javascript", "js", "ecmascript"],
    "TypeScript": ["typescript", "ts"],
    "MongoDB": ["mongodb", "mongo db", "mongo"],
    "CI/CD": ["ci/cd", "cicd", "continuous integration", "continuous deployment"],
    "AWS": ["aws", "amazon web services"],
    "Git": ["git", "github", "gitlab", "bitbucket"],
    "Responsive Design": ["responsive design", "mobile first", "mobile friendly", "adaptive design"],
    "Accessibility": ["accessibility", "a11y", "wcag"],
    "Next.js": ["next.js", "nextjs", "next js"],
    "Tailwind CSS": ["tailwind css", "tailwind"],
    "Redux": ["redux", "redux toolkit"],
    "SQL": ["sql", "mysql", "postgresql", "postgres", "sqlite"],
    "Authentication": ["authentication", "auth", "jwt", "oauth", "login"],
    "API Security": ["api security", "security", "rate limiting", "authorization"],
    "Microservices": ["microservices", "microservice"],
    "Excel": ["excel", "spreadsheets", "spreadsheet"],
    "Python": ["python"],
    "Data Visualization": ["data visualization", "visualization", "charts", "dashboards", "dashboard"],
    "Statistics": ["statistics", "statistical analysis", "regression", "hypothesis testing"],
    "Power BI": ["power bi", "powerbi", "microsoft power bi"],
    "Data Cleaning": ["data cleaning", "data preprocessing", "data wrangling"],
    "Reporting": ["reporting", "reports", "metrics", "kpi", "kpis"],
    "Tableau": ["tableau"],
    "Pandas": ["pandas"],
    "NumPy": ["numpy", "num py"],
    "Machine Learning": ["machine learning", "ml"],
    "Business Intelligence": ["business intelligence", "bi"],
    "Figma": ["figma"],
    "Wireframing": ["wireframing", "wireframes", "wireframe"],
    "Prototyping": ["prototyping", "prototype", "prototypes"],
    "User Research": ["user research", "ux research", "interviews", "user interviews"],
    "User Flows": ["user flows", "user flow", "journey map", "journey mapping"],
    "Usability Testing": ["usability testing", "user testing", "usability test"],
    "Design Systems": ["design systems", "design system", "component library"],
    "Adobe XD": ["adobe xd", "xd"],
    "Product Thinking": ["product thinking", "product strategy", "product design"],
}

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "to",
    "using",
    "with",
}

SEMANTIC_MATCH_THRESHOLD = 0.24
PARTIAL_MATCH_FLOOR = 0.62
EMBEDDING_MATCH_THRESHOLD = 0.42


def analyze_job_match(payload: JobDemoAnalyzeRequest) -> JobMatchResponse:
    resume_text = payload.resumeText or ""
    job_description = payload.jobDescription or ""
    required_skills = payload.roleKeypoints.requiredSkills
    good_to_have = payload.roleKeypoints.goodToHave

    all_role_skills = required_skills + good_to_have
    extracted_skills = _extract_resume_skills(resume_text, all_role_skills)

    required_details = [_score_skill(resume_text, skill, required=True) for skill in required_skills]
    good_to_have_details = [_score_skill(resume_text, skill, required=False) for skill in good_to_have]

    matched_required = [item["skill"] for item in required_details if item["matched"]]
    matched_good_to_have = [item["skill"] for item in good_to_have_details if item["matched"]]
    missing_skills = [item["skill"] for item in required_details if not item["matched"]]

    required_score = _weighted_average(required_details, 80)
    good_to_have_score = _weighted_average(good_to_have_details, 20)
    score = min(100, round(required_score + good_to_have_score))

    matched_skills = matched_required + matched_good_to_have
    semantic_matches = _format_match_details(required_details + good_to_have_details)
    suggestions = _build_suggestions(missing_skills, job_description)
    summary = _build_summary(score, payload.roleKeypoints.title)

    return JobMatchResponse(
        role=payload.roleKeypoints.title,
        score=score,
        matchedSkills=matched_skills,
        missingSkills=missing_skills,
        suggestions=suggestions,
        summary=summary,
        extractedResumeText=resume_text,
        extractedSkills=extracted_skills,
        semanticMatches=semantic_matches,
        scoreBreakdown={
            "requiredSkillsScore": round(required_score, 2),
            "goodToHaveScore": round(good_to_have_score, 2),
            "extractedSkillCount": float(len(extracted_skills)),
            "semanticBackend": get_embedding_backend(),
        },
    )


def _extract_resume_skills(text: str, role_skills: list[str]) -> list[str]:
    extracted = set()
    known_skills = sorted(set(role_skills + list(SKILL_ALIASES.keys())))

    for skill in known_skills:
        if _contains_skill(text, skill):
            extracted.add(skill)

    return sorted(extracted)


def _score_skill(text: str, skill: str, required: bool) -> dict:
    exact_match = _contains_skill(text, skill)
    cosine_similarity = _max_semantic_similarity(text, _skill_profile(skill))

    if exact_match:
        match_score = 1.0
    elif cosine_similarity >= _active_match_threshold():
        match_score = max(PARTIAL_MATCH_FLOOR, min(cosine_similarity / 0.75, 1.0))
    else:
        match_score = min(cosine_similarity * 0.5, 0.4)

    return {
        "skill": skill,
        "required": required,
        "exactMatch": exact_match,
        "similarity": cosine_similarity,
        "score": match_score,
        "matched": match_score >= 0.55,
    }


def _weighted_average(match_details: list[dict], weight: int) -> float:
    if not match_details:
        return 0

    total = sum(item["score"] for item in match_details)
    return (total / len(match_details)) * weight


def _format_match_details(match_details: list[dict]) -> list[dict]:
    return [
        {
            "skill": item["skill"],
            "required": item["required"],
            "matched": item["matched"],
            "exactMatch": item["exactMatch"],
            "similarity": round(item["similarity"], 3),
            "scoreContribution": round(item["score"], 3),
        }
        for item in match_details
    ]


def _contains_skill(text: str, skill: str) -> bool:
    normalized_text = _normalize(text)
    aliases = SKILL_ALIASES.get(skill, [skill])

    return any(_contains_phrase(normalized_text, alias) for alias in aliases + [skill])


def _contains_phrase(normalized_text: str, phrase: str) -> bool:
    normalized_phrase = _normalize(phrase)
    pattern = rf"(^|\s){re.escape(normalized_phrase)}($|\s)"
    return re.search(pattern, normalized_text) is not None


def _skill_profile(skill: str) -> str:
    aliases = SKILL_ALIASES.get(skill, [])
    return " ".join([skill] + aliases)


def _max_semantic_similarity(text: str, target_text: str) -> float:
    chunks = _text_chunks(text)
    embedding_similarity = max_embedding_similarity(text, target_text, chunks)

    if embedding_similarity is not None:
        return embedding_similarity

    return _max_cosine_similarity(text, target_text)


def _active_match_threshold() -> float:
    if get_embedding_backend() == "sentence-transformers":
        return EMBEDDING_MATCH_THRESHOLD

    return SEMANTIC_MATCH_THRESHOLD


def _max_cosine_similarity(text: str, target_text: str) -> float:
    chunks = _text_chunks(text)
    if not chunks:
        return 0

    return max(_cosine_similarity(chunk, target_text) for chunk in chunks)


def _text_chunks(text: str) -> list[str]:
    normalized = re.sub(r"\s+", " ", text or "").strip()
    if not normalized:
        return []

    chunks = [normalized]
    chunks.extend(part.strip() for part in re.split(r"[\n.;|]+", text) if part.strip())
    return chunks


def _cosine_similarity(left_text: str, right_text: str) -> float:
    left_tokens = _tokens(left_text)
    right_tokens = _tokens(right_text)

    if not left_tokens or not right_tokens:
        return 0

    left_counts = Counter(left_tokens)
    right_counts = Counter(right_tokens)
    vocabulary = set(left_counts) | set(right_counts)

    left_vector = []
    right_vector = []

    for token in vocabulary:
        document_frequency = int(token in left_counts) + int(token in right_counts)
        inverse_document_frequency = math.log((1 + 2) / (1 + document_frequency)) + 1
        left_vector.append(left_counts.get(token, 0) * inverse_document_frequency)
        right_vector.append(right_counts.get(token, 0) * inverse_document_frequency)

    dot_product = sum(left * right for left, right in zip(left_vector, right_vector))
    left_norm = math.sqrt(sum(value * value for value in left_vector))
    right_norm = math.sqrt(sum(value * value for value in right_vector))

    if left_norm == 0 or right_norm == 0:
        return 0

    return dot_product / (left_norm * right_norm)


def _tokens(value: str) -> list[str]:
    normalized = _normalize(value)
    return [token for token in normalized.split() if token and token not in STOP_WORDS]


def _normalize(value: str) -> str:
    lowered = value.lower()
    return re.sub(r"[^a-z0-9+#]+", " ", lowered).strip()


def _build_suggestions(missing_skills: list[str], job_description: str) -> list[str]:
    if not missing_skills:
        return ["The resume strongly covers the required role skills."]

    suggestions = []
    for skill in missing_skills[:5]:
        if _contains_skill(job_description, skill):
            suggestions.append(
                f"The job description mentions {skill}; add clear {skill} experience to the resume."
            )
        else:
            suggestions.append(f"Add a project, responsibility, or workflow that shows {skill}.")

    return suggestions


def _build_summary(score: int, role_title: str) -> str:
    if score >= 80:
        return f"Resume is strongly matching the {role_title} role."
    if score >= 50:
        return f"Resume is partially matching the {role_title} role."
    return f"Resume needs more role-specific evidence for the {role_title} role."
