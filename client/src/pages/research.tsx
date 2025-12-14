import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Search, Book, FileText, Globe, Calendar, Filter, Download, ExternalLink, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
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
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiRequest<{ items: ResearchItem[] }>(
          `/research?search=${encodeURIComponent(searchQuery)}&category=${selectedCategory}&language=${lang}`,
        );
        setItems(res.items || []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || "Failed to load research library");
      } finally {
        setLoading(false);
      }
    };

    load();
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
              {['en','uz','ru','de','fr','es'].map(l => (
                <button key={l} onClick={()=>setLang(l as any)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase ${lang===l ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
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
        <div className="mb-12">
          <h1 className="text-4xl font-extrabold mb-4 text-slate-900 dark:text-white">{t.research.title}</h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            {t.research.subtitle}
          </p>
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

          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedCategory === cat.id
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

        {/* Resources Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {loading && (
            <div className="text-center py-20 text-slate-400">
              Loading research library...
            </div>
          )}
          {!loading && error && (
            <div className="text-center py-20 text-red-500">
              {error}
            </div>
          )}
          {!loading && !error && filteredResources.filter(Boolean).map((resource, index) => (
            // Defensive rendering: some items from the API may be null/partial in edge cases
            // Provide safe defaults so missing fields don't crash the UI.
            <AnimatedCard key={resource?.id || `r-${index}`} delay={index * 0.1} className="hover:shadow-xl transition-all cursor-pointer group">
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
                  {((resource && Array.isArray(resource.tags)) ? resource.tags : []).map((tag: string) => (
                    <span key={tag} className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {tag}
                    </span>
                  ))}
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
        </div>

        {filteredResources.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{t.research.noResults}</h3>
            <p className="text-slate-500 dark:text-slate-400">{t.research.tryAdjusting}</p>
          </div>
        )}
      </div>
    </div>
  );
}

