
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

    return `// ===========================================================
// 1. SETUP
// ===========================================================

function SETUP_API_KEY() {
  var myKey = "BURAYA_API_ANAHTARINIZI_YAZIN"; 
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', myKey);
  Logger.log("✅ API Key Saved.");
}

// ===========================================================
// 2. HELPERS
// ===========================================================

// Web App URL'i otomatik olarak buraya gömülür
var WEB_APP_URL = "${currentUrl}";

function buildChatResponse(text, cardsV2) {
  var message = { text: text || "" };
  if (cardsV2 && cardsV2.length) message.cardsV2 = cardsV2;
  return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: message } } } };
}

// ===========================================================
// 3. DATA SYNC (POST FROM WEB APP)
// ===========================================================

function doPost(e) {
  try {
    if (!e || !e.postData) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'No data'}));
    
    var json = JSON.parse(e.postData.contents);
    
    // Construct Memory Context based on LCW data structure
    var memoryText = "--- ACTIVE DATA CONTEXT (" + new Date().toLocaleString() + ") ---\\n";
    memoryText += "Brand: " + (json.brandName || "Unknown") + "\\n";
    
    if (json.rawCampaignData) {
        var d = json.rawCampaignData;
        memoryText += "\\n[CAMPAIGN SUMMARY]:\\n";
        memoryText += "Spend (Harcama): " + (d.spend || 0) + " TL\\n";
        memoryText += "Revenue (Gelir): " + (d.conversionValue || d.revenue || 0) + " TL\\n";
        
        // Append RAW CSV if available (Critical for Top 10 questions)
        if (d.csvContent) {
           memoryText += "\\n[RAW CSV DATA (Top Campaigns for Analysis)]:\\n";
           memoryText += d.csvContent;
        }
    }

    // Safety: Truncate context
    var report = (json.report || "");
    if(report.length > 3000) report = report.substring(0, 3000) + "... [Truncated]";
    
    memoryText += "\\n[AI REPORT SUMMARY]:\\n" + report;
    
    PropertiesService.getScriptProperties().setProperty('ACTIVE_CONTEXT', memoryText);
    return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'Context Updated'}));
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()}));
  }
}

// ===========================================================
// 4. BOT LOGIC
// ===========================================================

function onMessage(event) {
  var payload = (event && event.chat && event.chat.messagePayload && event.chat.messagePayload.message) ? event.chat.messagePayload.message : null;
  var userMessage = "";

  if (payload) {
    if (payload.argumentText) userMessage = payload.argumentText.trim();
    else if (payload.text) userMessage = payload.text.trim();
  } else if (event && event.message && event.message.text) {
    userMessage = event.message.text.trim();
  }

  if (!userMessage) return buildChatResponse("❓ Empty message.");

  var geminiCevabi = getGeminiResponse(userMessage);

  var card = {
    cardId: "semdigital-response",
    card: {
      header: {
        title: "🚀 SemDigital Asistan",
        subtitle: "Performans Uzmanı",
        imageUrl: "https://www.gstatic.com/images/branding/product/1x/google_analytics_48dp.png",
        imageType: "CIRCLE"
      },
      sections: [{ widgets: [{ textParagraph: { text: geminiCevabi } }] }]
    }
  };

  return buildChatResponse(null, [card]);
}

// ===========================================================
// 5. GEMINI API (PERSONA)
// ===========================================================

function getGeminiResponse(userMessage) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return "⚠️ API Key missing. Run SETUP_API_KEY.";
  
  var context = PropertiesService.getScriptProperties().getProperty('ACTIVE_CONTEXT');
  if (!context) context = "NO DATA LOADED. Ask user to sync data from the Web App.";
  
  if(context.length > 60000) context = context.substring(0, 60000) + "... [Context Truncated]";

  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey;
  
  // STRICT PROMPT - REFINED WITH REDIRECT LOGIC
  var strictPrompt = \`### SYSTEM ROLE
You are an expert SEM Digital Performance Assistant. You answer questions based ONLY on the provided CSV data in the context.

### ⚠️ CRITICAL OUTPUT RULE: HIDDEN REASONING
You must perform all data processing steps (Phase 1, 2, 3) **INTERNALLY**.
**DO NOT** output text like "Phase 1", "Aşama 1", "Sütunları Yeniden Adlandırma", or "Hesaplama Adımları".
The user must ONLY see the final, professional Turkish response.

### ⚠️ REDIRECT RULE (WEB APP FALLBACK)
If the user asks for:
1. Granular details not present in the [RAW CSV DATA] (which is limited to top campaigns).
2. Visualizations (charts, graphs).
3. Complex filtering not possible here.

THEN you must politely say:
"Bu detaylı analiz veya görselleştirme için lütfen Web Uygulamasını ziyaret ediniz: " + WEB_APP_URL

### INTERNAL LOGIC (EXECUTE SILENTLY)
1. **Understand Columns:**
   - 'platform' -> Channel (Mecra)
   - 'device' -> Device (Cihaz)
   - 'campaign' -> Campaign Name
2. **Handle CSV Data:**
   - The context contains a [RAW CSV DATA] section with top campaigns.
   - If user asks for "Top 10 Clicks" or "Best ROAS", parse this CSV text mentally to find the answer.
   - Do not say "Data is aggregated" if you see the CSV rows. Use those rows.
3. **Calculate KPIs:**
   - ROAS = Revenue / Spend
   - CPC = Spend / Clicks

### RESPONSE TEMPLATE
- Start directly with the insight (e.g., "Analiz edilen verilere göre...").
- Use bullet points and emojis for metrics (📊, 💰, 🚀).
- Provide a clear, narrative summary.

[WEB APP URL]: \` + WEB_APP_URL + \`
[CONTEXT FROM WEB APP]:
\` + context + \`

[USER QUESTION]: \` + userMessage;

  var payload = {
    contents: [{ parts: [{ text: strictPrompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 800 } 
  };
  
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    if (response.getResponseCode() !== 200) return "❌ Error: " + (json.error ? json.error.message : "Unknown");
    if (json.candidates && json.candidates.length > 0) return json.candidates[0].content.parts[0].text;
    return "⚠️ No response.";
  } catch (error) {
    return "⚠️ System Error: " + error.toString();
  }
}

function testBot() {
    console.log("Testing...");
    var res = onMessage({message: {text: "En çok harcama yapan kampanya hangisi?"}});
    console.log(JSON.stringify(res));
}
`;
  };

  const generateManifestCode = () => {
    return `{
  "timeZone": "Europe/Istanbul",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.store"
  ]
}`;
  };

  const handleCopyCode = () => {
    const code = scriptTab === 'code' ? generateAppsScriptCode() : generateManifestCode();
    navigator.clipboard.writeText(code);
    setCopySuccess('Kod kopyalandı!');
    setTimeout(() => setCopySuccess(''), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="text-red-600" /> Yönetim Paneli
          </h2>
          <p className="text-slate-500">Ekip yetkilendirme, marka atama ve sistem logları.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'users' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={16} /> Kullanıcılar
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'logs' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity size={16} /> Aktivite Kayıtları
        </button>
        <button
          onClick={() => setActiveTab('chatbot')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'chatbot' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-indigo-600'
          }`}
        >
          <Bot size={16} /> Chat Bot Kurulumu
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-700">Kayıtlı Personel</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="İsim veya email ara..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                    <th className="px-4 py-3">Ad Soyad</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Ekip / Rol</th>
                    <th className="px-4 py-3 text-right">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((user) => {
                    const roleInfo = getRoleLabel(user.role);
                    const RoleIcon = roleInfo.icon;
                    return (
                        <tr key={user.email} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">
                            {user.name} {user.surname}
                            {user.assignedBrands && user.assignedBrands.length > 0 && (
                                <div className="text-xs text-slate-500 font-normal mt-0.5 flex flex-wrap gap-1">
                                    {user.assignedBrands.map(b => (
                                        <span key={b} className="bg-slate-100 px-1 rounded">{b}</span>
                                    ))}
                                </div>
                            )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{user.email}</td>
                        <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border ${roleInfo.color}`}>
                            <RoleIcon size={10} /> {roleInfo.label}
                            </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                            <button 
                            onClick={() => onDeleteUser(user.email)}
                            disabled={user.role === 'admin'} 
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                            <Trash2 size={16} />
                            </button>
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>
          </div>

          {/* Add User Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-fit">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-blue-600"/> Yeni Personel Ekle
            </h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-bold text-slate-500">Ad</label>
                    <input 
                    type="text" 
                    required
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500">Soyad</label>
                    <input 
                    type="text" 
                    required
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={newUser.surname}
                    onChange={e => setNewUser({...newUser, surname: e.target.value})}
                    />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Kurumsal Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Yetki / Ekip</label>
                <select 
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                >
                  <option value="meta_specialist">Meta Ekibi (Specialist)</option>
                  <option value="meta_lead">Meta Ekibi Yöneticisi (Lead)</option>
                  <option value="google_specialist">Google Ekibi (Specialist)</option>
                  <option value="google_lead">Google Ekibi Yöneticisi (Lead)</option>
                  <option value="account_manager">Account Ekibi</option>
                  <option value="platform_manager">Meta-Google Yöneticisi</option>
                  <option value="admin">Süper Admin</option>
                </select>
              </div>

              {newUser.role === 'account_manager' && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 animate-fade-in">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                        <Layout size={12} /> Sorumlu Olduğu Markalar
                    </label>
                    <input 
                      type="text"
                      placeholder="Örn: Marka A, Marka B"
                      className="w-full mt-1 p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      value={brandInput}
                      onChange={e => setBrandInput(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Virgülle ayırarak birden fazla girebilirsiniz.</p>
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
              >
                Personeli Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
             <h3 className="font-bold text-slate-700">Sistem Aktiviteleri</h3>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3">Zaman</th>
                  <th className="px-6 py-3">Kullanıcı</th>
                  <th className="px-6 py-3">İşlem</th>
                  <th className="px-6 py-3">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.slice().reverse().map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-slate-500 font-mono text-xs">{log.timestamp}</td>
                    <td className="px-6 py-3 font-medium text-slate-700">{log.userEmail}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.action === 'LOGIN' ? 'bg-green-100 text-green-700' :
                        log.action === 'LOGOUT' ? 'bg-gray-100 text-gray-700' :
                        log.action === 'ADMIN_ACTION' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'chatbot' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
            <div className="flex items-start gap-4 mb-8">
                <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
                    <Bot size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">SemDigital Performans Asistanı</h3>
                    <p className="text-slate-500 mt-1 max-w-3xl">
                        Aşağıdaki kod, Google Chat botunu <strong>SemDigital Asistanı</strong> olarak yapılandırır.
                        Sadece yüklenen verilerle konuşur ve hatalı hesaplama yapmaz.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Code Generator Area */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                         <div className="flex gap-2">
                             <button 
                                onClick={() => setScriptTab('code')}
                                className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-all ${
                                    scriptTab === 'code' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                             >
                                <Code size={14} /> Code.gs
                             </button>
                             <button 
                                onClick={() => setScriptTab('manifest')}
                                className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-all ${
                                    scriptTab === 'manifest' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                             >
                                <FileJson size={14} /> appsscript.json
                             </button>
                         </div>
                        <button 
                            onClick={handleCopyCode}
                            className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                        >
                            {copySuccess ? <CheckCircle size={14} /> : <Copy size={14} />} 
                            {copySuccess || 'Kodu Kopyala'}
                        </button>
                    </div>
                    <div className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-x-auto h-[400px] border border-slate-700 relative group">
                        <pre>{scriptTab === 'code' ? generateAppsScriptCode() : generateManifestCode()}</pre>
                    </div>
                </div>

                {/* Instructions */}
                <div className="space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Kurulum Adımları</h4>
                    
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                        <div className="flex gap-3">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0">1</span>
                            <div>
                                <h5 className="font-semibold text-slate-700">Script Kurulumu</h5>
                                <p className="text-sm text-slate-500 mt-1">
                                    Code.gs kodunu Apps Script'e yapıştırın. <br/>
                                    <strong>GEMINI_API_KEY</strong> girin. <br/>
                                    <code>testBot</code> fonksiyonunu çalıştırarak izinleri verin.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                             <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0">2</span>
                             <div>
                                <h5 className="font-semibold text-slate-700">Manifest Güncelleme</h5>
                                <p className="text-sm text-slate-500 mt-1">
                                    <code>appsscript.json</code> içeriğini silip soldaki manifest koduyla değiştirin.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                             <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0">3</span>
                             <div>
                                <h5 className="font-semibold text-slate-700">Web App Olarak Dağıtın</h5>
                                <p className="text-sm text-slate-500 mt-1">
                                    Dağıt > Yeni Dağıtım > Web App > Herkes (Anyone) olarak yayınlayın.
                                    URL'i bu uygulamanın analiz sayfasına yapıştırın.
                                </p>
                            </div>
                        </div>

                         <div className="flex gap-3">
                             <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold shrink-0">4</span>
                             <div>
                                <h5 className="font-semibold text-indigo-700">Google Cloud Bağlantısı</h5>
                                <p className="text-sm text-slate-500 mt-1">
                                    Apps Script'ten <strong>Deployment ID</strong> (Head ID) alın.
                                    Google Cloud Console > Chat API > Configuration > App URL alanına yapıştırın.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
