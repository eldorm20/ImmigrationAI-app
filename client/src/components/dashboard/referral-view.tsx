import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Copy, Gift, Users, Share2, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

interface ReferralStats {
    code?: string;
    invites: number;
    earnings: number;
    currency: string;
}

export default function ReferralView() {
    const { toast } = useToast();
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                // Get Code
                const codeRes = await apiRequest("/referrals/code") as { code: string };
                // Get Stats
                const statsRes = await apiRequest("/referrals/stats") as { invites: number; earnings: number; currency: string };
                setStats({
                    code: codeRes.code,
                    ...statsRes
                });
            } catch (err) {
                console.error(err);
                toast({ title: "Error", description: "Failed to load referral data", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, [toast]);

    const copyCode = () => {
        if (!stats?.code) return;
        navigator.clipboard.writeText(stats.code);
        toast({ title: "Copied!", description: "Referral code copied to clipboard." });
    };

    const shareUrl = () => {
        if (!stats?.code) return;
        const url = `${window.location.origin}/auth?ref=${stats.code}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link Copied!", description: "Referral link copied to clipboard." });
    }

    if (loading) {
        return <div className="p-8 text-center">Loading referral program...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Refer & Earn</h2>
                    <p className="text-muted-foreground">Invite friends and earn rewards when they subscribe.</p>
                </div>
                <div className="bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    <span>Get $20 per referral</span>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Your Referral Code */}
                <Card className="md:col-span-2 bg-gradient-to-r from-brand-600 to-purple-600 text-white border-0">
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                        <Gift className="w-12 h-12 text-white/80" />
                        <h3 className="text-2xl font-bold">Your Unique Referral Code</h3>
                        <div className="flex items-center gap-2 bg-white/20 p-2 rounded-xl backdrop-blur-sm border border-white/30">
                            <code className="text-3xl font-mono font-bold px-4 tracking-wider">{stats?.code || "------"}</code>
                            <Button size="icon" variant="ghost" className="hover:bg-white/20 text-white" onClick={copyCode}>
                                <Copy className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <Button className="bg-white text-brand-700 hover:bg-white/90 font-bold" onClick={shareUrl}>
                                <Share2 className="w-4 h-4 mr-2" /> Share Link
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.invites || 0}</div>
                        <p className="text-xs text-muted-foreground">Friends joined</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Earned Rewards</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats?.earnings || 0}</div>
                        <p className="text-xs text-muted-foreground">Available to payout</p>
                    </CardContent>
                </Card>

                {/* How it works */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>How it works</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div className="flex flex-col items-center text-center p-4">
                            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold mb-3">1</div>
                            <h4 className="font-bold mb-1">Share your code</h4>
                            <p className="text-sm text-muted-foreground">Send your unique code to friends needing visa help.</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-4">
                            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold mb-3">2</div>
                            <h4 className="font-bold mb-1">PassFriend Subscribes</h4>
                            <p className="text-sm text-muted-foreground">They sign up and purchase a plan using your code.</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-4">
                            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold mb-3">3</div>
                            <h4 className="font-bold mb-1">You Earn Cash</h4>
                            <p className="text-sm text-muted-foreground">Receive $20 for every successful referral.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
