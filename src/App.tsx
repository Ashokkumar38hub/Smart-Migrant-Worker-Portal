import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Header from "@/components/Header";
import GlobalNotificationListener from "@/components/GlobalNotificationListener";
import Index from "./pages/Index";
import Login from "./pages/Login";
import WorkerPortal from "./pages/WorkerPortal";
import ProviderPortal from "./pages/ProviderPortal";
import NotFound from "./pages/NotFound";
import WorkerProfileSetup from "./pages/WorkerProfileSetup";
import ProviderProfileSetup from "./pages/ProviderProfileSetup";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import AdminSettings from "./pages/AdminSettings";
import JobDetails from "./pages/JobDetails";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <NotificationProvider>
          <LanguageProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Header />
              <GlobalNotificationListener />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/worker" element={<WorkerPortal />} />
                <Route path="/provider" element={<ProviderPortal />} />
                <Route path="/worker-profile-setup" element={<WorkerProfileSetup />} />
                <Route path="/provider-profile-setup" element={<ProviderProfileSetup />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/job/:id" element={<JobDetails />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </LanguageProvider>
        </NotificationProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
