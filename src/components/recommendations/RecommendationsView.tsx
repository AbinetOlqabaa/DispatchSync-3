import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Sliders,
  TrendingUp,
  Package,
  Truck,
  ShieldCheck,
  Snowflake,
  Clock,
  ArrowRight,
  Info,
  CheckCircle2,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import {
  recommendationEngine,
  CatalogItem,
  RecommendedItem,
  UserPreferences,
  BrowsingEvent,
} from '../../services/recommendationEngine.js';
import { Dispatch } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface RecommendationsViewProps {
  onCreateDispatchWithItem?: (item: CatalogItem) => void;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  onCreateDispatchWithItem,
}) => {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'architecture'>('recommendations');
  const [addedItemSku, setAddedItemSku] = useState<string | null>(null);

  // Stated Preferences State (Requirement 10)
  const [preferences, setPreferences] = useState<UserPreferences>({
    preferredCategories: ['FOOD_BEVERAGE', 'COLD_CHAIN', 'SAFETY_SECURITY'],
    temperatureControl: 'ANY',
    priorityLevel: 'STANDARD',
    budgetTier: 'BALANCED',
  });

  // Simulated Browsing events (Requirement 10)
  const [browsingEvents, setBrowsingEvents] = useState<BrowsingEvent[]>([
    {
      sku: 'SKU-GLS-101',
      category: 'FOOD_BEVERAGE',
      action: 'VIEW_MANIFEST',
      timestamp: new Date().toISOString(),
    },
    {
      category: 'COLD_CHAIN',
      action: 'SEARCH_ITEM',
      timestamp: new Date().toISOString(),
    },
  ]);

  useEffect(() => {
    loadDispatches();
  }, []);

  const loadDispatches = async () => {
    setLoading(true);
    try {
      const data = await api.getDispatches();
      setDispatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Run the Recommendation Engine whenever dispatches, preferences, or browsing events update
  const recommendations: RecommendedItem[] = useMemo(() => {
    return recommendationEngine.generateRecommendations(
      dispatches,
      preferences,
      browsingEvents
    );
  }, [dispatches, preferences, browsingEvents]);

  const roadmap = useMemo(
    () => recommendationEngine.getFutureImprovementsRoadmap(),
    []
  );

  const toggleCategory = (cat: string) => {
    setPreferences((prev) => {
      const exists = prev.preferredCategories.includes(cat);
      const next = exists
        ? prev.preferredCategories.filter((c) => c !== cat)
        : [...prev.preferredCategories, cat];
      return { ...prev, preferredCategories: next.length > 0 ? next : [cat] };
    });
  };

  const handleSelectItem = (item: CatalogItem) => {
    setAddedItemSku(item.sku);
    setTimeout(() => setAddedItemSku(null), 3000);
    if (onCreateDispatchWithItem) {
      onCreateDispatchWithItem(item);
    }
  };

  if (loading) return <LoadingSpinner label="Running collaborative filtering recommendation engine..." />;

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950 px-2.5 py-0.5 rounded-full border border-indigo-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Collaborative Filtering & Affinity Engine
            </span>
            <span className="text-xs text-slate-400">Requirement 10</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Personalized Products & Services</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Analyzes your dispatch history, manifest browsing behavior, and stated handling preferences.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              activeTab === 'recommendations'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommended for You</span>
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              activeTab === 'architecture'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Future Roadmap</span>
          </button>
        </div>
      </div>

      {activeTab === 'recommendations' ? (
        <>
          {/* Stated Preferences & Engine Tuners */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-white text-xs">Stated Preferences & Context Signals</h3>
                <span className="text-[11px] text-slate-400">
                  (Adjust below to dynamically steer recommendation scoring)
                </span>
              </div>
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                <span>{showPreferences ? 'Hide Controls' : 'Customize Signals'}</span>
                {showPreferences ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showPreferences && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800 text-xs">
                {/* Category Toggles */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-2">Preferred Categories</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'FOOD_BEVERAGE', label: 'Food & Beverage' },
                      { id: 'COLD_CHAIN', label: 'Cold-Chain Logistics' },
                      { id: 'PACKAGING', label: 'Packaging & Film' },
                      { id: 'SAFETY_SECURITY', label: 'Loss Prevention & Seals' },
                      { id: 'LOGISTICS_SERVICE', label: 'Express Freight & QC' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                          preferences.preferredCategories.includes(cat.id)
                            ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperature Handling */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-2">Temperature Handling</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'ANY', label: 'Any Temp' },
                      { id: 'AMBIENT', label: 'Ambient Only' },
                      { id: 'REFRIGERATED', label: 'Cold-Chain (34-38°F)' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() =>
                          setPreferences((p) => ({ ...p, temperatureControl: mode.id as any }))
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                          preferences.temperatureControl === mode.id
                            ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed Priority */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-2">Lead Time Priority</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'STANDARD', label: 'Standard (12-24h)' },
                      { id: 'EXPEDITED', label: 'Expedited (6-12h)' },
                      { id: 'SAME_DAY', label: 'Hot-Shot (<6h)' },
                    ].map((pri) => (
                      <button
                        key={pri.id}
                        onClick={() =>
                          setPreferences((p) => ({ ...p, priorityLevel: pri.id as any }))
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                          preferences.priorityLevel === pri.id
                            ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        {pri.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Toast on Action */}
          {addedItemSku && (
            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>SKU {addedItemSku} added to draft shipment staging queue!</span>
            </div>
          )}

          {/* Recommendations Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec) => {
              const { item, confidencePercent, primaryReason, collaborativeExplanation } = rec;
              const isService = item.type === 'SERVICE';

              return (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Top Confidence Pill & Category */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {item.category.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-1.5 bg-indigo-950/80 border border-indigo-800 px-2.5 py-0.5 rounded-full text-indigo-300 text-xs font-bold">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>{confidencePercent}% Match</span>
                      </div>
                    </div>

                    {/* Title & SKU */}
                    <div>
                      <h4 className="font-bold text-white text-sm leading-snug">{item.name}</h4>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {item.sku} • {item.unit}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>

                    {/* Rationale Callout (Collaborative Filtering Explainability) */}
                    <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80 space-y-1.5">
                      <div className="text-[11px] font-semibold text-sky-300 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>{primaryReason}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {collaborativeExplanation}
                      </p>

                      {/* Score Breakdown Bars */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                        <span>CF Affinity: {Math.round(rec.collaborativeScore * 100)}%</span>
                        <span>Pref Match: {Math.round(rec.preferenceScore * 100)}%</span>
                        <span>Browse: {Math.round(rec.browsingScore * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-white">
                        ${item.unitPrice.toFixed(2)}
                        <span className="text-xs font-normal text-slate-400"> / {item.unit}</span>
                      </div>
                      <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{item.leadTimeHours}h Delivery Ready</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectItem(item)}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{isService ? 'Request Service' : 'Add to Dispatch'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Future Architecture Roadmap (Requirement 10) */
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <span>Recommendation Engine Evolution & Scalability Architecture</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Requirement 10 instructs starting with a collaborative filtering foundation and outlining
              comprehensive technical improvements for future scale. Below is the multi-phase engineering
              roadmap taking DispatchBridge from item-to-item co-occurrence to deep neural retrieval and real-time graph modeling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roadmap.map((plan, index) => (
              <div
                key={index}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                    {plan.tier}
                  </span>
                  <span className="text-xs font-mono text-slate-500">Step {index + 1} of 4</span>
                </div>

                <h4 className="text-sm font-bold text-white">{plan.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{plan.description}</p>

                <div className="space-y-2 text-xs pt-2 border-t border-slate-800">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[11px] font-semibold text-amber-300 block mb-0.5">
                      Why It Matters:
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{plan.rationale}</p>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[11px] font-semibold text-sky-300 block mb-0.5">
                      Production Implementation:
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {plan.implementationStrategy}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
