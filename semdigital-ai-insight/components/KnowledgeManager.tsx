
import React, { useState } from 'react';
import { Upload, FileText, Trash2, Plus, Save, Database } from 'lucide-react';
import { KnowledgeItem } from '../types';

interface KnowledgeManagerProps {
  items: KnowledgeItem[];
  onAddItem: (item: KnowledgeItem) => void;
  onRemoveItem: (id: string) => void;
}

const KnowledgeManager: React.FC<KnowledgeManagerProps> = ({ items, onAddItem, onRemoveItem }) => {
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const handleAddManual = () => {
    if (!newTitle.trim() || !newContent.trim()) return;

    const newItem: KnowledgeItem = {
      id: Date.now().toString(),
      title: newTitle,
      content: newContent,
      dateAdded: new Date().toLocaleDateString('tr-TR'),
    };

    onAddItem(newItem);
    setNewTitle('');
    setNewContent('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const newItem: KnowledgeItem = {
          id: Date.now().toString(),
          title: file.name,
          content: text,
          dateAdded: new Date().toLocaleDateString('tr-TR'),
        };
        onAddItem(newItem);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Bilgi Bankası & Eğitim</h2>
        <p className="text-slate-600 mb-6">
          Geçmiş kampanya raporlarını, marka yönergelerini veya strateji notlarını buraya ekleyin. 
          AI asistanı ve analiz aracı, bu verileri kullanarak size daha kişiselleştirilmiş yanıtlar verecektir.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload / Add Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Plus size={18} /> Yeni Veri Ekle
            </h3>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <input 
                type="text" 
                placeholder="Belge Başlığı (Örn: 2023 Yaz İndirim Raporu)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <textarea 
                placeholder="İçerik metnini buraya yapıştırın..."
                className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <label className="cursor-pointer flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors">
                  <Upload size={16} />
                  <span>Dosya Yükle (.txt, .json, .csv)</span>
                  <input type="file" accept=".txt,.json,.csv,.md" className="hidden" onChange={handleFileUpload} />
                </label>
                <button 
                  onClick={handleAddManual}
                  disabled={!newTitle || !newContent}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <Save size={16} /> Kaydet
                </button>
              </div>
            </div>
          </div>

          {/* List Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Database size={18} /> Mevcut Veriler ({items.length})
            </h3>
            
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <FileText size={48} className="mx-auto mb-2 opacity-20" />
                  <p>Henüz veri eklenmemiş.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <li key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between group">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mt-1">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-800">{item.title}</h4>
                          <p className="text-xs text-slate-500 mt-1">Eklendi: {item.dateAdded} • {item.content.length} karakter</p>
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{item.content}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onRemoveItem(item.id)}
                        className="text-slate-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"
                        title="Sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeManager;