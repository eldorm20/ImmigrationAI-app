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
import { MessageSquare, Heart, Share2, Send, Loader2, MoreVertical, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
            <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                {isLoading || !post ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-1 p-6">
                            {/* Post Header */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-12 h-12">
                                        <AvatarImage src={post.author?.avatar} />
                                        <AvatarFallback>{post.author?.firstName?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                            {post.author?.firstName} {post.author?.lastName}
                                        </h3>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span className="capitalize bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs">
                                                {post.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {(user?.id === post.userId || user?.role === 'admin') && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                className="text-red-600 focus:text-red-600"
                                                onClick={() => deleteMutation.mutate()}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete Post
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>

                            {/* Post Content */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-black mb-4">{post.title}</h2>
                                <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                    {post.content}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-6 py-4 border-y border-slate-100 dark:border-slate-800 mb-6">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex gap-2"
                                    onClick={() => likeMutation.mutate()}
                                >
                                    <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                                    {post.likes} Likes
                                </Button>
                                <Button variant="ghost" size="sm" className="flex gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    {post.comments?.length || 0} Comments
                                </Button>
                                <Button variant="ghost" size="sm" className="flex gap-2 ml-auto">
                                    <Share2 className="w-4 h-4" />
                                    Share
                                </Button>
                            </div>

                            {/* Comments Section */}
                            <div className="space-y-6">
                                <h4 className="font-bold text-lg">Comments</h4>
                                {post.comments?.map((comment: any) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <Avatar className="w-8 h-8 mt-1">
                                            <AvatarImage src={comment.author?.avatar} />
                                            <AvatarFallback>{comment.author?.firstName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="font-semibold text-sm">
                                                    {comment.author?.firstName} {comment.author?.lastName}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(comment.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                                {comment.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {(!post.comments || post.comments.length === 0) && (
                                    <p className="text-center text-slate-500 py-4">No comments yet. Be the first to share your thoughts!</p>
                                )}
                            </div>
                        </ScrollArea>

                        {/* Comment Input */}
                        <div className="p-4 border-t bg-white dark:bg-slate-900">
                            <div className="flex gap-2">
                                <Avatar className="w-8 h-8">
                                    {/* Current user avatar if available */}
                                    <AvatarFallback>Me</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 flex gap-2">
                                    <Textarea
                                        placeholder="Write a comment..."
                                        className="min-h-[40px] max-h-[120px] resize-none"
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
                                        onClick={() => commentMutation.mutate(commentText)}
                                        disabled={!commentText.trim() || commentMutation.isPending}
                                    >
                                        {commentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
