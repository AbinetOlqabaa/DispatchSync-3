import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Building,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Truck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { Partner } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface PartnersPageProps {
  onCreateDispatchWithPartner?: (partnerId: string) => void;
}

export const PartnersPage: React.FC<PartnersPageProps> = ({ onCreateDispatchWithPartner }) => {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New partner state
  const [name, setName] = useState('');
  const [type, setType] = useState<Partner['type']>('RETAILER');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const data = await api.getPartners();
      setPartners(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await api.createPartner({
        name: name.trim(),
        type,
        contactPerson: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        status: 'ACTIVE',
        businessId: user?.businessId || 'biz_default',
      });
      setShowAddModal(false);
      setName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setDeliveryAddress('');
      loadPartners();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create partner.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading partner directory..." />;

  const canAddPartner = user && ['BUSINESS_OWNER', 'SUPER_ADMIN'].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-950 px-2.5 py-0.5 rounded-full border border-sky-800">
              Receiving Partners
            </span>
            <span className="text-xs text-slate-400">{partners.length} verified destinations</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Partner Directory & Delivery Docks</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage receiving partners, retail storefronts, and wholesale distribution hubs.
          </p>
        </div>

        {canAddPartner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Partner Destination</span>
          </button>
        )}
      </div>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.map((partner) => (
          <div
            key={partner.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-colors shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-white text-base">{partner.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-sky-300 border border-slate-700 uppercase">
                  {partner.type}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-400">
                  <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Contact: {partner.contactPerson}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{partner.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{partner.email}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{partner.deliveryAddress}</span>
                </div>
              </div>
            </div>

            {onCreateDispatchWithPartner && (
              <button
                onClick={() => onCreateDispatchWithPartner(partner.id)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer mt-3"
              >
                <Truck className="w-3.5 h-3.5 text-sky-400" />
                <span>Create Dispatch to Partner</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Partner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Add New Receiving Partner</h3>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreatePartner} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company / Branch Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Metro Retail South Bay"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Partner Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="RETAILER">Retailer</option>
                  <option value="WHOLESALER">Wholesaler</option>
                  <option value="DISTRIBUTOR">Distributor</option>
                  <option value="FRANCHISE">Franchise</option>
                  <option value="CONSTRUCTION_SITE">Construction Site / Project</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Contact Person *</label>
                <input
                  type="text"
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. David Miller (Receiving Lead)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dock@partner.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-014-4411"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Delivery Dock Address *</label>
                <textarea
                  required
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Street Address, Receiving Dock, City, State, Zip"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
                >
                  {isSubmitting ? 'Saving...' : 'Register Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
