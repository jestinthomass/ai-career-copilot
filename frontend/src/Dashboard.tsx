
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

type MatchResult = {
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  message: string;
};

type SuggestionResult = {
  missing_skills: string[];
  suggestions: string[];
  message: string;
};

const API_URL = "http://127.0.0.1:8000";

function Dashboard() {
  const navigate = useNavigate();
  const [resume, setResume] = useState("");
  const [job, setJob] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [gettingSuggestions, setGettingSuggestions] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [suggestionResult, setSuggestionResult] =
    useState<SuggestionResult | null>(null);

  const userText = sessionStorage.getItem("careerUser");
  let userName = "Career Explorer";

  if (userText) {
    try {
      userName = JSON.parse(userText).name || userName;
    } catch {
      // Use the default name if stored user data is invalid.
    }
  }

  function logout() {
    sessionStorage.removeItem("careerToken");
    sessionStorage.removeItem("careerUser");
    navigate("/login", { replace: true });
  }

  async function uploadResume(file?: File) {
    if (!file) return;

    setError("");
    setMessage("");
    setResult(null);
    setSuggestionResult(null);

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF resume.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Your PDF must be smaller than 5 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);

    try {
      const response = await fetch(`${API_URL}/api/resume/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not read this PDF.");
      }

      setResume(data.text);
      setFileName(data.filename);
      setMessage(
        `Resume uploaded successfully. Extracted ${data.characters_extracted} characters.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not connect to the backend."
      );
    } finally {
      setUploading(false);
    }
  }

  async function analyzeResume() {
    if (!resume.trim() || !job.trim()) {
      setError("Please provide both your resume and the job description.");
      return;
    }

    setAnalyzing(true);
    setError("");
    setMessage("");
    setResult(null);
    setSuggestionResult(null);

    try {
      const response = await fetch(`${API_URL}/api/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resume,
          job_description: job,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Resume analysis failed.");
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not connect to the backend."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function getSuggestions() {
    if (!resume.trim() || !job.trim()) {
      setError("Please provide both your resume and the job description.");
      return;
    }

    setGettingSuggestions(true);
    setError("");
    setMessage("");
    setSuggestionResult(null);

    try {
      const response = await fetch(`${API_URL}/api/resume/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resume,
          job_description: job,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not generate suggestions.");
      }

      setSuggestionResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not connect to the backend."
      );
    } finally {
      setGettingSuggestions(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <h2>CareerCopilot</h2>
        <div className="user-controls">
          <span>Hi, {userName}</span>
          <button className="logout-button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR CAREER, YOUR NEXT MOVE</p>
        <h1>Find your job match.</h1>
        <p>Upload your resume and discover how your skills compare.</p>
      </section>

      <section className="workspace">
        <article className="panel">
          <h2>My Resume</h2>
          <label htmlFor="resume-file">Upload a PDF resume (max 5 MB)</label>
          <input
            id="resume-file"
            type="file"
            accept=".pdf,application/pdf"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              void uploadResume(file);
              event.target.value = "";
            }}
          />

          {fileName && <p className="helper">Selected: {fileName}</p>}
          {uploading && <p>Extracting resume text...</p>}

          <label htmlFor="resume">Resume text</label>
          <textarea
            id="resume"
            value={resume}
            onChange={(event) => setResume(event.target.value)}
            placeholder="Upload a PDF or paste your resume here..."
          />
        </article>

        <article className="panel">
          <h2>Target Job</h2>
          <label htmlFor="job">Paste the job description</label>
          <textarea
            id="job"
            value={job}
            onChange={(event) => setJob(event.target.value)}
            placeholder="Paste the job description here..."
          />
        </article>
      </section>

      <div className="dashboard-actions">
        <button
          className="analyze-button"
          onClick={() => void analyzeResume()}
          disabled={
            uploading || analyzing || gettingSuggestions ||
            !resume.trim() || !job.trim()
          }
        >
          {analyzing ? "Analyzing..." : "Analyze Job Match"}
        </button>

        <button
          className="analyze-button suggestions-button"
          onClick={() => void getSuggestions()}
          disabled={
            uploading || analyzing || gettingSuggestions ||
            !resume.trim() || !job.trim()
          }
        >
          {gettingSuggestions ? "Generating..." : "Get Resume Suggestions"}
        </button>
      </div>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      {result && (
        <section className="results">
          <h2>Your Match Report</h2>
          <div className="score">
            <strong>{result.match_score}%</strong>
            <span>Recognized skill overlap</span>
          </div>

          <div className="score-track">
            <div
              className="score-fill"
              style={{
                width: `${Math.max(0, Math.min(100, result.match_score))}%`,
              }}
            />
          </div>

          <p className="disclaimer">{result.message}</p>

          <div className="skill-grid">
            <article className="skill-card">
              <h3>Matched Skills</h3>
              <div className="chips">
                {result.matched_skills.map((skill) => (
                  <span className="chip matched" key={skill}>{skill}</span>
                ))}
              </div>
              {result.matched_skills.length === 0 && (
                <p>No recognized matching skills found.</p>
              )}
            </article>

            <article className="skill-card">
              <h3>Skills to Develop</h3>
              <div className="chips">
                {result.missing_skills.map((skill) => (
                  <span className="chip missing" key={skill}>{skill}</span>
                ))}
              </div>
              {result.missing_skills.length === 0 && (
                <p>No missing recognized skills found.</p>
              )}
            </article>
          </div>
        </section>
      )}

      {suggestionResult && (
        <section className="results">
          <h2>Resume Improvement Suggestions</h2>
          <p className="disclaimer">{suggestionResult.message}</p>

          <article className="skill-card">
            <h3>Skills to Consider Developing</h3>
            {suggestionResult.missing_skills.length > 0 ? (
              <div className="chips">
                {suggestionResult.missing_skills.map((skill) => (
                  <span className="chip missing" key={skill}>{skill}</span>
                ))}
              </div>
            ) : (
              <p>No missing recognized skills were found for this job.</p>
            )}
          </article>

          <article className="skill-card">
            <h3>Improvement Checklist</h3>
            <ul>
              {suggestionResult.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </article>
        </section>
      )}

      <footer>
        <span>CareerCopilot · Portfolio project</span>
        <span>Version 0.3.0</span>
      </footer>
    </main>
  );
}

export default Dashboard;
