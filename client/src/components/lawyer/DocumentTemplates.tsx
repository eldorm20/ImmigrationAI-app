
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Search, Trash2, Edit, Copy, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function DocumentTemplates() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null); // For edit mode

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'contract',
        content: '',
    });

    // Fetch Templates
    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['/api/templates'],
        queryFn: async () => {
            const res = await apiRequest('GET', '/api/templates');
            return res.json();
        }
    });

    // Create Template Mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest('POST', '/api/templates', data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
            setIsCreateOpen(false);
            resetForm();
            toast({ title: 'Template Created', description: 'Your new template has been saved.' });
        },
        onError: () => {
            toast({ title: 'Error', description: 'Failed to create template.', variant: 'destructive' });
        }
    });

    const resetForm = () => {
        setFormData({ title: '', description: '', category: 'contract', content: '' });
        setEditingTemplate(null);
    };

    const handleCreate = () => {
        if (!formData.title || !formData.content) {
            toast({ title: 'Missing fields', description: 'Title and content are required.', variant: 'destructive' });
            return;
        }
        createMutation.mutate(formData);
    };

    const categories = ['contract', 'letter', 'form', 'email', 'other'];

    const filteredTemplates = templates.filter((t: any) => {
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Document Templates</h2>
                    <p className="text-slate-500">Manage your legal document templates and standard forms.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-brand-600 hover:bg-brand-700 text-white">
                            <Plus size={18} className="mr-2" />
                            New Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create New Template</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Template Title</Label>
                                    <Input
                                        placeholder="e.g. Service Agreement"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(val) => setFormData({ ...formData, category: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(c => (
                                                <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input
                                    placeholder="Brief description of when to use this template"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Content (Markdown/Text)</Label>
                                <div className="text-xs text-slate-500 mb-1">Use {'{{'}variables{'}}'} for dynamic fields.</div>
                                <Textarea
                                    className="min-h-[300px] font-mono text-sm"
                                    placeholder="# AGREEEMENT&#10;&#10;This agreement is made between {{client_name}} and {{lawyer_name}}..."
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                                    {createMutation.isPending ? 'Saving...' : 'Save Template'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                        placeholder="Search templates..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
                        onClick={() => setSelectedCategory('all')}
                        size="sm"
                    >
                        All
                    </Button>
                    {categories.map(c => (
                        <Button
                            key={c}
                            variant={selectedCategory === c ? 'secondary' : 'ghost'}
                            onClick={() => setSelectedCategory(c)}
                            size="sm"
                            className="capitalize"
                        >
                            {c}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="text-center py-12 text-slate-500">Loading templates...</div>
            ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-gray-100">No templates found</h3>
                    <p className="text-slate-500">Get started by creating your first document template.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map((template: any) => (
                        <Card key={template.id} className="hover:shadow-md transition-shadow group cursor-pointer relative overflow-hidden">
                            {template.isSystem && (
                                <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-bl-lg">
                                    System
                                </div>
                            )}
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <Badge variant="outline" className="mb-2 capitalize">{template.category}</Badge>
                                </div>
                                <CardTitle className="text-lg">{template.title}</CardTitle>
                                <CardDescription className="line-clamp-2">
                                    {template.description || 'No description provided.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-slate-400 mb-4">
                                    Last updated: {new Date(template.updatedAt).toLocaleDateString()}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="secondary" className="w-full text-xs" size="sm">
                                        <Edit size={14} className="mr-1" /> Edit
                                    </Button>
                                    <Button variant="outline" className="w-full text-xs" size="sm">
                                        <Copy size={14} className="mr-1" /> Use
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
