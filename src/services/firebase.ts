import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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
  writeBatch
} from 'firebase/firestore';
import { UserAccount, StorageFile, AdminCredentials } from '../types/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notification:', JSON.stringify(errInfo));
}

// Test initial connection to Firestore
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline, using local persistent cache.');
    }
    return false;
  }
}

// Save or update user to Firestore
export async function saveUserToFirestore(user: UserAccount): Promise<void> {
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
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Load users from Firestore
export async function loadUsersFromFirestore(): Promise<UserAccount[]> {
  const path = 'users';
  try {
    const snapshot = await getDocs(collection(db, path));
    const list: UserAccount[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as UserAccount);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Delete user from Firestore
export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Save or update file metadata & content to Firestore
export async function saveFileToFirestore(file: StorageFile): Promise<void> {
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
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fast batch save multiple files to Firestore in a single network round-trip
export async function saveMultipleFilesToFirestore(files: StorageFile[]): Promise<void> {
  if (files.length === 0) return;
  const path = 'files/batch';
  try {
    // Firestore supports up to 500 operations per batch
    const BATCH_LIMIT = 450;
    for (let i = 0; i < files.length; i += BATCH_LIMIT) {
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
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete file from Firestore
export async function deleteFileFromFirestore(fileId: string): Promise<void> {
  const path = `files/${fileId}`;
  try {
    await deleteDoc(doc(db, 'files', fileId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Load user files from Firestore
export async function loadUserFilesFromFirestore(userId: string): Promise<StorageFile[]> {
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
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Save or update admin credentials to Firestore
export async function saveAdminCredentialsToFirestore(creds: AdminCredentials): Promise<void> {
  const path = 'admin_config/credentials';
  try {
    await setDoc(doc(db, 'admin_config', 'credentials'), creds);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Load admin credentials from Firestore
export async function loadAdminCredentialsFromFirestore(): Promise<AdminCredentials | null> {
  const path = 'admin_config/credentials';
  try {
    const snap = await getDoc(doc(db, 'admin_config', 'credentials'));
    if (snap.exists()) {
      return snap.data() as AdminCredentials;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

