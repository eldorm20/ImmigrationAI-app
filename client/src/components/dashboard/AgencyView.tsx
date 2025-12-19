import { useState } from "react";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { UserPlus, Mail, Trash2, Shield, MoreVertical } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: "admin" | "member" | "viewer";
    status: "active" | "pending";
    avatar?: string;
}

export function AgencyView() {
    const { toast } = useToast();
    const [inviteEmail, setInviteEmail] = useState("");
    const [members, setMembers] = useState<TeamMember[]>([
        { id: "1", name: "You", email: "lawyer@example.com", role: "admin", status: "active" },
        { id: "2", name: "Sarah Associate", email: "sarah@firm.com", role: "member", status: "active" },
        { id: "3", name: "John Paralegal", email: "john@firm.com", role: "viewer", status: "pending" },
    ]);

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;

        // Mock invite
        toast({
            title: "Invitation Sent",
            description: `Invited ${inviteEmail} to join your agency team.`,
            className: "bg-green-50 text-green-900 border-green-200"
        });

        setMembers([
            ...members,
            {
                id: Math.random().toString(),
                name: inviteEmail.split("@")[0],
                email: inviteEmail,
                role: "member",
                status: "pending"
            }
        ]);
        setInviteEmail("");
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Agency Team</h2>
                    <p className="text-slate-500 dark:text-slate-400">Manage your law firm's team members and permissions.</p>
                </div>
                <LiveButton icon={UserPlus} onClick={() => document.getElementById('invite-input')?.focus()}>
                    Invite Member
                </LiveButton>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <AnimatedCard className="md:col-span-2">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                        <Shield size={20} className="text-brand-500" />
                        Team Members
                    </h3>

                    <div className="space-y-4">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                        {member.name[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            {member.name}
                                            {member.id === "1" && <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">You</span>}
                                        </div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">{member.email}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase ${member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {member.status}
                                    </span>
                                    <div className="text-sm font-medium text-slate-600 dark:text-slate-300 capitalize">
                                        {member.role}
                                    </div>
                                    {member.id !== "1" && (
                                        <button className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </AnimatedCard>

                <div className="space-y-6">
                    <AnimatedCard delay={0.1}>
                        <h3 className="font-bold text-lg mb-4">Invite New Member</h3>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-500 uppercase mb-1 block">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        id="invite-input"
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="colleague@firm.com"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-500 uppercase mb-1 block">Role</label>
                                <select className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none">
                                    <option value="member">Associate (Member)</option>
                                    <option value="admin">Partner (Admin)</option>
                                    <option value="viewer">Paralegal (Viewer)</option>
                                </select>
                            </div>
                            <LiveButton type="submit" className="w-full">
                                Send Invitation
                            </LiveButton>
                        </form>
                    </AnimatedCard>

                    <div className="bg-brand-50 dark:bg-brand-900/20 rounded-2xl p-6 border border-brand-100 dark:border-brand-800">
                        <h4 className="font-bold text-brand-800 dark:text-brand-300 mb-2">Pro Tip</h4>
                        <p className="text-sm text-brand-700 dark:text-brand-400">
                            Agency plans include 3 seats. Upgrade to Enterprise for unlimited team members and advanced permission controls.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
