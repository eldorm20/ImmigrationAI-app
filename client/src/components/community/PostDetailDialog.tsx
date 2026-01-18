import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/useToast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Heart, Share2, Send, Loader2, MoreVertical, Trash2, X } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatedCard, LiveButton, GlassInput } from '@/components/ui/live-elements';
import { motion, AnimatePresence } from 'framer-motion';

interface PostDetailDialogProps {
    postId: string | null;
    onOpenChange: (open: boolean) => void;
}

export function PostDetailDialog({ postId, onOpenChange }: PostDetailDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [commentText, setCommentText] = useState("");

    const { data: post, isLoading } = useQuery({
        queryKey: ['/community/posts', postId],
        queryFn: () => apiRequest<any>(`/community/posts/${postId}`),
        enabled: !!postId
    });

    const commentMutation = useMutation({
        mutationFn: async (content: string) => {
            return apiRequest(`/community/posts/${postId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/community/posts', postId] });
            setCommentText("");
            toast({ title: "Comment added" });
        }
    });

    const likeMutation = useMutation({
        mutationFn: async () => {
            return apiRequest(`/community/posts/${postId}/like`, { method: 'POST' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/community/posts', postId] });
            queryClient.invalidateQueries({ queryKey: ['/community/posts'] }); // Update feed too
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            return apiRequest(`/community/posts/${postId}`, { method: 'DELETE' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/community/posts'] });
            onOpenChange(false);
            toast({ title: "Post deleted" });
        }
    });

    if (!postId) return null;

    return (
        <Dialog open={!!postId} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-900/90 backdrop-blur-2xl border-white/10 shadow-2xl">
                {isLoading || !post ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                    </div>
                ) : (
                    <>
                        {/* Header Gradient */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500 z-10" />

                        <ScrollArea className="flex-1 p-0">
                            <div className="p-6 md:p-8 space-y-8">
                                {/* Post Section */}
                                <div className="space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-0.5 rounded-full bg-gradient-to-br from-brand-400 to-indigo-600">
                                                <Avatar className="w-14 h-14 border-2 border-slate-900">
                                                    <AvatarImage src={post.author?.avatar} />
                                                    <AvatarFallback className="bg-slate-800 text-white font-bold">{post.author?.firstName?.[0]}</AvatarFallback>
                                                </Avatar>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-xl text-white">
                                                    {post.author?.firstName} {post.author?.lastName}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                                                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span className="capitalize bg-white/10 px-2.5 py-0.5 rounded-full text-xs text-brand-200 border border-white/5">
                                                        {post.category}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {(user?.id === post.userId || user?.role === 'admin') && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10">
                                                        <MoreVertical className="w-5 h-5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 text-white">
                                                    <DropdownMenuItem
                                                        className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                                                        onClick={() => deleteMutation.mutate()}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete Post
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <h2 className="text-3xl font-black text-white leading-tight tracking-tight">{post.title}</h2>
                                        <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed">
                                            {post.content}
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="flex items-center gap-4 py-4 border-y border-white/10">
                                        <LiveButton
                                            variant="ghost"
                                            size="sm"
                                            className={`gap-2 hover:bg-white/5 ${post.isLiked ? 'text-red-400' : 'text-slate-400 hover:text-red-400'}`}
                                            onClick={() => likeMutation.mutate()}
                                        >
                                            <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
                                            <span className="font-bold">{post.likes}</span> Likes
                                        </LiveButton>
                                        <div className="h-4 w-px bg-white/10" />
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <MessageSquare className="w-5 h-5" />
                                            <span className="font-bold">{post.comments?.length || 0}</span> Comments
                                        </div>
                                        <div className="ml-auto">
                                            <LiveButton variant="ghost" size="sm" className="gap-2 text-slate-400 hover:text-brand-300 hover:bg-white/5">
                                                <Share2 className="w-5 h-5" />
                                                Share
                                            </LiveButton>
                                        </div>
                                    </div>
                                </div>

                                {/* Comments Feed */}
                                <div className="space-y-6">
                                    <h4 className="font-bold text-lg text-white flex items-center gap-2">
                                        Discussion
                                        <span className="text-xs font-normal text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                            {post.comments?.length || 0}
                                        </span>
                                    </h4>

                                    <div className="space-y-4">
                                        {post.comments?.map((comment: any) => (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                key={comment.id}
                                                className="flex gap-4 group"
                                            >
                                                <Avatar className="w-10 h-10 border border-white/10 mt-1">
                                                    <AvatarImage src={comment.author?.avatar} />
                                                    <AvatarFallback className="bg-slate-700 text-white text-xs">{comment.author?.firstName?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-4 group-hover:bg-white/10 transition-colors duration-300">
                                                        <div className="flex justify-between items-baseline mb-2">
                                                            <span className="font-bold text-sm text-white">
                                                                {comment.author?.firstName} {comment.author?.lastName}
                                                            </span>
                                                            <span className="text-xs text-slate-500 font-medium">
                                                                {new Date(comment.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-300 leading-relaxed">
                                                            {comment.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                        {(!post.comments || post.comments.length === 0) && (
                                            <div className="text-center py-12 rounded-3xl bg-white/5 border border-white/5 border-dashed">
                                                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-50" />
                                                <p className="text-slate-400 font-medium">No comments yet</p>
                                                <p className="text-slate-600 text-sm">Be the first to join the conversation!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>

                        {/* Comment Input Sticky Footer */}
                        <div className="p-4 bg-slate-900 border-t border-white/10 backdrop-blur-xl">
                            <div className="flex gap-3 items-end">
                                <Avatar className="w-10 h-10 border border-white/10">
                                    <AvatarFallback className="bg-gradient-to-br from-brand-500 to-indigo-600 text-white font-bold">Me</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 relative">
                                    <Textarea
                                        placeholder="Add to the discussion..."
                                        className="min-h-[50px] max-h-[150px] resize-none bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-brand-500 rounded-2xl pr-12 py-3"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (commentText.trim()) commentMutation.mutate(commentText);
                                            }
                                        }}
                                    />
                                    <Button
                                        size="icon"
                                        className="absolute right-2 bottom-2 w-8 h-8 rounded-full bg-brand-500 hover:bg-brand-400 text-white transition-colors"
                                        onClick={() => commentMutation.mutate(commentText)}
                                        disabled={!commentText.trim() || commentMutation.isPending}
                                    >
                                        {commentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 pl-0.5" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
