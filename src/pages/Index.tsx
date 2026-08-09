import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { HardHat, Building2, ArrowRight, Shield, Users, BookOpen, Briefcase, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

const Index = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handlePortalClick = async (portal: "worker" | "provider") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/login", { state: { intendedRole: portal } });
      return;
    }

    // Check user role
    const { data: roleData, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      toast.error("Failed to verify user role");
      return;
    }

    const userRole = roleData?.role;

    // Only block if we have a confirmed role that doesn't match the portal
    if (portal === "provider" && userRole === "worker") {
      toast.error("Access Denied: You are registered as a worker. This portal is for job providers only.");
      return;
    }

    if (portal === "worker" && userRole === "provider") {
      toast.error("Access Denied: You are registered as a provider. This portal is for workers only.");
      return;
    }

    navigate(`/${portal}`);
  };

  return (
    <main className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 px-3 sm:px-4">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container relative z-10 mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold leading-tight mb-4">
              <span className="text-primary">{t("heroTitle")}</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-foreground/80 mb-4 px-2">
              {t("heroSubtitle")}
            </p>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-10 px-4">
              {t("heroDescription")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Portal Cards — shown FIRST */}
      <section className="container mx-auto px-2 sm:px-4 pb-10 -mt-4">
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <button onClick={() => handlePortalClick("worker")} className="block group w-full text-left">
              <div className="rounded-lg border border-border bg-card p-6 sm:p-8 hover:border-primary/50 hover:shadow-glow transition-all duration-300 h-full">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg gradient-hero flex items-center justify-center mb-6">
                  <HardHat className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{t("workerCardTitle")}</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">{t("workerCardDesc")}</p>
                <Button variant="hero" className="touch-target gap-2 w-full sm:w-auto" type="button">
                  {t("findJobs")}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <button onClick={() => handlePortalClick("provider")} className="block group w-full text-left">
              <div className="rounded-lg border border-border bg-card p-6 sm:p-8 hover:border-secondary/50 hover:shadow-glow transition-all duration-300 h-full">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-secondary flex items-center justify-center mb-6">
                  <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-secondary-foreground" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{t("providerCardTitle")}</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">{t("providerCardDesc")}</p>
                <Button variant="secondary" className="touch-target gap-2 w-full sm:w-auto" type="button">
                  {t("postJobs")}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Stats — shown BELOW the cards */}
      <section className="container mx-auto px-2 sm:px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-6 sm:gap-10 md:gap-16"
        >
          {[
            { icon: Users, value: "10,000+", label: "Workers" },
            { icon: Briefcase, value: "2,000+", label: "Jobs" },
            { icon: Home, value: "300+", label: "Accommodation" },
            { icon: Shield, value: "100%", label: "Verified" },
            { icon: BookOpen, value: "50+", label: "Courses" },
          ].map((stat) => (
            <div key={stat.label} className="text-center min-w-[70px]">
              <stat.icon className="h-5 w-5 text-primary mx-auto mb-2" />
              <div className="text-xl font-bold text-foreground">{stat.value}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>
    </main>
  );
};

export default Index;
