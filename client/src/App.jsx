import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import JobBoard from './pages/JobBoard.jsx';
import JobDemo from './pages/JobDemo.jsx';
import RecruiterDashboard from './pages/RecruiterDashboard.jsx';
import ApplicationsView from './pages/ApplicationsView.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen text-gray-900 font-sans bg-gray-50">
          <Routes>
            {/* ── Public Routes ── */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* ── Job Seeker Routes ── */}
            <Route
              path="/jobs"
              element={
                <ProtectedRoute role="user">
                  <JobBoard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute role="user">
                  <JobDemo />
                </ProtectedRoute>
              }
            />

            {/* ── Recruiter Routes ── */}
            <Route
              path="/recruiter-dashboard"
              element={
                <ProtectedRoute role="recruiter">
                  <RecruiterDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiter/jobs/:jobId/applications"
              element={
                <ProtectedRoute role="recruiter">
                  <ApplicationsView />
                </ProtectedRoute>
              }
            />

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;