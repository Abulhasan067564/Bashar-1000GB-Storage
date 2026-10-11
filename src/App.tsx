import React, { useState, useEffect, useMemo } from 'react';
import { 
  StorageFile, 
  UserAccount, 
  StorageStats, 
  ActiveTab, 
  ViewMode, 
  FileCategory,
  AdminCredentials 
} from './types/storage';
import { 
  getAllStoredFiles, 
  saveStoredFile, 
  saveMultipleStoredFiles, 
  deleteStoredFile, 
  deleteMultipleStoredFiles 
} from './services/indexedDbStorage';
import { 
  saveUserToFirestore, 
  loadUsersFromFirestore, 
  deleteUserFromFirestore, 
  saveFileToFirestore, 
  deleteFileFromFirestore, 
  loadUserFilesFromFirestore,
  testConnection,
  saveAdminCredentialsToFirestore,
  loadAdminCredentialsFromFirestore
} from './services/firebase';
import { downloadSingleFile, downloadFilesAsZip } from './services/zipService';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ActionBar } from './components/ActionBar';
import { FileCard } from './components/FileCard';
import { FileListRow } from './components/FileListRow';
import { AuthScreen } from './components/AuthScreen';
import { AdminLogin } from './components/Admin/AdminLogin';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AuthModal } from './components/Modals/AuthModal';
import { ProfileModal } from './components/Modals/ProfileModal';
import { ShareModal } from './components/Modals/ShareModal';
import { PreviewModal } from './components/Modals/PreviewModal';
import { UploadModal } from './components/Modals/UploadModal';
import { 
  Cloud, 
  Upload, 
  AlertCircle, 
  CheckCircle2
} from 'lucide-react';

const DEFAULT_ADMIN: AdminCredentials = {
  username: 'admin',
  passwordHash: 'admin123',
  updatedAt: new Date().toISOString()
};

const STORAGE_USERS_KEY = 'bashar_1000gb_registered_users';
const STORAGE_SESSION_KEY = 'bashar_1000gb_active_uid';
const STORAGE_ADMIN_CREDS_KEY = 'bashar_1000gb_admin_creds';
const STORAGE_ADMIN_SESSION_KEY = 'bashar_1000gb_admin_session';

export default function App() {
  const [lang, setLang] = useState<'bn' | 'en'>('bn');

  // Admin View State ('none' | 'login' | 'dashboard')
  const [adminView, setAdminView] = useState<'none' | 'login' | 'dashboard'>('none');
  
  // Admin credentials (synced with Firestore and localStorage)
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>(() => {
    const saved = localStorage.getItem(STORAGE_ADMIN_CREDS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
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
  
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);
  const [shareFile, setShareFile] = useState<StorageFile | null>(null);
  
  // Status feedback
  const [isZipping, setIsZipping] = useState(false);
  const [isSyncingFiles, setIsSyncingFiles] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync users and admin credentials with Firestore on boot
  useEffect(() => {
    async function initCloudDb() {
      await testConnection();
      try {
        // Sync users
        const cloudUsers = await loadUsersFromFirestore();
        if (cloudUsers.length > 0) {
          setUsersList(prev => {
            const map = new Map<string, UserAccount>();
            prev.forEach(u => map.set(u.id, u));
            cloudUsers.forEach(u => map.set(u.id, u));
            const merged = Array.from(map.values());
            localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(merged));
            return merged;
          });
        }

        // Sync admin credentials
        const cloudAdmin = await loadAdminCredentialsFromFirestore();
        if (cloudAdmin) {
          setAdminCredentials(cloudAdmin);
          localStorage.setItem(STORAGE_ADMIN_CREDS_KEY, JSON.stringify(cloudAdmin));
        } else {
          // Initialize default admin in cloud if not yet created
          saveAdminCredentialsToFirestore(DEFAULT_ADMIN).catch(() => {});
        }
      } catch (err) {
        console.warn('Initial cloud sync notice:', err);
      }
    }
    initCloudDb();
  }, []);

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
    }
  };

  // Refresh admin data
  const handleRefreshAdminData = async () => {
    try {
      const cloudUsers = await loadUsersFromFirestore();
      if (cloudUsers.length > 0) {
        const map = new Map<string, UserAccount>();
        cloudUsers.forEach(u => map.set(u.id, u));
        const merged = Array.from(map.values());
        setUsersList(merged);
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(merged));
      }
      const cloudAdmin = await loadAdminCredentialsFromFirestore();
      if (cloudAdmin) {
        setAdminCredentials(cloudAdmin);
        localStorage.setItem(STORAGE_ADMIN_CREDS_KEY, JSON.stringify(cloudAdmin));
      }
    } catch (err) {
      console.error('Error refreshing cloud data:', err);
    }
  };

  const handleUpdateUsersList = (updated: UserAccount[]) => {
    setUsersList(updated);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updated));
    // Background sync to Firestore
    updated.forEach(u => {
      saveUserToFirestore(u).catch(() => {});
    });
  };

  // Seamless cross-browser and cross-device sync between local IndexedDB and Firestore Cloud
  const syncUserFiles = async (userId: string, isManual = false) => {
    setIsSyncingFiles(true);
    try {
      // 1. Fetch locally cached files
      const localStored = await getAllStoredFiles();
      const userLocals = localStored.filter(f => f.ownerId === userId);
      const fileMap = new Map<string, StorageFile>();
      userLocals.forEach(f => fileMap.set(f.id, f));

      // 2. Fetch cloud files from Firestore
      const cloudFiles = await loadUserFilesFromFirestore(userId);

      let hasNewCloudFiles = false;
      const filesToPushToCloud: StorageFile[] = [];

      // Check files from cloud
      cloudFiles.forEach(cf => {
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
      });

      // If local files are not yet in Firestore or cloud doc was missing dataUrl
      userLocals.forEach(lf => {
        const cloudMatch = cloudFiles.find(cf => cf.id === lf.id);
        if (!cloudMatch || (!cloudMatch.dataUrl && lf.dataUrl && lf.dataUrl.length < 850000)) {
          filesToPushToCloud.push(lf);
        }
      });

      const mergedFiles = Array.from(fileMap.values());
      // Sort newest first
      mergedFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      setFiles(mergedFiles);

      // Cache newly retrieved cloud files into this browser's IndexedDB
      if (hasNewCloudFiles) {
        await saveMultipleStoredFiles(mergedFiles);
      }

      // Back up local files to cloud
      if (filesToPushToCloud.length > 0) {
        for (const fileToPush of filesToPushToCloud) {
          saveFileToFirestore(fileToPush).catch(() => {});
        }
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
    setCurrentUser(user);
    localStorage.setItem(STORAGE_SESSION_KEY, user.id);
    saveUserToFirestore(user).catch(() => {});
    showToast(lang === 'bn' ? `স্বাগতম, ${user.name}! ক্লাউড ফাইল লোড হচ্ছে...` : `Welcome, ${user.name}! Loading files...`);
    await syncUserFiles(user.id);
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

    // 1. Delete all user files from IndexedDB and Firestore
    try {
      const allFiles = await getAllStoredFiles();
      const userFileIds = allFiles.filter(f => f.ownerId === uid).map(f => f.id);
      if (userFileIds.length > 0) {
        await deleteMultipleStoredFiles(userFileIds);
        userFileIds.forEach(fid => deleteFileFromFirestore(fid).catch(() => {}));
      }
    } catch (err) {
      console.error('Error removing user files:', err);
    }

    // 2. Remove user from registered users and Firestore
    deleteUserFromFirestore(uid).catch(() => {});
    const updatedUsers = usersList.filter(u => u.id !== uid);
    handleUpdateUsersList(updatedUsers);

    // 3. Clear session and state
    localStorage.removeItem(STORAGE_SESSION_KEY);
    setCurrentUser(null);
    setFiles([]);
    setSelectedFileIds(new Set());
    setIsProfileOpen(false);

    showToast(
      lang === 'bn'
        ? 'আপনার একাউন্ট এবং সমস্ত ফাইল সফলভাবে মুছে ফেলা হয়েছে।'
        : 'Your account and all files have been deleted.'
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
        const stored = await getAllStoredFiles();
        // Fast local render if available
        const userFiles = stored.filter(f => f.ownerId === currentUser.id);
        if (userFiles.length > 0) {
          setFiles(userFiles);
        }
      } catch (err) {
        console.error('Local IndexedDB load notice:', err);
      }
      // Cross-browser cloud sync
      await syncUserFiles(currentUser.id);
    }
    loadData();
  }, [currentUser?.id]);

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

    // Sorting
    result.sort((a, b) => {
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
  }, [files, activeTab, selectedCategory, searchQuery, sortBy]);

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

  // Single file delete ("এক এক করে ডিলিট")
  const handleDeleteFile = async (file: StorageFile) => {
    if (file.inTrash) {
      // Permanent delete
      await deleteStoredFile(file.id);
      deleteFileFromFirestore(file.id).catch(() => {});
      setFiles(prev => prev.filter(f => f.id !== file.id));
      showToast(lang === 'bn' ? 'ফাইলটি স্থায়ীভাবে মুছে ফেলা হয়েছে।' : 'File permanently deleted.');
    } else {
      // Move to Trash
      const updated: StorageFile = { ...file, inTrash: true, deletedAt: new Date().toISOString() };
      await saveStoredFile(updated);
      saveFileToFirestore(updated).catch(() => {});
      setFiles(prev => prev.map(f => f.id === file.id ? updated : f));
      showToast(lang === 'bn' ? 'ফাইলটি রিসাইকেল বিনে পাঠানো হয়েছে।' : 'File moved to Trash.');
    }
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      next.delete(file.id);
      return next;
    });
  };

  // BATCH DELETE ALL SELECTED ("সব একসাথে ডিলিট")
  const handleBatchDelete = async () => {
    if (selectedFileIds.size === 0) return;
    const ids = Array.from(selectedFileIds);

    if (activeTab === 'trash') {
      // Permanent batch delete
      await deleteMultipleStoredFiles(ids);
      ids.forEach(fid => deleteFileFromFirestore(fid).catch(() => {}));
      setFiles(prev => prev.filter(f => !selectedFileIds.has(f.id)));
      showToast(lang === 'bn' ? `${ids.length} টি ফাইল স্থায়ীভাবে মুছে ফেলা হয়েছে!` : `${ids.length} files permanently deleted!`);
    } else {
      // Move selected to trash
      const updatedFiles = files.map(f => {
        if (selectedFileIds.has(f.id)) {
          const upd = { ...f, inTrash: true, deletedAt: new Date().toISOString() };
          saveFileToFirestore(upd).catch(() => {});
          return upd;
        }
        return f;
      });
      await saveMultipleStoredFiles(updatedFiles.filter(f => selectedFileIds.has(f.id)));
      setFiles(updatedFiles);
      showToast(lang === 'bn' ? `${ids.length} টি ফাইল একসাথে রিসাইকেল বিনে সরানো হয়েছে!` : `${ids.length} files moved to Trash!`);
    }

    setSelectedFileIds(new Set());
  };

  // Empty Trash entirely
  const handleEmptyTrash = async () => {
    const trashFiles = files.filter(f => f.inTrash);
    if (trashFiles.length === 0) return;
    const trashIds = trashFiles.map(f => f.id);
    await deleteMultipleStoredFiles(trashIds);
    setFiles(prev => prev.filter(f => !f.inTrash));
    setSelectedFileIds(new Set());
    showToast(lang === 'bn' ? 'রিসাইকেল বিন সম্পূর্ণ খালি করা হয়েছে!' : 'Trash emptied successfully!');
  };

  // Restore single file from trash
  const handleRestoreFile = async (file: StorageFile) => {
    const updated: StorageFile = { ...file, inTrash: false, deletedAt: undefined };
    await saveStoredFile(updated);
    setFiles(prev => prev.map(f => f.id === file.id ? updated : f));
    showToast(lang === 'bn' ? 'ফাইলটি ড্রাইভে রিস্টোর করা হয়েছে।' : 'File restored to Drive.');
  };

  // Restore all trash files
  const handleRestoreAllTrash = async () => {
    const trashFiles = files.filter(f => f.inTrash);
    if (trashFiles.length === 0) return;
    const restored = trashFiles.map(f => ({ ...f, inTrash: false, deletedAt: undefined }));
    await saveMultipleStoredFiles(restored);
    setFiles(prev => prev.map(f => f.inTrash ? { ...f, inTrash: false, deletedAt: undefined } : f));
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

  // Files Uploaded callback
  const handleFilesUploaded = async (newFiles: StorageFile[]) => {
    await saveMultipleStoredFiles(newFiles);
    newFiles.forEach(f => saveFileToFirestore(f).catch(() => {}));
    setFiles(prev => [...newFiles, ...prev]);
    showToast(lang === 'bn' ? `${newFiles.length} টি ফাইল সফলভাবে আপলোড হয়েছে!` : `${newFiles.length} files uploaded successfully!`);
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
        onUpdateUsersList={handleUpdateUsersList}
        onUpdateAdminCredentials={handleUpdateAdminCredentials}
        onDeleteUser={handleDeleteUserByAdmin}
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

        <AuthScreen
          usersList={usersList}
          onLoginSuccess={handleLoginSuccess}
          onUpdateUsersList={handleUpdateUsersList}
          lang={lang}
          onToggleLang={() => setLang(prev => prev === 'bn' ? 'en' : 'bn')}
          onOpenAdminLogin={() => setAdminView(currentAdmin ? 'dashboard' : 'login')}
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

      {/* Main Navbar */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenUpload={() => setIsUploadOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        stats={stats}
        lang={lang}
        onToggleLang={() => setLang(prev => prev === 'bn' ? 'en' : 'bn')}
        onOpenAdmin={() => setAdminView(currentAdmin ? 'dashboard' : 'login')}
        onSyncFiles={() => currentUser && syncUserFiles(currentUser.id, true)}
        isSyncingFiles={isSyncingFiles}
      />

      {/* Body Layout: Sidebar + Main File Manager */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          stats={stats}
          trashCount={trashCount}
          starredCount={starredCount}
          sharedCount={sharedCount}
          vaultCount={vaultCount}
          lang={lang}
        />

        {/* Center / Right Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950/50 overflow-y-auto">
          {/* Action Bar (Batch select, batch download all, batch delete all, filters) */}
          <ActionBar
            activeTab={activeTab}
            totalFilteredFiles={filteredFiles.length}
            selectedCount={selectedFileIds.size}
            allSelected={selectedFileIds.size === filteredFiles.length && filteredFiles.length > 0}
            onToggleSelectAll={handleToggleSelectAll}
            onBatchDelete={handleBatchDelete}
            onBatchDownloadZip={handleBatchDownloadZip}
            onOpenUpload={() => setIsUploadOpen(true)}
            onEmptyTrash={handleEmptyTrash}
            onRestoreAllTrash={handleRestoreAllTrash}
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
            {filteredFiles.length === 0 ? (
              <div className="h-96 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                  <Cloud className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-200">
                  {lang === 'bn' ? 'ড্রাইভটিতে এখনো কোনো ফাইল নেই' : 'Your 1000 GB Drive is Empty'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
                  {searchQuery
                    ? (lang === 'bn' ? 'আপনার সার্চ কোয়েরির সাথে কোনো ফাইল মেলেনি।' : 'No files match your search query.')
                    : (lang === 'bn' ? 'আপনার ১০০০ জিবি স্পেসে একক বা একসাথে একাধিক ফাইল আপলোড শুরু করুন।' : 'Start uploading your files into your 1000 GB secure cloud space.')}
                </p>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer transition hover:scale-105"
                >
                  <Upload className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'ফাইল আপলোড করুন' : 'Upload Files'}</span>
                </button>
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
                    onPreview={setPreviewFile}
                    onDownload={downloadSingleFile}
                    onShare={setShareFile}
                    onDelete={handleDeleteFile}
                    onToggleStar={handleToggleStar}
                    onRestore={handleRestoreFile}
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
                        onPreview={setPreviewFile}
                        onDownload={downloadSingleFile}
                        onShare={setShareFile}
                        onDelete={handleDeleteFile}
                        onToggleStar={handleToggleStar}
                        onRestore={handleRestoreFile}
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
          lang={lang}
        />
      )}

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
        lang={lang}
      />
    </div>
  );
}
