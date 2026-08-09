import React, { createContext, useContext, useState, useEffect } from "react";

export interface Notification {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    type: "job_match" | "system" | "accommodation";
    link?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, "id" | "time" | "read">) => void;
    markAsRead: (id: string) => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        const saved = localStorage.getItem("local_notifications");
        return saved ? JSON.parse(saved) : [];
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    useEffect(() => {
        localStorage.setItem("local_notifications", JSON.stringify(notifications));
    }, [notifications]);

    const addNotification = (notif: Omit<Notification, "id" | "time" | "read">) => {
        // Check user settings from localStorage
        const savedSettings = localStorage.getItem("notification_settings");
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (notif.type === "job_match" && !settings.jobMatches) return;
            if (notif.type === "accommodation" && !settings.accAlerts) return;
            if (notif.type === "system" && !settings.appUpdates) return;
            if (settings.dndMode) return;
        }

        const newNotif: Notification = {
            ...notif,
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
        };
        setNotifications((prev) => [newNotif, ...prev]);
    };

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
};
