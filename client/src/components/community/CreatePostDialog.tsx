import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/lib/useToast';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const createPostSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    content: z.string().min(5, "Content must be at least 5 characters"),
    category: z.enum(["general", "news", "marketplace", "forum", "jobs", "announcements"]),
});

interface CreatePostDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreatePostDialog({ open, onOpenChange }: CreatePostDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof createPostSchema>>({
        resolver: zodResolver(createPostSchema),
        defaultValues: {
            title: "",
            content: "",
            category: "general"
        },
    });

    const mutation = useMutation({
        mutationFn: async (values: z.infer<typeof createPostSchema>) => {
            return apiRequest('/community/posts', {
                method: 'POST',
                body: JSON.stringify(values)
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/community/posts'] });
            toast({
                title: "Post Created",
                description: "Your post has been shared with the community.",
            });
            form.reset();
            onOpenChange(false);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create post",
                variant: "destructive"
            });
        }
    });

    const onSubmit = (values: z.infer<typeof createPostSchema>) => {
        mutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto glass-premium border-white/20 p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-brand-600/10 to-indigo-600/10 absolute inset-0 pointer-events-none"></div>

                <div className="relative z-10 p-6">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white">Create Post</DialogTitle>
                        <DialogDescription className="text-slate-600 dark:text-slate-400 font-medium">
                            Share your thoughts, questions, or listings with the community.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-900 dark:text-slate-100 font-bold ml-1">Title</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="What's on your mind?"
                                                {...field}
                                                className="glass-input bg-white/50 dark:bg-slate-950/50 border-white/40 font-medium h-12 text-lg focus:shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-900 dark:text-slate-100 font-bold ml-1">Category</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="glass-input bg-white/50 dark:bg-slate-950/50 border-white/40 h-12 font-medium">
                                                    <SelectValue placeholder="Select a category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="glass-panel border-white/20">
                                                <SelectItem value="general">General Discussion</SelectItem>
                                                <SelectItem value="news">News & Updates</SelectItem>
                                                <SelectItem value="marketplace">Marketplace</SelectItem>
                                                <SelectItem value="forum">Q&A Forum</SelectItem>
                                                <SelectItem value="jobs">Jobs & Careers</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-900 dark:text-slate-100 font-bold ml-1">Content</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Write your post details here..."
                                                className="min-h-[200px] glass-input bg-white/50 dark:bg-slate-950/50 border-white/40 font-medium resize-none focus:shadow-[0_0_20px_rgba(59,130,246,0.2)] text-base leading-relaxed"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="gap-2 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    className="rounded-xl h-11 px-6 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={mutation.isPending}
                                    className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl h-11 px-8 font-bold shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Post
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
