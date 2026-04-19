import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";

function PrivateRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="loading">Chargement...</div>;
  return token ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="loading">Chargement...</div>;
  return !token ? children : <Navigate to="/lobby" />;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/lobby" element={<PrivateRoute><Lobby /></PrivateRoute>} />
            <Route path="/game" element={<PrivateRoute><Game /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
