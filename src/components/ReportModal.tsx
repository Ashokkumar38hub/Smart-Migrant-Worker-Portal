import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Flag, Loader2, AlertTriangle, CheckCircle, Briefcase } from "lucide-react";
import { toast } from "sonner";

interface ReportModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    reportedId: string;
    reportedName: string;
    entityType: 'worker' | 'job' | 'provider';
    jobId?: string;
    jobTitle?: string;
    chatEvidence?: any[];
}

const ReportModal = ({
    isOpen,
    onOpenChange,
    reportedId,
    reportedName,
    entityType,
    jobId,
    jobTitle,
    chatEvidence
}: ReportModalProps) => {
    const [reportReason, setReportReason] = useState("");
    const [reportDescription, setReportDescription] = useState("");
    const [reportFile, setReportFile] = useState<File | null>(null);
    const [reporting, setReporting] = useState(false);

    const reasons = entityType === 'worker'
        ? [
            "Inappropriate behavior",
            "No-show for job",
            "False skills/experience",
            "Harassment",
            "Asking for money",
            "Theft / Damage",
            "Other"
        ]
        : [
            "Fake job / scam",
            "Salary does not match description",
            "Wrong location / misleading information",
            "Unsafe or illegal work",
            "Asking money to apply",
            "Harassment or inappropriate behavior",
            "Other"
        ];

    const handleReport = async () => {
        if (!reportReason) {
            toast.error("Please select a reason for reporting");
            return;
        }

        setReporting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                toast.error("Please login to report");
                return;
            }

            let proofUrl = "";
            if (reportFile) {
                const fileExt = reportFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${entityType}_reports/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('report-proofs')
                    .upload(filePath, reportFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('report-proofs')
                    .getPublicUrl(filePath);

                proofUrl = publicUrl;
            }

            const { error } = await supabase
                .from("reports")
                .insert({
                    reporter_id: session.user.id,
                    reported_entity_id: reportedId,
                    entity_type: entityType === 'provider' ? 'worker' : entityType, // Map provider to worker if reporting direct user
                    job_id: jobId,
                    reason: reportReason,
                    description: reportDescription,
                    proof_url: proofUrl,
                    chat_evidence: chatEvidence ? { messages: chatEvidence } : null,
                    status: "pending"
                });

            if (error) {
                if (error.code === "23505") {
                    toast.info("You have already reported this.");
                } else {
                    toast.error(error.message);
                }
            } else {
                toast.success("Report submitted to moderation. Thank you for helping keep our community safe.");
                onOpenChange(false);
                setReportReason("");
                setReportDescription("");
                setReportFile(null);
            }
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to submit report");
        } finally {
            setReporting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Flag className="h-5 w-5 text-red-500" />
                        Report {entityType === 'job' ? 'Job listing' : reportedName}
                    </DialogTitle>
                    <DialogDescription>
                        Help us understand what's wrong. Your report and chat history (if any) will be reviewed by an administrator.
                    </DialogDescription>
                    {jobTitle && (
                        <div className="mt-2 p-2 bg-muted rounded-md border border-border flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-primary" />
                            <span className="text-xs font-semibold">Related Job: {jobTitle}</span>
                        </div>
                    )}
                </DialogHeader>

                <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="space-y-3">
                        <Label className="text-sm font-bold">Reason for reporting</Label>
                        <RadioGroup value={reportReason} onValueChange={setReportReason} className="grid gap-2">
                            {reasons.map((reason) => (
                                <div key={reason} className="flex items-center space-x-2">
                                    <RadioGroupItem value={reason} id={reason} />
                                    <Label htmlFor={reason} className="text-sm font-medium cursor-pointer">{reason}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold">Additional details (optional)</Label>
                        <Textarea
                            placeholder="Provide more context..."
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                            className="min-h-[100px] text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold">Upload proof (optional)</Label>
                        <div className="relative">
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                                className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                            {reportFile && (
                                <p className="text-[10px] text-green-500 mt-1 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> {reportFile.name} selected
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                        <p className="text-[10px] text-amber-700 leading-tight">
                            <strong>Warning:</strong> False reports or abuse of this system may result in account suspension.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={reporting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        className="gap-2"
                        onClick={handleReport}
                        disabled={reporting || !reportReason}
                    >
                        {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                        Submit Report
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ReportModal;
