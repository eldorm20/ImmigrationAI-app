
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    User,
    MapPin,
    Phone,
    Mail,
    Calendar,
    Briefcase,
    FileText,
    Clock,
    ShieldAlert
} from "lucide-react";
import { format } from "date-fns";

interface ClientProfileProps {
    client: any; // Using any for now to match the flexible client object structure
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ClientProfile({ client, open, onOpenChange }: ClientProfileProps) {
    if (!client) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>Client Profile</DialogTitle>
                </DialogHeader>

                <ScrollArea className="h-full max-h-[calc(85vh-60px)]">
                    <div className="p-6 space-y-8">
                        {/* Header Section */}
                        <div className="flex items-start gap-6">
                            <Avatar className="h-24 w-24 border-4 border-primary/10">
                                <AvatarImage src={client.avatar} alt={client.name} />
                                <AvatarFallback className="text-2xl">{client.name?.charAt(0)}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold">{client.name}</h2>
                                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                                            <MapPin className="h-4 w-4" />
                                            {client.nationality || "Nationality not specified"}
                                        </p>
                                    </div>
                                    <Badge variant={client.status === 'Active' ? 'default' : 'secondary'} className="px-3 py-1">
                                        {client.status || "Unknown Status"}
                                    </Badge>
                                </div>

                                <div className="flex flex-wrap gap-3 mt-4">
                                    {client.email && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                                            <Mail className="h-3.5 w-3.5" />
                                            {client.email}
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                                            <Phone className="h-3.5 w-3.5" />
                                            {client.phone}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Application Info */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2 text-primary">
                                    <Briefcase className="h-4 w-4" />
                                    Application Details
                                </h3>
                                <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <span className="text-muted-foreground">Visa Type:</span>
                                        <span className="font-medium text-right">{client.visaType || "N/A"}</span>

                                        <span className="text-muted-foreground">Target Country:</span>
                                        <span className="font-medium text-right">{client.country || "UK"}</span>

                                        <span className="text-muted-foreground">Application Date:</span>
                                        <span className="font-medium text-right">
                                            {client.date ? format(new Date(client.date), 'MMM d, yyyy') : "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2 text-primary">
                                    <Clock className="h-4 w-4" />
                                    Status & Progress
                                </h3>
                                <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <span className="text-muted-foreground">Progress:</span>
                                        <span className="font-medium text-right">{client.progress || 0}%</span>

                                        <span className="text-muted-foreground">Next Step:</span>
                                        <span className="font-medium text-right truncate pl-2" title={client.nextStep}>
                                            {client.nextStep || "None"}
                                        </span>

                                        <span className="text-muted-foreground">Last Activity:</span>
                                        <span className="font-medium text-right">
                                            {client.lastActive ? format(new Date(client.lastActive), 'MMM d') : "Recently"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes / Additional Info */}
                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-primary">
                                <FileText className="h-4 w-4" />
                                Notes
                            </h3>
                            <div className="bg-muted/30 rounded-lg p-4 border min-h-[100px] text-sm text-muted-foreground">
                                {client.notes ? (
                                    <p>{client.notes}</p>
                                ) : (
                                    <p className="italic text-muted-foreground/60">No notes available for this client.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
