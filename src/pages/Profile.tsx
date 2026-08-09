import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Building2, User, Phone, Mail, MapPin,
    Briefcase, LogOut, ChevronLeft, Loader2,
    GraduationCap, Award, Globe
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Profile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        const getProfile = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    navigate("/login");
                    return;
                }
                setUser(session.user);

                // Fetch user role
                const { data: roleData } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", session.user.id)
                    .maybeSingle();

                const userRole = roleData?.role || "worker";
                setRole(userRole);

                let data, error;
                if (userRole === "provider") {
                    const result = await supabase
                        .from("provider_profiles")
                        .select("*")
                        .eq("id", session.user.id)
                        .maybeSingle();
                    data = result.data;
                    error = result.error;
                } else {
                    // Default to worker (profiles table)
                    const result = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", session.user.id)
                        .maybeSingle();
                    data = result.data;
                    error = result.error;
                }

                if (error) throw error;
                setProfile(data);
            } catch (err: any) {
                toast.error("Failed to load profile details");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        getProfile();
    }, [navigate]);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error("Logout failed");
        } else {
            sessionStorage.removeItem("last_portal_context");
            navigate("/");
        }
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const isProvider = role === "provider";

    return (
        <main className="min-h-[calc(100vh-4rem)] py-8 px-2 sm:px-4 bg-muted/30">
            <div className="container mx-auto max-w-3xl">
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
                        Back
                    </Button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <Card className="border-border overflow-hidden">
                        <div className={`h-32 border-b border-border ${isProvider ? 'bg-gradient-to-r from-primary/20 via-primary/10 to-transparent' : 'bg-gradient-to-r from-secondary/20 via-secondary/10 to-transparent'}`} />
                        <CardHeader className="relative -mt-16 pb-0">
                            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                                <div className="w-24 h-24 rounded-2xl bg-card border-4 border-card shadow-xl flex items-center justify-center">
                                    {isProvider ? (
                                        <Building2 className="h-12 w-12 text-primary" />
                                    ) : (
                                        <User className="h-12 w-12 text-secondary" />
                                    )}
                                </div>
                                <div className="mb-2">
                                    <h1 className="text-3xl font-bold text-foreground">
                                        {isProvider ? (profile?.company_name || "Company Profile") : (profile?.full_name || "Worker Profile")}
                                    </h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="secondary" className={`border-none ${isProvider ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-secondary/10 text-secondary hover:bg-secondary/20'}`}>
                                            {isProvider ? (profile?.industry_type || "Provider") : "Worker"}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {isProvider
                                                ? (profile?.company_city ? `${profile.company_city}, ${profile.company_state}` : "Location not set")
                                                : (profile?.preferred_job_location || "Location not set")
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-8 space-y-8">
                            {/* Profile Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Contact/Personal Details */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                                        {isProvider ? "Contact Person" : "Personal Details"}
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Name</p>
                                                <p className="text-sm font-medium">
                                                    {isProvider ? (profile?.contact_person || "Not provided") : (profile?.full_name || "Not provided")}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Mobile</p>
                                                <p className="text-sm font-medium">
                                                    {profile?.mobile_number || "Not provided"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Email</p>
                                                <p className="text-sm font-medium">{isProvider ? (profile?.contact_email || user?.email) : user?.email}</p>
                                            </div>
                                        </div>
                                        {!isProvider && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Preferred Location</p>
                                                    <p className="text-sm font-medium">{profile?.preferred_job_location || "Not provided"}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Role Specific Details: Address or Skills/Qual */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                                        {isProvider ? "Office Address" : "Education & Skills"}
                                    </h3>
                                    {isProvider ? (
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-sm leading-relaxed text-foreground">
                                                    {profile?.company_address || "Address not provided"}
                                                </p>
                                                {(profile?.company_city || profile?.company_state) && (
                                                    <p className="text-sm font-medium mt-1">
                                                        {profile?.company_city}, {profile?.company_state}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Qualification</p>
                                                    <p className="text-sm font-medium">{profile?.qualification || "Not set"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                    <Award className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Experience</p>
                                                    <p className="text-sm font-medium">{profile?.experience_years != null ? `${profile.experience_years} Years` : "Not set"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Willing to Migrate</p>
                                                    <p className="text-sm font-medium">{profile?.willingness_to_migrate ? "Yes" : "No"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Worker Skills Section */}
                            {!isProvider && profile?.skills && profile.skills.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                                        Specialized Skills
                                    </h3>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {profile.skills.map((skill: string) => (
                                            <Badge key={skill} variant="secondary" className="bg-secondary/10 text-secondary hover:bg-secondary/20 border-none px-3 py-1">
                                                {skill}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description Section */}
                            {isProvider && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                                        About Company
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
                                        {profile?.company_details || "No company description provided. Complete your profile to build trust with workers."}
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-6 flex flex-col sm:flex-row gap-4">
                                <Button
                                    className="sm:flex-1 h-11 border-border hover:bg-muted hover:text-foreground text-muted-foreground"
                                    variant="outline"
                                    onClick={() => navigate(isProvider ? "/provider-profile-setup" : "/worker-profile-setup")}
                                >
                                    <Briefcase className="h-4 w-4 mr-2" />
                                    Edit Profile Details
                                </Button>
                                <Button
                                    className="sm:flex-1 h-11 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-none"
                                    variant="outline"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Logout from Session
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </main>
    );
};

export default Profile;

