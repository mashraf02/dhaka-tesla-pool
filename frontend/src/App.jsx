import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'DRIVER' ? '/driver' : '/passenger'} replace />;
}

// Placeholder dashboards — replaced in Part 3 (passenger) and Part 4 (driver).
function PassengerDashboardPlaceholder() {
  return <h1>Passenger dashboard coming in Part 3</h1>;
}
function DriverDashboardPlaceholder() {
  return <h1>Driver dashboard coming in Part 4</h1>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/passenger"
            element={
              <ProtectedRoute role="PASSENGER">
                <PassengerDashboardPlaceholder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver"
            element={
              <ProtectedRoute role="DRIVER">
                <DriverDashboardPlaceholder />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
