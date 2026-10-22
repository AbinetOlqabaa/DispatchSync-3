import React from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Eye,
  AlertTriangle,
  Truck,
  FileCheck,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { NotificationItem } from '../../types/dispatch.js';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDispatch: (dispatchId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectDispatch,
}) => {
  const { notifications, unreadNotifsCount, markNotificationAsRead, markAllNotificationsAsRead } =
    useAuth();

  if (!isOpen) return null;

  const getEventIcon = (eventType: NotificationItem['eventType']) => {
    switch (eventType) {
      case 'DISPATCH_VIEWED':
        return <Eye className="w-4 h-4 text-sky-400" />;
      case 'DISCREPANCY_OPENED':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'RECEIPT_SUBMITTED':
        return <FileCheck className="w-4 h-4 text-emerald-400" />;
      case 'DISPATCH_SUBMITTED':
        return <Truck className="w-4 h-4 text-indigo-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="w-full max-w-sm sm:max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Notifications</h2>
            {unreadNotifsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white">
                {unreadNotifsCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadNotifsCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Close notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No notifications yet. Activity alerts will appear here.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-xl transition-colors cursor-pointer flex items-start gap-3 ${
                  notif.isRead ? 'hover:bg-slate-800/40 opacity-80' : 'bg-slate-800/60 hover:bg-slate-800'
                }`}
                onClick={() => {
                  if (!notif.isRead) markNotificationAsRead(notif.id);
                  if (notif.dispatchId) {
                    onSelectDispatch(notif.dispatchId);
                    onClose();
                  }
                }}
              >
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-700 shrink-0 mt-0.5">
                  {getEventIcon(notif.eventType)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-white truncate">{notif.title}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">{notif.message}</p>

                  <div className="flex items-center gap-2 mt-2">
                    {notif.dispatchNumber && (
                      <span className="font-mono text-[10px] text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                        {notif.dispatchNumber}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">Channel: {notif.channel}</span>
                    <span className="text-[10px] text-emerald-400 font-medium ml-auto">
                      {notif.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
