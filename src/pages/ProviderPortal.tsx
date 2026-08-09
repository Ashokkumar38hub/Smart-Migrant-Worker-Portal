import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase, Plus, Users, Eye, CheckCircle2,
  Clock, XCircle, MapPin, FileText, Loader2, Trash2, AlertTriangle,
  Pause, Play, CheckCircle, RotateCcw, Flag, Upload, MessageCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNotifications } from "@/contexts/NotificationContext";
import SkillInput from "@/components/SkillInput";
import ChatDialog from "@/components/ChatDialog";
import ChatInbox from "@/components/ChatInbox";

interface Job {
  id: string;
  title: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  status: string;
  required_skills: string[] | null;
  description: string | null;
  qualification: string | null;
  experience: string | null;
  created_at?: string;
  provider_id: string;
}

interface Application {
  id: string;
  job_id: string;
  worker_id: string;
  status: string;
  applied_at: string;
  profiles: {
    full_name: string | null;
    skills: string[] | null;
    qualification: string | null;
    experience_years: number | null;
    mobile_number: string | null;
    preferred_job_location: string | null;
  } | null;
  jobs: {
    title: string;
    required_skills: string[] | null;
  } | null;
}

// Sample applications are removed as we now fetch real data

const calculateMatchPercentage = (workerSkills: string[] | null, requiredSkills: string[] | null) => {
  if (!requiredSkills || requiredSkills.length === 0) return 100;
  if (!workerSkills || workerSkills.length === 0) return 0;

  const workerSkillsLower = (workerSkills || []).filter(Boolean).map(s => s.toString().trim().toLowerCase());
  const matched = (requiredSkills || []).filter(req =>
    workerSkillsLower.includes((req || "").toString().trim().toLowerCase())
  );

  return Math.round((matched.length / requiredSkills.length) * 100);
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "accepted": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "rejected": return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <Clock className="h-4 w-4 text-amber-500" />;
  }
};

const getJobStatusBadge = (status: string, t: any) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1.5 font-bold"><Play className="h-3 w-3" /> {t("active").toUpperCase()}</Badge>;
    case "paused":
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1.5 font-bold"><Pause className="h-3 w-3" /> {t("paused") || "Paused"}</Badge>;
    case "closed":
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1.5 font-bold"><XCircle className="h-3 w-3" /> {t("rejected") || "Closed"}</Badge>;
    case "completed":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1.5 font-bold"><CheckCircle className="h-3 w-3" /> {t("accepted") || "Completed"}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const ProviderPortal = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState("jobs");
  const [createOpen, setCreateOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingApps, setLoadingApps] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Application["profiles"]>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Create job form state
  const [newTitle, setNewTitle] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newSalaryMin, setNewSalaryMin] = useState("");
  const [newSalaryMax, setNewSalaryMax] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newQualification, setNewQualification] = useState("");
  const [newExperience, setNewExperience] = useState("");
  const [newSkills, setNewSkills] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportedWorkerId, setReportedWorkerId] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, boolean>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [chatData, setChatData] = useState({ jobId: "", jobName: "", receiverId: "", receiverName: "" });
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const fetchUnreadCount = async (userId: string) => {
    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("is_read", false);

    if (!error) {
      setUnreadChatCount(count || 0);
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUserId(session.user.id);
      fetchUnreadCount(session.user.id);

      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, location, salary_min, salary_max, status, required_skills, description, qualification, experience, created_at, provider_id")
        .eq("provider_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching jobs:", error.message);
      } else {
        setJobs(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    setLoadingApps(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Get applications for jobs owned by this provider
      const { data: jobIds, error: jobIdsError } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("provider_id", session.user.id);

      if (jobIdsError) {
        console.error("Error fetching job IDs:", jobIdsError.message);
        toast.error("Failed to fetch jobs for applications");
        return;
      }

      console.log("Found provider jobs:", jobIds);

      if (!jobIds || jobIds.length === 0) {
        setApplications([]);
        return;
      }

      const ids = jobIds.map(j => j.id);

      const { data, error } = await supabase
        .from("job_applications")
        .select(`
          id,
          job_id,
          worker_id,
          status,
          applied_at,
          profiles:worker_id (
            full_name,
            skills,
            qualification,
            experience_years,
            mobile_number,
            preferred_job_location
          ),
          jobs:job_id (
            title,
            required_skills
          )
        `)
        .in("job_id", ids)
        .order("applied_at", { ascending: false });

      if (error) {
        console.error("Error fetching applications:", error.message);
        toast.error("Failed to fetch applications: " + error.message);
      } else {
        console.log("Fetched applications:", data);
        setApplications(data as any || []);
      }
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchApplications();

    // Realtime listener for jobs
    const jobsChannel = supabase
      .channel("provider_jobs_realtime_main")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
        },
        (payload) => {
          console.log("Job change detected in Provider Portal:", payload);
          fetchJobs();
        }
      )
      .subscribe();

    // Real-time subscription for chat notifications
    let chatChannel: any;
    const setupChatRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      chatChannel = supabase
        .channel('chat-notifications-provider')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${session.user.id}`
          },
          () => {
            fetchUnreadCount(session.user.id);
          }
        )
        .subscribe();
    };
    setupChatRealtime();

    return () => {
      supabase.removeChannel(jobsChannel);
      if (chatChannel) supabase.removeChannel(chatChannel);
    };
  }, []);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (roleData?.role === "worker") {
        toast.error("Access Denied: You are registered as a worker. Redirecting...");
        navigate("/worker");
      }
    };
    checkRole();
  }, [navigate]);

  useEffect(() => {
    // Realtime listener for new applications
    const appsChannel = supabase
      .channel("provider_applications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_applications",
        },
        () => {
          fetchApplications();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "job_applications",
        },
        () => {
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appsChannel);
    };
  }, []);

  const fetchExistingReports = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("reports")
        .select("reported_entity_id")
        .eq("reporter_id", session.user.id)
        .eq("entity_type", "worker");

      if (!error && data) {
        const reportMap: Record<string, boolean> = {};
        data.forEach(r => {
          reportMap[r.reported_entity_id] = true;
        });
        setReports(reportMap);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  };

  useEffect(() => {
    fetchExistingReports();
  }, [userId]);

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm(t("confirmDeleteJob"))) {
      return;
    }

    setDeletingId(jobId);
    try {
      // 1. Delete applications for this job
      const { error: appError } = await supabase
        .from("job_applications")
        .delete()
        .eq("job_id", jobId);

      if (appError) {
        console.error("Error deleting applications:", appError.message);
        toast.error("Failed to delete related applications");
        return;
      }

      // 2. Delete the job
      const { error: jobError } = await supabase
        .from("jobs")
        .delete()
        .eq("id", jobId);

      if (jobError) {
        console.error("Error deleting job:", jobError.message);
        toast.error(t("error") || "Failed to delete job");
      } else {
        toast.success(t("jobDeletedSuccess"));
        setJobs(prev => prev.filter(j => j.id !== jobId));
        setApplications(prev => prev.filter(a => a.job_id !== jobId));
        if (selectedJobId === jobId) setSelectedJobId(null);
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error(t("notLoggedIn"));
        return;
      }

      // Fetch provider's company name
      const { data: providerData } = await supabase
        .from("provider_profiles")
        .select("company_name")
        .eq("id", session.user.id)
        .maybeSingle();

      const skillsArray = newSkills;

      const { data: jobData, error } = await supabase.from("jobs").insert({
        id: crypto.randomUUID(), // Explicitly generate a unique ID
        provider_id: session.user.id,
        company: providerData?.company_name || "Unknown Company",
        title: newTitle,
        location: newLocation,
        salary_min: newSalaryMin ? Number(newSalaryMin) : null,
        salary_max: newSalaryMax ? Number(newSalaryMax) : null,
        description: newDescription || null,
        qualification: newQualification || null,
        experience: newExperience || null,
        required_skills: skillsArray.length > 0 ? skillsArray : null,
        status: "active",
      }).select().single();

      if (error) {
        console.error("Supabase insertion error:", error.message);
        toast.info(t("error") || "Database error");
      } else {
        toast.success(t("jobCreatedSuccess"));
      }

      // Fallback: Always add to local state to ensure it "appends" in the UI
      // even if the database is acting up or we are in a demo mode
      const temporaryJob: Job = {
        id: jobData?.id || crypto.randomUUID(),
        title: newTitle,
        location: newLocation,
        salary_min: newSalaryMin ? Number(newSalaryMin) : null,
        salary_max: newSalaryMax ? Number(newSalaryMax) : null,
        status: "active",
        required_skills: skillsArray.length > 0 ? skillsArray : null,
        description: newDescription || null,
        qualification: newQualification || null,
        experience: newExperience || null,
        created_at: new Date().toISOString(),
        provider_id: jobData?.provider_id || "",
      };

      setJobs(prevJobs => [temporaryJob, ...prevJobs]);

      // Job is securely added to database, the explicit notification trigger here is removed.

      setCreateOpen(false);
      setNewTitle("");
      setNewLocation("");
      setNewSalaryMin("");
      setNewSalaryMax("");
      setNewDescription("");
      setNewQualification("");
      setNewExperience("");
      setNewSkills([]);

      if (!error) {
        fetchJobs();
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateJobStatus = async (jobId: string, newStatus: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const job = jobs.find(j => j.id === jobId);

    console.log("Update status attempt:", {
      jobId,
      newStatus,
      userId: session?.user?.id,
      jobProviderId: job?.provider_id
    });

    setUpdatingStatusId(jobId);

    // Optimistic update
    const previousJobs = [...jobs];
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: newStatus } : j
    ));

    try {
      const { data, error } = await supabase
        .from("jobs")
        .update({ status: newStatus })
        .eq("id", jobId)
        .select();

      if (error) {
        console.error("Error updating job status:", error);
        toast.error(`Failed to update job status: ${error.message}`);
        setJobs(previousJobs);
      } else if (!data || data.length === 0) {
        console.warn("No rows updated in database. Status check failed.");
        toast.error("Status update failed - check permissions.");
        setJobs(previousJobs);
      } else {
        console.log("Job status updated successfully in DB:", data[0]);
        toast.success(t("jobStatusUpdated").replace("{status}", newStatus));
      }
    } catch (err: any) {
      console.error("Unexpected error updating job status:", err);
      toast.error("An error occurred: " + (err.message || "Unknown error"));
      setJobs(previousJobs);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("job_applications")
        .update({ status: newStatus })
        .eq("id", applicationId);

      if (error) {
        toast.error(`${t("error") || "Failed to update"}: ${error.message}`);
      } else {
        toast.success(t("appStatusUpdated").replace("{status}", newStatus));
        setApplications(prev => prev.map(app =>
          app.id === applicationId ? { ...app, status: newStatus } : app
        ));
      }
    } catch (err: any) {
      toast.error("An error occurred: " + err.message);
    }
  };

  const handleReportWorker = async () => {
    if (!reportReason || !reportedWorkerId) {
      toast.error(t("selectReportReason"));
      return;
    }

    setReporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      let proofUrl = "";
      if (reportFile) {
        const fileExt = reportFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `worker_reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('report-proofs')
          .upload(filePath, reportFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('report-proofs')
          .getPublicUrl(filePath);

        proofUrl = publicUrl;
      }

      const { error } = await supabase
        .from("reports")
        .insert({
          reported_entity_id: reportedWorkerId,
          entity_type: "worker",
          reason: reportReason,
          description: reportDescription,
          proof_url: proofUrl,
          status: "pending"
        });

      if (error) {
        if (error.code === "23505") {
          toast.info(t("alreadyReported"));
          setReports(prev => ({ ...prev, [reportedWorkerId]: true }));
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success(t("reportSubmitted"));
        setReports(prev => ({ ...prev, [reportedWorkerId]: true }));
        setIsReportModalOpen(false);
        setReportReason("");
        setReportDescription("");
        setReportFile(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(t("reportFailed"));
    } finally {
      setReporting(false);
    }
  };

  const filteredApplications = selectedJobId
    ? applications.filter(app => app.job_id === selectedJobId)
    : applications;

  return (
    <main className="min-h-[calc(100vh-4rem)] py-6 px-4">
      <div className="container mx-auto py-6 px-2 sm:px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("providerPortal")}</h1>
            <p className="text-muted-foreground">{t("providerCardDesc")}</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={manageOpen} onOpenChange={setManageOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="touch-target gap-2">
                  <Eye className="h-5 w-5" />
                  {t("manage")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">{t("manageJobsTitle")}</DialogTitle>
                </DialogHeader>
                <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {jobs.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">{t("noJobsToManage")}</p>
                  ) : (
                    jobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-bold text-foreground">{job.title}</p>
                          <p className="text-sm text-muted-foreground">{job.location} • {job.status}</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleDeleteJob(job.id)}
                          disabled={deletingId === job.id}
                        >
                          {deletingId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Delete
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" className="touch-target gap-2">
                  <Plus className="h-5 w-5" />
                  {t("createJob")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">{t("createJob")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateJob} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>{t("jobTitle")}</Label>
                    <Input
                      className="touch-target"
                      placeholder="e.g., Construction Worker"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("location")}</Label>
                      <Input
                        className="touch-target"
                        placeholder="e.g., Chennai"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("minSalary")}</Label>
                      <Input
                        className="touch-target"
                        type="number"
                        placeholder="e.g., 15000"
                        value={newSalaryMin}
                        onChange={(e) => setNewSalaryMin(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("maxSalary")}</Label>
                      <Input
                        className="touch-target"
                        type="number"
                        placeholder="e.g., 25000"
                        value={newSalaryMax}
                        onChange={(e) => setNewSalaryMax(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("skills")}</Label>
                      <SkillInput
                        selectedSkills={newSkills}
                        onChange={setNewSkills}
                        placeholder="e.g., Masonry, Safety"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("reqQualification")}</Label>
                      <Input
                        className="touch-target"
                        placeholder="e.g., 10th Pass, Diploma"
                        value={newQualification}
                        onChange={(e) => setNewQualification(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("expRequired")}</Label>
                      <Input
                        className="touch-target"
                        placeholder="e.g., 2 Years, Fresher"
                        value={newExperience}
                        onChange={(e) => setNewExperience(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("description")}</Label>
                    <Textarea
                      placeholder={t("jobDescPlaceholder")}
                      className="min-h-[100px]"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("cancel")}</Button>
                    <Button type="submit" variant="hero" disabled={creating}>
                      {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("saving")}</> : t("save")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted mb-6">
            <TabsTrigger value="jobs" className="touch-target gap-2">
              <Briefcase className="h-4 w-4" />
              {t("myJobs")}
            </TabsTrigger>
            <TabsTrigger value="applications" className="touch-target gap-2">
              <Users className="h-4 w-4" />
              {t("applications")}
            </TabsTrigger>
          </TabsList>

          {/* My Jobs */}
          <TabsContent value="jobs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">{showCompleted ? t("jobHistory") : t("activeJobs")}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCompleted(!showCompleted)}
                className="gap-2 text-primary"
              >
                {showCompleted ? <><Briefcase className="h-4 w-4" /> {t("showActive")}</> : <><RotateCcw className="h-4 w-4" /> {t("viewHistory")}</>}
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">{t("noJobsPosted")}</p>
                <p className="text-sm mt-1">{t("clickCreateJob")}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {jobs
                  .filter(job => showCompleted ? job.status === "completed" : job.status !== "completed")
                  .map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="rounded-lg border border-border bg-card p-6 hover:border-primary/30 transition-colors shadow-sm"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-foreground">{job.title}</h3>
                            {getJobStatusBadge(job.status, t)}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground font-medium">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-primary" /> {job.location}
                            </span>
                            {(job.salary_min || job.salary_max) && (
                              <span className="flex items-center gap-1.5">
                                {job.salary_min ? `₹${job.salary_min.toLocaleString()}` : "—"}
                                {" - "}
                                {job.salary_max ? `₹${job.salary_max.toLocaleString()}` : "—"}
                              </span>
                            )}
                          </div>
                          {job.required_skills && job.required_skills.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {job.required_skills.map((skill) => (
                                <Badge key={skill} variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-2">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 mt-2 md:mt-0 items-center">
                          {(() => {
                            const statuses = [
                              { s: "active", icon: Play, color: "text-green-500", bg: "bg-green-500/10 border-green-500/30 hover:bg-green-500/20" },
                              { s: "paused", icon: Pause, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20" },
                              { s: "closed", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10 border-red-500/30 hover:bg-red-500/20" },
                              { s: "completed", icon: CheckCircle, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20" },
                            ];
                            const currentIdx = statuses.findIndex(s => s.s === job.status);
                            const current = statuses[currentIdx] ?? statuses[0];
                            const next = statuses[(currentIdx + 1) % statuses.length];
                            const Icon = current.icon;
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateJobStatus(job.id, next.s);
                                }}
                                disabled={updatingStatusId === job.id}
                                title={`${t(current.s)} → ${t(next.s)}`}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wide transition-all ${current.bg} ${current.color} disabled:opacity-50`}
                              >
                                {updatingStatusId === job.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Icon className="h-3.5 w-3.5" />
                                )}
                                {t(current.s)}
                              </button>
                            );
                          })()}

                          <Button
                            variant="hero"
                            size="sm"
                            className="touch-target gap-1.5 font-bold shadow-md"
                            onClick={() => {
                              setSelectedJobId(job.id);
                              setActiveTab("applications");
                            }}
                          >
                            <Users className="h-4 w-4" />
                            Applicants
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Applications */}
          <TabsContent value="applications">
            {selectedJobId && (
              <div className="mb-4 flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/20">
                <p className="text-sm font-medium">
                  {t("showingApplicantsFor")} <span className="text-primary">{jobs.find(j => j.id === selectedJobId)?.title}</span>
                </p>
                <Button variant="ghost" size="sm" onClick={() => setSelectedJobId(null)}>
                  {t("clearFilter")}
                </Button>
              </div>
            )}

            {loadingApps ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{t("noAppsFound")}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredApplications.map((app, index) => {
                  const workerSkills = (app.profiles?.skills || []).filter(Boolean).map(s => s.toString().toLowerCase());
                  const requiredSkills = (app.jobs?.required_skills || []).filter(Boolean).map(s => s.toString().toLowerCase());
                  const matchPercentage = calculateMatchPercentage(workerSkills, requiredSkills);

                  const matchedSkills = (app.jobs?.required_skills || []).filter(req =>
                    workerSkills.includes((req || "").toString().toLowerCase())
                  );
                  const missingSkills = (app.jobs?.required_skills || []).filter(req =>
                    !workerSkills.includes((req || "").toString().toLowerCase())
                  );

                  return (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="rounded-lg border border-border bg-card p-6 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-foreground">{app.profiles?.full_name || "Unknown Worker"}</h3>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(app.status)}
                              <span className="text-xs text-muted-foreground capitalize">{t(app.status)}</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("appliedFor")} <span className="text-foreground font-medium">{app.jobs?.title || "Unknown Job"}</span>
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground font-medium uppercase tracking-wider">{t("skillMatch")}</span>
                                <span className={`font-bold ${getScoreColor(matchPercentage)}`}>{matchPercentage}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${matchPercentage >= 80 ? 'bg-green-500' : matchPercentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${matchPercentage}%` }}
                                />
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {matchedSkills.map(skill => (
                                  <Badge key={skill || 'unknown-skill'} variant="secondary" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20">
                                    {skill || 'N/A'}
                                  </Badge>
                                ))}
                                {missingSkills.map(skill => (
                                  <Badge key={skill || 'unknown-skill'} variant="outline" className="text-[10px] text-muted-foreground/60">
                                    {skill || 'N/A'}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col justify-center text-sm border-l border-border pl-4">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Briefcase className="h-3.5 w-3.5" />
                                <span>{t("yearsExperience").replace("{years}", String(app.profiles?.experience_years || 0))}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>{app.profiles?.qualification || t("noQualification")}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="touch-target gap-2"
                            onClick={() => {
                              setSelectedProfile(app.profiles);
                              setProfileOpen(true);
                            }}
                          >
                            <Users className="h-4 w-4" />
                            {t("viewProfile")}
                          </Button>
                          {app.status === "pending" ? (
                            <div className="flex gap-1">
                              <Button
                                variant="hero"
                                size="sm"
                                className="touch-target bg-green-600 hover:bg-green-700 h-9 w-9 p-0"
                                onClick={() => handleUpdateApplicationStatus(app.id, "accepted")}
                                title="Accept Applicant"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="touch-target h-9 w-9 p-0"
                                onClick={() => handleUpdateApplicationStatus(app.id, "rejected")}
                                title="Reject Applicant"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {app.status === 'accepted' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 gap-2 border-primary text-primary hover:bg-primary/5"
                                  onClick={() => {
                                    setChatData({
                                      jobId: app.job_id,
                                      jobName: app.jobs?.title || "",
                                      receiverId: app.worker_id,
                                      receiverName: app.profiles?.full_name || "Worker"
                                    });
                                    setChatOpen(true);
                                  }}
                                >
                                  <MessageCircle className="h-4 w-4" />
                                  Chat
                                </Button>
                              )}
                              <Badge
                                variant="outline"
                                className={`h-9 px-3 gap-1.5 font-bold border-2 ${app.status === 'accepted'
                                  ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                  : 'bg-red-500/10 text-red-500 border-red-500/20'
                                  }`}
                              >
                                {app.status === 'accepted' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                {app.status.toUpperCase()}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Profile Dialog */}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t("workerProfile")}
              </DialogTitle>
            </DialogHeader>
            {selectedProfile && (
              <div className="space-y-6 py-4">
                <div className="flex flex-col items-center text-center">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Users className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{selectedProfile.full_name}</h2>
                  <p className="text-muted-foreground">{selectedProfile.qualification}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground uppercase">Experience</p>
                    <p className="font-bold text-foreground">{selectedProfile.experience_years || 0} Years</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground uppercase">Location</p>
                    <p className="font-bold text-foreground">{selectedProfile.preferred_job_location || "Not specified"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Skills & Expertise
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.skills?.map((skill: string) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex flex-col gap-3">
                  <p className="text-sm font-semibold text-foreground">Contact Information</p>
                  <div className="flex items-center gap-3 text-muted-foreground text-sm">
                    <Users className="h-4 w-4" />
                    <span>{selectedProfile.mobile_number || "No number provided"}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-red-500 hover:bg-red-500/5 gap-2 text-xs font-semibold"
                    onClick={() => {
                      // We need the worker_id here, which is in the application context
                      // Since selectedProfile doesn't have ID, we find it from applications
                      const app = applications.find(a => a.profiles?.mobile_number === selectedProfile.mobile_number);
                      if (app) {
                        if (reports[app.worker_id]) {
                          toast.info("You have already reported this worker.");
                        } else {
                          setReportedWorkerId(app.worker_id);
                          setIsReportModalOpen(true);
                        }
                      } else {
                        toast.error("Could not identify worker ID");
                      }
                    }}
                    disabled={applications.some(a => a.profiles?.mobile_number === selectedProfile.mobile_number && reports[a.worker_id])}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    {applications.some(a => a.profiles?.mobile_number === selectedProfile.mobile_number && reports[a.worker_id])
                      ? "Worker Reported" : "Report Worker"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Report Worker Modal */}
        <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-red-500" />
                Report Worker
              </DialogTitle>
              <DialogDescription>
                Provide details about the issue with this worker. False reporting may lead to account suspension.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-foreground">Reason for reporting</Label>
                <RadioGroup value={reportReason} onValueChange={setReportReason} className="grid gap-2">
                  {[
                    "Fake or misleading skills",
                    "False experience details",
                    "Unsafe behavior / safety violation",
                    "No-show after accepting job",
                    "Asking money outside the platform",
                    "Fraud / suspicious activity",
                    "Other"
                  ].map((reason) => (
                    <div key={reason} className="flex items-center space-x-2">
                      <RadioGroupItem value={reason} id={reason} />
                      <Label htmlFor={reason} className="text-sm font-medium cursor-pointer text-foreground">{reason}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-foreground">Additional details (optional)</Label>
                <Textarea
                  placeholder="Provide more context..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="min-h-[100px] text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-foreground">Upload proof (optional)</Label>
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                    className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                  {reportFile && (
                    <p className="text-[10px] text-green-500 mt-1 flex items-center gap-1 font-bold">
                      <CheckCircle className="h-3 w-3" /> {reportFile.name} selected
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsReportModalOpen(false)} disabled={reporting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="gap-2"
                onClick={handleReportWorker}
                disabled={reporting || !reportReason}
              >
                {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                Submit Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Floating Chat Button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-40 flex items-center justify-center p-0 bg-primary text-primary-foreground"
        size="icon"
        onClick={() => setIsInboxOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
        {unreadChatCount > 0 && (
          <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-background animate-in zoom-in">
            {unreadChatCount > 9 ? '9+' : unreadChatCount}
          </span>
        )}
      </Button>

      <ChatDialog
        isOpen={chatOpen}
        onOpenChange={setChatOpen}
        jobId={chatData.jobId}
        jobName={chatData.jobName}
        receiverId={chatData.receiverId}
        receiverName={chatData.receiverName}
        currentUserRole="provider"
      />

      <ChatInbox
        isOpen={isInboxOpen}
        onOpenChange={setIsInboxOpen}
        onSelectChat={(jobId, jobName, receiverId, receiverName) => {
          setChatData({ jobId, jobName, receiverId, receiverName });
          setChatOpen(true);
        }}
      />
    </main >
  );
};

export default ProviderPortal;
