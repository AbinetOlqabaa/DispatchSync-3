import React, { useEffect, useState } from 'react';
import {
  X,
  Send,
  Smartphone,
  Mail,
  Webhook,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { NotificationItem } from '../../types/dispatch.js';
import { api } from '../../services/api.js';

interface OutboxManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OutboxManagerModal: React.FC<OutboxManagerModalProps> = ({ isOpen, onClose }) => {
  const [outboxItems, setOutboxItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'SMS' | 'EMAIL' | 'WEBHOOK'>('ALL');

  // Test send form
  const [testChannel, setTestChannel] = useState<'SMS' | 'EMAIL' | 'WHATSAPP' | 'WEBHOOK'>('SMS');
  const [testRecipient, setTestRecipient] = useState('+1-555-014-4411');
  const [testTitle, setTestTitle] = useState('Inbound Delivery Manifest Alert');
  const [testMessage, setTestMessage] = useState('Shipment DSP-2026-0081 has departed origin dock. Review at /?token=sh_demo');
  const [isSending, setIsSending] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadOutbox();
    }
  }, [isOpen]);

  const loadOutbox = async () => {
    setLoading(true);
    try {
      const items = await api.getOutboxNotifications();
      setOutboxItems(items);
    } catch (err: any) {
      console.error('Failed to load outbox:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;
    setIsSending(true);
    setActionNotice(null);

    try {
      const created = await api.sendOutboundNotification({
        channel: testChannel,
        recipient: testRecipient,
        title: testTitle,
        message: testMessage,
      });
      setOutboxItems([created, ...outboxItems]);
      setActionNotice(`Successfully simulated outbound dispatch via ${testChannel}.`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      setActionNotice(`Failed to send: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      const updated = await api.retryNotificationDelivery(id);
      setOutboxItems(outboxItems.map((item) => (item.id === id ? updated : item)));
      setActionNotice('Notification delivery attempt retried successfully.');
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      setActionNotice(`Retry failed: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  const filteredItems = outboxItems.filter((item) => {
    if (activeTab === 'ALL') return true;
    return item.channel === activeTab;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-950/80 rounded-xl border border-indigo-800 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Outbound Notification Delivery Gateway
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800">
                  Staging Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Multi-channel queue tracking for SMS, Email, WhatsApp, and Webhook dispatch adapters (.ai/05_NOTIFICATIONS_AND_AUDIT.md)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {actionNotice && (
            <div className="p-3 rounded-xl bg-teal-950/60 border border-teal-800 text-teal-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* Test send form */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-sky-400" />
                Dispatch Test Outbound Alert
              </span>
              <span className="text-[11px] text-slate-500">Staging sandbox delivery simulator</span>
            </div>

            <form onSubmit={handleSendTest} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Channel Adapter</label>
                <select
                  value={testChannel}
                  onChange={(e) => {
                    const c = e.target.value as any;
                    setTestChannel(c);
                    if (c === 'SMS' || c === 'WHATSAPP') setTestRecipient('+1-555-014-4411');
                    else if (c === 'EMAIL') setTestRecipient('ops@metroretail.com');
                    else if (c === 'WEBHOOK') setTestRecipient('https://api.partner.internal/webhook');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                >
                  <option value="SMS">SMS (Twilio Gateway)</option>
                  <option value="EMAIL">Email (SMTP Relayer)</option>
                  <option value="WHATSAPP">WhatsApp (Meta Sandbox)</option>
                  <option value="WEBHOOK">Webhook (HTTPS Signed)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Target Recipient / Endpoint</label>
                <input
                  type="text"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  required
                />
              </div>

              <div className="md:col-span-2 flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-[11px] text-slate-400 block mb-1">Message Preview</label>
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer shrink-0"
                >
                  {isSending ? 'Sending...' : 'Dispatch'}
                </button>
              </div>
            </form>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-1.5 text-xs">
              {(['ALL', 'SMS', 'EMAIL', 'WEBHOOK'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                    activeTab === tab
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              onClick={loadOutbox}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Queue</span>
            </button>
          </div>

          {/* Outbox queue items */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading delivery outbox...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                No outbound notifications recorded in this channel filter.
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">
                        {item.channel === 'SMS' && <Smartphone className="w-4 h-4 text-emerald-400" />}
                        {item.channel === 'EMAIL' && <Mail className="w-4 h-4 text-sky-400" />}
                        {item.channel === 'WHATSAPP' && <Smartphone className="w-4 h-4 text-teal-400" />}
                        {item.channel === 'WEBHOOK' && <Webhook className="w-4 h-4 text-purple-400" />}
                        {item.channel === 'IN_APP' && <Layers className="w-4 h-4 text-indigo-400" />}
                      </span>

                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{item.title}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {item.channel}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Recipient: <span className="text-slate-300">{item.recipientUserId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{item.providerDeliveryStatus || item.status}</span>
                      </span>

                      {item.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(item.id)}
                          className="px-2 py-0.5 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 text-[10px] font-semibold cursor-pointer"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                    {item.message}
                  </p>

                  <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                    <div className="flex items-center gap-3">
                      <span>Provider: {item.providerInfo || 'Standard Delivery Adapter'}</span>
                      <span>Attempts: {item.deliveryAttempts || 1}</span>
                    </div>
                    <div>Sent: {new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Idempotent queue execution with bounded retry policy</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
          >
            Close Gateway
          </button>
        </div>
      </div>
    </div>
  );
};
