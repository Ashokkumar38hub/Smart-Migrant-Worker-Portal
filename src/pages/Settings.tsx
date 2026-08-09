import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import type { Language } from "@/lib/translations";
import { useEffect, useState } from "react";
import {
    Sun, Moon, Monitor, Check, ChevronLeft,
    Settings as SettingsIcon, Palette, Languages,
    Bell, ShieldAlert, HelpCircle,
    Info, Shield, MessageSquare, ExternalLink,
    Trash2, PauseCircle, Copy, Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

const languageLabels: Record<Language, { label: string; flag: string }> = {
    en: { label: "English", flag: "🇬🇧" },
    ta: { label: "தமிழ்", flag: "🇮🇳" },
    hi: { label: "हिन्दी", flag: "🇮🇳" },
};

const Settings = () => {
    const { language, setLanguage, t } = useLanguage();
    const { theme, setTheme } = useTheme();

    const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
        { value: "light", label: t('themeLight'), icon: <Sun className="h-4 w-4" /> },
        { value: "dark", label: t('themeDark'), icon: <Moon className="h-4 w-4" /> },
        { value: "system", label: t('themeSystem'), icon: <Monitor className="h-4 w-4" /> },
    ];

    const [user, setUser] = useState<User | null>(null);
    const [isProvider, setIsProvider] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                const { data: roleData } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", session.user.id)
                    .maybeSingle();
                setIsProvider(roleData?.role === "provider");
            }
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    // Notification states
    const [notifs, setNotifs] = useState({
        jobMatches: true,
        appUpdates: true,
        accAlerts: true,
        dndMode: false
    });

    // Job Management states (provider only)
    const [jobMgmt, setJobMgmt] = useState({
        autoPause: true,
        duplicateJob: false,
        autoArchive: true
    });

    const [issueText, setIssueText] = useState("");
    const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

    // Fetch settings from Supabase
    useEffect(() => {
        const fetchSettings = async () => {
            if (!user) return;

            try {
                const table = isProvider ? "provider_profiles" : "profiles";
                const { data, error } = await supabase
                    .from(table)
                    .select("notification_settings, job_management_settings")
                    .eq("id", user.id)
                    .maybeSingle();

                if (error) throw error;

                if (data?.notification_settings) {
                    setNotifs(data.notification_settings);
                }
                if (isProvider && data?.job_management_settings) {
                    setJobMgmt(data.job_management_settings);
                }
            } catch (err) {
                console.error("Error fetching settings:", err);
            }
        };

        fetchSettings();

        // Real-time subscription
        const table = isProvider ? "provider_profiles" : "profiles";
        const channel = supabase
            .channel(`public:${table}:id=eq.${user?.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: table,
                    filter: `id=eq.${user?.id}`,
                },
                (payload) => {
                    if (payload.new.notification_settings) {
                        setNotifs(payload.new.notification_settings);
                    }
                    if (isProvider && payload.new.job_management_settings) {
                        setJobMgmt(payload.new.job_management_settings);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isProvider]);

    // Save functions
    const updateNotifs = async (newNotifs: any) => {
        setNotifs(newNotifs);
        if (!user) return;

        try {
            const table = isProvider ? "provider_profiles" : "profiles";
            const { error } = await supabase
                .from(table)
                .update({ notification_settings: newNotifs })
                .eq("id", user.id);

            if (error) throw error;
        } catch (err) {
            console.error("Error saving notification settings:", err);
            toast.error("Failed to save notification settings");
        }
    };

    const updateJobMgmt = async (newJobMgmt: any) => {
        setJobMgmt(newJobMgmt);
        if (!user || !isProvider) return;

        try {
            const { error } = await supabase
                .from("provider_profiles")
                .update({ job_management_settings: newJobMgmt })
                .eq("id", user.id);

            if (error) throw error;
        } catch (err) {
            console.error("Error saving job management settings:", err);
            toast.error("Failed to save job management settings");
        }
    };

    const handleReportIssue = () => {
        if (!issueText.trim()) return;
        setIsSubmittingIssue(true);
        setTimeout(() => {
            toast.success(t('issueReported'));
            setIssueText("");
            setIsSubmittingIssue(false);
        }, 1500);
    };

    const handleDeleteAccount = async () => {
        if (!user) return;

        try {
            const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: user.id });
            if (error) throw error;

            toast.success(t('accountDeleted'));
            await supabase.auth.signOut();
            navigate("/");
        } catch (error: any) {
            console.error("Error deleting account:", error);
            toast.error(error.message || "Failed to delete account. Please try again.");
        }
    };

    return (
        <main className="min-h-[calc(100vh-4rem)] py-8 px-4 bg-muted/30">
            <div className="container mx-auto max-w-2xl">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        {t('back')}
                    </Button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <SettingsIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{t('settingsTitle')}</h1>
                            <p className="text-muted-foreground text-sm">{t('settingsSubtitle')}</p>
                        </div>
                    </div>

                    <Card className="border-border overflow-hidden">
                        <div className="flex flex-col divide-y divide-border/50">
                            {/* Appearance Section */}
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Palette className="h-4 w-4 text-primary" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">{t('appearance')}</h3>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-xs text-muted-foreground font-medium">{t('selectTheme')}</Label>
                                    <div className="flex bg-muted/30 p-1 rounded-xl border border-border/50 max-w-md">
                                        {themeOptions.map(({ value, label, icon }) => (
                                            <button
                                                key={value}
                                                onClick={() => setTheme(value)}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all
                                                  ${theme === value
                                                        ? "bg-card text-primary shadow-sm scale-[1.02]"
                                                        : "text-muted-foreground hover:text-foreground"
                                                    }`}
                                            >
                                                {icon}
                                                <span className="text-xs font-bold">{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Language Section */}
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Languages className="h-4 w-4 text-secondary" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">{t('language')}</h3>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-xs text-muted-foreground font-medium">{t('selectLanguage')}</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {(Object.entries(languageLabels) as [Language, { label: string; flag: string }][]).map(([code, { label, flag }]) => (
                                            <button
                                                key={code}
                                                onClick={() => setLanguage(code)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border
                                                  ${language === code
                                                        ? "bg-secondary/10 border-secondary text-secondary font-bold"
                                                        : "bg-muted/20 border-border/40 text-muted-foreground hover:border-secondary/40 hover:text-foreground"
                                                    }`}
                                            >
                                                <span className="text-sm">{flag}</span>
                                                <span className="text-xs">{label}</span>
                                                {language === code && <Check className="h-3 w-3" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Notification Preferences */}
                    <Card className="border-border">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-orange-500" />
                                <CardTitle className="text-xl">{t('notificationsTitle')}</CardTitle>
                            </div>
                            <CardDescription>{t('notificationsDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                {isProvider ? (
                                    <>
                                        {/* Provider-specific notification labels */}
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold">🔔 {t('newApplicantAlerts')}</Label>
                                                <p className="text-[10px] text-muted-foreground italic">{t('newApplicantAlertsDesc')}</p>
                                            </div>
                                            <Switch
                                                checked={notifs.jobMatches}
                                                onCheckedChange={(val) => updateNotifs({ ...notifs, jobMatches: val })}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold">🔔 {t('shortlistedWorkerUpdates')}</Label>
                                                <p className="text-[10px] text-muted-foreground italic">{t('shortlistedWorkerUpdatesDesc')}</p>
                                            </div>
                                            <Switch
                                                checked={notifs.appUpdates}
                                                onCheckedChange={(val) => updateNotifs({ ...notifs, appUpdates: val })}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold">🔔 {t('jobStatusReminders')}</Label>
                                                <p className="text-[10px] text-muted-foreground italic">{t('jobStatusRemindersDesc')}</p>
                                            </div>
                                            <Switch
                                                checked={notifs.accAlerts}
                                                onCheckedChange={(val) => updateNotifs({ ...notifs, accAlerts: val })}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Worker notification labels */}
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold">{t('newJobMatches')}</Label>
                                                <p className="text-[10px] text-muted-foreground italic">{t('newJobMatchesDesc')}</p>
                                            </div>
                                            <Switch
                                                checked={notifs.jobMatches}
                                                onCheckedChange={(val) => updateNotifs({ ...notifs, jobMatches: val })}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold">{t('applicationUpdates')}</Label>
                                                <p className="text-[10px] text-muted-foreground italic">{t('applicationUpdatesDesc')}</p>
                                            </div>
                                            <Switch
                                                checked={notifs.appUpdates}
                                                onCheckedChange={(val) => updateNotifs({ ...notifs, appUpdates: val })}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold">{t('accommodationAlerts')}</Label>
                                                <p className="text-[10px] text-muted-foreground italic">{t('accommodationAlertsDesc')}</p>
                                            </div>
                                            <Switch
                                                checked={notifs.accAlerts}
                                                onCheckedChange={(val) => updateNotifs({ ...notifs, accAlerts: val })}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="pt-4 border-t border-border">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <ShieldAlert className="h-4 w-4 text-amber-500" />
                                            <Label className="text-sm font-bold">🌙 {t('doNotDisturb')}</Label>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic">{t('doNotDisturbDesc')}</p>
                                    </div>
                                    <Switch
                                        checked={notifs.dndMode}
                                        onCheckedChange={(val) => updateNotifs({ ...notifs, dndMode: val })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Job Management Settings — Provider only */}
                    {isProvider && (
                        <Card className="border-border">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <SettingsIcon className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-xl">🧑‍💼 {t('jobMgmtTitle')}</CardTitle>
                                </div>
                                <CardDescription>{t('jobMgmtDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <PauseCircle className="h-4 w-4 text-blue-500" />
                                            <Label className="text-sm font-bold">⏸ {t('autoPauseJob')}</Label>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic">{t('autoPauseJobDesc')}</p>
                                    </div>
                                    <Switch
                                        checked={jobMgmt.autoPause}
                                        onCheckedChange={(val) => updateJobMgmt({ ...jobMgmt, autoPause: val })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <Copy className="h-4 w-4 text-violet-500" />
                                            <Label className="text-sm font-bold">🔁 {t('duplicateJobEnabled')}</Label>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic">{t('duplicateJobEnabledDesc')}</p>
                                    </div>
                                    <Switch
                                        checked={jobMgmt.duplicateJob}
                                        onCheckedChange={(val) => updateJobMgmt({ ...jobMgmt, duplicateJob: val })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <Archive className="h-4 w-4 text-orange-500" />
                                            <Label className="text-sm font-bold">🗑 {t('autoArchiveJobs')}</Label>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic">{t('autoArchiveJobsDesc')}</p>
                                    </div>
                                    <Switch
                                        checked={jobMgmt.autoArchive}
                                        onCheckedChange={(val) => updateJobMgmt({ ...jobMgmt, autoArchive: val })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Help & Support */}
                    <Card className="border-border">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-teal-500" />
                                <CardTitle className="text-xl">{t('helpSupport')}</CardTitle>
                            </div>
                            <CardDescription>{t('helpSupportDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Accordion type="single" collapsible className="w-full">
                                {isProvider ? (
                                    <>
                                        <AccordionItem value="manage-applicants" className="border-border">
                                            <AccordionTrigger className="text-sm font-bold hover:no-underline">{t('howToManageApplicants')}</AccordionTrigger>
                                            <AccordionContent className="text-[11px] text-muted-foreground leading-relaxed italic">
                                                {t('howToManageApplicantsAns')}
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="close-pause-job" className="border-border">
                                            <AccordionTrigger className="text-sm font-bold hover:no-underline">{t('howToCloseJob')}</AccordionTrigger>
                                            <AccordionContent className="text-[11px] text-muted-foreground leading-relaxed italic">
                                                {t('howToCloseJobAns')}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </>
                                ) : (
                                    <>
                                        <AccordionItem value="apply" className="border-border">
                                            <AccordionTrigger className="text-sm font-bold hover:no-underline">{t('howToApply')}</AccordionTrigger>
                                            <AccordionContent className="text-[11px] text-muted-foreground leading-relaxed italic">
                                                {t('howToApplyAns')}
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="verify" className="border-border">
                                            <AccordionTrigger className="text-sm font-bold hover:no-underline">{t('areProvidersVerified')}</AccordionTrigger>
                                            <AccordionContent className="text-[11px] text-muted-foreground leading-relaxed italic">
                                                {t('areProvidersVerifiedAns')}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </>
                                )}
                            </Accordion>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-primary" />
                                    <Label className="text-sm font-bold">{t('reportIssue')}</Label>
                                </div>
                                <Textarea
                                    placeholder={t('reportPlaceholder')}
                                    className="min-h-[100px] text-xs"
                                    value={issueText}
                                    onChange={(e) => setIssueText(e.target.value)}
                                />
                                <Button
                                    className="w-full"
                                    size="sm"
                                    onClick={handleReportIssue}
                                    disabled={isSubmittingIssue || !issueText.trim()}
                                >
                                    {isSubmittingIssue ? t('sending') : t('submitFeedback')}
                                </Button>
                            </div>

                            <div className="pt-4 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-medium italic">
                                <div className="flex items-center gap-2">
                                    <Info className="h-3.5 w-3.5" />
                                    <span>{t('version')}</span>
                                </div>
                                <button className="hover:text-primary flex items-center gap-1 group transition-colors">
                                    {t('termsConditions')} <ExternalLink className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Danger Zone */}
                    {user && (
                        <Card className="border-red-500/20 bg-red-500/5">
                            <CardContent className="pt-6">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="w-full border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all gap-2 font-bold">
                                            <Trash2 className="h-4 w-4" /> {t('deleteAccount')}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                                <Shield className="h-5 w-5 font-black" /> {t('deleteConfirmTitle')}
                                            </AlertDialogTitle>
                                            <AlertDialogDescription className="text-sm italic font-medium">
                                                {t('deleteConfirmDesc')}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="font-bold">{t('cancel')}</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDeleteAccount}
                                                className="bg-red-600 hover:bg-red-700 text-white font-black"
                                            >
                                                {t('confirmDeletion')}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    )}
                </motion.div>
            </div>
        </main>
    );
};

export default Settings;
