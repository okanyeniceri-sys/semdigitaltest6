import React, { useState } from 'react';
import { Users, Activity, Trash2, UserPlus, Shield, ShieldAlert, CheckCircle, Search, Briefcase, Globe, Facebook, Layout, Bot, Code, Copy, ExternalLink, FileJson, Settings } from 'lucide-react';
import { User, ActivityLog, UserRole } from '../types';

interface AdminPanelProps {
  users: User[];
  logs: ActivityLog[];
  onAddUser: (user: User) => void;
  onDeleteUser: (email: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, logs, onAddUser, onDeleteUser }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'chatbot'>('users');
  const [scriptTab, setScriptTab] = useState<'code' | 'manifest'>('code');
  const [newUser, setNewUser] = useState<User>({ 
    name: '', 
    surname: '', 
    email: '', 
    role: 'meta_specialist',
    assignedBrands: [] 
  });
  const [brandInput, setBrandInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name && newUser.surname && newUser.email) {
      const userToAdd = { ...newUser };
      if (userToAdd.role === 'account_manager' && brandInput.trim()) {
        userToAdd.assignedBrands = brandInput.split(',').map(b => b.trim()).filter(b => b !== '');
      } else {
        userToAdd.assignedBrands = [];
      }
      onAddUser(userToAdd);
      setNewUser({ name: '', surname: '', email: '', role: 'meta_specialist', assignedBrands: [] });
      setBrandInput('');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleLabel = (role: UserRole) => {
    switch(role) {
        case 'admin': return { label: 'Süper Admin', color: 'bg-red-100 text-red-700 border-red-200', icon: ShieldAlert };
        case 'platform_manager': return { label: 'Meta-Google Yöneticisi', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Shield };
        case 'meta_lead': return { label: 'Meta Yöneticisi', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Facebook };
        case 'meta_specialist': return { label: 'Meta Ekibi', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: Facebook };
        case 'google_lead': return { label: 'Google Yöneticisi', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Globe };
        case 'google_specialist': return { label: 'Google Ekibi', color: 'bg-orange-50 text-orange-600 border-orange-100', icon: Globe };
        case 'account_manager': return { label: 'Account Ekibi', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Briefcase };
        default: return { label: 'Kullanıcı', color: 'bg-gray-100 text-gray-700', icon: CheckCircle };
    }
  };

  const generateAppsScriptCode = () => {
    // Otomatik URL Algılama
    const currentUrl = typeof window !== 'undefined' ? window.location.origin : "https://your-web-app-url.com";

    return `// ===========================================================\n// 1. SETUP\n// ===========================================================\n\nfunction SETUP_API_KEY() {\n  var myKey = "BURAYA_API_ANAHTARINIZI_YAZIN"; \n  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', myKey);\n  Logger.log("✅ API Key Saved.");\n}\n\n// ===========================================================\n// 2. HELPERS\n// ===========================================================\n\n// Web App URL'i otomatik olarak buraya gömülür\nvar WEB_APP_URL = \