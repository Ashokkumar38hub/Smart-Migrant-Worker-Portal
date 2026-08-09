import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, User, Search, Loader2, Briefcase } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";

interface Conversation {
    jobId: string;
    jobTitle: string;
    otherUserId: string;
    otherUserName: string;
    lastMessage: string;
    timestamp: string;
    unread?: boolean;
}

interface ChatInboxProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectChat: (jobId: string, jobName: string, receiverId: string, receiverName: string) => void;
}

const ChatInbox = ({ isOpen, onOpenChange, onSelectChat }: ChatInboxProps) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchConversations = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const currentUserId = session.user.id;

            // Fetch all messages for the current user
            const { data: messages, error } = await supabase
                .from("messages")
                .select(`
                    id,
                    job_id,
                    sender_id,
                    receiver_id,
                    content,
                    created_at,
                    is_read,
                    jobs (title)
                `)
                .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Group by conversation (jobId + otherUserId)
            const groupedConversations: Record<string, any> = {};
            const otherUserIds: string[] = [];

            messages?.forEach((msg: any) => {
                const otherId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
                const conversationKey = `${msg.job_id}_${otherId}`;

                if (!groupedConversations[conversationKey]) {
                    groupedConversations[conversationKey] = {
                        jobId: msg.job_id,
                        jobTitle: msg.jobs?.title || "Unknown Job",
                        otherUserId: otherId,
                        lastMessage: msg.content,
                        timestamp: msg.created_at,
                        unread: !msg.is_read && msg.receiver_id === currentUserId
                    };
                    if (!otherUserIds.includes(otherId)) {
                        otherUserIds.push(otherId);
                    }
                } else if (!msg.is_read && msg.receiver_id === currentUserId) {
                    groupedConversations[conversationKey].unread = true;
                }
            });

            // Fetch names of other users
            if (otherUserIds.length > 0) {
                const [{ data: profiles }, { data: providerProfiles }] = await Promise.all([
                    supabase.from("profiles").select("id, full_name").in("id", otherUserIds),
                    supabase.from("provider_profiles").select("id, company_name, contact_person").in("id", otherUserIds)
                ]);

                const profileMap: Record<string, string> = {};
                profiles?.forEach(p => profileMap[p.id] = p.full_name);
                providerProfiles?.forEach(p => profileMap[p.id] = p.company_name || p.contact_person);

                const finalConversations: Conversation[] = Object.values(groupedConversations).map(c => ({
                    ...c,
                    otherUserName: profileMap[c.otherUserId] || "Unknown User"
                }));

                setConversations(finalConversations);
            } else {
                setConversations([]);
            }
        } catch (err) {
            console.error("Error fetching conversations:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchConversations();
        }
    }, [isOpen]);

    const filteredConversations = conversations.filter(c =>
        c.otherUserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[750px] w-[95vw] h-[85vh] p-0 gap-0 bg-card border-border overflow-hidden flex flex-col">
                <DialogHeader className="p-4 border-b border-border bg-muted/30">
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Messages
                    </DialogTitle>
                    <DialogDescription>
                        Your recent conversations with providers and workers.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-3 border-b border-border bg-background">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search chats..."
                            className="pl-9 h-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <p className="text-sm italic">Loading conversations...</p>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                <MessageSquare className="h-6 w-6 text-muted-foreground/40" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">No messages yet</p>
                                <p className="text-xs text-muted-foreground">When you start chatting with someone, they will appear here.</p>
                            </div>
                        </div>
                    ) : (
                        <ScrollArea className="h-full">
                            <div className="divide-y divide-border/50">
                                {filteredConversations.map((chat) => (
                                    <button
                                        key={`${chat.jobId}_${chat.otherUserId}`}
                                        className="w-full p-4 flex gap-3 hover:bg-muted/50 transition-colors text-left"
                                        onClick={() => {
                                            onSelectChat(chat.jobId, chat.jobTitle, chat.otherUserId, chat.otherUserName);
                                            onOpenChange(false);
                                        }}
                                    >
                                        <Avatar className="h-12 w-12 border border-border shadow-sm">
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                {chat.otherUserName[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h3 className={`font-bold text-sm truncate ${chat.unread ? 'text-foreground' : 'text-foreground/80'}`}>{chat.otherUserName}</h3>
                                                <span className={`text-[10px] whitespace-nowrap ${chat.unread ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                                    {formatDistanceToNow(new Date(chat.timestamp), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Briefcase className="h-3 w-3 text-primary/60" />
                                                <span className="text-[10px] font-medium text-primary/80 truncate">{chat.jobTitle}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-xs line-clamp-1 italic ${chat.unread ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                                                    {chat.lastMessage}
                                                </p>
                                                {chat.unread && (
                                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <div className="p-4 border-t border-border bg-muted/20 text-center">
                    <p className="text-[10px] text-muted-foreground italic">
                        All chats are monitored for security and safety.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ChatInbox;
