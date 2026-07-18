import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const signupUser = async (payload) => {
  const response = await api.post('/auth/signup', payload);
  return response.data;
};

// ─── Job Demo: standalone resume analysis tool ────────────────────────────────
export const analyzeJobDemo = async (payload) => {
  if (payload.resumeFile) {
    const formData = new FormData();
    formData.append('resumeFile', payload.resumeFile);
    formData.append('resumeText', payload.resumeText || '');
    formData.append('role', payload.role);
    formData.append('jobDescription', payload.jobDescription);

    const response = await api.post('/jobdemo/analyze', formData);
    return response.data;
  }

  const response = await api.post('/jobdemo/analyze', payload);
  return response.data;
};

// ─── Jobs: Recruiter ──────────────────────────────────────────────────────────
export const createJob = async (jobData) => {
  const response = await api.post('/jobs', jobData);
  return response.data;
};

export const getMyJobs = async () => {
  const response = await api.get('/jobs/my');
  return response.data;
};

export const updateJob = async (id, data) => {
  const response = await api.patch(`/jobs/${id}`, data);
  return response.data;
};

export const deleteJob = async (id) => {
  const response = await api.delete(`/jobs/${id}`);
  return response.data;
};

export const getJobApplications = async (jobId) => {
  const response = await api.get(`/jobs/${jobId}/applications`);
  return response.data;
};

export const updateApplicationStatus = async (jobId, appId, status) => {
  const response = await api.patch(`/jobs/${jobId}/applications/${appId}`, { status });
  return response.data;
};

// ─── Jobs: Job Seeker ─────────────────────────────────────────────────────────
export const getAllJobs = async () => {
  const response = await api.get('/jobs');
  return response.data;
};

export const analyzeJobApplication = async (jobId, payload) => {
  if (payload.resumeFile) {
    const formData = new FormData();
    formData.append('resumeFile', payload.resumeFile);
    formData.append('resumeText', payload.resumeText || '');
    const response = await api.post(`/jobs/${jobId}/analyze`, formData);
    return response.data;
  }

  const response = await api.post(`/jobs/${jobId}/analyze`, payload);
  return response.data;
};

export const applyForJob = async (jobId, payload) => {
  if (payload.resumeFile) {
    const formData = new FormData();
    formData.append('resumeFile', payload.resumeFile);
    formData.append('resumeText', payload.resumeText || '');
    const response = await api.post(`/jobs/${jobId}/apply`, formData);
    return response.data;
  }

  const response = await api.post(`/jobs/${jobId}/apply`, payload);
  return response.data;
};

export const getMyApplications = async () => {
  const response = await api.get('/jobs/my-applications');
  return response.data;
};

export default api;
