import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Plus,
  Building,
  CheckCircle2,
  AlertCircle,
  Truck,
  Warehouse,
  Map as MapIcon,
  LayoutGrid,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { Location, Partner, Dispatch } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { LocationsMapView } from '../../components/locations/LocationsMapView.js';

export const LocationsPage: React.FC = () => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');

  // New location form
  const [label, setLabel] = useState('');
  const [addressLines, setAddressLines] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [locs, parts, dsps] = await Promise.all([
        api.getLocations(),
        api.getPartners(),
        api.getDispatches(),
      ]);
      setLocations(locs);
      setPartners(parts);
      setDispatches(dsps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await api.createLocation({
        label: label.trim(),
        addressLines: addressLines.trim(),
        city: city.trim(),
        region: region.trim(),
        countryCode: countryCode.trim(),
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        isDefault,
      });
      setShowAddModal(false);
      setLabel('');
      setAddressLines('');
      setCity('');
      setRegion('');
      setLatitude('');
      setLongitude('');
      setIsDefault(false);
      loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading dispatch origins & active delivery points..." />;

  const canAdd = user && ['BUSINESS_OWNER', 'SENDER', 'SUPER_ADMIN'].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-950 px-2.5 py-0.5 rounded-full border border-sky-800">
              Dispatch Origins & Logistics Network
            </span>
            <span className="text-xs text-slate-400">{locations.length} terminal docks</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Origin Location Directory</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage fulfillment centers, dispatch warehouses, and freight loading docks with geospatial coordinate tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle (Requirement 7) */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                viewMode === 'map'
                  ? 'bg-sky-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                viewMode === 'grid'
                  ? 'bg-sky-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
          </div>

          {canAdd && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Origin Dock</span>
            </button>
          )}
        </div>
      </div>

      {/* Map View vs Grid View */}
      {viewMode === 'map' ? (
        <LocationsMapView
          locations={locations}
          partners={partners}
          dispatches={dispatches}
        />
      ) : null}

      {/* Locations Grid */}
      <div className={viewMode === 'map' ? 'mt-8' : ''}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-sky-400" />
            <span>Registered Dispatch Origins ({locations.length})</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc) => (
          <div
            key={loc.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-colors shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-white text-sm">{loc.label}</h3>
              </div>
              {loc.isDefault && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Default Origin
                </span>
              )}
            </div>

            <div className="text-xs text-slate-300 space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-start gap-2 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-200">{loc.addressLines}</div>
                  <div className="text-slate-400 text-[11px]">
                    {loc.city}, {loc.region} {loc.countryCode}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Add Dispatch Origin Terminal</h3>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateLocation} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Terminal / Dock Label *</label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. West Coast Distribution Hub - Bay 3"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Street Address & Bay *</label>
                <input
                  type="text"
                  required
                  value={addressLines}
                  onChange={(e) => setAddressLines(e.target.value)}
                  placeholder="e.g. 500 Industrial Parkway, Dock 14"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Seattle"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">State / Region *</label>
                  <input
                    type="text"
                    required
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="WA"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Latitude (optional)</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g. 47.6062"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Longitude (optional)</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g. -122.3321"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefaultLoc"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="isDefaultLoc" className="text-slate-300 text-xs cursor-pointer">
                  Set as default origin location for dispatches
                </label>
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
                  {isSubmitting ? 'Saving...' : 'Register Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
