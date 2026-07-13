import axios from 'axios';
import FormData from 'form-data';

const ML_CORE_URL = process.env.ML_CORE_URL || 'http://localhost:8000';

export const analyzeJobMatch = async (payload) => {
  if (payload.resumeFile) {
    const formData = new FormData();
    formData.append('resumeFile', payload.resumeFile.buffer, {
      filename: payload.resumeFile.originalname,
      contentType: payload.resumeFile.mimetype,
    });
    formData.append('resumeText', payload.resumeText || '');
    formData.append('role', payload.role);
    formData.append('jobDescription', payload.jobDescription);
    formData.append('roleKeypoints', JSON.stringify(payload.roleKeypoints));

    const response = await axios.post(`${ML_CORE_URL}/jobdemo/analyze`, formData, {
      headers: formData.getHeaders(),
    });
    return response.data;
  }

  const response = await axios.post(`${ML_CORE_URL}/jobdemo/analyze`, payload);
  return response.data;
};
