import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, Truck, Check, AlertCircle, Building, MapPin, DollarSign, Package } from 'lucide-react';
import { Partner, DispatchItem } from '../../types';
import { sandboxAdapter } from '../../services/local-adapter';
import { validateDispatchServerSide } from '../../services/api-client';
import { useAuth } from '../../context/AuthContext';
import { calculateItemTotals } from '../../domain/dispatch-rules';

interface CreateDispatchFormProps {
  onBack: () => void;
  onSuccess: (dispatchId: string) => void;
}

interface ItemRow {
  name: string;
  skuOrBatch: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export const CreateDispatchForm: React.FC<CreateDispatchFormProps> = ({ onBack, onSuccess }) => {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [originLocation, setOriginLocation] = useState('Apex Central Warehouse (Bay 4)');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState<ItemRow[]>([
    {
      name: 'High-Torque Drive Motor',
      skuOrBatch: 'MOT-7820',
      quantity: 12,
      unit: 'units',
      unitPrice: 350
    },
    {
      name: 'Ceramic Bearing Assemblies',
      skuOrBatch: 'BRG-102',
      quantity: 50,
      unit: 'sets',
      unitPrice: 42
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPartners() {
      const list = await sandboxAdapter.listPartners();
      setPartners(list);
      if (list.length > 0) {
        setSelectedPartnerId(list[0].id);
        setDestinationLocation(list[0].address);
      }
    }
    loadPartners();
  }, []);

  const handlePartnerChange = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    const p = partners.find(it => it.id === partnerId);
    if (p) {
      setDestinationLocation(p.address);
    }
  };

  const handleItemChange = (index: number, field: keyof ItemRow, value: string | number) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: field === 'quantity' || field === 'unitPrice' ? Number(value) || 0 : value
    };
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        name: '',
        skuOrBatch: `SKU-${Date.now().toString().slice(-4)}`,
        quantity: 1,
        unit: 'units',
        unitPrice: 10
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const { totalQuantity, totalValue } = calculateItemTotals(
    items.map(it => ({ ...it, id: 'temp', totalValue: it.quantity * it.unitPrice }))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic frontend checks
    if (!selectedPartnerId) {
      setError('Please select a destination partner.');
      return;
    }
    if (!originLocation.trim()) {
      setError('Origin location is required.');
      return;
    }
    if (!destinationLocation.trim()) {
      setError('Destination location is required.');
      return;
    }
    if (items.some(it => !it.name.trim() || it.quantity <= 0)) {
      setError('Every manifest item must have a valid description and quantity > 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Server-side validation
      const serverCheck = await validateDispatchServerSide({
        receiverPartnerId: selectedPartnerId,
        originLocation,
        destinationLocation,
        items
      });

      if (!serverCheck.valid && serverCheck.errors) {
        throw new Error(serverCheck.errors.join('; '));
      }

      // Execute creation via adapter
      const newDispatch = await sandboxAdapter.createDispatch({
        senderId: user?.id || 'sender-demo',
        senderName: user?.name || (user as any)?.fullName || 'Carlos Mendoza',
        receiverPartnerId: selectedPartnerId,
        originLocation,
        destinationLocation,
        notes,
        items
      });

      onSuccess(newDispatch.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register dispatch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dispatches</span>
        </button>

        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono">
          Sandbox Persistence Active
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-slate-100 shadow-xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-indigo-400" />
            <span>Generate New Business Dispatch</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Build and seal a cryptographic manifest. The receiver partner can view and reconcile delivered goods.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Validation Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Partner & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Destination Receiving Partner <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select
                  value={selectedPartnerId}
                  onChange={(e) => handlePartnerChange(e.target.value)}
                  required
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.contactName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Origin Dispatch Location <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={originLocation}
                  onChange={(e) => setOriginLocation(e.target.value)}
                  placeholder="Warehouse Dock / Storage Facility"
                  required
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Destination Delivery Address <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={destinationLocation}
                onChange={(e) => setDestinationLocation(e.target.value)}
                placeholder="Partner dock or physical street address"
                required
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {/* Items Manifest Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-400" />
                  <span>Manifest Cargo Items</span>
                </h3>
                <span className="text-xs text-slate-400">Specify item names, batches, and unit values.</span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-medium border border-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 sm:p-4 rounded-xl bg-slate-950/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] text-slate-400 mb-1">Item Description</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      placeholder="e.g. Industrial Valve Set"
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">SKU / Batch</label>
                    <input
                      type="text"
                      value={item.skuOrBatch}
                      onChange={(e) => handleItemChange(idx, 'skuOrBatch', e.target.value)}
                      placeholder="BAT-001"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Unit Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-4">
                    <span className="font-mono text-xs text-emerald-400 font-semibold sm:hidden">
                      ${(item.quantity * item.unitPrice).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveItem(idx)}
                      aria-label={`Remove item #${idx + 1}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 disabled:opacity-20 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Handling & Delivery Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Keep upright, fragile seals, inspect seals before unloading."
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Totals Summary Card */}
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-400">Total Items in Shipment:</span>{' '}
              <span className="font-bold text-white ml-1">{items.length} item lines ({totalQuantity} units)</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400">Total Declared Value:</span>{' '}
              <span className="font-mono text-base font-bold text-emerald-400 ml-1">
                ${totalValue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Authorizing & Sealing...</span>
                </span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Dispatch Manifest</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
