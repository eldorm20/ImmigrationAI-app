import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Search, Book, FileText, Globe, Calendar, Filter, Download, ExternalLink, ArrowLeft, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { StaggerContainer } from "@/components/ui/stagger-container";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Plane } from "lucide-react";

type LocalLang = 'en' | 'uz' | 'ru' | 'de' | 'fr' | 'es';

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

export default function Research() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const { t, lang, setLang } = useI18n();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    summary: "",
    body: "",
    category: "visa",
    type: "guide",
    source: "",
    sourceUrl: "",
    tags: "",
  });
  const [refreshing, setRefreshing] = useState(false);

  // Articles & Community Interaction State
  const [selectedArticle, setSelectedArticle] = useState<ResearchItem | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [reactions, setReactions] = useState<{ counts: Record<string, number>, total: number }>({ counts: {}, total: 0 });
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    if (!selectedArticle?.id) return;

    const loadInteractions = async () => {
      try {
        setCommentsLoading(true);
        const [cRes, rRes] = await Promise.all([
          apiRequest<any[]>(`/research/${selectedArticle.id}/comments`).catch(() => []),
          apiRequest<any>(`/research/${selectedArticle.id}/reactions`).catch(() => ({ counts: {}, total: 0 }))
        ]);
        setComments(cRes);
        setReactions(rRes);
      } catch (e) {
        console.error(e);
      } finally {
        setCommentsLoading(false);
      }
    };
    loadInteractions();
  }, [selectedArticle]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle?.id || !commentText.trim()) return;

    try {
      const newComment = await apiRequest(`/research/${selectedArticle.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: commentText })
      });
      setComments([newComment, ...comments]);
      setCommentText("");
      toast({ title: "Comment posted" });
    } catch (e) {
      toast({ title: "Failed to post comment", variant: "destructive" });
    }
  };

  const handleReaction = async (type = 'like') => {
    if (!selectedArticle?.id) return;
    try {
      const res = await apiRequest<{ status: string, type: string }>(`/research/${selectedArticle.id}/reactions`, {
        method: "POST",
        body: JSON.stringify({ type })
      });

      setReactions(prev => {
        const newCounts = { ...prev.counts };
        if (res.status === 'added') newCounts[type] = (newCounts[type] || 0) + 1;
        else if (res.status === 'removed') newCounts[type] = Math.max(0, (newCounts[type] || 0) - 1);
        return { counts: newCounts, total: res.status === 'added' ? prev.total + 1 : prev.total - 1 };
      });
    } catch (e) {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const categories = [
    { id: "all", name: t.research.allResources, count: 150 },
    { id: "visa", name: t.research.visaRequirements, count: 45 },
    { id: "cases", name: t.research.caseLaw, count: 60 },
    { id: "regulations", name: t.research.regulations, count: 30 },
    { id: "guides", name: t.research.guides, count: 15 }
  ];

  const filteredResources = items.filter(resource => {
    const matchesSearch = !searchQuery ||
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (resource.tags || []).some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || resource.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Use 15-second timeout for research API calls
        const res = await apiRequest<{ items: ResearchItem[] }>(
          `/research?search=${encodeURIComponent(searchQuery)}&category=${selectedCategory}&language=${lang}`,
          { timeout: 15000 }
        );
        if (!isCancelled) {
          setItems(res.items || []);
        }
      } catch (e: unknown) {
        if (isCancelled) return;
        let msg = "Failed to load research library";
        if (e instanceof Error) {
          if (e.name === 'AbortError' || e.message.includes('abort')) {
            msg = "Request timed out. Please try again.";
          } else {
            msg = e.message;
          }
        }
        setError(msg);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [searchQuery, selectedCategory, lang]);

  // The research listing is public; show list even if user is not authenticated.
  // Creation of new articles requires authentication; UI will show/hide create form accordingly.

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title || !newItem.summary || !newItem.body) {
      toast({ title: "Validation error", description: "Please fill in title, summary and content", variant: "destructive" });
      return;
    }
    try {
      setCreating(true);
      const slug = newItem.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const created = await apiRequest<any>("/research", {
        method: "POST",
        body: JSON.stringify({
          title: newItem.title,
          slug,
          summary: newItem.summary,
          body: newItem.body,
          category: newItem.category,
          type: newItem.type,
          language: lang,
          tags: newItem.tags
            ? newItem.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : [],
          source: newItem.source || undefined,
          sourceUrl: newItem.sourceUrl || undefined,
        }),
      });
      setItems((prev) => [created, ...prev]);
      setNewItem({
        title: "",
        summary: "",
        body: "",
        category: "visa",
        type: "guide",
        source: "",
        sourceUrl: "",
        tags: "",
      });
      toast({
        title: "Article added",
        description: "Thank you for contributing to the research library!",
        className: "bg-green-50 text-green-900 border-green-200",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({
        title: "Error",
        description: msg || "Failed to create article",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="fixed w-full z-50 px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div
            className="flex items-center gap-3 font-extrabold text-2xl tracking-tight cursor-pointer"
            onClick={() => setLocation('/dashboard')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 text-white">
              <Plane className="transform -rotate-45" size={20} strokeWidth={2.5} />
            </div>
            <span className="text-slate-900 dark:text-white">Immigration<span className="text-brand-600 dark:text-brand-400">AI</span></span>
          </motion.div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex border border-slate-200 dark:border-slate-700">
              {['en', 'uz', 'ru', 'de', 'fr', 'es'].map(l => (
                <button key={l} onClick={() => setLang(l as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase ${lang === l ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                  {l}
                </button>
              ))}
            </div>
            <ThemeToggle />
            <LiveButton variant="ghost" onClick={() => setLocation('/dashboard')} icon={ArrowLeft}>
              {t.dash.roadmap}
            </LiveButton>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-[length:var(--text-fluid-h1)] font-extrabold mb-4 text-slate-900 dark:text-white">{t.research.title}</h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400">
            {t.research.subtitle}
          </p>
        </div>

        {/* Legal Disclaimer Banner */}
        <div className="mb-12 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-start gap-4">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 mt-1">
            <Shield size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-1">Legal Disclaimer</h4>
            <p className="text-sm leading-relaxed">
              ImmigrationAI is an informational assistant powered by AI. We are not a law firm and do not provide legal advice. All information, including summaries of Uzbekistan laws (Lex.uz), should be verified with official government sources or a qualified immigration lawyer.
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.research.search}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          {(user?.role === "lawyer" || user?.role === "admin") && (
            <div className="flex justify-end">
              <LiveButton
                variant="success"
                onClick={handleRefresh}
                loading={refreshing}
                icon={Globe}
              >
                Refresh Library (AI News)
              </LiveButton>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-4 -mx-6 px-6 no-scrollbar md:flex-wrap md:mx-0 md:px-0 md:pb-0">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedCategory === cat.id
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-brand-500'
                  }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Contribute form (for all authenticated users) */}
        <div className="mb-10">
          <AnimatedCard>
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white flex items-center justify-between">
              <span>Contribute to the library</span>
            </h2>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Title</label>
                <input
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="e.g. Germany Job Seeker Visa checklist"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Category</label>
                <select
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                >
                  <option value="visa">{t.research.visaRequirements}</option>
                  <option value="cases">{t.research.caseLaw}</option>
                  <option value="regulations">{t.research.regulations}</option>
                  <option value="guides">{t.research.guides}</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Type</label>
                <select
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  value={newItem.type}
                  onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                >
                  <option value="guide">Guide</option>
                  <option value="case_study">Case Study</option>
                  <option value="regulation">Regulation</option>
                  <option value="faq">FAQ</option>
                  <option value="blog">Blog</option>
                  <option value="masterclass">Masterclass</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Source</label>
                <input
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  value={newItem.source}
                  onChange={(e) => setNewItem({ ...newItem, source: e.target.value })}
                  placeholder="e.g. UK Home Office"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Source URL</label>
                <input
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  value={newItem.sourceUrl}
                  onChange={(e) => setNewItem({ ...newItem, sourceUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Tags (comma separated)</label>
                <input
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  value={newItem.tags}
                  onChange={(e) => setNewItem({ ...newItem, tags: e.target.value })}
                  placeholder="UK, Skilled Worker, Salary"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Short summary</label>
                <textarea
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 h-20"
                  value={newItem.summary}
                  onChange={(e) => setNewItem({ ...newItem, summary: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Full content</label>
                <textarea
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 h-32"
                  value={newItem.body}
                  onChange={(e) => setNewItem({ ...newItem, body: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <LiveButton type="submit" loading={creating} disabled={creating}>
                  Add article
                </LiveButton>
              </div>
            </form>
          </AnimatedCard>
        </div>

        {/* Interaction Modal */}
        {selectedArticle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedArticle(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-8 border border-white/20"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-bold uppercase mb-3">
                    {selectedArticle.category || 'Article'}
                  </span>
                  <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                    {selectedArticle.title}
                  </h2>
                </div>
                <button onClick={() => setSelectedArticle(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <ArrowLeft size={24} />
                </button>
              </div>

              <div className="prose dark:prose-invert max-w-none mb-8">
                {selectedArticle.body ? (
                  <div className="whitespace-pre-wrap">{selectedArticle.body}</div>
                ) : (
                  <p className="text-slate-500 italic">No content available.</p>
                )}
                {selectedArticle.sourceUrl && (
                  <a href={selectedArticle.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-brand-600 font-bold mt-4 hover:underline">
                    Read full source <ExternalLink size={16} />
                  </a>
                )}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
                <div className="flex items-center gap-4 mb-8">
                  <LiveButton variant="secondary" onClick={() => handleReaction('like')} className="gap-2">
                    ❤️ Like ({reactions.counts['like'] || 0})
                  </LiveButton>
                  {/* Additional reaction types could go here */}
                </div>

                <h3 className="text-xl font-bold mb-4">Comments</h3>

                <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl">
                  {commentsLoading ? (
                    <p className="text-slate-400 text-center py-4">Loading comments...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No comments yet. Be the first to start the discussion!</p>
                  ) : (
                    comments.map((c, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-200 dark:bg-brand-900 flex items-center justify-center font-bold text-xs">
                          {c.user?.firstName?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="flex gap-2 items-baseline">
                            <span className="font-bold text-sm bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">{c.user?.firstName || 'User'}</span>
                            <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm mt-1">{c.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {user ? (
                  <form onSubmit={handlePostComment} className="flex gap-3">
                    <input
                      className="flex-1 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                    />
                    <LiveButton type="submit" disabled={!commentText.trim()}>Post</LiveButton>
                  </form>
                ) : (
                  <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-xl text-center">
                    <p className="text-sm text-brand-600 dark:text-brand-300">Please sign in to add comments.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Resources Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-safe">
          {loading && (
            <div className="text-center py-20 text-slate-400">
              Loading research library...
            </div>
          )}
          {!loading && error && (
            <div className="col-span-full text-center py-20">
              <div className="text-red-500 mb-4">{error}</div>
              <LiveButton
                variant="secondary"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  apiRequest<{ items: ResearchItem[] }>(
                    `/research?search=${encodeURIComponent(searchQuery)}&category=${selectedCategory}&language=${lang}`,
                    { timeout: 15000 }
                  )
                    .then(res => setItems(res.items || []))
                    .catch(e => setError(e instanceof Error ? e.message : "Failed to load"))
                    .finally(() => setLoading(false));
                }}
              >
                Retry
              </LiveButton>
            </div>
          )}
          {!loading && !error && filteredResources.filter(Boolean).map((resource, index) => (
            // Defensive rendering: some items from the API may be null/partial in edge cases
            // Provide safe defaults so missing fields don't crash the UI.
            <AnimatedCard
              key={resource?.id || `r-${index}`}
              delay={index * 0.1}
              className="hover:shadow-xl transition-all cursor-pointer group"
              onClick={() => setSelectedArticle(resource)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    {resource?.type === "guide" || resource?.type === "Guide" ? <Book className="text-brand-600 dark:text-brand-400" size={24} /> :
                      resource?.type === "case_study" || resource?.type === "Case Study" ? <FileText className="text-brand-600 dark:text-brand-400" size={24} /> :
                        <Globe className="text-brand-600 dark:text-brand-400" size={24} />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase">
                      {String(resource?.type || "").replace("_", " ")}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <Calendar size={12} />
                      {new Date(resource?.publishedAt || resource?.createdAt || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <ExternalLink className="text-slate-400 group-hover:text-brand-500 transition-colors" size={18} />
              </div>

              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                {resource?.title || "Untitled"}
              </h3>


              <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                {resource?.summary || ""}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  {((resource && Array.isArray(resource.tags)) ? resource.tags : []).slice(0, 3).map((tag: string) => (
                    <span key={tag} className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {tag}
                    </span>
                  ))}
                  {((resource && Array.isArray(resource.tags)) ? resource.tags : []).length > 3 && (
                    <span className="px-2 py-1 rounded-lg text-xs text-slate-400">...</span>
                  )}
                </div>

                <LiveButton variant="ghost" size="sm" icon={Download} onClick={() => {
                  toast({
                    title: t.research.download,
                    description: `Downloading ${resource?.title || "resource"}...`,
                    className: "bg-green-50 text-green-900 border-green-200"
                  });
                }}>
                  {t.research.download}
                </LiveButton>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                {t.research.source}: {resource.source}
              </p>
            </AnimatedCard>
          ))}
        </StaggerContainer>

        {filteredResources.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{t.research.noResults}</h3>
            <p className="text-slate-500 dark:text-slate-400">{t.research.tryAdjusting}</p>
          </div>
        )}
      </div>
    </div >
  );
}

