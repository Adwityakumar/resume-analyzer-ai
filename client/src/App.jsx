import { useState } from 'react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post('http://localhost:5000/api/upload', formData);
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setResult({ error: "Upload failed. Make sure Express and Python are running." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Analyzer AI</h1>
        <p className="text-gray-600 mb-8">Upload a PDF to test the full MERN + Python pipeline.</p>
        
        <div className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 mb-6">
          <input 
            type="file" 
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="flex-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button 
            onClick={handleUpload} 
            disabled={loading}
            className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Processing...' : 'Analyze'}
          </button>
        </div>

        {result && (
          <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre className="text-green-400 text-sm font-mono">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
      </div>
    </div>
  );
}

export default App;