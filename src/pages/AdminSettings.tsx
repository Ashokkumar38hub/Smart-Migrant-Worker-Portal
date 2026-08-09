import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { useState } from "react";
import {
    Sun, Moon, Monitor, Check, ChevronLeft,
    Settings as SettingsIcon, Palette, Languages,
    Bell, HelpCircle, Info, ExternalLink,
    Globe, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";

const languageLabels: Record<string, { label: string; flag: string }> = {
    en: { label: "English", flag: "🇬🇧" },
    ta: { label: "தமிழ்", flag: "🇮🇳" },
    hi: { label: "हिन्दी", flag: "🇮🇳" },
};

const AdminSettings = () => {
    const { language, setLanguage, t } = useLanguage();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();


    const [notifs, setNotifs] = useState(() => ({
        newUserReg: localStorage.getItem("admin_setting_newUserReg") !== "false",
        jobPosting: localStorage.getItem("admin_setting_jobPosting") !== "false",
        reportAlerts: localStorage.getItem("admin_setting_reportAlerts") !== "false",
        systemActivity: localStorage.getItem("admin_setting_systemActivity") === "true",
    }));

    const [platformControls, setPlatformControls] = useState(() => ({
        globalNotifs: localStorage.getItem("admin_setting_globalNotifs") !== "false",
        strictSecurity: localStorage.getItem("admin_setting_strictSecurity") === "true",
    }));

    const [dndMode, setDndMode] = useState(() => {
        return localStorage.getItem("admin_dnd") === "true";
    });

    const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
        { value: "light", label: t('themeLight'), icon: <Sun className="h-4 w-4" /> },
        { value: "dark", label: t('themeDark'), icon: <Moon className="h-4 w-4" /> },
        { value: "system", label: t('themeSystem'), icon: <Monitor className="h-4 w-4" /> },
    ];

    const handleToggle = (setter: React.Dispatch<React.SetStateAction<any>>, key: string, value: boolean) => {
        setter((prev: any) => {
            const updated = { ...prev, [key]: value };
            // Persist locally so toggles survive re-renders
            localStorage.setItem(`admin_setting_${key}`, String(value));
            return updated;
        });
        toast.success(value ? "Enabled" : "Disabled");
    };

    return (
        <main className="min-h-[calc(100vh-4rem)] py-8 px-4 bg-muted/30">
            <div className="container mx-auto max-w-2xl">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-6 flex justify-between items-center"
                >
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate("/admin")}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        {t('back')} to Dashboard
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
                            <h1 className="text-3xl font-bold text-foreground">{t('adminSettings')}</h1>
                            <p className="text-muted-foreground text-sm">{t('adminSettingsSubtitle')}</p>
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
                                                type="button"
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
                                        {(Object.entries(languageLabels) as [string, { label: string; flag: string }][]).map(([code, { label, flag }]) => (
                                            <button
                                                type="button"
                                                key={code}
                                                onClick={() => setLanguage(code as any)}
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

                    {/* Section 1: Notifications */}
                    <Card className="border-border">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-orange-500" />
                                <CardTitle className="text-xl">{t('adminNotifs')}</CardTitle>
                            </div>
                            <CardDescription>{t('adminNotifsDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { id: 'newUserReg', label: t('newUserReg'), desc: t('newUserRegDesc') },
                                { id: 'jobPosting', label: t('jobPostingAlerts'), desc: t('jobPostingAlertsDesc') },
                                { id: 'reportAlerts', label: t('reportNotifs'), desc: t('reportNotifsDesc') },
                                { id: 'systemActivity', label: t('systemActivity'), desc: t('systemActivityDesc') },
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">🔔 {item.label}</Label>
                                        <p className="text-[10px] text-muted-foreground italic">{item.desc}</p>
                                    </div>
                                    <Switch
                                        checked={(notifs as any)[item.id]}
                                        onCheckedChange={(val) => handleToggle(setNotifs, item.id, val)}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Section 2: Platform Controls */}
                    <Card className="border-border">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-teal-500" />
                                <CardTitle className="text-xl">{t('platformControls')}</CardTitle>
                            </div>
                            <CardDescription>{t('platformControlsDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold">{t('systemNotifControl')}</Label>
                                    <p className="text-[10px] text-muted-foreground italic">{t('systemNotifControlDesc')}</p>
                                </div>
                                <Switch
                                    checked={platformControls.globalNotifs}
                                    onCheckedChange={(val) => handleToggle(setPlatformControls, 'globalNotifs', val)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold">{t('dataSecuritySettings')}</Label>
                                    <p className="text-[10px] text-muted-foreground italic">{t('dataSecuritySettingsDesc')}</p>
                                </div>
                                <Switch
                                    checked={platformControls.strictSecurity}
                                    onCheckedChange={(val) => handleToggle(setPlatformControls, 'strictSecurity', val)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 3: Admin Preferences */}
                    <Card className="border-border">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-amber-500" />
                                <CardTitle className="text-xl">Admin Preferences</CardTitle>
                            </div>
                            <CardDescription>Personalise how you experience the admin panel.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold">🌙 {t('adminDnd')}</Label>
                                    <p className="text-[10px] text-muted-foreground italic">{t('adminDndDesc')}</p>
                                </div>
                                <Switch
                                    checked={dndMode}
                                    onCheckedChange={(val) => {
                                        setDndMode(val);
                                        localStorage.setItem("admin_dnd", String(val));
                                        toast.success(val ? "DND Enabled" : "DND Disabled");
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 6: Help & Support */}
                    <Card className="border-border">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-purple-500" />
                                <CardTitle className="text-xl">{t('helpSupport')}</CardTitle>
                            </div>
                            <CardDescription>{t('helpSupportDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="manage-reports" className="border-border">
                                    <AccordionTrigger className="text-sm font-bold hover:no-underline">{t('howToManageReports')}</AccordionTrigger>
                                    <AccordionContent className="text-[11px] text-muted-foreground leading-relaxed italic">
                                        {t('howToManageReportsAns')}
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="suspend-ban" className="border-border">
                                    <AccordionTrigger className="text-sm font-bold hover:no-underline">{t('howToSuspendBan')}</AccordionTrigger>
                                    <AccordionContent className="text-[11px] text-muted-foreground leading-relaxed italic">
                                        {t('howToSuspendBanAns')}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>

                            <div className="space-y-3 pt-2">
                                <div className="pt-4 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-medium italic">
                                    <div className="flex items-center gap-2">
                                        <Info className="h-3.5 w-3.5" />
                                        <span>{t('version')}</span>
                                    </div>
                                    <button type="button" className="hover:text-primary flex items-center gap-1 group transition-colors">
                                        {t('termsConditions')} <ExternalLink className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </main>
    );
};

export default AdminSettings;
