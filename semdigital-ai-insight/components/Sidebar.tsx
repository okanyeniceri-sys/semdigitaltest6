
import React from 'react';
import { LayoutDashboard, PieChart, MessageSquare, Database, TrendingUp, Shield } from 'lucide-react';
import { View, User } from '../types';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  user: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, user }) => {
  const menuItems = [
    { id: View.DASHBOARD, label: 'Genel Bakış', icon: LayoutDashboard, adminOnly: false },
    { id: View.ANALYZER, label: 'Kampanya Analizi', icon: PieChart, adminOnly: false },
    { id: View.CHAT, label: 'AI Asistan', icon: MessageSquare, adminOnly: false },
    { id: View.KNOWLEDGE, label: 'Bilgi Bankası', icon: Database, adminOnly: false },
    { id: View.ADMIN, label: 'Yönetim Paneli', icon: Shield, adminOnly: true },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col shadow-xl z-50 hidden md:flex">
      <div className="p-6 border-b border-slate-800 flex items-center gap-2">
        <TrendingUp className="text-blue-400" size={28} />
        <div>
          <h1 className="text-xl font-bold tracking-tight">SemDigital</h1>
          <p className="text-xs text-slate-400">AI Marketing Suite</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') return null;

          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} className={item.id === View.ADMIN ? 'text-red-400' : ''} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-2">Aktif Kullanıcı</p>
          <div className="flex items-center gap-2 text-sm font-semibold truncate">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            {user?.name} {user?.surname}
          </div>
           <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">
            {user?.role === 'admin' ? 'Yönetici' : 'Personel'}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;