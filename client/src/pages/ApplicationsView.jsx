import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getJobApplications, updateApplicationStatus } from '../services/api.js';

// ─── Score Ring (visual percentage indicator) ─────────────────────────────
function ScoreRing({ score }) {
  const color =
    score >= 75 ? '#16a34a' :
    score >= 45 ? '#d97706' :
    '#dc2626';

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
      <svg className="rotate-[-90deg]" width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>{score}%</span>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    pending:     'bg-slate-100 text-slate-600 border-slate-200',
    reviewed:    'bg-blue-50 text-blue-700 border-blue-200',
    shortlisted: 'bg-green-50 text-green-700 border-green-200',
    rejected:    'bg-red-50 text-red-600 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

// ─── Skills Chip List ─────────────────────────────────────────────────────
function ChipList({ title, items = [], tone }) {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red:   'bg-red-50 text-red-600 border-red-200',
    blue:  'bg-blue-50 text-blue-700 border-blue-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className={`px-2.5 py-1 text-xs rounded-md border ${colors[tone]}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Applicant Row Card ──────────────────────────────────────────────────
function ApplicantCard({ application, rank, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(application.status);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setUpdating(true);
    try {
      await onStatusChange(application._id, newStatus);
      setStatus(newStatus);
    } catch {
      alert('Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* ── Main Row ── */}
      <div className="flex items-center gap-4 p-4 sm:p-5">
        {/* Rank */}
        <div className="w-8 text-center shrink-0">
          <span className="text-sm font-bold text-slate-400">#{rank}</span>
        </div>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-700 font-bold text-sm">
          {application.applicantName?.charAt(0).toUpperCase()}
        </div>

        {/* Name + Email */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">{application.applicantName}</p>
          <p className="text-sm text-slate-400 truncate">{application.applicantEmail}</p>
        </div>

        {/* Score Ring */}
        <ScoreRing score={application.mlScore} />

        {/* Status Select */}
        <div className="shrink-0">
          {updating ? (
            <span className="text-xs text-slate-400 italic">Saving…</span>
          ) : (
            <select
              value={status}
              onChange={handleStatusChange}
              className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
            >
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="shortlisted">Shortlisted ⭐</option>
              <option value="rejected">Rejected</option>
            </select>
          )}
        </div>

        {/* Expand Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-400"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <span className={`text-lg leading-none transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>⌄</span>
        </button>
      </div>

      {/* ── Expanded Analysis Panel ── */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-5 space-y-4">
          {/* Summary */}
          <div className="bg-slate-900 rounded-lg px-4 py-3 text-white">
            <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide">AI Summary</p>
            <p className="text-sm leading-relaxed">{application.mlAnalysis?.summary || 'No summary available.'}</p>
          </div>

          {/* Skills breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ChipList title="Matched Skills" items={application.mlAnalysis?.matchedSkills} tone="green" />
            <ChipList title="Missing Skills" items={application.mlAnalysis?.missingSkills} tone="red" />
          </div>

          {/* Suggestions */}
          {application.mlAnalysis?.suggestions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Suggestions</p>
              <ul className="space-y-1.5">
                {application.mlAnalysis.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-600">
                    <span className="text-blue-500 mt-0.5 shrink-0">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Applied At */}
          <p className="text-xs text-slate-400">
            Applied: {new Date(application.appliedAt).toLocaleDateString('en-IN', {
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Applications View Page ──────────────────────────────────────────
export default function ApplicationsView() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'recruiter') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'recruiter' || !jobId) return;

    const fetchApplications = async () => {
      try {
        setLoading(true);
        const data = await getJobApplications(jobId);
        setJob(data.job);
        setApplications(data.applications);
      } catch (err) {
        setError('Failed to load applications. You may not own this job posting.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user, jobId]);

  const handleStatusChange = async (appId, newStatus) => {
    await updateApplicationStatus(jobId, appId, newStatus);
    setApplications((prev) =>
      prev.map((app) => (app._id === appId ? { ...app, status: newStatus } : app))
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredApps = filter === 'all'
    ? applications
    : applications.filter((a) => a.status === filter);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── Top Nav ── */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/recruiter-dashboard')}
              className="text-slate-400 hover:text-indigo-600 transition shrink-0"
              title="Back to Dashboard"
            >
              ← Back
            </button>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate">{job?.title || 'Loading…'}</p>
              <p className="text-xs text-slate-400">Applications received</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
          >
            Log Out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20 text-slate-400 text-sm animate-pulse">Loading applications…</div>
        )}

        {!loading && job && (
          <>
            {/* Job Info Summary */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-800">{job.title}</h1>
                  <p className="text-sm text-slate-500 mt-1 max-w-2xl line-clamp-2">{job.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-indigo-600">{applications.length}</p>
                  <p className="text-xs text-slate-400">total applicant{applications.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {/* Required skills */}
              {job.requiredSkills?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {job.requiredSkills.map((s) => (
                    <span key={s} className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full font-medium">{s}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {['all', 'pending', 'reviewed', 'shortlisted', 'rejected'].map((f) => {
                const count = f === 'all' ? applications.length : applications.filter((a) => a.status === f).length;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
                      filter === f
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                  </button>
                );
              })}
            </div>

            {/* Empty state */}
            {filteredApps.length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-slate-500 text-sm">
                  {filter === 'all'
                    ? 'No applications received yet. Share this job posting to attract candidates.'
                    : `No applications with status "${filter}".`}
                </p>
              </div>
            )}

            {/* Applications List — sorted by ML score (already sorted by API) */}
            {filteredApps.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 font-medium">
                  Sorted by AI match score (highest first)
                </p>
                {filteredApps.map((app, index) => (
                  <ApplicantCard
                    key={app._id}
                    application={app}
                    rank={index + 1}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
