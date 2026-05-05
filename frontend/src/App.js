import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ChatLayout from "@/pages/ChatLayout";
import SettingsPage from "@/pages/SettingsPage";
import "@/App.css";

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#6366f1] flex items-center justify-center animate-pulse">
            <span className="font-outfit font-bold text-white text-lg">P</span>
          </div>
          <p className="text-[#a1a1aa] text-sm">Loading Parlance...</p>
        </div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return !user ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
      <Route path="/settings" element={<ProtectedRoute><ChatProvider><SettingsPage /></ChatProvider></ProtectedRoute>} />
      <Route path="/*" element={<ProtectedRoute><ChatProvider><ChatLayout /></ChatProvider></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    // Apply dark mode by default
    const savedTheme = localStorage.getItem("parlance_theme") || "dark";
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#18181b",
              color: "#fafafa",
              border: "1px solid #27272a",
              borderRadius: "8px",
              fontSize: "14px",
            },
            success: { iconTheme: { primary: "#10b981", secondary: "#18181b" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#18181b" } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
