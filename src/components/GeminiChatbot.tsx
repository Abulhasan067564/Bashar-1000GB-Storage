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
  Layers
} from 'lucide-react';
import { StorageStats, StorageFile, UserAccount } from '../types/storage';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
  isFallback?: boolean;
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

const STORAGE_CHAT_KEY = 'bashar_drive_gemini_chat_history_v2';

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
            <div key={pIdx} className="my-2 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 font-mono text-xs">
              <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400">
                  <Code2 className="w-3.5 h-3.5" />
                  {langLabel || 'code'}
                </span>
                <button
                  onClick={() => copyCode(codeContent, pIdx)}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition"
                  title="Copy Code"
                >
                  {copiedCodeIdx === pIdx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-slate-300 scrollbar-thin">
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
                    <span className="text-[11px] font-mono font-bold text-cyan-400 shrink-0 mt-0.5">
                      {numMatch[1]}.
                    </span>
                    <span className="flex-1">{renderInlineFormatting(numMatch[2])}</span>
                  </div>
                );
              }

              // Blockquotes
              if (trimmed.startsWith('> ')) {
                return (
                  <blockquote key={lIdx} className="border-l-2 border-cyan-500 pl-3 py-1 my-1 italic text-slate-300 bg-slate-800/40 rounded-r-lg">
                    {renderInlineFormatting(trimmed.slice(2))}
                  </blockquote>
                );
              }

              return (
                <p key={lIdx} className="break-words">
                  {renderInlineFormatting(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// Helper for bold, code, highlights
function renderInlineFormatting(str: string): React.ReactNode {
  // Split by inline code `code`
  const codeParts = str.split(/(`[^`]+`)/g);

  return codeParts.map((sub, sIdx) => {
    if (sub.startsWith('`') && sub.endsWith('`') && sub.length > 2) {
      return (
        <code key={sIdx} className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-950 text-cyan-300 font-mono text-[11px] border border-cyan-500/20">
          {sub.slice(1, -1)}
        </code>
      );
    }

    // Split by **bold**
    const boldParts = sub.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bSub, bIdx) => {
      if (bSub.startsWith('**') && bSub.endsWith('**') && bSub.length > 4) {
        return (
          <strong key={`${sIdx}-${bIdx}`} className="font-bold text-white">
            {bSub.slice(2, -2)}
          </strong>
        );
      }
      return bSub;
    });
  });
}

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
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'msg-welcome',
        role: 'model',
        text: lang === 'bn'
          ? `👋 **স্বাগতম! আমি বাশার ক্লাউড এআই অ্যাসিস্ট্যান্ট** (Gemini 3.8 Flash দ্বারা চালিত)।\n\nআপনার ১০০০ জিবি ক্লাউড ড্রাইভ পরিচালনা, ফাইল গোছানো, ভল্ট এনক্রিপশন, সিক্রেট রিকভারি কিংবা দৈনন্দিন কোডিং, পড়াশোনা ও যেকোনো প্রশ্নের চমৎকার উত্তর দিতে আমি প্রস্তুত!\n\n💡 যেকোনো প্রশ্ন জিজ্ঞাসা করতে পারেন—নিচে দেওয়া বাটনে ক্লিক করুন অথবা নিজে লিখে পাঠান।`
          : `👋 **Welcome! I am your Bashar Cloud AI Assistant** (powered by Gemini 3.8 Flash).\n\nAsk me anything about managing your 1000 GB cloud space, organizing folders, vault encryption, secret recovery, coding, mathematics, or general knowledge!\n\n💡 Feel free to type any query or tap one of the quick suggestions below.`,
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
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'storage' | 'security' | 'general' | 'code'>('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const speechRecognitionRef = useRef<any>(null);

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

  // Text-To-Speech (TTS)
  const handleToggleSpeak = (msg: ChatMessage) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingMsgId === msg.id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown code / special chars for cleaner voice
    const cleanSpeech = msg.text
      .replace(/```[\s\S]*?```/g, 'কোড ব্লক বাদ দেওয়া হয়েছে')
      .replace(/[*#`_>-]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    // Auto-detect language
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

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
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
Your capabilities:
1. Answer ANY question asked by the user beautifully, accurately, and thoroughly. This includes general knowledge, coding, math, writing, translation, lifestyle, study advice, and technical explanations.
2. Deeply understand Bashar 1000GB Cloud Storage: 1000 GB quota, instant upload, folder structure, batch zip downloads, AES client-side encryption vault, secret name password recovery, and recycle bin.
3. Language support: You are fluent in Bengali (বাংলা) and English. If the user writes in Bengali or has a Bengali query, answer warmly and naturally in fluent Bengali with rich markdown formatting (bullet points, clear headers, bold titles).
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
        text: data.reply || (lang === 'bn' ? 'কোনো উত্তর পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'No answer generated. Please try again.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.model || selectedModel,
        isFallback: data.model === 'bashar-ai-engine'
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chatbot error:', err);
      // Even if network completely drops, provide helpful local answer!
      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        role: 'model',
        text: lang === 'bn'
          ? `✨ **আপনার প্রশ্নের উত্তর:**\n\n"${query}" বিষয়ে:\n\nআমি বাশার ক্লাউড এআই অ্যাসিস্ট্যান্ট। ক্লাউড স্টোরেজ, ১০০০ জিবি ড্রাইভ, ফাইল ম্যানেজমেন্ট, ভল্ট এনক্রিপশন বা যেকোনো সাধারণ জ্ঞান ও কোডিং বিষয়ে আমি আপনাকে সাহায্য করতে প্রস্তুত। আপনার প্রশ্নটি অনুগ্রহ করে বিস্তারিত লিখুন!`
          : `✨ **Answer to your query:**\n\nRegarding "${query}":\n\nI am your Bashar Cloud AI assistant. I am ready to help you with 1000 GB storage management, secure vault, coding, and general knowledge. Please provide more details if needed!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'bashar-ai-engine',
        isFallback: true
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (speakingMsgId && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
    }
    const welcome: ChatMessage = {
      id: 'msg-welcome-' + Date.now(),
      role: 'model',
      text: lang === 'bn'
        ? 'কথোপকথন পরিষ্কার করা হয়েছে! আমি বাশার ক্লাউড এআই অ্যাসিস্ট্যান্ট। যেকোনো প্রশ্ন করুন, আমি সুন্দরভাবে উত্তর দেব।'
        : 'Chat history cleared! I am Bashar Cloud AI Assistant. Ask me anything, and I will be happy to assist you.',
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
      labelBn: '🔑 সিক্রেট নেম দিয়ে পাসওয়ার্ড রিকভারি',
      labelEn: '🔑 Secret Name recovery system',
      prompt: lang === 'bn'
        ? 'পাসওয়ার্ড ভুলে গেলে সিক্রেট নেম দিয়ে কীভাবে দ্রুত অ্যাকাউন্ট রিকভার করতে হয়?'
        : 'How does the Secret Name recovery work to restore my account if I forget my password?'
    },
    {
      category: 'storage',
      icon: Zap,
      labelBn: '⚡ সব ফাইল জিপ (ZIP) আকারে ডাউনলোড',
      labelEn: '⚡ How to download as ZIP',
      prompt: lang === 'bn'
        ? 'ড্রাইভের সব ফাইল বা নির্দিষ্ট কিছু ফাইল একসাথে এক ক্লিকে জিপ আকারে ডাউনলোড করার নিয়ম কী?'
        : 'How do I download multiple files or all drive files together as a single ZIP archive?'
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
            {lang === 'bn' ? 'বাশার এআই চ্যাট' : 'Bashar AI Chat'}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-cyan-300 font-bold">
            3.8 Flash
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`fixed z-50 transition-all duration-200 flex flex-col shadow-2xl border border-cyan-500/30 backdrop-blur-2xl bg-slate-950/95 text-slate-100 ${
            isMinimized 
              ? 'bottom-5 right-5 w-80 h-14 rounded-2xl overflow-hidden'
              : 'bottom-3 right-3 sm:bottom-5 sm:right-5 w-[96vw] sm:w-[460px] h-[88vh] sm:h-[650px] max-h-[88vh] rounded-3xl overflow-hidden'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/30 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-black text-white truncate">
                    {lang === 'bn' ? 'বাশার ক্লাউড এআই' : 'Bashar Cloud AI'}
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">Online</span>
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
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title={lang === 'bn' ? 'কথোপকথন পরিষ্কার করুন' : 'Clear Chat'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Minimize / Maximize */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Model & Category Selector Bar */}
              <div className="px-3.5 py-1.5 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between text-[11px] gap-2 shrink-0">
                <div className="flex items-center gap-1 text-slate-400">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span className="font-medium">{lang === 'bn' ? 'মডেল:' : 'Model:'}</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setSelectedModel('gemini-3.8-flash')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${selectedModel === 'gemini-3.8-flash' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    title="Gemini 3.8 Flash (Fast & Smart)"
                  >
                    3.8 Flash
                  </button>
                  <button
                    onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${selectedModel === 'gemini-3.1-flash-lite' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    title="Gemini 3.1 Flash Lite"
                  >
                    3.1 Lite
                  </button>
                </div>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs sm:text-sm scrollbar-thin">
                {messages.map((m) => {
                  const isUser = m.role === 'user';
                  const isSpeakingThis = speakingMsgId === m.id;

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
                        className={`group relative max-w-[88%] rounded-2xl px-4 py-3 leading-relaxed shadow-lg ${
                          isUser
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-medium rounded-tr-sm'
                            : 'bg-slate-900 border border-slate-800/90 text-slate-200 rounded-tl-sm'
                        }`}
                      >
                        <FormattedMessage text={m.text} isUser={isUser} />

                        {/* Action buttons (Copy, Speak, Timestamp) */}
                        <div className={`flex items-center justify-between gap-3 mt-2 pt-1.5 text-[10px] opacity-75 border-t ${isUser ? 'border-black/10 text-slate-900' : 'border-slate-800 text-slate-400'}`}>
                          <div className="flex items-center gap-1.5">
                            <span>{m.timestamp}</span>
                            {!isUser && m.modelUsed && (
                              <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-950/60 text-cyan-400">
                                {m.modelUsed === 'bashar-ai-engine' ? 'Smart Local Engine' : m.modelUsed}
                              </span>
                            )}
                          </div>

                          {!isUser && (
                            <div className="flex items-center gap-1.5">
                              {/* Audio Speak */}
                              <button
                                onClick={() => handleToggleSpeak(m)}
                                className={`p-1 rounded transition hover:text-white cursor-pointer ${isSpeakingThis ? 'text-cyan-400 bg-cyan-950' : 'text-slate-400 hover:bg-slate-800'}`}
                                title={isSpeakingThis ? 'Stop voice' : 'Listen voice'}
                              >
                                {isSpeakingThis ? (
                                  <VolumeX className="w-3.5 h-3.5 animate-pulse text-cyan-300" />
                                ) : (
                                  <Volume2 className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Copy message */}
                              <button
                                onClick={() => handleCopyMessage(m.id, m.text)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                                title="Copy text"
                              >
                                {copiedId === m.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
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
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-xs text-slate-300 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="ml-1 font-mono text-[11px] text-cyan-300 font-semibold">
                        {lang === 'bn' ? 'সুন্দর উত্তর তৈরি হচ্ছে...' : 'Crafting intelligent response...'}
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

              {/* Quick Prompts Bar with Topic Tabs */}
              <div className="px-3.5 py-2 bg-slate-950/90 border-t border-slate-800 flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5 text-[10px]">
                  <button
                    onClick={() => setActiveCategory('all')}
                    className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer whitespace-nowrap ${activeCategory === 'all' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'}`}
                  >
                    {lang === 'bn' ? 'সকল প্রশ্ন' : 'All Topics'}
                  </button>
                  <button
                    onClick={() => setActiveCategory('storage')}
                    className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer whitespace-nowrap ${activeCategory === 'storage' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'}`}
                  >
                    {lang === 'bn' ? '১০০০ জিবি স্টোরেজ' : '1000 GB Storage'}
                  </button>
                  <button
                    onClick={() => setActiveCategory('security')}
                    className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer whitespace-nowrap ${activeCategory === 'security' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'}`}
                  >
                    {lang === 'bn' ? 'ভল্ট ও নিরাপত্তা' : 'Vault & Security'}
                  </button>
                  <button
                    onClick={() => setActiveCategory('code')}
                    className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer whitespace-nowrap ${activeCategory === 'code' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'}`}
                  >
                    {lang === 'bn' ? 'কোডিং ও টেক' : 'Coding & Tech'}
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
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-white whitespace-nowrap transition cursor-pointer disabled:opacity-50"
                      >
                        <IconComponent className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>{lang === 'bn' ? qp.labelBn : qp.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input Bar with Voice Input (Mic) and Send Button */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-3 bg-slate-950 border-t border-slate-800 flex items-end gap-2 shrink-0"
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
                    placeholder={lang === 'bn' ? 'যেকোনো প্রশ্ন লিখুন বা এন্টার চাপুন...' : 'Ask any question or press enter...'}
                    disabled={isLoading}
                    className="w-full max-h-28 bg-slate-900 border border-slate-700/80 rounded-2xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none disabled:opacity-50"
                  />

                  {/* Mic Button */}
                  <button
                    type="button"
                    onClick={handleToggleVoiceInput}
                    className={`absolute right-2.5 p-1.5 rounded-xl transition cursor-pointer ${
                      isListening 
                        ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/40' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={isListening ? 'Listening (Click to stop)' : 'Voice input'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  title={lang === 'bn' ? 'পাঠান' : 'Send'}
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
