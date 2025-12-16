import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/api";
import {
    Building2, Users, Briefcase, Plus, Settings, LogOut, CheckCircle, Search,
    MapPin, DollarSign, Globe, LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function EmployerDashboard() {
    const { user, logout } = useAuth();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("jobs");
    const [company, setCompany] = useState<any>(null);
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Load Data
    useEffect(() => {
        async function loadData() {
            try {
                const companyRes = await apiRequest("/employers/company");
                setCompany(companyRes);
                if (companyRes?.id) {
                    const jobsRes = await apiRequest("/employers/jobs");
                    setJobs(jobsRes || []);
                }
            } catch (err) {
                console.error("Failed to load employer data", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await apiRequest("/employers/company", {
                method: "POST",
                body: JSON.stringify(data),
            });
            setCompany(res);
            toast({ title: "Profile Updated", description: "Company details saved successfully." });
        } catch (err) {
            toast({ title: "Error", description: "Failed to save profile", variant: "destructive" });
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-20">
                <div className="p-6 flex items-center gap-2 font-bold text-xl text-brand-600 dark:text-brand-400">
                    <Building2 className="w-8 h-8" />
                    <span>Employer Portal</span>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <NavButton id="jobs" icon={Briefcase} label="Job Listings" active={activeTab} set={setActiveTab} />
                    <NavButton id="candidates" icon={Users} label="Candidates" active={activeTab} set={setActiveTab} />
                    <NavButton id="profile" icon={Settings} label="Company Profile" active={activeTab} set={setActiveTab} />
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 font-bold">
                            {user?.name?.[0]}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">{user?.name}</p>
                            <p className="text-xs text-slate-500 truncate">{company?.name || "No Company"}</p>
                        </div>
                    </div>
                    <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => logout()}>
                        <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 relative">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {activeTab === 'jobs' ? 'Job Management' : activeTab === 'candidates' ? 'Talent Pool' : 'Company Settings'}
                        </h1>
                        <p className="text-slate-500">Manage your recruitment and sponsorship pipeline</p>
                    </div>
                    <div className="flex gap-4">
                        <ThemeToggle />
                        {activeTab === 'jobs' && company && <PostJobDialog companyId={company.id} onPosted={(job) => setJobs([job, ...jobs])} />}
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {activeTab === 'jobs' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                            {!company ? (
                                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
                                    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                                        <Building2 className="w-12 h-12 text-yellow-500 mb-4" />
                                        <h3 className="text-lg font-bold">Complete your Profile</h3>
                                        <p className="text-slate-600 mb-4">You need to set up your company profile before posting jobs.</p>
                                        <Button onClick={() => setActiveTab("profile")}>Go to Profile</Button>
                                    </CardContent>
                                </Card>
                            ) : jobs.length === 0 ? (
                                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300">
                                    <Briefcase className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No Jobs Posted</h3>
                                    <p className="text-slate-500 mb-6">Start hiring by creating your first job listing.</p>
                                    <PostJobDialog companyId={company.id} onPosted={(job) => setJobs([job, ...jobs])} trigger={<Button>Post First Job</Button>} />
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {jobs.map(job => (
                                        <Card key={job.id} className="hover:shadow-md transition-shadow">
                                            <CardContent className="p-6 flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{job.title}</h3>
                                                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                                                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
                                                        <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" /> {job.salaryRange || 'Competitive'}</span>
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm">View Applications</Button>
                                                    <Button variant="ghost" size="sm" className="text-red-500">Close</Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'profile' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Company Details</CardTitle>
                                    <CardDescription>This information will be visible to applicants.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleCreateCompany} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Company Name</Label>
                                            <Input name="name" defaultValue={company?.name} required placeholder="Acme Inc." />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Industry</Label>
                                                <Input name="industry" defaultValue={company?.industry} placeholder="Tech, Health..." />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Company Size</Label>
                                                <Input name="size" defaultValue={company?.size} placeholder="10-50 employees" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Website</Label>
                                            <Input name="website" defaultValue={company?.website} placeholder="https://..." />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <Textarea name="description" defaultValue={company?.description} rows={4} placeholder="Tell us about your company..." />
                                        </div>
                                        <Button type="submit" className="w-full">Save Changes</Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {activeTab === 'candidates' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-800">
                                <Users className="w-16 h-16 mx-auto text-brand-200 mb-4" />
                                <h3 className="text-xl font-bold">Talent Pool Access</h3>
                                <p className="text-slate-500 max-w-md mx-auto mt-2">
                                    Our AI is analyzing 500+ candidates to find the best visa-eligible matches for your open roles.
                                </p>
                                <Button variant="outline" className="mt-6" disabled>Coming Soon</Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

function NavButton({ id, icon: Icon, label, active, set }: any) {
    return (
        <button
            onClick={() => set(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${active === id
                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
        >
            <Icon className="w-5 h-5" />
            {label}
        </button>
    );
}

function PostJobDialog({ companyId, onPosted, trigger }: any) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await apiRequest("/employers/jobs", {
                method: "POST",
                body: JSON.stringify(data),
            });
            onPosted(res);
            setOpen(false);
            toast({ title: "Job Posted", description: "Your job listing is now live." });
        } catch (err) {
            toast({ title: "Error", description: "Failed to post job", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button className="bg-brand-600 hover:bg-brand-700"><Plus className="w-4 h-4 mr-2" /> Post New Job</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Post a New Job</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Job Title</Label>
                        <Input name="title" required placeholder="Senior Engineer" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <Input name="location" required placeholder="London, UK" />
                        </div>
                        <div className="space-y-2">
                            <Label>Salary Range</Label>
                            <Input name="salaryRange" placeholder="£50k - £70k" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Job Description</Label>
                        <Textarea name="description" required rows={5} placeholder="Key responsibilities and requirements..." />
                    </div>
                    <Button type="submit" className="w-full bg-brand-600 hover:bg-brand-700">Publish Listing</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
