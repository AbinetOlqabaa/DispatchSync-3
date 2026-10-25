import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Truck,
  Package,
  MapPin,
  Warehouse,
  AlertCircle,
  CheckCircle2,
  Phone,
  ArrowRight,
  ArrowLeft,
  FileCheck,
} from 'lucide-react';
import { Location, Partner } from '../../types/dispatch.js';
import { api } from '../../services/api.js';

interface CreateDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dispatchId: string) => void;
  preselectedPartnerId?: string;
}

export const CreateDispatchModal: React.FC<CreateDispatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedPartnerId,
}) => {
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Form Fields
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState(preselectedPartnerId || '');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [notes, setNotes] = useState('');

  // Item lines
  const [lines, setLines] = useState<
    Array<{
      sku: string;
      itemName: string;
      unit: string;
      unitPrice: number;
      quantitySent: number;
      notes?: string;
    }>
  >([
    {
      sku: 'SKU-001',
      itemName: '',
      unit: 'cases',
      unitPrice: 0,
      quantitySent: 10,
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setStep('input');
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [pData, lData] = await Promise.all([api.getPartners(), api.getLocations()]);
      setPartners(pData);
      setLocations(lData);

      if (lData.length > 0 && !selectedLocationId) {
        const defaultLoc = lData.find((l) => l.isDefault) || lData[0];
        setSelectedLocationId(defaultLoc.id);
      }

      if (pData.length > 0 && !selectedPartnerId) {
        setSelectedPartnerId(pData[0].id);
        setDestinationAddress(pData[0].deliveryAddress);
      } else if (selectedPartnerId) {
        const match = pData.find((p) => p.id === selectedPartnerId);
        if (match) setDestinationAddress(match.deliveryAddress);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePartnerChange = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    const partner = partners.find((p) => p.id === partnerId);
    if (partner) {
      setDestinationAddress(partner.deliveryAddress);
    }
  };

  const handleAddLine = () => {
    const nextIndex = lines.length + 1;
    setLines([
      ...lines,
      {
        sku: `SKU-${String(nextIndex).padStart(3, '0')}`,
        itemName: '',
        unit: 'cases',
        unitPrice: 0,
        quantitySent: 1,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const validateInput = (): boolean => {
    setErrorMessage(null);
    if (!selectedPartnerId) {
      setErrorMessage('Please select a receiving partner.');
      return false;
    }
    if (lines.length === 0) {
      setErrorMessage('Please add at least one line item to the dispatch.');
      return false;
    }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.itemName.trim()) {
        setErrorMessage(`Item line #${i + 1} is missing a description.`);
        return false;
      }
      if (typeof l.quantitySent !== 'number' || isNaN(l.quantitySent) || l.quantitySent <= 0) {
        setErrorMessage(`Item line #${i + 1} (${l.itemName}) must have quantity > 0.`);
        return false;
      }
    }
    return true;
  };

  const handleGoToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateInput()) {
      setStep('review');
    }
  };

  const handleCommitSubmit = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    const chosenLoc = locations.find((l) => l.id === selectedLocationId);
    const originLabel = chosenLoc?.label || 'Main Distribution Terminal';
    const originAddr = chosenLoc
      ? `${chosenLoc.addressLines}, ${chosenLoc.city}, ${chosenLoc.region}`
      : 'Registered Commercial Facility';

    try {
      const payload = {
        originLocationId: selectedLocationId,
        originLocationLabel: originLabel,
        originAddress: originAddr,
        partnerId: selectedPartnerId,
        destinationAddress,
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        vehicleReg: vehicleReg.trim(),
        notes: notes.trim(),
        lines,
      };

      const created = await api.createDispatch(payload);
      onSuccess(created.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch manifest.');
      setStep('input');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalUnits = lines.reduce((sum, itm) => sum + (Number(itm.quantitySent) || 0), 0);
  const selectedPartner = partners.find((p) => p.id === selectedPartnerId);
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 max-h-[92vh] flex flex-col">
        {/* Pinned Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          {/* Stepper indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                step === 'input'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <span>1. Manifest Details</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                step === 'review'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <span>2. Pre-Submission Review</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="my-3 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: INPUT DETAILS */}
        {step === 'input' && (
          <form onSubmit={handleGoToReview} className="flex-1 flex flex-col min-h-0 pt-3">
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Warehouse className="w-3.5 h-3.5 text-indigo-400" />
                  Origin Dispatch Terminal *
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.label} ({loc.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  Destination Partner *
                </label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => handlePartnerChange(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Address *</label>
              <input
                type="text"
                required
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="Street address, Dock number, City"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            {/* Carrier info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Driver Name</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Robert Lang"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Driver Phone</label>
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+1 555-019-9021"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Truck Plate</label>
                <input
                  type="text"
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  placeholder="TRK-4921"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Itemized Lines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-indigo-400" />
                  Cargo Line Items ({lines.length})
                </label>
                <span className="text-xs font-mono text-indigo-300">Total Units: {totalUnits}</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {lines.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 items-center text-xs"
                  >
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => handleLineChange(index, 'sku', e.target.value)}
                        placeholder="SKU"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
                      />
                    </div>

                    <div className="col-span-5">
                      <input
                        type="text"
                        required
                        value={item.itemName}
                        onChange={(e) => handleLineChange(index, 'itemName', e.target.value)}
                        placeholder="Item name / description"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>

                    <div className="col-span-2">
                      <select
                        value={item.unit}
                        onChange={(e) => handleLineChange(index, 'unit', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-200"
                      >
                        <option value="cases">cases</option>
                        <option value="boxes">boxes</option>
                        <option value="cartons">cartons</option>
                        <option value="bags">bags</option>
                        <option value="units">units</option>
                        <option value="kg">kg</option>
                        <option value="pallets">pallets</option>
                        <option value="sacks">sacks</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        required
                        min={0.1}
                        step="any"
                        value={item.quantitySent}
                        onChange={(e) => handleLineChange(index, 'quantitySent', parseFloat(e.target.value) || 0)}
                        placeholder="Qty"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-right"
                      />
                    </div>

                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        disabled={lines.length <= 1}
                        onClick={() => handleRemoveLine(index)}
                        className="text-slate-500 hover:text-rose-400 disabled:opacity-30 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 mt-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Line Item</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Delivery Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Handling notes, temperature limits, delivery dock instructions..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 shrink-0 mt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer min-h-[40px]"
              >
                <span>Continue to Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: PRE-SUBMISSION REVIEW */}
        {step === 'review' && (
          <div className="flex-1 flex flex-col min-h-0 pt-3">
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  Review Dispatch Summary
                </h3>

                <div className="grid grid-cols-2 gap-3 text-slate-300">
                  <div>
                    <span className="text-slate-500 font-semibold block">Origin Terminal:</span>
                    <div className="font-semibold text-white">{selectedLocation?.label || 'Main Dock'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Destination Partner:</span>
                    <div className="font-semibold text-white">{selectedPartner?.name}</div>
                    <div className="text-[11px] text-slate-400">{destinationAddress}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Carrier / Driver:</span>
                    <div>{driverName || 'Unassigned'} ({vehicleReg || 'TRK'})</div>
                    {driverPhone && <div className="text-[11px] text-slate-400">{driverPhone}</div>}
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Total Manifest Quantity:</span>
                    <div className="font-mono font-bold text-indigo-300 text-sm">
                      {totalUnits} units across {lines.length} lines
                    </div>
                  </div>
                </div>
              </div>

              {/* Line items preview table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <div className="text-xs font-bold text-white mb-2">Item Breakdown</div>
                <div className="divide-y divide-slate-800 text-xs">
                  {lines.map((l, i) => (
                    <div key={i} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-indigo-300 mr-2 text-[11px]">{l.sku}</span>
                        <span className="text-slate-200">{l.itemName}</span>
                      </div>
                      <div className="font-mono font-bold text-slate-200">
                        {l.quantitySent} {l.unit}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {notes && (
                <div className="bg-slate-800/30 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300">
                  <span className="text-slate-500 font-semibold block">Notes:</span>
                  {notes}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0 mt-3">
              <button
                type="button"
                onClick={() => setStep('input')}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer min-h-[40px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Edit</span>
              </button>

              <button
                type="button"
                onClick={handleCommitSubmit}
                disabled={isLoading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer min-h-[40px]"
              >
                {isLoading ? (
                  <span>Generating Manifest...</span>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    <span>Confirm & Transmit Dispatch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
