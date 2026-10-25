import React from 'react';
import { Truck, Activity, Users, FileText, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTranslation } from '../../context/LanguageContext.js';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const items = [
    { id: 'dispatches', label: t('nav.dispatches', 'Dispatches'), icon: Truck },
    ...(user ? [{ id: 'dashboard', label: t('nav.dashboard', 'Dashboard'), icon: Activity }] : []),
    ...(user && user.role !== 'RECEIVER' ? [{ id: 'partners', label: t('nav.partners', 'Partners'), icon: Users }] : []),
    ...(user && (user.role === 'SUPER_ADMIN' || user.role === 'BUSINESS_OWNER')
      ? [{ id: 'audit', label: t('nav.audit', 'Audit'), icon: FileText }]
      : []),
    { id: 'status', label: t('nav.status', 'Status'), icon: Shield },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors cursor-pointer ${
              isActive ? 'text-sky-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-sky-400' : ''}`} />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
