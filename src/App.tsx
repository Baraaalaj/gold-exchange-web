import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { usePin } from "./context/PinContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { PinGate } from "./pages/PinGate";
import { Home } from "./pages/Home";
import { Usdt } from "./pages/Usdt";
import { Persons } from "./pages/Persons";
import { Customers } from "./pages/Customers";
import { Reports } from "./pages/Reports";
import { AddTransaction } from "./pages/AddTransaction";
import { Settings } from "./pages/Settings";

function FullScreenSpinner() {
  return (
    <div className="min-h-svh flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { isUnlocked } = usePin();

  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isUnlocked) return <Navigate to="/pin" replace />;

  return <Layout>{children}</Layout>;
}

function PinRoute() {
  const { user, loading } = useAuth();
  const { isUnlocked } = usePin();

  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isUnlocked) return <Navigate to="/" replace />;

  return <PinGate />;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route path="/pin" element={<PinRoute />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/usdt"
        element={
          <RequireAuth>
            <Usdt />
          </RequireAuth>
        }
      />
      <Route
        path="/persons"
        element={
          <RequireAuth>
            <Persons />
          </RequireAuth>
        }
      />
      <Route
        path="/customers"
        element={
          <RequireAuth>
            <Customers />
          </RequireAuth>
        }
      />
      <Route
        path="/reports"
        element={
          <RequireAuth>
            <Reports />
          </RequireAuth>
        }
      />
      <Route
        path="/transactions/new"
        element={
          <RequireAuth>
            <AddTransaction />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <Settings />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
