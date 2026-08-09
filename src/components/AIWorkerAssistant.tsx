import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bot,
    X,
    Send,
    Loader2,
    User,
    Briefcase,
    ShieldCheck,
    Home,
    Activity,
    MessageCircle,
    ArrowRight,
    MapPin,
    Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { WORKER_SCHEMES } from "@/constants/schemes";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface Message {
    id: string;
    role: "user" | "ai";
    content: string;
    timestamp: Date;
    type?: "text" | "jobs" | "schemes" | "services" | "help";
    data?: any;
}

interface AIWorkerAssistantProps {
    profile: any;
    jobs: any[];
    appliedJobs: any[];
    onTabChange?: (tab: string) => void;
}

const AIWorkerAssistant = ({ profile, jobs, appliedJobs, onTabChange }: AIWorkerAssistantProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [currentTopic, setCurrentTopic] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { t } = useLanguage();

    const WELCOME_MESSAGE: Message = {
        id: "welcome",
        role: "ai",
        content: `${t("welcomeTitle")}\n${t("welcomeSubtitle")}\n\n• ${t("welcomeJobs")}\n• ${t("welcomeSchemes")}\n• ${t("welcomeServices")}\n• ${t("welcomePlatform")}\n\n${t("welcomeStart")}`,
        timestamp: new Date(),
    };

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([WELCOME_MESSAGE]);
        }
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isTyping]);

    const generateAIResponse = async (userQuery: string) => {
        setIsTyping(true);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const query = userQuery.toLowerCase();
        let response: Partial<Message> = { role: "ai", timestamp: new Date() };

        // --- 1. Weighted Intent Detection ---
        const scores = {
            JOBS: (query.match(/job|work|hiring|vacancy|salary|opening|role|position/g) || []).length * 10,
            ROLES: (query.match(/electrician|plumber|construction|cleaner|helper|driver|carpenter|tailor|welder|mason|painter|security/g) || []).length * 15,
            SCHEMES: (query.match(/scheme|yojana|welfare|government|benefit|eshram|ration|card|pension|money|relief|fund/g) || []).length * 12,
            APPLY: (query.match(/apply|register|join|process|how to|steps|procedure|method/g) || []).length * 5,
            HEALTH: (query.match(/hospital|clinic|medical|health|healthcare|doctor|medicine|nurse|sick|pain/g) || []).length * 15,
            STAY: (query.match(/hostel|stay|room|place|accommodation|rent|sleep|housing/g) || []).length * 15,
            LOCATION: (query.match(/nearby|near|location|find|map|where|site|address/g) || []).length * 3
        };

        // Explicit High-Priority Overrides
        if (query.includes("nearby healthcare support") || query.includes("find hospital")) scores.HEALTH += 100;
        if (query.includes("nearby accommodation") || query.includes("find hostel")) scores.STAY += 100;
        if (query.includes("scheme") || query.includes("yojana") || query.includes("what schemes are available")) scores.SCHEMES += 100;
        if (query.includes("job") || query.includes("work") || query.includes("find jobs based on my profile")) scores.JOBS += 100;

        // Boost scores strictly based on current topic
        if (currentTopic === "jobs") scores.JOBS += 10;
        if (currentTopic === "schemes") scores.SCHEMES += 10;
        if (currentTopic === "services") { scores.HEALTH += 10; scores.STAY += 10; }

        // Aggregate scores for main categories
        const aggregateScores = {
            JOBS: scores.JOBS + scores.ROLES,
            SCHEMES: scores.SCHEMES,
            APPLY: scores.APPLY,
            SERVICES: scores.HEALTH + scores.STAY + (scores.LOCATION > 5 ? scores.LOCATION : 0),
            HELP: (query.match(/help|guide|use|platform|profile|update|edit|broken|working/g) || []).length * 5
        };

        // Determine primary intent
        const entries = Object.entries(aggregateScores).filter(e => e[1] > 0);
        const primaryIntent = entries.length > 0 ? entries.sort((a, b) => b[1] - a[1])[0][0] : null;

        // --- 2. Intent Resolution Logic ---

        // A. If user is asking HOW TO APPLY
        if (primaryIntent === "APPLY" || aggregateScores.APPLY > 10) {
            if (aggregateScores.SCHEMES > 5 || currentTopic === "schemes") {
                const scheme = WORKER_SCHEMES.find(s => query.includes(s.name.toLowerCase())) || WORKER_SCHEMES[0];
                response.content = t("aiSchemeHelp")
                    .replace("{scheme}", scheme.name)
                    .replace("{link}", scheme.link);
                response.type = "schemes";
                response.data = [scheme];
                setCurrentTopic("schemes");
            } else {
                response.content = t("aiApplyHelp");
                response.type = "help";
                setCurrentTopic("jobs");
            }
        }
        // B. Services Intent (Health/Stay)
        else if (primaryIntent === "SERVICES" || aggregateScores.SERVICES > 15) {
            if (scores.STAY > scores.HEALTH || query.includes("hostel") || query.includes("stay") || query.includes("room") || query.includes("accommodation")) {
                response.content = t("aiHostelHelp");
                response.type = "services";
                response.data = { category: "accommodations", label: t("accommodations") };
            } else {
                response.content = t("aiHealthcareHelp");
                response.type = "services";
                response.data = { category: "hospitals", label: t("healthcareSupport") };
            }
            setCurrentTopic("services");
        }
        // C. Schemes Intent
        else if (primaryIntent === "SCHEMES" || aggregateScores.SCHEMES > 5) {
            const matched = WORKER_SCHEMES.filter(s =>
                query.includes(s.name.toLowerCase()) ||
                query.includes(s.category.toLowerCase()) ||
                (query.includes("ration") && s.name.includes("ONORC")) ||
                (query.includes("health") && s.category === "Healthcare")
            );

            if (matched.length > 0) {
                const s = matched[0];
                response.content = `The **${s.name}** is a ${s.category.toLowerCase()} scheme. ${s.description}\n\n**Main Benefit**: ${s.benefits[0]}\n\nWould you like the application link or eligibility details?`;
                response.type = "schemes";
                response.data = [s];
            } else {
                response.content = t("aiSchemeGeneral");
                response.type = "schemes";
                response.data = WORKER_SCHEMES.slice(0, 3);
            }
            setCurrentTopic("schemes");
        }
        // D. Jobs Intent
        else if (primaryIntent === "JOBS" || aggregateScores.JOBS > 5) {
            const skills = profile?.skills || [];
            const preferredLocation = profile?.preferred_job_location?.toLowerCase() || "";

            const scoredJobs = jobs.map(job => {
                let s = 0;
                // Match with profile skills
                if (skills.some((sk: string) => job.title.toLowerCase().includes(sk.toLowerCase()))) s += 5;
                // Match with query keywords or roles from scores
                if (scores.ROLES > 0) {
                    const roles = ["electrician", "plumber", "construction", "helper", "driver", "welder", "tailor", "mason", "painter", "security"];
                    roles.forEach(role => {
                        if (query.includes(role) && job.title.toLowerCase().includes(role)) s += 20;
                    });
                }
                if (preferredLocation && job.location.toLowerCase().includes(preferredLocation)) s += 5;
                return { ...job, score: s };
            })
                .filter(j => j.score > 0 && j.status === "active")
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);

            if (scoredJobs.length > 0) {
                response.content = t("aiJobMatch");
                response.type = "jobs";
                response.data = scoredJobs;
            } else {
                response.content = t("aiNoJobMatch");
                response.type = "help";
            }
            setCurrentTopic("jobs");
        }
        // E. Help/Profile Intent
        else if (primaryIntent === "HELP" || aggregateScores.HELP > 5) {
            if (query.includes("profile") || query.includes("update")) {
                response.content = t("aiProfileHelp");
            } else {
                response.content = t("aiHelpGeneral");
            }
            response.type = "help";
            setCurrentTopic(null);
        }
        // Fallback
        else {
            response.content = t("aiFallback");
            setCurrentTopic(null);
        }

        setMessages(prev => [...prev, response as Message]);
        setIsTyping(false);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        generateAIResponse(userMsg.content);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[60]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: "100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[440px] sm:h-[calc(100vh-140px)] sm:max-h-[700px] z-[60] bg-card border-none sm:border border-border sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Chat Header */}
                        <div className="p-4 sm:p-5 pt-10 sm:pt-5 bg-card border-b border-border flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 border border-orange-500/20">
                                    <Bot className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base sm:text-lg text-foreground tracking-tight">{t("aiAssistant")}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="h-1.5 w-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("assistantAvailable")}</p>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Chat Content */}
                        <ScrollArea className="flex-1 px-4 sm:px-8 py-6 bg-muted/5">
                            <div className="max-w-3xl mx-auto space-y-6 pb-4">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                            <div className={`p-3 sm:p-4 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                                                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tr-none border border-slate-200 dark:border-slate-700 shadow-md font-medium"
                                                : "bg-card border border-border rounded-tl-none shadow-md text-foreground"
                                                }`}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>

                                                {/* Specialized Data Rendering */}
                                                {msg.type === "jobs" && msg.data && (
                                                    <div className="mt-4 grid gap-3">
                                                        {msg.data.map((job: any) => (
                                                            <div
                                                                key={job.id}
                                                                className="p-3 bg-muted/30 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer group/job"
                                                                onClick={() => navigate(`/job/${job.id}`)}
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <p className="font-bold text-sm truncate group-hover/job:text-primary transition-colors">{job.title}</p>
                                                                    <Badge variant="outline" className="text-[10px] h-5 bg-background font-bold whitespace-nowrap">
                                                                        ₹{job.salary_min?.toLocaleString()}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                                                    <MapPin className="h-3 w-3" /> {job.location}
                                                                </p>
                                                            </div>
                                                        ))}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full text-xs font-bold mt-2 border-border bg-background text-foreground hover:bg-muted transition-all rounded-xl py-5"
                                                            onClick={() => onTabChange?.("jobs")}
                                                        >
                                                            {t("viewAllJobs")} <ArrowRight className="h-3 w-3 ml-2 text-orange-500" />
                                                        </Button>
                                                    </div>
                                                )}

                                                {msg.type === "schemes" && msg.data && (
                                                    <div className="mt-4 grid gap-3">
                                                        {msg.data.map((scheme: any) => (
                                                            <div
                                                                key={scheme.id}
                                                                className="p-3 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                                                            >
                                                                <p className="font-bold text-sm text-indigo-500">{scheme.name}</p>
                                                                <p className="text-xs text-muted-foreground mt-1 leading-snug">{scheme.description}</p>
                                                            </div>
                                                        ))}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full text-xs font-bold mt-2 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                                                            onClick={() => onTabChange?.("schemes")}
                                                        >
                                                            {t("exploreSchemes")} <ArrowRight className="h-3 w-3 ml-2" />
                                                        </Button>
                                                    </div>
                                                )}

                                                {msg.type === "services" && msg.data && (
                                                    <div className="mt-4">
                                                        <Button
                                                            variant="outline"
                                                            size="lg"
                                                            className="w-full text-sm font-bold gap-3 rounded-xl border-border bg-background text-foreground hover:bg-muted shadow-md transition-all py-6 group"
                                                            onClick={() => onTabChange?.(msg.data.category)}
                                                        >
                                                            {msg.data.category === "hospitals" ? <Activity className="h-5 w-5 text-orange-500" /> : <Home className="h-5 w-5 text-orange-500" />}
                                                            {t("openService").replace("{service}", msg.data.label)}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground mt-1.5 px-1 font-medium italic opacity-70">
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                            <span className="text-sm font-medium italic text-muted-foreground">{t("aiAnalyzing")}</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={scrollRef} className="h-4" />
                            </div>
                        </ScrollArea>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 p-3 overflow-x-auto no-scrollbar bg-card border-t border-border">
                            <button
                                onClick={() => { setInput("Find jobs based on my profile"); }}
                                className="whitespace-nowrap px-3 py-2 bg-muted/30 border border-border rounded-lg text-xs font-bold text-foreground hover:bg-muted hover:border-orange-500/50 transition-all flex items-center gap-2 shadow-sm shrink-0 active:scale-95 group"
                            >
                                <Briefcase className="h-3.5 w-3.5 text-orange-500 group-hover:scale-110 transition-transform" /> Jobs
                            </button>
                            <button
                                onClick={() => setInput("What schemes are available?")}
                                className="whitespace-nowrap px-3 py-2 bg-muted/30 border border-border rounded-lg text-xs font-bold text-foreground hover:bg-muted hover:border-orange-500/50 transition-all flex items-center gap-2 shadow-sm shrink-0 active:scale-95 group"
                            >
                                <ShieldCheck className="h-3.5 w-3.5 text-orange-500 group-hover:scale-110 transition-transform" /> Schemes
                            </button>
                            <button
                                onClick={() => setInput("Nearby healthcare support")}
                                className="whitespace-nowrap px-3 py-2 bg-muted/30 border border-border rounded-lg text-xs font-bold text-foreground hover:bg-muted hover:border-orange-500/50 transition-all flex items-center gap-2 shadow-sm shrink-0 active:scale-95 group"
                            >
                                <Activity className="h-3.5 w-3.5 text-orange-500 group-hover:scale-110 transition-transform" /> Healthcare
                            </button>
                            <button
                                onClick={() => setInput("How to use this platform?")}
                                className="whitespace-nowrap px-3 py-2 bg-muted/30 border border-border rounded-lg text-xs font-bold text-foreground hover:bg-muted hover:border-orange-500/50 transition-all flex items-center gap-2 shadow-sm shrink-0 active:scale-95 group"
                            >
                                <Search className="h-3.5 w-3.5 text-orange-500 group-hover:scale-110 transition-transform" /> Guide
                            </button>
                        </div>

                        {/* Input Area */}
                        <div className="p-4 sm:p-5 bg-card border-t border-border">
                            <form
                                onSubmit={(e) => { e.preventDefault(); if (input.trim()) handleSendMessage(e); }}
                                className="flex items-center gap-2 relative bg-background p-1.5 rounded-2xl border border-border focus-within:border-orange-500/50 transition-all shadow-inner"
                            >
                                <div className="flex-1">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={t("askAssistant")}
                                        className="h-12 border-none bg-transparent text-foreground text-sm sm:text-base focus-visible:ring-0 placeholder:text-muted-foreground w-full shadow-none"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={!input.trim() || isTyping}
                                    className="h-10 w-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </form>
                            <p className="text-center text-[9px] text-muted-foreground mt-3 font-bold tracking-widest uppercase">
                                {t("aiAssistant")}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Toggle Button */}
            {!isOpen && (
                <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Button
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-2xl hover:shadow-primary/20 bg-primary text-primary-foreground group relative"
                        onClick={() => setIsOpen(true)}
                    >
                        <Bot className="h-6 w-6 group-hover:scale-110 transition-transform" />
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-primary"></span>
                        </span>
                    </Button>
                </motion.div>
            )}
        </div>
    );
};

export default AIWorkerAssistant;
