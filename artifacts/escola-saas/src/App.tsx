import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { GuardianAuthProvider, useGuardianAuth } from "@/lib/guardian-auth";

import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import UsersPage from "@/pages/users";
import ExamsPage from "@/pages/exams";
import ExamDetailPage from "@/pages/exam-detail";
import ExamReportPage from "@/pages/exam-report";
import ClassesPage from "@/pages/classes";
import ClassDetailPage from "@/pages/class-detail";
import SubjectsPage from "@/pages/subjects";
import SeriesPage from "@/pages/series";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import StudentDashboardPage from "@/pages/student-dashboard";
import StudentExamPage from "@/pages/student-exam";
import StudentResultPage from "@/pages/student-result";
import StudentProfilePage from "@/pages/student-profile";
import GuardianLoginPage from "@/pages/guardian-login";
import GuardianDashboardPage from "@/pages/guardian-dashboard";
import LandingPage from "@/pages/landing";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({
  component: Component,
  allowedRoles,
}: {
  component: React.ComponentType;
  allowedRoles?: string[];
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to={user.role === "student" ? "/student" : "/dashboard"} />;
  }

  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Redirect to={user.role === "student" ? "/student" : "/dashboard"} />;
  }

  return <Component />;
}

function GuardianRoute({ component: Component }: { component: React.ComponentType }) {
  const { guardian, isLoading, isAuthenticated } = useGuardianAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated || !guardian) {
    return <Redirect to="/guardian/login" />;
  }

  return <Component />;
}

const ADMIN_ROLES = ["admin", "coordinator", "teacher"];
const ADMIN_CREATE = ["admin", "coordinator"];

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/login">
        <PublicRoute component={LoginPage} />
      </Route>
      <Route path="/register">
        <PublicRoute component={RegisterPage} />
      </Route>
      <Route path="/guardian/login">
        <GuardianLoginPage />
      </Route>
      <Route path="/">
        <LandingPage />
      </Route>

      {/* Admin / Staff */}
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} allowedRoles={ADMIN_ROLES} />
      </Route>
      <Route path="/users">
        <ProtectedRoute component={UsersPage} allowedRoles={ADMIN_CREATE} />
      </Route>
      <Route path="/exams/:id/report">
        {(params) => <ProtectedRoute component={() => <ExamReportPage />} allowedRoles={ADMIN_ROLES} />}
      </Route>
      <Route path="/exams/:id">
        {(params) => <ProtectedRoute component={() => <ExamDetailPage />} allowedRoles={ADMIN_ROLES} />}
      </Route>
      <Route path="/exams">
        <ProtectedRoute component={ExamsPage} allowedRoles={ADMIN_ROLES} />
      </Route>
      <Route path="/classes/:id">
        {(params) => <ProtectedRoute component={() => <ClassDetailPage />} allowedRoles={ADMIN_ROLES} />}
      </Route>
      <Route path="/students/:id">
        {(params) => <ProtectedRoute component={() => <StudentProfilePage />} allowedRoles={ADMIN_ROLES} />}
      </Route>
      <Route path="/classes">
        <ProtectedRoute component={ClassesPage} allowedRoles={ADMIN_ROLES} />
      </Route>
      <Route path="/subjects">
        <ProtectedRoute component={SubjectsPage} allowedRoles={ADMIN_ROLES} />
      </Route>
      <Route path="/series">
        <ProtectedRoute component={SeriesPage} allowedRoles={ADMIN_ROLES} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={ReportsPage} allowedRoles={ADMIN_ROLES} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} allowedRoles={ADMIN_CREATE} />
      </Route>

      {/* Student */}
      <Route path="/student/exam/:examId">
        {(params) => <ProtectedRoute component={() => <StudentExamPage />} allowedRoles={["student"]} />}
      </Route>
      <Route path="/student/result/:sessionId">
        {(params) => <ProtectedRoute component={() => <StudentResultPage />} allowedRoles={["student"]} />}
      </Route>
      <Route path="/student">
        <ProtectedRoute component={StudentDashboardPage} allowedRoles={["student"]} />
      </Route>

      {/* Guardian */}
      <Route path="/guardian">
        <GuardianRoute component={GuardianDashboardPage} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GuardianAuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </GuardianAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
