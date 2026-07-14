import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import JobDemo from './pages/JobDemo.jsx';

function App() {
  return (
    <Router>
      <div className="min-h-screen text-gray-900 font-sans bg-gray-50">
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Your Main Application */}
          <Route path="/dashboard" element={<JobDemo />} />
          
          {/* Default Route: Kicks users to login if they try a random URL */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;