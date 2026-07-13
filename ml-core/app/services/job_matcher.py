import re

from app.schemas import JobDemoAnalyzeRequest, JobMatchResponse


SKILL_ALIASES = {
    "Node.js": ["node.js", "nodejs", "node js", "node"],
    "Express.js": ["express.js", "expressjs", "express js", "express"],
    "REST API": ["rest api", "restful api", "rest", "api development"],
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
    "Power BI": ["power bi", "powerbi"],
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


def analyze_job_match(payload: JobDemoAnalyzeRequest) -> JobMatchResponse:
    resume_text = payload.resumeText or ""
    job_description = payload.jobDescription or ""
    required_skills = payload.roleKeypoints.requiredSkills
    good_to_have = payload.roleKeypoints.goodToHave

    required_matches = [skill for skill in required_skills if _contains_skill(resume_text, skill)]
    good_to_have_matches = [skill for skill in good_to_have if _contains_skill(resume_text, skill)]
    missing_skills = [skill for skill in required_skills if skill not in required_matches]

    required_score = _ratio_score(len(required_matches), len(required_skills), 80)
    good_to_have_score = _ratio_score(len(good_to_have_matches), len(good_to_have), 20)
    score = min(100, round(required_score + good_to_have_score))

    matched_skills = required_matches + good_to_have_matches
    suggestions = _build_suggestions(missing_skills, job_description)
    summary = _build_summary(score, payload.roleKeypoints.title)

    return JobMatchResponse(
        role=payload.roleKeypoints.title,
        score=score,
        matchedSkills=matched_skills,
        missingSkills=missing_skills,
        suggestions=suggestions,
        summary=summary,
    )


def _ratio_score(matched_count: int, total_count: int, weight: int) -> float:
    if total_count == 0:
        return 0
    return (matched_count / total_count) * weight


def _contains_skill(text: str, skill: str) -> bool:
    normalized_text = _normalize(text)
    aliases = SKILL_ALIASES.get(skill, [skill])

    return any(_contains_phrase(normalized_text, alias) for alias in aliases)


def _contains_phrase(normalized_text: str, phrase: str) -> bool:
    normalized_phrase = _normalize(phrase)
    pattern = rf"(^|\s){re.escape(normalized_phrase)}($|\s)"
    return re.search(pattern, normalized_text) is not None


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
