import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  query, 
  where,
  getDocFromServer,
  writeBatch,
  disableNetwork,
  enableNetwork
} from 'firebase/firestore';
import { UserAccount, StorageFile, AdminCredentials } from '../types/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const QUOTA_EXCEEDED_STORAGE_KEY = 'bashar_drive_firestore_quota_exceeded_date';

function checkInitialQuotaStatus(): boolean {
  try {
    const savedDate = localStorage.getItem(QUOTA_EXCEEDED_STORAGE_KEY);
    if (savedDate) {
      const today = new Date().toISOString().slice(0, 10);
      if (savedDate === today) {
        return true;
      } else {
        localStorage.removeItem(QUOTA_EXCEEDED_STORAGE_KEY);
      }
    }
  } catch {}
  return false;
}

let quotaExceededState = checkInitialQuotaStatus();
const quotaListeners = new Set<(exceeded: boolean) => void>();

export function isQuotaExceeded(): boolean {
  return quotaExceededState;
}

export function setQuotaExceeded(exceeded: boolean) {
  quotaExceededState = exceeded;
  try {
    if (exceeded) {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(QUOTA_EXCEEDED_STORAGE_KEY, today);
      disableNetwork(db).catch(() => {});
    } else {
      localStorage.removeItem(QUOTA_EXCEEDED_STORAGE_KEY);
      enableNetwork(db).catch(() => {});
    }
  } catch {}
  quotaListeners.forEach((fn) => {
    try {
      fn(exceeded);
    } catch {}
  });
}

// If already exceeded today on initial load, disable network immediately to prevent backoff retry loops
if (quotaExceededState) {
  disableNetwork(db).catch(() => {});
}

export function subscribeQuotaExceeded(listener: (exceeded: boolean) => void): () => void {
  quotaListeners.add(listener);
  listener(quotaExceededState);
  return () => {
    quotaListeners.delete(listener);
  };
}

export function isQuotaError(error: unknown): boolean {
  const errCode = (error as any)?.code;
  const errMsg = error instanceof Error ? error.message : String(error);
  return (
    errCode === 'resource-exhausted' ||
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('Quota exceeded') ||
    errMsg.includes('resource-exhausted')
  );
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (isQuotaError(error)) {
    setQuotaExceeded(true);
    console.warn('Firestore Notice: Free daily write/read quota reached. Pausing remote Firestore network.');
    return;
  }

  const errMessage = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code;

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };

  if (errCode === 'permission-denied' || errMessage.includes('insufficient permissions')) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  } else {
    console.warn('Firestore Operation Notification:', JSON.stringify(errInfo));
  }
}

// Test initial connection to Firestore
export async function testConnection(): Promise<boolean> {
  if (quotaExceededState) {
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return false;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline, using local persistent cache.');
    }
    return false;
  }
}

const STORAGE_DELETED_USERS_KEY = 'bashar_deleted_user_ids';

export function getDeletedUserIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordDeletedUserId(userId: string): void {
  try {
    const list = getDeletedUserIds();
    if (!list.includes(userId)) {
      list.push(userId);
      localStorage.setItem(STORAGE_DELETED_USERS_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Could not record deleted user id:', err);
  }
}

export function removeDeletedUserId(userId: string): void {
  try {
    const list = getDeletedUserIds().filter(id => id !== userId);
    localStorage.setItem(STORAGE_DELETED_USERS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Could not remove deleted user id:', err);
  }
}

// Save or update user to Firestore
export async function saveUserToFirestore(user: UserAccount): Promise<void> {
  const deletedIds = getDeletedUserIds();
  if (deletedIds.includes(user.id)) {
    return;
  }
  if (quotaExceededState) return;
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, 'users', user.id), {
      id: user.id,
      name: user.name,
      emailOrPhone: user.emailOrPhone,
      secretName: user.secretName,
      passwordHash: user.passwordHash,
      birthDate: user.birthDate || '',
      customLogo: user.customLogo || '',
      totalStorageBytes: user.totalStorageBytes,
      createdAt: user.createdAt,
      status: user.status || 'active',
      role: user.role || 'user',
      lastLoginAt: user.lastLoginAt || ''
    });
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Load users from Firestore
export async function loadUsersFromFirestore(): Promise<UserAccount[]> {
  if (quotaExceededState) return [];
  const path = 'users';
  try {
    const snapshot = await getDocs(collection(db, path));
    const list: UserAccount[] = [];
    const deletedIds = new Set(getDeletedUserIds());
    snapshot.forEach((d) => {
      const u = d.data() as UserAccount;
      if (u && u.id && !deletedIds.has(u.id)) {
        list.push(u);
      } else if (u && u.id && deletedIds.has(u.id)) {
        // Asynchronously clean up lingering deleted doc from Firestore
        deleteDoc(doc(db, 'users', u.id)).catch(() => {});
      }
    });
    return list;
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Delete user from Firestore permanently
export async function deleteUserFromFirestore(userId: string): Promise<void> {
  // Always register in persistent tombstone so account is never resurrected
  recordDeletedUserId(userId);
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return;
    }
    console.warn('Firestore user delete notice:', error);
  }
}

// Save or update file metadata & content to Firestore
export async function saveFileToFirestore(file: StorageFile): Promise<void> {
  if (quotaExceededState) return;
  const path = `files/${file.id}`;
  try {
    // Note: Store metadata and payload. If file data fits inside doc limit (< 850KB),
    // save dataUrl directly so files, passwords, notes, and photos sync across all devices & browsers.
    const filePayload: Record<string, any> = {
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      category: file.category,
      uploadedAt: file.uploadedAt,
      updatedAt: file.updatedAt,
      isStarred: file.isStarred,
      isEncrypted: file.isEncrypted,
      encryptionHint: file.encryptionHint || '',
      inTrash: file.inTrash,
      ownerId: file.ownerId,
      shared: file.shared || { isShared: false }
    };
    if (file.tags) {
      filePayload.tags = file.tags;
    }
    if (file.deletedAt) {
      filePayload.deletedAt = file.deletedAt;
    }
    if (file.folderId !== undefined) {
      filePayload.folderId = file.folderId;
    }
    if (file.isFolder !== undefined) {
      filePayload.isFolder = file.isFolder;
    }
    if (file.dataUrl && file.dataUrl.length < 850000) {
      filePayload.dataUrl = file.dataUrl;
    }
    await setDoc(doc(db, 'files', file.id), filePayload);
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fast batch save multiple files to Firestore in a single network round-trip
export async function saveMultipleFilesToFirestore(files: StorageFile[]): Promise<void> {
  if (files.length === 0 || quotaExceededState) return;
  const path = 'files/batch';
  try {
    // Firestore supports up to 500 operations per batch
    const BATCH_LIMIT = 450;
    for (let i = 0; i < files.length; i += BATCH_LIMIT) {
      if (quotaExceededState) return;
      const slice = files.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const file of slice) {
        const filePayload: Record<string, any> = {
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          category: file.category,
          uploadedAt: file.uploadedAt,
          updatedAt: file.updatedAt,
          isStarred: file.isStarred,
          isEncrypted: file.isEncrypted,
          encryptionHint: file.encryptionHint || '',
          inTrash: file.inTrash,
          ownerId: file.ownerId,
          shared: file.shared || { isShared: false }
        };
        if (file.tags) filePayload.tags = file.tags;
        if (file.deletedAt) filePayload.deletedAt = file.deletedAt;
        if (file.folderId !== undefined) filePayload.folderId = file.folderId;
        if (file.isFolder !== undefined) filePayload.isFolder = file.isFolder;
        if (file.dataUrl && file.dataUrl.length < 850000) {
          filePayload.dataUrl = file.dataUrl;
        }
        batch.set(doc(db, 'files', file.id), filePayload);
      }
      await batch.commit();
    }
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete file from Firestore
export async function deleteFileFromFirestore(fileId: string): Promise<void> {
  if (quotaExceededState) return;
  const path = `files/${fileId}`;
  try {
    await deleteDoc(doc(db, 'files', fileId));
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Load user files from Firestore
export async function loadUserFilesFromFirestore(userId: string): Promise<StorageFile[]> {
  if (quotaExceededState) return [];
  const path = 'files';
  try {
    const q = query(collection(db, path), where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    const list: StorageFile[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as StorageFile);
    });
    return list;
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Save or update admin credentials to Firestore
export async function saveAdminCredentialsToFirestore(creds: AdminCredentials): Promise<void> {
  if (quotaExceededState) return;
  const path = 'admin_config/credentials';
  try {
    await setDoc(doc(db, 'admin_config', 'credentials'), creds);
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Load admin credentials from Firestore
export async function loadAdminCredentialsFromFirestore(): Promise<AdminCredentials | null> {
  if (quotaExceededState) return null;
  const path = 'admin_config/credentials';
  try {
    const snap = await getDoc(doc(db, 'admin_config', 'credentials'));
    if (snap.exists()) {
      return snap.data() as AdminCredentials;
    }
    return null;
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return null;
    }
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Sign in with Google via Firebase Auth popup
export async function signInWithGoogle(): Promise<{
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return {
    uid: result.user.uid,
    email: result.user.email,
    displayName: result.user.displayName,
    photoURL: result.user.photoURL
  };
}

