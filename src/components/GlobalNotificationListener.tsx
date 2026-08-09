import { useEffect } from "react";
import { workerSupabase, providerSupabase } from "@/lib/supabase";
import { useNotifications } from "@/contexts/NotificationContext";

const GlobalNotificationListener = () => {
    const { addNotification } = useNotifications();

    useEffect(() => {
        let appsChannel: any;
        let jobsChannel: any;
        let notificationsChannel: any;

        const setupListeners = async () => {
            // Check both clients for a session
            const [workerSession, providerSession] = await Promise.all([
                workerSupabase.auth.getSession(),
                providerSupabase.auth.getSession()
            ]);

            const isAdmin = sessionStorage.getItem("adminAuth") === "true";
            const session = workerSession.data.session || providerSession.data.session;
            const activeSupabase = workerSession.data.session ? workerSupabase : providerSupabase;

            if (!session?.user && !isAdmin) {
                console.log("No session found in either Supabase client and not admin for GlobalNotificationListener");
                return;
            }

            const userId = session?.user?.id;
            console.log("Setting up notification listeners for user:", userId, "isAdmin:", isAdmin);

            // Cleanup old channels if they exist
            if (appsChannel) activeSupabase.removeChannel(appsChannel);
            if (jobsChannel) activeSupabase.removeChannel(jobsChannel);
            if (notificationsChannel) activeSupabase.removeChannel(notificationsChannel);

            if (userId) {
                // 1. Listen for Application Acceptance
                appsChannel = activeSupabase
                .channel("global_application_updates")
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "job_applications",
                        filter: `worker_id=eq.${userId}`,
                    },
                    async (payload) => {
                        console.log("Received application update event:", payload);
                        const newApp = payload.new;
                        const oldApp = payload.old;

                        if (newApp.status === "accepted" && oldApp.status !== "accepted") {
                            console.log("Application accepted! Preparing notification...");
                            // Fetch job title
                            const { data: jobData } = await activeSupabase
                                .from("jobs")
                                .select("title")
                                .eq("id", newApp.job_id)
                                .single();

                            addNotification({
                                title: "Application Accepted! 🎉",
                                message: `Your application has been accepted for ${jobData?.title || 'the job'}.`,
                                type: "system",
                                link: `/job/${newApp.job_id}`,
                            });
                        }
                    }
                )
                .subscribe((status) => {
                    console.log("Application updates subscription status:", status);
                });

            // 2. Listen for New Job Matches (if worker profile exists)
            const { data: profile } = await activeSupabase
                .from("profiles")
                .select("preferred_job_location")
                .eq("id", userId)
                .maybeSingle();

            if (profile?.preferred_job_location) {
                console.log("Setting up job match listener for location:", profile.preferred_job_location);
                jobsChannel = activeSupabase
                    .channel("global_job_matches")
                    .on(
                        "postgres_changes",
                        {
                            event: "INSERT",
                            schema: "public",
                            table: "jobs",
                            filter: "status=eq.active",
                        },
                        (payload) => {
                            const newJob = payload.new;
                            console.log("New job posted:", newJob);
                            if (
                                newJob.location &&
                                newJob.location.toLowerCase().includes(profile.preferred_job_location.toLowerCase())
                            ) {
                                addNotification({
                                    title: "New Job Match!",
                                    message: `A new ${newJob.title} position is available in ${newJob.location}.`,
                                    type: "job_match",
                                    link: `/job/${newJob.id}`,
                                });
                            }
                        }
                    )
                    .subscribe((status) => {
                        console.log("Job match subscription status:", status);
                    });
            }

            // 3. Listen for System Notifications (Generic)
            notificationsChannel = activeSupabase
                .channel("global_system_notifications")
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "notifications",
                        filter: `user_id=eq.${userId}`,
                    },
                    (payload) => {
                        const newNotif = payload.new;
                        console.log("New system notification:", newNotif);
                        addNotification({
                            title: newNotif.title,
                            message: newNotif.message,
                            type: (newNotif.type as any) || "system",
                            link: newNotif.link,
                        });
                    }
                )
                    .subscribe((status) => {
                        console.log("System notifications subscription status:", status);
                    });

                // 4. Listen for New Applications (For Providers)
                const { data: roleData } = await activeSupabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", userId)
                    .maybeSingle();

                if (roleData?.role === "provider") {
                console.log("Setting up provider notification listener for user:", userId);
                activeSupabase
                    .channel("provider_notifications")
                    .on(
                        "postgres_changes",
                        {
                            event: "INSERT",
                            schema: "public",
                            table: "job_applications"
                        },
                        async (payload) => {
                            const newApp = payload.new;
                            // Verify if the job belongs to this provider
                            const { data: jobData } = await activeSupabase
                                .from("jobs")
                                .select("provider_id")
                                .eq("id", newApp.job_id)
                                .single();
                            
                            if (jobData?.provider_id === userId) {
                                addNotification({
                                    title: "New Job Application! 📝",
                                    message: "New applicants are waiting for your posted job.",
                                    type: "system",
                                    link: "/provider?tab=applications"
                                });
                            }
                        }
                    )
                    .subscribe();
                }
            } // end of if (userId) block

            // 5. Listen for New Reports (For Admins)
            let isUserAdmin = false;
            if (userId) {
                const { data: roleData } = await activeSupabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", userId)
                    .maybeSingle();
                if (roleData?.role === "admin") isUserAdmin = true;
            }

            if (isAdmin || isUserAdmin) {
                console.log("Setting up admin notification listener...");
                activeSupabase
                    .channel("admin_notifications")
                    .on(
                        "postgres_changes",
                        {
                            event: "INSERT",
                            schema: "public",
                            table: "reports"
                        },
                        () => {
                            addNotification({
                                title: "New Report Submitted 🚩",
                                message: "A worker or provider has submitted a new report for review.",
                                type: "system",
                                link: "/admin?tab=reports"
                            });
                        }
                    )
                    .subscribe();
            }
        };

        setupListeners();

        // Listen for auth changes on BOTH to re-setup or tear down
        const workerAuth = workerSupabase.auth.onAuthStateChange((event) => {
            console.log("Worker Auth event:", event);
            if (event === "SIGNED_IN" || event === "INITIAL_SESSION") setupListeners();
            else if (event === "SIGNED_OUT") setupListeners(); // Re-check if provider is still in
        });

        const providerAuth = providerSupabase.auth.onAuthStateChange((event) => {
            console.log("Provider Auth event:", event);
            if (event === "SIGNED_IN" || event === "INITIAL_SESSION") setupListeners();
            else if (event === "SIGNED_OUT") setupListeners(); // Re-check if worker is still in
        });

        return () => {
            workerAuth.data.subscription.unsubscribe();
            providerAuth.data.subscription.unsubscribe();
            // ... cleanup channels (handled in setupListeners or using activeSupabase logic)
            // To be safe, try removing from both
            workerSupabase.removeAllChannels();
            providerSupabase.removeAllChannels();
        };
    }, [addNotification]);

    return null;
};

export default GlobalNotificationListener;
