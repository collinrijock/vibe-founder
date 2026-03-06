import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth";
import { BusinessCreationProvider } from "@/lib/business-creation";
import { WorkspaceProvider } from "@/lib/workspace";
import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { CommandPalette } from "@/components/workspace/CommandPalette";
import ChatPage from "@/pages/ChatPage";
import DashboardPage from "@/pages/DashboardPage";
import BusinessDashboardPage from "@/pages/BusinessDashboardPage";
import AgentPage from "@/pages/AgentPage";
import LoginPage from "@/pages/LoginPage";
import OnboardingPage from "@/pages/OnboardingPage";
import { FaIcon } from "@/components/ui/fa-icon";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-base text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (user.stage === "ONBOARDING") {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<WorkspaceShell />}>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat/:sessionId?" element={<ChatPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="business/:businessId" element={<BusinessDashboardPage />} />
        <Route path="agents" element={<AgentPage />} />
      </Route>
    </Routes>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-base text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to="/chat" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <BusinessCreationProvider>
            <WorkspaceProvider>
              <CommandPalette />
              <Routes>
                <Route path="/login" element={<AuthGate />} />
                <Route path="/*" element={<ProtectedRoutes />} />
              </Routes>
            </WorkspaceProvider>
          </BusinessCreationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
