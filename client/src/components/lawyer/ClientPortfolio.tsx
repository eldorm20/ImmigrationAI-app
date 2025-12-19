
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Search,
    MoreHorizontal,
    Mail,
    Phone,
    ArrowUpRight,
    Briefcase,
    Calendar,
    DollarSign
} from "lucide-react";
import { format } from "date-fns";

interface Client {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
    status: string;
    lastInteraction: string;
    totalSpent: number;
    caseCount: number;
    source: string;
}

export default function ClientPortfolio() {
    const [searchTerm, setSearchTerm] = useState("");

    const { data: clients, isLoading } = useQuery<Client[]>({
        queryKey: ["/practice/clients"],
        queryFn: async () => {
            const res = await fetch("/api/clients");
            if (!res.ok) throw new Error("Failed to fetch clients");
            return res.json();
        }
    });

    const filteredClients = clients?.filter(client => {
        const searchLower = searchTerm.toLowerCase();
        return (
            client.firstName.toLowerCase().includes(searchLower) ||
            client.lastName.toLowerCase().includes(searchLower) ||
            client.email.toLowerCase().includes(searchLower)
        );
    }) || [];

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case "active":
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>;
            case "lead":
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Lead</Badge>;
            case "inactive":
                return <Badge variant="secondary">Inactive</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Client Portfolio</h2>
                    <p className="text-muted-foreground">
                        Manage your client relationships, cases, and history.
                    </p>
                </div>
                <Button>
                    <Briefcase className="mr-2 h-4 w-4" />
                    Add New Client
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{clients?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            +2 from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {clients?.reduce((acc, c) => acc + (c.status === 'active' ? 1 : 0), 0) || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Currently handling
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Potential Leads</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {clients?.reduce((acc, c) => acc + (c.status === 'lead' ? 1 : 0), 0) || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            From consultations
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Est. Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${clients?.reduce((acc, c) => acc + (c.totalSpent || 0), 0).toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Lifetime value
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Clients</CardTitle>
                            <CardDescription>
                                A list of all your clients and leads including their contact details and case status.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search clients..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading clients...</div>
                    ) : filteredClients.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No clients found matching your search.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead className="text-right">Last Interaction</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredClients.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={client.avatar} alt={client.firstName} />
                                                    <AvatarFallback>{client.firstName[0]}{client.lastName[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{client.firstName} {client.lastName}</p>
                                                    <p className="text-xs text-muted-foreground">{client.caseCount} Active Case{client.caseCount !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                                    <span>{client.email}</span>
                                                </div>
                                                {client.phone && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                                        <span>{client.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(client.status)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-normal text-xs">
                                                {client.source}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            <div className="flex items-center justify-end gap-2 text-sm">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(client.lastInteraction), 'MMM d, yyyy')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(client.email)}>
                                                        Copy Email
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem>View Profile</DropdownMenuItem>
                                                    <DropdownMenuItem>Examine Case File</DropdownMenuItem>
                                                    <DropdownMenuItem>Send Message</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
