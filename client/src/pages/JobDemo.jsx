import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [user, setUser] = useState(null);

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
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login'); // Kick to login if not authenticated
    } else {
      setUser(JSON.parse(userData));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      
      {/* AUTHENTICATION HEADER */}
      <div className="mx-auto max-w-6xl mb-8 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Welcome, {user.name}</h2>
          <p className="text-sm text-slate-500">
            {user.email} <span className="mx-2">•</span> 
            <span className="capitalize font-medium text-blue-600">{user.role} Account</span>
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
        >
          Log Out
        </button>
      </div>

      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Job Demo</p>
            <h1 className="mt-2 text-3xl font-bold">Role Based Resume Analyzer</h1>
            <p className="mt-2 text-sm text-slate-600">
              Resume text and selected role are required. Job description is optional.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="mb-5 w-full rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? 'Analyzing...' : 'Analyze Resume'}
          </button>

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
              <ResultList title="Suggestions" items={result.suggestions} tone="blue" />
            </div>
          )}
        </aside>
      </section>
    </main>
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