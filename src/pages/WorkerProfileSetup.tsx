import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SkillInput from "@/components/SkillInput";


const WorkerProfileSetup = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [qualification, setQualification] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [preferredLocation, setPreferredLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [willingToMigrate, setWillingToMigrate] = useState("no");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate("/login");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error.message);
        } else if (data) {
          setFullName(data.full_name || "");
          setMobileNumber(data.mobile_number || "");
          setQualification(data.qualification || "");
          setSelectedSkills(data.skills || []);
          setPreferredLocation(data.preferred_job_location || "");
          setExperience(data.experience_years?.toString() || "");
          setWillingToMigrate(data.willingness_to_migrate ? "yes" : "no");
        }
      } catch (err: any) {
        console.error("Unexpected error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Not logged in. Please log in first.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          mobile_number: mobileNumber,
          qualification,
          skills: selectedSkills,
          preferred_job_location: preferredLocation,
          experience_years: experience ? Number(experience) : 0,
          willingness_to_migrate: willingToMigrate === "yes",
        })
        .eq("id", session.user.id);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Profile saved successfully!");
        navigate("/worker");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Worker Profile Setup</CardTitle>
          <CardDescription>Complete your profile to get matched with jobs.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobileNumber">Mobile Number *</Label>
                <Input
                  id="mobileNumber"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. 9876543210"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualification">Qualification *</Label>
              <Input
                id="qualification"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. ITI, Diploma, 10th Pass"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Skills</Label>
              <SkillInput
                selectedSkills={selectedSkills}
                onChange={setSelectedSkills}
                placeholder="Search or type a new skill..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Preferred Job Location *</Label>
              <Input
                id="location"
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                placeholder="e.g. Chennai, Coimbatore"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experience (years)</Label>
              <Input id="experience" type="number" min={0} value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="0" />
            </div>

            <div className="space-y-2">
              <Label>Willingness to Migrate</Label>
              <RadioGroup value={willingToMigrate} onValueChange={setWillingToMigrate} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="migrate-yes" />
                  <Label htmlFor="migrate-yes" className="font-normal">Yes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="migrate-no" />
                  <Label htmlFor="migrate-no" className="font-normal">No</Label>
                </div>
              </RadioGroup>
            </div>

            <Button type="submit" className="w-full" variant="hero" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Profile & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default WorkerProfileSetup;
