import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DecisionFlowView from "./pages/DecisionFlowView";
import History from "./pages/History";
import Manage from "./pages/Manage";
import Register from "./pages/Register";
import Docs from "./pages/Docs";
import DecisionFlowHistory from "./pages/DecisionFlowHistory";
import Play from "./pages/Play";
import Share from "./pages/Share";
import Settings from "./pages/Settings";
import "./App.css";

function ProtectedLayout({ children, allowIfMustChange = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && !allowIfMustChange) return <Navigate to="/app/settings" replace />;
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/app" replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/app" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/app" replace /> : <Register />} />

      <Route path="/app" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
      <Route path="/app/decisionflow/:id" element={<ProtectedLayout><DecisionFlowView /></ProtectedLayout>} />
      <Route path="/app/history" element={<ProtectedLayout><History /></ProtectedLayout>} />
      <Route path="/app/manage" element={<ProtectedLayout><Manage /></ProtectedLayout>} />
      <Route path="/app/docs" element={<ProtectedLayout><Docs /></ProtectedLayout>} />
      <Route path="/app/decisionflow/:id/history" element={<ProtectedLayout><DecisionFlowHistory /></ProtectedLayout>} />
      <Route path="/app/settings" element={<ProtectedLayout allowIfMustChange><Settings /></ProtectedLayout>} />

      <Route path="/play/:code" element={<Play />} />
      <Route path="/share/:id" element={<Share />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
