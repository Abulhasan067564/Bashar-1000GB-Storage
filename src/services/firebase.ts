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
import { UserAccount, StorageFile, AdminCredentials, SiteSettings, PaymentRequest } from '../types/storage';
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
      totalStorageBytes: user.totalStorageBytes || (1000 * 1024 * 1024 * 1024),
      createdAt: user.createdAt || new Date().toISOString(),
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

// Direct lookup for user in Firestore across any browser or device
export async function findUserInFirestore(identifier: string): Promise<UserAccount | null> {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;
  const deletedIds = new Set(getDeletedUserIds());

  try {
    const snapshot = await getDocs(collection(db, 'users'));
    let found: UserAccount | null = null;
    snapshot.forEach((d) => {
      const u = d.data() as UserAccount;
      if (u && u.id && !deletedIds.has(u.id)) {
        const uEmailOrPhone = (u.emailOrPhone || '').trim().toLowerCase();
        // Remove spaces, dashes, +88 prefix for phone comparison
        const normU = uEmailOrPhone.replace(/[\s\-\(\)]/g, '').replace(/^\+88/, '');
        const normInput = clean.replace(/[\s\-\(\)]/g, '').replace(/^\+88/, '');
        if (normU === normInput || uEmailOrPhone === clean) {
          found = u;
        }
      }
    });
    return found;
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return null;
    }
    console.warn('Notice querying user in Firestore:', error);
    return null;
  }
}

// Load users from Firestore
export async function loadUsersFromFirestore(): Promise<UserAccount[]> {
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

// Save chunks to Firestore for larger files (> 750KB)
export async function saveFileChunksToFirestore(fileId: string, dataUrl: string): Promise<number> {
  const CHUNK_SIZE = 750000;
  const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);
  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkStr = dataUrl.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await setDoc(doc(db, 'file_chunks', `${fileId}_${i}`), {
        fileId,
        chunkIndex: i,
        totalChunks,
        data: chunkStr,
        updatedAt: new Date().toISOString()
      });
    }
    return totalChunks;
  } catch (err) {
    console.warn('Error saving file chunks to Firestore:', err);
    return 0;
  }
}

// Load chunks from Firestore and reconstruct original dataUrl
export async function loadFileChunksFromFirestore(fileId: string, totalChunks: number): Promise<string | null> {
  try {
    const chunkPromises: Promise<any>[] = [];
    for (let i = 0; i < totalChunks; i++) {
      chunkPromises.push(getDoc(doc(db, 'file_chunks', `${fileId}_${i}`)));
    }
    const snaps = await Promise.all(chunkPromises);
    const chunks: string[] = [];
    for (const snap of snaps) {
      if (snap.exists() && snap.data()?.data) {
        chunks.push(snap.data().data);
      } else {
        return null;
      }
    }
    return chunks.join('');
  } catch (err) {
    console.warn('Error reconstructing file from chunks:', err);
    return null;
  }
}

// Save or update file metadata & content to Firestore (Cross-device aware)
export async function saveFileToFirestore(file: StorageFile, userPhoneOrEmail?: string): Promise<void> {
  const path = `files/${file.id}`;
  try {
    const cleanPhone = (file.ownerPhone || userPhoneOrEmail || '').trim();
    const filePayload: Record<string, any> = {
      id: file.id,
      name: file.name || 'Untitled',
      size: Number(file.size) || 0,
      type: file.type || 'application/octet-stream',
      category: file.category || 'other',
      uploadedAt: file.uploadedAt || new Date().toISOString(),
      updatedAt: file.updatedAt || new Date().toISOString(),
      isStarred: Boolean(file.isStarred),
      isEncrypted: Boolean(file.isEncrypted),
      encryptionHint: file.encryptionHint || '',
      inTrash: Boolean(file.inTrash),
      ownerId: file.ownerId || 'default',
      ownerPhone: cleanPhone,
      ownerEmailOrPhone: cleanPhone,
      shared: file.shared || { isShared: false }
    };

    if (file.tags && Array.isArray(file.tags)) {
      filePayload.tags = file.tags;
    }
    if (file.deletedAt) {
      filePayload.deletedAt = file.deletedAt;
    }
    if (file.folderId !== undefined) {
      filePayload.folderId = file.folderId || null;
    }
    if (file.isFolder !== undefined) {
      filePayload.isFolder = Boolean(file.isFolder);
    }

    // Direct embed if under 750KB
    if (file.dataUrl && file.dataUrl.length <= 750000) {
      filePayload.dataUrl = file.dataUrl;
      filePayload.hasChunks = false;
    } else if (file.dataUrl && file.dataUrl.length > 750000) {
      // Chunked storage for larger files
      const totalChunks = await saveFileChunksToFirestore(file.id, file.dataUrl);
      if (totalChunks > 0) {
        filePayload.hasChunks = true;
        filePayload.totalChunks = totalChunks;
      }
    }

    await setDoc(doc(db, 'files', file.id), filePayload, { merge: true });
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fast batch save multiple files to Firestore in a single network round-trip with individual fallback
export async function saveMultipleFilesToFirestore(files: StorageFile[], userPhoneOrEmail?: string): Promise<void> {
  if (files.length === 0) return;
  const path = 'files/batch';
  const cleanPhone = (userPhoneOrEmail || '').trim();

  try {
    const BATCH_LIMIT = 50;
    for (let i = 0; i < files.length; i += BATCH_LIMIT) {
      const slice = files.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const file of slice) {
        const phone = (file.ownerPhone || cleanPhone).trim();
        const filePayload: Record<string, any> = {
          id: file.id,
          name: file.name || 'Untitled',
          size: Number(file.size) || 0,
          type: file.type || 'application/octet-stream',
          category: file.category || 'other',
          uploadedAt: file.uploadedAt || new Date().toISOString(),
          updatedAt: file.updatedAt || new Date().toISOString(),
          isStarred: Boolean(file.isStarred),
          isEncrypted: Boolean(file.isEncrypted),
          encryptionHint: file.encryptionHint || '',
          inTrash: Boolean(file.inTrash),
          ownerId: file.ownerId || 'default',
          ownerPhone: phone,
          ownerEmailOrPhone: phone,
          shared: file.shared || { isShared: false }
        };
        if (file.tags) filePayload.tags = file.tags;
        if (file.deletedAt) filePayload.deletedAt = file.deletedAt;
        if (file.folderId !== undefined) filePayload.folderId = file.folderId || null;
        if (file.isFolder !== undefined) filePayload.isFolder = Boolean(file.isFolder);

        if (file.dataUrl && file.dataUrl.length <= 750000) {
          filePayload.dataUrl = file.dataUrl;
        }
        batch.set(doc(db, 'files', file.id), filePayload, { merge: true });
      }

      try {
        await batch.commit();
      } catch (batchErr) {
        console.warn('Batch commit notice, writing files individually:', batchErr);
        for (const file of slice) {
          await saveFileToFirestore(file, userPhoneOrEmail).catch(() => {});
        }
      }

      // Handle chunking for any files exceeding single doc limit
      for (const file of slice) {
        if (file.dataUrl && file.dataUrl.length > 750000) {
          saveFileChunksToFirestore(file.id, file.dataUrl).catch(() => {});
        }
      }
    }
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete file from Firestore and any chunks
export async function deleteFileFromFirestore(fileId: string): Promise<void> {
  const path = `files/${fileId}`;
  try {
    await deleteDoc(doc(db, 'files', fileId));
    // Clean up potential chunks
    for (let i = 0; i < 20; i++) {
      deleteDoc(doc(db, 'file_chunks', `${fileId}_${i}`)).catch(() => {});
    }
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Load user files from Firestore (Dual-Key: matches by ownerId OR ownerPhone/email across all websites & devices)
export async function loadUserFilesFromFirestore(userId: string, userPhoneOrEmail?: string): Promise<StorageFile[]> {
  const path = 'files';
  const fileMap = new Map<string, StorageFile>();

  try {
    const queries = [];

    // 1. Query by ownerId
    if (userId) {
      queries.push(query(collection(db, path), where('ownerId', '==', userId)));
    }

    // 2. Query by ownerPhone / ownerEmailOrPhone (Guarantees cross-device findability by number)
    if (userPhoneOrEmail) {
      const clean = userPhoneOrEmail.trim();
      const norm = clean.replace(/[\s\-\(\)]/g, '').replace(/^\+88/, '');

      queries.push(query(collection(db, path), where('ownerPhone', '==', clean)));
      queries.push(query(collection(db, path), where('ownerEmailOrPhone', '==', clean)));

      if (norm && norm !== clean) {
        queries.push(query(collection(db, path), where('ownerPhone', '==', norm)));
        queries.push(query(collection(db, path), where('ownerPhone', '==', '0' + norm)));
        queries.push(query(collection(db, path), where('ownerPhone', '==', '+88' + norm)));
      }
    }

    // Execute ALL Firestore queries concurrently in parallel for maximum speed
    const results = await Promise.allSettled(queries.map(q => getDocs(q)));
    results.forEach(res => {
      if (res.status === 'fulfilled') {
        res.value.forEach(d => {
          const file = d.data() as StorageFile;
          if (file && file.id) {
            fileMap.set(file.id, file);
          }
        });
      }
    });

    const list = Array.from(fileMap.values());
    if (userId && list.length > 0) {
      try {
        localStorage.setItem(`bashar_cloud_files_${userId}`, JSON.stringify(list));
      } catch {}
    }
    return list;
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
    return Array.from(fileMap.values());
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

// Save site settings / branding to Firestore
export async function saveSiteSettingsToFirestore(settings: SiteSettings): Promise<void> {
  const path = 'admin_config/site_settings';
  try {
    const cleanSettings: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };
    for (const [key, val] of Object.entries(settings)) {
      if (val !== undefined) {
        cleanSettings[key] = val;
      }
    }
    await setDoc(doc(db, 'admin_config', 'site_settings'), cleanSettings, { merge: true });
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Load site settings / branding from Firestore
export async function loadSiteSettingsFromFirestore(): Promise<SiteSettings | null> {
  if (quotaExceededState) return null;
  const path = 'admin_config/site_settings';
  try {
    const snap = await getDoc(doc(db, 'admin_config', 'site_settings'));
    if (snap.exists()) {
      return snap.data() as SiteSettings;
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

// Save Payment Request to Firestore (collection: payment_requests)
export async function savePaymentRequestToFirestore(request: PaymentRequest): Promise<void> {
  const path = `payment_requests/${request.id}`;
  try {
    const cleanRequest: Record<string, any> = {};
    for (const [key, val] of Object.entries(request)) {
      if (val !== undefined) {
        cleanRequest[key] = val;
      }
    }
    await setDoc(doc(db, 'payment_requests', request.id), cleanRequest, { merge: true });
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Load all Payment Requests from Firestore
export async function loadPaymentRequestsFromFirestore(): Promise<PaymentRequest[]> {
  if (quotaExceededState) return [];
  const path = 'payment_requests';
  try {
    const snap = await getDocs(collection(db, 'payment_requests'));
    const requests: PaymentRequest[] = [];
    snap.forEach((d) => {
      requests.push(d.data() as PaymentRequest);
    });
    // Sort newest first
    requests.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return requests;
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Update Payment Request status in Firestore
export async function updatePaymentRequestStatusInFirestore(
  requestId: string,
  status: 'approved' | 'rejected',
  reviewedBy?: string,
  adminNote?: string
): Promise<void> {
  const path = `payment_requests/${requestId}`;
  try {
    const upd: Record<string, any> = {
      status,
      reviewedAt: new Date().toISOString()
    };
    if (reviewedBy) upd.reviewedBy = reviewedBy;
    if (adminNote) upd.adminNote = adminNote;
    await setDoc(doc(db, 'payment_requests', requestId), upd, { merge: true });
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Delete Payment Request
export async function deletePaymentRequestFromFirestore(requestId: string): Promise<void> {
  const path = `payment_requests/${requestId}`;
  try {
    await deleteDoc(doc(db, 'payment_requests', requestId));
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}


