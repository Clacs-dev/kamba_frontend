import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Registo from "./pages/Registo";
import Home from "./pages/Home";
import TrocarPassword from "./pages/TrocarPassword";
import Inicio from "./pages/Inicio";
import Portal from "./pages/Portal";
import Colaboradores from "./pages/Colaboradores";
import Avaliacoes from "./pages/Avaliacoes";
import Disciplina from "./pages/Disciplina";
import Relatorios from "./pages/Relatorios";
import Formacao from "./pages/Formacao";
import Cultura from "./pages/Cultura";
import Dashboard from "./pages/Dashboard";
import Auditoria from "./pages/Auditoria";

function RotaProtegida({ children }: { children: React.ReactNode }) {
  const { token, user, aCarregar } = useAuth();
  if (aCarregar) return <div className="min-h-screen flex items-center justify-center text-slate-400">A carregar...</div>;
  if (!token) return <Navigate to="/login" replace />;
  // Se o utilizador tem de trocar a password, mostra esse ecrã antes de tudo.
  if (user?.must_change_password) return <TrocarPassword />;
  return <>{children}</>;
}

function RotaPublica({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <Navigate to="/" replace /> : <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<RotaPublica><Login /></RotaPublica>} />
          <Route path="/registo" element={<RotaPublica><Registo /></RotaPublica>} />

          {/* O Home é o layout (topbar + sidebar); as secções são rotas filhas. */}
          <Route path="/" element={<RotaProtegida><Home /></RotaProtegida>}>
            <Route index element={<Inicio />} />
            <Route path="portal" element={<Portal />} />
            <Route path="colaboradores" element={<Colaboradores />} />
            <Route path="avaliacoes" element={<Avaliacoes />} />
            <Route path="disciplina" element={<Disciplina />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="formacao" element={<Formacao />} />
            <Route path="cultura" element={<Cultura />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="auditoria" element={<Auditoria />} />
          </Route>

          {/* Qualquer outro caminho volta ao início. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;