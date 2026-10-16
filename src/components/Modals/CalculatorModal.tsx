import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  X, 
  Delete, 
  RotateCcw, 
  Copy, 
  Check, 
  HardDrive, 
  Sparkles,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'bn' | 'en';
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose,
  lang
}) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'scientific' | 'storage'>('standard');
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Storage Converter state
  const [storageValue, setStorageValue] = useState<string>('1000');
  const [storageUnit, setStorageUnit] = useState<'GB' | 'MB' | 'TB' | 'KB'>('GB');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab === 'storage') return;
      const key = e.key;
      if (/[0-9]/.test(key)) {
        inputDigit(key);
      } else if (key === '.') {
        inputDot();
      } else if (['+', '-', '*', '/'].includes(key)) {
        const op = key === '*' ? '×' : key === '/' ? '÷' : key;
        performOperation(op);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculateResult();
      } else if (key === 'Backspace') {
        handleBackspace();
      } else if (key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, display, equation, activeTab]);

  if (!isOpen) return null;

  const inputDigit = (digit: string) => {
    setDisplay(prev => (prev === '0' || prev === 'Error' ? digit : prev + digit));
  };

  const inputDot = () => {
    if (!display.includes('.')) {
      setDisplay(prev => prev + '.');
    }
  };

  const clearAll = () => {
    setDisplay('0');
    setEquation('');
  };

  const clearEntry = () => {
    setDisplay('0');
  };

  const handleBackspace = () => {
    if (display === 'Error') {
      setDisplay('0');
      return;
    }
    setDisplay(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  const toggleSign = () => {
    if (display === '0' || display === 'Error') return;
    setDisplay(prev => (prev.startsWith('-') ? prev.slice(1) : '-' + prev));
  };

  const performOperation = (nextOperator: string) => {
    if (display === 'Error') return;
    setEquation(`${display} ${nextOperator} `);
    setDisplay('0');
  };

  const calculateResult = () => {
    if (!equation) return;
    try {
      const fullExpression = equation + display;
      // Convert display symbols to valid JS expression
      const sanitized = fullExpression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, `${Math.PI}`)
        .replace(/e/g, `${Math.E}`);

      // Evaluate safely
      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${sanitized})`)();
      
      let formattedResult = String(result);
      if (typeof result === 'number') {
        if (!isFinite(result) || isNaN(result)) {
          formattedResult = 'Error';
        } else {
          formattedResult = String(Math.round(result * 100000000) / 100000000);
        }
      }

      setHistory(prev => [`${fullExpression} = ${formattedResult}`, ...prev.slice(0, 9)]);
      setDisplay(formattedResult);
      setEquation('');
    } catch {
      setDisplay('Error');
    }
  };

  const performScientific = (func: string) => {
    if (display === 'Error') return;
    const num = parseFloat(display);
    let res = 0;
    let label = '';

    switch (func) {
      case 'sin':
        res = Math.sin((num * Math.PI) / 180);
        label = `sin(${num}°)`;
        break;
      case 'cos':
        res = Math.cos((num * Math.PI) / 180);
        label = `cos(${num}°)`;
        break;
      case 'tan':
        res = Math.tan((num * Math.PI) / 180);
        label = `tan(${num}°)`;
        break;
      case 'sqrt':
        if (num < 0) {
          setDisplay('Error');
          return;
        }
        res = Math.sqrt(num);
        label = `√(${num})`;
        break;
      case 'sqr':
        res = Math.pow(num, 2);
        label = `sqr(${num})`;
        break;
      case 'cube':
        res = Math.pow(num, 3);
        label = `cube(${num})`;
        break;
      case 'log':
        if (num <= 0) {
          setDisplay('Error');
          return;
        }
        res = Math.log10(num);
        label = `log(${num})`;
        break;
      case 'ln':
        if (num <= 0) {
          setDisplay('Error');
          return;
        }
        res = Math.log(num);
        label = `ln(${num})`;
        break;
      case 'inv':
        if (num === 0) {
          setDisplay('Error');
          return;
        }
        res = 1 / num;
        label = `1/(${num})`;
        break;
      case 'pi':
        res = Math.PI;
        label = 'π';
        break;
      case 'e':
        res = Math.E;
        label = 'e';
        break;
      default:
        return;
    }

    const formatted = String(Math.round(res * 100000000) / 100000000);
    setHistory(prev => [`${label} = ${formatted}`, ...prev.slice(0, 9)]);
    setDisplay(formatted);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(display);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Convert storage values
  const numStorage = parseFloat(storageValue) || 0;
  let inBytes = 0;
  if (storageUnit === 'TB') inBytes = numStorage * 1024 * 1024 * 1024 * 1024;
  else if (storageUnit === 'GB') inBytes = numStorage * 1024 * 1024 * 1024;
  else if (storageUnit === 'MB') inBytes = numStorage * 1024 * 1024;
  else inBytes = numStorage * 1024;

  const convTB = inBytes / (1024 * 1024 * 1024 * 1024);
  const convGB = inBytes / (1024 * 1024 * 1024);
  const convMB = inBytes / (1024 * 1024);
  const convKB = inBytes / 1024;

  // Capacity estimate: photos (3MB), songs (5MB), HD movies (1.5GB), 4K movies (8GB)
  const countPhotos = Math.floor(convMB / 3);
  const countSongs = Math.floor(convMB / 5);
  const countMovies = Math.floor(convGB / 1.5);
  const count4k = Math.floor(convGB / 8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div 
        className={`bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          isMaximized 
            ? 'w-full h-full max-w-4xl' 
            : activeTab === 'scientific' 
              ? 'w-full max-w-lg' 
              : activeTab === 'storage' 
                ? 'w-full max-w-md' 
                : 'w-full max-w-sm'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{lang === 'bn' ? 'ক্যালকুলেটর ও স্টোরেজ হিসাব' : 'Calculator & Storage Math'}</span>
              </h3>
              <p className="text-[10px] text-slate-400">
                {lang === 'bn' ? 'স্ট্যান্ডার্ড, সায়েন্টিফিক ও ১০০০ জিবি কনভার্টার' : 'Standard, Scientific & 1000 GB Converter'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMaximized(m => !m)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('standard')}
            className={`py-1.5 rounded-xl transition ${activeTab === 'standard' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'}`}
          >
            {lang === 'bn' ? 'সাধারণ' : 'Standard'}
          </button>
          <button
            onClick={() => setActiveTab('scientific')}
            className={`py-1.5 rounded-xl transition ${activeTab === 'scientific' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'}`}
          >
            {lang === 'bn' ? 'সায়েন্টিফিক' : 'Scientific'}
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`py-1.5 rounded-xl transition ${activeTab === 'storage' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'}`}
          >
            {lang === 'bn' ? '১০০০ জিবি স্টোরেজ' : 'Storage Calc'}
          </button>
        </div>

        {/* Display / Body */}
        {activeTab === 'storage' ? (
          /* Storage Converter View */
          <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'bn' ? 'স্টোরেজের পরিমাণ দিন:' : 'Enter Storage Amount:'}</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={storageValue}
                  onChange={e => setStorageValue(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-base focus:border-cyan-400 focus:outline-none"
                  placeholder="1000"
                />
                <select
                  value={storageUnit}
                  onChange={e => setStorageUnit(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 text-cyan-400 font-bold rounded-xl px-3 py-2 focus:border-cyan-400 focus:outline-none text-sm"
                >
                  <option value="TB">TB (টেরাবাইট)</option>
                  <option value="GB">GB (গিগাবাইট)</option>
                  <option value="MB">MB (মেগাবাইট)</option>
                  <option value="KB">KB (কিলোবাইট)</option>
                </select>
              </div>
            </div>

            {/* Quick 1000GB presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">{lang === 'bn' ? 'কুইক সিলেক্ট:' : 'Quick Presets:'}</span>
              {['1000 GB', '500 GB', '100 GB', '1 TB', '50 GB'].map(preset => {
                const [val, unit] = preset.split(' ');
                return (
                  <button
                    key={preset}
                    onClick={() => {
                      setStorageValue(val);
                      setStorageUnit(unit as any);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/20 transition"
                  >
                    {preset}
                  </button>
                );
              })}
            </div>

            {/* Conversion table */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
              <h4 className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'bn' ? 'রূপান্তর ফলাফল:' : 'Conversion Results:'}</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">টেরাবাইট (TB)</span>
                  <span className="font-bold text-white text-sm">{convTB.toLocaleString(undefined, { maximumFractionDigits: 4 })} TB</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-cyan-500/30 bg-cyan-950/20">
                  <span className="text-[10px] text-cyan-300 block font-sans">গিগাবাইট (GB)</span>
                  <span className="font-bold text-cyan-300 text-sm">{convGB.toLocaleString(undefined, { maximumFractionDigits: 2 })} GB</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">মেগাবাইট (MB)</span>
                  <span className="font-bold text-white text-sm">{convMB.toLocaleString(undefined, { maximumFractionDigits: 1 })} MB</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">কিলোবাইট (KB)</span>
                  <span className="font-bold text-white text-sm">{convKB.toLocaleString(undefined, { maximumFractionDigits: 0 })} KB</span>
                </div>
              </div>
            </div>

            {/* Capacity breakdown */}
            <div className="bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border border-cyan-500/30 rounded-2xl p-3.5 space-y-2">
              <h4 className="text-xs font-bold text-cyan-300">
                {lang === 'bn' ? `💡 ${storageValue} ${storageUnit} স্টোরেজে কত কী রাখা যাবে?` : `💡 What fits in ${storageValue} ${storageUnit}?`}
              </h4>
              <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                <li className="flex items-center justify-between">
                  <span>📸 {lang === 'bn' ? 'এইচডি ছবি (৩ এমবি করে)' : 'HD Photos (3 MB avg)'}</span>
                  <span className="font-mono font-bold text-cyan-400">~{countPhotos.toLocaleString()} {lang === 'bn' ? 'টি' : 'photos'}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>🎵 {lang === 'bn' ? 'গজল বা গান (৫ এমবি করে)' : 'Audio & Ghazals (5 MB avg)'}</span>
                  <span className="font-mono font-bold text-emerald-400">~{countSongs.toLocaleString()} {lang === 'bn' ? 'টি' : 'songs'}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>🎬 {lang === 'bn' ? 'এইচডি ভিডিও / মুভি (১.৫ জিবি করে)' : 'HD Movies (1.5 GB avg)'}</span>
                  <span className="font-mono font-bold text-purple-400">~{countMovies.toLocaleString()} {lang === 'bn' ? 'টি' : 'movies'}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>🎥 {lang === 'bn' ? '৪K আল্ট্রা এইচডি ভিডিও (৮ জিবি করে)' : '4K Ultra HD Videos (8 GB)'}</span>
                  <span className="font-mono font-bold text-rose-400">~{count4k.toLocaleString()} {lang === 'bn' ? 'টি' : 'videos'}</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* Standard / Scientific Calculator View */
          <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
            {/* Display screen */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-right relative">
              <div className="text-xs text-slate-400 font-mono min-h-[16px] truncate">
                {equation}
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-wider truncate py-1">
                {display}
              </div>

              <button
                onClick={handleCopy}
                className="absolute left-2.5 bottom-2.5 p-1 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-800/80 transition"
                title="Copy result"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Scientific keys row if scientific mode is active */}
            {activeTab === 'scientific' && (
              <div className="grid grid-cols-5 gap-1.5 text-xs font-mono">
                {[
                  { label: 'sin', action: () => performScientific('sin') },
                  { label: 'cos', action: () => performScientific('cos') },
                  { label: 'tan', action: () => performScientific('tan') },
                  { label: 'log', action: () => performScientific('log') },
                  { label: 'ln', action: () => performScientific('ln') },
                  { label: '√x', action: () => performScientific('sqrt') },
                  { label: 'x²', action: () => performScientific('sqr') },
                  { label: 'x³', action: () => performScientific('cube') },
                  { label: '1/x', action: () => performScientific('inv') },
                  { label: 'π', action: () => performScientific('pi') },
                  { label: 'e', action: () => performScientific('e') },
                  { label: '(', action: () => inputDigit('(') },
                  { label: ')', action: () => inputDigit(')') },
                  { label: '^', action: () => performOperation('^') },
                  { label: '%', action: () => performOperation('%') },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={item.action}
                    className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 text-cyan-300 font-bold border border-slate-700/50 transition cursor-pointer active:scale-95 text-center"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Standard Keypad */}
            <div className="grid grid-cols-4 gap-1.5 text-sm font-bold font-mono">
              <button
                onClick={clearAll}
                className="p-3 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/50 transition active:scale-95"
              >
                AC
              </button>
              <button
                onClick={clearEntry}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition active:scale-95"
              >
                C
              </button>
              <button
                onClick={handleBackspace}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center justify-center active:scale-95"
              >
                <Delete className="w-4 h-4" />
              </button>
              <button
                onClick={() => performOperation('÷')}
                className="p-3 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-400 border border-cyan-800/60 transition active:scale-95"
              >
                ÷
              </button>

              <button
                onClick={() => inputDigit('7')}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/60 transition active:scale-95"
              >
                7
              </button>
              <button
                onClick={() => inputDigit('8')}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/60 transition active:scale-95"
              >
                8
              </button>
              <button
                onClick={() => inputDigit('9')}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/60 transition active:scale-95"
              >
                9
              </button>
              <button
                onClick={() => performOperation('×')}
                className="p-3 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-400 border border-cyan-800/60 transition active:scale-95"
              >
                ×
              </button>

              <button
                onClick={() => inputDigit('4')}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/60 transition active:scale-95"
              >
                4
              </button>
              <button
                onClick={() => inputDigit('5')}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/60 transition active:scale-95"
              >
                5
              </button>
              <button
                onClick={() => inputDigit('6')}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/60 transition active:scale-95"
              >
                6
              </button>
              <button
                onClick={() => performOperation('-')}
                className="p-3 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-400 border border-cyan-800/60 transition active:scale-95"
              >
                -
              </button>

              <button
                onClick={() => inputDigit('1')}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/60 transition active:scale-95"
              >
                1
              </button>
              <button
                onClick={() => inputDigit('2')}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/60 transition active:scale-95"
              >
                2
              </button>
              <button
                onClick={() => inputDigit('3')}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/60 transition active:scale-95"
              >
                3
              </button>
              <button
                onClick={() => performOperation('+')}
                className="p-3 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-400 border border-cyan-800/60 transition active:scale-95"
              >
                +
              </button>

              <button
                onClick={toggleSign}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition active:scale-95"
              >
                ±
              </button>
              <button
                onClick={() => inputDigit('0')}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/60 transition active:scale-95"
              >
                0
              </button>
              <button
                onClick={inputDot}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/60 transition active:scale-95"
              >
                .
              </button>
              <button
                onClick={calculateResult}
                className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20 transition active:scale-95"
              >
                =
              </button>
            </div>

            {/* History snippet */}
            {history.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>{lang === 'bn' ? 'সাম্প্রতিক হিসাব:' : 'Recent History:'}</span>
                  <button
                    onClick={() => setHistory([])}
                    className="hover:text-red-400 flex items-center gap-1 transition"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>{lang === 'bn' ? 'মুছুন' : 'Clear'}</span>
                  </button>
                </div>
                <div className="space-y-0.5 max-h-16 overflow-y-auto text-[11px] font-mono text-slate-400">
                  {history.slice(0, 3).map((h, i) => (
                    <div key={i} className="truncate">{h}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
