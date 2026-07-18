import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analyzeJobDemo } from '../services/api.js';

const roles = [
  { value: 'full_stack_developer', label: 'Full Stack Developer' },
  { value: 'frontend_developer', label: 'Frontend Developer' },
  { value: 'backend_developer', label: 'Backend Developer' },
  { value: 'data_analyst', label: 'Data Analyst' },
  { value: 'ui_ux_designer', label: 'UI/UX Designer' },
];

function JobDemo() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [resumeText, setResumeText] = useState('');
  const [selectedRole, setSelectedRole] = useState('full_stack_developer');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- SECURITY CHECK ---
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const canAnalyze = useMemo(() => {
    return Boolean((resumeText.trim() || resumeFile) && selectedRole && !loading);
  }, [loading, resumeFile, resumeText, selectedRole]);

  const handleResumeFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setResumeFile(file);
    setFileName(file.name);

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }

    try {
      const text = await file.text();
      setResumeText(text);
    } catch (readError) {
      console.error(readError);
      setError('Could not read the resume file. Please paste the resume text and try again.');
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim() && !resumeFile) {
      setError('Please add resume text or upload a resume file.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await analyzeJobDemo({
        resumeText,
        resumeFile,
        role: selectedRole,
        jobDescription,
      });
      setResult(data);
    } catch (requestError) {
      console.error(requestError);
      setError(
        requestError.response?.data?.error ||
          'Analysis failed. Please check that the backend and ML-core services are running.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Prevent flash of content before user data loads
  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">

      {/* ── Sticky Navigation ── */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="font-bold text-slate-800 leading-tight truncate">{user?.name}</p>
              <p className="text-xs text-indigo-600 font-medium">Job Seeker</p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            <button
              onClick={() => navigate('/jobs')}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Job Board
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-indigo-700 bg-indigo-50 transition"
            >
              Resume Analyzer
            </button>
          </nav>

          <button
            onClick={handleLogout}
            className="shrink-0 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
          >
            Log Out
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Job Demo</p>
            <h1 className="mt-2 text-3xl font-bold">Role Based Resume Analyzer</h1>
            <p className="mt-2 text-sm text-slate-600">
              Resume text and selected role are required. Job description is optional.
            </p>
          </div>


          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Resume file (.pdf, .txt, or .md)
              </span>
              <input
                type="file"
                accept=".pdf,application/pdf,.txt,.md,.text"
                onChange={handleResumeFile}
                className="block w-full rounded-md border border-slate-300 bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:bg-blue-50 file:px-4 file:py-3 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
              {fileName && <span className="mt-2 block text-xs text-slate-500">{fileName}</span>}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Resume text
              </span>
              <textarea
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                rows={9}
                placeholder="Paste candidate resume text, or upload a PDF/text resume file..."
                className="w-full resize-y rounded-md border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">Role</span>
              <select
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Job description optional
              </span>
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                rows={8}
                placeholder="Paste the job description if available..."
                className="w-full resize-y rounded-md border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="sticky bottom-0 -mx-6 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="w-full rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? 'Analyzing...' : 'Analyze Resume'}
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Result</h2>
          {!result && (
            <p className="mt-3 text-sm text-slate-600">
              After analysis, the score, matched skills, missing skills, suggestions, and summary
              will appear here.
            </p>
          )}

          {result && (
            <div className="mt-5 space-y-5">
              <div className="rounded-lg bg-slate-950 p-5 text-white">
                <p className="text-sm text-slate-300">{result.role}</p>
                <p className="mt-2 text-5xl font-bold">{result.score}%</p>
                <p className="mt-3 text-sm text-slate-300">{result.summary}</p>
              </div>

              <ResultList title="Matched Skills" items={result.matchedSkills} tone="green" />
              <ResultList title="Missing Skills" items={result.missingSkills} tone="red" />
              <ResultList title="Extracted Skills" items={result.extractedSkills} tone="blue" />
              <ResultList title="Suggestions" items={result.suggestions} tone="blue" />
              <ScoreBreakdown breakdown={result.scoreBreakdown} />
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function ScoreBreakdown({ breakdown }) {
  if (!breakdown || !Object.keys(breakdown).length) {
    return null;
  }

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-800">Score Breakdown</h3>
      <div className="grid gap-2 sm:grid-cols-3">
        <BreakdownItem label="Required" value={breakdown.requiredSkillsScore} suffix="/80" />
        <BreakdownItem label="Good to have" value={breakdown.goodToHaveScore} suffix="/20" />
        <BreakdownItem label="Extracted skills" value={breakdown.extractedSkillCount} />
      </div>
    </section>
  );
}

function BreakdownItem({ label, value, suffix = '' }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">
        {Number(value || 0).toFixed(0)}
        {suffix}
      </p>
    </div>
  );
}

function ResultList({ title, items = [], tone }) {
  const toneClasses = {
    green: 'border-green-200 bg-green-50 text-green-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
  };

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-800">{title}</h3>
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className={`rounded-md border px-3 py-2 text-sm ${toneClasses[tone]}`}
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No items found.</p>
      )}
    </section>
  );
}

export default JobDemo;
