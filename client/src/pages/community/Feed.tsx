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
        <div className="container mx-auto py-8 max-w-5xl space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">Community Hub</h1>
                    <p className="text-slate-600 dark:text-slate-400">Connect, share, and learn from others</p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)} className="bg-brand-600 hover:bg-brand-700 text-white">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Create Post
                </Button>
            </div>

            <CreatePostDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
            <PostDetailDialog postId={selectedPostId} onOpenChange={(open) => !open && setSelectedPostId(null)} />

            <div className="flex flex-col md:flex-row gap-8">
                {/* Left Sidebar / Filters */}
                <div className="w-full md:w-64 space-y-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder="Search posts..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
                        <TabsList className="flex flex-col h-auto bg-transparent p-0 space-y-1 w-full">
                            {['all', 'general', 'news', 'marketplace', 'forum', 'jobs'].map((tab) => (
                                <TabsTrigger
                                    key={tab}
                                    value={tab}
                                    className="w-full justify-start px-4 py-2 text-sm font-medium capitalize data-[state=active]:bg-brand-50 data-[state=active]:text-brand-600 dark:data-[state=active]:bg-brand-900/20 dark:data-[state=active]:text-brand-400"
                                >
                                    {tab}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>

                {/* Main Feed */}
                <div className={`flex-1 ${activeTab === 'marketplace' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-6'}`}>
                    {isLoading ? (
                        <div className="text-center py-12 col-span-full">Loading...</div>
                    ) : (
                        posts?.map((post) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card
                                    className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => setSelectedPostId(post.id)}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                                                {post.author?.avatar ? (
                                                    <img src={post.author.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-slate-500 font-bold">{post.author?.firstName?.[0]}</span>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                                    {post.author?.firstName} {post.author?.lastName}
                                                </h3>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(post.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                                            {post.category}
                                        </span>
                                    </div>

                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{post.title}</h2>
                                    <p className="text-slate-600 dark:text-slate-400 line-clamp-3 mb-4">
                                        {post.content}
                                    </p>

                                    <div className="flex items-center gap-6 text-slate-500 text-sm">
                                        <button className="flex items-center gap-1 hover:text-brand-600 transition-colors">
                                            <Heart className="w-4 h-4" />
                                            {post.likes}
                                        </button>
                                        <button className="flex items-center gap-1 hover:text-brand-600 transition-colors">
                                            <MessageSquare className="w-4 h-4" />
                                            {/* We'd need comment count here, relying on manual fetch or join later */}
                                            Comments
                                        </button>
                                        <button className="flex items-center gap-1 hover:text-brand-600 transition-colors ml-auto">
                                            <Share2 className="w-4 h-4" />
                                            Share
                                        </button>
                                    </div>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
