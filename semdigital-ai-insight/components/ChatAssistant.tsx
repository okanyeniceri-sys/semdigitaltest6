
import React, { useState, useRef, useEffect } from 'react';
import { Chat } from "@google/genai";
import { createChatSession, sendMessageToChat } from '../services/geminiService';
import { ChatMessage, GlobalAnalysisContext } from '../types';
import { Send, Bot, User, Loader2, Lightbulb } from 'lucide-react';

interface ChatAssistantProps {
  knowledgeContext: string;
  analysisContext: GlobalAnalysisContext | null;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ knowledgeContext, analysisContext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Merhaba! Ben SemDigital performans asistanıyım. Dijital pazarlama stratejileri, kampanya analizleri, yeni proje fikirleri veya bütçe yönetimi konusunda size yardımcı olabilirim. Bugün hangi marka veya konu üzerinde çalışıyoruz?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "Yeni kampanya lansman stratejisi",
    "ROAS artırma taktikleri",
    "Bütçe optimizasyonu önerileri",
    "Sosyal medya trendleri",
    "Kitle hedefleme ipuçları"
  ];

  // Initial Chat Session creation (memoized by ref to avoid recreation)
  // Re-create session when context (knowledge or analysis data) changes
  useEffect(() => {
      chatSessionRef.current = createChatSession(knowledgeContext, analysisContext);
      
      // Optional: Add a system message indicating context update
      if (analysisContext) {
          setMessages(prev => [...prev, {
              role: 'model',
              text: `✅ **Analiz Verileri Yüklendi:**\n${analysisContext.rawData.length} adet kampanya satırı ve rapor özeti hafızama eklendi. Artık bu verilere dayalı detaylı sorular sorabilirsiniz.`,
              timestamp: Date.now()
          }]);
      }
  }, [knowledgeContext, analysisContext]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = { role: 'user', text: textToSend, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await sendMessageToChat(chatSessionRef.current, userMsg.text);
      const aiMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Chat Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Bot size={24} />
        </div>
        <div>
            <h3 className="font-bold text-slate-800">SemDigital AI Asistanı</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1">
                Dijital Pazarlama & Strateji Uzmanı
            </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-white text-purple-600 border border-purple-100'
            }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                ? 'bg-slate-800 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
            }`}>
                {/* Simple markdown parser for bold text in chat */}
                {msg.text.split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i} className={msg.role === 'user' ? 'text-blue-200' : 'text-indigo-700'}>{part}</strong> : part
                )}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex gap-3 animate-fade-in">
             <div className="w-8 h-8 rounded-full bg-white border border-purple-100 text-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                <Bot size={16} />
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        {/* Quick Prompts */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 no-scrollbar">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="whitespace-nowrap px-3 py-1.5 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-600 border border-slate-200 rounded-full text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Lightbulb size={12} />
              {prompt}
            </button>
          ))}
        </div>

        <div className="relative">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Strateji, trend veya bütçe hakkında sorun..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                disabled={isTyping}
            />
            <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:bg-slate-400 transition-colors shadow-sm"
            >
                {isTyping ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
