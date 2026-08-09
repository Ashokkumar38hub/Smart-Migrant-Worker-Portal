import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase, workerSupabase, providerSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus, Loader2, AlertCircle, MailCheck, HardHat, Building2 } from "lucide-react";
import { toast } from "sonner";

type AuthMode = "login" | "signup";
type Role = "worker" | "provider";

const Login = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Read intended role from navigation state
  const intendedRole = location.state?.intendedRole as Role | undefined;

  // Default to signup if they came from a specific portal button, else login
  const [mode, setMode] = useState<AuthMode>(intendedRole ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(intendedRole || "worker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);

  // If user toggles mode, we still remember their intended role
  useEffect(() => {
    if (intendedRole) {
      setRole(intendedRole);
    }
  }, [intendedRole]);

  // Handle error fragments in the URL (e.g. from expired email links)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("error_description")) {
      const params = new URLSearchParams(hash.replace("#", "?"));
      const errorDesc = params.get("error_description");
      if (errorDesc) {
        let helpMessage = errorDesc.replace(/\+/g, " ");
        
        // Make common errors more user-friendly
        if (errorDesc.includes("Email+link+is+invalid+or+has+expired")) {
          helpMessage = "The verification link has expired or has already been used. Please try to log in, or sign up again if you don't have an account.";
        }
        
        setError(helpMessage);
        toast.error(helpMessage, { duration: 6000 });
        
        // Clear the hash so the message doesn't keep appearing
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const activeSupabase = role === "provider" ? providerSupabase : workerSupabase;
    sessionStorage.setItem("last_portal_context", role);

    try {
      if (mode === "signup") {
        // Use window.location.origin to ensure we redirect back to the current domain (Vercel or local)
        // Note: For this to work in production, you MUST add https://migrant-connect.vercel.app to "Redirect URLs" in Supabase -> Auth -> Settings
        const redirectUrl = `${window.location.origin}/login`;
        
        const { data, error: signUpError } = await activeSupabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        if (signUpError) throw signUpError;

        if (data.user) {
          // If identities is an empty array, it means the email is already taken
          // (Supabase returns a successful response but with no identities for existing users when email confirmation is ON)
          if (data.user.identities && data.user.identities.length === 0) {
            setError(t("emailAlreadyRegistered"));
            return;
          }

          // Store the chosen role in sessionStorage temporarily
          sessionStorage.setItem(`pending_role_${data.user.id}`, role);
          setVerificationSent(true);
        }
      } else {
        const { data, error: signInError } = await activeSupabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.toLowerCase().includes("email not confirmed")) {
            setError("Please verify your email before logging in. Check your inbox for the verification link.");
          } else {
            throw signInError;
          }
          return;
        }

        if (data.user) {
          // Check if email is confirmed
          if (!data.user.email_confirmed_at) {
            await activeSupabase.auth.signOut();
            setError("Please verify your email before logging in. Check your inbox for the verification link.");
            return;
          }

          // Try to fetch role; if missing, insert it (handles first login after email confirm)
          let { data: roleData } = await activeSupabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .maybeSingle();

          if (!roleData) {
            // Insert the role that was chosen at signup
            const pendingRole = sessionStorage.getItem(`pending_role_${data.user.id}`) as Role | null;
            // Prefer the role they just tried to sign up with, or the intended role, or worker
            const chosenRole = pendingRole || intendedRole || "worker";
            await activeSupabase.from("user_roles").insert({
              user_id: data.user.id,
              role: chosenRole,
            });
            // Ensure profile row exists
            await activeSupabase.from("profiles").upsert({
              id: data.user.id,
              email: data.user.email,
            });
            sessionStorage.removeItem(`pending_role_${data.user.id}`);
            roleData = { role: chosenRole };
          }

          const userRole = roleData.role;
          toast.success("Successfully logged in!");

          if (userRole === "worker") {
            const { data: profile } = await activeSupabase
              .from("profiles")
              .select("full_name, mobile_number, qualification, skills, preferred_job_location, experience_years, willingness_to_migrate")
              .eq("id", data.user.id)
              .single();

            const isIncomplete =
              !profile?.full_name ||
              !profile?.mobile_number ||
              !profile?.qualification ||
              !profile?.skills?.length ||
              !profile?.preferred_job_location ||
              profile?.experience_years == null ||
              profile?.willingness_to_migrate == null;

            navigate(isIncomplete ? "/worker-profile-setup" : "/worker");
          } else if (userRole === "provider") {
            const { data: providerProfile } = await activeSupabase
              .from("provider_profiles")
              .select("company_name, contact_person, mobile_number")
              .eq("id", data.user.id)
              .maybeSingle();

            const isIncomplete =
              !providerProfile?.company_name ||
              !providerProfile?.contact_person ||
              !providerProfile?.mobile_number;

            navigate(isIncomplete ? "/provider-profile-setup" : "/provider");
          } else if (userRole === "admin") {
            navigate("/admin");
          } else {
            navigate("/");
          }
        }
      }
    } catch (err: any) {
      setError(err.message || t("error"));
    } finally {
      setLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <MailCheck className="h-8 w-8 text-secondary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h1>
            <p className="text-muted-foreground mb-4">
              We sent a verification link to <strong className="text-foreground">{email}</strong>.
              Please click the link in the email to verify your account before logging in.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              After verifying, return here and sign in.
            </p>
            <Button
              variant="outline"
              className="w-full touch-target"
              onClick={() => {
                setVerificationSent(false);
                setMode("login");
              }}
            >
              Back to Login
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Dynamic UI based on role
  const isWorker = role === "worker";
  const PortalIcon = isWorker ? HardHat : Building2;
  const iconColor = isWorker ? "text-primary-foreground" : "text-secondary-foreground";
  const iconBg = isWorker ? "gradient-hero" : "bg-secondary";

  const getTitle = () => {
    if (mode === "login") return t("signIn");
    if (intendedRole === "worker") return "Create Worker Account";
    if (intendedRole === "provider") return "Create Provider Account";
    return t("createAccount");
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-border bg-card p-4 sm:p-8">
          <div className="text-center mb-8">
            <div className={`w-20 h-20 rounded-2xl ${iconBg} p-0.5 flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-lg border-2 border-border/50`}>
              <img src="/portal-logo.png" alt="Migrant Connect Logo" className="w-full h-full object-cover rounded-2xl" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {getTitle()}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {intendedRole
                ? `Join Migrant Connect as a ${role}`
                : t("subtitle")}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive mb-4">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="touch-target"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="touch-target"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              variant={isWorker ? "hero" : "secondary"}
              className="w-full touch-target mt-6"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {mode === "login" ? t("signIn") : t("signUp")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              className={`text-sm hover:underline ${isWorker ? "text-primary" : "text-secondary"}`}
            >
              {mode === "login" ? t("noAccount") : t("hasAccount")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Login;
