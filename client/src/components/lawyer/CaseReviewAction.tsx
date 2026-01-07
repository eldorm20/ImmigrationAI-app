import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/api";
import { LiveButton } from "@/components/ui/live-elements";
import { CheckCircle, XCircle, RefreshCw, Send, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/ui/glass-card";

interface CaseReviewActionProps {
    applicationId: string;
    currentStatus: string;
    onSuccess?: () => void;
}

export const CaseReviewAction: React.FC<CaseReviewActionProps> = ({
    applicationId,
    currentStatus,
    onSuccess
}) => {
    const { t } = useI18n();
    const { toast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);
    const [feedback, setFeedback] = useState("");

    const handleAction = async (action: "approve" | "reject" | "request_changes" | "submit_to_gov") => {
        setLoading(action);
        try {
            await apiRequest(`/applications/${applicationId}/review`, {
                method: "POST",
                body: JSON.stringify({
                    action,
                    feedback,
                    notes: feedback
                }),
            });

            toast({
                title: t.common.success,
                description: t.dashStatus[action === "submit_to_gov" ? "active" : action] || `Case updated: ${action}`,
            });

            queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
            if (onSuccess) onSuccess();
            setFeedback("");
        } catch (error: any) {
            toast({
                title: t.common.error,
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(null);
        }
    };

    const isSubmitted = currentStatus === "submitted";
    const isUnderReview = currentStatus === "under_review";
    const isApproved = currentStatus === "approved";
    const canReview = isSubmitted || isUnderReview;
    const canSubmitToGov = isApproved;

    if (!canReview && !canSubmitToGov) return null;

    return (
        <GlassCard className="p-6 border-brand-500/20 bg-brand-500/5">
            <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="text-brand-500" size={20} />
                <h3 className="font-bold text-lg">{t.lawyer.reviewTitle || "Case Action"}</h3>
            </div>

            <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={t.lawyer.feedbackPlaceholder || "Enter internal notes or feedback for the client..."}
                className="w-full p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 mb-4 min-h-[100px] text-sm"
            />

            <div className="flex flex-wrap gap-3">
                {canReview && (
                    <>
                        <LiveButton
                            variant="primary"
                            onClick={() => handleAction("approve")}
                            loading={loading === "approve"}
                            icon={CheckCircle}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {t.common.approve || "Approve"}
                        </LiveButton>
                        <LiveButton
                            variant="outline"
                            onClick={() => handleAction("request_changes")}
                            loading={loading === "request_changes"}
                            icon={RefreshCw}
                        >
                            {t.lawyer.requestChanges || "Request Changes"}
                        </LiveButton>
                        <LiveButton
                            variant="ghost"
                            onClick={() => handleAction("reject")}
                            loading={loading === "reject"}
                            icon={XCircle}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                            {t.common.reject || "Reject"}
                        </LiveButton>
                    </>
                )}

                {canSubmitToGov && (
                    <LiveButton
                        variant="primary"
                        onClick={() => handleAction("submit_to_gov")}
                        loading={loading === "submit_to_gov"}
                        icon={Send}
                        className="bg-brand-600 w-full md:w-auto"
                    >
                        {t.lawyer.submitToGov || "Submit to Government"}
                    </LiveButton>
                )}
            </div>
        </GlassCard>
    );
};
