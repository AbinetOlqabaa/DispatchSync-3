import React, { useState, useEffect } from 'react';
import { Building, Phone, Mail, MapPin, ArrowLeft, Plus, CheckCircle, Shield } from 'lucide-react';
import { Partner } from '../../types';
import { sandboxAdapter } from '../../services/local-adapter';

interface PartnersListProps {
  onBack: () => void;
}

export const PartnersList: React.FC<PartnersListProps> = ({ onBack }) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      const data = await sandboxAdapter.listPartners();
      setPartners(data);
      setIsLoading(false);
    }
    load() ;
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <span className="text-xs text-slate-400 font-mono">
          {partners.length} Active Logistics Partners
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-slate-100 shadow-xl">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Building className="w-6 h-6 text-indigo-400" />
              <span>Registered Business Partners & Recipients</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Authorized delivery hubs, regional transit warehouses, and partner docks.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading partners...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {partners.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-sm">{p.name}</h3>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 inline-block mt-1">
                      {p.tier} TIER
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3" />
                    <span>Active</span>
                  </span>
                </div>

                <div className="space-y-1.5 text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-16">Contact:</span>
                    <span className="font-medium text-white">{p.contactName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{p.contactPhone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{p.contactEmail}</span>
                  </div>
                  <div className="flex items-start gap-2 pt-1 border-t border-slate-800/60">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span className="text-slate-400">{p.address}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
