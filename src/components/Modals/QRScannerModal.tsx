import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  QrCode, 
  Scan, 
  X, 
  RefreshCw, 
  Zap, 
  ZapOff, 
  Upload, 
  Download, 
  Check, 
  Copy, 
  ExternalLink, 
  FileText, 
  UserCheck, 
  Smartphone, 
  AlertCircle, 
  ArrowRight, 
  Shield, 
  HardDrive, 
  Sparkles,
  Link as LinkIcon,
  Globe,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { StorageFile, UserAccount } from '../../types/storage';
import { 
  parseScannedPayload, 
  ScannedResult, 
  generatePairingPayload, 
  generateQRCode, 
  downloadRemoteFile 
} from '../../services/qrSharingService';
import { getFileByIdOrShareId } from '../../services/firebase';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  currentFolderId: string | null;
  onFileAdded: (newFile: StorageFile) => void;
  onConnectAccount?: (userData: Partial<UserAccount>) => void;
  onPreviewFile?: (file: StorageFile) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  lang: 'bn' | 'en';
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentFolderId,
  onFileAdded,
  onConnectAccount,
  onPreviewFile,
  showToast,
  lang
}) => {
  const [activeTab, setActiveTab] = useState<'scanner' | 'my_code'>('scanner');
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  // Scanning state
  const [scannedResult, setScannedResult] = useState<ScannedResult | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const scanLoopRef = useRef<number | null>(null);

  // My Connect QR Code state
  const [myQRCodeUrl, setMyQRCodeUrl] = useState<string>('');
  const [isGeneratingMyQR, setIsGeneratingMyQR] = useState(false);

  // Play a gentle beep upon successful scan
  const playScanBeep = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);

      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    } catch {
      // ignore audio context restrictions
    }
  }, []);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
    setHasTorch(false);
  }, [cameraStream]);

  // List available camera devices
  const refreshVideoDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(cameras);
      if (cameras.length > 0 && !selectedDeviceId) {
        // Prefer environment (rear) camera
        const backCam = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear') || c.label.toLowerCase().includes('environment'));
        setSelectedDeviceId(backCam ? backCam.deviceId : cameras[0].deviceId);
      }
    } catch {
      // ignore
    }
  };

  // Start camera stream
  const startCamera = useCallback(async (deviceId?: string) => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(lang === 'bn' 
        ? 'আপনার ব্রাউজার ক্যামেরা এপিআই সাপোর্ট করে না। অনুগ্রহ করে নিচের বাটন দিয়ে ছবি আপলোড করে স্ক্যান করুন।'
        : 'Browser Camera API is not supported. Please upload a QR image below.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Check if torch/flashlight is supported
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
        setHasTorch(Boolean(capabilities?.torch));
      }

      await refreshVideoDevices();
    } catch (err: any) {
      console.warn('Camera access notice:', err);
      let errorMsg = lang === 'bn' 
        ? 'ক্যামেরা চালু করা সম্ভব হয়নি। অনুগ্রহ করে ব্রাউজার পারমিশন চেক করুন অথবা ছবি আপলোড করুন।' 
        : 'Unable to access camera. Please check permissions or upload a QR image.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = lang === 'bn'
          ? 'ক্যামেরা পারমিশন দেওয়া হয়নি। ব্রাউজারের অ্যাড্রেস বারের ক্যামেরা আইকনে ক্লিক করে Allow করুন।'
          : 'Camera permission denied. Please allow camera access in browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = lang === 'bn'
          ? 'কোনো ক্যামেরা পাওয়া যায়নি। নিচের "ছবি আপলোড" অপশন ব্যবহার করুন।'
          : 'No camera device found. Please upload a QR code image.';
      }
      setCameraError(errorMsg);
      setIsCameraActive(false);
    }
  }, [stopCamera, lang]);

  // Toggle torch / flash
  const toggleTorch = async () => {
    if (!cameraStream) return;
    const track = cameraStream.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setIsTorchOn(nextTorch);
    } catch {
      showToast(lang === 'bn' ? 'ফ্ল্যাশলাইট কন্ট্রোল করা যাচ্ছে না' : 'Torch control unavailable', 'info');
    }
  };

  // Continuous QR scan loop using requestAnimationFrame and jsQR
  useEffect(() => {
    if (!isCameraActive || scannedResult) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let isScanning = true;

    const scanFrame = () => {
      if (!isScanning) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data) {
            playScanBeep();
            const parsed = parseScannedPayload(code.data);
            setScannedResult(parsed);
            return; // pause scan while result is shown
          }
        } catch {
          // ignore scan frame exception
        }
      }

      scanLoopRef.current = requestAnimationFrame(scanFrame);
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isScanning = false;
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
      }
    };
  }, [isCameraActive, scannedResult, playScanBeep]);

  // Handle image upload fallback for scanning
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          playScanBeep();
          const parsed = parseScannedPayload(code.data);
          setScannedResult(parsed);
          showToast(lang === 'bn' ? '✅ QR কোড সফলভাবে শনাক্ত হয়েছে!' : '✅ QR Code successfully decoded!', 'success');
        } else {
          showToast(lang === 'bn' ? '⚠️ ছবিতে কোনো কিউআর কোড পাওয়া যায়নি।' : '⚠️ No QR code detected in this image.', 'error');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Generate My Account Connect QR Code
  useEffect(() => {
    if (activeTab === 'my_code' && currentUser) {
      setIsGeneratingMyQR(true);
      const payload = generatePairingPayload(currentUser);
      generateQRCode(payload, 340)
        .then(url => {
          setMyQRCodeUrl(url);
          setIsGeneratingMyQR(false);
        })
        .catch(err => {
          console.warn('QR generate error:', err);
          setIsGeneratingMyQR(false);
        });
    }
  }, [activeTab, currentUser]);

  // Lifecycle when modal opens/closes or activeTab changes
  useEffect(() => {
    if (isOpen && activeTab === 'scanner') {
      startCamera(selectedDeviceId);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, selectedDeviceId, startCamera, stopCamera]);

  // Reset scan to scan another code
  const handleResetScan = () => {
    setScannedResult(null);
  };

  // 1. Action: Import / Add Shared File to Drive
  const handleImportSharedFile = async (shareIdOrUrl: string) => {
    setIsProcessingAction(true);
    try {
      // A. Try fetching shared file from Firestore
      const targetId = shareIdOrUrl.includes('/') ? shareIdOrUrl.split('/').pop() || shareIdOrUrl : shareIdOrUrl;
      const fileData = await getFileByIdOrShareId(targetId);

      if (fileData) {
        const now = new Date().toISOString();
        const importedFile: StorageFile = {
          ...fileData,
          id: 'imp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
          name: fileData.name,
          folderId: currentFolderId,
          ownerId: currentUser?.id || 'default',
          ownerPhone: currentUser?.phone,
          ownerEmail: currentUser?.email,
          ownerEmailOrPhone: currentUser?.emailOrPhone,
          uploadedAt: now,
          updatedAt: now,
          isStarred: false,
          inTrash: false
        };

        onFileAdded(importedFile);
        showToast(
          lang === 'bn' 
            ? `✅ "${importedFile.name}" সফলভাবে আপনার ড্রাইভে যুক্ত করা হয়েছে!` 
            : `✅ "${importedFile.name}" added to your drive!`, 
          'success'
        );
        onClose();
        return;
      }

      // B. If not found in Firestore or it's a web direct URL, try downloading directly
      if (scannedResult?.data?.url) {
        await handleDownloadRemoteFile(scannedResult.data.url, scannedResult.data.fileName);
        return;
      }

      showToast(
        lang === 'bn' 
          ? 'শেয়ারকৃত ফাইলটির বিস্তারিত তথ্য পাওয়া যায়নি বা মেয়াদ শেষ হয়েছে।' 
          : 'Shared file not found or expired.', 
        'error'
      );
    } catch (err: any) {
      console.warn('Import error:', err);
      showToast(lang === 'bn' ? 'ফাইল আমদানি করতে সমস্যা হয়েছে: ' + (err.message || '') : 'Import failed.', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 2. Action: Download Remote File URL directly into Drive
  const handleDownloadRemoteFile = async (url: string, suggestedName?: string) => {
    setIsProcessingAction(true);
    try {
      showToast(lang === 'bn' ? 'ফাইলটি ডাউনলোড করে ড্রাইভে সংরক্ষণ করা হচ্ছে...' : 'Downloading file to drive...', 'info');
      const newFile = await downloadRemoteFile(
        url,
        currentFolderId,
        currentUser?.id || 'default',
        currentUser?.phone,
        currentUser?.email
      );

      if (suggestedName && suggestedName.trim()) {
        newFile.name = suggestedName.trim();
      }

      onFileAdded(newFile);
      showToast(
        lang === 'bn' 
          ? `✅ "${newFile.name}" সফলভাবে ড্রাইভে ডাউনলোড ও সেভ হয়েছে!` 
          : `✅ "${newFile.name}" downloaded to drive!`, 
        'success'
      );
      onClose();
    } catch (err: any) {
      console.warn('Direct URL download error:', err);
      showToast(
        lang === 'bn' 
          ? 'রিমোট ফাইল ডাউনলোড ব্যর্থ হয়েছে। সরাসরি লিংকে গিয়ে ডাউনলোড করুন।' 
          : 'Direct download failed: ' + (err.message || ''), 
        'error'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 3. Action: Connect / Pair Account
  const handleConnectScannedAccount = () => {
    if (!scannedResult?.data) return;
    const { userId, name, email, phone, emailOrPhone, secretName, role, totalStorageBytes } = scannedResult.data;

    if (onConnectAccount) {
      onConnectAccount({
        id: userId,
        name: name || 'User',
        email: email || '',
        phone: phone || '',
        emailOrPhone: emailOrPhone || phone || email || userId,
        secretName: secretName || '',
        role: role || 'user',
        totalStorageBytes: totalStorageBytes || 1000 * 1024 * 1024 * 1024
      });
      showToast(
        lang === 'bn' 
          ? `✅ "${name || 'User'}" এর সাথে অ্যাকাউন্ট কানেক্ট সফল হয়েছে!` 
          : `✅ Connected to "${name || 'User'}"!`, 
        'success'
      );
      onClose();
    }
  };

  // 4. Action: Save plain text as a document file in Drive
  const handleSaveTextAsFile = () => {
    if (!scannedResult?.raw) return;
    const now = new Date().toISOString();
    const content = scannedResult.raw;
    const previewName = content.substring(0, 20).replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_');
    const fileName = `QR_Note_${previewName || 'Text'}.txt`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const textFile: StorageFile = {
        id: 'f_note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        name: fileName,
        size: blob.size,
        type: 'text/plain',
        category: 'document',
        dataUrl: dataUrl,
        uploadedAt: now,
        updatedAt: now,
        isStarred: false,
        isEncrypted: false,
        inTrash: false,
        ownerId: currentUser?.id || 'default',
        ownerPhone: currentUser?.phone,
        ownerEmail: currentUser?.email,
        ownerEmailOrPhone: currentUser?.emailOrPhone,
        folderId: currentFolderId
      };

      onFileAdded(textFile);
      showToast(
        lang === 'bn' ? `✅ "${fileName}" টেক্সট ফাইল হিসেবে ড্রাইভে সেভ হয়েছে!` : `✅ Saved "${fileName}" to drive!`,
        'success'
      );
      onClose();
    };
    reader.readAsDataURL(blob);
  };

  // Copy raw scanned content
  const handleCopyScannedText = () => {
    if (!scannedResult?.raw) return;
    navigator.clipboard.writeText(scannedResult.raw);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    showToast(lang === 'bn' ? 'ক্লিপবোর্ডে কপি করা হয়েছে' : 'Copied to clipboard', 'info');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Scan className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{lang === 'bn' ? 'কিউআর স্ক্যানার ও ডিভাইস কানেক্ট' : 'QR Scanner & Device Connect'}</span>
                <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                  {lang === 'bn' ? 'ক্যামেরা' : 'Camera'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'bn' ? 'অন্য ডিভাইস থেকে ফাইল যোগ করুন বা অ্যাকাউন্টে যুক্ত হোন' : 'Add files from other devices or pair account'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
            title={lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 m-3 sm:mx-5 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => { setActiveTab('scanner'); setScannedResult(null); }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{lang === 'bn' ? '📷 ক্যামেরা স্ক্যানার' : '📷 Camera Scanner'}</span>
          </button>

          <button
            onClick={() => setActiveTab('my_code')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'my_code'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>{lang === 'bn' ? '📲 আমার কানেক্ট QR কোড' : '📲 My Connect QR Code'}</span>
          </button>
        </div>

        {/* Hidden Canvas for QR decoding */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'scanner' ? (
            /* TAB 1: Camera Scanner View */
            <div className="space-y-4">
              {!scannedResult ? (
                <>
                  {/* Camera Viewfinder Box */}
                  <div className="relative aspect-square sm:aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black border-2 border-slate-800 flex items-center justify-center shadow-inner">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />

                    {/* Scanner HUD Overlay */}
                    {isCameraActive && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        {/* Target Box with futuristic glowing corners */}
                        <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-cyan-400/40 rounded-3xl bg-cyan-500/5 backdrop-blur-[1px] shadow-[0_0_30px_rgba(6,182,212,0.15)] flex items-center justify-center">
                          {/* Corner brackets */}
                          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl" />
                          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl" />
                          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-xl" />

                          {/* Animated laser scan line */}
                          <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] animate-[bounce_2.5s_infinite]" />

                          <p className="text-[11px] font-bold text-cyan-300/80 bg-slate-950/70 px-3 py-1 rounded-full border border-cyan-500/30">
                            {lang === 'bn' ? 'QR কোড ফ্রেমে রাখুন' : 'Align QR inside frame'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Camera Error or Disabled overlay */}
                    {(!isCameraActive || cameraError) && (
                      <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-950/90 space-y-3 z-10">
                        <AlertCircle className="w-10 h-10 text-amber-400" />
                        <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                          {cameraError || (lang === 'bn' ? 'ক্যামেরা লোড হচ্ছে...' : 'Initializing camera...')}
                        </p>
                        <button
                          onClick={() => startCamera(selectedDeviceId)}
                          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? 'ক্যামেরা পুনরায় চালু করুন' : 'Retry Camera'}</span>
                        </button>
                      </div>
                    )}

                    {/* Camera Control Overlay Bar (Top) */}
                    {isCameraActive && (
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20">
                        {/* Camera Switcher if multiple cameras */}
                        {videoDevices.length > 1 ? (
                          <button
                            onClick={() => {
                              const currentIndex = videoDevices.findIndex(d => d.deviceId === selectedDeviceId);
                              const nextDevice = videoDevices[(currentIndex + 1) % videoDevices.length];
                              if (nextDevice) {
                                setSelectedDeviceId(nextDevice.deviceId);
                                startCamera(nextDevice.deviceId);
                              }
                            }}
                            className="p-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-cyan-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg cursor-pointer"
                            title={lang === 'bn' ? 'ক্যামেরা পরিবর্তন করুন' : 'Switch camera'}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span className="text-[10px] hidden sm:inline">{lang === 'bn' ? 'ক্যামেরা ফ্লিপ' : 'Flip'}</span>
                          </button>
                        ) : <div />}

                        {/* Torch Toggle if supported */}
                        {hasTorch && (
                          <button
                            onClick={toggleTorch}
                            className={`p-2 rounded-xl backdrop-blur-md border text-xs font-semibold flex items-center gap-1.5 transition shadow-lg cursor-pointer ${
                              isTorchOn 
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold' 
                                : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:text-white'
                            }`}
                            title={lang === 'bn' ? 'ফ্ল্যাশলাইট' : 'Torch'}
                          >
                            {isTorchOn ? <Zap className="w-3.5 h-3.5 fill-slate-950" /> : <ZapOff className="w-3.5 h-3.5" />}
                            <span className="text-[10px] hidden sm:inline">{isTorchOn ? 'Flash ON' : 'Flash'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fallback Option: Upload Image containing QR Code */}
                  <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">
                          {lang === 'bn' ? 'ক্যামেরা সমস্যা হচ্ছে? ছবি আপলোড করুন' : 'Having camera issues? Upload QR Image'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {lang === 'bn' ? 'গ্যালারি বা ফাইল থেকে QR স্ক্রিনশট সিলেক্ট করুন' : 'Select a screenshot or photo of QR code'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'ছবি দিন' : 'Upload'}</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* SCANNED RESULT ACTION CARD */
                <div className="p-5 rounded-2xl bg-slate-950 border-2 border-cyan-500/50 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        {scannedResult.type === 'auth_pair' && <UserCheck className="w-6 h-6" />}
                        {scannedResult.type === 'shared_file' && <HardDrive className="w-6 h-6" />}
                        {scannedResult.type === 'direct_url' && <Globe className="w-6 h-6" />}
                        {scannedResult.type === 'text' && <FileText className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {scannedResult.type === 'auth_pair' && (lang === 'bn' ? 'অ্যাকাউন্ট পেয়ারিং' : 'Account Pair')}
                            {scannedResult.type === 'shared_file' && (lang === 'bn' ? 'শেয়ারকৃত ফাইল' : 'Shared File')}
                            {scannedResult.type === 'direct_url' && (lang === 'bn' ? 'অনলাইন লিংক' : 'Direct Link')}
                            {scannedResult.type === 'text' && (lang === 'bn' ? 'টেক্সট নোট' : 'Plain Text')}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {lang === 'bn' ? 'স্ক্যান সম্পন্ন' : 'Scanned'}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white mt-1 break-all line-clamp-2">
                          {scannedResult.title}
                        </h4>
                      </div>
                    </div>

                    <button
                      onClick={handleResetScan}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                      title={lang === 'bn' ? 'আবার স্ক্যান করুন' : 'Scan another'}
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span className="text-[10px]">{lang === 'bn' ? 'নতুন স্ক্যান' : 'Rescan'}</span>
                    </button>
                  </div>

                  {/* Scanned Description / Data Preview */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                    {scannedResult.description && (
                      <p className="text-[11px] text-slate-400">{scannedResult.description}</p>
                    )}
                    <p className="font-mono text-[11px] text-cyan-300/90 break-all line-clamp-3 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                      {scannedResult.raw}
                    </p>
                  </div>

                  {/* Contextual Action Buttons */}
                  <div className="space-y-2 pt-1">
                    {/* 1. Account Pairing Action */}
                    {scannedResult.type === 'auth_pair' && (
                      <button
                        onClick={handleConnectScannedAccount}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4 stroke-[2.5]" />
                        <span>
                          {lang === 'bn'
                            ? `এই অ্যাকাউন্টে সরাসরি কানেক্ট ও লগইন করুন`
                            : 'Connect & Log In to this Account'}
                        </span>
                      </button>
                    )}

                    {/* 2. Shared File Import Action */}
                    {scannedResult.type === 'shared_file' && (
                      <button
                        disabled={isProcessingAction}
                        onClick={() => handleImportSharedFile(scannedResult.data?.shareId || scannedResult.data?.url || scannedResult.raw)}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Download className="w-4 h-4 stroke-[2.5]" />
                        <span>
                          {isProcessingAction
                            ? (lang === 'bn' ? 'ফাইল আমদানি হচ্ছে...' : 'Importing...')
                            : (lang === 'bn' ? '📥 সরাসরি আমার ড্রাইভে এই ফাইলটি যুক্ত করুন' : 'Add Shared File to My Drive')}
                        </span>
                      </button>
                    )}

                    {/* 3. Direct Online File Download Action */}
                    {scannedResult.type === 'direct_url' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          disabled={isProcessingAction}
                          onClick={() => handleDownloadRemoteFile(scannedResult.raw, scannedResult.data?.fileName)}
                          className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                        >
                          <Download className="w-4 h-4" />
                          <span>
                            {isProcessingAction 
                              ? (lang === 'bn' ? 'ডাউনলোড হচ্ছে...' : 'Downloading...') 
                              : (lang === 'bn' ? 'ড্রাইভে সেভ করুন' : 'Save to Drive')}
                          </span>
                        </button>

                        <a
                          href={scannedResult.raw}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 text-center"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>{lang === 'bn' ? 'ব্রাউজারে খুলুন' : 'Open in Browser'}</span>
                        </a>
                      </div>
                    )}

                    {/* 4. Text Note Save Action */}
                    {scannedResult.type === 'text' && (
                      <button
                        onClick={handleSaveTextAsFile}
                        className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <FileText className="w-4 h-4" />
                        <span>{lang === 'bn' ? '📝 টেক্সট ফাইল হিসেবে ড্রাইভে সেভ করুন' : 'Save as Text File in Drive'}</span>
                      </button>
                    )}

                    {/* Auxiliary: Copy to Clipboard */}
                    <button
                      onClick={handleCopyScannedText}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText ? (lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (lang === 'bn' ? 'লিংক / কোড কপি করুন' : 'Copy Text / Link')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: My Account / Device Connect QR Code */
            <div className="space-y-4 text-center">
              <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center space-y-4">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{currentUser?.name || 'User'} এর ডিভাইস লিংক কোড</span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {lang === 'bn' 
                      ? 'অন্য মোবাইল বা কম্পিউটার দিয়ে এই কিউআর কোড স্ক্যান করলে সরাসরি আপনার অ্যাকাউন্টে কানেক্ট হয়ে যাবে।' 
                      : 'Scan this code with another device to immediately connect and sync files.'}
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-cyan-400/30 relative">
                  {myQRCodeUrl ? (
                    <img 
                      src={myQRCodeUrl} 
                      alt="Account Pairing QR Code" 
                      className="w-60 h-60 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="w-60 h-60 flex flex-col items-center justify-center text-slate-900 gap-2">
                      <RefreshCw className="w-8 h-8 animate-spin text-cyan-600" />
                      <span className="text-xs font-bold">{lang === 'bn' ? 'QR কোড তৈরি হচ্ছে...' : 'Generating QR...'}</span>
                    </div>
                  )}
                </div>

                {/* Account details badge */}
                {currentUser && (
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>{currentUser.emailOrPhone}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-cyan-400 font-bold">{lang === 'bn' ? '১০০০ জিবি ক্লাউড' : '1000GB Cloud'}</span>
                  </div>
                )}

                {/* Download QR image button */}
                {myQRCodeUrl && (
                  <a
                    href={myQRCodeUrl}
                    download={`BasharDrive_QR_${currentUser?.name || 'Connect'}.png`}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>{lang === 'bn' ? 'কিউআর কোড ডাউনলোড করুন' : 'Download QR Image'}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'bn' ? 'ক্যামেরা ফ্রেম ও ইমেজ ডিকোডিং সক্রিয়' : 'Camera frame & image decoding active'}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold transition cursor-pointer"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
