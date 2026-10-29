
import re
import jwt
import fitz

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Depends,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import User
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

# --------------------------------------------------
# 1. Application and database
# --------------------------------------------------

app = FastAPI(
    title="AI Career Copilot API",
    description="Resume analysis, job matching, and authentication",
    version="0.4.0",
)

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer(auto_error=False)

# --------------------------------------------------
# 2. Request models
# --------------------------------------------------

class ResumeRequest(BaseModel):
    resume_text: str
    job_description: str


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)


# --------------------------------------------------
# 3. Helpers and recognized skills
# --------------------------------------------------

SKILLS = [
    "python", "java", "javascript", "typescript", "c++",
    "react", "node.js", "html", "css", "tailwind css",
    "sql", "postgresql", "mysql", "mongodb", "fastapi",
    "django", "flask", "rest api", "git", "github",
    "docker", "aws", "machine learning", "pandas",
    "numpy", "pytest", "unit testing", "linux",
]


def extract_skills(text: str) -> list[str]:
    found = []

    for skill in SKILLS:
        pattern = r"(?<!\w)" + re.escape(skill) + r"(?!\w)"

        if re.search(pattern, text, re.IGNORECASE):
            found.append(skill)

    return found


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_email(email: str) -> bool:
    return bool(
        re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email)
    )


# --------------------------------------------------
# 4. Authentication verification
# --------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> User:

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(
            credentials.credentials
        )

        subject = payload.get("sub")
        user_id = int(subject)

    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User account was not found. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


# --------------------------------------------------
# 5. Home and health
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "AI Career Copilot is running!",
        "version": "0.4.0",
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "AI Career Copilot",
    }


# --------------------------------------------------
# 6. Registration and login
# --------------------------------------------------

@app.post("/api/auth/register")
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    name = data.name.strip()
    email = normalize_email(data.email)

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Enter your name.",
        )

    if not validate_email(email):
        raise HTTPException(
            status_code=400,
            detail="Enter a valid email address.",
        )

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    user = User(
        name=name,
        email=email,
        hashed_password=hash_password(data.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Account created successfully.",
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }


@app.post("/api/auth/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    email = normalize_email(data.email)

    if not validate_email(email):
        raise HTTPException(
            status_code=400,
            detail="Enter a valid email address.",
        )

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if (
        not user
        or not user.hashed_password
        or not verify_password(
            data.password,
            user.hashed_password,
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password.",
        )

    return {
        "message": "Login successful.",
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }


# --------------------------------------------------
# 7. Current authenticated user
# --------------------------------------------------

@app.get("/api/auth/me")
def read_current_user(
    current_user: User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
    }


# --------------------------------------------------
# 8. Resume-to-job matching
# --------------------------------------------------

@app.post("/api/match")
def match_resume(data: ResumeRequest):

    if not data.resume_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Resume text cannot be empty.",
        )

    if not data.job_description.strip():
        raise HTTPException(
            status_code=400,
            detail="Job description cannot be empty.",
        )

    resume_skills = set(
        extract_skills(data.resume_text)
    )

    job_skills = set(
        extract_skills(data.job_description)
    )

    matched = sorted(resume_skills & job_skills)
    missing = sorted(job_skills - resume_skills)

    if not job_skills:
        return {
            "match_score": 0,
            "matched_skills": [],
            "missing_skills": [],
            "resume_skills": sorted(resume_skills),
            "message": (
                "No recognized skills found in the job description."
            ),
        }

    score = round(
        len(matched) / len(job_skills) * 100
    )

    return {
        "match_score": score,
        "matched_skills": matched,
        "missing_skills": missing,
        "resume_skills": sorted(resume_skills),
        "required_skills_count": len(job_skills),
        "message": (
            "Keyword-based skill overlap, not a hiring prediction."
        ),
    }


# --------------------------------------------------
# 9. PDF resume upload
# --------------------------------------------------

@app.post("/api/resume/upload")
async def upload_resume(
    file: UploadFile = File(...),
):
    try:
        if (
            not file.filename
            or not file.filename.lower().endswith(".pdf")
        ):
            raise HTTPException(
                status_code=400,
                detail="Please upload a PDF file.",
            )

        max_size = 5 * 1024 * 1024
        content = await file.read(max_size + 1)

        if len(content) > max_size:
            raise HTTPException(
                status_code=413,
                detail="PDF must be smaller than 5 MB.",
            )

        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid PDF.",
            )

        try:
            with fitz.open(
                stream=content,
                filetype="pdf",
            ) as document:

                if document.is_encrypted:
                    raise HTTPException(
                        status_code=400,
                        detail="Password-protected PDFs are not supported.",
                    )

                text = "\n".join(
                    page.get_text()
                    for page in document
                ).strip()

        except HTTPException:
            raise

        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Could not read this PDF file.",
            )

        if not text:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No readable text found. "
                    "This may be a scanned PDF."
                ),
            )

        return {
            "filename": file.filename,
            "text": text,
            "characters_extracted": len(text),
            "message": (
                "Resume uploaded and text extracted successfully."
            ),
        }

    finally:
        await file.close()


# --------------------------------------------------
# 10. Resume improvement suggestions
# --------------------------------------------------

@app.post("/api/resume/suggestions")
def resume_suggestions(data: ResumeRequest):

    if not data.resume_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Resume text cannot be empty.",
        )

    if not data.job_description.strip():
        raise HTTPException(
            status_code=400,
            detail="Job description cannot be empty.",
        )

    resume_skills = set(
        extract_skills(data.resume_text)
    )

    job_skills = set(
        extract_skills(data.job_description)
    )

    missing_skills = sorted(
        job_skills - resume_skills
    )

    suggestions = []

    if missing_skills:
        suggestions.append(
            "Consider learning or demonstrating these job-related skills: "
            + ", ".join(missing_skills)
            + ". Only add skills you genuinely have."
        )
    else:
        suggestions.append(
            "Your resume includes all recognized skills found in this job "
            "description. Review your projects and achievements for evidence."
        )

    if len(data.resume_text.split()) < 100:
        suggestions.append(
            "Your resume text is relatively short. Consider adding relevant "
            "projects, technical skills, and measurable achievements."
        )

    if not re.search(
        r"\b(projects?|experience|education)\b",
        data.resume_text,
        re.IGNORECASE,
    ):
        suggestions.append(
            "Check whether your resume clearly includes relevant projects, "
            "experience, and education sections."
        )

    return {
        "missing_skills": missing_skills,
        "suggestions": suggestions,
        "message": (
            "Suggestions use recognized keywords and simple resume checks."
        ),
    }
