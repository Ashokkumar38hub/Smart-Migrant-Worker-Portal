import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { Loader2, Building2, User, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

const ProviderProfileSetup = () => {
  const navigate = useNavigate();

  // Personal details
  const [contactPerson, setContactPerson] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");

  // Company details
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companyState, setCompanyState] = useState("");
  const [industryType, setIndustryType] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");

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
          .from("provider_profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error.message);
        } else if (data) {
          setContactPerson(data.contact_person || "");
          setMobileNumber(data.mobile_number || "");
          setEmail(data.contact_email || "");
          setCompanyName(data.company_name || "");
          setCompanyAddress(data.company_address || "");
          setCompanyCity(data.company_city || "");
          setCompanyState(data.company_state || "");
          setIndustryType(data.industry_type || "");
          setCompanyDescription(data.company_details || "");
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
        .from("provider_profiles")
        .upsert({
          id: session.user.id,
          contact_person: contactPerson,
          mobile_number: mobileNumber,
          contact_email: email || session.user.email,
          company_name: companyName,
          company_address: companyAddress,
          company_city: companyCity,
          company_state: companyState,
          industry_type: industryType,
          company_details: companyDescription,
        });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Provider profile saved successfully!");
        navigate("/provider");
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
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full gradient-hero flex items-center justify-center mx-auto mb-3">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Provider Profile Setup</CardTitle>
          <CardDescription>Complete your profile to start posting jobs and finding skilled workers.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal / Contact Details Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Contact Person Details</h3>
              </div>
              <div className="space-y-4 pl-7">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Full Name *</Label>
                    <Input
                      id="contactPerson"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number *</Label>
                    <div className="flex gap-2">
                      <span className="flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground">+91</span>
                      <Input
                        id="mobileNumber"
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="e.g. 9876543210"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rajesh@company.com (optional, defaults to login email)"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Company Details Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Company Details</h3>
              </div>
              <div className="space-y-4 pl-7">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. TN Builders Pvt Ltd"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industryType">Industry Type *</Label>
                    <Input
                      id="industryType"
                      value={industryType}
                      onChange={(e) => setIndustryType(e.target.value)}
                      placeholder="e.g. Construction, Manufacturing"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Company Address *</Label>
                  <Input
                    id="companyAddress"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="e.g. 123, Industrial Estate, Anna Nagar"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyCity">City *</Label>
                    <Input
                      id="companyCity"
                      value={companyCity}
                      onChange={(e) => setCompanyCity(e.target.value)}
                      placeholder="e.g. Chennai"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyState">State *</Label>
                    <Input
                      id="companyState"
                      value={companyState}
                      onChange={(e) => setCompanyState(e.target.value)}
                      placeholder="e.g. Tamil Nadu"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyDescription">About the Company</Label>
                  <Textarea
                    id="companyDescription"
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    placeholder="Brief description about your company, services offered, number of employees, etc."
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" variant="hero" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Complete Profile & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default ProviderProfileSetup;
