import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { LiveButton, GlassInput, AnimatedCard } from "@/components/ui/live-elements";
import { ArrowRight, Lock, Key } from "lucide-react";
import { motion } from "framer-motion";

export default function PortalLogin() {
    const [token, setToken] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token.trim()) return;

        setIsLoading(true);

        try {
            // Validate token exists by hitting status endpoint
            const res = await fetch("/api/portal/status", {
                headers: { "X-Portal-Token": token }
            });

            if (res.ok) {
                localStorage.setItem("portal_token", token);
                setLocation("/portal/dashboard");
            } else {
                throw new Error("Invalid token");
            }
        } catch (error) {
            toast({
                title: "Access Denied",
                description: "Invalid or expired access token.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
            <AnimatedCard className="w-full max-w-md p-8 bg-white/10 backdrop-blur-xl border-white/10 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <Lock className="text-brand-400" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Client Portal</h1>
                    <p className="text-slate-400">Secure access for immigration clients</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Access Token</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3 text-slate-500" size={18} />
                            <GlassInput
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Enter your secure token"
                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-brand-400"
                            />
                        </div>
                    </div>

                    <LiveButton
                        type="submit"
                        className="w-full h-12 text-lg font-bold"
                        disabled={isLoading}
                        icon={ArrowRight}
                    >
                        {isLoading ? "Verifying..." : "Access Portal"}
                    </LiveButton>
                </form>

                <div className="mt-8 text-center text-xs text-slate-500">
                    <p>Protected by end-to-end encryption</p>
                </div>
            </AnimatedCard>
        </div>
    );
}
