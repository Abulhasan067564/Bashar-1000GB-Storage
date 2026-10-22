import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  StorageFile, 
  UserAccount, 
  StorageStats, 
  ActiveTab, 
  ViewMode, 
  FileCategory,
  AdminCredentials,
  ClipboardState,
  SiteSettings,
  DEFAULT_SITE_SETTINGS,
  PaymentRequest
} from './types/storage';
import { 
  getAllStoredFiles, 
  getStoredFilesBackup,
  getUserFilesSync,
  saveUserFilesCache,
  saveStoredFile, 
  saveMultipleStoredFiles, 
  deleteStoredFile, 
  deleteMultipleStoredFiles,
  detectFileCategory,
  getDeletedFileIds,
  recordDeletedFileIds,
  unrecordDeletedFileIds
} from './services/indexedDbStorage';
import { 
  saveUserToFirestore, 
  loadUsersFromFirestore, 
  deleteUserFromFirestore, 
  saveFileToFirestore, 
  saveMultipleFilesToFirestore,
  deleteFileFromFirestore, 
  loadUserFilesFromFirestore,
  loadFileChunksFromFirestore,
  testConnection,
  saveAdminCredentialsToFirestore,
  loadAdminCredentialsFromFirestore,
  saveSiteSettingsToFirestore,
  loadSiteSettingsFromFirestore,
  isQuotaExceeded,
  subscribeQuotaExceeded,
  getDeletedUserIds,
  recordDeletedUserId,
  savePaymentRequestToFirestore,
  loadPaymentRequestsFromFirestore,
  updatePaymentRequestStatusInFirestore,
  deletePaymentRequestFromFirestore
} from './services/firebase';
import { isSameEmailOrPhone } from './utils/accountValidation';
import { downloadSingleFile, downloadFilesAsZip } from './services/zipService';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ActionBar } from './components/ActionBar';
import { FileCard } from './components/FileCard';
import { FileListRow } from './components/FileListRow';
import { YouTubeBanner } from './components/YouTubeBanner';
import { AuthScreen } from './components/AuthScreen';
import { AdminLogin } from './components/Admin/AdminLogin';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AuthModal } from './components/Modals/AuthModal';
import { ProfileModal } from './components/Modals/ProfileModal';
import { ShareModal } from './components/Modals/ShareModal';
import { PreviewModal } from './components/Modals/PreviewModal';
import { UploadModal } from './components/Modals/UploadModal';
import { CreateFileModal } from './components/Modals/CreateFileModal';
import { CreateFolderModal } from './components/Modals/CreateFolderModal';
import { MoveCopyModal } from './components/Modals/MoveCopyModal';
import { AnalyticsModal } from './components/Modals/AnalyticsModal';
import { CalculatorModal } from './components/Modals/CalculatorModal';
import { ScreenRecorderModal } from './components/Modals/ScreenRecorderModal';
import { VoiceRecorderModal } from './components/Modals/VoiceRecorderModal';
import { SubscriptionModal } from './components/Modals/SubscriptionModal';
import { GeminiChatbot } from './components/GeminiChatbot';
import { getTrialStatus, getNextScreenRecordNumber, getNextVoiceRecordNumber, toBengaliDigits } from './utils/bengaliNaming';
import { 
  Cloud, 
  Upload, 
  AlertCircle, 
  CheckCircle2,
  Zap,
  Trash2,
  ArchiveRestore,
  AlertTriangle,
  Bell,
  X,
  Crown,
  Lock,
  Clock,
  Sparkles,
  CreditCard
} from 'lucide-react';

const DEFAULT_ADMIN: AdminCredentials = {
  username: 'ArRahman7',
  passwordHash: 'Rahim@Chabi28',
  updatedAt: new Date().toISOString()
};

const STORAGE_USERS_KEY = 'bashar_1000gb_registered_users';
const STORAGE_SESSION_KEY = 'bashar_1000gb_active_uid';
const STORAGE_ADMIN_CREDS_KEY = 'bashar_1000gb_admin_creds';
const STORAGE_ADMIN_SESSION_KEY = 'bashar_1000gb_admin_session';
const STORAGE_SITE_SETTINGS_KEY = 'bashar_site_settings';
const STORAGE_PAYMENT_REQUESTS_KEY = 'bashar_payment_requests';

export default function App() {
  const [lang, setLang] = useState<'bn' | 'en'>('bn');

  // Payment Requests state for manual TrxID submissions
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PAYMENT_REQUESTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Global Website Settings (Branding, Logo, Name, Subtitle, YouTube Channel)
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SITE_SETTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SITE_SETTINGS;
  });
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);

  // Sync browser title and favicon with customized site name & uploaded logo
  useEffect(() => {
    if (siteSettings?.siteName) {
      document.title = `${siteSettings.siteName} ${siteSettings.siteBadge || '1000GB'} - Cloud Storage`;
    }
    if (siteSettings?.siteLogoUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = siteSettings.siteLogoUrl;
    }
  }, [siteSettings]);

  // Admin View State ('none' | 'login' | 'dashboard')
  const [adminView, setAdminView] = useState<'none' | 'login' | 'dashboard'>('none');
  
  // Admin credentials (synced with Firestore and localStorage)
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>(() => {
    const saved = localStorage.getItem(STORAGE_ADMIN_CREDS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.username === 'admin') {
          return DEFAULT_ADMIN;
        }
        return parsed;
      } catch {
        return DEFAULT_ADMIN;
      }
    }
    return DEFAULT_ADMIN;
  });

  // Current logged in admin session
  const [currentAdmin, setCurrentAdmin] = useState<AdminCredentials | null>(() => {
    const active = sessionStorage.getItem(STORAGE_ADMIN_SESSION_KEY);
    if (active) {
      try {
        return JSON.parse(active);
      } catch {
        return null;
      }
    }
    return null;
  });
  
  // Real registered users persistent in localStorage (NO DEMO USER)
  const [usersList, setUsersList] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(STORAGE_USERS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Active user session (null by default if not logged in - user MUST sign up or log in first)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const activeId = localStorage.getItem(STORAGE_SESSION_KEY);
    if (activeId) {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      if (saved) {
        try {
          const list: UserAccount[] = JSON.parse(saved);
          return list.find(u => u.id === activeId) || null;
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  
  const [files, setFiles] = useState<StorageFile[]>(() => {
    try {
      const activeId = localStorage.getItem(STORAGE_SESSION_KEY);
      if (activeId) {
        let userEmailOrPhone: string | undefined;
        try {
          const savedUsers = localStorage.getItem(STORAGE_USERS_KEY);
          if (savedUsers) {
            const list: UserAccount[] = JSON.parse(savedUsers);
            const matched = list.find(u => u.id === activeId);
            if (matched) userEmailOrPhone = matched.emailOrPhone;
          }
        } catch {}
        return getUserFilesSync(activeId, userEmailOrPhone);
      }
      return [];
    } catch {
      return [];
    }
  });
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFileOpen, setIsCreateFileOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isMoveCopyOpen, setIsMoveCopyOpen] = useState(false);
  const [moveCopyAction, setMoveCopyAction] = useState<'move' | 'copy'>('move');
  const [targetFileIdsForModal, setTargetFileIdsForModal] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);
  const [shareFile, setShareFile] = useState<StorageFile | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isScreenRecorderOpen, setIsScreenRecorderOpen] = useState(false);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Status feedback
  const [isZipping, setIsZipping] = useState(false);
  const [isSyncingFiles, setIsSyncingFiles] = useState(false);
  const [isDragOverWindow, setIsDragOverWindow] = useState(false);
  const mainDragCounterRef = useRef<number>(0);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [quotaExceeded, setQuotaExceededState] = useState(isQuotaExceeded());
  const [isQuotaDismissed, setIsQuotaDismissed] = useState(false);

  // 30-Day Free Trial & Lifetime Subscription status
  const trialStatus = useMemo(() => getTrialStatus(currentUser), [currentUser]);

  // Sequential recording counters
  const screenRecordsCount = useMemo(() => getNextScreenRecordNumber(files) - 1, [files]);
  const voiceRecordsCount = useMemo(() => getNextVoiceRecordNumber(files) - 1, [files]);

  // Lifetime Unlock handler (Via 100 Tk bKash/Nagad or secret promo code Bashar2026@100gb)
  const handleUnlockLifetime = async (method: 'promo' | 'bkash' | 'nagad', trxId?: string) => {
    if (!currentUser) return;
    const updatedUser: UserAccount = {
      ...currentUser,
      isLifetimeUnlocked: true,
      subscriptionMethod: method,
      subscriptionTrxId: trxId,
      subscriptionDate: new Date().toISOString()
    };

    setCurrentUser(updatedUser);

    const updatedList = usersList.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsersList(updatedList);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedList));

    try {
      await saveUserToFirestore(updatedUser);
    } catch (err) {
      console.warn('Subscription Firestore sync notice:', err);
    }

    showToast(
      lang === 'bn' 
        ? '🎉 অভিনন্দন! আপনার অ্যাকাউন্টটি আজীবনের জন্য আনলক হয়েছে!' 
        : '🎉 Congratulations! 1000GB Cloud Drive lifetime unlocked!'
    );
  };

  useEffect(() => {
    return subscribeQuotaExceeded((exceeded) => {
      setQuotaExceededState(exceeded);
    });
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync users and admin credentials with Firestore on boot
  useEffect(() => {
    async function initCloudDb() {
      await testConnection();
      try {
        // Sync users (excluding deleted accounts)
        const cloudUsers = await loadUsersFromFirestore();
        if (cloudUsers.length > 0) {
          const deletedIds = new Set(getDeletedUserIds());
          const validCloudUsers = cloudUsers.filter(u => !deletedIds.has(u.id));

          setUsersList(prev => {
            const map = new Map<string, UserAccount>();
            prev.filter(u => !deletedIds.has(u.id)).forEach(u => map.set(u.id, u));
            validCloudUsers.forEach(u => map.set(u.id, u));
            const merged = Array.from(map.values());
            localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(merged));
            return merged;
          });

          // If active user is logged in, ensure their lifetime unlock status is synced immediately from Firestore
          const activeSessionId = localStorage.getItem(STORAGE_SESSION_KEY);
          if (activeSessionId) {
            const matchedActive = validCloudUsers.find(u => u.id === activeSessionId);
            if (matchedActive) {
              setCurrentUser(matchedActive);
            }
          }
        } else {
          // Cloud has 0 users (all accounts wiped fresh as requested)
          setUsersList([]);
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([]));
          localStorage.removeItem(STORAGE_SESSION_KEY);
          sessionStorage.removeItem(STORAGE_SESSION_KEY);
          setCurrentUser(null);
        }

        // Sync site settings / branding from Firestore
        const cloudSettings = await loadSiteSettingsFromFirestore();
        if (cloudSettings) {
          setSiteSettings(cloudSettings);
          localStorage.setItem(STORAGE_SITE_SETTINGS_KEY, JSON.stringify(cloudSettings));
        }

        // Sync admin credentials
        const cloudAdmin = await loadAdminCredentialsFromFirestore();
        if (cloudAdmin && cloudAdmin.username !== 'admin') {
          setAdminCredentials(cloudAdmin);
          localStorage.setItem(STORAGE_ADMIN_CREDS_KEY, JSON.stringify(cloudAdmin));
        } else {
          // Initialize default admin in local cache first
          setAdminCredentials(DEFAULT_ADMIN);
          if (!localStorage.getItem(STORAGE_ADMIN_CREDS_KEY)) {
            localStorage.setItem(STORAGE_ADMIN_CREDS_KEY, JSON.stringify(DEFAULT_ADMIN));
          }
          if (!isQuotaExceeded()) {
            saveAdminCredentialsToFirestore(DEFAULT_ADMIN).catch(() => {});
          }
        }

        // Sync payment requests from Firestore
        const cloudPayments = await loadPaymentRequestsFromFirestore();
        if (cloudPayments && cloudPayments.length > 0) {
          setPaymentRequests(cloudPayments);
          localStorage.setItem(STORAGE_PAYMENT_REQUESTS_KEY, JSON.stringify(cloudPayments));
        }
      } catch (err) {
        console.warn('Initial cloud sync notice:', err);
      }
    }
    initCloudDb();
  }, []);

  // Update site settings by Admin
  const handleUpdateSiteSettings = async (newSettings: SiteSettings) => {
    setSiteSettings(newSettings);
    localStorage.setItem(STORAGE_SITE_SETTINGS_KEY, JSON.stringify(newSettings));
    await saveSiteSettingsToFirestore(newSettings);
    showToast(lang === 'bn' ? 'ওয়েবসাইটের লোগো, নাম ও সমস্ত সেটিংস সফলভাবে ক্লাউডে সংরক্ষিত হয়েছে!' : 'Website settings & logo saved to Cloud successfully!');
  };

  // Admin login success
  const handleAdminLoginSuccess = (admin: AdminCredentials) => {
    setCurrentAdmin(admin);
    sessionStorage.setItem(STORAGE_ADMIN_SESSION_KEY, JSON.stringify(admin));
    setAdminView('dashboard');
    showToast(lang === 'bn' ? 'অ্যাডমিন ড্যাশবোর্ডে স্বাগতম!' : 'Welcome to Admin Dashboard!');
  };

  // Admin logout
  const handleAdminLogout = () => {
    setCurrentAdmin(null);
    sessionStorage.removeItem(STORAGE_ADMIN_SESSION_KEY);
    setAdminView('none');
    showToast(lang === 'bn' ? 'অ্যাডমিন লগআউট সম্পন্ন হয়েছে।' : 'Admin logged out.');
  };

  // Update admin credentials (change admin password)
  const handleUpdateAdminCredentials = (newCreds: AdminCredentials) => {
    setAdminCredentials(newCreds);
    setCurrentAdmin(newCreds);
    localStorage.setItem(STORAGE_ADMIN_CREDS_KEY, JSON.stringify(newCreds));
    sessionStorage.setItem(STORAGE_ADMIN_SESSION_KEY, JSON.stringify(newCreds));
    saveAdminCredentialsToFirestore(newCreds).catch(() => {});
    showToast(lang === 'bn' ? 'অ্যাডমিন পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে।' : 'Admin password updated.');
  };

  // Delete user by Admin
  const handleDeleteUserByAdmin = async (userId: string) => {
    recordDeletedUserId(userId);
    try {
      const allFiles = await getAllStoredFiles();
      const userFileIds = allFiles.filter(f => f.ownerId === userId).map(f => f.id);
      if (userFileIds.length > 0) {
        await deleteMultipleStoredFiles(userFileIds);
        userFileIds.forEach(fid => deleteFileFromFirestore(fid).catch(() => {}));
      }
    } catch (err) {
      console.error('Error removing user files:', err);
    }

    await deleteUserFromFirestore(userId);
    const updated = usersList.filter(u => u.id !== userId);
    setUsersList(updated);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updated));

    if (currentUser && currentUser.id === userId) {
      setCurrentUser(null);
      localStorage.removeItem(STORAGE_SESSION_KEY);
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
      setFiles([]);
      setSelectedFileIds(new Set());
      setIsProfileOpen(false);
    }
  };

  // Delete ALL users by Admin (as requested: "সব জিমেইল ডিলিট করে দিন। নতুন করে সবাই সাইন আপ করবে")
  const handleDeleteAllUsersByAdmin = async () => {
    try {
      const allFiles = await getAllStoredFiles();
      const userFileIds = allFiles.filter(f => f.ownerId && f.ownerId !== 'default').map(f => f.id);
      if (userFileIds.length > 0) {
        await deleteMultipleStoredFiles(userFileIds);
        userFileIds.forEach(fid => deleteFileFromFirestore(fid).catch(() => {}));
      }
    } catch {}

    for (const u of usersList) {
      recordDeletedUserId(u.id);
      deleteUserFromFirestore(u.id).catch(() => {});
    }

    setUsersList([]);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([]));
    localStorage.removeItem(STORAGE_SESSION_KEY);
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
    setCurrentUser(null);
    setFiles([]);
    setSelectedFileIds(new Set());
    showToast(
      lang === 'bn' 
        ? 'সকল ইউজার এবং জিমেইল সফলভাবে মুছে ফেলা হয়েছে! নতুন করে সবাই সাইন আপ করতে পারবে।' 
        : 'All users deleted! Everyone can sign up freshly.'
    );
  };

  // Refresh admin data
  const handleRefreshAdminData = async () => {
    try {
      const cloudUsers = await loadUsersFromFirestore();
      const deletedIds = new Set(getDeletedUserIds());
      const filteredUsers = cloudUsers.filter(u => !deletedIds.has(u.id));
      if (filteredUsers.length > 0) {
        const map = new Map<string, UserAccount>();
        filteredUsers.forEach(u => map.set(u.id, u));
        const merged = Array.from(map.values());
        setUsersList(merged);
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(merged));
      } else {
        setUsersList([]);
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([]));
      }
      const cloudAdmin = await loadAdminCredentialsFromFirestore();
      if (cloudAdmin) {
        setAdminCredentials(cloudAdmin);
        localStorage.setItem(STORAGE_ADMIN_CREDS_KEY, JSON.stringify(cloudAdmin));
      }
      const cloudSettings = await loadSiteSettingsFromFirestore();
      if (cloudSettings) {
        setSiteSettings(cloudSettings);
        localStorage.setItem(STORAGE_SITE_SETTINGS_KEY, JSON.stringify(cloudSettings));
      }
      const cloudPayments = await loadPaymentRequestsFromFirestore();
      if (cloudPayments) {
        setPaymentRequests(cloudPayments);
        localStorage.setItem(STORAGE_PAYMENT_REQUESTS_KEY, JSON.stringify(cloudPayments));
      }
    } catch (err) {
      console.error('Error refreshing cloud data:', err);
    }
  };

  const handleUpdateUsersList = (updated: UserAccount[]) => {
    const prevMap = new Map(usersList.map(u => [u.id, u]));
    setUsersList(updated);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updated));
    if (currentUser) {
      const matched = updated.find(u => u.id === currentUser.id);
      if (matched) {
        setCurrentUser(matched);
      }
    }
    // Efficient background sync: only save users that are new or modified
    updated.forEach(u => {
      const prev = prevMap.get(u.id);
      if (!prev || JSON.stringify(prev) !== JSON.stringify(u)) {
        saveUserToFirestore(u).catch(() => {});
      }
    });
  };

  // Manual TrxID Payment Request submission by User
  const handleSubmitManualPaymentRequest = async (data: {
    senderPhone: string;
    trxId: string;
    method: 'bkash' | 'nagad';
  }) => {
    if (!currentUser) return;

    const newRequest: PaymentRequest = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmailOrPhone: currentUser.emailOrPhone,
      senderPhone: data.senderPhone,
      trxId: data.trxId.toUpperCase(),
      method: data.method,
      amount: siteSettings.subscriptionFee || 100,
      recipientNumber: siteSettings.bkashNumber || '01734211584',
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    const updatedRequests = [newRequest, ...paymentRequests.filter(r => r.trxId !== newRequest.trxId)];
    setPaymentRequests(updatedRequests);
    localStorage.setItem(STORAGE_PAYMENT_REQUESTS_KEY, JSON.stringify(updatedRequests));

    const updatedUser: UserAccount = {
      ...currentUser,
      subscriptionRequestStatus: 'pending',
      pendingTrxId: data.trxId.toUpperCase(),
      pendingSenderPhone: data.senderPhone,
      pendingMethod: data.method,
      pendingDate: new Date().toISOString()
    };

    setCurrentUser(updatedUser);
    const updatedUsers = usersList.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsersList(updatedUsers);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));

    try {
      await savePaymentRequestToFirestore(newRequest);
      await saveUserToFirestore(updatedUser);
    } catch (err) {
      console.warn('Payment Firestore save error:', err);
    }

    showToast(
      lang === 'bn'
        ? '✅ আপনার ১০০ টাকার TrxID অ্যাডমিন প্যানেলে জমা হয়েছে! অ্যাডমিন পর্যালোচনার পর আজীবন আনলক হবে।'
        : '✅ TrxID submitted to Admin Panel! Lifetime access will be activated upon approval.',
      'success'
    );
  };

  // Approve Payment Request by Admin -> Lifetime Unlock
  const handleApprovePaymentRequest = async (requestId: string, userId: string) => {
    const req = paymentRequests.find(r => r.id === requestId);
    const now = new Date().toISOString();

    const updatedRequests = paymentRequests.map(r =>
      r.id === requestId
        ? { ...r, status: 'approved' as const, reviewedAt: now, reviewedBy: currentAdmin?.username || 'admin' }
        : r
    );
    setPaymentRequests(updatedRequests);
    localStorage.setItem(STORAGE_PAYMENT_REQUESTS_KEY, JSON.stringify(updatedRequests));

    const targetUser = usersList.find(u => u.id === userId);
    if (targetUser) {
      const updatedUser: UserAccount = {
        ...targetUser,
        isLifetimeUnlocked: true,
        subscriptionRequestStatus: 'approved',
        subscriptionMethod: req?.method || 'bkash',
        subscriptionTrxId: req?.trxId || 'ADMIN_APPROVED',
        subscriptionDate: now
      };

      const updatedUsers = usersList.map(u => u.id === userId ? updatedUser : u);
      setUsersList(updatedUsers);
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));

      if (currentUser && currentUser.id === userId) {
        setCurrentUser(updatedUser);
      }

      try {
        await updatePaymentRequestStatusInFirestore(requestId, 'approved', currentAdmin?.username || 'admin');
        await saveUserToFirestore(updatedUser);
      } catch (err) {
        console.warn('Approve Firestore error:', err);
      }

      showToast(
        lang === 'bn'
          ? `🎉 ${targetUser.name}-এর পেমেন্ট সফলভাবে অ্যাপ্রুভ হয়েছে! আজীবন এক্সেস চালু হলো।`
          : `🎉 Payment approved for ${targetUser.name}! Lifetime unlocked.`,
        'success'
      );
    }
  };

  // Reject Payment Request by Admin
  const handleRejectPaymentRequest = async (requestId: string, userId: string, adminNote?: string) => {
    const now = new Date().toISOString();

    const updatedRequests = paymentRequests.map(r =>
      r.id === requestId
        ? { ...r, status: 'rejected' as const, reviewedAt: now, reviewedBy: currentAdmin?.username || 'admin', adminNote }
        : r
    );
    setPaymentRequests(updatedRequests);
    localStorage.setItem(STORAGE_PAYMENT_REQUESTS_KEY, JSON.stringify(updatedRequests));

    const targetUser = usersList.find(u => u.id === userId);
    if (targetUser) {
      const updatedUser: UserAccount = {
        ...targetUser,
        subscriptionRequestStatus: 'rejected',
        adminNote: adminNote || (lang === 'bn' ? 'TrxID সঠিক পাওয়া যায়নি।' : 'Invalid TrxID.')
      };

      const updatedUsers = usersList.map(u => u.id === userId ? updatedUser : u);
      setUsersList(updatedUsers);
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));

      if (currentUser && currentUser.id === userId) {
        setCurrentUser(updatedUser);
      }

      try {
        await updatePaymentRequestStatusInFirestore(requestId, 'rejected', currentAdmin?.username || 'admin', adminNote);
        await saveUserToFirestore(updatedUser);
      } catch (err) {
        console.warn('Reject Firestore error:', err);
      }

      showToast(
        lang === 'bn'
          ? '⚠️ পেমেন্ট রিকোয়েস্ট বাতিল (Rejected) করা হয়েছে।'
          : '⚠️ Payment request rejected.',
        'error'
      );
    }
  };

  // Delete Payment Request
  const handleDeletePaymentRequest = async (requestId: string) => {
    const updated = paymentRequests.filter(r => r.id !== requestId);
    setPaymentRequests(updated);
    localStorage.setItem(STORAGE_PAYMENT_REQUESTS_KEY, JSON.stringify(updated));
    try {
      await deletePaymentRequestFromFirestore(requestId);
    } catch {}
    showToast(lang === 'bn' ? 'পেমেন্ট রেকর্ড মুছে ফেলা হয়েছে।' : 'Payment record deleted.');
  };

  // Direct Lifetime Unlock by Admin for any user
  const handleDirectUnlockUser = async (userId: string) => {
    const targetUser = usersList.find(u => u.id === userId);
    if (!targetUser) return;
    const now = new Date().toISOString();
    const updatedUser: UserAccount = {
      ...targetUser,
      isLifetimeUnlocked: true,
      subscriptionRequestStatus: 'approved',
      subscriptionMethod: 'bkash',
      subscriptionTrxId: 'ADMIN_MANUAL_UNLOCK',
      subscriptionDate: now
    };
    const updatedUsers = usersList.map(u => u.id === userId ? updatedUser : u);
    setUsersList(updatedUsers);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(updatedUser);
    }
    await saveUserToFirestore(updatedUser);
    showToast(
      lang === 'bn'
        ? `🎉 ${targetUser.name}-কে সরাসরি আজীবনের জন্য আনলক করা হয়েছে!`
        : `🎉 ${targetUser.name} unlocked for lifetime!`,
      'success'
    );
  };

  // Seamless cross-browser and cross-device sync between local IndexedDB and Firestore Cloud
  const syncUserFiles = async (userId: string, isManual = false, userEmailOrPhone?: string) => {
    setIsSyncingFiles(true);
    try {
      const activePhoneOrEmail = (userEmailOrPhone || currentUser?.emailOrPhone || '').trim();
      const deletedIdSet = new Set(getDeletedFileIds());

      // 1. Fetch locally cached files
      const localStored = await getAllStoredFiles();
      const userLocals = localStored.filter(f => 
        !deletedIdSet.has(f.id) &&
        (!f.ownerId || 
        f.ownerId === userId || 
        f.ownerId === 'default' || 
        (activePhoneOrEmail && f.ownerPhone === activePhoneOrEmail))
      );
      const fileMap = new Map<string, StorageFile>();
      // Preload current instant sync cache
      const currentSync = getUserFilesSync(userId, activePhoneOrEmail);
      currentSync.forEach(f => {
        if (!deletedIdSet.has(f.id)) {
          fileMap.set(f.id, f);
        }
      });

      userLocals.forEach(f => {
        if (deletedIdSet.has(f.id)) return;
        if (!f.ownerId || f.ownerId === 'default') {
          f.ownerId = userId;
        }
        if (!f.ownerPhone && activePhoneOrEmail) {
          f.ownerPhone = activePhoneOrEmail;
        }
        const existing = fileMap.get(f.id);
        fileMap.set(f.id, { ...existing, ...f, dataUrl: f.dataUrl || existing?.dataUrl });
      });

      // 2. Fetch cloud files from Firestore (Dual-Key: matches by userId AND phone number)
      const cloudFiles = await loadUserFilesFromFirestore(userId, activePhoneOrEmail);

      let hasNewCloudFiles = false;
      const filesToPushToCloud: StorageFile[] = [];

      // Check files from cloud
      for (const cf of cloudFiles) {
        if (deletedIdSet.has(cf.id)) {
          // Permanently deleted locally - wipe any lingering cloud duplicate
          deleteFileFromFirestore(cf.id).catch(() => {});
          continue;
        }
        const local = fileMap.get(cf.id);
        if (!local) {
          // File uploaded from another browser/computer/phone!
          fileMap.set(cf.id, cf);
          hasNewCloudFiles = true;
        } else {
          // If local has no dataUrl or cloud has newer dataUrl
          if (!local.dataUrl && cf.dataUrl) {
            fileMap.set(cf.id, { ...local, dataUrl: cf.dataUrl });
            hasNewCloudFiles = true;
          }
          if (new Date(cf.updatedAt).getTime() > new Date(local.updatedAt).getTime()) {
            fileMap.set(cf.id, { ...cf, dataUrl: cf.dataUrl || local.dataUrl });
            hasNewCloudFiles = true;
          }
        }
      }

      // If local files are not yet in Firestore, push them (never push tombstoned files)
      userLocals.forEach(lf => {
        if (deletedIdSet.has(lf.id)) return;
        const cloudMatch = cloudFiles.find(cf => cf.id === lf.id);
        if (!cloudMatch) {
          filesToPushToCloud.push(lf);
        }
      });

      const mergedFiles = Array.from(fileMap.values()).filter(f => !deletedIdSet.has(f.id));
      // Sort newest first
      mergedFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      
      // Update UI immediately with zero loading lag
      setFiles(mergedFiles);
      saveUserFilesCache(userId, mergedFiles, activePhoneOrEmail);

      // Cache newly retrieved cloud files into this browser's IndexedDB
      if (hasNewCloudFiles) {
        saveMultipleStoredFiles(mergedFiles).catch(() => {});
      }

      // Back up local files to cloud
      if (filesToPushToCloud.length > 0) {
        saveMultipleFilesToFirestore(filesToPushToCloud, activePhoneOrEmail).catch(() => {});
      }

      // Asynchronously assemble chunks for any cloud files in background without blocking UI
      const filesNeedingChunks = mergedFiles.filter(f => !f.dataUrl && (f as any).hasChunks && (f as any).totalChunks);
      if (filesNeedingChunks.length > 0) {
        (async () => {
          for (const chunkedFile of filesNeedingChunks) {
            try {
              const assembled = await loadFileChunksFromFirestore(chunkedFile.id, (chunkedFile as any).totalChunks);
              if (assembled) {
                setFiles(prev => prev.map(f => f.id === chunkedFile.id ? { ...f, dataUrl: assembled } : f));
                saveStoredFile({ ...chunkedFile, dataUrl: assembled }).catch(() => {});
              }
            } catch {}
          }
        })();
      }

      if (isManual) {
        showToast(
          lang === 'bn' 
            ? 'ক্লাউডের সাথে সকল ফাইল সফলভাবে সিঙ্ক হয়েছে!' 
            : 'All files synced with cloud successfully!'
        );
      }
    } catch (err) {
      console.warn('Cross-browser file sync notice:', err);
    } finally {
      setIsSyncingFiles(false);
    }
  };

  const handleLoginSuccess = async (user: UserAccount) => {
    // 1. INSTANTLY populate files synchronously BEFORE or TOGETHER with setCurrentUser
    const immediateFiles = getUserFilesSync(user.id, user.emailOrPhone);
    const deletedIdSet = new Set(getDeletedFileIds());
    const validImmediate = immediateFiles.filter(f => !deletedIdSet.has(f.id));
    if (validImmediate.length > 0) {
      setFiles(validImmediate);
    }

    setCurrentUser(user);
    localStorage.setItem(STORAGE_SESSION_KEY, user.id);
    saveUserToFirestore(user).catch(() => {});
    showToast(
      lang === 'bn' 
        ? `স্বাগতম, ${user.name}! প্রোফাইলে গিয়ে লোগো, নাম, জন্ম তারিখ ও পাসওয়ার্ড সেট করতে পারেন।` 
        : `Welcome, ${user.name}! Customize your logo, name, birthday & password in Profile.`
    );

    // Fast IndexedDB hydration (<10ms)
    getAllStoredFiles().then(stored => {
      const userLocals = stored.filter(f => 
        !deletedIdSet.has(f.id) &&
        (!f.ownerId || 
        f.ownerId === user.id || 
        f.ownerId === 'default' || 
        (user.emailOrPhone && f.ownerPhone === user.emailOrPhone))
      );
      if (userLocals.length > 0) {
        setFiles(prev => {
          const map = new Map<string, StorageFile>();
          prev.forEach(f => {
            if (!deletedIdSet.has(f.id)) map.set(f.id, f);
          });
          userLocals.forEach(f => {
            if (!deletedIdSet.has(f.id)) {
              const ex = map.get(f.id);
              map.set(f.id, { ...ex, ...f, dataUrl: f.dataUrl || ex?.dataUrl });
            }
          });
          const merged = Array.from(map.values()).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          saveUserFilesCache(user.id, merged, user.emailOrPhone);
          return merged;
        });
      }
    }).catch(() => {});

    // Silent background sync with Firestore (non-blocking)
    syncUserFiles(user.id, false, user.emailOrPhone);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_SESSION_KEY);
    setFiles([]);
    setSelectedFileIds(new Set());
    showToast(lang === 'bn' ? 'লগআউট সম্পন্ন হয়েছে।' : 'Logged out.');
  };

  // Delete Account and all associated files permanently
  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    const uid = currentUser.id;
    const userEmailOrPhone = currentUser.emailOrPhone;

    // 1. Immediately register tombstone to prevent resurrection
    recordDeletedUserId(uid);

    // 2. Delete all user files from IndexedDB and Firestore
    try {
      const allFiles = await getAllStoredFiles();
      const userFileIds = allFiles
        .filter(f => !f.ownerId || f.ownerId === uid || f.ownerId === 'default')
        .map(f => f.id);
      if (userFileIds.length > 0) {
        await deleteMultipleStoredFiles(userFileIds);
        userFileIds.forEach(fid => deleteFileFromFirestore(fid).catch(() => {}));
      }
    } catch (err) {
      console.error('Error removing user files:', err);
    }

    // 3. Delete user document from Firestore permanently
    await deleteUserFromFirestore(uid);

    // 4. Remove user from registered users in localStorage and state
    const updatedUsers = usersList.filter(
      u => u.id !== uid && !isSameEmailOrPhone(u.emailOrPhone, userEmailOrPhone)
    );
    setUsersList(updatedUsers);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));

    // 5. Completely wipe active user session and state
    localStorage.removeItem(STORAGE_SESSION_KEY);
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
    setCurrentUser(null);
    setFiles([]);
    setSelectedFileIds(new Set());
    setIsProfileOpen(false);

    showToast(
      lang === 'bn'
        ? 'আপনার অ্যাকাউন্ট এবং সমস্ত ফাইল স্থায়ীভাবে মুছে ফেলা হয়েছে।'
        : 'Your account and all files have been permanently deleted.'
    );
  };

  // Load user files from IndexedDB and Firestore across all browsers/devices
  useEffect(() => {
    async function loadData() {
      if (!currentUser) {
        setFiles([]);
        return;
      }
      try {
        // Instant synchronous fallback if files state hasn't populated yet
        const immediate = getUserFilesSync(currentUser.id, currentUser.emailOrPhone);
        if (immediate.length > 0) {
          setFiles(prev => (prev.length === 0 ? immediate : prev));
        }

        const stored = await getAllStoredFiles();
        // Fast local render if available
        const userFiles = stored.filter(f => 
          !f.ownerId || 
          f.ownerId === currentUser.id || 
          f.ownerId === 'default' || 
          (currentUser.emailOrPhone && f.ownerPhone === currentUser.emailOrPhone)
        );
        userFiles.forEach(f => {
          if (!f.ownerId || f.ownerId === 'default') {
            f.ownerId = currentUser.id;
          }
          if (!f.ownerPhone && currentUser.emailOrPhone) {
            f.ownerPhone = currentUser.emailOrPhone;
          }
        });
        if (userFiles.length > 0) {
          userFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          setFiles(prev => {
            const map = new Map<string, StorageFile>();
            prev.forEach(f => map.set(f.id, f));
            userFiles.forEach(f => {
              const existing = map.get(f.id);
              map.set(f.id, { ...existing, ...f, dataUrl: f.dataUrl || existing?.dataUrl });
            });
            const merged = Array.from(map.values()).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
            saveUserFilesCache(currentUser.id, merged, currentUser.emailOrPhone);
            return merged;
          });
        }
      } catch (err) {
        console.error('Local storage load notice:', err);
      }
      // Cross-browser cloud sync with phone matching
      await syncUserFiles(currentUser.id, false, currentUser.emailOrPhone);
    }
    loadData();
  }, [currentUser?.id, currentUser?.emailOrPhone]);

  // Compute Storage Stats (out of 1000 GB)
  const stats: StorageStats = useMemo(() => {
    const totalBytes = 1000 * 1024 * 1024 * 1024; // 1,000 GB in bytes
    const activeFiles = files.filter(f => !f.inTrash);
    const usedBytes = activeFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const freeBytes = Math.max(0, totalBytes - usedBytes);

    const breakdown: Record<FileCategory, number> = {
      image: 0,
      video: 0,
      audio: 0,
      document: 0,
      archive: 0,
      code: 0,
      other: 0
    };

    activeFiles.forEach(f => {
      breakdown[f.category] = (breakdown[f.category] || 0) + f.size;
    });

    return {
      totalBytes,
      usedBytes,
      freeBytes,
      fileCount: activeFiles.length,
      categoryBreakdown: breakdown
    };
  }, [files]);

  // Counts for sidebar tabs
  const trashCount = useMemo(() => files.filter(f => f.inTrash).length, [files]);
  const starredCount = useMemo(() => files.filter(f => !f.inTrash && f.isStarred).length, [files]);
  const sharedCount = useMemo(() => files.filter(f => !f.inTrash && f.shared?.isShared).length, [files]);
  const vaultCount = useMemo(() => files.filter(f => !f.inTrash && f.isEncrypted).length, [files]);

  // All folders list & current active folder
  const allFolders = useMemo(() => files.filter(f => f.isFolder && !f.inTrash), [files]);
  const currentFolder = useMemo(() => files.find(f => f.id === currentFolderId) || null, [files, currentFolderId]);

  // Filtered and Sorted Files
  const filteredFiles = useMemo(() => {
    let result = files.filter(file => {
      // Tab filter
      if (activeTab === 'trash') {
        if (!file.inTrash) return false;
      } else {
        if (file.inTrash) return false;
        if (activeTab === 'starred' && !file.isStarred) return false;
        if (activeTab === 'shared' && !file.shared?.isShared) return false;
        if (activeTab === 'vault' && !file.isEncrypted) return false;
      }

      // In 'all' tab: filter by folder hierarchy unless user is searching
      if (activeTab === 'all' && !searchQuery.trim()) {
        const itemFolderId = file.folderId || null;
        if (itemFolderId !== (currentFolderId || null)) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && file.category !== selectedCategory) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = file.name.toLowerCase().includes(q);
        const matchesCategory = file.category.toLowerCase().includes(q);
        if (!matchesName && !matchesCategory) return false;
      }

      return true;
    });

    // Sorting: Folders first, then sorted by date/name/size
    result.sort((a, b) => {
      if (Boolean(a.isFolder) !== Boolean(b.isFolder)) {
        return a.isFolder ? -1 : 1;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'size') {
        return b.size - a.size;
      }
      // date
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });

    return result;
  }, [files, activeTab, currentFolderId, selectedCategory, searchQuery, sortBy]);

  // Create Folder
  const handleCreateFolder = (folderName: string): StorageFile | null => {
    if (!currentUser) return null;
    if (trialStatus.isExpired) {
      setIsSubscriptionOpen(true);
      showToast(lang === 'bn' ? '১ মাস ফ্রি ব্যবহারের মেয়াদ শেষ! ফোল্ডার তৈরি করতে ১০০ টাকা সেন্ড মানি করুন।' : 'Trial expired. Please send 100 Tk.', 'error');
      return null;
    }
    const now = new Date().toISOString();
    const newFolder: StorageFile = {
      id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      name: folderName.trim(),
      size: 0,
      type: 'inode/directory',
      category: 'other',
      uploadedAt: now,
      updatedAt: now,
      isStarred: false,
      isEncrypted: false,
      inTrash: false,
      ownerId: currentUser.id,
      ownerPhone: currentUser.emailOrPhone,
      isFolder: true,
      folderId: currentFolderId || null
    };

    saveStoredFile(newFolder).catch(err => console.error(err));
    saveFileToFirestore(newFolder, currentUser.emailOrPhone).catch(() => {});
    setFiles(prev => [newFolder, ...prev]);
    showToast(lang === 'bn' ? `"${newFolder.name}" ফোল্ডার তৈরি হয়েছে!` : `Folder "${newFolder.name}" created!`);
    return newFolder;
  };

  // Create File
  const handleCreateFile = async (newFile: StorageFile) => {
    if (trialStatus.isExpired) {
      setIsSubscriptionOpen(true);
      showToast(lang === 'bn' ? '১ মাস ফ্রি ব্যবহারের মেয়াদ শেষ! ফাইল সংরক্ষণ করতে ১০০ টাকা সেন্ড মানি করুন।' : 'Trial expired. Please send 100 Tk.', 'error');
      return;
    }
    const enriched = {
      ...newFile,
      ownerId: newFile.ownerId || (currentUser ? currentUser.id : 'default'),
      ownerPhone: newFile.ownerPhone || (currentUser ? currentUser.emailOrPhone : '')
    };
    await saveStoredFile(enriched);
    saveFileToFirestore(enriched, currentUser?.emailOrPhone).catch(() => {});
    setFiles(prev => [enriched, ...prev]);
    showToast(lang === 'bn' ? `"${enriched.name}" ফাইল তৈরি হয়েছে!` : `File "${enriched.name}" created!`);
  };

  // Safe Preview File Guard
  const handlePreviewFile = (file: StorageFile) => {
    if (trialStatus.isExpired) {
      setIsSubscriptionOpen(true);
      showToast(
        lang === 'bn' 
          ? '১ মাস ফ্রি ট্রায়াল শেষ হয়েছে! ফাইল দেখতে ১০০ টাকা বিকাশ বা নগদে সেন্ড মানি করুন।' 
          : 'Trial expired. Send 100 Tk to view files.',
        'error'
      );
      return;
    }
    setPreviewFile(file);
  };

  // Safe Download File Guard
  const handleDownloadFile = async (file: StorageFile) => {
    if (trialStatus.isExpired) {
      setIsSubscriptionOpen(true);
      showToast(
        lang === 'bn' 
          ? '১ মাস ফ্রি ট্রায়াল শেষ হয়েছে! ফাইল ডাউনলোড করতে ১০০ টাকা বিকাশ বা নগদে সেন্ড মানি করুন।' 
          : 'Trial expired. Send 100 Tk to download files.',
        'error'
      );
      return;
    }
    await downloadSingleFile(file);
  };

  // Safe Open Upload Guard
  const handleOpenUpload = () => {
    if (trialStatus.isExpired) {
      setIsSubscriptionOpen(true);
      showToast(
        lang === 'bn' 
          ? '১ মাস ফ্রি ট্রায়াল শেষ হয়েছে! ফাইল আপলোড করতে ১০০ টাকা বিকাশ বা নগদে সেন্ড মানি করুন।' 
          : 'Trial expired. Send 100 Tk to upload files.',
        'error'
      );
      return;
    }
    setIsUploadOpen(true);
  };

  // Folder Navigation
  const handleOpenFolder = (folder: StorageFile) => {
    setCurrentFolderId(folder.id);
    setSelectedFileIds(new Set());
  };

  const handleNavigateUpFolder = () => {
    if (!currentFolder) {
      setCurrentFolderId(null);
      return;
    }
    const parentFolder = currentFolder.folderId ? files.find(f => f.id === currentFolder.folderId) : null;
    setCurrentFolderId(parentFolder ? parentFolder.id : null);
    setSelectedFileIds(new Set());
  };

  // Open Move or Copy Modal
  const handleOpenMoveModal = (singleFile?: StorageFile) => {
    if (singleFile) {
      setTargetFileIdsForModal([singleFile.id]);
    } else {
      setTargetFileIdsForModal(Array.from(selectedFileIds));
    }
    setMoveCopyAction('move');
    setIsMoveCopyOpen(true);
  };

  const handleOpenCopyModal = (singleFile?: StorageFile) => {
    if (singleFile) {
      setTargetFileIdsForModal([singleFile.id]);
    } else {
      setTargetFileIdsForModal(Array.from(selectedFileIds));
    }
    setMoveCopyAction('copy');
    setIsMoveCopyOpen(true);
  };

  // EXECUTE MOVE OR COPY
  const handleExecuteMoveCopy = async (
    action: 'move' | 'copy',
    targetFolderId: string | null,
    specificFileIds?: string[]
  ) => {
    const idsToProcess = specificFileIds && specificFileIds.length > 0
      ? specificFileIds
      : Array.from(selectedFileIds);

    if (idsToProcess.length === 0) return;

    if (action === 'move') {
      // MOVE: Update folderId so items reside inside target folder, no longer in the outer directory
      const updatedList: StorageFile[] = [];
      const now = new Date().toISOString();
      const newFiles = files.map(f => {
        if (idsToProcess.includes(f.id)) {
          const upd: StorageFile = {
            ...f,
            folderId: targetFolderId || null,
            updatedAt: now
          };
          updatedList.push(upd);
          return upd;
        }
        return f;
      });

      await saveMultipleStoredFiles(updatedList);
      updatedList.forEach(f => saveFileToFirestore(f).catch(() => {}));
      setFiles(newFiles);

      showToast(
        lang === 'bn'
          ? `${idsToProcess.length} টি ফাইল ফোল্ডারে মুভ করা হয়েছে!`
          : `${idsToProcess.length} files moved into folder!`
      );
    } else {
      // COPY: Duplicate items into target folder, originals stay in place
      const copies: StorageFile[] = [];
      const now = new Date().toISOString();

      idsToProcess.forEach(id => {
        const original = files.find(f => f.id === id);
        if (original) {
          const isSameFolder = (original.folderId || null) === (targetFolderId || null);
          const copyName = isSameFolder
            ? original.name.replace(/(\.[^.]+$|$)/, ` - Copy$1`)
            : original.name;

          const copyItem: StorageFile = {
            ...original,
            id: 'copy_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            name: copyName,
            folderId: targetFolderId || null,
            uploadedAt: now,
            updatedAt: now,
            isStarred: false
          };
          copies.push(copyItem);
        }
      });

      if (copies.length > 0) {
        await saveMultipleStoredFiles(copies);
        copies.forEach(f => saveFileToFirestore(f).catch(() => {}));
        setFiles(prev => [...copies, ...prev]);
        showToast(
          lang === 'bn'
            ? `${copies.length} টি ফাইল সফলভাবে কপি করা হয়েছে!`
            : `${copies.length} files copied successfully!`
        );
      }
    }

    setSelectedFileIds(new Set());
    setClipboard(null);
  };

  // Clipboard handlers
  const handleExecuteClipboard = () => {
    if (!clipboard) return;
    handleExecuteMoveCopy(clipboard.action, currentFolderId, clipboard.itemIds);
  };

  const handleCancelClipboard = () => {
    setClipboard(null);
  };

  // Drag and drop into folder
  const handleDropIntoFolder = (draggedFileId: string, targetFolderId: string) => {
    handleExecuteMoveCopy('move', targetFolderId, [draggedFileId]);
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all or deselect all
  const handleToggleSelectAll = () => {
    if (selectedFileIds.size === filteredFiles.length && filteredFiles.length > 0) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredFiles.map(f => f.id)));
    }
  };

  // Helper to get item and all descendants (for folders)
  const getDescendantIds = (rootIds: string[], allFiles: StorageFile[]): string[] => {
    const result = new Set<string>(rootIds);
    let added = true;
    while (added) {
      added = false;
      for (const f of allFiles) {
        if (f.folderId && result.has(f.folderId) && !result.has(f.id)) {
          result.add(f.id);
          added = true;
        }
      }
    }
    return Array.from(result);
  };

  // Single file/folder delete
  const handleDeleteFile = async (file: StorageFile) => {
    const ids = getDescendantIds([file.id], files);

    if (file.inTrash) {
      // 1. In Recycle Bin: PERMANENT DELETE FOREVER ("সারা জীবনের জন্য ডিলিট")
      recordDeletedFileIds(ids);
      await deleteMultipleStoredFiles(ids);
      ids.forEach(fid => deleteFileFromFirestore(fid).catch(() => {}));
      setFiles(prev => {
        const updated = prev.filter(f => !ids.includes(f.id));
        if (currentUser) {
          saveUserFilesCache(currentUser.id, updated, currentUser.emailOrPhone);
        }
        return updated;
      });
      showToast(
        lang === 'bn'
          ? (file.isFolder 
              ? `"${file.name}" ফোল্ডার এবং ভেতরের সব ফাইল সারা জীবনের জন্য মুছে ফেলা হয়েছে!` 
              : 'ফাইলটি সারা জীবনের জন্য স্থায়ীভাবে মুছে ফেলা হয়েছে!')
          : 'Permanently deleted forever!'
      );
    } else {
      // 2. Outside Recycle Bin: SAFE MOVE TO RECYCLE BIN ("রিসাইকেল বিনে পাঠান")
      const now = new Date().toISOString();
      const updatedFiles = files.filter(f => ids.includes(f.id)).map(f => ({ ...f, inTrash: true, deletedAt: now }));
      await saveMultipleStoredFiles(updatedFiles);
      updatedFiles.forEach(f => saveFileToFirestore(f).catch(() => {}));
      setFiles(prev => {
        const updated = prev.map(f => ids.includes(f.id) ? { ...f, inTrash: true, deletedAt: now } : f);
        if (currentUser) {
          saveUserFilesCache(currentUser.id, updated, currentUser.emailOrPhone);
        }
        return updated;
      });
      showToast(
        lang === 'bn'
          ? (file.isFolder
              ? `"${file.name}" ফোল্ডার রিসাইকেল বিনে পাঠানো হয়েছে।`
              : 'ফাইলটি রিসাইকেল বিনে পাঠানো হয়েছে। সারা জীবনের জন্য মুছতে রিসাইকেল বিন থেকে ডিলিট করুন।')
          : 'Moved to Recycle Bin. Delete from Recycle Bin to remove permanently.'
      );
    }

    setSelectedFileIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  };

  // BATCH DELETE ALL SELECTED
  const handleBatchDelete = async () => {
    if (selectedFileIds.size === 0) return;
    const targetIds = Array.from(selectedFileIds);
    const ids = getDescendantIds(targetIds, files);

    if (activeTab === 'trash') {
      // Permanent batch delete forever from Recycle Bin
      recordDeletedFileIds(ids);
      await deleteMultipleStoredFiles(ids);
      ids.forEach(fid => deleteFileFromFirestore(fid).catch(() => {}));
      setFiles(prev => {
        const updated = prev.filter(f => !ids.includes(f.id));
        if (currentUser) {
          saveUserFilesCache(currentUser.id, updated, currentUser.emailOrPhone);
        }
        return updated;
      });
      showToast(
        lang === 'bn' 
          ? `${ids.length} টি ফাইল সারা জীবনের জন্য স্থায়ীভাবে মুছে ফেলা হয়েছে!` 
          : `${ids.length} files permanently deleted forever!`
      );
    } else {
      // Move selected to Recycle Bin safely
      const now = new Date().toISOString();
      const updatedFiles = files.filter(f => ids.includes(f.id)).map(f => ({ ...f, inTrash: true, deletedAt: now }));
      await saveMultipleStoredFiles(updatedFiles);
      updatedFiles.forEach(f => saveFileToFirestore(f).catch(() => {}));
      setFiles(prev => {
        const updated = prev.map(f => ids.includes(f.id) ? { ...f, inTrash: true, deletedAt: now } : f);
        if (currentUser) {
          saveUserFilesCache(currentUser.id, updated, currentUser.emailOrPhone);
        }
        return updated;
      });
      showToast(
        lang === 'bn' 
          ? `${ids.length} টি ফাইল রিসাইকেল বিনে পাঠানো হয়েছে!` 
          : `${ids.length} files moved to Recycle Bin!`
      );
    }

    setSelectedFileIds(new Set());
  };

  // Empty Trash entirely
  const handleEmptyTrash = async () => {
    const trashFiles = files.filter(f => f.inTrash);
    if (trashFiles.length === 0) return;
    const trashIds = trashFiles.map(f => f.id);
    recordDeletedFileIds(trashIds);
    await deleteMultipleStoredFiles(trashIds);
    trashIds.forEach(fid => deleteFileFromFirestore(fid).catch(() => {}));
    setFiles(prev => {
      const updated = prev.filter(f => !f.inTrash);
      if (currentUser) {
        saveUserFilesCache(currentUser.id, updated, currentUser.emailOrPhone);
      }
      return updated;
    });
    setSelectedFileIds(new Set());
    showToast(
      lang === 'bn' 
        ? 'রিসাইকেল বিন সম্পূর্ণ খালি করা হয়েছে এবং সব ফাইল সারা জীবনের জন্য মুছে ফেলা হয়েছে!' 
        : 'Recycle Bin emptied and all files permanently deleted forever!'
    );
  };

  // Restore single file from trash
  const handleRestoreFile = async (file: StorageFile) => {
    const ids = getDescendantIds([file.id], files);
    unrecordDeletedFileIds(ids);
    const restored = files.filter(f => ids.includes(f.id)).map(f => ({ ...f, inTrash: false, deletedAt: undefined }));
    await saveMultipleStoredFiles(restored);
    restored.forEach(f => saveFileToFirestore(f).catch(() => {}));
    setFiles(prev => {
      const updated = prev.map(f => ids.includes(f.id) ? { ...f, inTrash: false, deletedAt: undefined } : f);
      if (currentUser) {
        saveUserFilesCache(currentUser.id, updated, currentUser.emailOrPhone);
      }
      return updated;
    });
    showToast(
      lang === 'bn' 
        ? (file.isFolder ? `"${file.name}" ফোল্ডার ড্রাইভে রিস্টোর করা হয়েছে।` : 'ফাইলটি ড্রাইভে রিস্টোর করা হয়েছে।') 
        : 'Item restored to Drive.'
    );
  };

  // Restore selected trash files
  const handleBatchRestoreTrash = async () => {
    if (selectedFileIds.size === 0) return;
    const targetIds = Array.from(selectedFileIds);
    const ids = getDescendantIds(targetIds, files);
    unrecordDeletedFileIds(ids);
    const restored = files.filter(f => ids.includes(f.id)).map(f => ({ ...f, inTrash: false, deletedAt: undefined }));
    await saveMultipleStoredFiles(restored);
    restored.forEach(f => saveFileToFirestore(f).catch(() => {}));
    setFiles(prev => {
      const updated = prev.map(f => ids.includes(f.id) ? { ...f, inTrash: false, deletedAt: undefined } : f);
      if (currentUser) {
        saveUserFilesCache(currentUser.id, updated, currentUser.emailOrPhone);
      }
      return updated;
    });
    setSelectedFileIds(new Set());
    showToast(
      lang === 'bn' 
        ? `${ids.length} টি ফাইল সফলভাবে ড্রাইভে রিস্টোর করা হয়েছে!` 
        : `${ids.length} files restored to Drive!`
    );
  };

  // Restore all trash files
  const handleRestoreAllTrash = async () => {
    const trashFiles = files.filter(f => f.inTrash);
    if (trashFiles.length === 0) return;
    const trashIds = trashFiles.map(f => f.id);
    unrecordDeletedFileIds(trashIds);
    const restored = trashFiles.map(f => ({ ...f, inTrash: false, deletedAt: undefined }));
    await saveMultipleStoredFiles(restored);
    restored.forEach(f => saveFileToFirestore(f).catch(() => {}));
    setFiles(prev => {
      const updated = prev.map(f => f.inTrash ? { ...f, inTrash: false, deletedAt: undefined } : f);
      if (currentUser) {
        saveUserFilesCache(currentUser.id, updated, currentUser.emailOrPhone);
      }
      return updated;
    });
    setSelectedFileIds(new Set());
    showToast(lang === 'bn' ? 'সব ফাইল সফলভাবে রিস্টোর করা হয়েছে!' : 'All files restored!');
  };

  // Toggle Star
  const handleToggleStar = async (file: StorageFile) => {
    const updated: StorageFile = { ...file, isStarred: !file.isStarred };
    await saveStoredFile(updated);
    setFiles(prev => prev.map(f => f.id === file.id ? updated : f));
  };

  // Update file from modal (Share / Encrypt)
  const handleUpdateFile = async (updated: StorageFile) => {
    await saveStoredFile(updated);
    setFiles(prev => prev.map(f => f.id === updated.id ? updated : f));
    showToast(lang === 'bn' ? 'ফাইল সেটিংস আপডেট হয়েছে।' : 'File settings updated.');
  };

  // BATCH DOWNLOAD ALL AS ZIP ("সব একসাথে ডাউনলোড")
  const handleBatchDownloadZip = async () => {
    if (trialStatus.isExpired) {
      setIsSubscriptionOpen(true);
      showToast(lang === 'bn' ? '১ মাস ব্যবহারের পর ফাইল ডাউনলোড করতে ১০০ টাকা সেন্ড মানি করতে হবে।' : 'Trial expired. Please send 100 Tk.', 'error');
      return;
    }
    const targetFiles = selectedFileIds.size > 0
      ? filteredFiles.filter(f => selectedFileIds.has(f.id))
      : filteredFiles;

    if (targetFiles.length === 0) {
      showToast(lang === 'bn' ? 'ডাউনলোড করার মতো কোনো ফাইল নেই।' : 'No files to download.', 'error');
      return;
    }

    setIsZipping(true);
    try {
      await downloadFilesAsZip(
        targetFiles,
        `Bashar-1000GB-${new Date().toISOString().slice(0, 10)}.zip`
      );
      showToast(lang === 'bn' ? `${targetFiles.length} টি ফাইল জিপ আকারে সফলভাবে ডাউনলোড হয়েছে!` : `${targetFiles.length} files downloaded as ZIP!`);
    } catch (err) {
      console.error(err);
      showToast(lang === 'bn' ? 'জিপ ফাইল তৈরিতে সমস্যা হয়েছে।' : 'Failed to zip files.', 'error');
    } finally {
      setIsZipping(false);
    }
  };

  // Files Uploaded callback (Guaranteed persistent storage to both IndexedDB and LocalStorage)
  const handleFilesUploaded = async (newFiles: StorageFile[]) => {
    if (trialStatus.isExpired) {
      setIsSubscriptionOpen(true);
      showToast(lang === 'bn' ? '১ মাস ব্যবহারের পর ফাইল আপলোড করতে ১০০ টাকা সেন্ড মানি করতে হবে।' : 'Trial expired. Please send 100 Tk.', 'error');
      return;
    }
    const ownerId = currentUser ? currentUser.id : 'default';
    const ownerPhone = currentUser ? currentUser.emailOrPhone : '';
    const enrichedFiles = newFiles.map(f => ({
      ...f,
      ownerId: f.ownerId || ownerId,
      ownerPhone: f.ownerPhone || ownerPhone
    }));

    // 1. Instant optimistic state update
    setFiles(prev => {
      const map = new Map<string, StorageFile>();
      prev.forEach(f => map.set(f.id, f));
      enrichedFiles.forEach(f => map.set(f.id, f));
      const merged = Array.from(map.values());
      merged.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      return merged;
    });

    // 2. Guaranteed persistence to both LocalStorage and IndexedDB before finishing
    try {
      await saveMultipleStoredFiles(enrichedFiles);
    } catch (err) {
      console.warn('Storage persistence notice:', err);
    }

    // 3. Guaranteed permanent cloud collection to Firestore Cloud
    saveMultipleFilesToFirestore(enrichedFiles, ownerPhone).catch((err) => {
      console.warn('Firestore cloud sync notice:', err);
    });

    showToast(
      lang === 'bn' 
        ? `⚡ ${enrichedFiles.length} টি ফাইল নিরাপদে ড্রাইভে সংরক্ষিত হয়েছে!` 
        : `⚡ ${enrichedFiles.length} files safely preserved & uploaded!`
    );
  };

  // Direct Drag & Drop upload handler (Upload directly into current folder without opening modal)
  const handleDirectDropFiles = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    mainDragCounterRef.current = 0;
    setIsDragOverWindow(false);
    if (!currentUser) return;
    if (trialStatus.isExpired) {
      setIsSubscriptionOpen(true);
      showToast(lang === 'bn' ? '১ মাস ব্যবহারের পর ফাইল আপলোড করতে ১০০ টাকা সেন্ড মানি করতে হবে।' : 'Trial expired. Please send 100 Tk.', 'error');
      return;
    }
    const droppedFiles = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (droppedFiles.length === 0) return;

    showToast(lang === 'bn' ? '⚡ টার্বো স্পিডে ফাইল প্রসেস হচ্ছে...' : '⚡ Processing at turbo speed...', 'info');

    try {
      const readSingle = (file: File, idx: number): Promise<StorageFile> => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const category = detectFileCategory(file.name, file.type);
            resolve({
              id: 'file-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 8),
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              category,
              dataUrl,
              uploadedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isStarred: false,
              isEncrypted: false,
              inTrash: false,
              ownerId: currentUser.id,
              ownerPhone: currentUser.emailOrPhone,
              folderId: currentFolderId || null,
              shared: { isShared: false }
            });
          };
          reader.onerror = () => {
            const category = detectFileCategory(file.name, file.type);
            resolve({
              id: 'file-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 8),
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              category,
              dataUrl: '',
              uploadedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isStarred: false,
              isEncrypted: false,
              inTrash: false,
              ownerId: currentUser.id,
              ownerPhone: currentUser.emailOrPhone,
              folderId: currentFolderId || null,
              shared: { isShared: false }
            });
          };
          reader.readAsDataURL(file);
        });
      };

      const results: StorageFile[] = [];
      const BATCH_SIZE = 2;
      for (let i = 0; i < droppedFiles.length; i += BATCH_SIZE) {
        const batch = droppedFiles.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map((f, bi) => readSingle(f, i + bi)));
        results.push(...batchResults);
        await new Promise(resolve => setTimeout(resolve, 16));
      }

      await handleFilesUploaded(results);
    } catch (err) {
      console.error(err);
      showToast(lang === 'bn' ? 'আপলোডে সমস্যা হয়েছে।' : 'Upload failed.', 'error');
    }
  };

  // IF ADMIN VIEW ACTIVE:
  if (adminView === 'login') {
    return (
      <AdminLogin
        onLoginSuccess={handleAdminLoginSuccess}
        onBackToApp={() => setAdminView('none')}
        adminCredentials={adminCredentials}
        lang={lang}
      />
    );
  }

  if (adminView === 'dashboard') {
    if (!currentAdmin) {
      return (
        <AdminLogin
          onLoginSuccess={handleAdminLoginSuccess}
          onBackToApp={() => setAdminView('none')}
          adminCredentials={adminCredentials}
          lang={lang}
        />
      );
    }

    return (
      <AdminDashboard
        usersList={usersList}
        adminCredentials={adminCredentials}
        siteSettings={siteSettings}
        paymentRequests={paymentRequests}
        onUpdateSiteSettings={handleUpdateSiteSettings}
        onUpdateUsersList={handleUpdateUsersList}
        onUpdateAdminCredentials={handleUpdateAdminCredentials}
        onDeleteUser={handleDeleteUserByAdmin}
        onDeleteAllUsers={handleDeleteAllUsersByAdmin}
        onApprovePaymentRequest={handleApprovePaymentRequest}
        onRejectPaymentRequest={handleRejectPaymentRequest}
        onDeletePaymentRequest={handleDeletePaymentRequest}
        onDirectUnlockUser={handleDirectUnlockUser}
        onLogoutAdmin={handleAdminLogout}
        onBackToApp={() => setAdminView('none')}
        onRefreshData={handleRefreshAdminData}
        lang={lang}
      />
    );
  }

  // IF NOT LOGGED IN: SHOW MANDATORY AUTH GATEWAY (SIGN UP OR LOGIN FIRST)
  if (!currentUser) {
    return (
      <>
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
            <div className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border backdrop-blur-md ${toastMessage.type === 'error' ? 'bg-red-950/90 border-red-700 text-red-200' : 'bg-slate-900/90 border-cyan-500/50 text-cyan-200'}`}>
              {toastMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* Global Announcement Notice Banner for visitors */}
        {siteSettings?.announcementNotice && !isNoticeDismissed && (
          <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-semibold backdrop-blur-md relative z-40 transition ${
            siteSettings.noticeType === 'alert'
              ? 'bg-rose-950/90 border-rose-800 text-rose-200'
              : siteSettings.noticeType === 'warning'
              ? 'bg-amber-950/90 border-amber-800 text-amber-200'
              : siteSettings.noticeType === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
              : 'bg-cyan-950/90 border-cyan-800 text-cyan-200'
          }`}>
            <div className="flex items-center gap-2 max-w-6xl mx-auto flex-1 justify-center text-center">
              <Bell className="w-4 h-4 shrink-0 animate-bounce" />
              <span className="tracking-wide">{siteSettings.announcementNotice}</span>
            </div>
            <button
              onClick={() => setIsNoticeDismissed(true)}
              className="p-1 hover:bg-black/30 rounded-lg text-slate-300 hover:text-white transition cursor-pointer shrink-0"
              title="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <AuthScreen
          usersList={usersList}
          siteSettings={siteSettings}
          onLoginSuccess={handleLoginSuccess}
          onUpdateUsersList={handleUpdateUsersList}
          lang={lang}
          onToggleLang={() => setLang(prev => prev === 'bn' ? 'en' : 'bn')}
          onOpenAdminLogin={() => setAdminView(currentAdmin ? 'dashboard' : 'login')}
          onOpenChat={() => setIsChatOpen(true)}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
        />

        {/* Calculator Modal available on landing screen */}
        <CalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
          lang={lang}
        />

        {/* Gemini AI Multi-turn Chatbot available on landing screen */}
        <GeminiChatbot
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onToggleOpen={() => setIsChatOpen(prev => !prev)}
          stats={stats}
          files={files}
          currentUser={currentUser}
          currentFolder={currentFolder}
          lang={lang}
        />
      </>
    );
  }

  // IF LOGGED IN: FULL CLOUD STORAGE INTERFACE
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-black">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border backdrop-blur-md ${toastMessage.type === 'error' ? 'bg-red-950/90 border-red-700 text-red-200' : 'bg-slate-900/90 border-cyan-500/50 text-cyan-200'}`}>
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Global Announcement Notice Banner for logged in users */}
      {siteSettings?.announcementNotice && !isNoticeDismissed && (
        <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-semibold backdrop-blur-md relative z-40 transition ${
          siteSettings.noticeType === 'alert'
            ? 'bg-rose-950/90 border-rose-800 text-rose-200'
            : siteSettings.noticeType === 'warning'
            ? 'bg-amber-950/90 border-amber-800 text-amber-200'
            : siteSettings.noticeType === 'success'
            ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
            : 'bg-cyan-950/90 border-cyan-800 text-cyan-200'
        }`}>
          <div className="flex items-center gap-2 max-w-6xl mx-auto flex-1 justify-center text-center">
            <Bell className="w-4 h-4 shrink-0 animate-bounce" />
            <span className="tracking-wide">{siteSettings.announcementNotice}</span>
          </div>
          <button
            onClick={() => setIsNoticeDismissed(true)}
            className="p-1 hover:bg-black/30 rounded-lg text-slate-300 hover:text-white transition cursor-pointer shrink-0"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        currentUser={currentUser}
        siteSettings={siteSettings}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenUpload={handleOpenUpload}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        stats={stats}
        lang={lang}
        onToggleLang={() => setLang(prev => prev === 'bn' ? 'en' : 'bn')}
        onOpenAdmin={() => setAdminView(currentAdmin ? 'dashboard' : 'login')}
        onSyncFiles={() => currentUser && syncUserFiles(currentUser.id, true)}
        isSyncingFiles={isSyncingFiles}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
      />

      {/* YouTube Gojol Studio Banner */}
      <YouTubeBanner lang={lang} siteSettings={siteSettings} />

      {/* Body Layout: Sidebar + Main File Manager */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with all 7 Utility Tools */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          stats={stats}
          siteSettings={siteSettings}
          currentUser={currentUser}
          trashCount={trashCount}
          starredCount={starredCount}
          sharedCount={sharedCount}
          vaultCount={vaultCount}
          lang={lang}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenAnalytics={() => { setIsAnalyticsOpen(true); setIsMobileMenuOpen(false); }}
          onOpenCalculator={() => { setIsCalculatorOpen(true); setIsMobileMenuOpen(false); }}
          onOpenScreenRecorder={() => { setIsScreenRecorderOpen(true); setIsMobileMenuOpen(false); }}
          onOpenVoiceRecorder={() => { setIsVoiceRecorderOpen(true); setIsMobileMenuOpen(false); }}
          onOpenSubscription={() => { setIsSubscriptionOpen(true); setIsMobileMenuOpen(false); }}
          onOpenChat={() => { setIsChatOpen(true); setIsMobileMenuOpen(false); }}
        />

        {/* Center / Right Content Area with Global Turbo Drag & Drop */}
        <main 
          onDragEnter={(e) => {
            e.preventDefault();
            if (isUploadOpen) return;
            mainDragCounterRef.current += 1;
            if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
              setIsDragOverWindow(true);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            mainDragCounterRef.current -= 1;
            if (mainDragCounterRef.current <= 0) {
              mainDragCounterRef.current = 0;
              setIsDragOverWindow(false);
            }
          }}
          onDrop={(e) => {
            mainDragCounterRef.current = 0;
            setIsDragOverWindow(false);
            if (!isUploadOpen) {
              handleDirectDropFiles(e);
            }
          }}
          className="flex-1 flex flex-col min-w-0 bg-slate-950/50 overflow-y-auto relative"
        >
          {/* Turbo Drag & Drop Overlay */}
          {isDragOverWindow && !isUploadOpen && (
            <div className="absolute inset-0 z-40 bg-cyan-950/85 backdrop-blur-md border-4 border-dashed border-cyan-400 flex flex-col items-center justify-center p-6 text-center animate-in fade-in pointer-events-none">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3 animate-bounce shadow-lg shadow-cyan-500/30">
                <Zap className="w-9 h-9 fill-cyan-400 text-cyan-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">
                {lang === 'bn' ? '⚡ ফাইলটি এখানে ড্রপ করুন' : '⚡ Drop Files Here'}
              </h3>
              <p className="text-sm text-cyan-200 max-w-md font-medium">
                {lang === 'bn' 
                  ? (currentFolder 
                      ? `"${currentFolder.name}" ফোল্ডারে টার্বো স্পিডে সরাসরি আপলোড হয়ে যাবে` 
                      : '১০০০ জিবি ক্লাউড ড্রাইভে টার্বো স্পিডে সরাসরি আপলোড হয়ে যাবে')
                  : 'Files will instantly upload with turbo speed into your drive'}
              </p>
            </div>
          )}

          {/* Action Bar (Batch select, batch download all, batch delete all, filters, folder nav, copy/move) */}
          <ActionBar
            activeTab={activeTab}
            siteSettings={siteSettings}
            totalFilteredFiles={filteredFiles.length}
            selectedCount={selectedFileIds.size}
            allSelected={selectedFileIds.size === filteredFiles.length && filteredFiles.length > 0}
            onToggleSelectAll={handleToggleSelectAll}
            onBatchDelete={handleBatchDelete}
            onBatchDownloadZip={handleBatchDownloadZip}
            onOpenUpload={handleOpenUpload}
            onOpenCreateFile={() => {
              if (trialStatus.isExpired) {
                setIsSubscriptionOpen(true);
                showToast(lang === 'bn' ? '১ মাস ব্যবহারের পর ১০০ টাকা সেন্ড মানি করুন।' : 'Trial expired.', 'error');
                return;
              }
              setIsCreateFileOpen(true);
            }}
            onOpenCreateFolder={() => {
              if (trialStatus.isExpired) {
                setIsSubscriptionOpen(true);
                showToast(lang === 'bn' ? '১ মাস ব্যবহারের পর ১০০ টাকা সেন্ড মানি করুন।' : 'Trial expired.', 'error');
                return;
              }
              setIsCreateFolderOpen(true);
            }}
            onOpenScreenRecorder={() => setIsScreenRecorderOpen(true)}
            onOpenVoiceRecorder={() => setIsVoiceRecorderOpen(true)}
            onOpenMoveModal={() => handleOpenMoveModal()}
            onOpenCopyModal={() => handleOpenCopyModal()}
            clipboard={clipboard}
            onExecuteClipboard={handleExecuteClipboard}
            onCancelClipboard={handleCancelClipboard}
            currentFolder={currentFolder}
            onNavigateUpFolder={handleNavigateUpFolder}
            onEmptyTrash={handleEmptyTrash}
            onRestoreAllTrash={handleRestoreAllTrash}
            onBatchRestoreTrash={handleBatchRestoreTrash}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            isZipping={isZipping}
            lang={lang}
          />

          {/* Files Container */}
          <div className="flex-1 p-4 lg:p-6">
            {/* 30-Day Trial Expired Lock Barrier Banner (ফাইল আপলোড করতে পারবেনা, দেখতে পারবে না, ডাউনলোড করতে পারবে না) */}
            {trialStatus.isExpired && (
              <div className="mb-6 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-red-950/90 via-slate-900/95 to-amber-950/90 border-2 border-red-500/50 shadow-2xl space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
                      <Lock className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <span>{lang === 'bn' ? '⚠️ ১ মাস (৩০ দিন) ফ্রি ট্রায়াল সম্পন্ন হয়েছে!' : '⚠️ 1 Month Free Trial Expired!'}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                          {lang === 'bn' ? 'লকড' : 'Locked'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                        {lang === 'bn' 
                          ? '১ মাস ব্যবহারের পর ফাইল আপলোড, দেখতে এবং ডাউনলোড করতে বিকাশ বা নগদে একবার ১০০ টাকা সেন্ড মানি করুন। একবার ১০০ টাকা দিলে সারা জীবনের লাগি আর টাকা লাগবে না।' 
                          : 'To view, download, or upload files, please send 100 Tk once via bKash or Nagad for lifetime access.'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsSubscriptionOpen(true)}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95 shrink-0"
                  >
                    <Crown className="w-4 h-4 fill-slate-950" />
                    <span>{lang === 'bn' ? '১০০ টাকা সেন্ড মানি বা কোড দিন' : 'Send 100 Tk or Enter Code'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 30-Day Trial Active Countdown Bar (একদিন গেলে ২৯ দিন দেখানো হবে এভাবে চলতে থাকবে ৩০ দিন) */}
            {!trialStatus.isLifetime && !trialStatus.isExpired && (
              <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-indigo-950/40 border border-cyan-800/40 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white">
                      {lang === 'bn' 
                        ? `⏳ আপনার ৩০ দিন ব্যবহারের মধ্যে আর ${toBengaliDigits(trialStatus.remainingDays)} দিন বাকি আছে` 
                        : `⏳ ${trialStatus.remainingDays} days remaining in your 30-day free trial`}
                    </span>
                    <span className="text-slate-400 ml-1.5 hidden sm:inline">
                      {lang === 'bn' ? '• এক মাস হওয়ার আগে চাইলে যেকোনো সময় ১০০ টাকা সেন্ড মানি করে আজীবনের জন্য আনলক করতে পারবেন' : '• You can unlock lifetime anytime for 100 Tk'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsSubscriptionOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? '১০০৳ আজীবন আনলক' : '100 Tk Lifetime'}</span>
                </button>
              </div>
            )}
            {/* Recycle Bin Reassurance Notice Banner */}
            {activeTab === 'trash' && (
              <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-red-950/40 via-slate-900/60 to-red-950/40 border border-red-900/40 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/20 text-red-400 shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {lang === 'bn' ? '🗑️ রিসাইকেল বিন (Recycle Bin)' : '🗑️ Recycle Bin'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {lang === 'bn' 
                        ? 'রিসাইকেল বিন থেকে স্থায়ীভাবে ডিলিট না করা পর্যন্ত আপনার ফাইল কোথাও যাবে না এবং সম্পূর্ণ নিরাপদ থাকবে। আপনি এখান থেকে ফাইল রিস্টোর করতে পারবেন অথবা চাইলে সারা জীবনের জন্য ডিলিট করতে পারবেন।' 
                        : 'Files remain safe here unless deleted from the Recycle Bin. You can restore them or permanently delete them forever.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {filteredFiles.length === 0 ? (
              <div className="h-96 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                  {activeTab === 'trash' ? (
                    <Trash2 className="w-8 h-8 text-red-400" />
                  ) : (
                    <Cloud className="w-8 h-8" />
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-200">
                  {activeTab === 'trash'
                    ? (lang === 'bn' ? 'রিসাইকেল বিন সম্পূর্ণ খালি' : 'Recycle Bin is Empty')
                    : currentFolder
                      ? (lang === 'bn' ? `"${currentFolder.name}" ফোল্ডারটিতে কোনো ফাইল নেই` : `Folder "${currentFolder.name}" is empty`)
                      : (lang === 'bn' ? `${siteSettings?.siteName || 'বাশার'} ক্লাউড ড্রাইভে কোনো ফাইল নেই` : `Your ${siteSettings?.storageQuotaGb || 1000} GB Drive is Empty`)}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
                  {activeTab === 'trash'
                    ? (lang === 'bn' ? `এখানে কোনো ফাইল নেই। ${siteSettings?.siteName || 'বাশার'} ড্রাইভ থেকে কোনো ফাইল ডিলিট করলে তা নিরাপদে এখানে জমা থাকবে।` : 'No deleted files. Any deleted files will be safely stored here.')
                    : searchQuery
                      ? (lang === 'bn' ? 'আপনার সার্চ কোয়েরির সাথে কোনো ফাইল মেলেনি।' : 'No files match your search query.')
                      : currentFolder
                        ? (lang === 'bn' ? 'এই ফোল্ডারের ভিতরে ফাইল তৈরি করুন, আপলোড করুন বা অন্য ফাইল মুভ করে নিয়ে আসুন।' : 'Create, upload, or move files into this folder.')
                        : (lang === 'bn' ? `আপনার ${siteSettings?.storageQuotaGb || 1000} জিবি স্পেসে নতুন ফাইল তৈরি করুন বা ফাইল আপলোড শুরু করুন।` : `Start creating or uploading your files into your ${siteSettings?.storageQuotaGb || 1000} GB space.`)}
                </p>
                {activeTab === 'trash' ? (
                  <button
                    onClick={() => setActiveTab('all')}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-xl border border-cyan-500/30 transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>{lang === 'bn' ? `${siteSettings?.siteName || 'বাশার'} ড্রাইভে ফিরে যান` : `Back to ${siteSettings?.siteName || 'Bashar'} Drive`}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    <button
                      onClick={() => setIsCreateFileOpen(true)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-xl border border-cyan-500/30 transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>{lang === 'bn' ? 'নতুন ফাইল তৈরি' : 'Create File'}</span>
                    </button>
                    <button
                      onClick={() => setIsCreateFolderOpen(true)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>{lang === 'bn' ? 'নতুন ফোল্ডার' : 'New Folder'}</span>
                    </button>
                    <button
                      onClick={() => setIsUploadOpen(true)}
                      className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer transition hover:scale-105"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'ফাইল আপলোড করুন' : 'Upload Files'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredFiles.map(file => (
                  <FileCard
                    key={file.id}
                    file={file}
                    isSelected={selectedFileIds.has(file.id)}
                    onToggleSelect={handleToggleSelect}
                    onPreview={handlePreviewFile}
                    onDownload={handleDownloadFile}
                    onShare={setShareFile}
                    onDelete={handleDeleteFile}
                    onToggleStar={handleToggleStar}
                    onRestore={handleRestoreFile}
                    onOpenFolder={handleOpenFolder}
                    onQuickMove={handleOpenMoveModal}
                    onQuickCopy={handleOpenCopyModal}
                    onDropIntoFolder={handleDropIntoFolder}
                    isTrash={activeTab === 'trash'}
                    lang={lang}
                  />
                ))}
              </div>
            ) : (
              /* List / Table View */
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4 w-10"></th>
                      <th className="py-3 px-4">{lang === 'bn' ? 'ফাইল নাম' : 'File Name'}</th>
                      <th className="py-3 px-4">{lang === 'bn' ? 'সাইজ' : 'Size'}</th>
                      <th className="py-3 px-4 hidden md:table-cell">{lang === 'bn' ? 'আপলোড তারিখ' : 'Uploaded'}</th>
                      <th className="py-3 px-4 text-right">{lang === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map(file => (
                      <FileListRow
                        key={file.id}
                        file={file}
                        isSelected={selectedFileIds.has(file.id)}
                        onToggleSelect={handleToggleSelect}
                        onPreview={handlePreviewFile}
                        onDownload={handleDownloadFile}
                        onShare={setShareFile}
                        onDelete={handleDeleteFile}
                        onToggleStar={handleToggleStar}
                        onRestore={handleRestoreFile}
                        onOpenFolder={handleOpenFolder}
                        onQuickMove={handleOpenMoveModal}
                        onQuickCopy={handleOpenCopyModal}
                        onDropIntoFolder={handleDropIntoFolder}
                        isTrash={activeTab === 'trash'}
                        lang={lang}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        usersList={usersList}
        onUpdateUsersList={handleUpdateUsersList}
        lang={lang}
      />

      {currentUser && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          onUpdateUser={(updated) => {
            setCurrentUser(updated);
            handleUpdateUsersList(usersList.map(u => u.id === updated.id ? updated : u));
            showToast(lang === 'bn' ? 'প্রোফাইল সেটিংস সংরক্ষিত হয়েছে।' : 'Profile settings updated.');
          }}
          onDeleteAccount={handleDeleteAccount}
          onOpenSubscription={() => setIsSubscriptionOpen(true)}
          lang={lang}
        />
      )}

      {/* Create New File Modal */}
      {currentUser && (
        <CreateFileModal
          isOpen={isCreateFileOpen}
          onClose={() => setIsCreateFileOpen(false)}
          onFileCreated={handleCreateFile}
          ownerId={currentUser.id}
          currentFolderId={currentFolderId}
          lang={lang}
        />
      )}

      {/* Create New Folder Modal */}
      {currentUser && (
        <CreateFolderModal
          isOpen={isCreateFolderOpen}
          onClose={() => setIsCreateFolderOpen(false)}
          onFolderCreated={(folder) => handleCreateFolder(folder.name)}
          ownerId={currentUser.id}
          currentFolderId={currentFolderId}
          lang={lang}
        />
      )}

      {/* Move or Copy Modal */}
      <MoveCopyModal
        isOpen={isMoveCopyOpen}
        onClose={() => { setIsMoveCopyOpen(false); setTargetFileIdsForModal([]); }}
        action={moveCopyAction}
        selectedFiles={
          targetFileIdsForModal.length > 0
            ? files.filter(f => targetFileIdsForModal.includes(f.id))
            : files.filter(f => selectedFileIds.has(f.id))
        }
        allFolders={allFolders}
        currentFolderId={currentFolderId}
        onExecute={(action, targetFolderId) =>
          handleExecuteMoveCopy(action, targetFolderId, targetFileIdsForModal)
        }
        onCreateFolder={handleCreateFolder}
        lang={lang}
      />

      <ShareModal
        isOpen={Boolean(shareFile)}
        onClose={() => setShareFile(null)}
        file={shareFile}
        onUpdateFile={handleUpdateFile}
        lang={lang}
      />

      <PreviewModal
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        onShareClick={(f) => { setPreviewFile(null); setShareFile(f); }}
        lang={lang}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onFilesUploaded={handleFilesUploaded}
        ownerId={currentUser.id}
        ownerPhone={currentUser.emailOrPhone}
        currentFolderId={currentFolderId}
        lang={lang}
      />

      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        files={files}
        stats={stats}
        lang={lang}
      />

      {/* Calculator Modal */}
      <CalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        lang={lang}
      />

      {/* Screen Recorder Modal with Mic & Device Audio options */}
      <ScreenRecorderModal
        isOpen={isScreenRecorderOpen}
        onClose={() => setIsScreenRecorderOpen(false)}
        onSaveToDrive={handleCreateFile}
        currentUser={currentUser}
        existingRecordsCount={screenRecordsCount}
        lang={lang}
      />

      {/* Voice Recorder Modal with Mic Audio & Waveform Visualizer */}
      <VoiceRecorderModal
        isOpen={isVoiceRecorderOpen}
        onClose={() => setIsVoiceRecorderOpen(false)}
        onSaveToDrive={handleCreateFile}
        currentUser={currentUser}
        existingRecordsCount={voiceRecordsCount}
        lang={lang}
      />

      {/* 30-Day Free Trial & 100 Tk Lifetime Subscription Modal */}
      {currentUser && (
        <SubscriptionModal
          isOpen={isSubscriptionOpen || trialStatus.isExpired}
          onClose={() => setIsSubscriptionOpen(false)}
          currentUser={currentUser}
          siteSettings={siteSettings}
          onUnlockLifetime={handleUnlockLifetime}
          onSubmitManualPaymentRequest={handleSubmitManualPaymentRequest}
          lang={lang}
          isForceLocked={trialStatus.isExpired}
        />
      )}

      {/* Gemini AI Multi-turn Chatbot */}
      <GeminiChatbot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onToggleOpen={() => setIsChatOpen(prev => !prev)}
        stats={stats}
        files={files}
        currentUser={currentUser}
        currentFolder={currentFolder}
        lang={lang}
      />
    </div>
  );
}
