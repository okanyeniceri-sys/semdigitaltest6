
import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Analyzer from './components/Analyzer';
import ChatAssistant from './components/ChatAssistant';
import KnowledgeManager from './components/KnowledgeManager';
import LoginScreen from './components/LoginScreen';
import AdminPanel from './components/AdminPanel';
import { View, KnowledgeItem, User, ActivityLog, GlobalAnalysisContext } from './types';
import { TrendingUp, Users, Target, BarChart3, LogOut } from 'lucide-react';

const App: React.FC = () => {
  // Centralized User Database State
  const [users, setUsers] = useState<User[]>([
    { name: 'Okan', surname: 'Yeniçeri', email: 'okan.yeniceri@semtr.com', role: 'admin' },
    { name: 'Merve', surname: 'Meta', email: 'merve@sem.com', role: 'meta_specialist' },
    { name: 'Gökhan', surname: 'Google', email: 'gokhan@sem.com', role: 'google_lead' },
    { name: 'Ali', surname: 'Account', email: 'ali@sem.com', role: 'account_manager', assignedBrands: ['Marka N', 'Marka E'] },
    { name: 'Zeynep', surname: 'Manager', email: 'zeynep@sem.com', role: 'platform_manager' },
  ]);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);

  // State lifting for Analyzer context sharing (Object instead of string)
  const [analysisContext, setAnalysisContext] = useState<GlobalAnalysisContext | null>(null);

  // Helper to record activities
  const logAction = (userEmail: string, action: string, details: string) => {
    const newLog: ActivityLog = {
        id: Date.now().toString(),
        userEmail,
        action,
        details,
        timestamp: new Date().toLocaleString('tr-TR')
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleLogin = (inputData: Partial<User>): boolean => {
    const foundUser = users.find(u => u.email.toLowerCase() === inputData.email?.toLowerCase());
    
    if (foundUser) {
      // Verify name/surname roughly matches to simulate auth
      if (foundUser.name.toLowerCase() === inputData.name?.toLowerCase()) {
          setUser(foundUser);
          logAction(foundUser.email, 'LOGIN', 'Kullanıcı sisteme giriş yaptı.');
          return true;
      }
    }
    return false;
  };

  const handleLogout = () => {
    if (user) {
        logAction(user.email, 'LOGOUT', 'Oturum sonlandırıldı.');
    }
    setUser(null);
    setCurrentView(View.DASHBOARD);
    setAnalysisContext(null); // Clear context on logout
  };

  // Admin Actions
  const handleAddUser = (newUser: User) => {
    if (users.some(u => u.email === newUser.email)) return;
    setUsers([...users, newUser]);
    if(user) logAction(user.email, 'ADMIN_ACTION', `Yeni kullanıcı eklendi: ${newUser.email} (${newUser.role})`);
  };

  const handleDeleteUser = (email: string) => {
    setUsers(users.filter(u => u.email !== email));
    if(user) logAction(user.email, 'ADMIN_ACTION', `Kullanıcı silindi: ${email}`);
  };

  const handleAddKnowledge = (item: KnowledgeItem) => {
    setKnowledgeItems(prev => [item, ...prev]);
    if(user) logAction(user.email, 'DATA_ADD', `Bilgi bankasına eklendi: ${item.title}`);
  };

  const handleRemoveKnowledge = (id: string) => {
    setKnowledgeItems(prev => prev.filter(i => i.id !== id));
  };

  const knowledgeContext = useMemo(() => {
    return knowledgeItems.map(item => `[BAŞLIK: ${item.title}]\n${item.content}\n---`).join('\n');
  }, [knowledgeItems]);

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // --- DASHBOARD COMPONENT (Internal) ---
  const DashboardView = () => (
    <div className="max-w-5xl mx-auto animate-fade-in">
        <header className="mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Hoş Geldin, {user.name} 👋</h1>
            <p className="text-slate-600">
            {user.role === 'admin' 
                ? 'Sistem durumu ve tüm kampanya verilerine tam erişiminiz var.' 
                : 'Ekip yetkileriniz dahilindeki kampanyaları analiz edebilirsiniz.'}
            </p>
        </div>
        <div className="text-right text-xs text-slate-400 hidden md:block">
            <p>Yetki Seviyesi</p>
            <p className={`font-medium ${user.role === 'admin' ? 'text-red-600' : 'text-blue-600'}`}>
            {user.role === 'admin' ? 'Süper Admin' : 
                user.role === 'platform_manager' ? 'Yönetici' :
                user.role === 'meta_lead' ? 'Meta Lead' :
                user.role === 'account_manager' ? 'Account Yöneticisi' : 'Uzman'}
            </p>
        </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Aktif Kampanyalar</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">12</p>
        </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
                <Target size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Aylık Hedef</h3>
            <p className="text-3xl font-bold text-emerald-600 mt-2">%84</p>
        </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Users size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Toplam Erişim</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">2.4M</p>
        </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">ROI Ortalaması</h3>
            <p className="text-3xl font-bold text-orange-600 mt-2">3.2x</p>
        </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div 
            onClick={() => setCurrentView(View.ANALYZER)}
            className="group bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-2xl text-white cursor-pointer hover:scale-[1.01] transition-transform relative overflow-hidden"
        >
            <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2">Yeni Analiz Başlat</h2>
                <p className="text-blue-100 mb-6 max-w-xs">Kampanya verilerini girerek AI destekli detaylı rapor ve grafikler oluşturun.</p>
                <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium group-hover:bg-white/30 transition-colors">Şimdi Başla &rarr;</span>
            </div>
            <BarChart3 className="absolute right-4 bottom-4 opacity-20 w-48 h-48 transform rotate-12 translate-x-8 translate-y-8" />
        </div>

        <div 
            onClick={() => setCurrentView(View.KNOWLEDGE)}
            className="group bg-white border border-slate-200 p-8 rounded-2xl cursor-pointer hover:border-blue-300 hover:shadow-md transition-all relative overflow-hidden"
        >
            <div className="relative z-10">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Sistemi Eğit</h2>
                <p className="text-slate-500 mb-6 max-w-xs">Geçmiş kampanya raporlarını yükleyerek AI asistanının şirketinize özel öneriler sunmasını sağlayın.</p>
                <span className="text-blue-600 font-medium group-hover:underline">Veri Ekle &rarr;</span>
            </div>
        </div>
        </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} user={user} />
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto h-screen">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
             <TrendingUp className="text-blue-600" />
             <span className="font-bold text-slate-800">SemDigital</span>
          </div>
          <button className="text-slate-500 p-2 border rounded hover:bg-slate-50" onClick={() => setCurrentView(View.DASHBOARD)}>Menu</button>
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="fixed top-8 right-8 hidden md:flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-medium bg-white/80 backdrop-blur-sm p-2 rounded-lg border border-slate-100 hover:border-red-200 shadow-sm z-40"
        >
          <LogOut size={16} />
          Çıkış
        </button>
        
        {/* 
            KEEP-ALIVE STRATEGY:
            Analyzer and ChatAssistant are always rendered but hidden via CSS when inactive.
            This persists their internal state (CSV data, chat history, scroll position).
        */}
        <div className={currentView === View.ANALYZER ? 'block h-full' : 'hidden'}>
            <Analyzer 
                knowledgeContext={knowledgeContext} 
                user={user} 
                onContextUpdate={setAnalysisContext}
            />
        </div>

        <div className={currentView === View.CHAT ? 'block h-full' : 'hidden'}>
            <ChatAssistant 
                knowledgeContext={knowledgeContext}
                analysisContext={analysisContext}
            />
        </div>

        {/* Standard Conditional Rendering for simple views */}
        {currentView === View.DASHBOARD && <DashboardView />}
        
        {currentView === View.KNOWLEDGE && (
            <KnowledgeManager 
                items={knowledgeItems} 
                onAddItem={handleAddKnowledge} 
                onRemoveItem={handleRemoveKnowledge} 
            />
        )}

        {currentView === View.ADMIN && user.role === 'admin' && (
            <AdminPanel 
                users={users} 
                logs={logs} 
                onAddUser={handleAddUser} 
                onDeleteUser={handleDeleteUser} 
            />
        )}

        {currentView === View.ADMIN && user.role !== 'admin' && (
             <div className="p-8 text-center text-red-500">Bu alana erişim yetkiniz yok.</div>
        )}

      </main>
    </div>
  );
};

export default App;
