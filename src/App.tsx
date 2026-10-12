import React, { useState, useEffect, useMemo } from 'react';
import { 
  StorageFile, 
  UserAccount, 
  StorageStats, 
  ActiveTab, 
  ViewMode, 
  FileCategory,
  AdminCredentials,
  ClipboardState
} from './types/storage';
import { 
  getAllStoredFiles, 
  saveStoredFile, 
  saveMultipleStoredFiles, 
  deleteStoredFile, 
  deleteMultipleStoredFiles,
  detectFileCategory
} from './services/indexedDbStorage';
import { 
  saveUserToFirestore, 
  loadUsersFromFirestore, 
  deleteUserFromFirestore, 
  saveFileToFirestore, 
  saveMultipleFilesToFirestore,
  deleteFileFromFirestore, 
  loadUserFilesFromFirestore,
  testConnection,
  saveAdminCredentialsToFirestore,
  loadAdminCredentialsFromFirestore,
  isQuotaExceeded,
  subscribeQuotaExceeded
} from './services/firebase';
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
import { 
  Cloud, 
  Upload, 
  AlertCircle, 
  CheckCircle2,
  Zap,
  Trash2,
  ArchiveRestore,
  AlertTriangle,
  X
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

export default function App() {
  const [lang, setLang] = useState<'bn' | 'en'>('bn');

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
  
  const [files, setFiles] = useState<StorageFile[]>([]);
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
  
  // Status feedback
  const [isZipping, setIsZipping] = useState(false);
  const [isSyncingFiles, setIsSyncingFiles] = useState(false);
  const [isDragOverWindow, setIsDragOverWindow] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [quotaExceeded, setQuotaExceededState] = useState(isQuotaExceeded());
  const [isQuotaDismissed, setIsQuotaDismissed] = useState(false);

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
    if (currentUser) {
      const matched = updated.find(u => u.id === currentUser.id);
      if (matched) {
        setCurrentUser(matched);
      }
    }
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

      // If local files are not yet in Firestore or cloud doc was missing dataUrl (and quota is OK)
      if (!isQuotaExceeded() && cloudFiles.length > 0) {
        userLocals.forEach(lf => {
          const cloudMatch = cloudFiles.find(cf => cf.id === lf.id);
          if (!cloudMatch || (!cloudMatch.dataUrl && lf.dataUrl && lf.dataUrl.length < 850000)) {
            filesToPushToCloud.push(lf);
          }
        });
      }

      const mergedFiles = Array.from(fileMap.values());
      // Sort newest first
      mergedFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      setFiles(mergedFiles);

      // Cache newly retrieved cloud files into this browser's IndexedDB
      if (hasNewCloudFiles) {
        await saveMultipleStoredFiles(mergedFiles);
      }

      // Back up local files to cloud only if quota is healthy
      if (filesToPushToCloud.length > 0 && !isQuotaExceeded()) {
        for (const fileToPush of filesToPushToCloud) {
          saveFileToFirestore(fileToPush).catch(() => {});
        }
      }

      if (isManual) {
        showToast(
          isQuotaExceeded()
            ? (lang === 'bn' ? 'ফাইলগুলো নিরাপদে লোকাল স্টোরেজে সংরক্ষিত রয়েছে।' : 'Files safely preserved in local storage.')
            : (lang === 'bn' ? 'ক্লাউডের সাথে সকল ফাইল সফলভাবে সিঙ্ক হয়েছে!' : 'All files synced with cloud successfully!')
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
    showToast(
      lang === 'bn' 
        ? `স্বাগতম, ${user.name}! প্রোফাইলে গিয়ে লোগো, নাম, জন্ম তারিখ ও পাসওয়ার্ড সেট করতে পারেন।` 
        : `Welcome, ${user.name}! Customize your logo, name, birthday & password in Profile.`
    );
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
      isFolder: true,
      folderId: currentFolderId || null
    };

    saveStoredFile(newFolder).then(() => {
      saveFileToFirestore(newFolder).catch(() => {});
    });
    setFiles(prev => [newFolder, ...prev]);
    showToast(lang === 'bn' ? `"${newFolder.name}" ফোল্ডার তৈরি হয়েছে!` : `Folder "${newFolder.name}" created!`);
    return newFolder;
  };

  // Create File
  const handleCreateFile = async (newFile: StorageFile) => {
    await saveStoredFile(newFile);
    saveFileToFirestore(newFile).catch(() => {});
    setFiles(prev => [newFile, ...prev]);
    showToast(lang === 'bn' ? `"${newFile.name}" ফাইল তৈরি হয়েছে!` : `File "${newFile.name}" created!`);
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
      await deleteMultipleStoredFiles(ids);
      ids.forEach(fid => deleteFileFromFirestore(fid).catch(() => {}));
      setFiles(prev => prev.filter(f => !ids.includes(f.id)));
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
      setFiles(prev => prev.map(f => ids.includes(f.id) ? { ...f, inTrash: true, deletedAt: now } : f));
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
      await deleteMultipleStoredFiles(ids);
      ids.forEach(fid => deleteFileFromFirestore(fid).catch(() => {}));
      setFiles(prev => prev.filter(f => !ids.includes(f.id)));
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
      setFiles(prev => prev.map(f => ids.includes(f.id) ? { ...f, inTrash: true, deletedAt: now } : f));
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
    await deleteMultipleStoredFiles(trashIds);
    trashIds.forEach(fid => deleteFileFromFirestore(fid).catch(() => {}));
    setFiles(prev => prev.filter(f => !f.inTrash));
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
    const restored = files.filter(f => ids.includes(f.id)).map(f => ({ ...f, inTrash: false, deletedAt: undefined }));
    await saveMultipleStoredFiles(restored);
    restored.forEach(f => saveFileToFirestore(f).catch(() => {}));
    setFiles(prev => prev.map(f => ids.includes(f.id) ? { ...f, inTrash: false, deletedAt: undefined } : f));
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
    const restored = files.filter(f => ids.includes(f.id)).map(f => ({ ...f, inTrash: false, deletedAt: undefined }));
    await saveMultipleStoredFiles(restored);
    restored.forEach(f => saveFileToFirestore(f).catch(() => {}));
    setFiles(prev => prev.map(f => ids.includes(f.id) ? { ...f, inTrash: false, deletedAt: undefined } : f));
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
    const restored = trashFiles.map(f => ({ ...f, inTrash: false, deletedAt: undefined }));
    await saveMultipleStoredFiles(restored);
    restored.forEach(f => saveFileToFirestore(f).catch(() => {}));
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

  // Files Uploaded callback (Optimized for ultra-fast turbo response)
  const handleFilesUploaded = async (newFiles: StorageFile[]) => {
    // 1. Instant optimistic state update: files appear immediately in UI without waiting
    setFiles(prev => [...newFiles, ...prev]);
    showToast(
      lang === 'bn' 
        ? `⚡ ${newFiles.length} টি ফাইল টার্বো স্পিডে সফলভাবে আপলোড হয়েছে!` 
        : `⚡ ${newFiles.length} files uploaded at turbo speed!`
    );

    // 2. High-speed parallel persistence to IndexedDB and single-request batch to Firestore
    saveMultipleStoredFiles(newFiles).catch(err => console.error('IndexedDB error:', err));
    saveMultipleFilesToFirestore(newFiles).catch(err => console.error('Firestore batch error:', err));
  };

  // Direct Drag & Drop upload handler (Upload directly into current folder without opening modal)
  const handleDirectDropFiles = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverWindow(false);
    if (!currentUser) return;
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
              folderId: currentFolderId || null,
              shared: { isShared: false }
            });
          };
          reader.readAsDataURL(file);
        });
      };

      const results = await Promise.all(droppedFiles.map((f, i) => readSingle(f, i)));
      handleFilesUploaded(results);
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

      {/* YouTube Gojol Studio Banner */}
      <YouTubeBanner lang={lang} />

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

        {/* Center / Right Content Area with Global Turbo Drag & Drop */}
        <main 
          onDragOver={(e) => { e.preventDefault(); setIsDragOverWindow(true); }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setIsDragOverWindow(false);
          }}
          onDrop={handleDirectDropFiles}
          className="flex-1 flex flex-col min-w-0 bg-slate-950/50 overflow-y-auto relative"
        >
          {/* Turbo Drag & Drop Overlay */}
          {isDragOverWindow && (
            <div className="absolute inset-0 z-40 bg-cyan-950/85 backdrop-blur-md border-4 border-dashed border-cyan-400 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
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
            totalFilteredFiles={filteredFiles.length}
            selectedCount={selectedFileIds.size}
            allSelected={selectedFileIds.size === filteredFiles.length && filteredFiles.length > 0}
            onToggleSelectAll={handleToggleSelectAll}
            onBatchDelete={handleBatchDelete}
            onBatchDownloadZip={handleBatchDownloadZip}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenCreateFile={() => setIsCreateFileOpen(true)}
            onOpenCreateFolder={() => setIsCreateFolderOpen(true)}
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
                      : (lang === 'bn' ? 'ড্রাইভটিতে এখনো কোনো ফাইল নেই' : 'Your 1000 GB Drive is Empty')}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
                  {activeTab === 'trash'
                    ? (lang === 'bn' ? 'এখানে কোনো ফাইল নেই। বাশার ড্রাইভ থেকে কোনো ফাইল ডিলিট করলে তা নিরাপদে এখানে জমা থাকবে।' : 'No deleted files. Any deleted files will be safely stored here.')
                    : searchQuery
                      ? (lang === 'bn' ? 'আপনার সার্চ কোয়েরির সাথে কোনো ফাইল মেলেনি।' : 'No files match your search query.')
                      : currentFolder
                        ? (lang === 'bn' ? 'এই ফোল্ডারের ভিতরে ফাইল তৈরি করুন, আপলোড করুন বা অন্য ফাইল মুভ করে নিয়ে আসুন।' : 'Create, upload, or move files into this folder.')
                        : (lang === 'bn' ? 'আপনার ১০০০ জিবি স্পেসে নতুন ফাইল তৈরি করুন বা ফাইল আপলোড শুরু করুন।' : 'Start creating or uploading your files into your 1000 GB space.')}
                </p>
                {activeTab === 'trash' ? (
                  <button
                    onClick={() => setActiveTab('all')}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-xl border border-cyan-500/30 transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>{lang === 'bn' ? 'বাশার ড্রাইভে ফিরে যান' : 'Back to Drive'}</span>
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
                    onPreview={setPreviewFile}
                    onDownload={downloadSingleFile}
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
                        onPreview={setPreviewFile}
                        onDownload={downloadSingleFile}
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
        currentFolderId={currentFolderId}
        lang={lang}
      />
    </div>
  );
}
