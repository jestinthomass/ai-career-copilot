
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

type MatchResult = {
  match_score: number;
  match_level: string;
  category_scores: Record<string, number>;
  category_weights: Record<string, number>;
  matched_skills: string[];
  missing_skills: string[];
  strengths: string[];
  gaps: string[];
  explanations: Record<string, string>;
  message: string;
};

type RewrittenBullet = {
  original: string;
  improved: string;
  reason: string;
};

type SuggestionResult = {
  overall_review: string;
  strengths: string[];
  weaknesses: string[];
  missing_keywords: string[];
  professional_summary: string;
  rewritten_bullet_points: RewrittenBullet[];
  priority_actions: string[];
  job_specific_advice: string;
  missing_skills: string[];
  matched_skills: string[];
  suggestions: string[];
  message: string;
};

const API_URL = "http://127.0.0.1:8000";

const CATEGORY_LABELS: Record<string, string> = {
  technical_skills: "Technical skills",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  responsibilities: "Job responsibilities",
};

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
      // Use default name if stored data is invalid.
    }
  }

  // Logout
  function logout() {
    sessionStorage.removeItem("careerToken");
    sessionStorage.removeItem("careerUser");

    navigate("/login", { replace: true });
  }

  // PDF and DOCX resume upload
  async function uploadResume(file?: File) {
    if (!file) return;

    setError("");
    setMessage("");
    setResult(null);
    setSuggestionResult(null);

    const filename = file.name.toLowerCase();

    const isPDF = filename.endsWith(".pdf");
    const isDOCX = filename.endsWith(".docx");

    if (!isPDF && !isDOCX) {
      setError("Please select a PDF or Word (.docx) resume.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Your resume must be smaller than 5 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/resume/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not read this resume."
        );
      }

      setResume(data.text);
      setFileName(data.filename);

      setMessage(
        `${isPDF ? "PDF" : "DOCX"} resume uploaded successfully. Extracted ${data.characters_extracted} characters.`
      );

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the backend."
      );

    } finally {
      setUploading(false);
    }
  }

  // AI job matching
  async function analyzeResume() {
    if (!resume.trim() || !job.trim()) {
      setError(
        "Please provide both your resume and the job description."
      );
      return;
    }

    setAnalyzing(true);
    setError("");
    setMessage("");
    setResult(null);
    setSuggestionResult(null);

    try {
      const response = await fetch(
        `${API_URL}/api/match`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resume_text: resume,
            job_description: job,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Resume analysis failed."
        );
      }

      setResult(data as MatchResult);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the backend."
      );

    } finally {
      setAnalyzing(false);
    }
  }

  // Advanced AI resume suggestions
  async function getSuggestions() {
    if (!resume.trim() || !job.trim()) {
      setError(
        "Please provide both your resume and the job description."
      );
      return;
    }

    setGettingSuggestions(true);
    setError("");
    setMessage("");
    setSuggestionResult(null);

    try {
      const response = await fetch(
        `${API_URL}/api/resume/suggestions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resume_text: resume,
            job_description: job,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not generate suggestions."
        );
      }

      setSuggestionResult(data as SuggestionResult);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the backend."
      );

    } finally {
      setGettingSuggestions(false);
    }
  }

  // Reusable list renderer
  function renderList(
    items: string[],
    emptyMessage: string
  ) {
    if (!items || items.length === 0) {
      return <p>{emptyMessage}</p>;
    }

    return (
      <ul>
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main className="app-shell">

      {/* Header */}
      <header className="topbar">
        <h2>CareerCopilot</h2>

        <div className="user-controls">
          <span>Hi, {userName}</span>

          <button
            className="logout-button"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <p className="eyebrow">
          YOUR CAREER, YOUR NEXT MOVE
        </p>

        <h1>Find your job match.</h1>

        <p>
          Upload your resume and discover how your skills compare.
        </p>
      </section>

      {/* Resume and Job Inputs */}
      <section className="workspace">

        <article className="panel">
          <h2>My Resume</h2>

          <label htmlFor="resume-file">
            Upload PDF or Word resume (max 5 MB)
          </label>

          <input
            id="resume-file"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];

              void uploadResume(file);

              event.target.value = "";
            }}
          />

          <p className="helper">
            Supported formats: PDF and DOCX
          </p>

          {fileName && (
            <p className="helper">
              Selected: {fileName}
            </p>
          )}

          {uploading && (
            <p>Extracting resume text...</p>
          )}

          <label htmlFor="resume">
            Resume text
          </label>

          <textarea
            id="resume"
            value={resume}
            onChange={(event) =>
              setResume(event.target.value)
            }
            placeholder="Upload a PDF or Word resume, or paste your resume here..."
          />
        </article>

        <article className="panel">
          <h2>Target Job</h2>

          <label htmlFor="job">
            Paste the job description
          </label>

          <textarea
            id="job"
            value={job}
            onChange={(event) =>
              setJob(event.target.value)
            }
            placeholder="Paste the job description here..."
          />
        </article>

      </section>

      {/* Action Buttons */}
      <div className="dashboard-actions">

        <button
          className="analyze-button"
          onClick={() => void analyzeResume()}
          disabled={
            uploading ||
            analyzing ||
            gettingSuggestions ||
            !resume.trim() ||
            !job.trim()
          }
        >
          {analyzing
            ? "Analyzing..."
            : "Analyze Job Match"}
        </button>

        <button
          className="analyze-button suggestions-button"
          onClick={() => void getSuggestions()}
          disabled={
            uploading ||
            analyzing ||
            gettingSuggestions ||
            !resume.trim() ||
            !job.trim()
          }
        >
          {gettingSuggestions
            ? "Generating..."
            : "Get Advanced Resume Analysis"}
        </button>

      </div>

      {/* Messages */}
      {message && (
        <p className="success-message">
          {message}
        </p>
      )}

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {/* Job Match Results */}
      {result && (
        <section className="results">

          <h2>Your AI Job Match Report</h2>

          <div className="score">
            <strong>
              {result.match_score}%
            </strong>

            <span>
              {result.match_level || "Estimated job match"}
            </span>
          </div>

          <div className="score-track">
            <div
              className="score-fill"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(100, result.match_score)
                )}%`,
              }}
            />
          </div>

          <p className="disclaimer">
            {result.message}
          </p>

          {/* Category Scores */}
          <article className="skill-card">

            <h3>Category Score Breakdown</h3>

            {Object.entries(
              result.category_scores || {}
            ).map(([category, score]) => (

              <div
                key={category}
                style={{ marginBottom: "16px" }}
              >

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "6px",
                  }}
                >

                  <strong>
                    {CATEGORY_LABELS[category] || category}
                  </strong>

                  <span>
                    {Math.round(score)}% ·{" "}
                    {result.category_weights?.[category] ?? 0}% weight
                  </span>

                </div>

                <div className="score-track">
                  <div
                    className="score-fill"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, score)
                      )}%`,
                    }}
                  />
                </div>

                {result.explanations?.[category] && (
                  <p className="helper">
                    {result.explanations[category]}
                  </p>
                )}

              </div>

            ))}

          </article>

          {/* Skills */}
          <div className="skill-grid">

            <article className="skill-card">
              <h3>Matched Skills</h3>

              <div className="chips">
                {(result.matched_skills || []).map(
                  (skill) => (
                    <span
                      className="chip matched"
                      key={skill}
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>

              {(!result.matched_skills ||
                result.matched_skills.length === 0) && (
                <p>No matching skills identified.</p>
              )}
            </article>

            <article className="skill-card">
              <h3>Skills to Develop</h3>

              <div className="chips">
                {(result.missing_skills || []).map(
                  (skill) => (
                    <span
                      className="chip missing"
                      key={skill}
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>

              {(!result.missing_skills ||
                result.missing_skills.length === 0) && (
                <p>No missing skills identified.</p>
              )}
            </article>

          </div>

          {/* Strengths and Gaps */}
          <div className="skill-grid">

            <article className="skill-card">
              <h3>Resume Strengths</h3>

              {renderList(
                result.strengths || [],
                "No strengths returned."
              )}
            </article>

            <article className="skill-card">
              <h3>Areas to Improve</h3>

              {renderList(
                result.gaps || [],
                "No gaps returned."
              )}
            </article>

          </div>

        </section>
      )}

      {/* Advanced Resume Analysis */}
      {suggestionResult && (
        <section className="results">

          <h2>Advanced Resume Analysis</h2>

          <p className="disclaimer">
            {suggestionResult.message}
          </p>

          {/* Overall Review */}
          <article className="skill-card">

            <h3>Overall Resume Review</h3>

            <p>
              {suggestionResult.overall_review ||
                "No overall review was returned."}
            </p>

          </article>

          {/* Strengths and Weaknesses */}
          <div className="skill-grid">

            <article className="skill-card">
              <h3>Resume Strengths</h3>

              {renderList(
                suggestionResult.strengths || [],
                "No strengths were identified."
              )}
            </article>

            <article className="skill-card">
              <h3>Areas to Improve</h3>

              {renderList(
                suggestionResult.weaknesses || [],
                "No weaknesses were identified."
              )}
            </article>

          </div>

          {/* ATS Keywords */}
          <article className="skill-card">

            <h3>Missing ATS Keywords</h3>

            <div className="chips">
              {(suggestionResult.missing_keywords || []).map(
                (keyword) => (
                  <span
                    className="chip missing"
                    key={keyword}
                  >
                    {keyword}
                  </span>
                )
              )}
            </div>

            {(!suggestionResult.missing_keywords ||
              suggestionResult.missing_keywords.length === 0) && (
              <p>
                No missing keywords were identified by the analyzer.
              </p>
            )}

            <p className="helper">
              Only add a keyword if it accurately reflects your skills or experience.
            </p>

          </article>

          {/* Professional Summary */}
          <article className="skill-card">

            <h3>Suggested Professional Summary</h3>

            <p>
              {suggestionResult.professional_summary ||
                "The AI did not provide a professional summary."}
            </p>

          </article>

          {/* Rewritten Bullet Points */}
          <article className="skill-card">

            <h3>Resume Bullet-Point Improvements</h3>

            {(suggestionResult.rewritten_bullet_points || []).length > 0 ? (

              suggestionResult.rewritten_bullet_points.map(
                (bullet, index) => (

                  <div
                    key={`${index}-${bullet.original}`}
                    style={{ marginBottom: "20px" }}
                  >

                    <p>
                      <strong>Original</strong>
                    </p>

                    <p>{bullet.original}</p>

                    <p>
                      <strong>Improved Version</strong>
                    </p>

                    <p>{bullet.improved}</p>

                    {bullet.reason && (
                      <p className="helper">
                        <strong>Why:</strong> {bullet.reason}
                      </p>
                    )}

                  </div>

                )
              )

            ) : (

              <p>
                No existing bullet points were suitable for rewriting.
                Add project or experience details to your resume and try again.
              </p>

            )}

          </article>

          {/* Priority Actions */}
          <article className="skill-card">

            <h3>Priority Action Plan</h3>

            {renderList(
              suggestionResult.priority_actions || [],
              "No priority actions were returned."
            )}

          </article>

          {/* Job Specific Advice */}
          <article className="skill-card">

            <h3>Job-Specific Advice</h3>

            <p>
              {suggestionResult.job_specific_advice ||
                "No job-specific advice was returned."}
            </p>

          </article>

          {/* Improvement Checklist */}
          <article className="skill-card">

            <h3>Improvement Checklist</h3>

            {renderList(
              suggestionResult.suggestions || [],
              "No suggestions were returned."
            )}

          </article>

          {/* Missing Skills */}
          <article className="skill-card">

            <h3>Skills to Consider Developing</h3>

            <div className="chips">
              {(suggestionResult.missing_skills || []).map(
                (skill) => (
                  <span
                    className="chip missing"
                    key={skill}
                  >
                    {skill}
                  </span>
                )
              )}
            </div>

            {(!suggestionResult.missing_skills ||
              suggestionResult.missing_skills.length === 0) && (
              <p>
                No missing recognized skills were found for this job.
              </p>
            )}

          </article>

        </section>
      )}

      {/* Footer */}
      <footer>
        <span>CareerCopilot · Portfolio project</span>
        <span>Version 0.8.0</span>
      </footer>

    </main>
  );
}

export default Dashboard;
