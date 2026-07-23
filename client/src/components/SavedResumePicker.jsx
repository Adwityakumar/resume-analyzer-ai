import React, { useState, useEffect } from 'react';
import { getMyResumes } from '../services/api.js';

export default function SavedResumePicker({ onSelect, onDelete }) {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    getMyResumes()
      .then(setResumes)
      .catch(() => setResumes([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (publicId) => {
    if (!window.confirm('Remove this resume from your vault?')) return;
    setDeletingId(publicId);
    try {
      await onDelete(publicId);
      setResumes((prev) => prev.filter((r) => r.publicId !== publicId));
    } catch {
      alert('Failed to delete. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-slate-400 animate-pulse">
        Loading your saved resumes…
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-3xl mb-2">📂</p>
        <p className="text-sm text-slate-500">No saved resumes yet.</p>
        <p className="text-xs text-slate-400 mt-1">
          Upload a PDF in the other tab and it will appear here for future use.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400 mb-3">
        Select a previously uploaded resume.
      </p>
      {resumes.map((r) => (
        <div
          key={r.publicId}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-indigo-300 transition"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <span className="text-red-500 text-sm font-bold">📄</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">{r.fileName || 'resume.pdf'}</p>
              <p className="text-xs text-slate-400">
                {new Date(r.uploadedAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Open PDF in new tab */}
            <a
              href={`https://docs.google.com/viewer?url=${encodeURIComponent(r.url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 font-medium hover:underline"
            >
              Preview
            </a>

            {/* Use this resume */}
            <button
              type="button"
              onClick={() => onSelect(r)}
              className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
            >
              Use
            </button>

            {/* Remove from vault */}
            <button
              type="button"
              onClick={() => handleDelete(r.publicId)}
              disabled={deletingId === r.publicId}
              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40"
              title="Remove from vault"
            >
              {deletingId === r.publicId ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
              ) : '×'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
