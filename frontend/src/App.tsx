
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { useEffect, useState } from "react";

import Login from "./Login";
import Signup from "./Signup";
import Dashboard from "./Dashboard";

const API_URL = "http://127.0.0.1:8000";

function ProtectedDashboard() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("careerToken");

    if (!token) {
      setChecking(false);
      return;
    }

    let cancelled = false;

    async function verifyToken() {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          sessionStorage.removeItem("careerToken");
          sessionStorage.removeItem("careerUser");

          if (!cancelled) {
            setAuthenticated(false);
          }

          return;
        }

        if (!cancelled) {
          setAuthenticated(true);
        }
      } catch {
        // If the backend is unavailable, do not grant access.
        if (!cancelled) {
          setAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    verifyToken();

    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return <p>Checking your login...</p>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route path="/login" element={<Login />} />

        <Route path="/signup" element={<Signup />} />

        <Route
          path="/dashboard"
          element={<ProtectedDashboard />}
        />

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
