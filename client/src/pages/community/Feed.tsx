import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/useToast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MessageSquare, Heart, Share2, Flag, Image as ImageIcon, Search } from 'lucide-react';
import { motion } from 'framer-motion';

import { CreatePostDialog } from '@/components/community/CreatePostDialog';
import { PostDetailDialog } from '@/components/community/PostDetailDialog';

export default function CommunityFeed() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('general');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

    const { data: posts, isLoading } = useQuery({
        queryKey: ['/community/posts', activeTab, searchQuery],
        queryFn: () => {
            const params = new URLSearchParams();
            if (activeTab !== 'all') params.append('category', activeTab);
            if (searchQuery) params.append('search', searchQuery);
            return apiRequest<any[]>(`/community/posts?${params}`);
        }
    });

    return (
        <div className="bg-mesh min-h-screen w-full">
            <div className="container mx-auto py-8 max-w-6xl space-y-8 px-4 md:px-6">
                {/* Header Section */}
                <div className="glass-premium rounded-3xl p-8 relative overflow-hidden border-none shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -ml-20 -mb-20"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-5xl font-black mb-3 leading-tight tracking-tight">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400">
                                    Community Hub
                                </span>
                            </h1>
                            <p className="text-slate-600 dark:text-slate-300 text-lg font-medium max-w-xl">
                                Connect with legal professionals, share insights, and grow your practice in a collaborative environment.
                            </p>
                        </div>
                        <Button
                            onClick={() => setShowCreateDialog(true)}
                            className="bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/30 shadow-lg px-8 py-7 rounded-2xl text-lg font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                        >
                            <ImageIcon className="w-6 h-6" />
                            Create Post
                        </Button>
                    </div>
                </div>

                <CreatePostDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
                <PostDetailDialog postId={selectedPostId} onOpenChange={(open) => !open && setSelectedPostId(null)} />

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Sidebar / Filters */}
                    <div className="w-full lg:w-80 space-y-6">
                        {/* Search */}
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-500 w-5 h-5 pointer-events-none" />
                                <Input
                                    placeholder="Search discussions..."
                                    className="glass-input pl-12 h-14 rounded-2xl text-base font-medium shadow-sm border-white/50 dark:border-white/10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="glass-panel rounded-2xl p-2 shadow-lg border-white/40 dark:border-white/5">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-4 py-2">Filters</h3>
                            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
                                <TabsList className="flex flex-col h-auto bg-transparent p-0 space-y-1 w-full">
                                    {['all', 'general', 'news', 'marketplace', 'forum', 'jobs'].map((tab) => (
                                        <TabsTrigger
                                            key={tab}
                                            value={tab}
                                            className="w-full justify-start px-4 py-3.5 text-sm font-bold capitalize rounded-xl transition-all data-[state=active]:bg-brand-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-slate-100 dark:hover:bg-slate-800/50"
                                        >
                                            {tab === 'all' ? 'All Posts' : tab}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Community Guidelines Card */}
                        <div className="rounded-2xl p-6 text-white shadow-xl overflow-hidden relative bg-gradient-to-br from-indigo-600 to-purple-700 border border-white/10">
                            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
                            <div className="relative z-10">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Flag className="w-5 h-5" /> Guidelines
                                </h3>
                                <ul className="text-sm space-y-3 text-white/90 font-medium">
                                    <li className="flex items-start gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                                        <span>Be respectful and kind to others breakdown</span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                                        <span>No spam or unsolicited self-promotion</span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                                        <span>Report any inappropriate content</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Main Feed */}
                    <div className="flex-1 space-y-6">
                        {/* Featured Section */}
                        {activeTab === 'all' && (
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Heart className="w-6 h-6 text-red-500 fill-red-500" /> Featured Discussions
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {posts?.slice(0, 2).map((post) => (
                                        <motion.div
                                            key={`featured-${post.id}`}
                                            whileHover={{ y: -5 }}
                                            className="glass-card bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-slate-800/80 dark:to-slate-900/80 p-6 rounded-2xl cursor-pointer hover:shadow-xl hover:shadow-orange-500/10 border-amber-200/50"
                                            onClick={() => setSelectedPostId(post.id)}
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="bg-amber-500 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1">
                                                    <Heart className="w-3 h-3 fill-white" /> HOT
                                                </span>
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{new Date(post.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg line-clamp-2 mb-2 leading-tight group-hover:text-brand-600 transition-colors">
                                                {post.title}
                                            </h4>
                                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mt-4">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {post.author?.firstName?.[0]}
                                                </div>
                                                <span className="font-medium">{post.author?.firstName}</span>
                                                <span className="text-slate-400">•</span>
                                                <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes}</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={`flex-1 ${activeTab === 'marketplace' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-6'}`}>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-white/30 dark:bg-slate-900/30 rounded-3xl backdrop-blur-md">
                                    <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
                                    <p className="text-slate-500 font-medium">Loading community feed...</p>
                                </div>
                            ) : (
                                posts?.map((post) => (
                                    <motion.div
                                        key={post.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Card
                                            className="group p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer border-transparent hover:border-brand-300/50 dark:hover:border-brand-700/50 relative overflow-hidden glass-card rounded-2xl"
                                            onClick={() => setSelectedPostId(post.id)}
                                        >
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-brand-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                            <div className="flex items-start justify-between mb-4 pl-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-100 to-indigo-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center overflow-hidden ring-4 ring-white/50 dark:ring-slate-800/50 shadow-lg">
                                                        {post.author?.avatar ? (
                                                            <img src={post.author.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-brand-600 dark:text-brand-300 font-black text-xl">{post.author?.firstName?.[0]}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-brand-600 transition-colors">
                                                            {post.author?.firstName} {post.author?.lastName}
                                                        </h3>
                                                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide flex items-center gap-2">
                                                            {new Date(post.createdAt).toLocaleDateString()}
                                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                            <span className="text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-full">
                                                                {post.category}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>
                                                {post.likes > 5 && (
                                                    <span className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-600 border border-red-200 shadow-sm animate-pulse">
                                                        <Heart className="w-3.5 h-3.5 fill-red-600" /> TRENDING
                                                    </span>
                                                )}
                                            </div>

                                            <div className="pl-2">
                                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-brand-600 group-hover:to-indigo-600 transition-all duration-300">
                                                    {post.title}
                                                </h2>
                                                <p className="text-slate-600 dark:text-slate-400 line-clamp-3 mb-6 leading-relaxed font-medium">
                                                    {post.content}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-6 text-slate-500 font-medium text-sm border-t border-slate-200/50 dark:border-slate-800/50 pt-5 mt-2 pl-2">
                                                <button className="flex items-center gap-2 hover:text-red-500 transition-colors group/btn bg-slate-100 dark:bg-slate-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl">
                                                    <Heart className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                                    <span>{post.likes}</span>
                                                </button>
                                                <button className="flex items-center gap-2 hover:text-brand-600 transition-colors group/btn bg-slate-100 dark:bg-slate-800/50 hover:bg-brand-50 dark:hover:bg-brand-900/20 px-4 py-2 rounded-xl">
                                                    <MessageSquare className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                                    <span>Comments</span>
                                                </button>
                                                <button className="flex items-center gap-2 hover:text-brand-600 transition-colors ml-auto group/btn opacity-60 hover:opacity-100">
                                                    <Share2 className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Share</span>
                                                </button>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
