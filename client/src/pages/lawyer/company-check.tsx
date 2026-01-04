import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Building, Calendar, MapPin, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function CompanySearch() {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    const { data, isLoading, error } = useQuery({
        queryKey: ["companies", debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery) return { items: [] };
            return await apiRequest<any>(`/api/companies/search?q=${encodeURIComponent(debouncedQuery)}`);
        },
        enabled: debouncedQuery.length > 2,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setDebouncedQuery(searchQuery);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">UK Company Check</h1>
                <Badge variant="outline" className="text-sm">
                    Official Register
                </Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Search Companies House</CardTitle>
                    <CardDescription>
                        Verify UK company details, status, and registration information.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by company name or number..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button type="submit">Search</Button>
                    </form>
                </CardContent>
            </Card>

            {/* Results */}
            {isLoading && <div>Loading...</div>}

            {data?.items && data.items.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company Name</TableHead>
                                    <TableHead>Number</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Sponsor License</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.items.map((company: any) => (
                                    <TableRow key={company.company_number}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{company.title}</span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                    {company.address_snippet}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{company.company_number}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={company.company_status === "active" ? "default" : "destructive"}
                                            >
                                                {company.company_status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {company.sponsor_license ? (
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant={company.sponsor_license.status === "licensed" ? "success" : "secondary"}>
                                                        {company.sponsor_license.status}
                                                    </Badge>
                                                    {company.sponsor_license.status === "licensed" && (
                                                        <span className="text-[10px] font-medium text-slate-500">
                                                            {company.sponsor_license.type} ({company.sponsor_license.rating})
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">No data</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{company.date_of_creation}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => {
                                                // Hypothetical details view
                                            }}>
                                                Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {data?.items?.length === 0 && debouncedQuery && !isLoading && (
                <div className="text-center py-10 text-muted-foreground">
                    No companies found matching "{debouncedQuery}"
                </div>
            )}
        </div>
    );
}
