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
            return await apiRequest<any>(`/companies/search?q=${encodeURIComponent(debouncedQuery)}`);
        },
        enabled: debouncedQuery.length > 2,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setDebouncedQuery(searchQuery);
    };

    return (
        <div className="space-y-8 bg-white dark:bg-slate-950 min-h-full">
            {/* Gov.uk Style Header */}
            <div className="bg-[#005ea5] text-white p-6 -mx-6 -mt-8 mb-8 border-b-4 border-[#ffdd00]">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-1 font-serif">Companies House</h1>
                        <p className="text-sm font-medium opacity-90">Find and update company information</p>
                    </div>
                    <Building size={48} className="opacity-20" />
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-[#f3f2f1] dark:bg-slate-900 p-8 border-l-4 border-[#005ea5] shadow-sm">
                    <h2 className="text-2xl font-bold mb-4">Search the register</h2>
                    <p className="mb-6 text-slate-700 dark:text-slate-300">
                        Enter the name or number of the company you wish to verify.
                    </p>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                type="search"
                                placeholder="e.g. 12345678 or Apple Ltd"
                                className="h-12 text-lg border-2 border-slate-900 rounded-none focus-visible:ring-0 focus-visible:border-[#005ea5]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button
                            type="submit"
                            className="h-12 px-8 bg-[#00703c] hover:bg-[#005a30] text-white font-bold rounded-none shadow-[0_4px_0_#002d18]"
                        >
                            Search
                        </Button>
                    </form>
                </div>

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
                                                        <Badge variant={company.sponsor_license.status === "licensed" ? "default" : "secondary"}>
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
        </div>
    );
}
