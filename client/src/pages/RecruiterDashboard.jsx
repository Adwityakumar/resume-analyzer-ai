import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyJobs, createJob, updateJob, deleteJob } from '../services/api.js';

// ─── Skill Input Component ─────────────────────────────────────────────────
function SkillInput({ label, skills, onChange }) {
  const [input, setInput] = useState('');

  const addSkill = () => {
    const trimmed = input.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
    }
    setInput('');
  };

  const removeSkill = (skill) => onChange(skills.filter((s) => s !== skill));

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
          placeholder="Type a skill and press Enter"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="button"
          onClick={addSkill}
          className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 transition"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1 text-xs font-medium"
          >
            {skill}
            <button type="button" onClick={() => removeSkill(skill)} className="ml-1 text-indigo-400 hover:text-indigo-700 font-bold leading-none">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Create Job Modal ──────────────────────────────────────────────────────
function CreateJobModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    requiredSkills: [],
    goodToHave: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and description are required.');
      return;
    }
    setLoading(true);
    try {
      const newJob = await createJob(form);
      onCreated(newJob);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create job.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Post a New Job</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Job Title</label>
            <input
              type="text"
              name="title"
              required
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Senior Frontend Developer"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Job Description</label>
            <textarea
              name="description"
              required
              rows={5}
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the role, responsibilities, and requirements..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
            />
          </div>

          <SkillInput
            label="Required Skills"
            skills={form.requiredSkills}
            onChange={(skills) => setForm((prev) => ({ ...prev, requiredSkills: skills }))}
          />

          <SkillInput
            label="Good to Have Skills"
            skills={form.goodToHave}
            onChange={(skills) => setForm((prev) => ({ ...prev, goodToHave: skills }))}
          />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Posting…' : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Score Badge ──────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const color =
    score >= 75 ? 'bg-green-100 text-green-700 border-green-200' :
    score >= 45 ? 'bg-amber-100 text-amber-700 border-amber-200' :
    'bg-red-100 text-red-600 border-red-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${color}`}>
      {score}%
    </span>
  );
}

// ─── Main Recruiter Dashboard ──────────────────────────────────────────────
export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [error, setError] = useState('');

  // Redirect non-recruiters
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'recruiter') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyJobs();
      setJobs(data);
    } catch (err) {
      setError('Failed to load your job postings.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'recruiter') {
      fetchJobs();
    }
  }, [user, fetchJobs]);

  const handleJobCreated = (newJob) => {
    setJobs((prev) => [{ ...newJob, applicationCount: 0 }, ...prev]);
  };

  const handleTogglePause = async (job) => {
    const nextActiveState = job.isActive === false;
    setUpdatingId(job._id);
    setOpenMenuId(null);
    try {
      const updatedJob = await updateJob(job._id, { isActive: nextActiveState });
      setJobs((prev) =>
        prev.map((item) =>
          item._id === job._id
            ? { ...item, ...updatedJob, applicationCount: item.applicationCount }
            : item
        )
      );
    } catch (err) {
      alert('Failed to update job status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('Delete this job posting? It will no longer appear in your recruiter dashboard or on the job board.')) return;
    setDeletingId(jobId);
    setOpenMenuId(null);
    try {
      await deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
    } catch (err) {
      alert('Failed to delete job. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── Top Navigation Bar ── */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-800 leading-tight">{user.name}</p>
              <p className="text-xs text-indigo-600 font-medium">Recruiter Account</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
            >
              <span className="text-lg leading-none">+</span> Post New Job
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Jobs Posted</p>
            <p className="text-4xl font-bold text-indigo-600 mt-1">{jobs.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Active Jobs</p>
            <p className="text-4xl font-bold text-green-600 mt-1">
              {jobs.filter((j) => j.isActive !== false).length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Applications</p>
            <p className="text-4xl font-bold text-slate-800 mt-1">
              {jobs.reduce((sum, j) => sum + (j.applicationCount || 0), 0)}
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-slate-800">Your Job Postings</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-sm text-indigo-600 font-semibold hover:underline"
          >
            + Post a job
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-3 text-sm mb-5">{error}</div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-slate-400 text-sm animate-pulse">Loading your job postings…</div>
        )}

        {/* Empty state */}
        {!loading && jobs.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No job postings yet</h3>
            <p className="text-sm text-slate-500 mb-6">Post your first job to start receiving AI-analyzed applications.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Post Your First Job
            </button>
          </div>
        )}

        {/* Job Cards */}
        {!loading && jobs.length > 0 && (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job._id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-slate-800 truncate">{job.title}</h2>
                        {job.isActive === false && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200">
                            Paused
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{job.description}</p>
                    </div>
                    <div className="flex items-start gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-800">{job.applicationCount || 0}</p>
                        <p className="text-xs text-slate-400">applicant{job.applicationCount !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId((current) => (current === job._id ? null : job._id))}
                          className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
                          aria-label="Job actions"
                        >
                          ...
                        </button>

                        {openMenuId === job._id && (
                          <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                            <button
                              type="button"
                              onClick={() => navigate(`/recruiter/jobs/${job._id}/applications`)}
                              className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                            >
                              View Applications
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePause(job)}
                              disabled={updatingId === job._id}
                              className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {job.isActive === false ? 'Resume Applications' : 'Pause Applications'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(job._id)}
                              disabled={deletingId === job._id}
                              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingId === job._id ? 'Deleting...' : 'Delete Job'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Skills Preview */}
                  {job.requiredSkills?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {job.requiredSkills.slice(0, 6).map((skill) => (
                        <span key={skill} className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 font-medium">
                          {skill}
                        </span>
                      ))}
                      {job.requiredSkills.length > 6 && (
                        <span className="px-2.5 py-1 text-xs bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                          +{job.requiredSkills.length - 6} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-5 flex items-center gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => navigate(`/recruiter/jobs/${job._id}/applications`)}
                      className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
                    >
                      View Applications ({job.applicationCount || 0})
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Job Modal ── */}
      {showCreateModal && (
        <CreateJobModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleJobCreated}
        />
      )}
    </main>
  );
}
