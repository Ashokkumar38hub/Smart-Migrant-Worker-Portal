import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bell, Settings as SettingsIcon, LogIn, LogOut, Menu, Briefcase, Users, ShieldCheck, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getSupabase, supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Header = () => {
  const { t } = useLanguage();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem("adminAuth") === "true");

  useEffect(() => {
    // Determine which client to subscribe to
    const client = getSupabase();

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAdmin(sessionStorage.getItem("adminAuth") === "true");
      if (!session) setProfile(null);
    });

    client.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAdmin(sessionStorage.getItem("adminAuth") === "true");
    });

    return () => subscription.unsubscribe();
  }, [location.pathname]); // Re-subscribe when path changes (portal context might change)

  useEffect(() => {
    const fetchProfile = async () => {
      const client = getSupabase();
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        const { data: roleData } = await client
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        const role = roleData?.role || "worker";
        setUserRole(role);

        if (role === "provider") {
          const { data } = await client
            .from("provider_profiles")
            .select("contact_person, company_name")
            .eq("id", session.user.id)
            .maybeSingle();

          if (data) {
            setProfile({
              name: data.contact_person,
              subtitle: data.company_name,
            });
          }
        } else {
          const { data } = await client
            .from("profiles")
            .select("full_name")
            .eq("id", session.user.id)
            .maybeSingle();

          if (data) {
            setProfile({
              name: data.full_name,
              subtitle: "Worker",
            });
          }
        }
      } else {
        setUserRole(null);
      }
    };
    fetchProfile();
  }, [user, location.pathname]);
  
  const handleLogout = async () => {
    const client = getSupabase();
    await client.auth.signOut();
    sessionStorage.removeItem("adminAuth");
    setIsAdmin(false);
    navigate("/login");
    toast.success("Logged out successfully");
  };



  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-4">
          {location.pathname.startsWith("/worker") && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
                  <Menu className="h-5 w-5 md:h-6 md:w-6" />
                  <span className="sr-only">{t("toggleMenu")}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0 bg-card border-r border-border">
                <SheetHeader className="p-6 border-b border-border bg-muted/30">
                  <SheetTitle className="text-xl font-bold text-primary flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6" />
                    {t("services")}
                  </SheetTitle>
                </SheetHeader>
                <div className="p-4 flex flex-col gap-2">
                  <motion.div
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Link
                      to="/worker?tab=jobs"
                      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted/80 transition-all group border border-transparent hover:border-primary/20 duration-200"
                    >
                      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors text-primary shadow-sm">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-base font-bold leading-none group-hover:text-primary transition-colors">{t("jobs")}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t("browseJobs")}</p>
                      </div>
                    </Link>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Link
                      to="/worker?tab=accommodations"
                      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted/80 transition-all group border border-transparent hover:border-amber-500/20 duration-200"
                    >
                      <div className="p-2 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors text-amber-500 shadow-sm">
                        <Home className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-base font-bold leading-none group-hover:text-amber-500 transition-colors">{t("accommodations")}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t("findStay")}</p>
                      </div>
                    </Link>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Link
                      to="/worker?tab=hospitals"
                      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted/80 transition-all group border border-transparent hover:border-red-500/20 duration-200"
                    >
                      <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors text-red-500 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-activity"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" /></svg>
                      </div>
                      <div>
                        <p className="text-base font-bold leading-none group-hover:text-red-500 transition-colors">{t("healthcareSupport")}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t("findHealthcare")}</p>
                      </div>
                    </Link>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Link
                      to="/worker?tab=schemes"
                      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted/80 transition-all group border border-transparent hover:border-indigo-500/20 duration-200"
                    >
                      <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors text-indigo-500 shadow-sm">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-base font-bold leading-none group-hover:text-indigo-500 transition-colors">{t("workerSupportSchemes")}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t("govWelfare")}</p>
                      </div>
                    </Link>
                  </motion.div>
                </div>
              </SheetContent>
            </Sheet>
          )}

          <Link to={location.pathname.startsWith("/admin") ? "/admin" : (userRole ? `/${userRole}` : "/")} className="flex items-center gap-2 sm:gap-3 transition-opacity hover:opacity-80 overflow-hidden">
            <img src="/portal-logo.png" alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg object-cover shadow-sm border border-border/50" />
            <div className="flex flex-col border-l border-border/50 pl-2 sm:pl-3">
              <span className="text-base sm:text-lg md:text-xl font-bold text-primary leading-tight tracking-tight truncate">{t("portalName")}</span>
              <span className="text-[10px] md:text-xs text-muted-foreground leading-tight hidden sm:block font-medium tracking-wide truncate">{t("subtitle")}</span>
            </div>
          </Link>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Notification Bell - hidden on provider portal, settings page, home page, and auth pages */}
          {!location.pathname.startsWith("/settings") && 
           location.pathname !== "/" && 
           !location.pathname.startsWith("/login") && 
           !location.pathname.startsWith("/register") && 
           (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative touch-target text-muted-foreground hover:text-foreground"
                  title={t("notifications")}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center animate-in zoom-in">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 overflow-hidden bg-card border-border" align="end">
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
                  <h3 className="font-bold text-sm">{t("notifications")}</h3>
                  {notifications.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary hover:bg-transparent" onClick={clearAll}>
                      {t("clearAll")}
                    </Button>
                  )}
                </div>
                <div className="max-h-[350px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Bell className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium text-foreground">{t("noNotifications")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {location.pathname.startsWith("/admin") 
                          ? t("notifEmptyDescAdmin") || "We'll notify you if any reports come in."
                          : location.pathname.startsWith("/provider") 
                            ? t("notifEmptyDescProvider") 
                            : t("notifEmptyDesc")}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-4 transition-colors hover:bg-muted/50 cursor-pointer ${!notif.read ? 'bg-primary/5' : ''}`}
                          onClick={() => {
                            markAsRead(notif.id);
                            if (notif.link) navigate(notif.link);
                          }}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <p className={`text-sm leading-tight ${!notif.read ? 'font-bold' : 'font-medium'}`}>{notif.title}</p>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{notif.time}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notif.message}</p>
                          {!notif.read && (
                            <div className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Settings Page Link (Direct) */}
          {(user || isAdmin) && (
            <Button
              variant="ghost"
              size="icon"
              className="touch-target text-muted-foreground hover:text-foreground"
              title={t("settings")}
              onClick={() => navigate(location.pathname.startsWith("/admin") ? "/admin/settings" : "/settings")}
            >
              <SettingsIcon className="h-5 w-5" />
            </Button>
          )}

          {/* User Section - Hidden on admin page */}
          {!location.pathname.startsWith("/admin") && (
            user ? (
              <div className="flex items-center gap-1">
                {/* Profile Avatar - Direct Link */}
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full p-0 overflow-hidden border border-primary/20 bg-primary/10"
                  onClick={() => navigate("/profile")}
                  title={t("viewProfile")}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold italic">
                      {profile?.name?.[0] || user.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </div>
            ) : location.pathname !== "/" && !location.pathname.startsWith("/login") && !location.pathname.startsWith("/register") ? (
              <Link to="/login">
                <Button variant="default" className="touch-target gap-2 ml-1">
                  <LogIn className="h-5 w-5" />
                  <span className="hidden sm:inline">{t("login")}</span>
                </Button>
              </Link>
            ) : null
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
