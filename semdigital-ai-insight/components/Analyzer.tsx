
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { LCWRow, FilterState, User, GlobalAnalysisContext } from '../types';
import { analyzeAggregatedPerformance } from '../services/geminiService';
import { 
  Upload, Filter, Calendar, ChevronDown, Check, RefreshCw, Send,
  TrendingUp, DollarSign, MousePointer, Layers, Smartphone, Globe,
  Database, Facebook, Video, Search, Zap, Eye, MousePointerClick,
  ArrowUp, ArrowDown, List, Award, Sparkles, Loader2, SplitSquareHorizontal, LayoutTemplate
} from 'lucide-react';

interface AnalyzerProps {
  knowledgeContext: string;
  user: User;
  onContextUpdate?: (context: GlobalAnalysisContext) => void;
}

const Analyzer: React.FC<AnalyzerProps> = ({ knowledgeContext, user, onContextUpdate }) => {
  // --- STATE ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawData, setRawData] = useState<LCWRow[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // View Mode: Standard vs Cross Analysis
  const [viewMode, setViewMode] = useState<'standard' | 'cross'>('standard');

  // AI Insight State
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Table Tab State
  const [activeTableTab, setActiveTableTab] = useState<'all' | 'top_imp' | 'low_imp' | 'top_click' | 'top_roas'>('all');
  
  // Bot Integration State - Updated Default URL
  const [appsScriptUrl, setAppsScriptUrl] = useState('https://script.google.com/macros/s/AKfycbyq2mPMOrBW5ZiXmsj4A0ukvQ1MQjV35AC-_Q7blQ0OwJZpHJvTuH5XywGCfGJSI7ukAg/exec');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<{success: boolean, message: string} | null>(null);
  const [autoSync, setAutoSync] = useState(true);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    brand: 'All',
    account: 'All',
    channels: [],
    devices: []
  });

  // UI State for Custom Dropdowns
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // --- 1. PARSING ENGINE (STRICT LCW LOGIC) ---
  const parseTrFloat = (val: string) => {
    if (!val) return 0;
    const str = val.toString();
    // 1.234,56 -> 1234.56 format conversion
    if (str.includes(',') && str.includes('.')) {
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    } else if (str.includes(',')) {
        return parseFloat(str.replace(',', '.')) || 0;
    }
    return parseFloat(str) || 0;
  };

  const processData = (rows: LCWRow[]) => {
      // Find Date Range
      let maxDate = '';
      rows.forEach(r => {
          if (r.date > maxDate) maxDate = r.date;
      });

      setRawData(rows);
      setIsDataLoaded(true);
      setIsLoading(false);

      // Auto-Set Date Range (Last 30 Days relative to data)
      if (maxDate) {
        const end = new Date(maxDate);
        const start = new Date(maxDate);
        start.setDate(end.getDate() - 30);
        
        setFilters(prev => ({
          ...prev,
          endDate: maxDate,
          startDate: start.toISOString().split('T')[0],
          brand: 'All',
          account: 'All',
          channels: [],
          devices: []
        }));
      }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) return;

      const delimiter = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ''));

      // STRICT LCW MAPPING LOGIC
      const idxChannel = headers.findIndex(h => h === 'platform' || h === 'mecra'); 
      const idxDevice = headers.findIndex(h => h === 'cihaz_platformu' || h === 'cihaz' || h === 'device');
      
      const idxDate = headers.findIndex(h => h.includes('tarih') || h.includes('date'));
      const idxBrand = headers.findIndex(h => h === 'co_marka' || h === 'brand' || h === 'marka');
      const idxAccount = headers.findIndex(h => h === 'hesap_adi' || h === 'account');
      const idxCamp = headers.findIndex(h => h === 'kampanya_adi' || h === 'campaign');
      
      const idxSpend = headers.findIndex(h => h === 'harcama' || h === 'spend' || h === 'cost');
      const idxRev = headers.findIndex(h => h === 'donusum' || h === 'gelir' || h === 'revenue');
      const idxClick = headers.findIndex(h => h === 'tiklama' || h === 'clicks');
      const idxImpr = headers.findIndex(h => h === 'gosterim' || h === 'impressions');

      const parsedRows: LCWRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(delimiter);
        if (row.length < 5) continue;

        parsedRows.push({
          date: idxDate > -1 ? row[idxDate]?.replace(/"/g, '').trim() : '',
          brand: idxBrand > -1 ? row[idxBrand]?.replace(/"/g, '').trim() : 'Bilinmeyen Marka',
          account: idxAccount > -1 ? row[idxAccount]?.replace(/"/g, '').trim() : 'Bilinmeyen Hesap',
          channel: idxChannel > -1 ? row[idxChannel]?.replace(/"/g, '').trim() : 'Other',
          device: idxDevice > -1 ? row[idxDevice]?.replace(/"/g, '').trim() : 'Other',
          campaignName: idxCamp > -1 ? row[idxCamp]?.replace(/"/g, '').trim() : 'Campaign',
          spend: idxSpend > -1 ? parseTrFloat(row[idxSpend]) : 0,
          revenue: idxRev > -1 ? parseTrFloat(row[idxRev]) : 0,
          clicks: idxClick > -1 ? parseTrFloat(row[idxClick]) : 0,
          impressions: idxImpr > -1 ? parseTrFloat(row[idxImpr]) : 0,
          conversions: 0 
        });
      }
      processData(parsedRows);
    };
    reader.readAsText(file);
  };

  // --- MOCK DATA CONNECTORS ---
  const handleConnectMock = (source: string) => {
      setIsLoading(true);
      setTimeout(() => {
          // Generate realistic mock data for LCW context
          const mockRows: LCWRow[] = [];
          const brands = ['LCW', 'LCW Home', 'LCW Kids'];
          const channels = source === 'meta' ? ['meta'] : source === 'google' ? ['google_ads'] : ['tiktok'];
          const devices = ['MOBILE', 'DESKTOP', 'APP'];
          
          const today = new Date();
          
          for(let i=0; i<60; i++) {
              const d = new Date(today);
              d.setDate(d.getDate() - i);
              const dateStr = d.toISOString().split('T')[0];
              
              channels.forEach(ch => {
                  devices.forEach(dv => {
                      const spend = Math.random() * 5000 + 1000;
                      mockRows.push({
                          date: dateStr,
                          brand: brands[Math.floor(Math.random() * brands.length)],
                          account: `${source.toUpperCase()}_ACCOUNT_01`,
                          channel: ch,
                          device: dv,
                          campaignName: `${source}_${ch}_${dv}_Camp_${i}`,
                          spend: spend,
                          revenue: spend * (Math.random() * 5 + 0.5), // Random ROAS
                          clicks: Math.floor(spend / 2),
                          impressions: Math.floor(spend * 20),
                          conversions: Math.floor(spend / 50)
                      });
                  });
              });
          }
          processData(mockRows);
      }, 1500);
  };

  // --- 2. DYNAMIC OPTIONS ---
  const options = useMemo(() => {
    if (!isDataLoaded) return { brands: [], accounts: [], channels: [], devices: [] };
    const unique = (key: keyof LCWRow) => Array.from(new Set(rawData.map(r => String(r[key])))).filter(Boolean).sort();
    return {
      brands: unique('brand'),
      accounts: unique('account'),
      channels: unique('channel'),
      devices: unique('device')
    };
  }, [rawData, isDataLoaded]);

  // --- 3. FILTERING LOGIC ---
  const filteredData = useMemo(() => {
    return rawData.filter(row => {
      if (filters.startDate && row.date < filters.startDate) return false;
      if (filters.endDate && row.date > filters.endDate) return false;
      if (filters.brand !== 'All' && row.brand !== filters.brand) return false;
      if (filters.account !== 'All' && row.account !== filters.account) return false;
      if (filters.channels.length > 0 && !filters.channels.includes(row.channel)) return false;
      if (filters.devices.length > 0 && !filters.devices.includes(row.device)) return false;
      return true;
    });
  }, [rawData, filters]);

  // --- 4. CROSS ANALYSIS LOGIC ---
  const { metaData, googleData, crossKpi } = useMemo(() => {
    const meta = filteredData.filter(r => 
        r.channel.toLowerCase().includes('meta') || 
        r.channel.toLowerCase().includes('facebook') || 
        r.channel.toLowerCase().includes('instagram')
    );
    const google = filteredData.filter(r => 
        r.channel.toLowerCase().includes('google') || 
        r.channel.toLowerCase().includes('youtube')
    );

    const calcKpi = (data: LCWRow[]) => {
        const spend = data.reduce((sum, r) => sum + r.spend, 0);
        const revenue = data.reduce((sum, r) => sum + r.revenue, 0);
        return {
            spend,
            revenue,
            roas: spend > 0 ? revenue / spend : 0,
            count: data.length
        };
    };

    return {
        metaData: meta,
        googleData: google,
        crossKpi: {
            meta: calcKpi(meta),
            google: calcKpi(google)
        }
    };
  }, [filteredData]);

  // --- 5. TABLE SORTING LOGIC ---
  const displayedTableData = useMemo(() => {
    const data = [...filteredData];
    switch (activeTableTab) {
        case 'top_imp': return data.sort((a, b) => b.impressions - a.impressions).slice(0, 20);
        case 'low_imp': return data.sort((a, b) => a.impressions - b.impressions).slice(0, 20);
        case 'top_click': return data.sort((a, b) => b.clicks - a.clicks).slice(0, 20);
        case 'top_roas': return data.filter(d => d.spend > 100).sort((a, b) => (b.revenue / b.spend) - (a.revenue / a.spend)).slice(0, 20);
        case 'all': default: return data.slice(0, 50);
    }
  }, [filteredData, activeTableTab]);

  // --- 6. AGGREGATIONS ---
  const kpi = useMemo(() => {
    const totalSpend = filteredData.reduce((sum, r) => sum + r.spend, 0);
    const totalRevenue = filteredData.reduce((sum, r) => sum + r.revenue, 0);
    const totalClicks = filteredData.reduce((sum, r) => sum + r.clicks, 0);
    const totalImpressions = filteredData.reduce((sum, r) => sum + r.impressions, 0);
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    return { totalSpend, totalRevenue, roas, cpc, ctr, totalClicks, totalImpressions };
  }, [filteredData]);

  const chartData = useMemo(() => {
    const grouped: Record<string, { date: string, spend: number, revenue: number }> = {};
    filteredData.forEach(row => {
      if (!grouped[row.date]) grouped[row.date] = { date: row.date, spend: 0, revenue: 0 };
      grouped[row.date].spend += row.spend;
      grouped[row.date].revenue += row.revenue;
    });
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  // --- 7. AUTOMATIC AI ANALYSIS (EFFECT) ---
  useEffect(() => {
    if (!isDataLoaded) return;
    const timer = setTimeout(async () => {
        setIsAiGenerating(true);
        try {
            const insight = await analyzeAggregatedPerformance(kpi, filters);
            setAiSummary(insight);
        } catch (error) { setAiSummary("Otomatik analiz oluşturulamadı."); } 
        finally { setIsAiGenerating(false); }
    }, 2000);
    return () => clearTimeout(timer);
  }, [kpi, filters, isDataLoaded]);

  // --- 8. SYNC CONTEXT LOGIC ---
  const currentReport = useMemo(() => {
      return aiSummary || `ÖZET RAPOR: ${filters.startDate} - ${filters.endDate}. Harcama: ${kpi.totalSpend.toFixed(0)} TL, ROAS: ${kpi.roas.toFixed(2)}`;
  }, [aiSummary, kpi, filters]);

  useEffect(() => {
    if (onContextUpdate) {
        const contextPayload: GlobalAnalysisContext = {
            report: currentReport,
            rawData: [...filteredData].sort((a,b) => b.spend - a.spend).slice(0, 3000),
            filters: filters
        };
        onContextUpdate(contextPayload);
    }
  }, [currentReport, filteredData, filters, onContextUpdate]);

  // --- HELPERS ---
  const toggleMultiSelect = (type: 'channels' | 'devices', value: string) => {
    setFilters(prev => {
      const current = prev[type];
      const exists = current.includes(value);
      const updated = exists ? current.filter(i => i !== value) : [...current, value];
      return { ...prev, [type]: updated };
    });
  };

  const handleSyncToBot = useCallback(async (silent = false) => {
    if (!appsScriptUrl) {
      if (!silent) alert("Lütfen önce Bot Entegrasyon URL'ini girin.");
      return;
    }
    if (!silent) { setIsPublishing(true); setPublishStatus(null); }

    const csvHeader = "date,brand,channel,device,campaign,spend,revenue,clicks,impressions";
    const combinedData = [
        ...filteredData.sort((a, b) => b.spend - a.spend).slice(0, 50),
        ...filteredData.sort((a, b) => b.clicks - a.clicks).slice(0, 50),
        ...filteredData.sort((a, b) => b.impressions - a.impressions).slice(0, 50),
        ...filteredData.filter(x => x.spend > 100).sort((a, b) => (b.revenue/b.spend) - (a.revenue/a.spend)).slice(0, 50)
    ];
    const uniqueData = Array.from(new Set(combinedData.map(r => r.campaignName + r.date)))
        .map(key => combinedData.find(r => r.campaignName + r.date === key))
        .filter(r => r !== undefined) as LCWRow[];

    const csvRows = uniqueData.map(r => 
      `${r.date},${r.brand},${r.channel},${r.device},"${r.campaignName.replace(/"/g, '""')}",${Math.round(r.spend)},${Math.round(r.revenue)},${r.clicks},${r.impressions}`
    ).join('\n');
    
    const minifiedCsv = csvHeader + "\n" + csvRows;

    const payload = {
        brandName: filters.brand !== 'All' ? filters.brand : 'Genel Bakış',
        report: currentReport,
        rawCampaignData: {
            campaignName: "Filtrelenmiş Veri Seti (CSV Format)",
            spend: kpi.totalSpend,
            revenue: kpi.totalRevenue,
            csvContent: minifiedCsv
        }
    };

    try {
        await fetch(appsScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!silent) setPublishStatus({ success: true, message: 'Bot güncellendi.' });
    } catch (e) {
        if (!silent) setPublishStatus({ success: false, message: 'Bağlantı hatası.' });
    } finally {
        if (!silent) setIsPublishing(false);
    }
  }, [appsScriptUrl, filters, kpi, currentReport, filteredData]);

  useEffect(() => {
    if (!isDataLoaded || !autoSync || !appsScriptUrl) return;
    const timer = setTimeout(() => { handleSyncToBot(true); }, 1500);
    return () => clearTimeout(timer);
  }, [kpi, autoSync, isDataLoaded, appsScriptUrl, handleSyncToBot]);

  // --- VIEW: DATA CONNECTORS (Initial State) ---
  if (!isDataLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 p-8 rounded-2xl animate-fade-in">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Veri Kaynağı Seçin</h2>
        <p className="text-slate-500 mb-10 text-center max-w-xl">
            Analiz etmek istediğiniz kampanya verilerini nereden çekmek istersiniz?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
            <button onClick={() => handleConnectMock('meta')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-400 transition-all flex flex-col items-center gap-4 group">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform"><Facebook size={28} /></div>
                <div className="text-center"><h3 className="font-bold text-slate-800">Meta Ads</h3><p className="text-xs text-slate-400 mt-1">Facebook & Instagram</p></div>
            </button>
            <button onClick={() => handleConnectMock('google')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-orange-400 transition-all flex flex-col items-center gap-4 group">
                <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform"><Globe size={28} /></div>
                <div className="text-center"><h3 className="font-bold text-slate-800">Google Ads</h3><p className="text-xs text-slate-400 mt-1">Search, YouTube</p></div>
            </button>
            <button onClick={() => handleConnectMock('tiktok')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-800 transition-all flex flex-col items-center gap-4 group">
                <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center text-white group-hover:scale-110 transition-transform"><Video size={28} /></div>
                <div className="text-center"><h3 className="font-bold text-slate-800">TikTok Ads</h3><p className="text-xs text-slate-400 mt-1">Pangle & Feed</p></div>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-6 group">
                 <Upload size={32} className="text-white opacity-80 group-hover:scale-110 transition-transform" />
                 <div className="text-left text-white">
                    <h3 className="font-bold text-lg">Manuel CSV Yükle</h3>
                    <p className="text-xs text-slate-300 mt-1">BigQuery Export veya Rapor Dosyası</p>
                 </div>
            </button>
        </div>
        {isLoading && <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center"><RefreshCw size={48} className="text-blue-600 animate-spin mb-4"/><p className="font-bold text-slate-600">Veriler İşleniyor...</p></div>}
        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
      </div>
    );
  }

  // --- VIEW: DASHBOARD (Data Loaded) ---
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)] overflow-hidden">
      
      {/* --- SIDEBAR: FILTER COMMAND CENTER --- */}
      <div className="w-full lg:w-72 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Filter size={18} className="text-blue-600"/> Filtre Merkezi</h3>
            <button onClick={() => { setIsDataLoaded(false); setRawData([]); }} className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase flex items-center gap-1"><RefreshCw size={10}/> Değiştir</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={12}/> Tarih Aralığı</label>
                <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="text-xs p-2 border rounded bg-slate-50"/>
                    <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="text-xs p-2 border rounded bg-slate-50"/>
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Marka (co_marka)</label>
                <select value={filters.brand} onChange={e => setFilters({...filters, brand: e.target.value})} className="w-full text-xs p-2 border rounded bg-slate-50">
                    <option value="All">Tüm Markalar</option>
                    {options.brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Hesap (hesap_adi)</label>
                <select value={filters.account} onChange={e => setFilters({...filters, account: e.target.value})} className="w-full text-xs p-2 border rounded bg-slate-50">
                    <option value="All">Tüm Hesaplar</option>
                    {options.accounts.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>
            <hr className="border-slate-100"/>
            <div className="space-y-1 relative">
                <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">Mecra / Platform {filters.channels.length > 0 && <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded">{filters.channels.length}</span>}</label>
                <button onClick={() => setOpenDropdown(openDropdown === 'channel' ? null : 'channel')} className="w-full text-left text-xs p-2 border rounded bg-white flex justify-between items-center"><span className="truncate">{filters.channels.length ? filters.channels.join(', ') : 'Tümü (Default)'}</span><ChevronDown size={14}/></button>
                {openDropdown === 'channel' && <div className="absolute z-10 w-full bg-white border shadow-lg mt-1 max-h-40 overflow-y-auto p-1 rounded">{options.channels.map(ch => <div key={ch} onClick={() => toggleMultiSelect('channels', ch)} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 cursor-pointer text-xs"><div className={`w-3 h-3 border rounded flex items-center justify-center ${filters.channels.includes(ch) ? 'bg-blue-600 border-blue-600' : ''}`}>{filters.channels.includes(ch) && <Check size={8} className="text-white"/>}</div><span>{ch}</span></div>)}</div>}
            </div>
            <div className="space-y-1 relative">
                <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">Cihaz (Device) {filters.devices.length > 0 && <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded">{filters.devices.length}</span>}</label>
                <button onClick={() => setOpenDropdown(openDropdown === 'device' ? null : 'device')} className="w-full text-left text-xs p-2 border rounded bg-white flex justify-between items-center"><span className="truncate">{filters.devices.length ? filters.devices.join(', ') : 'Tümü (Default)'}</span><ChevronDown size={14}/></button>
                {openDropdown === 'device' && <div className="absolute z-10 w-full bg-white border shadow-lg mt-1 max-h-40 overflow-y-auto p-1 rounded">{options.devices.map(dv => <div key={dv} onClick={() => toggleMultiSelect('devices', dv)} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 cursor-pointer text-xs"><div className={`w-3 h-3 border rounded flex items-center justify-center ${filters.devices.includes(dv) ? 'bg-blue-600 border-blue-600' : ''}`}>{filters.devices.includes(dv) && <Check size={8} className="text-white"/>}</div><span>{dv}</span></div>)}</div>}
            </div>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
             <div className="flex items-center justify-between mb-2">
                 <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Zap size={10} className={autoSync ? 'text-green-500' : 'text-slate-400'}/> Otomatik Eşitleme</label>
                 <div onClick={() => setAutoSync(!autoSync)} className={`w-8 h-4 rounded-full cursor-pointer relative transition-colors ${autoSync ? 'bg-green-500' : 'bg-slate-300'}`}><div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${autoSync ? 'left-4.5' : 'left-0.5'}`} style={{left: autoSync ? '18px' : '2px'}}/></div>
             </div>
             <p className={`text-[10px] text-center ${publishStatus?.success ? 'text-green-600' : 'text-slate-400'}`}>{isPublishing ? 'Eşitleniyor...' : publishStatus?.message || 'Chat Bot Hazır'}</p>
        </div>
      </div>

      {/* --- MAIN DASHBOARD AREA --- */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        
        {/* VIEW TOGGLE */}
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Kampanya Performansı</h2>
            <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                <button 
                  onClick={() => setViewMode('standard')} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'standard' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <LayoutTemplate size={16}/> Genel Bakış
                </button>
                <button 
                  onClick={() => setViewMode('cross')} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'cross' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <SplitSquareHorizontal size={16}/> Çapraz Analiz (Meta vs Google)
                </button>
            </div>
        </div>

        {/* AI EXECUTIVE SUMMARY (Always Visible) */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
             <div className="flex justify-between items-start mb-2 relative z-10">
                 <h3 className="font-bold flex items-center gap-2"><Sparkles size={18} className="text-yellow-300"/> AI Yönetici Özeti</h3>
                 {isAiGenerating && <Loader2 size={18} className="animate-spin text-white/70"/>}
             </div>
             <div className="relative z-10"><p className="text-sm md:text-base leading-relaxed text-blue-50">{aiSummary || "Analiz oluşturmak için veri bekleniyor..."}</p></div>
             <Sparkles size={120} className="absolute -right-6 -bottom-6 text-white/5 rotate-12"/>
        </div>

        {viewMode === 'standard' ? (
          <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><DollarSign size={12}/> Toplam Harcama</p><p className="text-2xl font-black text-slate-800 mt-1">₺{Math.floor(kpi.totalSpend).toLocaleString('tr-TR')}</p></div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><TrendingUp size={12}/> Toplam Ciro</p><p className="text-2xl font-black text-emerald-600 mt-1">₺{Math.floor(kpi.totalRevenue).toLocaleString('tr-TR')}</p></div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden"><p className="text-xs font-bold text-slate-400 uppercase">ROAS</p><p className={`text-2xl font-black mt-1 ${kpi.roas > 4 ? 'text-green-600' : kpi.roas < 1 ? 'text-red-500' : 'text-orange-500'}`}>{kpi.roas.toFixed(2)}x</p><span className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${kpi.roas > 4 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{kpi.roas > 4 ? 'İYİ' : 'NORMAL'}</span></div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><MousePointer size={12}/> CPC / CTR</p><div className="flex items-baseline gap-2 mt-1"><p className="text-xl font-bold text-slate-700">₺{kpi.cpc.toFixed(2)}</p><span className="text-sm text-slate-400">/</span><p className="text-xl font-bold text-blue-600">%{kpi.ctr.toFixed(2)}</p></div></div>
            </div>

            {/* CHART */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6">Zaman İçinde Performans (Harcama vs Ciro)</h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} minTickGap={30}/>
                            <YAxis yAxisId="left" tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(val) => `₺${val/1000}k`}/>
                            <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(val) => `₺${val/1000}k`}/>
                            <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(val: number) => [`₺${val.toLocaleString()}`, '']}/>
                            <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                            <Line yAxisId="left" type="monotone" dataKey="spend" name="Harcama" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{r: 4}} />
                            <Line yAxisId="right" type="monotone" dataKey="revenue" name="Ciro" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{r: 4}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* MAIN TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-2 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2">
                    <button onClick={() => setActiveTableTab('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTableTab === 'all' ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}><List size={14}/> Tüm Veriler</button>
                    <button onClick={() => setActiveTableTab('top_imp')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTableTab === 'top_imp' ? 'bg-purple-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}><Eye size={14}/> En Çok Gösterim (Top 20)</button>
                    <button onClick={() => setActiveTableTab('low_imp')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTableTab === 'low_imp' ? 'bg-slate-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}><ArrowDown size={14}/> En Az Gösterim (Bottom 20)</button>
                    <button onClick={() => setActiveTableTab('top_click')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTableTab === 'top_click' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}><MousePointerClick size={14}/> En Çok Tıklama (Top 20)</button>
                    <button onClick={() => setActiveTableTab('top_roas')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTableTab === 'top_roas' ? 'bg-emerald-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}><Award size={14}/> En Yüksek ROAS</button>
                </div>
                <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 z-10 shadow-sm">
                            <tr><th className="px-4 py-3">Tarih</th><th className="px-4 py-3">Marka</th><th className="px-4 py-3">Mecra</th><th className="px-4 py-3">Cihaz</th><th className="px-4 py-3">Kampanya</th><th className="px-4 py-3 text-right">Gösterim</th><th className="px-4 py-3 text-right">Tıklama</th><th className="px-4 py-3 text-right">Harcama</th><th className="px-4 py-3 text-right">Ciro</th><th className="px-4 py-3 text-right">ROAS</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayedTableData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2 font-mono text-slate-600">{row.date}</td>
                                    <td className="px-4 py-2">{row.brand}</td>
                                    <td className="px-4 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${row.channel.includes('google') ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{row.channel}</span></td>
                                    <td className="px-4 py-2 text-slate-500">{row.device}</td>
                                    <td className="px-4 py-2 text-slate-700 max-w-[200px] truncate" title={row.campaignName}>{row.campaignName}</td>
                                    <td className="px-4 py-2 text-right text-slate-500">{row.impressions.toLocaleString()}</td>
                                    <td className="px-4 py-2 text-right text-slate-500">{row.clicks.toLocaleString()}</td>
                                    <td className="px-4 py-2 text-right font-medium">₺{row.spend.toLocaleString()}</td>
                                    <td className="px-4 py-2 text-right font-medium text-emerald-600">₺{row.revenue.toLocaleString()}</td>
                                    <td className="px-4 py-2 text-right font-bold"><span className={row.spend > 0 && row.revenue/row.spend > 4 ? 'text-green-600' : 'text-slate-600'}>{(row.spend > 0 ? row.revenue/row.spend : 0).toFixed(2)}x</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </>
        ) : (
          /* --- CROSS ANALYSIS VIEW --- */
          <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* META SECTION */}
                 <div className="space-y-4">
                     <div className="bg-blue-600 text-white p-4 rounded-xl shadow-md flex justify-between items-center">
                         <div className="flex items-center gap-3">
                             <div className="bg-white/20 p-2 rounded-lg"><Facebook size={20}/></div>
                             <div><h3 className="font-bold">Meta Ads</h3><p className="text-xs text-blue-200">Facebook & Instagram</p></div>
                         </div>
                         <div className="text-right">
                             <p className="text-2xl font-black">₺{Math.floor(crossKpi.meta.spend).toLocaleString()}</p>
                             <p className="text-xs opacity-80">Toplam Harcama</p>
                         </div>
                     </div>
                     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 gap-4">
                         <div><p className="text-xs text-slate-500 uppercase font-bold">Ciro</p><p className="text-lg font-bold text-emerald-600">₺{Math.floor(crossKpi.meta.revenue).toLocaleString()}</p></div>
                         <div><p className="text-xs text-slate-500 uppercase font-bold">ROAS</p><p className={`text-lg font-bold ${crossKpi.meta.roas > 4 ? 'text-green-600' : 'text-slate-700'}`}>{crossKpi.meta.roas.toFixed(2)}x</p></div>
                     </div>
                     
                     {/* META TABLE */}
                     <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 p-2 border-b border-slate-100 text-xs font-bold text-slate-600">Meta Kampanya Özeti</div>
                        <div className="max-h-[300px] overflow-y-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-slate-500 sticky top-0"><tr><th className="p-2">Kampanya</th><th className="p-2 text-right">Harcama</th><th className="p-2 text-right">ROAS</th></tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {metaData.slice(0,20).map((r,i)=>(<tr key={i}><td className="p-2 truncate max-w-[120px]">{r.campaignName}</td><td className="p-2 text-right">₺{Math.round(r.spend)}</td><td className="p-2 text-right">{(r.spend>0?r.revenue/r.spend:0).toFixed(2)}x</td></tr>))}
                                </tbody>
                            </table>
                        </div>
                     </div>
                 </div>

                 {/* GOOGLE SECTION */}
                 <div className="space-y-4">
                     <div className="bg-orange-500 text-white p-4 rounded-xl shadow-md flex justify-between items-center">
                         <div className="flex items-center gap-3">
                             <div className="bg-white/20 p-2 rounded-lg"><Globe size={20}/></div>
                             <div><h3 className="font-bold">Google Ads</h3><p className="text-xs text-orange-100">Search & YouTube</p></div>
                         </div>
                         <div className="text-right">
                             <p className="text-2xl font-black">₺{Math.floor(crossKpi.google.spend).toLocaleString()}</p>
                             <p className="text-xs opacity-80">Toplam Harcama</p>
                         </div>
                     </div>
                     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 gap-4">
                         <div><p className="text-xs text-slate-500 uppercase font-bold">Ciro</p><p className="text-lg font-bold text-emerald-600">₺{Math.floor(crossKpi.google.revenue).toLocaleString()}</p></div>
                         <div><p className="text-xs text-slate-500 uppercase font-bold">ROAS</p><p className={`text-lg font-bold ${crossKpi.google.roas > 4 ? 'text-green-600' : 'text-slate-700'}`}>{crossKpi.google.roas.toFixed(2)}x</p></div>
                     </div>

                     {/* GOOGLE TABLE */}
                     <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 p-2 border-b border-slate-100 text-xs font-bold text-slate-600">Google Kampanya Özeti</div>
                        <div className="max-h-[300px] overflow-y-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-slate-500 sticky top-0"><tr><th className="p-2">Kampanya</th><th className="p-2 text-right">Harcama</th><th className="p-2 text-right">ROAS</th></tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {googleData.slice(0,20).map((r,i)=>(<tr key={i}><td className="p-2 truncate max-w-[120px]">{r.campaignName}</td><td className="p-2 text-right">₺{Math.round(r.spend)}</td><td className="p-2 text-right">{(r.spend>0?r.revenue/r.spend:0).toFixed(2)}x</td></tr>))}
                                </tbody>
                            </table>
                        </div>
                     </div>
                 </div>
             </div>
             
             {/* COMPARISON CHART */}
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6">Mecra Performans Karşılaştırması</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                            { name: 'Harcama', Meta: crossKpi.meta.spend, Google: crossKpi.google.spend },
                            { name: 'Ciro', Meta: crossKpi.meta.revenue, Google: crossKpi.google.revenue }
                        ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false}/>
                            <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} tickFormatter={(val)=>`₺${val/1000}k`}/>
                            <Tooltip cursor={{fill: 'transparent'}} formatter={(val:number)=>`₺${val.toLocaleString()}`}/>
                            <Legend />
                            <Bar dataKey="Meta" fill="#2563eb" radius={[4,4,0,0]} barSize={60}/>
                            <Bar dataKey="Google" fill="#f97316" radius={[4,4,0,0]} barSize={60}/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Analyzer;
