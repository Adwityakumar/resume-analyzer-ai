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
