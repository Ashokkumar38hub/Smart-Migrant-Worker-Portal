import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Flag, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import ReportModal from "@/components/ReportModal";

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    sender_name?: string;
}

interface ChatDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    jobId: string;
    jobName?: string;
    receiverId: string;
    receiverName: string;
    currentUserRole: 'worker' | 'provider';
}

const ChatDialog = ({
    isOpen,
    onOpenChange,
    jobId,
    jobName,
    receiverId,
    receiverName,
    currentUserRole
}: ChatDialogProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) setCurrentUserId(session.user.id);
        };
        fetchUser();
    }, []);

    const markAsRead = async () => {
        if (!currentUserId || !jobId || !receiverId) return;

        const { error } = await supabase
            .from("messages")
            .update({ is_read: true })
            .eq("job_id", jobId)
            .eq("sender_id", receiverId)
            .eq("receiver_id", currentUserId)
            .eq("is_read", false);

        if (error) {
            console.error("Error marking messages as read:", error);
        }
    };

    useEffect(() => {
        if (!isOpen || !currentUserId) return;

        const setupChat = async () => {
            setLoading(true);
            // Fetch message history
            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .eq("job_id", jobId)
                .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`)
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error fetching messages:", error);
                toast.error("Failed to load chat history");
            } else {
                setMessages(data || []);
                await markAsRead();
            }
            setLoading(false);
            setTimeout(scrollToBottom, 100);
        };

        setupChat();

        // Real-time subscription
        const channel = supabase
            .channel(`chat:${jobId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `job_id=eq.${jobId}`,
                },
                (payload) => {
                    const msg = payload.new as Message;
                    // Check if message belongs to this conversation
                    if (
                        (msg.sender_id === currentUserId && msg.receiver_id === receiverId) ||
                        (msg.sender_id === receiverId && msg.receiver_id === currentUserId)
                    ) {
                        setMessages((prev) => [...prev, msg]);
                        setTimeout(scrollToBottom, 50);

                        // If it's an incoming message while dialog is open, mark it as read
                        if (msg.sender_id === receiverId) {
                            markAsRead();
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOpen, jobId, receiverId, currentUserId]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending || !currentUserId) return;

        setSending(true);
        const content = newMessage.trim();
        setNewMessage("");

        try {
            const { error } = await supabase.from("messages").insert({
                job_id: jobId,
                sender_id: currentUserId,
                receiver_id: receiverId,
                content: content,
            });

            if (error) {
                console.error("Error sending message:", error);
                toast.error("Failed to send message");
                setNewMessage(content); // Restore message
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred");
        } finally {
            setSending(false);
        }
    };

    const handleReport = () => {
        setIsReportModalOpen(true);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[750px] w-[95vw] h-[85vh] flex flex-col p-0 bg-card border-border overflow-hidden">
                    <DialogHeader className="p-4 border-b border-border bg-muted/30 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold">{receiverName}</DialogTitle>
                                <p className="text-xs text-muted-foreground">Direct Message</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="flex-1 p-4">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-10">
                                <MessageCircle className="h-12 w-12 mb-2" />
                                <p className="text-sm font-medium">No messages yet</p>
                                <p className="text-xs">Start a conversation about the job.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${msg.sender_id === currentUserId
                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                : "bg-muted text-foreground rounded-tl-none border border-border"
                                                }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                            <p className={`text-[10px] mt-1 opacity-70 ${msg.sender_id === currentUserId ? "text-right" : "text-left"
                                                }`}>
                                                {format(new Date(msg.created_at), "h:mm a")}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </div>
                        )}
                    </ScrollArea>

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-muted/30 flex gap-2">
                        <Input
                            placeholder="Type your message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="flex-1 bg-background"
                            disabled={sending}
                        />
                        <Button type="submit" size="icon" disabled={sending || !newMessage.trim()} className="shrink-0">
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <ReportModal
                isOpen={isReportModalOpen}
                onOpenChange={setIsReportModalOpen}
                reportedId={receiverId}
                reportedName={receiverName}
                entityType={currentUserRole === 'worker' ? 'provider' : 'worker'}
                jobId={jobId}
                jobTitle={jobName}
                chatEvidence={messages.slice(-20)} // Send last 20 messages as evidence
            />
        </>
    );
};

import { MessageCircle } from "lucide-react";

export default ChatDialog;
