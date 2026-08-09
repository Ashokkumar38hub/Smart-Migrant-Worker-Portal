import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import ChatDialog from "@/components/ChatDialog";
import ChatInbox from "@/components/ChatInbox";
import AIWorkerAssistant from "@/components/AIWorkerAssistant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase, MapPin, Home, UtensilsCrossed, Bus,
  Users, ArrowRight, Loader2, ChevronDown, ChevronUp, CheckCircle2, XCircle, ExternalLink, BookOpen,
  Phone, Mail, User, Building2, BedDouble, Star, X, Info, Search, Navigation, Activity, MessageCircle, ShieldCheck,
  ListOrdered, Youtube
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { ALL_JOBS, RECOMMENDED_COURSES } from "@/constants/jobs";
import { useNotifications } from "@/contexts/NotificationContext";
import { WORKER_SCHEMES } from "@/constants/schemes";




import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AccommodationOwner {
  name: string;
  phone: string;
  email: string;
  languages: string[];
}

interface Accommodation {
  id: string;
  name: string;
  address: string;
  description: string;
  capacity: number;
  availableRooms: number;
  rent: number;
  amenities: string[];
  rating: number;
  owner: AccommodationOwner;
}

interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  type: string;
  lat: number;
  lon: number;
  distance: number; // in km
  rent?: string;
  website?: string;
}

// Haversine formula to calculate distance between two lat/lon points in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}



interface WorkerProfile {
  preferred_job_location: string | null;
  skills: string[] | null;
  full_name?: string | null;
}

interface AppliedJob {
  id: string;
  job_id: string;
  status: string;
  applied_at: string;
  jobs: {
    title: string;
    company: string;
    location: string;
    salary_min: number | null;
    salary_max: number | null;
    provider_id: string;
  } | null;
}

const WorkerPortal = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "jobs");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [showOnlyNearby, setShowOnlyNearby] = useState(true);

  // Real-world Places State (Accommodations & Hospitals)
  const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useState("");
  const [searchingManual, setSearchingManual] = useState(false);
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

  const fetchProfileAndJobs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("preferred_job_location, skills, full_name")
        .eq("id", session.user.id)
        .single();
      setProfile(profileData);
      fetchUnreadCount(session.user.id);

      // Fetch job applications
      const { data: applicationsData } = await supabase
        .from("job_applications")
        .select(`
          id,
          job_id,
          status,
          applied_at,
          jobs (
            title,
            company,
            location,
            salary_min,
            salary_max,
            provider_id
          )
        `)
        .eq("worker_id", session.user.id)
        .order("applied_at", { ascending: false });

      setAppliedJobs(applicationsData as any || []);
    }

    // Always fetch active jobs, even for guest users
    const { data: jobsData, error: jobsError } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (jobsError) {
      console.error("Error fetching jobs in Worker Portal:", jobsError);
    }

    setJobs(jobsData || []);
    setLoadingProfile(false);
  };

  useEffect(() => {
    fetchProfileAndJobs();

    // Real-time subscription for chat notifications
    let channel: any;
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      channel = supabase
        .channel('chat-notifications')
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
    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const { addNotification } = useNotifications();

  // Fetch real-world places using OpenStreetMap Overpass API
  const fetchNearbyPlaces = async (lat: number, lon: number, isManualSearch = false, category: "accommodations" | "hospitals" = "accommodations") => {
    try {
      // Calculate a 5km Bounding Box (Square) around the coordinates for instant indexed lookups
      // 1 degree of latitude is roughly 111,000 meters.
      const latDelta = 5000 / 111000;
      const lonDelta = 5000 / (111000 * Math.cos(lat * (Math.PI / 180)));

      const minLat = lat - latDelta;
      const minLon = lon - lonDelta;
      const maxLat = lat + latDelta;
      const maxLon = lon + lonDelta;
      const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;

      // Build category-specific Overpass query
      let queryBody = "";
      if (category === "accommodations") {
        queryBody = `
          nwr["tourism"~"hostel|guest_house"](${bbox});
          nwr["amenity"~"dormitory"](${bbox});
        `;
      } else if (category === "hospitals") {
        queryBody = `
          nwr["amenity"~"hospital|clinic"](${bbox});
        `;
      }

      // Overpass QL query: optimized to prevent 504 Gateway Timeouts via bbox index
      const query = `
        [out:json][timeout:15];
        (
          ${queryBody}
        );
        out center;
      `;

      const OVERPASS_ENDPOINTS = [
        "https://lz4.overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass-api.de/api/interpreter"
      ];

      // Local timeout: 15 seconds max before giving up entirely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const fetchPromises = OVERPASS_ENDPOINTS.map(async (endpoint) => {
        const response = await fetch(`${endpoint}?t=${Date.now()}`, {
          method: "POST",
          body: query,
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Server ${endpoint} returned status ${response.status}`);
        }
        return await response.json();
      });

      let data;
      try {
        data = await Promise.any(fetchPromises);
      } catch (err) {
        throw new Error("All Overpass API servers failed or timed out.");
      } finally {
        clearTimeout(timeoutId);
      }

      const places: NearbyPlace[] = data.elements
        .filter((el: any) => el.tags && (el.tags.name || el.tags.operator))
        .map((el: any) => {
          const elementLat = el.lat || el.center?.lat;
          const elementLon = el.lon || el.center?.lon;
          const distance = calculateDistance(lat, lon, elementLat, elementLon);

          let address = [
            el.tags["addr:housenumber"],
            el.tags["addr:street"],
            el.tags["addr:city"]
          ].filter(Boolean).join(", ");

          if (!address) {
            address = "Address not listed";
          }

          let typeName = "Nearby Place";
          if (category === "accommodations") {
            typeName = el.tags.tourism === "hostel" ? "Hostel" :
              el.tags.tourism === "guest_house" ? "Guest House" :
                el.tags.amenity === "dormitory" ? "Dormitory" : "Rental Stay";
          } else if (category === "hospitals") {
            typeName = el.tags.amenity === "clinic" ? "Clinic" : "Hospital";
          }

          return {
            id: el.id.toString(),
            name: el.tags.name || el.tags.operator || "Unnamed Location",
            address: address,
            type: typeName,
            lat: elementLat,
            lon: elementLon,
            distance: distance,
            website: el.tags.website,
            rent: el.tags.fee === "no" ? "Free" : undefined // usually absent in OSM for residential
          };
        })
        .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance);

      // Ensure uniqueness by ID and limit to 25 items as requested
      const uniquePlaces = Array.from(new Map(places.map(p => [p.id, p])).values()).slice(0, 25);
      setNearbyPlaces(uniquePlaces);
    } catch (err) {
      console.error("Error fetching places:", err);
      if (isManualSearch) {
        setSearchError(`Failed to fetch ${category} for this area. Please try again later.`);
      } else {
        setLocationError(`Failed to fetch nearby ${category}. Please try again later.`);
      }
    } finally {
      setFetchingLocation(false);
    }
  };

  const requestLocation = (category: "accommodations" | "hospitals" = "accommodations") => {
    setFetchingLocation(true);
    setLocationError(null);
    setSearchError(null); // clear search error if doing GPS
    setNearbyPlaces([]); // clear old results

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setFetchingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        setUserLocation(coords);
        fetchNearbyPlaces(coords.lat, coords.lon, false, category);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setFetchingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. We need your location to find nearby accommodations.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable right now.");
            break;
          case error.TIMEOUT:
            setLocationError("The request to get user location timed out.");
            break;
          default:
            setLocationError("An unknown error occurred getting your location.");
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const getCategoryFromTab = (tab: string): "accommodations" | "hospitals" => {
    return tab === "hospitals" ? "hospitals" : "accommodations";
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLocation.trim()) return;

    setSearchingManual(true);
    setLocationError(null); // aggressively clear GPS lock
    setSearchError(null);
    setFetchingLocation(true);
    setNearbyPlaces([]); // clear old results

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualLocation)}&format=json&limit=1`, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      if (!response.ok) throw new Error("Failed to fetch location");
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setUserLocation({ lat, lon });
        await fetchNearbyPlaces(lat, lon, true, getCategoryFromTab(activeTab));
      } else {
        setSearchError(`Could not find coordinates for "${manualLocation}". Please try a different nearby area or city.`);
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      setSearchError("Error searching for location. Please try again.");
    } finally {
      setSearchingManual(false);
      setFetchingLocation(false);
    }
  };

  useEffect(() => {
    const category = getCategoryFromTab(activeTab);
    if (activeTab === "accommodations" || activeTab === "hospitals") {
      // Clear old results immediately when switching tabs to avoid showing stale data
      setNearbyPlaces([]);

      if (userLocation) {
        setFetchingLocation(true);
        fetchNearbyPlaces(userLocation.lat, userLocation.lon, false, category);
      } else if (!fetchingLocation && !locationError) {
        requestLocation(category);
      }
    }
  }, [activeTab]);

  const location = useLocation();

  useEffect(() => {
    fetchProfileAndJobs();
  }, [location.pathname]);

  // Check user role and redirect if provider
  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (roleData?.role === "provider") {
        toast.error("Access Denied: You are registered as a provider. Redirecting...");
        navigate("/provider");
      }
    };
    checkRole();
  }, [navigate]);

  // Sync tab with URL search params
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["jobs", "accommodations", "hospitals", "schemes", "applied"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    // Realtime listener for job status changes and additions
    const jobsChannel = supabase
      .channel("worker_jobs_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
        },
        () => {
          console.log("Jobs updated, refetching...");
          fetchProfileAndJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobsChannel);
    };
  }, []);

  const handleApply = async (jobId: string, jobTitle: string) => {
    setApplyingId(jobId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error(t("loginToApply"));
        return;
      }

      const { error } = await supabase
        .from("job_applications")
        .insert({
          job_id: jobId,
          worker_id: session.user.id,
          status: "pending",
        });

      if (error) {
        if (error.code === "23505") {
          toast.info("You have already applied for this job.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success(t("applySuccess").replace("{job}", jobTitle));

        // Notify Provider
        const job = jobs.find(j => j.id === jobId);
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
      toast.error(t("applyFailed"));
    } finally {
      setApplyingId(null);
    }
  };

  const userLoc = profile?.preferred_job_location?.toLowerCase() || "";

  // Use provider-posted Supabase jobs only.
  // STRICTLY filter for 'active' jobs only.
  const mergedJobs = jobs.filter(j => j.status === "active");

  const processedJobs = mergedJobs.filter(job => {
    if (!showOnlyNearby || !userLoc) return true;
    return (job.location || "").toLowerCase().includes(userLoc);
  }).sort((a, b) => {
    const skills = profile?.skills || [];
    const lowerSkills = skills.filter(Boolean).map(s => s.toString().toLowerCase());
    const aRequiredSkills: string[] = (a.required_skills || []).filter(Boolean);
    const bRequiredSkills: string[] = (b.required_skills || []).filter(Boolean);
    const aMatched = lowerSkills.filter(s => aRequiredSkills.some((rs) => (rs || "").toString().toLowerCase() === s)).length;
    const bMatched = lowerSkills.filter(s => bRequiredSkills.some((rs) => (rs || "").toString().toLowerCase() === s)).length;
    // Calculate percentage — jobs with no required skills count as 100%
    const aScore = aRequiredSkills.length > 0 ? (aMatched / aRequiredSkills.length) * 100 : 100;
    const bScore = bRequiredSkills.length > 0 ? (bMatched / bRequiredSkills.length) * 100 : 100;
    return bScore - aScore; // descending: 100% first
  });

  const nearbyCount = mergedJobs.filter(j => userLoc && (j.location || "").toLowerCase().includes(userLoc)).length;

  if (loadingProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] py-6 px-4">
      <div className="container mx-auto py-6 px-2 sm:px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("workerPortal")}</h1>
            <p className="text-muted-foreground italic">
              {profile?.preferred_job_location
                ? `Welcome back, ${profile.full_name || 'Worker'}! Optimized for ${profile.preferred_job_location}`
                : t("heroSubtitle")}
            </p>
          </div>

          {activeTab === "jobs" && (
            <div className="flex flex-wrap items-center gap-2 bg-muted p-1 rounded-lg mt-4 sm:mt-0">
              <button
                onClick={() => setShowOnlyNearby(true)}
                className={`text-xs px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${showOnlyNearby ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {t("nearby")} ({nearbyCount})
              </button>
              <button
                onClick={() => setShowOnlyNearby(false)}
                className={`text-xs px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${!showOnlyNearby ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {t("allJobs")} ({mergedJobs.length})
              </button>
            </div>
          )}
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted mb-6 inline-flex w-fit flex-wrap h-auto">
            {(activeTab === "jobs" || activeTab === "applied") && (
              <>
                <motion.div whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                  <TabsTrigger value="jobs" className="touch-target gap-2 text-sm w-full">
                    <Briefcase className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t("jobs")}</span>
                  </TabsTrigger>
                </motion.div>
                <motion.div whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                  <TabsTrigger value="applied" className="touch-target gap-2 text-sm w-full">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t("appliedTab")}</span>
                  </TabsTrigger>
                </motion.div>
              </>
            )}
            {activeTab === "accommodations" && (
              <motion.div whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                <TabsTrigger value="accommodations" className="touch-target gap-2 text-sm w-full">
                  <Home className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t("accommodations")}</span>
                </TabsTrigger>
              </motion.div>
            )}
            {activeTab === "hospitals" && (
              <motion.div whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                <TabsTrigger value="hospitals" className="touch-target gap-2 text-sm w-full">
                  <Activity className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t("healthcareSupport")}</span>
                </TabsTrigger>
              </motion.div>
            )}
            {activeTab === "schemes" && (
              <motion.div whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                <TabsTrigger value="schemes" className="touch-target gap-2 text-sm w-full">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t("workerSupportSchemes")}</span>
                </TabsTrigger>
              </motion.div>
            )}
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs">
            <div className="grid gap-4">
              {processedJobs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>{t("noNearbyJobs").replace("{status}", showOnlyNearby ? t("nearby").toLowerCase() : t("active").toLowerCase())}</p>
                </div>
              ) : processedJobs.map((job, index) => {
                // Matching Logic with robustness (trimming and case-insensitivity)
                const workerSkills = (profile?.skills || []).filter(Boolean).map((s: any) => s.toString().trim().toLowerCase());
                const jobRequiredSkills = (job.required_skills || []).filter(Boolean).map((s: any) => s.toString().trim());

                const matchedSkills = jobRequiredSkills.filter((s: string) => workerSkills.includes(s.toLowerCase()));
                const lowerWorkerSkills = workerSkills;
                const userLoc = profile?.preferred_job_location?.toLowerCase() || "";

                const matchScore = jobRequiredSkills.length > 0
                  ? Math.round((matchedSkills.length / jobRequiredSkills.length) * 100)
                  : 100;

                const getScoreColor = (score: number) => {
                  if (score >= 80) return "bg-green-500";
                  if (score >= 50) return "bg-amber-500";
                  return "bg-red-500";
                };

                const getScoreTextColor = (score: number) => {
                  if (score >= 80) return "text-green-500";
                  if (score >= 50) return "text-amber-500";
                  return "text-red-500";
                };

                const isLocationMatch = userLoc && (job.location || "").toLowerCase().includes(userLoc);
                const hasApplied = appliedJobs.some((a) => a.job_id === job.id);

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 0.99 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ 
                      delay: index * 0.08,
                      type: "spring",
                      stiffness: 400,
                      damping: 17
                    }}
                    className={`rounded-lg border bg-card overflow-hidden transition-all duration-300 ${isLocationMatch ? "border-primary/40" : "border-border"} hover:shadow-md cursor-pointer`}
                    onClick={() => navigate(`/job/${job.id}`)}
                  >
                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-foreground">{job.title}</h3>
                            {isLocationMatch && (
                              <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                                📍 {t("nearYou")}
                              </Badge>
                            )}
                            {hasApplied && (
                              <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 border-blue-200 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> {t("appliedTab")}
                              </Badge>
                            )}
                            <Badge variant="outline" className={`text-xs ml-auto sm:ml-0 font-bold ${getScoreTextColor(matchScore)}`}>
                              {matchScore}% {t("match")}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground flex items-center gap-1 mt-1">
                            <Briefcase className="h-4 w-4" /> {job.company}
                          </p>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-4 w-4" /> {job.location}
                          </p>
                          <p className="text-primary font-semibold flex items-center gap-1 mt-2">
                            ₹{job.salary_min?.toLocaleString()} - ₹{job.salary_max?.toLocaleString()}{t("perMonth")}
                          </p>

                          <div className="flex flex-wrap gap-2 mt-4">
                            {jobRequiredSkills.slice(0, 3).map((skill: string) => (
                              <Badge
                                key={skill}
                                variant={lowerWorkerSkills.includes(skill.toLowerCase()) ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {jobRequiredSkills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{jobRequiredSkills.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="self-center">
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary">
                            <ArrowRight className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          {/* Accommodations Tab - Real GPS Based */}
          <TabsContent value="accommodations">
            <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  {t("nearbyAccommodations")}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {t("accommSubtitle")}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 items-stretch sm:items-center">
                <form onSubmit={handleManualSearch} className="flex flex-1 sm:w-80 gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("searchHint")}
                      className="pl-9 bg-background"
                      value={manualLocation}
                      onChange={(e) => setManualLocation(e.target.value)}
                      disabled={fetchingLocation || searchingManual}
                    />
                  </div>
                  <Button type="submit" disabled={!manualLocation.trim() || fetchingLocation || searchingManual} className="shrink-0 gap-2">
                    {searchingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {t("search")}
                  </Button>
                </form>

                <div className="hidden sm:block w-px h-8 bg-border"></div>

                <Button
                  onClick={() => requestLocation("accommodations")}
                  disabled={fetchingLocation || searchingManual}
                  variant="outline"
                  className="shrink-0 gap-2"
                  type="button"
                >
                  {fetchingLocation && !searchingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  {fetchingLocation && !searchingManual ? t("locating") : t("useGPS")}
                </Button>
              </div>
            </div>

            {fetchingLocation ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping blur-xl"></div>
                  <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center relative">
                    <MapPin className="h-10 w-10 text-primary animate-bounce" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">Scanning for places...</p>
                  <p className="text-muted-foreground text-sm">Searching within a 5km radius</p>
                </div>
              </div>
            ) : locationError && !userLocation ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8 text-center max-w-2xl mx-auto mt-8">
                <MapPin className="h-12 w-12 text-destructive mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-destructive mb-2">Location Required</h3>
                <p className="text-muted-foreground mb-6">{locationError}</p>
                <div className="flex justify-center gap-4">
                  <Button onClick={() => requestLocation("accommodations")} variant="destructive">Try GPS Again</Button>
                </div>
              </div>
            ) : searchError ? (
              <div className="bg-muted/30 border border-destructive/20 rounded-xl p-8 text-center max-w-2xl mx-auto mt-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-foreground mb-2">Search Failed</h3>
                <p className="text-muted-foreground mb-6">{searchError}</p>
              </div>
            ) : nearbyPlaces.length === 0 && userLocation ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed">
                <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-xl font-bold mb-2">No Accommodations Found</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  No nearby accommodations found for this location.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {nearbyPlaces.map((place) => (
                  <motion.div
                    key={place.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group border border-border rounded-xl bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all flex flex-col"
                  >
                    <div className="p-5 flex-1 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <Badge variant="outline" className="mb-2 bg-primary/5 text-primary border-primary/20">
                            {place.type}
                          </Badge>
                          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                            {place.name}
                          </h3>
                        </div>
                        <Badge variant="secondary" className="shrink-0 bg-secondary/50 font-bold">
                          {place.distance.toFixed(1)} km away
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed">{place.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/30 p-4 border-t border-border flex items-center justify-between gap-4">
                      {place.website ? (
                        <a
                          href={place.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" /> {t("visitWebsite")}
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground italic flex-1">
                          {t("searchMapsHint")}
                        </p>
                      )}
                      <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        className="shrink-0 group/btn font-bold cursor-pointer"
                      >
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MapPin className="h-4 w-4 mr-2 group-hover/btn:animate-bounce" />
                          {t("directions")}
                        </a>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Hospitals Tab */}
          <TabsContent value="hospitals" className="m-0 space-y-6 outline-none">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-muted/30 p-4 sm:p-6 rounded-2xl border border-border/50">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  {t("nearbyAccommodations").replace(t("accommodations"), t("healthcareSupport"))}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {t("findHealthcare")}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 items-stretch sm:items-center">
                <form onSubmit={handleManualSearch} className="flex flex-1 sm:w-80 gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("searchHint")}
                      className="pl-9 bg-background"
                      value={manualLocation}
                      onChange={(e) => setManualLocation(e.target.value)}
                      disabled={fetchingLocation || searchingManual}
                    />
                  </div>
                  <Button type="submit" disabled={!manualLocation.trim() || fetchingLocation || searchingManual} className="shrink-0 gap-2">
                    {searchingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </Button>
                </form>

                <div className="hidden sm:block w-px h-8 bg-border"></div>

                <Button
                  onClick={() => requestLocation("hospitals")}
                  disabled={fetchingLocation || searchingManual}
                  variant="outline"
                  className="shrink-0 gap-2"
                  type="button"
                >
                  {fetchingLocation && !searchingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  {fetchingLocation && !searchingManual ? t("locating") : t("useGPS")}
                </Button>
              </div>
            </div>

            {fetchingLocation ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping blur-xl"></div>
                  <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center relative">
                    <Activity className="h-10 w-10 text-primary animate-bounce" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{t("scanningMedical")}</p>
                  <p className="text-muted-foreground text-sm">{t("searchRadius")}</p>
                </div>
              </div>
            ) : locationError && !userLocation ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8 text-center max-w-2xl mx-auto mt-8">
                <MapPin className="h-12 w-12 text-destructive mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-destructive mb-2">Location Required</h3>
                <p className="text-muted-foreground mb-6">{locationError}</p>
                <div className="flex justify-center gap-4">
                  <Button onClick={() => requestLocation("hospitals")} variant="destructive">Try GPS Again</Button>
                </div>
              </div>
            ) : searchError ? (
              <div className="bg-muted/30 border border-destructive/20 rounded-xl p-8 text-center max-w-2xl mx-auto mt-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-foreground mb-2">Search Failed</h3>
                <p className="text-muted-foreground mb-6">{searchError}</p>
              </div>
            ) : nearbyPlaces.length === 0 && userLocation ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed">
                <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-xl font-bold mb-2">No Medical Facilities Found</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  No nearby medical facilities found for this location.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {nearbyPlaces.map((place) => (
                  <motion.div
                    key={place.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col"
                  >
                    {/* Card top section */}
                    <div className="p-5 flex-1 space-y-3">
                      {/* Badges row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-orange-500/15 text-orange-400 border border-orange-500/30 text-xs font-semibold px-3 py-1 rounded-full">
                          {place.type}
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-teal-500/15 text-teal-400 border border-teal-500/30 text-xs font-bold px-3 py-1 rounded-full">
                          {place.distance.toFixed(1)} km away
                        </span>
                      </div>

                      {/* Hospital name */}
                      <h3 className="font-bold text-lg leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {place.name}
                      </h3>

                      {/* Address */}
                      <p className="text-sm text-muted-foreground flex items-start gap-2">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{place.address}</span>
                      </p>
                    </div>

                    {/* Divider + footer */}
                    <div className="border-t border-border px-5 py-3 flex items-center justify-between gap-3 bg-muted/20">
                      {place.website ? (
                        <a
                          href={place.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary font-semibold hover:underline flex items-center gap-1.5"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Visit Website
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Search maps for contact info.
                        </p>
                      )}
                      <Button
                        asChild
                        className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0 cursor-pointer"
                      >
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <MapPin className="h-4 w-4" />
                          Directions
                        </a>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Applied Jobs Tab */}
          <TabsContent value="applied">
            <div className="grid gap-4">
              {appliedJobs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>You haven't applied for any jobs yet.</p>
                </div>
              ) : (
                appliedJobs.map((app, index) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="rounded-lg border bg-card overflow-hidden transition-all duration-300 border-border hover:shadow-md cursor-pointer"
                    onClick={() => navigate(`/job/${app.job_id}`)}
                  >
                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-foreground">{app.jobs?.title || "Unknown Job"}</h3>
                            <Badge className={`text-xs ${app.status === 'accepted' ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                              app.status === 'rejected' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                                'bg-amber-500/20 text-amber-500 border-amber-500/30'
                              }`}>
                              {(app.status || "pending").charAt(0).toUpperCase() + (app.status || "pending").slice(1)}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground flex items-center gap-1 mt-1">
                            <Briefcase className="h-4 w-4" /> {app.jobs?.company || "Unknown Company"}
                          </p>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-4 w-4" /> {app.jobs?.location || "Unknown Location"}
                          </p>
                          {app.jobs?.salary_min && (
                            <p className="text-primary font-semibold flex items-center gap-1 mt-2">
                              ₹{app.jobs.salary_min?.toLocaleString()} - ₹{app.jobs.salary_max?.toLocaleString()}{t("perMonth")}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-4">
                            Applied on {new Date(app.applied_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 items-center">
                          {app.status === 'accepted' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 border-primary text-primary hover:bg-primary/5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setChatData({
                                  jobId: app.job_id,
                                  jobName: app.jobs?.title || "",
                                  receiverId: app.jobs?.provider_id || "",
                                  receiverName: app.jobs?.company || "Provider"
                                });
                                setChatOpen(true);
                              }}
                            >
                              <MessageCircle className="h-4 w-4" />
                              Chat
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary">
                            <ArrowRight className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Schemes Tab */}
          <TabsContent value="schemes" className="m-0 space-y-6 outline-none">
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-6 rounded-2xl border border-indigo-500/20">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="h-6 w-6 text-indigo-500" />
                <h2 className="text-2xl font-bold italic">Worker Support Schemes</h2>
              </div>
              <p className="text-muted-foreground">Government welfare programs and social security benefits specifically for migrant and unorganized workers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WORKER_SCHEMES.map((scheme, idx) => (
                <motion.div
                  key={scheme.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-card border border-border rounded-xl overflow-hidden hover:border-indigo-500/40 hover:shadow-lg transition-all flex flex-col"
                >
                  <div className="p-5 flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="bg-indigo-500/5 text-indigo-400 border-indigo-500/20">
                        {scheme.category}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold group-hover:text-indigo-400 transition-colors">{scheme.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{scheme.description}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Key Benefits</p>
                      <ul className="space-y-1.5">
                        {scheme.benefits.map((benefit, bIdx) => (
                          <li key={bIdx} className="text-xs flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="pt-2 space-y-3">
                      <p className="text-xs italic bg-muted/30 p-2 rounded-md border border-border/50">
                        <span className="font-bold not-italic mr-1">Eligibility:</span> {scheme.eligibility}
                      </p>

                      <Accordion type="single" collapsible className="w-full border-none">
                        <AccordionItem value="how-to-apply" className="border-none">
                          <AccordionTrigger className="py-2 hover:no-underline hover:bg-muted/30 rounded-lg px-2 text-xs font-bold text-indigo-400 border border-indigo-500/10 transition-colors">
                            <div className="flex items-center gap-2">
                              <ListOrdered className="h-3.5 w-3.5" />
                              How to Apply
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-1 pb-2 px-2">
                            <ul className="space-y-2 pt-2">
                              {scheme.howToApply.map((step, sIdx) => (
                                <li key={sIdx} className="text-xs flex gap-2 text-muted-foreground leading-relaxed">
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                                    {sIdx + 1}
                                  </span>
                                  <span className="pt-0.5">{step}</span>
                                </li>
                              ))}
                            </ul>
                            
                            {scheme.videoUrl && (
                              <div className="mt-4 pt-3 border-t border-border/50">
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="w-full gap-2 border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 font-bold"
                                >
                                  <a href={scheme.videoUrl} target="_blank" rel="noopener noreferrer">
                                    <Youtube className="h-4 w-4" />
                                    Watch Video Guide
                                  </a>
                                </Button>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-muted/20 border-t border-border mt-auto">
                    <Button
                      asChild
                      variant="ghost"
                      className="w-full justify-between text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 p-0 h-auto font-bold cursor-pointer"
                    >
                      <a href={scheme.link} target="_blank" rel="noopener noreferrer">
                        Apply / More Info
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

        </Tabs>
      </div>

      {/* Floating Chat Button */}
      <Button
        className="fixed bottom-24 right-6 md:bottom-6 md:right-24 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-40 flex items-center justify-center p-0 bg-primary text-primary-foreground"
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
        currentUserRole="worker"
      />

      <ChatInbox
        isOpen={isInboxOpen}
        onOpenChange={setIsInboxOpen}
        onSelectChat={(jobId, jobName, receiverId, receiverName) => {
          setChatData({ jobId, jobName, receiverId, receiverName });
          setChatOpen(true);
        }}
      />

      <AIWorkerAssistant
        profile={profile}
        jobs={mergedJobs}
        appliedJobs={appliedJobs}
        onTabChange={setActiveTab}
      />
    </main>
  );
};

export default WorkerPortal;
