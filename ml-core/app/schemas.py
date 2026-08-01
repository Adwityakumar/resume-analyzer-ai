from pydantic import BaseModel, Field


class RoleKeypoints(BaseModel):
    title: str
    requiredSkills: list[str] = Field(default_factory=list)
    goodToHave: list[str] = Field(default_factory=list)


class JobDemoAnalyzeRequest(BaseModel):
    resumeText: str
    role: str
    jobDescription: str
    roleKeypoints: RoleKeypoints


class JobMatchResponse(BaseModel):
    role: str
    score: int
    matchedSkills: list[str]
    missingSkills: list[str]
    suggestions: list[str]
    summary: str
    extractedResumeText: str = ''
    extractedSkills: list[str] = Field(default_factory=list)
    semanticMatches: list[dict] = Field(default_factory=list)
    scoreBreakdown: dict[str, float | str] = Field(default_factory=dict)
    usedJobDescription: bool = False
    evaluatedSkills: dict[str, list[str]] = Field(default_factory=dict)
