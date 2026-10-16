import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  X, 
  Square, 
  Play, 
  Pause, 
  Download, 
  Upload, 
  Sparkles, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  HardDrive,
  Volume2,
  FileAudio,
  Radio
} from 'lucide-react';
import { StorageFile } from '../../types/storage';
import { getSequentialVoiceRecordName } from '../../utils/bengaliNaming';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToDrive?: (file: StorageFile) => void;
  currentUser?: { id: string; emailOrPhone?: string } | null;
  existingRecordsCount?: number;
  lang: 'bn' | 'en';
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  onSaveToDrive,
  currentUser,
  existingRecordsCount = 0,
  lang
}) => {
  // Recording states: 'idle' | 'recording' | 'paused' | 'stopped'
  const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [duration, setDuration] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavingToDrive, setIsSavingToDrive] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Audio Playback
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Audio Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanupStreams();
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, []);

  const cleanupStreams = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.85;

        // Gradient color from violet/cyan to emerald
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#06b6d4');
        grad.addColorStop(0.5, '#3b82f6');
        grad.addColorStop(1, '#a855f7');

        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth + 1;
      }
    };

    render();
  };

  const handleClose = () => {
    if (status === 'recording' || status === 'paused') {
      if (!confirm(lang === 'bn' ? 'ভয়েস রেকর্ডিং বন্ধ করতে চান?' : 'Cancel voice recording?')) {
        return;
      }
    }
    cleanupStreams();
    setStatus('idle');
    setRecordedBlob(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setDuration(0);
    setErrorMessage(null);
    onClose();
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setSaveSuccess(false);
    chunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage(
        lang === 'bn'
          ? 'আপনার ব্রাউজারে ভয়েস রেকর্ডিং সাপোর্ট নেই। Chrome বা Firefox ব্যবহার করুন।'
          : 'Voice recording is not supported in this browser.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Audio Context for Visualizer
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        drawVisualizer();
      } catch (vizErr) {
        console.warn('Visualizer setup notice:', vizErr);
      }

      // Check supported audio mime types
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4'
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMime || undefined,
        audioBitsPerSecond: 128000
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMime || 'audio/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        setStatus('stopped');
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };

      recorder.start(500);
      setStatus('recording');
      setDuration(0);

      timerIntervalRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Voice recording error:', err);
      if (err.name === 'NotAllowedError') {
        setErrorMessage(
          lang === 'bn' 
            ? 'মাইক্রোফোনের অনুমতি দেওয়া হয়নি বা বাতিল করা হয়েছে। ব্রাউজারের অ্যাড্রেস বারের তালার আইকনে ক্লিক করে অনুমতি দিন।' 
            : 'Microphone permission denied. Please allow microphone access.'
        );
      } else {
        setErrorMessage(
          lang === 'bn' 
            ? `রেকর্ড শুরু করা যায়নি: ${err.message || 'অজানা ত্রুটি'}` 
            : `Failed to record voice: ${err.message || 'Unknown error'}`
        );
      }
      cleanupStreams();
      setStatus('idle');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setStatus('paused');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setStatus('recording');
      timerIntervalRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const resetRecording = () => {
    cleanupStreams();
    setRecordedBlob(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setDuration(0);
    setStatus('idle');
    setSaveSuccess(false);
    setErrorMessage(null);
    setIsPlayingPreview(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Sequential naming: এক ভয়েস, দুই ভয়েস, তিন ভয়েস, ইত্যাদি
  const sequentialVoiceName = getSequentialVoiceRecordName(existingRecordsCount + 1);

  const downloadRecording = () => {
    if (!recordedBlob || !recordedAudioUrl) return;
    const filename = `${sequentialVoiceName}.webm`;

    const a = document.createElement('a');
    a.href = recordedAudioUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const saveDirectlyToDrive = async () => {
    if (!recordedBlob || !onSaveToDrive) return;
    setIsSavingToDrive(true);
    try {
      const now = new Date();
      const filename = `${sequentialVoiceName}.webm`;

      // Read blob as DataURL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(recordedBlob);
      });

      const newFile: StorageFile = {
        id: 'voice_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        name: filename,
        size: recordedBlob.size,
        type: recordedBlob.type || 'audio/webm',
        category: 'audio',
        dataUrl: dataUrl,
        uploadedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        isStarred: false,
        isEncrypted: false,
        inTrash: false,
        ownerId: currentUser?.id || 'default',
        ownerPhone: currentUser?.emailOrPhone || '',
        tags: ['Voice Recording', 'Audio']
      };

      await onSaveToDrive(newFile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save voice recording to drive:', err);
      setErrorMessage(lang === 'bn' ? 'ড্রাইভে ভয়েস সেভ করতে সমস্যা হয়েছে।' : 'Failed to save voice to drive.');
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const togglePreviewPlay = () => {
    if (!audioElementRef.current) return;
    if (isPlayingPreview) {
      audioElementRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioElementRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${status === 'recording' ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'}`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{lang === 'bn' ? 'ভয়েস রেকর্ডার' : 'Voice Recorder'}</span>
                {status === 'recording' && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    REC
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'ক্লিয়ার স্টুডিও সাউন্ডে অডিও ও ভয়েস রেকর্ড করুন' : 'Record crystal clear studio voice notes'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2.5 animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {saveSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2.5 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {lang === 'bn' 
                  ? `"${sequentialVoiceName}" সফলভাবে ১০০০ জিবি ক্লাউড ড্রাইভে সংরক্ষিত হয়েছে!` 
                  : `"${sequentialVoiceName}" saved to your Cloud Drive successfully!`}
              </span>
            </div>
          )}

          {/* Mode 1: IDLE */}
          {status === 'idle' && (
            <div className="space-y-6 text-center py-4">
              {/* Giant Mic Icon Button */}
              <div className="relative inline-flex items-center justify-center">
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-cyan-500/20 via-indigo-500/20 to-purple-500/20 border-2 border-indigo-500/30 flex items-center justify-center shadow-inner">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                    <Mic className="w-10 h-10" />
                  </div>
                </div>
              </div>

              {/* Sequential Name Notice */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 text-xs text-slate-300">
                <span className="text-slate-400 block mb-1">
                  {lang === 'bn' ? 'পরবর্তী ভয়েস ফাইলের নাম হবে:' : 'Next Voice File Name:'}
                </span>
                <span className="text-cyan-300 font-bold text-sm tracking-wide">
                  🎙️ {sequentialVoiceName}
                </span>
              </div>

              {/* Helpful Notice */}
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                {lang === 'bn' 
                  ? 'রেকর্ড বাটনে চাপ দিন এবং কথা বলা শুরু করুন। রেকর্ড শেষে ফাইলটি সরাসরি ক্লাউড ড্রাইভে সংরক্ষিত হবে।' 
                  : 'Click the record button and speak clearly into your microphone.'}
              </p>

              {/* Start Recording Button */}
              <button
                onClick={startRecording}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2.5 cursor-pointer transition transform active:scale-95"
              >
                <Mic className="w-4 h-4 fill-white" />
                <span>{lang === 'bn' ? 'ভয়েস রেকর্ড শুরু করুন' : 'Start Voice Recording'}</span>
              </button>
            </div>
          )}

          {/* Mode 2: RECORDING / PAUSED */}
          {(status === 'recording' || status === 'paused') && (
            <div className="py-4 space-y-6 text-center">
              {/* Animated Waveform Visualizer Canvas */}
              <div className="h-20 bg-slate-950/80 rounded-2xl border border-slate-800 p-2 overflow-hidden flex items-center justify-center relative">
                <canvas 
                  ref={canvasRef} 
                  width={360} 
                  height={80} 
                  className="w-full h-full"
                />
              </div>

              {/* Timer & Status */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-red-400" />
                  <span>
                    {status === 'recording' 
                      ? (lang === 'bn' ? 'রেকর্ড হচ্ছে...' : 'Recording...') 
                      : (lang === 'bn' ? 'সাময়িক বিরতি' : 'Paused')}
                  </span>
                </div>

                <div className="text-5xl font-black font-mono tracking-wider text-white">
                  {formatTime(duration)}
                </div>

                <div className="text-xs text-cyan-300 font-semibold">
                  🎙️ {sequentialVoiceName}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                {status === 'recording' ? (
                  <button
                    onClick={pauseRecording}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-2 transition cursor-pointer active:scale-95"
                  >
                    <Pause className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'পজ' : 'Pause'}</span>
                  </button>
                ) : (
                  <button
                    onClick={resumeRecording}
                    className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition cursor-pointer active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>{lang === 'bn' ? 'চালিয়ে যান' : 'Resume'}</span>
                  </button>
                )}

                <button
                  onClick={stopRecording}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center gap-2 transition cursor-pointer active:scale-95"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>{lang === 'bn' ? 'রেকর্ড সম্পন্ন করুন' : 'Finish'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode 3: COMPLETED / PREVIEW & SAVE */}
          {status === 'stopped' && recordedAudioUrl && (
            <div className="space-y-4">
              {/* Sequential Voice Name Badge */}
              <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 text-xs">
                <FileAudio className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">
                    {lang === 'bn' ? 'সংরক্ষিত ফাইলের নাম:' : 'Saved File Name:'}
                  </span>
                  <strong className="text-white font-bold text-sm">{sequentialVoiceName}</strong>
                </div>
              </div>

              {/* Native Audio Player */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <audio
                  ref={audioElementRef}
                  src={recordedAudioUrl}
                  controls
                  onEnded={() => setIsPlayingPreview(false)}
                  className="w-full"
                />

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>⏱️ {formatTime(duration)}</span>
                  <span>📦 {(recordedBlob ? (recordedBlob.size / 1024).toFixed(1) : 0)} KB</span>
                  <span className="text-emerald-400 font-semibold">HQ Audio</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                {/* Save directly to 1000GB Drive */}
                {onSaveToDrive && (
                  <button
                    onClick={saveDirectlyToDrive}
                    disabled={isSavingToDrive}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-blue-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-60"
                  >
                    {isSavingToDrive ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{lang === 'bn' ? 'ড্রাইভে সংরক্ষণ হচ্ছে...' : 'Saving to Drive...'}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 stroke-[2.5]" />
                        <span>{lang === 'bn' ? `⚡ "${sequentialVoiceName}" ক্লাউড ড্রাইভে সেভ করুন` : `⚡ Save "${sequentialVoiceName}" to Drive`}</span>
                      </>
                    )}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Download to Device */}
                  <button
                    onClick={downloadRecording}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>{lang === 'bn' ? 'অডিও ডাউনলোড' : 'Download'}</span>
                  </button>

                  {/* Record Again */}
                  <button
                    onClick={resetRecording}
                    className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700/80 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'bn' ? 'নতুন ভয়েস' : 'Record Again'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
