import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
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
  Settings2,
  FileVideo
} from 'lucide-react';
import { StorageFile } from '../../types/storage';
import { getSequentialScreenRecordName } from '../../utils/bengaliNaming';

interface ScreenRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToDrive?: (file: StorageFile) => void;
  currentUser?: { id: string; emailOrPhone?: string } | null;
  existingRecordsCount?: number;
  lang: 'bn' | 'en';
}

export const ScreenRecorderModal: React.FC<ScreenRecorderModalProps> = ({
  isOpen,
  onClose,
  onSaveToDrive,
  currentUser,
  existingRecordsCount = 0,
  lang
}) => {
  // Option 1: Microphone Audio
  const [includeMic, setIncludeMic] = useState<boolean>(true);
  // Option 2: Device / System Audio
  const [includeDeviceAudio, setIncludeDeviceAudio] = useState<boolean>(true);

  // Quality & Resolution settings
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [fps, setFps] = useState<number>(30);

  // Recording lifecycle: 'idle' | 'recording' | 'paused' | 'stopped'
  const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [duration, setDuration] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavingToDrive, setIsSavingToDrive] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      cleanupStreams();
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, []);

  const cleanupStreams = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach(t => t.stop());
      displayStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach(t => t.stop());
      combinedStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
  };

  const handleClose = () => {
    if (status === 'recording' || status === 'paused') {
      if (!confirm(lang === 'bn' ? 'রেকর্ডিং বন্ধ করতে চান?' : 'Cancel active recording?')) {
        return;
      }
    }
    cleanupStreams();
    setStatus('idle');
    setRecordedBlob(null);
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    setDuration(0);
    setErrorMessage(null);
    onClose();
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setSaveSuccess(false);
    chunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setErrorMessage(
        lang === 'bn' 
          ? 'আপনার ব্রাউজারে স্ক্রিন রেকর্ডিং সাপোর্ট নেই। অনুগ্রহ করে Chrome, Edge বা Firefox ব্রাউজার ব্যবহার করুন।' 
          : 'Screen recording is not supported in this browser. Please use Chrome, Edge, or Firefox.'
      );
      return;
    }

    try {
      // 1. Request Screen Capture with Device/System Audio option
      const width = resolution === '1080p' ? 1920 : 1280;
      const height = resolution === '1080p' ? 1080 : 720;

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: fps }
        },
        audio: includeDeviceAudio // Capture Device / System / Tab audio
      });
      displayStreamRef.current = displayStream;

      // Handle user clicking native browser "Stop sharing" button
      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopRecording();
        };
      }

      // 2. Request Microphone Stream if option is enabled
      let micStream: MediaStream | null = null;
      if (includeMic) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          micStreamRef.current = micStream;
        } catch (micErr) {
          console.warn('Microphone permission notice:', micErr);
          // If mic fails or is denied, we can still record screen with system audio
        }
      }

      // 3. Audio Mixing Engine using Web Audio API
      const displayAudioTracks = displayStream.getAudioTracks();
      const micAudioTracks = micStream ? micStream.getAudioTracks() : [];

      let finalAudioTracks: MediaStreamTrack[] = [];

      if (displayAudioTracks.length > 0 && micAudioTracks.length > 0) {
        // Both Microphone and Device Audio are active -> Mix them together!
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;

          const destination = audioCtx.createMediaStreamDestination();

          const sysSource = audioCtx.createMediaStreamSource(displayStream);
          const micSource = audioCtx.createMediaStreamSource(micStream!);

          sysSource.connect(destination);
          micSource.connect(destination);

          finalAudioTracks = destination.stream.getAudioTracks();
        } catch (mixErr) {
          console.warn('Audio mixing notice, falling back to tracks:', mixErr);
          finalAudioTracks = [...displayAudioTracks, ...micAudioTracks];
        }
      } else if (displayAudioTracks.length > 0) {
        // Only Device Audio
        finalAudioTracks = displayAudioTracks;
      } else if (micAudioTracks.length > 0) {
        // Only Microphone Audio
        finalAudioTracks = micAudioTracks;
      }

      // 4. Combine Video and Final Audio Tracks into one unified MediaStream
      const finalTracks = [...displayStream.getVideoTracks(), ...finalAudioTracks];
      const combinedStream = new MediaStream(finalTracks);
      combinedStreamRef.current = combinedStream;

      // 5. Select supported mimeType
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMimeType || undefined,
        videoBitsPerSecond: resolution === '1080p' ? 3000000 : 1800000
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType || 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setStatus('stopped');
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };

      // Start recording with 1 second timeslices
      recorder.start(1000);
      setStatus('recording');
      setDuration(0);

      // Start duration timer
      timerIntervalRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Screen recording init error:', err);
      if (err.name === 'NotAllowedError') {
        setErrorMessage(
          lang === 'bn' 
            ? 'স্ক্রিন শেয়ারিং অনুমতি বাতিল করা হয়েছে বা দেওয়া হয়নি।' 
            : 'Screen capture permission was canceled or denied.'
        );
      } else {
        setErrorMessage(
          lang === 'bn' 
            ? `স্ক্রিন রেকর্ড শুরু করা যায়নি: ${err.message || 'অজানা ত্রুটি'}` 
            : `Failed to start recording: ${err.message || 'Unknown error'}`
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
    // Clean up streams but keep the recorded blob
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach(t => t.stop());
      displayStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
  };

  const resetRecording = () => {
    cleanupStreams();
    setRecordedBlob(null);
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    setDuration(0);
    setStatus('idle');
    setSaveSuccess(false);
    setErrorMessage(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const downloadRecording = () => {
    if (!recordedBlob || !recordedVideoUrl) return;
    const seqName = getSequentialScreenRecordName(existingRecordsCount + 1);
    const filename = `${seqName}.webm`;

    const a = document.createElement('a');
    a.href = recordedVideoUrl;
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
      const seqName = getSequentialScreenRecordName(existingRecordsCount + 1);
      const filename = `${seqName}.webm`;

      // Read blob as DataURL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(recordedBlob);
      });

      const newFile: StorageFile = {
        id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        name: filename,
        size: recordedBlob.size,
        type: recordedBlob.type || 'video/webm',
        category: 'video',
        dataUrl: dataUrl,
        uploadedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        isStarred: false,
        isEncrypted: false,
        inTrash: false,
        ownerId: currentUser?.id || 'default',
        ownerPhone: currentUser?.emailOrPhone || '',
        tags: ['Screen Recording', includeMic ? 'Mic Audio' : '', includeDeviceAudio ? 'Device Audio' : ''].filter(Boolean)
      };

      await onSaveToDrive(newFile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save recording to drive:', err);
      setErrorMessage(lang === 'bn' ? 'ড্রাইভে সেভ করতে সমস্যা হয়েছে।' : 'Failed to save recording to drive.');
    } finally {
      setIsSavingToDrive(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-2xl border ${status === 'recording' ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'}`}>
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{lang === 'bn' ? 'স্ক্রিন রেকর্ডার' : 'Screen Recorder'}</span>
                {status === 'recording' && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500 text-slate-950 text-[10px] font-black uppercase tracking-wider animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                    REC
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'মাইক্রোফোন ও ডিভাইসের অডিও সহ হাই-কোয়ালিটি স্ক্রিন রেকর্ড' : 'High quality screen capture with Mic & Device Audio'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-2xl text-red-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {saveSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-emerald-200 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                {lang === 'bn' 
                  ? '⚡ স্ক্রিন রেকর্ডিং ভিডিওটি সফলভাবে আপনার ১০০০ জিবি ক্লাউড ড্রাইভে সংরক্ষিত হয়েছে!' 
                  : '⚡ Recording safely saved to your 1000 GB Cloud Drive!'}
              </span>
            </div>
          )}

          {/* Mode 1: IDLE / CONFIGURATION */}
          {status === 'idle' && (
            <div className="space-y-4">
              {/* Audio Source Options (User requested: মাইক্রোফোন & ডিভাইসের অডিও) */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-cyan-400" />
                  <span>{lang === 'bn' ? 'অডিও সেটিংস নির্বাচন করুন:' : 'Select Audio Options:'}</span>
                </h4>

                {/* Option 1: Microphone */}
                <div 
                  onClick={() => setIncludeMic(!includeMic)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                    includeMic 
                      ? 'bg-cyan-950/30 border-cyan-500/50 text-cyan-200' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${includeMic ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                      {includeMic ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {lang === 'bn' ? '১. মাইক্রোফোন অডিও (Microphone)' : '1. Microphone Audio'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {lang === 'bn' ? 'আপনার নিজস্ব কণ্ঠস্বর ও মুখের কথা রেকর্ড হবে' : 'Record your voice from microphone'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Toggle Pill */}
                  <div className={`w-10 h-6 flex items-center rounded-full p-1 transition duration-300 ${includeMic ? 'bg-cyan-500' : 'bg-slate-800'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${includeMic ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Option 2: Device / System Audio */}
                <div 
                  onClick={() => setIncludeDeviceAudio(!includeDeviceAudio)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                    includeDeviceAudio 
                      ? 'bg-cyan-950/30 border-cyan-500/50 text-cyan-200' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${includeDeviceAudio ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                      {includeDeviceAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {lang === 'bn' ? '২. ডিভাইসের অডিও (Device / System Audio)' : '2. Device / System Audio'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {lang === 'bn' ? 'কম্পিউটার/মোবাইলের ইন্টারনাল সাউন্ড বা ভিডিওর আওয়াজ' : 'Capture internal system, tab & app sound'}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Pill */}
                  <div className={`w-10 h-6 flex items-center rounded-full p-1 transition duration-300 ${includeDeviceAudio ? 'bg-cyan-500' : 'bg-slate-800'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${includeDeviceAudio ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

              {/* Quality & Resolution */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
                  <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                    {lang === 'bn' ? 'ভিডিও রেজোলিউশন' : 'Resolution'}
                  </label>
                  <select
                    value={resolution}
                    onChange={e => setResolution(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="1080p">Full HD (1080p) - সেরা কোয়ালিটি</option>
                    <option value="720p">HD (720p) - ছোট ফাইল সাইজ</option>
                  </select>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
                  <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                    {lang === 'bn' ? 'ফ্রেমরেট (FPS)' : 'Frame Rate'}
                  </label>
                  <select
                    value={fps}
                    onChange={e => setFps(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value={30}>30 FPS (স্ট্যান্ডার্ড)</option>
                    <option value={60}>60 FPS (আল্ট্রা স্মুথ)</option>
                  </select>
                </div>
              </div>

              {/* Helpful Notice */}
              <div className="text-[11px] text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                <span className="font-bold text-cyan-300">💡 টিপস: </span>
                {lang === 'bn' 
                  ? '"রেকর্ড শুরু করুন" চাপার পর ব্রাউজারের পপ-আপ থেকে আপনি সম্পূর্ণ স্ক্রিন, নির্দিষ্ট উইন্ডো বা ব্রাউজার ট্যাব সিলেক্ট করতে পারবেন। সিস্টেম অডিওর জন্য পপ-আপের নিচে "Share audio" টিক চিহ্ন দিন।' 
                  : 'After clicking Start, choose Entire Screen, Window, or Chrome Tab. Check "Share audio" in the popup to include system sound.'}
              </div>

              {/* Start Recording Button */}
              <button
                onClick={startRecording}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-rose-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white animate-ping" />
                <span>{lang === 'bn' ? 'স্ক্রিন রেকর্ড শুরু করুন' : 'Start Screen Recording'}</span>
              </button>
            </div>
          )}

          {/* Mode 2: RECORDING / PAUSED */}
          {(status === 'recording' || status === 'paused') && (
            <div className="py-6 space-y-6 text-center">
              {/* Timer Display */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  <span>{status === 'recording' ? (lang === 'bn' ? 'রেকর্ডিং চলছে...' : 'Recording in progress...') : (lang === 'bn' ? 'রেকর্ডিং সাময়িক বিরতি' : 'Recording paused')}</span>
                </div>

                <div className="text-5xl font-black font-mono tracking-wider text-white">
                  {formatTime(duration)}
                </div>

                <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${includeMic ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                    {includeMic ? (lang === 'bn' ? 'মাইক্রোফোন অন' : 'Mic ON') : (lang === 'bn' ? 'মাইক্রোফোন অফ' : 'Mic OFF')}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${includeDeviceAudio ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                    {includeDeviceAudio ? (lang === 'bn' ? 'ডিভাইস অডিও অন' : 'Device Audio ON') : (lang === 'bn' ? 'ডিভাইস অডিও অফ' : 'Device Audio OFF')}
                  </span>
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
                    <span>{lang === 'bn' ? 'পজ / বিরতি' : 'Pause'}</span>
                  </button>
                ) : (
                  <button
                    onClick={resumeRecording}
                    className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition cursor-pointer active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>{lang === 'bn' ? 'পুনরায় শুরু' : 'Resume'}</span>
                  </button>
                )}

                <button
                  onClick={stopRecording}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 transition cursor-pointer active:scale-95"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>{lang === 'bn' ? 'রেকর্ড সম্পন্ন করুন' : 'Finish Recording'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode 3: COMPLETED / PREVIEW & SAVE */}
          {status === 'stopped' && recordedVideoUrl && (
            <div className="space-y-4">
              {/* Video Player */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-black aspect-video shadow-2xl">
                <video
                  src={recordedVideoUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Sequential File Name Badge */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 text-xs">
                <FileVideo className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  {lang === 'bn' ? 'সংরক্ষিত ফাইলের নাম:' : 'Saved File Name:'}{' '}
                  <strong className="text-white font-bold">{getSequentialScreenRecordName(existingRecordsCount + 1)}</strong>
                </span>
              </div>

              {/* Video Stats */}
              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span>⏱️ {lang === 'bn' ? 'সময়কাল:' : 'Duration:'} <strong className="text-white font-mono">{formatTime(duration)}</strong></span>
                <span>📦 {lang === 'bn' ? 'সাইজ:' : 'Size:'} <strong className="text-cyan-400 font-mono">{(recordedBlob ? (recordedBlob.size / (1024 * 1024)).toFixed(2) : 0)} MB</strong></span>
                <span>🎬 {resolution}</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                {/* Save directly to 1000GB Drive */}
                {onSaveToDrive && (
                  <button
                    onClick={saveDirectlyToDrive}
                    disabled={isSavingToDrive}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-60"
                  >
                    {isSavingToDrive ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>{lang === 'bn' ? 'ড্রাইভে সংরক্ষণ হচ্ছে...' : 'Saving to 1000GB Drive...'}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 stroke-[2.5]" />
                        <span>{lang === 'bn' ? '⚡ ১০০০ জিবি ক্লাউড ড্রাইভে সরাসরি সেভ করুন' : '⚡ Save Directly to 1000GB Drive'}</span>
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
                    <span>{lang === 'bn' ? 'ডিভাইসে ডাউনলোড' : 'Download to Device'}</span>
                  </button>

                  {/* Record Again */}
                  <button
                    onClick={resetRecording}
                    className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700/80 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'bn' ? 'নতুন রেকর্ডিং' : 'Record Again'}</span>
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
