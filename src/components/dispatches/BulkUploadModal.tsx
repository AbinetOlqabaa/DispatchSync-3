import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  Truck,
  Package,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { Partner } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { useTranslation } from '../../context/LanguageContext.js';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  partners: Partner[];
}

interface ParsedDispatch {
  reference: string;
  partnerName: string;
  destinationAddress?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleReg?: string;
  notes?: string;
  lines: Array<{
    sku: string;
    itemName: string;
    unit: string;
    unitPrice?: number;
    quantitySent: number;
    notes?: string;
  }>;
  errors: string[];
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  partners,
}) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [parsedDispatches, setParsedDispatches] = useState<ParsedDispatch[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const downloadSampleTemplate = () => {
    const csvContent = [
      'dispatch_reference,partner_name,destination_address,driver_name,driver_phone,vehicle_reg,sku,item_name,unit,quantity,unit_price,notes',
      'REF-BATCH-01,Metro Retail North Branch,"800 Commerce Ave, Minneapolis, MN",John Doe,+1-555-012-3456,TRK-9812,SKU-BVR-01,Organic Cold Brew 12-Pack,cases,50,42.50,Keep chilled',
      'REF-BATCH-01,Metro Retail North Branch,"800 Commerce Ave, Minneapolis, MN",John Doe,+1-555-012-3456,TRK-9812,SKU-BVR-02,Sparkling Mineral Water 24ct,cases,100,18.00,Fragile glass bottles',
      'REF-BATCH-02,Summit Wholesale Depot,"2300 Prairie Pkwy, Des Moines, IA",Sarah Miller,+1-555-019-8877,TRK-4401,SKU-DRY-10,Whole Grain Rolled Oats 25lb,bags,75,22.00,Palletized',
      'REF-BATCH-03,Urban Core Supermarkets,"450 Michigan Ave, Chicago, IL",David Chen,+1-555-016-5522,TRK-1092,SKU-SNK-05,Artisan Pita Chips 30ct,boxes,60,30.00,Store in dry area',
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'DispatchBridge_Bulk_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCsvText = (text: string): ParsedDispatch[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    // Parse header to determine column indexes
    const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase().trim());
    const refIdx = headers.indexOf('dispatch_reference');
    const partnerIdx = headers.indexOf('partner_name');
    const destIdx = headers.indexOf('destination_address');
    const driverIdx = headers.indexOf('driver_name');
    const phoneIdx = headers.indexOf('driver_phone');
    const vehicleIdx = headers.indexOf('vehicle_reg');
    const skuIdx = headers.indexOf('sku');
    const itemIdx = headers.indexOf('item_name');
    const unitIdx = headers.indexOf('unit');
    const qtyIdx = headers.indexOf('quantity');
    const priceIdx = headers.indexOf('unit_price');
    const notesIdx = headers.indexOf('notes');

    const grouped: Record<string, ParsedDispatch> = {};

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvRow(lines[i]);
      if (row.length === 0 || (row.length === 1 && !row[0])) continue;

      const ref = (refIdx >= 0 && row[refIdx]?.trim()) || `IMP-${i}`;
      const partnerName = (partnerIdx >= 0 && row[partnerIdx]?.trim()) || '';
      const destAddr = destIdx >= 0 ? row[destIdx]?.trim() : '';
      const driverName = driverIdx >= 0 ? row[driverIdx]?.trim() : '';
      const driverPhone = phoneIdx >= 0 ? row[phoneIdx]?.trim() : '';
      const vehicleReg = vehicleIdx >= 0 ? row[vehicleIdx]?.trim() : '';
      const sku = (skuIdx >= 0 && row[skuIdx]?.trim()) || `SKU-${i}`;
      const itemName = (itemIdx >= 0 && row[itemIdx]?.trim()) || '';
      const unit = (unitIdx >= 0 && row[unitIdx]?.trim()) || 'cases';
      const qtyStr = qtyIdx >= 0 ? row[qtyIdx]?.trim() : '0';
      const priceStr = priceIdx >= 0 ? row[priceIdx]?.trim() : '0';
      const notes = notesIdx >= 0 ? row[notesIdx]?.trim() : '';

      const quantitySent = parseFloat(qtyStr);
      const unitPrice = parseFloat(priceStr) || 0;

      if (!grouped[ref]) {
        grouped[ref] = {
          reference: ref,
          partnerName,
          destinationAddress: destAddr,
          driverName,
          driverPhone,
          vehicleReg,
          notes,
          lines: [],
          errors: [],
        };
      }

      // Validate partner
      if (!partnerName) {
        grouped[ref].errors.push(`Row ${i}: Partner name is missing`);
      }

      // Validate line item
      if (!itemName) {
        grouped[ref].errors.push(`Row ${i}: Item name is required`);
      }
      if (isNaN(quantitySent) || quantitySent <= 0) {
        grouped[ref].errors.push(`Row ${i}: Quantity must be greater than zero`);
      }

      grouped[ref].lines.push({
        sku,
        itemName: itemName || 'General Cargo',
        unit,
        unitPrice,
        quantitySent: isNaN(quantitySent) || quantitySent <= 0 ? 1 : quantitySent,
        notes,
      });
    }

    return Object.values(grouped);
  };

  // Standard CSV row parser handling quotes
  const parseCsvRow = (rowText: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < rowText.length; i++) {
      const c = rowText[i];
      if (c === '"') {
        if (inQuotes && rowText[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith('.csv')) {
      setUploadError('Please select a valid .csv file format.');
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCsvText(text);
        if (parsed.length === 0) {
          setUploadError('The selected CSV file contains no valid dispatch data rows.');
          setParsedDispatches([]);
        } else {
          setParsedDispatches(parsed);
        }
      } catch (err: any) {
        setUploadError(`Error reading CSV file: ${err.message}`);
      }
    };
    reader.readAsText(selected);
  };

  const handleProcessImport = async () => {
    if (parsedDispatches.length === 0) return;
    setIsProcessing(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const payloads = parsedDispatches.map((d) => ({
        partnerName: d.partnerName,
        destinationAddress: d.destinationAddress,
        driverName: d.driverName,
        driverPhone: d.driverPhone,
        vehicleReg: d.vehicleReg,
        notes: `Imported via Bulk CSV (${d.reference}) ${d.notes ? `• ${d.notes}` : ''}`,
        lines: d.lines,
      }));

      const response = await api.bulkCreateDispatches(payloads);

      setUploadSuccess(`Successfully imported ${response.createdCount} dispatches into active logistics registry.`);
      setTimeout(() => {
        onSuccess(response.createdCount);
        onClose();
      }, 1200);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process bulk dispatch creation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalLinesCount = parsedDispatches.reduce((s, d) => s + d.lines.length, 0);
  const totalQuantitySum = parsedDispatches.reduce(
    (s, d) => s + d.lines.reduce((sub, l) => sub + l.quantitySent, 0),
    0
  );
  const totalErrorsCount = parsedDispatches.reduce((s, d) => s + d.errors.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Bulk Import Dispatches via CSV</h2>
              <p className="text-xs text-slate-400">
                Upload manifests in bulk to create multiple delivery records at once with item-level validation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Helper Bar */}
        <div className="mt-4 p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-slate-200">Standard CSV Column Schema:</span>
            <p className="text-slate-400 text-[11px] mt-0.5 font-mono">
              dispatch_reference, partner_name, destination_address, driver_name, sku, item_name, unit, quantity
            </p>
          </div>
          <button
            type="button"
            onClick={downloadSampleTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template CSV</span>
          </button>
        </div>

        {/* Upload Dropzone */}
        <div className="mt-4">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/40 hover:bg-indigo-950/10 rounded-xl p-6 cursor-pointer transition-colors text-center">
            <Upload className="w-8 h-8 text-indigo-400 mb-2" />
            <span className="text-sm font-semibold text-white">
              {file ? file.name : 'Choose or drop CSV file here'}
            </span>
            <span className="text-xs text-slate-500 mt-1">
              Supports .csv files with multiple lines and grouped manifest references
            </span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Error / Success Banners */}
        {uploadError && (
          <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{uploadError}</span>
          </div>
        )}
        {uploadSuccess && (
          <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {/* Parsed Preview Table */}
        {parsedDispatches.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Parsed Manifests ({parsedDispatches.length}) • {totalLinesCount} Total Lines • {totalQuantitySum} Units
              </span>
              {totalErrorsCount > 0 ? (
                <span className="text-rose-400 font-semibold bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                  {totalErrorsCount} validation errors
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  100% Validated Ready
                </span>
              )}
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Reference</th>
                    <th className="py-2 px-3">Receiving Partner</th>
                    <th className="py-2 px-3">Driver / Truck</th>
                    <th className="py-2 px-3">Items / Lines</th>
                    <th className="py-2 px-3 text-right">Total Units</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                  {parsedDispatches.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-mono font-bold text-sky-400">{d.reference}</td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-white">{d.partnerName || 'Unknown Partner'}</div>
                        {d.destinationAddress && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                            {d.destinationAddress}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-300 text-[11px]">
                        {d.driverName || 'Standard Freight'} {d.vehicleReg ? `(${d.vehicleReg})` : ''}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-slate-300 font-mono">{d.lines.length} items</span>
                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                          {d.lines.map((l) => `${l.quantitySent}x ${l.sku}`).join(', ')}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-white">
                        {d.lines.reduce((s, l) => s + l.quantitySent, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-5 mt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleProcessImport}
            disabled={parsedDispatches.length === 0 || isProcessing || totalErrorsCount > 0}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>Process & Create {parsedDispatches.length} Dispatches</span>
          </button>
        </div>
      </div>
    </div>
  );
};
