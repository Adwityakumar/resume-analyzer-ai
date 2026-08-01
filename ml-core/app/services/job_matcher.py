import math
import re
from collections import Counter

from app.schemas import JobDemoAnalyzeRequest, JobMatchResponse
from app.services.embedding_service import get_embedding_backend, max_embedding_similarity
from app.services.llm_service import generate_resume_summary, extract_skills_from_jd


SKILL_ALIASES = {
    # ── Frontend ────────────────────────────────────────────────────────────
    "React": ["react", "react.js", "reactjs", "react js"],
    "Vue.js": ["vue.js", "vuejs", "vue js", "vue"],
    "Angular": ["angular", "angularjs", "angular.js"],
    "Next.js": ["next.js", "nextjs", "next js"],
    "JavaScript": ["javascript", "js", "ecmascript"],
    "TypeScript": ["typescript", "ts"],
    "Tailwind CSS": ["tailwind css", "tailwind"],
    "Redux": ["redux", "redux toolkit", "zustand", "state management"],
    "Responsive Design": ["responsive design", "mobile first", "mobile friendly", "adaptive design"],
    "Accessibility": ["accessibility", "a11y", "wcag"],
    "HTML": ["html", "html5"],
    "CSS": ["css", "css3", "sass", "scss", "less"],
    "Webpack": ["webpack", "vite", "rollup", "parcel", "bundler"],
    # ── Backend ─────────────────────────────────────────────────────────────
    "Node.js": ["node.js", "nodejs", "node js", "node"],
    "Express.js": ["express.js", "expressjs", "express js", "express"],
    "Python": ["python"],
    "Django": ["django", "django rest framework", "drf"],
    "FastAPI": ["fastapi", "fast api"],
    "Flask": ["flask"],
    "Java": ["java", "spring", "spring boot", "spring mvc"],
    "Go": ["golang", "go lang", "go"],
    "Rust": ["rust", "rust lang"],
    "REST API": ["rest api", "restful api", "rest", "api development", "restful services"],
    "GraphQL": ["graphql", "graph ql", "apollo"],
    "WebSockets": ["websockets", "websocket", "socket.io", "real-time"],
    "Authentication": ["authentication", "auth", "jwt", "oauth", "oauth2", "login", "session"],
    "API Security": ["api security", "rate limiting", "authorization", "rbac"],
    "Microservices": ["microservices", "microservice", "service mesh"],
    # ── Databases ───────────────────────────────────────────────────────────
    "MongoDB": ["mongodb", "mongo db", "mongo", "mongoose"],
    "SQL": ["sql", "relational database"],
    "MySQL": ["mysql"],
    "PostgreSQL": ["postgresql", "postgres", "pg"],
    "SQLite": ["sqlite"],
    "Redis": ["redis", "caching", "in-memory cache"],
    "Elasticsearch": ["elasticsearch", "elastic search", "opensearch"],
    "Firebase": ["firebase", "firestore", "realtime database"],
    # ── DevOps & Cloud ──────────────────────────────────────────────────────
    "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda", "rds"],
    "GCP": ["gcp", "google cloud", "google cloud platform"],
    "Azure": ["azure", "microsoft azure"],
    "Docker": ["docker", "containerization", "container"],
    "Kubernetes": ["kubernetes", "k8s", "helm", "orchestration"],
    "CI/CD": ["ci/cd", "cicd", "continuous integration", "continuous deployment", "github actions", "jenkins", "circleci"],
    "Terraform": ["terraform", "infrastructure as code", "iac"],
    "Linux": ["linux", "unix", "bash", "shell scripting"],
    "Git": ["git", "github", "gitlab", "bitbucket", "version control"],
    "Nginx": ["nginx", "apache", "reverse proxy"],
    # ── Data & ML ───────────────────────────────────────────────────────────
    "Machine Learning": ["machine learning", "ml", "supervised learning", "unsupervised learning"],
    "Deep Learning": ["deep learning", "neural network", "neural networks", "cnn", "rnn", "lstm"],
    "TensorFlow": ["tensorflow", "tensor flow", "tf", "keras"],
    "PyTorch": ["pytorch", "torch"],
    "Scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
    "Pandas": ["pandas"],
    "NumPy": ["numpy", "num py"],
    "Data Visualization": ["data visualization", "visualization", "charts", "dashboards", "dashboard", "matplotlib", "seaborn", "plotly"],
    "Statistics": ["statistics", "statistical analysis", "regression", "hypothesis testing", "probability"],
    "NLP": ["nlp", "natural language processing", "text processing", "sentiment analysis"],
    "Data Cleaning": ["data cleaning", "data preprocessing", "data wrangling", "feature engineering"],
    "SQL Analytics": ["sql analytics", "data analysis", "analytical sql", "window functions"],
    "Power BI": ["power bi", "powerbi", "microsoft power bi"],
    "Tableau": ["tableau"],
    "Excel": ["excel", "spreadsheets", "spreadsheet", "pivot tables"],
    "Reporting": ["reporting", "reports", "metrics", "kpi", "kpis"],
    "Business Intelligence": ["business intelligence", "bi"],
    # ── Design ──────────────────────────────────────────────────────────────
    "Figma": ["figma"],
    "Adobe XD": ["adobe xd", "xd"],
    "Sketch": ["sketch", "sketch app"],
    "Wireframing": ["wireframing", "wireframes", "wireframe", "lo-fi"],
    "Prototyping": ["prototyping", "prototype", "prototypes", "hi-fi prototype"],
    "User Research": ["user research", "ux research", "interviews", "user interviews", "surveys"],
    "User Flows": ["user flows", "user flow", "journey map", "journey mapping", "information architecture"],
    "Usability Testing": ["usability testing", "user testing", "usability test", "a/b testing"],
    "Design Systems": ["design systems", "design system", "component library", "storybook"],
    "Product Thinking": ["product thinking", "product strategy", "product design", "product management"],
    # ── General ─────────────────────────────────────────────────────────────
    "Agile": ["agile", "scrum", "kanban", "sprint", "jira"],
    "Testing": ["testing", "unit testing", "integration testing", "jest", "pytest", "selenium", "cypress"],
    "Networking": ["networking", "tcp/ip", "dns", "load balancing"],
    "Security": ["security", "cybersecurity", "infosec", "vulnerability"],
    "Monitoring": ["monitoring", "observability", "prometheus", "grafana", "datadog", "new relic"],
    "React Native": ["react native", "react-native"],
    "iOS": ["ios", "apple ios"],
    "Android": ["android", "android sdk"],
    "Mobile UI": ["mobile ui", "mobile design", "mobile interface"],
    "Swift": ["swift", "swiftui"],
    "Kotlin": ["kotlin"],
    "Product Strategy": ["product strategy", "product vision", "go-to-market"],
    "Roadmapping": ["roadmapping", "product roadmap", "roadmap"],
    "Stakeholder Management": ["stakeholder management", "stakeholder communication", "cross-functional"],
    "Data Analysis": ["data analysis", "data analytics", "quantitative analysis"],
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
    used_jd = False

    if job_description.strip():
        extracted = extract_skills_from_jd(job_description)
        if extracted:
            required_skills = extracted.get("requiredSkills", required_skills)
            good_to_have = extracted.get("goodToHave", good_to_have)
            used_jd = True
            
    all_role_skills = required_skills + good_to_have
    extracted_skills = _extract_resume_skills(resume_text, all_role_skills)

    required_details = [_score_skill(resume_text, skill, required=True) for skill in required_skills]
    good_to_have_details = [_score_skill(resume_text, skill, required=False) for skill in good_to_have]

    matched_required = [item["skill"] for item in required_details if item["matched"]]
    matched_good_to_have = [item["skill"] for item in good_to_have_details if item["matched"]]
    missing_skills = [item["skill"] for item in required_details if not item["matched"]]

    required_score = _weighted_average(required_details, 80)
    good_to_have_score = _weighted_average_capped(good_to_have_details, 20)
    score = min(100, round(required_score + good_to_have_score))

    matched_skills = matched_required + matched_good_to_have
    semantic_matches = _format_match_details(required_details + good_to_have_details)
    suggestions = _build_suggestions(missing_skills, job_description)
    summary = generate_resume_summary(
        role_title=payload.roleKeypoints.title,
        score=score,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        resume_snippet=resume_text,
    )

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
        usedJobDescription=used_jd,
        evaluatedSkills={"requiredSkills": required_skills, "goodToHave": good_to_have},
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
    """Average score normalised by skill count, scaled to the given weight bucket."""
    if not match_details:
        return 0

    total = sum(item["score"] for item in match_details)
    return (total / len(match_details)) * weight


def _weighted_average_capped(match_details: list[dict], weight: int) -> float:
    """
    Like _weighted_average but for the good-to-have pool.
    Uses (matched_count / total_count) so that having more good-to-have skills
    matched actually gives more points — prevents 1-of-1 == 10-of-10 inflation.
    """
    if not match_details:
        return 0

    matched_count = sum(1 for item in match_details if item["matched"])
    ratio = matched_count / len(match_details)
    return ratio * weight


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


# Natural-language sentence templates make sentence-transformer embeddings
# far more meaningful than raw alias dumps.
_SKILL_PROFILE_TEMPLATES: dict[str, str] = {
    "React": "Proficient in React.js for building modern component-based UIs",
    "Vue.js": "Experience with Vue.js reactive UI development",
    "Angular": "Angular framework for large-scale single-page applications",
    "Next.js": "Next.js for server-side rendering and static site generation with React",
    "JavaScript": "JavaScript and ES6+ programming for web development",
    "TypeScript": "TypeScript for strongly-typed JavaScript development",
    "Node.js": "Node.js server-side JavaScript runtime and event-driven architecture",
    "Express.js": "Express.js REST API development and middleware configuration",
    "Python": "Python programming for backend services, scripting, or data analysis",
    "Django": "Django web framework with Django REST Framework for API development",
    "FastAPI": "FastAPI for high-performance async Python REST APIs",
    "Flask": "Flask lightweight Python web framework and API development",
    "Java": "Java Spring Boot enterprise application development",
    "Go": "Go (Golang) for high-performance backend services",
    "REST API": "RESTful API design, development, and integration",
    "GraphQL": "GraphQL API design, schema definition, and Apollo integration",
    "MongoDB": "MongoDB NoSQL database design and Mongoose ODM",
    "SQL": "SQL database querying, schema design, and relational data modelling",
    "MySQL": "MySQL relational database administration and query optimisation",
    "PostgreSQL": "PostgreSQL advanced SQL and database optimisation",
    "Redis": "Redis caching, session storage, and pub/sub messaging",
    "Elasticsearch": "Elasticsearch full-text search and analytics",
    "Firebase": "Firebase Firestore real-time database and authentication",
    "AWS": "Amazon Web Services cloud infrastructure including EC2, S3, and Lambda",
    "Docker": "Docker containerisation and image management",
    "Kubernetes": "Kubernetes container orchestration and cluster management",
    "CI/CD": "Continuous integration and deployment pipelines using GitHub Actions or Jenkins",
    "Git": "Git version control, branching strategies, and code review workflows",
    "Machine Learning": "Machine learning model development, training, and evaluation",
    "Deep Learning": "Deep learning with neural networks for classification or generation tasks",
    "TensorFlow": "TensorFlow and Keras for building and deploying deep learning models",
    "PyTorch": "PyTorch for research-grade deep learning and neural network training",
    "Scikit-learn": "Scikit-learn for classical machine learning pipelines and feature engineering",
    "NLP": "Natural language processing and text analysis techniques",
    "Pandas": "Pandas for data manipulation, analysis, and transformation",
    "NumPy": "NumPy for numerical computing and array operations",
    "Data Visualization": "Data visualisation using charts, dashboards, and tools like Matplotlib or Tableau",
    "Figma": "Figma for UI/UX design, prototyping, and collaborative design systems",
    "Wireframing": "Wireframing and low-fidelity prototyping for UX design",
    "User Research": "User research through interviews, surveys, and usability studies",
    "Agile": "Agile methodology including Scrum sprints, Kanban boards, and backlog refinement",
    "Testing": "Unit, integration, and end-to-end testing with frameworks like Jest or Pytest",
    "Tailwind CSS": "Tailwind CSS utility-first styling for rapid UI development",
    "Redux": "Redux state management for complex React application state",
    "Authentication": "User authentication with JWT, OAuth2, and secure session management",
    "CI/CD": "CI/CD pipeline automation for continuous delivery and deployment",
    "Networking": "Network architecture, routing, and load balancing",
    "Security": "Security best practices, vulnerability management, and infrastructure protection",
    "Monitoring": "System monitoring, observability, and alerting with tools like Prometheus or Datadog",
    "React Native": "Cross-platform mobile app development using React Native",
    "iOS": "Native iOS mobile application development",
    "Android": "Native Android mobile application development",
    "Mobile UI": "Mobile user interface design and responsive mobile layouts",
    "Swift": "Swift programming for Apple platforms including iOS and macOS",
    "Kotlin": "Kotlin programming for modern Android application development",
    "Product Strategy": "Defining product strategy, vision, and market positioning",
    "Roadmapping": "Product roadmapping, feature prioritization, and release planning",
    "Stakeholder Management": "Cross-functional stakeholder management and communication",
    "Data Analysis": "Data analysis and interpreting quantitative metrics to drive decisions",
}


def _skill_profile(skill: str) -> str:
    """
    Return a natural-language sentence describing the skill so that
    sentence-transformer embeddings are semantically rich rather than
    just repeated alias tokens.
    """
    if skill in _SKILL_PROFILE_TEMPLATES:
        return _SKILL_PROFILE_TEMPLATES[skill]

    # Generic fallback: one clean sentence
    aliases = SKILL_ALIASES.get(skill, [])
    related = ", ".join(aliases[:3]) if aliases else skill
    return f"Experience and proficiency with {skill} ({related})"


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
    """
    Split the resume into overlapping sentence-level chunks for embedding.
    The full normalised text is NOT prepended separately to avoid computing
    the same embedding twice when the text has no line-breaks.
    """
    if not text:
        return []

    parts = [part.strip() for part in re.split(r"[\n.;|]+", text) if part.strip()]
    if not parts:
        # Fallback: whole text as a single chunk
        normalized = re.sub(r"\s+", " ", text).strip()
        return [normalized] if normalized else []

    return parts


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
    lowered = re.sub(r"[^a-z0-9+#.]+", " ", lowered)
    lowered = re.sub(r"\.(?=\s|$)", " ", lowered)
    return lowered.strip()


def _build_suggestions(missing_skills: list[str], job_description: str) -> list[str]:
    if not missing_skills:
        return ["The resume strongly covers the required role skills."]

    suggestions = []
    # Show up to 8 suggestions so candidates get a more complete picture
    for skill in missing_skills[:8]:
        if _contains_skill(job_description, skill):
            suggestions.append(
                f"The job description explicitly mentions {skill} — add concrete {skill} experience to your resume."
            )
        else:
            suggestions.append(
                f"Add a project, responsibility, or certification that demonstrates {skill}."
            )

    return suggestions
