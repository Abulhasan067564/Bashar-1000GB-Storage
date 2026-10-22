import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Cpu,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Code2,
  CheckCircle2,
  HelpCircle,
  HardDrive,
  ShieldCheck,
  Zap,
  Layers,
  Trash2,
  Plus,
  Edit2,
  Search,
  MessageSquare,
  ArrowLeft,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Menu,
  FileText
} from 'lucide-react';
import { StorageStats, StorageFile, UserAccount, ChatMessage, ChatSession } from '../types/storage';

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

const STORAGE_SESSIONS_KEY = 'bashar_ai_chat_sessions_v3';
const STORAGE_LEGACY_CHAT_KEY = 'bashar_drive_gemini_chat_history_v2';

// Helper component to render rich formatted markdown text
const FormattedMessage: React.FC<{ text: string; isUser: boolean }> = ({ text, isUser }) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  if (isUser) {
    return <div className="whitespace-pre-wrap break-words">{text}</div>;
  }

  // Parse code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-slate-200">
      {parts.map((part, pIdx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineEnd = part.indexOf('\n');
          const langLabel = firstLineEnd !== -1 ? part.slice(3, firstLineEnd).trim() : '';
          const codeContent = firstLineEnd !== -1 
            ? part.slice(firstLineEnd + 1, part.length - 3).trim() 
            : part.slice(3, part.length - 3).trim();

          return (
            <div key={pIdx} className="my-2.5 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 font-mono text-xs">
              <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400">
                  <Code2 className="w-3.5 h-3.5" />
                  {langLabel || 'code'}
                </span>
                <button
                  onClick={() => copyCode(codeContent, pIdx)}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                  title="Copy Code"
                >
                  {copiedCodeIdx === pIdx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>কপি করুন</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-slate-200 scrollbar-thin">
                <code>{codeContent}</code>
              </pre>
            </div>
          );
        }

        // Render normal markdown paragraphs, bullet lines, bold, headers
        const lines = part.split('\n');
        return (
          <div key={pIdx} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lIdx} className="h-1" />;

              // Headers
              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={lIdx} className="font-bold text-sm text-cyan-300 mt-2 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
                    {renderInlineFormatting(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={lIdx} className="font-extrabold text-base text-cyan-200 mt-2.5 mb-1">
                    {renderInlineFormatting(trimmed.slice(3))}
                  </h3>
                );
              }
              if (trimmed.startsWith('# ')) {
                return (
                  <h2 key={lIdx} className="font-black text-lg text-white mt-3 mb-1.5">
                    {renderInlineFormatting(trimmed.slice(2))}
                  </h2>
                );
              }

              // Bullet points
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                    <span className="flex-1">{renderInlineFormatting(trimmed.slice(2))}</span>
                  </div>
                );
              }

              // Numbered lists
              const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="font-mono text-cyan-400 text-xs font-bold mt-0.5 shrink-0">{numMatch[1]}.</span>
                    <span className="flex-1">{renderInlineFormatting(numMatch[2])}</span>
                  </div>
                );
              }

              return <p key={lIdx} className="leading-relaxed">{renderInlineFormatting(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
};

// Helper for bold, italic, and inline code formatting
function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((seg, idx) => {
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length >= 4) {
      return (
        <strong key={idx} className="font-bold text-white tracking-wide">
          {seg.slice(2, -2)}
        </strong>
      );
    }
    if (seg.startsWith('`') && seg.endsWith('`') && seg.length >= 2) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px] border border-slate-700/80">
          {seg.slice(1, -1)}
        </code>
      );
    }
    return seg;
  });
}

const createInitialSession = (lang: 'bn' | 'en'): ChatSession => {
  const now = new Date().toISOString();
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return {
    id: 'session-' + Date.now(),
    title: lang === 'bn' ? 'নতুন কথোপকথন' : 'New Chat',
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: 'msg-welcome-init',
        role: 'model',
        text: lang === 'bn'
          ? `السلام عليكم ورحمة الله وبركاته (আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহি ওয়া বারাকাতুহু) 🌸\n\nআলহামদুলিল্লাহ, **বাশার ক্লাউড এআই পেজে** আপনাকে আন্তরিক স্বাগতম!\n\nআমি আপনার ব্যক্তিগত দ্রুতগতির ইসলামিক শিষ্টাচার ও আধুনিক প্রযুক্তি সমৃদ্ধ এআই সহকারী (Gemini 3.8 Flash দ্বারা চালিত)।\n\n- 🌙 **ইসলামিক ভাষা ও শিষ্টাচার:** আমি সর্বদা সালাম দিয়ে কথা বলি এবং ইসলামিক আদব ও শালীনতার সাথে সব প্রশ্নের নিখুঁত উত্তর প্রদান করি।\n- 👑 **১০০৳ আজীবন আনলক:** ১০০ টাকা পরিশোধের পর আপনার অ্যাকাউন্ট আজীবনের জন্য আনলক হয়ে যাবে, জীবনে আর কখনো দেওয়া লাগবে না এবং অন্য যেকোনো ওয়েবসাইট বা ডিভাইসে গেলেও বলবে 'আনলক আছে'।\n- 🚀 **দ্রুত ও সঠিক উত্তর:** বিজ্ঞান, গণিত, কোডিং (React/Python/JS), ও পড়াশোনার যেকোনো প্রশ্নের সঠিক সমাধান।\n- 💾 **১০০০ জিবি ক্লাউড ড্রাইভ:** ফাইল আপলোড, ভল্ট এনক্রিপশন, সিক্রেট নেম পাসওয়ার্ড রিকভারি ও এক ক্লিকে জিপ ডাউনলোড।\n- 🗂️ **চ্যাট সেভ, নতুন চ্যাট ও রিনেম:** আপনার সকল চ্যাট জমা থাকবে, নতুন চ্যাট খুলতে পারবেন এবং ইচ্ছেমতো চ্যাটের নাম পরিবর্তন ও ডিলিট করতে পারবেন!\n\nমাশাআল্লাহ, আপনি কী জানতে চান অনুগ্রহ করে নিচে লিখে পাঠান!`
          : `Assalamu Alaikum wa Rahmatullahi wa Barakatuhu (আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহি ওয়া বারাকাতুহু) 🌟\n\nAlhamdulillah, welcome to **Bashar AI Studio**!\n\nI am your fast, polite AI Assistant powered by Gemini 3.8 Flash.\n\n- 🌙 **Islamic Etiquette:** I always greet with Salam and speak respectfully.\n- 👑 **100 Tk Lifetime Access:** Pay 100 Tk once and enjoy permanent lifetime unlock across all devices and websites.\n- 🚀 **Fast & Accurate Answers:** Science, mathematics, coding, and general knowledge.\n- 🗂️ **Saved Sessions:** Manage, rename, and delete multiple chats easily.\n\nHow may I help you today?`,
        timestamp: time,
        modelUsed: 'gemini-3.8-flash'
      }
    ]
  };
};

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
  // Chat Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (saved) {
        const parsed: ChatSession[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      // Check legacy single-session migration
      const legacySaved = localStorage.getItem(STORAGE_LEGACY_CHAT_KEY);
      if (legacySaved) {
        const legacyMsgs: ChatMessage[] = JSON.parse(legacySaved);
        if (Array.isArray(legacyMsgs) && legacyMsgs.length > 0) {
          const migrated: ChatSession = {
            id: 'session-migrated-1',
            title: lang === 'bn' ? 'সংরক্ষিত পূর্বের চ্যাট' : 'Previous Chat',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: legacyMsgs
          };
          return [migrated];
        }
      }
    } catch {}
    return [createInitialSession(lang)];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    if (sessions.length > 0) return sessions[0].id;
    return '';
  });

  // UI state
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon'>('gemini-3.8-flash');
  const [isFullScreen, setIsFullScreen] = useState(true); // Default to full-page as requested
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [searchSessionQuery, setSearchSessionQuery] = useState('');
  
  // Session rename state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Audio & Voice state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'storage' | 'security' | 'general' | 'code'>('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Active session helper
  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || sessions[0];
  }, [sessions, activeSessionId]);

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  // Ensure activeSessionId is valid
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // Focus rename input when editing
  useEffect(() => {
    if (editingSessionId) {
      setTimeout(() => renameInputRef.current?.focus(), 50);
    }
  }, [editingSessionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.messages, isOpen, isLoading]);

  // Focus input on open or session switch
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, activeSessionId]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const formatStorageMb = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  // Create New Chat
  const handleCreateNewChat = () => {
    if (speakingMsgId && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
    }
    const newSession = createInitialSession(lang);
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setIsSidebarOpenMobile(false);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Start Renaming Session
  const handleStartRename = (sessionId: string, currentTitle: string) => {
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle);
  };

  // Save Renamed Session
  const handleSaveRename = () => {
    if (!editingSessionId) return;
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingSessionId(null);
      return;
    }

    setSessions(prev =>
      prev.map(s => {
        if (s.id === editingSessionId) {
          return { ...s, title: trimmed, updatedAt: new Date().toISOString() };
        }
        return s;
      })
    );
    setEditingSessionId(null);
    setEditingTitle('');
  };

  // Cancel Renaming
  const handleCancelRename = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  // Delete an entire session
  const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (speakingMsgId && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
    }

    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== sessionId);
      if (remaining.length === 0) {
        const fresh = createInitialSession(lang);
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id);
      }
      return remaining;
    });
  };

  // Clear all sessions
  const handleClearAllSessions = () => {
    if (speakingMsgId && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
    }
    const confirmText = lang === 'bn' 
      ? 'আপনি কি নিশ্চিত যে সকল সংরক্ষিত চ্যাট মুছে ফেলতে চান?' 
      : 'Are you sure you want to delete all chat history?';
    if (!window.confirm(confirmText)) return;

    const fresh = createInitialSession(lang);
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
  };

  // Delete a single message
  const handleDeleteMessage = (msgId: string) => {
    if (speakingMsgId === msgId && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
    }
    setSessions(prev =>
      prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            messages: s.messages.filter(m => m.id !== msgId),
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      })
    );
  };

  // Text-To-Speech (TTS)
  const handleToggleSpeak = (msg: ChatMessage) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingMsgId === msg.id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanSpeech = msg.text
      .replace(/```[\s\S]*?```/g, 'কোড ব্লক বাদ দেওয়া হয়েছে')
      .replace(/[*#`_>-]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    const isBn = /[\u0980-\u09FF]/.test(cleanSpeech) || lang === 'bn';
    utterance.lang = isBn ? 'bn-BD' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msg.id);
    window.speechSynthesis.speak(utterance);
  };

  // Speech-To-Text (STT) Voice Recognition
  const handleToggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(lang === 'bn' ? 'আপনার ব্রাউজারে ভয়েস রিকগনিশন সমর্থিত নয়।' : 'Voice recognition is not supported in this browser.');
      return;
    }

    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition error:', e);
      setIsListening(false);
    }
  };

  // Send message
  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setErrorNotice(null);
    setInput('');

    if (speakingMsgId && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
    }

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Auto-update session title on first user question if it still has the default title
    const isDefaultTitle = activeSession.title === (lang === 'bn' ? 'নতুন কথোপকথন' : 'New Chat');
    const autoTitle = isDefaultTitle 
      ? (query.length > 28 ? query.slice(0, 28) + '...' : query) 
      : activeSession.title;

    const currentMsgs = activeSession.messages;
    const newHistory = [...currentMsgs, userMsg];

    setSessions(prev =>
      prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            title: autoTitle,
            updatedAt: new Date().toISOString(),
            messages: newHistory
          };
        }
        return s;
      })
    );

    setIsLoading(true);

    try {
      // Build active drive context for intelligent assistance
      const activeFilesCount = files.filter(f => !f.inTrash).length;
      const trashCount = files.filter(f => f.inTrash).length;
      const starredCount = files.filter(f => f.isStarred).length;
      const vaultCount = files.filter(f => f.isEncrypted).length;
      const usedFormatted = stats ? formatStorageMb(stats.usedBytes) : '0 MB';

      const driveContext = {
        userName: currentUser ? currentUser.name : 'Bashar User',
        userIdentifier: currentUser ? currentUser.emailOrPhone : 'None',
        fileCount: activeFilesCount,
        trashCount,
        starredCount,
        vaultCount,
        usedStorage: usedFormatted,
        totalStorage: '1000 GB',
        currentFolderName: currentFolder ? currentFolder.name : 'Root Drive',
        recentFiles: files.slice(0, 6).map(f => `${f.name} (${f.category})`).join(', ')
      };

      const systemInstruction = `You are Bashar Cloud Assistant (বাশার ক্লাউড এআই অ্যাসিস্ট্যান্ট), an advanced, polite, friendly, and comprehensive AI built into Bashar 1000GB Cloud Storage.

MANDATORY ISLAMIC MANNERS & GREETING RULES:
1. ALWAYS greet the user with the complete Islamic Salam: "আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহি ওয়া বারাকাতুহু" (السلام عليكم ورحمة الله وبركاته).
2. STRICT PROHIBITION: NEVER use or say "নমস্কার" (Nomoshkar) under ANY circumstance.
3. ALWAYS speak using polite Islamic language, modesty, and Islamic phrasing (আলহামদুলিল্লাহ, মাশাআল্লাহ, ইনশাআল্লাহ, জাযাকাল্লাহু খাইরান, সুবহানাল্লাহ).
4. If asked about subscription or unlocking: clearly confirm that paying 100 Tk once unlocks the account for lifetime ("১০০ টাকা দিলে জীবনের জন্য আর দেওয়া লাগবে না"), and it permanently stays unlocked across all websites and devices ("অন্য ওয়েবসাইটে গিয়েও দেখালে বলবে আনলক আছে").

Your capabilities:
1. Answer ANY question asked by the user beautifully, accurately, and thoroughly. This includes general knowledge, coding, math, writing, translation, lifestyle, study advice, and technical explanations.
2. Deeply understand Bashar 1000GB Cloud Storage: 1000 GB quota, instant upload, folder structure, batch zip downloads, AES client-side encryption vault, secret name password recovery, and recycle bin.
3. Language support: You are fluent in Bengali (বাংলা) and English. If the user writes in Bengali or has a Bengali query, answer warmly, politely, and naturally in fluent Bengali with rich markdown formatting (bullet points, clear headers, bold titles).
4. Structure your responses cleanly with markdown. Never give empty or abruptly short responses.`;

      // Filter history so conversation sent to server starts with user and alternates
      const cleanMessagesPayload = newHistory
        .filter(m => m.text && m.text.trim().length > 0)
        .map(m => ({ role: m.role, text: m.text }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: cleanMessagesPayload,
          model: selectedModel,
          systemInstruction,
          driveContext
        })
      });

      const data = await response.json();

      if (!response.ok && !data.reply) {
        throw new Error(data.error || 'Failed to get response.');
      }

      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        role: 'model',
        text: data.reply || (lang === 'bn' ? 'وعليكم السلام ورحمة الله وبركاته। কোনো উত্তর পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Assalamu Alaikum. No answer generated. Please try again.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.model || selectedModel,
        isFallback: data.model === 'bashar-ai-engine'
      };

      setSessions(prev =>
        prev.map(s => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              updatedAt: new Date().toISOString(),
              messages: [...s.messages, botMsg]
            };
          }
          return s;
        })
      );
    } catch (err: any) {
      console.error('Chatbot error:', err);
      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        role: 'model',
        text: lang === 'bn'
          ? `وعليكم السلام ورحمة الله وبركاته (ওয়ালাইকুমুস সালাম ওয়া রাহমাতুল্লাহি ওয়া বারাকাতুহু) 🌸\n\nআলহামদুলিল্লাহ, "${query}" বিষয়ে বাশার ক্লাউড এআই আপনার সেবায় প্রস্তুত। ১০০০ জিবি স্টোরেজ, এনক্রিপশন ভল্ট, গাণিতিক সমাধান বা কোডিং যেকোনো বিষয়ে নিখুঁত উত্তর দিতে আমি সক্ষম। আপনার প্রশ্নটি অনুগ্রহ করে আরো বিস্তারিত লিখুন!`
          : `Assalamu Alaikum wa Rahmatullahi wa Barakatuhu (আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহি ওয়া বারাকাতুহু) 🌟\n\nAlhamdulillah, regarding "${query}": I am Bashar Cloud AI, powered to help with 1000 GB storage management, secure vault, coding, and general knowledge. Please provide more details if needed!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'bashar-ai-engine',
        isFallback: true
      };

      setSessions(prev =>
        prev.map(s => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              updatedAt: new Date().toISOString(),
              messages: [...s.messages, botMsg]
            };
          }
          return s;
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Categorized quick prompts
  const quickPrompts = [
    {
      category: 'storage',
      icon: HardDrive,
      labelBn: '📊 স্টোরেজ কতটুকু ফাঁকা?',
      labelEn: '📊 Storage space overview',
      prompt: lang === 'bn'
        ? 'আমার বাশার ক্লাউড স্টোরেজে মোট কতটুকু জায়গা ব্যবহৃত হয়েছে এবং ১০০০ জিবির মধ্যে কতটুকু খালি আছে?'
        : 'How much of my 1000 GB cloud storage is currently used, and how much is free?'
    },
    {
      category: 'storage',
      icon: Layers,
      labelBn: '📁 ফোল্ডার সাজানোর নিয়ম',
      labelEn: '📁 Folder organization tips',
      prompt: lang === 'bn'
        ? '১০০০ জিবি ক্লাউড ড্রাইভে কাজের ও ব্যক্তিগত ফাইলগুলো সুন্দর ও পরিপাটি করে সাজানোর সেরা উপায় কী?'
        : 'What is the best way to structure and organize work and personal folders in my 1000 GB drive?'
    },
    {
      category: 'security',
      icon: ShieldCheck,
      labelBn: '🔒 ভল্ট এনক্রিপশন কীভাবে কাজ করে?',
      labelEn: '🔒 How does encrypted vault work?',
      prompt: lang === 'bn'
        ? 'বাশার ড্রাইভের এনক্রিপ্টেড ভল্ট কীভাবে কাজ করে এবং ফাইলগুলো কীভাবে সুরক্ষিত থাকে?'
        : 'How does the encrypted vault work in Bashar Cloud, and how are files secured?'
    },
    {
      category: 'security',
      icon: ShieldCheck,
      labelBn: '🔑 সিক্রেট নেম দিয়ে রিকভারি',
      labelEn: '🔑 Secret Name recovery',
      prompt: lang === 'bn'
        ? 'পাসওয়ার্ড ভুলে গেলে সিক্রেট নেম দিয়ে কীভাবে দ্রুত অ্যাকাউন্ট রিকভার করতে হয়?'
        : 'How does the Secret Name recovery work to restore my account if I forget my password?'
    },
    {
      category: 'code',
      icon: Code2,
      labelBn: '💻 React ও TypeScript টিপস',
      labelEn: '💻 React & TypeScript tips',
      prompt: lang === 'bn'
        ? 'React ও TypeScript দিয়ে একটি আধুনিক ও দ্রুতগতির ওয়েবসাইটের ফ্রন্টএন্ড ডিজাইন করার সেরা অভ্যাসগুলো কী কী?'
        : 'What are the best practices for building a responsive and clean frontend in React and TypeScript?'
    },
    {
      category: 'general',
      icon: HelpCircle,
      labelBn: '✨ দৈনন্দিন প্রোডাক্টিভিটি টিপস',
      labelEn: '✨ Daily productivity tips',
      prompt: lang === 'bn'
        ? 'প্রতিদিনের পড়াশোনা ও কাজের চাপ সামলে সময় সঠিকভাবে কাজে লাগানোর ৫টি সেরা টিপস দিন।'
        : 'Give me 5 actionable daily tips to manage time effectively and boost study/work productivity.'
    }
  ];

  const filteredPrompts = activeCategory === 'all' 
    ? quickPrompts 
    : quickPrompts.filter(p => p.category === activeCategory);

  const filteredSessions = useMemo(() => {
    if (!searchSessionQuery.trim()) return sessions;
    const q = searchSessionQuery.toLowerCase();
    return sessions.filter(s => s.title.toLowerCase().includes(q));
  }, [sessions, searchSessionQuery]);

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={onToggleOpen}
          aria-label="Open Bashar AI Studio"
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
            {lang === 'bn' ? 'বাশার এআই পেজ' : 'Bashar AI Studio'}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-cyan-300 font-bold">
            3.8 Flash
          </span>
        </button>
      )}

      {/* Dedicated AI Page / Full Workspace Experience */}
      {isOpen && (
        <div 
          className={`fixed z-50 transition-all duration-200 flex flex-col shadow-2xl border border-cyan-500/30 backdrop-blur-2xl bg-slate-950 text-slate-100 ${
            isFullScreen
              ? 'inset-0 w-screen h-screen'
              : 'bottom-3 right-3 sm:bottom-5 sm:right-5 w-[96vw] sm:w-[680px] h-[88vh] sm:h-[720px] max-h-[94vh] rounded-3xl overflow-hidden'
          }`}
        >
          {/* Top Bar for Dedicated Page View */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {/* Back to Drive Button */}
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold transition cursor-pointer shadow-sm"
                title={lang === 'bn' ? 'ড্রাইভে ফিরে যান' : 'Back to Drive'}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {lang === 'bn' ? 'ড্রাইভে ফিরুন' : 'Back to Drive'}
                </span>
              </button>

              {/* Mobile Sidebar Toggle */}
              <button
                onClick={() => setIsSidebarOpenMobile(prev => !prev)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 md:hidden cursor-pointer"
                title={lang === 'bn' ? 'চ্যাট হিস্ট্রি দেখুন' : 'Toggle Chat History'}
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 truncate">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/30 shrink-0 font-black">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black text-white truncate">
                      {lang === 'bn' ? 'বাশার এআই স্টুডিও' : 'Bashar AI Studio'}
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold hidden sm:inline">Online</span>
                  </div>
                  <p className="text-[10px] text-cyan-400/90 font-mono flex items-center gap-1.5 truncate">
                    <Cpu className="w-3 h-3 text-cyan-400" />
                    <span>{selectedModel}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">{lang === 'bn' ? 'সুপারফাস্ট ও নির্ভুল উত্তর' : 'Fast & Accurate Q&A'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Header Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* "+ নতুন চ্যাট" Button */}
              <button
                onClick={handleCreateNewChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black shadow-md shadow-cyan-500/20 transition cursor-pointer"
                title={lang === 'bn' ? 'নতুন চ্যাট শুরু করুন' : 'Start New Chat'}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">
                  {lang === 'bn' ? 'নতুন চ্যাট' : 'New Chat'}
                </span>
              </button>

              {/* Fullscreen / Dock Toggle */}
              <button
                onClick={() => setIsFullScreen(prev => !prev)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition cursor-pointer hidden sm:block"
                title={isFullScreen ? (lang === 'bn' ? 'ছোট উইন্ডো করুন' : 'Dock Window') : (lang === 'bn' ? 'পুরো পেজ করুন' : 'Full Page')}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-slate-800 transition cursor-pointer"
                title={lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Workspace: Left Sessions Sidebar + Right Chat Panel */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Left Sessions Sidebar */}
            <aside 
              className={`
                w-72 sm:w-80 bg-slate-950 border-r border-slate-800/90 flex flex-col shrink-0
                absolute md:relative inset-y-0 left-0 z-30 transition-transform duration-200
                ${isSidebarOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
              `}
            >
              {/* New Chat & Search in Sidebar */}
              <div className="p-3.5 border-b border-slate-800/80 space-y-2.5">
                <button
                  onClick={handleCreateNewChat}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/20 via-sky-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 font-bold text-xs border border-cyan-500/40 shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <span>{lang === 'bn' ? '+ নতুন চ্যাট খুলুন' : '+ New Conversation'}</span>
                </button>

                {/* Search Sessions */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchSessionQuery}
                    onChange={e => setSearchSessionQuery(e.target.value)}
                    placeholder={lang === 'bn' ? 'সংরক্ষিত চ্যাট খুঁজুন...' : 'Search saved chats...'}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/80 transition"
                  />
                  {searchSessionQuery && (
                    <button
                      onClick={() => setSearchSessionQuery('')}
                      className="absolute right-2.5 top-2 text-xs text-slate-500 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Sessions List (চ্যাট জমা থাকবে) */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>{lang === 'bn' ? 'জমা থাকা চ্যাটসমূহ' : 'Saved Chats'}</span>
                  <span className="font-mono text-cyan-400 text-[10px]">{sessions.length}</span>
                </div>

                {filteredSessions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    {lang === 'bn' ? 'কোনো চ্যাট পাওয়া যায়নি' : 'No chats found'}
                  </div>
                ) : (
                  filteredSessions.map(session => {
                    const isActive = session.id === activeSession.id;
                    const isEditingThis = editingSessionId === session.id;

                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          if (!isEditingThis) {
                            setActiveSessionId(session.id);
                            setIsSidebarOpenMobile(false);
                          }
                        }}
                        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition cursor-pointer border ${
                          isActive
                            ? 'bg-gradient-to-r from-cyan-950/60 to-slate-900 text-cyan-300 border-cyan-500/40 shadow-sm'
                            : 'text-slate-400 hover:bg-slate-900/70 hover:text-slate-200 border-transparent hover:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                          <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                          
                          {isEditingThis ? (
                            <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                              <input
                                ref={renameInputRef}
                                type="text"
                                value={editingTitle}
                                onChange={e => setEditingTitle(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveRename();
                                  if (e.key === 'Escape') handleCancelRename();
                                }}
                                className="w-full bg-slate-950 border border-cyan-400 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              />
                              <button
                                onClick={handleSaveRename}
                                className="p-1 rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition"
                                title="Save"
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                              </button>
                              <button
                                onClick={handleCancelRename}
                                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white transition"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="truncate flex-1">
                              <p className={`font-semibold truncate ${isActive ? 'text-cyan-200' : 'text-slate-300'}`}>
                                {session.title}
                              </p>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {session.messages.length} {lang === 'bn' ? 'টি মেসেজ' : 'msgs'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons (Rename & Delete) */}
                        {!isEditingThis && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Rename button (চ্যাট এর নাম পরিবর্তন করতে পারবে) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartRename(session.id, session.title);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition cursor-pointer"
                              title={lang === 'bn' ? 'নাম পরিবর্তন করুন' : 'Rename Chat'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete button (ডিলিট করতে পারবে) */}
                            <button
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                              title={lang === 'bn' ? 'চ্যাট ডিলিট করুন' : 'Delete Chat'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sidebar Footer Controls */}
              <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                    <span>১০০০ GB ড্রাইভ সংযুক্ত</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">সক্রিয়</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAllSessions}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 text-slate-400 hover:text-rose-300 text-[11px] font-semibold transition cursor-pointer"
                    title={lang === 'bn' ? 'সকল সংরক্ষিত চ্যাট মুছুন' : 'Clear All Chats'}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{lang === 'bn' ? 'সব মুছুন' : 'Clear All'}</span>
                  </button>

                  <button
                    onClick={onClose}
                    className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold transition cursor-pointer"
                    title={lang === 'bn' ? 'ড্রাইভে ফিরুন' : 'Back'}
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>{lang === 'bn' ? 'ড্রাইভ' : 'Drive'}</span>
                  </button>
                </div>
              </div>
            </aside>

            {/* Right Chat Panel */}
            <main className="flex-1 flex flex-col bg-slate-950 min-w-0">
              {/* Active Session Sub-Header (Editable Title + Model Selector) */}
              <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-slate-400 text-[11px] hidden sm:inline">
                    {lang === 'bn' ? 'বর্তমান চ্যাট:' : 'Current Chat:'}
                  </span>
                  
                  {/* Inline Editable Chat Title */}
                  {editingSessionId === activeSession.id ? (
                    <div className="flex items-center gap-1 flex-1 max-w-sm">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveRename();
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                        className="bg-slate-950 border border-cyan-400 rounded px-2 py-0.5 text-xs text-white focus:outline-none w-full"
                        autoFocus
                      />
                      <button onClick={handleSaveRename} className="p-1 rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </button>
                      <button onClick={handleCancelRename} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartRename(activeSession.id, activeSession.title)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-800/80 text-white font-bold truncate max-w-xs transition text-left group cursor-pointer"
                      title={lang === 'bn' ? 'নাম পরিবর্তন করতে ক্লিক করুন' : 'Click to rename chat'}
                    >
                      <span className="truncate">{activeSession.title}</span>
                      <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-cyan-400 shrink-0" />
                    </button>
                  )}
                </div>

                {/* Model Selector Pill */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setSelectedModel('gemini-3.8-flash')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        selectedModel === 'gemini-3.8-flash'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Gemini 3.8 Flash (Superfast & Accurate)"
                    >
                      3.8 Flash
                    </button>
                    <button
                      onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        selectedModel === 'gemini-3.1-flash-lite'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Gemini 3.1 Flash Lite"
                    >
                      3.1 Lite
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm scrollbar-thin">
                <div className="max-w-4xl mx-auto w-full space-y-4">
                  {activeSession.messages.map(m => {
                    const isUser = m.role === 'user';
                    const isSpeakingThis = speakingMsgId === m.id;

                    return (
                      <div
                        key={m.id}
                        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} group/msg`}
                      >
                        {!isUser && (
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shrink-0 mt-0.5 shadow-md shadow-cyan-500/20 font-black">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}

                        <div
                          className={`group relative max-w-[88%] sm:max-w-[82%] rounded-2xl px-4 py-3 leading-relaxed shadow-lg ${
                            isUser
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-medium rounded-tr-sm'
                              : 'bg-slate-900 border border-slate-800/90 text-slate-200 rounded-tl-sm'
                          }`}
                        >
                          <FormattedMessage text={m.text} isUser={isUser} />

                          {/* Message Footer: Timestamp, Model, TTS Speak, Copy, Delete */}
                          <div className={`flex items-center justify-between gap-3 mt-2 pt-1.5 text-[10px] opacity-80 border-t ${
                            isUser ? 'border-black/10 text-slate-900' : 'border-slate-800 text-slate-400'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span>{m.timestamp}</span>
                              {!isUser && m.modelUsed && (
                                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-950/60 text-cyan-400 border border-cyan-500/20">
                                  {m.modelUsed === 'bashar-ai-engine' ? 'Fast AI Engine' : m.modelUsed}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {!isUser && (
                                <button
                                  onClick={() => handleToggleSpeak(m)}
                                  className={`p-1 rounded-lg transition hover:text-white cursor-pointer ${
                                    isSpeakingThis ? 'text-cyan-400 bg-cyan-950 ring-1 ring-cyan-400' : 'text-slate-400 hover:bg-slate-800'
                                  }`}
                                  title={isSpeakingThis ? (lang === 'bn' ? 'ভয়েস বন্ধ করুন' : 'Stop voice') : (lang === 'bn' ? 'ভয়েস শুনুন' : 'Listen voice')}
                                >
                                  {isSpeakingThis ? (
                                    <VolumeX className="w-3.5 h-3.5 animate-pulse text-cyan-300" />
                                  ) : (
                                    <Volume2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {/* Copy message */}
                              <button
                                onClick={() => handleCopyMessage(m.id, m.text)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                                title={lang === 'bn' ? 'মেসেজ কপি করুন' : 'Copy message'}
                              >
                                {copiedId === m.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Delete this single message */}
                              <button
                                onClick={() => handleDeleteMessage(m.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                                title={lang === 'bn' ? 'এই মেসেজটি ডিলিট করুন' : 'Delete message'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {isUser && (
                          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 shadow-sm font-bold text-xs">
                            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Loading indicator */}
                {isLoading && (
                  <div className="max-w-4xl mx-auto w-full flex gap-3 justify-start animate-in fade-in">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <Bot className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-xs text-slate-300 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="ml-1 font-mono text-[11px] text-cyan-300 font-semibold">
                        {lang === 'bn' ? 'Gemini 3.8 Flash উত্তর তৈরি করছে...' : 'Gemini 3.8 Flash is thinking...'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Error notice */}
                {errorNotice && (
                  <div className="max-w-4xl mx-auto w-full p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span className="flex-1">{errorNotice}</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Starters */}
              <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 flex flex-col gap-2 shrink-0">
                <div className="max-w-4xl mx-auto w-full space-y-1.5">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 text-[10px]">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                        activeCategory === 'all'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lang === 'bn' ? 'সকল বিষয়' : 'All Topics'}
                    </button>
                    <button
                      onClick={() => setActiveCategory('storage')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                        activeCategory === 'storage'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lang === 'bn' ? '১০০০ জিবি ড্রাইভ' : '1000 GB Drive'}
                    </button>
                    <button
                      onClick={() => setActiveCategory('security')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                        activeCategory === 'security'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lang === 'bn' ? 'ভল্ট ও রিকভারি' : 'Vault & Recovery'}
                    </button>
                    <button
                      onClick={() => setActiveCategory('code')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                        activeCategory === 'code'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lang === 'bn' ? 'কোডিং ও প্রোগ্রামিং' : 'Coding'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                    {filteredPrompts.map((qp, idx) => {
                      const IconComponent = qp.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSend(qp.prompt)}
                          disabled={isLoading}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-white whitespace-nowrap transition cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                          <IconComponent className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{lang === 'bn' ? qp.labelBn : qp.labelEn}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Input Bar with Voice Input (Mic) and Fast Send Button */}
              <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="max-w-4xl mx-auto w-full flex items-end gap-2.5"
                >
                  <div className="flex-1 relative flex items-center">
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
                      placeholder={lang === 'bn' ? 'বাশার এআই-কে যেকোনো প্রশ্ন করুন (Enter চাপুন)...' : 'Ask Bashar AI anything (Press Enter)...'}
                      disabled={isLoading}
                      className="w-full max-h-36 bg-slate-900 border border-slate-700/80 rounded-2xl pl-4 pr-12 py-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none disabled:opacity-50"
                    />

                    {/* Mic Button */}
                    <button
                      type="button"
                      onClick={handleToggleVoiceInput}
                      className={`absolute right-3 p-1.5 rounded-xl transition cursor-pointer ${
                        isListening 
                          ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/40' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title={isListening ? (lang === 'bn' ? 'শুনছি... বন্ধ করতে ক্লিক করুন' : 'Listening... click to stop') : (lang === 'bn' ? 'ভয়েস ইনপুট' : 'Voice input')}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-3 sm:px-4 sm:py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black transition shadow-lg shadow-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 flex items-center gap-1.5"
                    title={lang === 'bn' ? 'পাঠান' : 'Send'}
                  >
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span className="hidden sm:inline text-xs font-bold">
                      {lang === 'bn' ? 'পাঠান' : 'Send'}
                    </span>
                  </button>
                </form>
              </div>
            </main>
          </div>
        </div>
      )}
    </>
  );
};
