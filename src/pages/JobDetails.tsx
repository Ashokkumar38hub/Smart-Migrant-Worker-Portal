import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
    Building2, MapPin, Calendar,
    ChevronLeft, Briefcase, GraduationCap, Award,
    CheckCircle2, Loader2, ArrowRight, ExternalLink,
    BookOpen, XCircle, Pause, AlertTriangle, Flag, Upload,
    CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ALL_JOBS, RECOMMENDED_COURSES } from "@/constants/jobs";

interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    salary_min: number | null;
    salary_max: number | null;
    description: string | null;
    qualification: string | null;
    experience: string | null;
    required_skills: string[] | null;
    status: string;
    provider_id?: string | null;
    created_at: string;
}

const JobDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [job, setJob] = useState<Job | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reporting, setReporting] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportDescription, setReportDescription] = useState("");
    const [reportFile, setReportFile] = useState<File | null>(null);
    const [hasReported, setHasReported] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                console.log("Fetching job from Supabase with ID:", id);
                const { data: jobData, error: jobError } = await supabase
                    .from("jobs")
                    .select("*")
                    .eq("id", id)
                    .eq("status", "active") // Only Active jobs for discovery
                    .single();

                if (jobError) {
                    console.log("Supabase fetch failed or job not active:", jobError.message);
                }
                setJob(jobData);

                // Fetch Profile for skill matching and check application status
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const { data: profileData } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", session.user.id)
                        .maybeSingle();
                    setProfile(profileData);

                    // Check if already applied
                    const { data: applicationData } = await supabase
                        .from("job_applications")
                        .select("id")
                        .eq("job_id", id)
                        .eq("worker_id", session.user.id)
                        .maybeSingle();

                    if (applicationData) {
                        setHasApplied(true);
                    }

                    // Check if already reported
                    const { data: reportData } = await supabase
                        .from("reports")
                        .select("id")
                        .eq("reported_entity_id", id)
                        .eq("reporter_id", session.user.id)
                        .eq("entity_type", "job")
                        .maybeSingle();

                    if (reportData) {
                        setHasReported(true);
                    }
                }
            } catch (err: any) {
                console.error("Error fetching data:", err.message);
                // Don't toast error here, we handle !job in the UI
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleApply = async () => {
        setApplying(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                toast.error("Please login to apply");
                return;
            }

            if (jobStatus !== "active") {
                toast.error(`Applications are closed for this job (Status: ${jobStatus})`);
                return;
            }


            const { error } = await supabase
                .from("job_applications")
                .insert({
                    job_id: id,
                    worker_id: session.user.id,
                    status: "pending",
                });

            if (error) {
                if (error.code === "23505") { // Unique violation
                    toast.info("You have already applied for this job.");
                    setHasApplied(true);
                } else {
                    toast.error(error.message);
                }
            } else {
                toast.success("Application submitted successfully!");
                setHasApplied(true);

                // Notify Provider
                if (job?.provider_id) {
                    await supabase.from("notifications").insert({
                        user_id: job.provider_id,
                        title: "New Job Application! 📝",
                        message: `A worker has applied for your job: "${jobTitle}". Review the application in your dashboard.`,
                        type: "system",
                        link: "/provider?tab=applications"
                    });
                }
            }
        } catch (err: any) {
            toast.error("Failed to submit application");
        } finally {
            setApplying(false);
        }
    };

    const handleReport = async () => {
        if (!reportReason) {
            toast.error("Please select a reason for reporting");
            return;
        }

        setReporting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                toast.error("Please login to report");
                return;
            }

            let proofUrl = "";
            if (reportFile) {
                const fileExt = reportFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `job_reports/${fileName}`;

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
                    reported_entity_id: id,
                    entity_type: "job",
                    reason: reportReason,
                    description: reportDescription,
                    proof_url: proofUrl,
                    status: "pending"
                });

            if (error) {
                if (error.code === "23505") {
                    toast.info("You have already reported this job.");
                    setHasReported(true);
                } else {
                    toast.error(error.message);
                }
            } else {
                toast.success("Report submitted to moderation. Thank you for helping keep our community safe.");
                setHasReported(true);
                setIsReportModalOpen(false);
            }
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to submit report");
        } finally {
            setReporting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center p-4">
                <Briefcase className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h1 className="text-2xl font-bold">Job Not Found</h1>
                <p className="text-muted-foreground mt-2">Listing missing or removed.</p>
                <Button variant="hero" className="mt-6" onClick={() => navigate("/worker")}>
                    Browse All Jobs
                </Button>
            </div>
        );
    }

    // Matching Logic with robustness (trimming and case-insensitivity)
    const workerSkills = Array.isArray(profile?.skills)
        ? profile.skills.filter(Boolean).map((s: any) => s.toString().trim().toLowerCase())
        : [];

    const jobRequiredSkills = Array.isArray(job?.required_skills)
        ? job.required_skills.filter(Boolean).map((s: any) => (s || "").toString().trim())
        : [];

    // Safety check for job properties
    const jobTitle = job?.title || "Unknown Job";
    const jobCompany = job?.company || "Unknown Company";
    const jobLocation = job?.location || "Unknown Location";
    const jobStatus = job?.status || "inactive";

    const matchedSkills = jobRequiredSkills.filter((s: string) => workerSkills.includes(s.toLowerCase()));
    const missingSkills = jobRequiredSkills.filter((s: string) => !workerSkills.includes(s.toLowerCase()));

    const matchScore = jobRequiredSkills.length > 0
        ? Math.round((matchedSkills.length / jobRequiredSkills.length) * 100)
        : 100;

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-500";
        if (score >= 50) return "text-amber-500";
        return "text-red-500";
    };

    const getProgressColor = (score: number) => {
        if (score >= 80) return "bg-green-500";
        if (score >= 50) return "bg-amber-500";
        return "bg-red-500";
    };

    return (
        <main className="min-h-[calc(100vh-4rem)] py-8 px-4 bg-muted/30">
            <div className="container mx-auto max-w-5xl">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-6"
                >
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back to Jobs
                    </Button>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="border-border overflow-hidden">
                                <div className="h-28 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-border" />
                                <CardHeader className="relative -mt-14 px-8">
                                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                                        <div className="flex items-end gap-5 text-left">
                                            <div className="w-24 h-24 rounded-2xl bg-card border-4 border-card shadow-2xl flex items-center justify-center shrink-0">
                                                <Building2 className="h-12 w-12 text-primary" />
                                            </div>
                                            <div className="mb-2">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h1 className="text-3xl font-extrabold text-foreground leading-tight">
                                                        {jobTitle}
                                                    </h1>
                                                    <Badge variant="outline" className={`text-xs font-bold ${getScoreColor(matchScore)}`}>
                                                        {matchScore}% Match
                                                    </Badge>
                                                </div>
                                                <p className="text-xl font-semibold text-primary/80 mt-1">{jobCompany}</p>
                                            </div>
                                        </div>
                                        {jobStatus === "active" ? (
                                            <Badge variant="secondary" className="w-fit h-fit px-4 py-1.5 bg-green-500/10 text-green-600 border-none capitalize text-sm">
                                                <span className="flex items-center gap-2 font-bold">
                                                    <CheckCircle2 className="h-4 w-4" /> Hiring Now
                                                </span>
                                            </Badge>
                                        ) : jobStatus === "paused" ? (
                                            <Badge variant="secondary" className="w-fit h-fit px-4 py-1.5 bg-amber-500/10 text-amber-600 border-none capitalize text-sm">
                                                <span className="flex items-center gap-2 font-bold">
                                                    <Pause className="h-4 w-4" /> Applications Paused
                                                </span>
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="w-fit h-fit px-4 py-1.5 bg-red-500/10 text-red-600 border-none capitalize text-sm">
                                                <span className="flex items-center gap-2 font-bold">
                                                    <XCircle className="h-4 w-4" /> Applications Closed
                                                </span>
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="px-8 pt-8 pb-10">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pb-8 border-b border-border">
                                        <div className="space-y-1">
                                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold italic">Location</p>
                                            <div className="flex items-center gap-2 text-sm font-bold">
                                                <MapPin className="h-4 w-4 text-primary" /> {jobLocation}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold italic">Salary</p>
                                            <div className="flex items-center gap-2 text-sm font-bold">
                                                {job?.salary_min ? `₹${Number(job.salary_min).toLocaleString()}` : "—"} - {job?.salary_max ? `₹${Number(job.salary_max).toLocaleString()}` : "—"}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold italic">Experience</p>
                                            <div className="flex items-center gap-2 text-sm font-bold">
                                                <Award className="h-4 w-4 text-primary" /> {job?.experience || "Fresher"}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold italic">Posted On</p>
                                            <div className="flex items-center gap-2 text-sm font-bold">
                                                <Calendar className="h-4 w-4 text-primary" /> {job?.created_at ? new Date(job.created_at).toLocaleDateString() : "Recently"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Skill Match Analysis */}
                                    <div className="py-10 space-y-8">
                                        <section className="bg-muted/30 rounded-2xl p-6 border border-border/50">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Skill Match Analysis</h3>
                                                <span className={`text-sm font-bold ${getScoreColor(matchScore)}`}>{matchScore}%</span>
                                            </div>
                                            <Progress value={matchScore} className={`h-2.5 bg-muted mb-6 ${getProgressColor(matchScore)}`} />

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div className="space-y-3">
                                                    <p className="text-xs font-bold text-green-600 flex items-center gap-2 uppercase tracking-wide">
                                                        <CheckCircle2 className="h-4 w-4" /> Matched Skills
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {matchedSkills.length > 0 ? matchedSkills.map(skill => (
                                                            <Badge key={skill} variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 text-xs font-bold">
                                                                {skill}
                                                            </Badge>
                                                        )) : <p className="text-xs text-muted-foreground italic">No skills matched yet.</p>}
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <p className="text-xs font-bold text-red-500 flex items-center gap-2 uppercase tracking-wide">
                                                        <XCircle className="h-4 w-4" /> Missing Skills
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {missingSkills.length > 0 ? missingSkills.map(skill => (
                                                            <Badge key={skill} variant="secondary" className="bg-red-500/10 text-red-500 border-red-500/20 px-3 py-1 text-xs font-bold">
                                                                {skill}
                                                            </Badge>
                                                        )) : <p className="text-xs text-muted-foreground italic">No missing skills!</p>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Recommended Courses */}
                                            {missingSkills.length > 0 && (
                                                <div className="mt-8 pt-8 border-t border-border">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">
                                                        <BookOpen className="h-5 w-5 text-amber-500" /> Recommended Courses to reach 100% Match
                                                    </div>
                                                    <div className="grid gap-3">
                                                        {missingSkills.map(skill => {
                                                            // Fallback lookup: try to normalize the required skill if it has a typo
                                                            let course = RECOMMENDED_COURSES[skill];

                                                            if (!course) {
                                                                // Simple fuzzy match for common typos like "Mansonry" -> "Masonry"
                                                                const suggestions: Record<string, string> = {
                                                                    "Mansonry": "Masonry",
                                                                    "Masonary": "Masonry"
                                                                };
                                                                const betterKey = suggestions[skill] || Object.keys(RECOMMENDED_COURSES).find(k =>
                                                                    (k || "").toString().toLowerCase().includes((skill || "").toString().toLowerCase().substring(0, 4))
                                                                );
                                                                if (betterKey) course = RECOMMENDED_COURSES[betterKey];
                                                            }

                                                            if (!course) return null;
                                                            return (
                                                                <a
                                                                    key={skill}
                                                                    href={course.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all group"
                                                                >
                                                                    <div>
                                                                        <p className="font-bold text-sm group-hover:text-primary transition-colors">{course.name}</p>
                                                                        <p className="text-xs text-muted-foreground">{course.provider}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <Badge variant="outline" className="text-[10px] font-bold uppercase">
                                                                            {course.isFree ? "Free" : "Paid"}
                                                                        </Badge>
                                                                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                                    </div>
                                                                </a>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </section>

                                        <section>
                                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 italic">About the Job</h3>
                                            <div className="text-foreground leading-relaxed whitespace-pre-line bg-card p-6 rounded-2xl border border-border text-sm italic shadow-sm">
                                                {job?.description || "No detailed description provided."}
                                            </div>
                                        </section>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="border-border shadow-2xl sticky top-24">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl font-black">Quick Apply</CardTitle>
                                    <CardDescription className="font-medium">Direct hiring for this position</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="bg-primary/5 rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                                <GraduationCap className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Min. Qualification</p>
                                                <p className="text-sm font-black">{job?.qualification || "Not specified"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                                <Briefcase className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Job Type</p>
                                                <p className="text-sm font-black">Full-time / Local</p>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        variant={hasApplied ? "secondary" : jobStatus !== "active" ? "outline" : "hero"}
                                        className={`w-full h-14 gap-3 text-lg font-black shadow-2xl group ${hasApplied ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 shadow-none' : jobStatus !== "active" ? 'opacity-70 cursor-not-allowed' : 'shadow-primary/30'}`}
                                        onClick={handleApply}
                                        disabled={applying || hasApplied || jobStatus !== "active"}
                                    >
                                        {applying ? (
                                            <><Loader2 className="h-6 w-6 animate-spin" /> Applying...</>
                                        ) : hasApplied ? (
                                            <><CheckCircle2 className="h-5 w-5" /> Applied</>
                                        ) : jobStatus === "paused" ? (
                                            <><Pause className="h-5 w-5" /> Applications Paused</>
                                        ) : jobStatus === "closed" || jobStatus === "completed" ? (
                                            <><XCircle className="h-5 w-5" /> Applications Closed</>
                                        ) : (
                                            <>Apply for this Job <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></>
                                        )}
                                    </Button>

                                    <p className="text-[10px] text-center text-muted-foreground px-6 leading-tight italic">
                                        Your full profile, including skills and experience, will be shared with the hiring manager.
                                    </p>

                                    <div className="pt-2 border-t border-border mt-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-muted-foreground hover:text-red-500 hover:bg-red-500/5 gap-2 text-xs font-semibold"
                                            onClick={() => {
                                                if (hasReported) {
                                                    toast.info("You have already reported this job.");
                                                } else {
                                                    setIsReportModalOpen(true);
                                                }
                                            }}
                                            disabled={hasReported}
                                        >
                                            <Flag className={`h-3.5 w-3.5 ${hasReported ? 'text-red-500/50' : ''}`} />
                                            {hasReported ? "Reported to Admin" : "Report this job"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>

            <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
                <DialogContent className="max-w-md bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Flag className="h-5 w-5 text-red-500" />
                            Report Job Listing
                        </DialogTitle>
                        <DialogDescription>
                            Help us understand what's wrong with this listing. Your report will be reviewed by an administrator.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-3">
                            <Label className="text-sm font-bold">Reason for reporting</Label>
                            <RadioGroup value={reportReason} onValueChange={setReportReason} className="grid gap-2">
                                {[
                                    "Fake job / scam",
                                    "Salary does not match description",
                                    "Wrong location / misleading information",
                                    "Unsafe or illegal work",
                                    "Asking money to apply",
                                    "Harassment or inappropriate behavior",
                                    "Duplicate or spam job",
                                    "Other"
                                ].map((reason) => (
                                    <div key={reason} className="flex items-center space-x-2">
                                        <RadioGroupItem value={reason} id={reason} />
                                        <Label htmlFor={reason} className="text-sm font-medium cursor-pointer">{reason}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-bold">Additional details (optional)</Label>
                            <Textarea
                                placeholder="Provide more context..."
                                value={reportDescription}
                                onChange={(e) => setReportDescription(e.target.value)}
                                className="min-h-[100px] text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-bold">Upload proof (optional)</Label>
                            <div className="relative">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                                    className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                />
                                {reportFile && (
                                    <p className="text-[10px] text-green-500 mt-1 flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" /> {reportFile.name} selected
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                            <p className="text-[10px] text-amber-700 leading-tight">
                                <strong>Warning:</strong> False or abusive reports may result in account action against the reporter.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsReportModalOpen(false)} disabled={reporting}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="gap-2"
                            onClick={handleReport}
                            disabled={reporting || !reportReason}
                        >
                            {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                            Submit Report
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
};

export default JobDetails;
