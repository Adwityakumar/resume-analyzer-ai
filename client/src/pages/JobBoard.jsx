import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllJobs, applyForJob } from '../services/api.js';

// ─── Score display after applying ────────────────────────────────────────────
function ScoreRing({ score }) {
  const color =
    score >= 75 ? '#16a34a' :
    score >= 45 ? '#d97706' :
    '#dc2626';
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
      <svg className="rotate-[-90deg]" width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xl font-bold" style={{ color }}>{score}%</span>
    </div>
  );
}

// ─── Skill chip ───────────────────────────────────────────────────────────────
function SkillChip({ skill, tone = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    green:  'bg-green-50 text-green-700 border-green-200',
    red:    'bg-red-50 text-red-600 border-red-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs rounded-full border font-medium ${colors[tone]}`}>
      {skill}
    </span>
  );
}

// ─── Apply Modal ──────────────────────────────────────────────────────────────
function ApplyModal({ job, onClose, onApplied }) {
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);  // ML result after applying

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);
    setFileName(file.name);
    // For non-PDF files, pre-read text
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      file.text().then(setResumeText).catch(() => {});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resumeText.trim() && !resumeFile) {
      setError('Please upload your resume or paste your resume text.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await applyForJob(job._id, { resumeText, resumeFile });
      setResult(data);
      onApplied(job._id); // mark as applied in parent state
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Apply for Job</h2>
            <p className="text-sm text-slate-500 mt-0.5">{job.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>

        {/* Result Panel — shown after successful apply */}
        {result ? (
          <div className="p-6 space-y-5">
            <div className="text-center">
              <p className="text-sm font-semibold text-green-600 mb-1">✅ Application Submitted!</p>
              <p className="text-xs text-slate-500 mb-4">Here's how your resume matches this role:</p>
              <ScoreRing score={result.score} />
              <p className="text-lg font-bold text-slate-800 mt-3">{result.score}% Match</p>
            </div>

            {/* AI Summary */}
            {result.summary && (
              <div className="bg-slate-900 rounded-lg px-4 py-3 text-white">
                <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide">AI Summary</p>
                <p className="text-sm leading-relaxed">{result.summary}</p>
              </div>
            )}

            {/* Skills breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.matchedSkills?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Matched Skills ✅</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.matchedSkills.map(s => <SkillChip key={s} skill={s} tone="green" />)}
                  </div>
                </div>
              )}
              {result.missingSkills?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Missing Skills ⚠️</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingSkills.map(s => <SkillChip key={s} skill={s} tone="red" />)}
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {result.suggestions?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Suggestions</p>
                <ul className="space-y-1.5">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600">
                      <span className="text-blue-500 shrink-0 mt-0.5">→</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>
            )}

            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-indigo-700 mb-1">Job Requirements</p>
              {job.requiredSkills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {job.requiredSkills.map(s => <SkillChip key={s} skill={s} tone="indigo" />)}
                </div>
              )}
              {job.requiredSkills?.length === 0 && (
                <p className="text-xs text-indigo-600">No specific skills listed.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Upload Resume <span className="text-slate-400 font-normal">(PDF, TXT, MD)</span>
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf,.txt,.md,.text"
                onChange={handleFileChange}
                className="block w-full rounded-md border border-slate-300 bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:bg-indigo-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {fileName && <p className="mt-1 text-xs text-slate-500">📎 {fileName}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Or paste resume text
              </label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={7}
                placeholder="Paste the full text of your resume here..."
                className="w-full resize-y rounded-md border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (!resumeText.trim() && !resumeFile)}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing & Submitting…
                  </span>
                ) : 'Submit Application'}
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center">
              Our AI will analyze your resume against this job description and provide instant feedback.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job, onApply }) {
  const [expanded, setExpanded] = useState(false);

  const timeSince = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all duration-200 overflow-hidden ${
      job.hasApplied ? 'border-green-200' : 'border-slate-200 hover:shadow-md'
    }`}>
      <div className="p-5 sm:p-6">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-800">{job.title}</h2>
              {job.hasApplied && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
                  ✓ Applied
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {job.recruiterName || 'Anonymous Recruiter'} · <span className="text-slate-400">{timeSince(job.createdAt)}</span>
            </p>
          </div>

          {/* Apply button or applied badge */}
          {!job.hasApplied ? (
            <button
              onClick={() => onApply(job)}
              className="shrink-0 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
            >
              Apply Now
            </button>
          ) : (
            <div className="shrink-0 px-4 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-semibold border border-green-200">
              Applied ✓
            </div>
          )}
        </div>

        {/* Description preview */}
        <p className={`text-sm text-slate-600 mt-3 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
          {job.description}
        </p>

        {/* Skills row */}
        {job.requiredSkills?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.requiredSkills.slice(0, 5).map(s => (
              <SkillChip key={s} skill={s} tone="indigo" />
            ))}
            {job.requiredSkills.length > 5 && (
              <span className="inline-flex px-2.5 py-1 text-xs rounded-full border bg-slate-50 text-slate-500 border-slate-200 font-medium">
                +{job.requiredSkills.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Good to have */}
        {expanded && job.goodToHave?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-slate-400 font-medium mb-1.5">Good to have:</p>
            <div className="flex flex-wrap gap-1.5">
              {job.goodToHave.map(s => <SkillChip key={s} skill={s} tone="blue" />)}
            </div>
          </div>
        )}

        {/* Toggle description */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {expanded ? '▲ Show less' : '▼ Show more'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Job Board Page ──────────────────────────────────────────────────────
export default function JobBoard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState(null); // job being applied to

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAllJobs();
      setJobs(data);
    } catch (err) {
      setError('Failed to load job postings. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleApplied = (jobId) => {
    // Mark hasApplied in local state so UI updates immediately
    setJobs(prev => prev.map(j => j._id === jobId ? { ...j, hasApplied: true } : j));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter jobs by search term
  const filteredJobs = jobs.filter(job => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      job.description.toLowerCase().includes(q) ||
      job.requiredSkills?.some(s => s.toLowerCase().includes(q))
    );
  });

  const appliedCount = jobs.filter(j => j.hasApplied).length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── Sticky Navigation ── */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          {/* Brand + User */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="font-bold text-slate-800 leading-tight truncate">{user?.name}</p>
              <p className="text-xs text-indigo-600 font-medium">Job Seeker</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => navigate('/jobs')}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-indigo-700 bg-indigo-50 transition"
            >
              Job Board
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Job Board</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse open positions and apply with your resume — get instant AI match feedback.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Open Jobs</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{jobs.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Applied</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{appliedCount}</p>
          </div>
          <div className="hidden sm:block bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Remaining</p>
            <p className="text-3xl font-bold text-slate-700 mt-1">{jobs.length - appliedCount}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, skill, or keyword..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
            >
              ×
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5 flex items-center justify-between">
            {error}
            <button onClick={fetchJobs} className="font-semibold underline ml-4">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                <div className="h-5 bg-slate-100 rounded w-1/3 mb-3" />
                <div className="h-4 bg-slate-100 rounded w-1/4 mb-4" />
                <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredJobs.length === 0 && !error && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <p className="text-4xl mb-3">📭</p>
            {search ? (
              <>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No jobs match "{search}"</h3>
                <p className="text-sm text-slate-500 mb-4">Try a different keyword or clear the search.</p>
                <button onClick={() => setSearch('')} className="text-sm text-indigo-600 font-semibold hover:underline">
                  Clear search
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No open jobs right now</h3>
                <p className="text-sm text-slate-500">Check back soon — recruiters are posting new jobs.</p>
              </>
            )}
          </div>
        )}

        {/* Job listing */}
        {!loading && filteredJobs.length > 0 && (
          <>
            <p className="text-xs text-slate-400 font-medium mb-3">
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
              {search ? ` for "${search}"` : ''}
            </p>
            <div className="space-y-4">
              {filteredJobs.map(job => (
                <JobCard
                  key={job._id}
                  job={job}
                  onApply={setSelectedJob}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Apply Modal ── */}
      {selectedJob && (
        <ApplyModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onApplied={handleApplied}
        />
      )}
    </main>
  );
}
