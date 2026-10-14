import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  RotateCcw, 
  Minimize2, 
  Maximize2, 
  Copy, 
  Check, 
  User, 
  AlertCircle,
  HelpCircle,
  FolderOpen,
  Lock,
  HardDrive,
  Cpu,
  CornerDownLeft
} from 'lucide-react';
import { StorageStats, StorageFile, UserAccount } from '../types/storage';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

interface GeminiChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleOpen: () => void;
  stats?: StorageStats;
  files?: StorageFile[];
  currentUser?: UserAccount | null;
  currentFolder?: StorageFile | null;
  lang: 'bn' | 'en';
}

const STORAGE_CHAT_KEY = 'bashar_drive_gemini_chat_history_v1';

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  isOpen,
  onClose,
  onToggleOpen,
  stats,
  files = [],
  currentUser,
  currentFolder,
  lang
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHAT_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return [
      {
        id: 'msg-welcome',
        role: 'model',
        text: lang === 'bn'
          ? `👋 স্বাগতম! আমি **বাশার ক্লাউড এআই অ্যাসিস্ট্যান্ট** (Gemini 3.8 Flash দ্বারা চালিত)।\n\nআপনার ১০০০ জিবি ক্লাউড ড্রাইভ পরিচালনা, ফাইল গোছানো, ভল্ট এনক্রিপশন, সিক্রেট রিকভারি বা যেকোনো প্রশ্ন থাকলে আমাকে নির্দ্বিধায় জিজ্ঞাসা করুন!`
          : `👋 Welcome! I am your **Bashar Cloud AI Assistant** (powered by Gemini 3.8 Flash).\n\nAsk me anything about managing your 1000 GB cloud space, organizing folders, vault encryption, secret recovery, or general productivity!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.8-flash'
      }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon'>('gemini-3.8-flash');
  const [isMinimized, setIsMinimized] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const formatStorageMb = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setErrorNotice(null);
    setInput('');

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      // Build drive context for role-based reasoning
      const activeFilesCount = files.filter(f => !f.inTrash).length;
      const trashCount = files.filter(f => f.inTrash).length;
      const starredCount = files.filter(f => f.isStarred).length;
      const vaultCount = files.filter(f => f.isEncrypted).length;
      const usedFormatted = stats ? formatStorageMb(stats.usedBytes) : '0 MB';

      const driveContext = {
        userName: currentUser ? currentUser.name : 'Guest User',
        userIdentifier: currentUser ? currentUser.emailOrPhone : 'None',
        fileCount: activeFilesCount,
        trashCount,
        starredCount,
        vaultCount,
        usedStorage: usedFormatted,
        totalStorage: '1000 GB',
        currentFolderName: currentFolder ? currentFolder.name : 'Root Drive (বাশার ড্রাইভ)',
        recentFiles: files.slice(0, 5).map(f => `${f.name} (${f.category}, ${formatStorageMb(f.size)})`).join(', ')
      };

      const systemInstruction = `You are "বাশার ক্লাউড এআই অ্যাসিস্ট্যান্ট" (Bashar Cloud AI Assistant), an expert cloud storage assistant built into Bashar 1000GB Cloud Storage.
Your responsibilities:
1. Help users organize, search, categorize, and safely manage files across their 1000 GB cloud storage drive.
2. Explain key features: 1000 GB storage quota, single & bulk multi-upload, batch zip downloads, AES client-side encryption vault, secret name password recovery, and recycle bin trash management.
3. Be friendly, intelligent, polite, and helpful. Format your answers clearly using markdown bolding, lists, and short readable paragraphs.
4. Support both Bengali (বাংলা) and English seamlessly. If the user writes in Bengali, reply naturally in pleasant, accurate Bengali.
5. Provide accurate details based on the user's active drive context whenever asked about their files or storage quota.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map(m => ({ role: m.role, text: m.text })),
          model: selectedModel,
          systemInstruction,
          driveContext
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to get response from Gemini.');
      }

      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        role: 'model',
        text: data.reply || (lang === 'bn' ? 'কোনো উত্তর পাওয়া যায়নি।' : 'No answer generated.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.model || selectedModel
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chatbot error:', err);
      setErrorNotice(err.message || (lang === 'bn' ? 'সার্ভার থেকে উত্তর পেতে সমস্যা হয়েছে।' : 'Failed to connect to AI server.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    const welcome: ChatMessage = {
      id: 'msg-welcome-' + Date.now(),
      role: 'model',
      text: lang === 'bn'
        ? 'কথোপকথনের ইতিহাস মুছে ফেলা হয়েছে। আমি কীভাবে আপনাকে সাহায্য করতে পারি?'
        : 'Chat history cleared. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: selectedModel
    };
    setMessages([welcome]);
    try {
      localStorage.removeItem(STORAGE_CHAT_KEY);
    } catch {}
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    {
      labelBn: '📁 ফোল্ডার সাজানোর সেরা নিয়ম',
      labelEn: '📁 Best folder organization tips',
      prompt: lang === 'bn'
        ? 'আমার ১০০০ জিবি ক্লাউড ড্রাইভে কাজের ও ব্যক্তিগত ফাইলগুলো সুন্দর করে সাজাতে কী কী ফোল্ডার তৈরি করা উচিত?'
        : 'What is the best folder structure to organize work and personal files in my 1000 GB drive?'
    },
    {
      labelBn: '🔒 ভল্ট এনক্রিপশন কীভাবে কাজ করে?',
      labelEn: '🔒 How does encrypted vault work?',
      prompt: lang === 'bn'
        ? 'বাশার ড্রাইভের এনক্রিপ্টেড ভল্ট কীভাবে কাজ করে এবং ফাইলগুলো কীভাবে সুরক্ষিত থাকে?'
        : 'How does the encrypted vault work in Bashar Cloud, and how are files secured?'
    },
    {
      labelBn: '📊 আমার স্টোরেজের অবস্থা কী?',
      labelEn: '📊 What is my storage status?',
      prompt: lang === 'bn'
        ? 'আমার ড্রাইভে মোট কতটি ফাইল আছে এবং ১০০০ জিবির মধ্যে কতটুকু ব্যবহৃত ও ফাঁকা আছে?'
        : 'How many files are in my drive, and how much of my 1000 GB is used and free?'
    },
    {
      labelBn: '⚡ সব ফাইল জিপ আকারে ডাউনলোড',
      labelEn: '⚡ How to download as ZIP',
      prompt: lang === 'bn'
        ? 'ড্রাইভের সব ফাইল বা নির্দিষ্ট কিছু ফাইল একসাথে জিপ আকারে ডাউনলোড কীভাবে করব?'
        : 'How do I download multiple files together as a single ZIP archive?'
    }
  ];

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={onToggleOpen}
          aria-label="Open Gemini AI Chatbot"
          className="fixed bottom-5 right-5 z-40 group flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-slate-950 font-black shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-cyan-300/40"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-slate-950" />
            <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950"></span>
            </span>
          </div>
          <span className="text-xs tracking-tight font-extrabold hidden sm:inline">
            {lang === 'bn' ? 'Gemini এআই চ্যাট' : 'Gemini AI Chat'}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-cyan-300 font-bold">
            3.8 Flash
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`fixed z-50 transition-all duration-200 flex flex-col shadow-2xl border border-cyan-500/30 backdrop-blur-xl bg-slate-900/95 text-slate-100 ${
            isMinimized 
              ? 'bottom-5 right-5 w-80 h-14 rounded-2xl overflow-hidden'
              : 'bottom-4 right-4 sm:bottom-5 sm:right-5 w-[94vw] sm:w-[440px] h-[85vh] sm:h-[620px] max-h-[85vh] rounded-3xl overflow-hidden'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/30 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                    {lang === 'bn' ? 'বাশার ক্লাউড এআই' : 'Bashar Cloud AI'}
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-cyan-400/90 font-mono flex items-center gap-1 truncate">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  <span>{selectedModel}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Clear History */}
              {!isMinimized && (
                <button
                  onClick={handleClearHistory}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title={lang === 'bn' ? 'কথোপকথন মুছুন' : 'Clear Chat'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Minimize / Maximize */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Model Selector Bar */}
              <div className="px-3.5 py-1.5 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between text-[11px] gap-2">
                <div className="flex items-center gap-1 text-slate-400">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>{lang === 'bn' ? 'মডেল:' : 'Model:'}</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setSelectedModel('gemini-3.8-flash')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${selectedModel === 'gemini-3.8-flash' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                    title="General tasks (Recommended)"
                  >
                    3.8 Flash
                  </button>
                  <button
                    onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${selectedModel === 'gemini-3.1-flash-lite' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                    title="Fast / Lite tasks"
                  >
                    3.1 Lite
                  </button>
                </div>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs sm:text-sm">
                {messages.map((m) => {
                  const isUser = m.role === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shrink-0 mt-0.5 shadow-sm">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div
                        className={`group relative max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-md ${
                          isUser
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-medium rounded-tr-sm'
                            : 'bg-slate-800/90 border border-slate-700/70 text-slate-200 rounded-tl-sm'
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {m.text}
                        </div>

                        <div className={`flex items-center justify-between gap-3 mt-1.5 pt-1 text-[10px] opacity-70 border-t ${isUser ? 'border-black/10 text-slate-900' : 'border-slate-700/50 text-slate-400'}`}>
                          <span>{m.timestamp}</span>
                          {!isUser && (
                            <button
                              onClick={() => handleCopyMessage(m.id, m.text)}
                              className="p-0.5 hover:text-white transition"
                              title="Copy text"
                            >
                              {copiedId === m.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-2.5 justify-start animate-in fade-in">
                    <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <Bot className="w-3.5 h-3.5 animate-spin" />
                    </div>
                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5 text-xs text-slate-400 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="ml-2 font-mono text-[11px] text-cyan-300">
                        {lang === 'bn' ? 'উত্তর তৈরি হচ্ছে...' : 'Generating response...'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Error notice */}
                {errorNotice && (
                  <div className="p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span className="flex-1">{errorNotice}</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Bar */}
              <div className="px-3.5 py-2 bg-slate-950/70 border-t border-slate-800/70 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(qp.prompt)}
                    disabled={isLoading}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-white whitespace-nowrap transition cursor-pointer disabled:opacity-50"
                  >
                    {lang === 'bn' ? qp.labelBn : qp.labelEn}
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-end gap-2 shrink-0"
              >
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={lang === 'bn' ? 'একটি প্রশ্ন লিখুন বা এন্টার চাপুন...' : 'Ask a question or press enter...'}
                    disabled={isLoading}
                    className="w-full max-h-28 bg-slate-900 border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  title={lang === 'bn' ? 'পাঠান' : 'Send'}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
