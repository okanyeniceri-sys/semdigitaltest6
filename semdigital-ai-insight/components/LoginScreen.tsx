
import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, ArrowRight, AlertCircle, ShieldCheck, Briefcase } from 'lucide-react';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: Partial<User>) => boolean; // Returns true if successful, false if denied
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null); 
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      // If in admin mode, we strictly check if the email belongs to an admin in the App logic
      const success = onLogin({
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        // We pass context that they tried to login via specific form, though backend validates role primarily
      });

      if (!success) {
        setError(isAdminMode 
            ? 'Bu hesap yönetici yetkisine sahip değil veya bulunamadı.' 
            : 'Bu e-posta adresi sistemde tanımlı değil.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${
        isAdminMode ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900'
    }`}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in relative">
        
        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-100">
            <button 
                type="button"
                onClick={() => { setIsAdminMode(false); setError(null); }}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                    !isAdminMode ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:bg-slate-50'
                }`}
            >
                <Briefcase size={16} /> Personel Girişi
            </button>
            <button 
                type="button"
                onClick={() => { setIsAdminMode(true); setError(null); }}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                    isAdminMode ? 'text-red-600 bg-red-50/50' : 'text-slate-400 hover:bg-slate-50'
                }`}
            >
                <ShieldCheck size={16} /> Yönetici Girişi
            </button>
        </div>

        {/* Header */}
        <div className="p-8 pb-4 text-center">
          <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4 transition-colors duration-300 ${
              isAdminMode ? 'bg-red-600 shadow-red-600/30' : 'bg-blue-600 shadow-blue-600/30'
          }`}>
            {isAdminMode ? <ShieldCheck className="text-white" size={32} /> : <Lock className="text-white" size={32} />}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">SemDigital AI</h1>
          <p className="text-slate-500 mt-2 text-sm">
              {isAdminMode ? 'Yönetim Paneli Erişimi' : 'Performans Analiz Platformu'}
          </p>
        </div>

        {/* Form */}
        <div className="px-8 pb-8 pt-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className={`border p-3 rounded-lg text-sm flex items-start gap-2 ${
                  isAdminMode ? 'bg-red-50 border-red-200 text-red-600' : 'bg-blue-50 border-blue-200 text-blue-600'
              }`}>
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ad</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                        isAdminMode ? 'focus:ring-red-500 border-slate-200' : 'focus:ring-blue-500 border-slate-200'
                    }`}
                    placeholder="Adınız"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Soyad</label>
                <input 
                  type="text" 
                  name="surname"
                  required
                  value={formData.surname}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    isAdminMode ? 'focus:ring-red-500 border-slate-200' : 'focus:ring-blue-500 border-slate-200'
                  }`}
                  placeholder="Soyadınız"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isAdminMode ? 'Yönetici E-posta' : 'Kurumsal E-posta'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    isAdminMode ? 'focus:ring-red-500 border-slate-200' : 'focus:ring-blue-500 border-slate-200'
                  }`}
                  placeholder={isAdminMode ? "admin@sem.com" : "ad.soyad@sem.com"}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full text-white font-semibold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4 ${
                  isAdminMode ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
              }`}
            >
              {isLoading ? (
                <>Kontrol Ediliyor...</>
              ) : (
                <>
                  {isAdminMode ? 'Yönetici Girişi' : 'Güvenli Giriş'} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
              <Lock size={12} />
              {isAdminMode ? 'Yönetim paneli erişimi loglanmaktadır.' : 'Verileriniz uçtan uca şifrelenmektedir.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;