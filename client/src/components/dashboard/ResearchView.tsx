import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Search, Book, FileText, Globe, Calendar, Download, ExternalLink, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { StaggerContainer } from "@/components/ui/stagger-container";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";

interface ResearchItem {
    id?: string;
    title: string;
    summary?: string;
    body?: string;
    category?: string;
    type?: string;
    tags?: string[];
    source?: string;
    sourceUrl?: string;

    publishedAt?: string;
    createdAt?: string;
}

export function ResearchView() {
    const { user } = useAuth();
    const { t, lang } = useI18n();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [items, setItems] = useState<ResearchItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<ResearchItem | null>(null);

    const categories = [
        { id: "all", name: t.research.allResources || "All Resources", count: 150 },
        { id: "visa", name: t.research.visaRequirements || "Visa Requirements", count: 45 },
        { id: "cases", name: t.research.caseLaw || "Case Law", count: 60 },
        { id: "regulations", name: t.research.regulations || "Regulations", count: 30 },
        { id: "guides", name: t.research.guides || "Guides", count: 15 }
    ];

    useEffect(() => {
        let isCancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await apiRequest<{ items: ResearchItem[] }>(
                    `/research?search=${encodeURIComponent(searchQuery)}&category=${selectedCategory}&language=${lang}`,
                    { timeout: 15000 }
                );
                if (!isCancelled) setItems(res.items || []);
            } catch (e: unknown) {
                if (!isCancelled) setError(e instanceof Error ? e.message : "Failed to load research library");
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };
        load();
        return () => { isCancelled = true; };
    }, [searchQuery, selectedCategory, lang]);

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            await apiRequest("/research/refresh", { method: "POST" });
            toast({
                title: "Library Refreshed",
                description: "New immigration news and articles have been added to the library.",
                className: "bg-green-50 text-green-900 border-green-200",
            });
            // Trigger a reload
            const res = await apiRequest<{ items: ResearchItem[] }>(
                `/research?search=${encodeURIComponent(searchQuery)}&category=${selectedCategory}&language=${lang}`,
            );
            setItems(res.items || []);
        } catch (e: unknown) {
            toast({
                title: "Refresh failed",
                description: e instanceof Error ? e.message : "Failed to refresh library",
                variant: "destructive",
            });
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t.research.title || "Research Library"}</h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        {t.research.subtitle || "Explore immigration laws, guides, and case studies."}
                    </p>
                </div>
                {(user?.role === "lawyer" || user?.role === "admin") && (
                    <LiveButton
                        variant="success"
                        onClick={handleRefresh}
                        loading={refreshing}
                        icon={Globe}
                    >
                        Refresh Library
                    </LiveButton>
                )}
            </div>

            {/* Legal Disclaimer */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 mt-1">
                    <Shield size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider mb-1">Legal Disclaimer</h4>
                    <p className="text-sm leading-relaxed">
                        ImmigrationAI is an informational assistant. We do not provide legal advice. Verify information with official sources.
                    </p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t.research.search || "Search library..."}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar md:flex-wrap">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedCategory === cat.id
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-brand-500'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Grid */}
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                {loading && (
                    <div className="col-span-full text-center py-20 text-slate-400">Loading research library...</div>
                )}
                {!loading && error && (
                    <div className="col-span-full text-center py-20 text-red-500">{error}</div>
                )}
                {!loading && !error && items.map((resource, index) => (
                    <AnimatedCard
                        key={resource?.id || `r-${index}`}
                        delay={index * 0.1}
                        className="hover:shadow-xl transition-all cursor-pointer group"
                        onClick={() => setSelectedArticle(resource)}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                                    {resource?.type === "guide" ? <Book className="text-brand-600 dark:text-brand-400" size={20} /> :
                                        resource?.type === "case_study" ? <FileText className="text-brand-600 dark:text-brand-400" size={20} /> :
                                            <Globe className="text-brand-600 dark:text-brand-400" size={20} />}
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase">
                                        {String(resource?.type || "").replace("_", " ")}
                                    </span>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                        <Calendar size={10} />
                                        {new Date(resource?.publishedAt || resource?.createdAt || Date.now()).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <ExternalLink className="text-slate-400 group-hover:text-brand-500 transition-colors" size={16} />
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors line-clamp-2">
                            {resource?.title || "Untitled"}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
                            {resource?.summary || ""}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                            {(resource?.tags || []).slice(0, 3).map(tag => (
                                <span key={tag} className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </AnimatedCard>
                ))}
            </StaggerContainer>

            {/* Article Modal */}
            {selectedArticle && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setSelectedArticle(null)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-8 border border-white/20"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedArticle.title}</h2>
                            <button onClick={() => setSelectedArticle(null)} className="p-2 hover:bg-slate-100 rounded-full">✕</button>
                        </div>
                        <div className="prose dark:prose-invert max-w-none">
                            <div className="whitespace-pre-wrap">{selectedArticle.body}</div>
                            {selectedArticle.sourceUrl && (
                                <a href={selectedArticle.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-brand-600 font-bold mt-6">
                                    Read Source <ExternalLink size={16} />
                                </a>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
