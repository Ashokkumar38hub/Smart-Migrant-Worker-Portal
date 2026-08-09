import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Building2,
  Briefcase,
  ShieldX,
  Trash2,
  Loader2,
  Eye,
  MapPin,
  Calendar,
  Award,
  GraduationCap,
  Mail,
  Phone,
  Building,
  Flag,
  AlertTriangle,
  UserCheck,
  UserX,
  FileX,
  ShieldAlert,
  ChevronLeft,
  CheckCircle2,
  PlayCircle,
  Star,
  CheckCircle,
  Clock,
  MessageSquare,
  XCircle
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface UserRow {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  company_name?: string;
  // Worker fields
  mobile_number?: string;
  skills?: string[];
  qualification?: string;
  experience_years?: number;
  preferred_job_location?: string;
  willingness_to_migrate?: boolean;
  // Provider fields
  contact_person?: string;
  industry_type?: string;
  location?: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  company_details?: string;
  contact_email?: string;
}

interface JobRow {
  id: string;
  title: string;
  location: string;
  salary_min: number;
  salary_max: number;
  status: string;
  description?: string;
  qualification?: string;
  experience?: string;
  required_skills?: string[];
  created_at?: string;
  company?: string;
}

interface ReportRow {
  id: string;
  reporter_id: string;
  reported_entity_id: string;
  entity_type: 'worker' | 'job' | 'provider';
  reason: string;
  description: string;
  proof_url: string;
  status: string;
  created_at: string;
  job_id?: string;
  chat_evidence?: { messages: any[] };
  reporter_email?: string;
  reported_name?: string;
  job_title?: string;
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "workers");
  const navigate = useNavigate();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Selected for Details
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [selectedChatEvidence, setSelectedChatEvidence] = useState<{ messages: any[] } | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("adminAuth") === "true";
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "12345") {
      setIsAuthenticated(true);
      sessionStorage.setItem("adminAuth", "true");
      toast.success("Welcome, Admin!");
      
      // Proactively try to get a Supabase session if possible
      // (This helps with Realtime listeners if the admin also has a DB user)
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Admin Supabase Session:", session ? "Active" : "None");

      // After login, check if there was a tab param in the URL and apply it
      const tabAfterLogin = searchParams.get("tab");
      if (tabAfterLogin) {
        setActiveTab(tabAfterLogin);
      }
    } else {
      toast.error("Wrong credentials");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("adminAuth");
    toast.success("Logged out successfully");
  };

  const fetchData = async () => {
    setLoading(true);
    console.log("AdminDashboard: Starting data fetch...");
    try {
      // Fetch all core data
      const [
        { data: roleData, error: roleError },
        { data: profileData, error: profileError },
        { data: providerData, error: providerError },
        { data: jobData, error: jobError },
        { data: reportData, error: reportError }
      ] = await Promise.all([
        supabase.from("user_roles").select("*"),
        supabase.from("profiles").select("*"),
        supabase.from("provider_profiles").select("*"),
        supabase.from("jobs").select("*"),
        supabase.from("reports").select("*").order("created_at", { ascending: false })
      ]);

      if (reportError) {
        console.warn("Reports table might not exist yet:", reportError.message);
      }

      const enrichedReports: ReportRow[] = (reportData || []).map(r => {
        const reporter = (profileData || []).find(p => p.id === r.reporter_id);
        let reportedName = "Unknown";
        if (r.entity_type === 'job') {
          reportedName = (jobData || []).find(j => j.id === r.reported_entity_id)?.title || "Deleted Job";
        } else {
          reportedName = (profileData || []).find(p => p.id === r.reported_entity_id)?.full_name || "Deleted User";
        }

        return {
          ...r,
          reporter_email: reporter?.email,
          reported_name: reportedName,
          job_title: (jobData || []).find(j => j.id === (r.job_id || r.reported_entity_id))?.title
        };
      });

      setReports(enrichedReports);

      console.log("AdminDashboard Data Summary:", {
        roles: roleData?.length || 0,
        profiles: profileData?.length || 0,
        providers: providerData?.length || 0,
        jobs: jobData?.length || 0
      });

      if (roleError) console.error("Role fetch error:", roleError);
      if (profileError) console.error("Profile fetch error:", profileError);
      if (providerError) console.error("Provider fetch error:", providerError);
      if (jobError) console.error("Job fetch error:", jobError);

      // Merge based on PROFILES, not just roles
      const merged: UserRow[] = (profileData || []).map((p) => {
        const roleEntry = (roleData || []).find((r) => r.user_id === p.id);
        const provider = (providerData || []).find((prov) => prov.id === p.id);

        let role = roleEntry?.role;
        if (!role) {
          role = provider ? "provider" : "worker";
        }

        return {
          id: p.id,
          email: p.email || "—",
          role: role,
          full_name: p.full_name,
          mobile_number: p.mobile_number,
          skills: p.skills,
          qualification: p.qualification,
          experience_years: p.experience_years,
          preferred_job_location: p.preferred_job_location,
          willingness_to_migrate: p.willingness_to_migrate,
          // Provider specific fields
          company_name: provider?.company_name,
          contact_person: provider?.contact_person,
          industry_type: provider?.industry_type,
          location: provider?.location,
          company_address: provider?.company_address,
          company_city: provider?.company_city,
          company_state: provider?.company_state,
          company_details: provider?.company_details,
          contact_email: provider?.contact_email,
        };
      });

      console.log("AdminDashboard: Merged user count:", merged.length);
      setUsers(merged);
      setJobs(jobData || []);
    } catch (err) {
      console.error("AdminDashboard: Critical fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const deleteUser = async (userId: string) => {
    const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId });
    if (error) { toast.error(error.message); return; }
    toast.success("User permanently deleted.");
    fetchData();
  };

  const deleteJob = async (jobId: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) { toast.error(error.message); return; }
    toast.success("Job removed.");
    fetchData();
  };

  const openUserDetail = (user: UserRow) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const openJobDetail = (job: JobRow) => {
    setSelectedJob(job);
    setIsJobModalOpen(true);
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    setIsActionLoading(reportId);
    const { error } = await supabase.from("reports").update({ status: newStatus }).eq("id", reportId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Report status updated to ${newStatus}`);
      fetchData();
    }
    setIsActionLoading(null);
  };

  const deleteReport = async (reportId: string) => {
    // Optimistic UI update: Remove from local state immediately
    setReports((prev) => prev.filter((r) => r.id !== reportId));

    const { error } = await supabase.from("reports").delete().eq("id", reportId);
    if (error) {
      toast.error(error.message);
      // Re-fetch to sync state if there was an error
      fetchData();
    } else {
      toast.success("Report dismissed.");
    }
  };

  const handleModerationAction = async (report: ReportRow, action: string) => {
    setIsActionLoading(report.id);
    try {
      let notifiedProviderId: string | null = null;
      let jobTitle: string = "your job listing";

      if (report.entity_type === 'worker') {
        if (action === 'warn') {
          await supabase.from("notifications").insert({
            user_id: report.reported_entity_id,
            title: "⚠️ Warning: Account Report",
            message: `Your account has been reported for: "${report.reason}". Please follow community guidelines. Further reports may lead to suspension.`,
            type: "system"
          });
          toast.success("Warning sent to user.");
        } else if (action === 'suspend') {
          await supabase.from("profiles").update({ is_suspended: true }).eq("id", report.reported_entity_id);
          await supabase.from("notifications").insert({
            user_id: report.reported_entity_id,
            title: "🚫 Account Suspended",
            message: `Your account has been suspended due to community guidelines violations: "${report.reason}". Please contact support.`,
            type: "system"
          });
          toast.success("Worker suspended temporarily.");
        } else if (action === 'ban') {
          await supabase.from("profiles").update({ is_banned: true }).eq("id", report.reported_entity_id);
          await supabase.from("notifications").insert({
            user_id: report.reported_entity_id,
            title: "❌ Account Banned",
            message: `Your account has been permanently banned due to severe or repeated violations.`,
            type: "system"
          });
          toast.success("Worker permanently banned.");
        }
      } else {
        const { data: jobData } = await supabase.from("jobs").select("provider_id, title").eq("id", report.reported_entity_id).single();
        if (jobData) {
          notifiedProviderId = jobData.provider_id;
          jobTitle = jobData.title;
        }

        if (action === 'pause') {
          await supabase.from("jobs").update({ status: 'paused' }).eq("id", report.reported_entity_id);
          if (notifiedProviderId) {
            await supabase.from("notifications").insert({
              user_id: notifiedProviderId,
              title: "⏸️ Job Listing Paused",
              message: `Your job "${jobTitle}" has been paused by admin for review. Reason: ${report.reason}.`,
              type: "system"
            });
          }
          toast.success("Job listing paused.");
        } else if (action === 'remove') {
          await supabase.from("jobs").update({ status: 'closed' }).eq("id", report.reported_entity_id);
          if (notifiedProviderId) {
            await supabase.from("notifications").insert({
              user_id: notifiedProviderId,
              title: "🚩 Job Listing Removed",
              message: `Your job "${jobTitle}" has been removed by admin. Reason: ${report.reason}.`,
              type: "system"
            });
          }
          toast.success("Job listing closed/removed.");
        } else if (action === 'delete') {
          await supabase.from("jobs").delete().eq("id", report.reported_entity_id);
          toast.success("Job completely deleted.");
          if (notifiedProviderId) {
            await supabase.from("notifications").insert({
              user_id: notifiedProviderId,
              title: "⚠️ Warning: Listing Deleted",
              message: `Your job "${jobTitle}" was deleted by admin. Warning: if you continue this behavior, you will be banned from the platform.`,
              type: "system"
            });
          }
        }
      }
      await supabase.from("reports").update({ status: 'action_taken' }).eq("id", report.id);

      // Notify the reporter that action was taken
      await supabase.from("notifications").insert({
        user_id: report.reporter_id,
        title: "Report Resolved ✅",
        message: "Thank you for reporting. Your report has been reviewed and resolved. Thank you for helping keep our community safe!",
        type: "system"
      });

      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsActionLoading(null);
    }
  };

  const getReportCount = (entityId: string) => {
    return reports.filter(r => r.reported_entity_id === entityId).length;
  };

  const workers = users.filter((u) => u.role === "worker");
  const providers = users.filter((u) => u.role === "provider");

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="border-border shadow-xl">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-center mb-4">
                <ShieldX className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-center">Admin Access</CardTitle>
              <CardDescription className="text-center">
                Please enter your credentials to access the dashboard.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter admin username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full text-lg font-bold">
                  Login
                </Button>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] py-6 px-4">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-3">
              <ShieldX className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            </div>
          </div>
          <p className="text-muted-foreground">Manage workers, providers, jobs, and applications.</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: Users, label: "Workers", value: workers.length },
            { icon: Building2, label: "Providers", value: providers.length },
            { icon: Briefcase, label: "Jobs", value: jobs.length },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4 text-center">
              <s.icon className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <Tabs 
          value={activeTab} 
          onValueChange={(val) => {
            setActiveTab(val);
            setSearchParams({ tab: val });
          }}
        >
          <TabsList className="bg-muted mb-6">
            <TabsTrigger value="workers" className="touch-target gap-2">
              <Users className="h-4 w-4" /> Workers
            </TabsTrigger>
            <TabsTrigger value="providers" className="touch-target gap-2">
              <Building2 className="h-4 w-4" /> Providers
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2 px-6">
              <Briefcase className="h-4 w-4" /> Jobs
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 px-6 relative">
              <Flag className="h-4 w-4" /> Reports
              {reports.filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse">
                  {reports.filter(r => r.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Workers Content */}
          <TabsContent value="workers">
            <div className="grid gap-3">
              {workers.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No workers found.</p>
              )}
              {workers.map((w) => (
                <div key={w.id} className="rounded-lg border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-lg text-foreground">{w.full_name || "—"}</p>
                      {w.mobile_number && <Badge variant="outline" className="text-[10px]">{w.mobile_number}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{w.email}</p>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                        {w.qualification || "No Education"}
                      </Badge>
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                        {w.experience_years != null ? `${w.experience_years}y Exp` : "No Exp"}
                      </Badge>
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                        {w.preferred_job_location || "Any Location"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 self-start sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => openUserDetail(w)}
                    >
                      <Eye className="h-4 w-4" />
                      Details
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="h-8 w-8 p-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Worker?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {w.full_name || w.email}'s account and all their data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteUser(w.id)} className="bg-destructive hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Providers Content */}
          <TabsContent value="providers">
            <div className="grid gap-3">
              {providers.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No providers found.</p>
              )}
              {providers.map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-lg text-foreground">{p.company_name || "—"}</p>
                      {p.industry_type && <Badge variant="secondary" className="text-[10px]">{p.industry_type}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{p.email}</p>

                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {p.contact_person || "No Contact"}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {p.location || "No Location"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 self-start sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => openUserDetail(p)}
                    >
                      <Eye className="h-4 w-4" />
                      Details
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="h-8 w-8 p-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Provider?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {p.company_name || p.email}'s account and all their data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteUser(p.id)} className="bg-destructive hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Jobs Content */}
          <TabsContent value="jobs">
            <div className="grid gap-3">
              {jobs.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No jobs found.</p>
              )}
              {jobs.map((job) => (
                <div key={job.id} className="rounded-lg border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-lg">{job.title}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">₹{job.salary_min?.toLocaleString()}–₹{job.salary_max?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-none capitalize">{job.status}</Badge>
                      {getReportCount(job.id) >= 3 && (
                        <Badge variant="destructive" className="animate-pulse bg-red-500 text-white border-none text-[10px]">
                          {getReportCount(job.id) >= 5 ? "CRITICAL: 5+ Reports" : "Flagged Listing"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 self-start sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => openJobDetail(job)}
                    >
                      <Eye className="h-4 w-4" />
                      Details
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="h-8">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Job?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove "{job.title}" from the platform.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteJob(job.id)} className="bg-destructive hover:bg-destructive/90">
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="grid gap-3">
              {reports.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No reports filed yet.</p>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className={`rounded-lg border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow ${report.status === 'pending' ? 'border-red-500/20 bg-red-500/5' : 'border-border'}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-lg text-foreground truncate max-w-[200px] sm:max-w-[400px]">
                          {report.reported_name || "Unknown"}
                        </p>
                        <Badge
                          variant="secondary"
                          className={`capitalize text-[10px] ${report.entity_type === 'job'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-blue-500/10 text-blue-600'
                            }`}
                        >
                          {report.entity_type}
                        </Badge>
                        <Badge
                          className={`uppercase text-[10px] font-bold ${report.status === 'pending' ? 'bg-red-500 text-white' :
                            report.status === 'under_review' ? 'bg-amber-500 text-white' :
                              'bg-green-500 text-white'
                            }`}
                        >
                          {report.status?.replace('_', ' ')}
                        </Badge>
                      </div>

                      <p className="text-sm font-bold text-red-500 flex items-center gap-1.5 mb-2">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {report.reason}
                        {getReportCount(report.reported_entity_id) > 1 && (
                          <span className="text-xs ml-2 text-red-600/80">({getReportCount(report.reported_entity_id)} reports)</span>
                        )}
                      </p>

                      {report.job_title && (
                        <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-amber-600 bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10 w-fit">
                          <Briefcase className="h-3 w-3" />
                          Job: {report.job_title}
                        </div>
                      )}

                      <div className="bg-muted/30 p-2 rounded-md text-xs italic text-muted-foreground line-clamp-2 w-full sm:max-w-xl mb-3 border border-border/50">
                        "{report.description || "No description provided."}"
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {report.reporter_email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {new Date(report.created_at).toLocaleDateString()}
                        </div>
                        {report.proof_url && (
                          <div
                            className="flex items-center gap-1 text-primary cursor-pointer hover:underline font-medium"
                            onClick={(e) => { e.stopPropagation(); window.open(report.proof_url, '_blank'); }}
                          >
                            <Eye className="h-3 w-3" /> View Proof
                          </div>
                        )}
                        {report.chat_evidence && report.chat_evidence.messages && report.chat_evidence.messages.length > 0 && (
                          <div
                            className="flex items-center gap-1 text-primary cursor-pointer hover:underline font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedChatEvidence(report.chat_evidence!);
                              setIsChatModalOpen(true);
                            }}
                          >
                            <MessageSquare className="h-3 w-3" /> View Chat Log
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 self-start sm:self-center flex-wrap justify-end mt-3 sm:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-[10px] font-bold"
                        onClick={() => {
                          if (report.entity_type === 'job') {
                            const job = jobs.find(j => j.id === report.reported_entity_id);
                            if (job) openJobDetail(job);
                            else toast.error("Job details not found. It may have been deleted.");
                          } else {
                            const user = users.find(u => u.id === report.reported_entity_id);
                            if (user) openUserDetail(user);
                            else toast.error("User details not found. They may have been deleted.");
                          }
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Details
                      </Button>

                      {report.status === 'pending' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 gap-1 text-[10px] font-bold"
                          onClick={() => updateReportStatus(report.id, 'under_review')}
                          disabled={isActionLoading === report.id}
                        >
                          Under Review
                        </Button>
                      )}

                      {report.entity_type === 'job' && report.status !== 'action_taken' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-[10px] font-bold border-amber-200 text-amber-600 hover:bg-amber-50"
                          onClick={() => handleModerationAction(report, 'pause')}
                          disabled={isActionLoading === report.id}
                        >
                          Pause Job
                        </Button>
                      )}

                      {(report.entity_type === 'worker' || report.entity_type === 'provider') && report.status !== 'action_taken' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-[10px] font-bold border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleModerationAction(report, 'warn')}
                            disabled={isActionLoading === report.id}
                          >
                            Warn
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-[10px] font-bold border-amber-200 text-amber-600 hover:bg-amber-50"
                            onClick={() => handleModerationAction(report, 'suspend')}
                            disabled={isActionLoading === report.id}
                          >
                            Suspend
                          </Button>
                        </div>
                      )}

                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 gap-1 text-[10px] font-bold"
                        onClick={() => handleModerationAction(report, report.entity_type === 'job' ? 'remove' : 'ban')}
                        disabled={isActionLoading === report.id}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        {report.entity_type === 'job' ? 'Close Job' : 'Ban User'}
                      </Button>

                      {report.entity_type === 'job' && report.status !== 'action_taken' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 gap-1 text-[10px] font-bold bg-red-700 hover:bg-red-800"
                          onClick={() => handleModerationAction(report, 'delete')}
                          disabled={isActionLoading === report.id}
                        >
                          Delete
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                            disabled={isActionLoading === report.id}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Dismiss
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Dismiss Report?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this report record from your dashboard. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteReport(report.id)} className="bg-primary hover:bg-primary/90">
                              Dismiss Report
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={isChatModalOpen} onOpenChange={setIsChatModalOpen}>
          <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden">
            <DialogHeader className="p-4 border-b border-border">
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Chat Evidence Log
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[400px] p-4 bg-muted/20">
              <div className="space-y-4">
                {selectedChatEvidence?.messages.map((msg, idx) => (
                  <div key={idx} className="flex flex-col gap-1 border-b border-border/50 pb-2 mb-2 last:border-0">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-bold text-primary">
                        {msg.sender_id === reports.find(r => r.reported_entity_id === msg.sender_id)?.reported_entity_id ? "Reported User" : "Reporter"}
                      </span>
                      <span className="text-[8px] text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-background p-2 rounded text-xs border border-border/30">
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-border flex justify-end">
              <Button onClick={() => setIsChatModalOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Detail Modal */}
        <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
          <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden">
            {selectedUser && (
              <>
                <div className={`h-24 ${selectedUser.role === 'provider' ? 'bg-primary/10' : 'bg-secondary/10'}`} />
                <div className="px-6 pb-6 -mt-12">
                  <DialogHeader className="mb-6">
                    <div className="flex items-end gap-4 mb-2">
                      <div className="w-20 h-20 rounded-xl bg-card border-4 border-card shadow-lg flex items-center justify-center">
                        {selectedUser.role === 'provider' ? <Building2 className="h-10 w-10 text-primary" /> : <Users className="h-10 w-10 text-secondary" />}
                      </div>
                      <div className="pb-1">
                        <DialogTitle className="text-2xl font-bold">
                          {selectedUser.role === 'provider' ? selectedUser.company_name : selectedUser.full_name || "No Name"}
                        </DialogTitle>
                        <Badge variant="outline" className="capitalize mt-1">{selectedUser.role}</Badge>
                      </div>
                    </div>
                    <DialogDescription className="text-muted-foreground">
                      Viewing comprehensive details for this account.
                    </DialogDescription>
                  </DialogHeader>

                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                      {/* Section 1: Contact */}
                      <section>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                          <Mail className="h-3 w-3" /> Contact Information
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Email Address</p>
                            <p className="text-sm font-medium">{selectedUser.email}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Mobile Number</p>
                            <p className="text-sm font-medium">{selectedUser.mobile_number || "Not provided"}</p>
                          </div>
                          {selectedUser.role === 'provider' && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">Contact Person</p>
                              <p className="text-sm font-medium">{selectedUser.contact_person || "Not provided"}</p>
                            </div>
                          )}
                        </div>
                      </section>

                      {selectedUser.role === 'worker' ? (
                        <>
                          <section>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                              <GraduationCap className="h-3 w-3" /> Professional Profile
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Qualification</p>
                                <p className="text-sm font-medium">{selectedUser.qualification || "Not set"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Experience</p>
                                <p className="text-sm font-medium">{selectedUser.experience_years != null ? `${selectedUser.experience_years} Years` : "Not set"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Preferred Location</p>
                                <p className="text-sm font-medium">{selectedUser.preferred_job_location || "Not set"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Willing to Migrate</p>
                                <p className={`text-sm font-bold ${selectedUser.willingness_to_migrate ? "text-green-500" : "text-amber-500"}`}>
                                  {selectedUser.willingness_to_migrate ? "Yes" : "No"}
                                </p>
                              </div>
                            </div>
                          </section>

                          <section>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                              <Award className="h-3 w-3" /> Specialized Skills
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedUser.skills && selectedUser.skills.length > 0 ? (
                                selectedUser.skills.map(s => (
                                  <Badge key={s} variant="secondary" className="px-3 py-1 bg-secondary/10 text-secondary border-none">
                                    {s}
                                  </Badge>
                                ))
                              ) : <p className="text-sm text-muted-foreground italic">No skills listed.</p>}
                            </div>
                          </section>
                        </>
                      ) : (
                        <>
                          <section>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                              <Building className="h-3 w-3" /> Company Details
                            </h4>
                            <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Industry Type</p>
                                  <p className="text-sm font-medium">{selectedUser.industry_type || "Not set"}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Operating Location</p>
                                  <p className="text-sm font-medium">{selectedUser.location || "Not set"}</p>
                                </div>
                              </div>
                              <Separator className="bg-border/50" />
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Full Office Address</p>
                                <p className="text-sm leading-relaxed">
                                  {selectedUser.company_address || "No address provided"}
                                  {(selectedUser.company_city || selectedUser.company_state) && (
                                    <span className="block font-bold mt-1">
                                      {selectedUser.company_city}, {selectedUser.company_state}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </section>

                          <section>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                              <Briefcase className="h-3 w-3" /> About the Company
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
                              {selectedUser.company_details || "No detailed description provided."}
                            </p>
                          </section>
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Job Detail Modal */}
        <Dialog open={isJobModalOpen} onOpenChange={setIsJobModalOpen}>
          <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden">
            {selectedJob && (
              <>
                <div className="h-24 bg-primary/10" />
                <div className="px-6 pb-6 -mt-12">
                  <DialogHeader className="mb-6">
                    <div className="flex items-end gap-4 mb-2">
                      <div className="w-20 h-20 rounded-xl bg-card border-4 border-card shadow-lg flex items-center justify-center">
                        <Briefcase className="h-10 w-10 text-primary" />
                      </div>
                      <div className="pb-1">
                        <DialogTitle className="text-2xl font-bold">{selectedJob.title}</DialogTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none capitalize">{selectedJob.status}</Badge>
                          <span className="text-sm text-muted-foreground flex items-center gap-1 font-medium">
                            <MapPin className="h-3 w-3" /> {selectedJob.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  </DialogHeader>

                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                      <section>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 border-b border-border pb-2">Entry Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Salary Range</p>
                            <p className="text-sm font-black text-primary">₹{selectedJob.salary_min?.toLocaleString()} – ₹{selectedJob.salary_max?.toLocaleString()}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Posted Date</p>
                            <p className="text-sm font-medium flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleDateString() : "Unknown"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Qualification Need</p>
                            <p className="text-sm font-medium flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {selectedJob.qualification || "Any"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Experience Need</p>
                            <p className="text-sm font-medium flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              {selectedJob.experience || "Freshers Welcome"}
                            </p>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 border-b border-border pb-2">Full Job Description</h4>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line italic">
                            {selectedJob.description || "No detailed description provided."}
                          </p>
                        </div>
                      </section>

                      <section>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 border-b border-border pb-2">Keywords / Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.required_skills && selectedJob.required_skills.length > 0 ? (
                            selectedJob.required_skills.map(s => (
                              <Badge key={s} variant="outline" className="px-3 py-1 font-bold">
                                {s}
                              </Badge>
                            ))
                          ) : <p className="text-sm text-muted-foreground italic">No specific skills listed.</p>}
                        </div>
                      </section>
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
};

export default AdminDashboard;
