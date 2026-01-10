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
        <div className="container mx-auto py-8 max-w-6xl space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-brand-50 to-white dark:from-slate-900 dark:to-slate-950 p-6 rounded-2xl border border-brand-100 dark:border-slate-800">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-600">
                        Community Hub
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg">
                        Connect with professionals, share insights, and grow together.
                    </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)} className="bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20 px-6 py-6 text-lg h-auto transition-all hover:scale-105 active:scale-95">
                    <ImageIcon className="w-5 h-5 mr-3" />
                    Create Post
                </Button>
            </div>

            <CreatePostDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
            <PostDetailDialog postId={selectedPostId} onOpenChange={(open) => !open && setSelectedPostId(null)} />

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Sidebar / Filters */}
                <div className="w-full lg:w-72 space-y-8">
                    {/* Search */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input
                                placeholder="Search discussions..."
                                className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-brand-500 transition-all font-medium py-6"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Filters</h3>
                        <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
                            <TabsList className="flex flex-col h-auto bg-transparent p-0 space-y-2 w-full">
                                {['all', 'general', 'news', 'marketplace', 'forum', 'jobs'].map((tab) => (
                                    <TabsTrigger
                                        key={tab}
                                        value={tab}
                                        className="w-full justify-start px-4 py-3 text-sm font-medium capitalize rounded-lg transition-all data-[state=active]:bg-brand-50 data-[state=active]:text-brand-600 dark:data-[state=active]:bg-brand-900/20 dark:data-[state=active]:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                        {tab}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Community Guidelines Card */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg overflow-hidden relative">
                        <div className="relative z-10">
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <Flag className="w-5 h-5" /> Guidelines
                            </h3>
                            <ul className="text-sm space-y-2 text-white/90">
                                <li className="flex items-start gap-2">• <span>Be respectful and kind</span></li>
                                <li className="flex items-start gap-2">• <span>No spam or self-promotion</span></li>
                                <li className="flex items-start gap-2">• <span>Report inappropriate content</span></li>
                            </ul>
                        </div>
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black/10 rounded-full blur-xl"></div>
                    </div>
                </div>

                {/* Main Feed */}
                <div className="flex-1 space-y-8">
                    {/* Featured Section (Static Mock for now, could be dynamic) */}
                    {activeTab === 'all' && (
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Heart className="w-5 h-5 text-red-500 fill-red-500" /> Featured Discussions
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {posts?.slice(0, 2).map((post) => (
                                    <div key={`featured-${post.id}`} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 p-5 rounded-xl border border-amber-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedPostId(post.id)}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">HOT</span>
                                            <span className="text-xs text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 line-clamp-2 mb-2">{post.title}</h4>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{post.author?.firstName}</span>
                                            <span>• {post.likes} likes</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={`flex-1 ${activeTab === 'marketplace' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-6'}`}>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
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
                                        className="group p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-slate-200 dark:border-slate-800 hover:border-brand-200 dark:hover:border-brand-800 relative overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                                        onClick={() => setSelectedPostId(post.id)}
                                    >
                                        <div className="absolute top-0 left-0 w-1 h-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center overflow-hidden ring-2 ring-white dark:ring-slate-950 shadow-sm">
                                                    {post.author?.avatar ? (
                                                        <img src={post.author.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-slate-500 font-bold text-lg">{post.author?.firstName?.[0]}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-brand-600 transition-colors">
                                                        {post.author?.firstName} {post.author?.lastName}
                                                    </h3>
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        {new Date(post.createdAt).toLocaleDateString()} • <span className="text-brand-600 font-medium capitalize">{post.category}</span>
                                                    </span>
                                                </div>
                                            </div>
                                            {post.likes > 5 && (
                                                <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-red-50 text-red-600 border border-red-100">
                                                    <Heart className="w-3 h-3 fill-red-600" /> HOT
                                                </span>
                                            )}
                                        </div>

                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 leading-tight">{post.title}</h2>
                                        <p className="text-slate-600 dark:text-slate-400 line-clamp-3 mb-5 leading-relaxed">
                                            {post.content}
                                        </p>

                                        {/* Image Preview if available (Mock logic as we don't have images in listing yet) */}
                                        {/* <div className="h-48 bg-slate-100 rounded-lg mb-4 w-full object-cover"></div> */}

                                        <div className="flex items-center gap-6 text-slate-500 text-sm border-t border-slate-100 dark:border-slate-800 pt-4 mt-auto">
                                            <button className="flex items-center gap-2 hover:text-red-500 transition-colors group/btn">
                                                <Heart className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                                <span className="font-medium">{post.likes}</span>
                                            </button>
                                            <button className="flex items-center gap-2 hover:text-brand-600 transition-colors group/btn">
                                                <MessageSquare className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                                <span className="font-medium">Comments</span>
                                            </button>
                                            <button className="flex items-center gap-2 hover:text-brand-600 transition-colors ml-auto group/btn">
                                                <Share2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                                <span className="font-medium">Share</span>
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
    );
}
