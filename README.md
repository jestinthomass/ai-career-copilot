# AI Career Copilot 🚀

An AI-assisted career toolkit designed to help job seekers analyze resumes, compare their skills with job descriptions, and identify areas for improvement.

## ✨ Features

- 🔐 **User Authentication** — Register and sign in using email and password.
- 📄 **Resume Upload** — Upload PDF resumes and extract readable text.
- 🎯 **Job Match Analysis** — Compare resume skills against job description requirements.
- 🧠 **Resume Improvement Suggestions** — Get rule-based suggestions to improve resume content.
- 📊 **Skill Gap Identification** — Identify recognized skills missing from your resume.
- 🔒 **JWT Authentication** — Verify access tokens for protected dashboard access.

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- React Router
- CSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- SQLite
- PyMuPDF
- JWT authentication
- Argon2 password hashing

## 📁 Project Structure

```text
ai-career-copilot/
├── backend/
│   ├── auth.py
│   ├── database.py
│   ├── main.py
│   └── models.py
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   └── App.css
│   ├── package.json
│   └── index.html
├── .gitignore
└── README.md
```

## ⚙️ Getting Started

### Prerequisites

Install the following:

- Python 3.10 or newer
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/jestinthomass/ai-career-copilot.git
cd ai-career-copilot
```

### 2. Set up the backend

Open a terminal in the project root.

Create and activate a Python virtual environment:

**Windows PowerShell**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```powershell
python -m pip install fastapi "uvicorn[standard]" pymupdf sqlalchemy "pwdlib[argon2]" pyjwt python-multipart
```

Set a secret key for JWT authentication:

```powershell
$env:CAREER_COPILOT_SECRET_KEY = python -c "import secrets; print(secrets.token_hex(32))"
```

Start the backend:

```powershell
python -m uvicorn main:app --reload
```

Backend URL: http://127.0.0.1:8000

Interactive API documentation: http://127.0.0.1:8000/docs

Keep the backend terminal open while using the application.

### 3. Set up the frontend

Open a **second terminal** in the project root.

```powershell
cd frontend
npm install
npm run dev
```

Open the local frontend URL displayed in your terminal, normally:

http://localhost:5173

### 4. Use the application

1. Create an account on the signup page.
2. Sign in with your email and password.
3. Open the dashboard.
4. Upload a readable PDF resume.
5. Compare your resume against a job description.
6. Review the identified skill gaps and improvement suggestions.

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | API welcome message |
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Verify access token and retrieve user profile |
| POST | `/api/resume/upload` | Extract text from a PDF resume |
| POST | `/api/match` | Compare resume skills with job requirements |
| POST | `/api/resume/suggestions` | Generate rule-based resume suggestions |

## 🔐 Security Notes

- Passwords are stored as hashes rather than plain text.
- Authentication uses signed JWT access tokens.
- Keep your JWT secret out of source control.
- Local database files and environment files should not be committed.
- This project is a development project; review authentication, token storage, and API authorization before production deployment.

## 🗺️ Future Improvements

- Integration with a local open-source language model for richer resume feedback.
- Google sign-in.
- More detailed resume scoring and skill analysis.
- Job discovery and application tracking.
- Deployment with production security configuration.

These are planned improvements and may not yet be implemented.

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Submit a pull request.

## 📄 License

No license has been specified yet. Add a license before permitting others to reuse or redistribute this project.

---

**Built as a learning project to explore full-stack development, resume analysis, and career-support tools.**
