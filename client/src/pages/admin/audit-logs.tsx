import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/api";
import { format } from "date-fns";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Search, ArrowLeft, Loader2 } from "lucide-react";

interface AuditLog {
    id: string;
    action: string;
    resourceType: string;
    resourceId: string;
    userId: string;
    ipAddress?: string;
    timestamp: string;
    metadata?: any;
}

export default function AuditLogsPage() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (user && user.role !== "admin") {
            setLocation("/");
            return;
        }
        fetchLogs();
    }, [user, page]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page: String(page),
                limit: "20",
                action: search
            });
            const res: any = await apiRequest(`/audit?${query.toString()}`);
            setLogs(res.data);
            setTotalPages(res.pagination.pages);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLogs();
    };

    if (user?.role !== "admin") return null;

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setLocation("/admin")}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Shield className="w-8 h-8 text-brand-600" />
                    Audit Logs
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>System Activity</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                            <Input
                                placeholder="Search actions..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-64"
                            />
                            <Button type="submit" variant="secondary">
                                <Search className="w-4 h-4 mr-2" /> Filter
                            </Button>
                        </form>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>User ID</TableHead>
                                        <TableHead>Resource</TableHead>
                                        <TableHead>IP Address</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">No logs found.</TableCell>
                                        </TableRow>
                                    ) : (
                                        logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="whitespace-nowrap font-mono text-xs">
                                                    {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                                                </TableCell>
                                                <TableCell className="font-medium">{log.action}</TableCell>
                                                <TableCell className="font-mono text-xs">{log.userId || "System"}</TableCell>
                                                <TableCell className="text-xs">
                                                    <span className="font-semibold">{log.resourceType}</span>
                                                    {log.resourceId && <span className="text-muted-foreground">:{log.resourceId.slice(0, 8)}...</span>}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{log.ipAddress || "-"}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
