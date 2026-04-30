"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  message: string;
  read: boolean;
  liabilityId: string;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then(setNotifications)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread > 0) markAllRead();
        }}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">
            Notifications
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={`/dashboard/liabilities/${n.liabilityId}`}
                onClick={() => setOpen(false)}
                className={`block px-4 py-3 text-sm border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  !n.read ? "bg-blue-50" : ""
                }`}
              >
                <p className="text-gray-800">{n.message}</p>
                <p className="text-gray-400 text-xs mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
