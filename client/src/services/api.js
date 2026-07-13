import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

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

export default api;
