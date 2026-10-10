export const CLOUD_STORAGE_MASTER_PROMPT = `
# 🚀 পরিপূর্ণ প্রম্পট: Bashar 1000GB ক্লাউড স্টোরেজ অ্যাপ্লিকেশন
# (Comprehensive Master Prompt for Modern 1000GB Cloud Storage Platform)

আপনি একটি উচ্চমানের, সুরক্ষিত এবং আধুনিক ক্লাউড স্টোরেজ ওয়েব অ্যাপ্লিকেশন তৈরি করবেন যার নাম "Bashar 1000GB"। অ্যাপ্লিকেশনটিতে ব্যবহারকারীকে ১০০০ জিবি (১ টেরাবাইট) নিরাপদ ক্লাউড স্পেস প্রদান করা হবে। নিচে সিস্টেমের সম্পূর্ণ ফিচার, কোড স্ট্রাকচার, ডেটাবেস ডিজাইন এবং সিকিউরিটি আর্কিটেকচার সুনির্দিষ্টভাবে বর্ণনা করা হলো:

---

### ১. মূল কার্যকারিতা ও ইউজার ইন্টারফেস (Key Features & UI):
1. **ফাইল আপলোড (Upload)**:
   - একক ফাইল আপলোড (Single File Upload) ড্র্যাগ-অ্যান্ড-ড্রপ সুবিধা সহ।
   - সব ধরনের ফাইল (Images, Videos, Audio, Documents, Compressed Archives, Code, Binaries) আপলোড সাপোর্ট।
   - একসাথে একাধিক ফাইল আপলোড (Batch / Bulk Upload) লাইভ প্রগ্রেস বার সহ।
   - আপলোডের পূর্বে ঐচ্ছিক ক্লায়েন্ট-সাইড AES-256 এনক্রিপশন অপশন।

2. **ফাইল ডিলিট (Delete)**:
   - প্রতিটি ফাইলের পাশে কুইক ডিলিট বাটন (এক এক করে ডিলিট)।
   - 'সব একসাথে ডিলিট' (Batch Delete All / Select All Delete) অপশন।
   - রিসাইকেল বিন / ট্র্যাশ (Trash Bin) সুবিধা, যেখান থেকে ফাইল রিস্টোর বা স্থায়ীভাবে অপসারণ করা যায়।

3. **ফাইল ডাউনলোড (Download)**:
   - একক ফাইল তাত্ক্ষণিক ডাউনলোড (Single File Instant Download)।
   - 'সব একসাথে ডাউনলোড' (Bulk Download / Download All as ZIP): নির্বাচিত সমস্ত ফাইল বা ড্রাইভের সকল ফাইলকে স্বয়ংক্রিয়ভাবে একটি সংকুচিত .ZIP ফাইলে বান্ডেল করে এক ক্লিকে ডাউনলোড।

4. **ফাইল শেয়ারিং (Sharing)**:
   - সুরক্ষিত ইউনিক শেয়ার লিংক তৈরি।
   - পাসওয়ার্ড সুরক্ষিত শেয়ারিং (Password Protected Share)।
   - শেয়ার লিংকের মেয়াদ নির্ধারণ (১ দিন, ৭ দিন, স্থায়ী)।
   - সরাসরি মোবাইল ক্যামেরা দিয়ে স্ক্যান করে ডাউনলোড করার জন্য ডায়নামিক QR Code।

5. **অথেনটিকেশন ও অ্যাকাউন্ট রিকভারি (Auth & Recovery)**:
   - ইমেইল / ফোন নম্বর এবং পাসওয়ার্ড দিয়ে সাইন-আপ ও লগইন।
   - **সিক্রেট নাম (Secret Name)** ভেরিফিকেশন: ব্যবহারকারী পাসওয়ার্ড ভুলে গেলে তার সিক্রেট নাম (যেমন: গোপন কোড, প্রিয় শিক্ষক বা শহর) দিয়ে তৎক্ষণাৎ নতুন পাসওয়ার্ড সেট করতে পারবে।
   - **টু-ফ্যাক্টর অথেনটিকেশন (2FA)**: TOTP / Authenticator ভিত্তিক ৬-সংখ্যার দ্বি-স্তরীয় যাচাই ব্যবস্থা।

6. **স্টোরেজ ট্র্যাকিং (1000GB Storage Meter)**:
   - মোট ধারণক্ষমতা ১,০০০ জিবি (1,073,741,824,000 বাইট)।
   - ফাইল ক্যাটাগরি ভিত্তিক ভিজ্যুয়াল পাই চার্ট ও প্রগ্রেস মিটার (Documents, Photos, Videos, Audio, Archives, Other)।

7. **ব্যাকআপ ও রিস্টোর (Backup & Snapshot)**:
   - এক ক্লিকে ড্রাইভের সমস্ত ফাইল মেটাডেটা ও ক্যাটালগ ব্যাকআপ হিসেবে এক্সপোর্ট করা।
   - সংরক্ষিত ব্যাকআপ ফাইল থেকে সম্পূর্ণ ড্রাইভ রিস্টোর করা।

---

### ২. ডেটাবেস ডিজাইন (Database Architecture):

#### ক. ফায়ারস্টোর (Firestore NoSQL Schema):
1. \`/users/{userId}\`:
   - \`id\`: string (Auth UID)
   - \`emailOrPhone\`: string
   - \`name\`: string
   - \`secretNameHash\`: string (SHA-256 / bcrypt)
   - \`twoFactorEnabled\`: boolean
   - \`twoFactorSecret\`: string
   - \`storageLimitBytes\`: number (1073741824000)
   - \`usedBytes\`: number
   - \`createdAt\`: timestamp

2. \`/users/{userId}/files/{fileId}\`:
   - \`id\`: string
   - \`name\`: string
   - \`size\`: number
   - \`category\`: string ('image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'other')
   - \`mimeType\`: string
   - \`storagePath\`: string (gs://bucket/users/{userId}/...)
   - \`isEncrypted\`: boolean
   - \`inTrash\`: boolean
   - \`isStarred\`: boolean
   - \`uploadedAt\`: timestamp

3. \`/shares/{shareId}\`:
   - \`shareId\`: string (Unique NanoID / UUID)
   - \`fileId\`: string
   - \`ownerId\`: string
   - \`requiresPassword\`: boolean
   - \`passwordHash\`: string
   - \`expiresAt\`: timestamp
   - \`views\`: number
   - \`downloads\`: number

#### খ. রিলেশনাল ডেটাবেস ডিজাইন (PostgreSQL SQL Schema):
\`\`\`sql
-- ১. ইউজার টেবিল
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_or_phone VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    secret_name_hash VARCHAR(255) NOT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(64),
    storage_quota_bytes BIGINT DEFAULT 1073741824000, -- 1000 GB
    used_storage_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ২. ফাইল মেটাডেটা টেবিল
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    category VARCHAR(50) NOT NULL,
    storage_url TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT FALSE,
    in_trash BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ৩. শেয়ার লিংক টেবিল
CREATE TABLE shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_token VARCHAR(64) UNIQUE NOT NULL,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_password_protected BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    view_count INT DEFAULT 0,
    download_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

---

### ৩. ফায়ারস্টোর সিকিউরিটি রুলস (firestore.rules):
\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ডিফল্ট ডিনাই
    match /{document=**} {
      allow read, write: if false;
    }

    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // ইউজার প্রোফাইল: শুধু মালিক পড়তে ও লিখতে পারবে
    match /users/{userId} {
      allow read, write: if isOwner(userId);

      // ইউজারের ফাইল সাব-কালেকশন
      match /files/{fileId} {
        allow read, write: if isOwner(userId);
      }
    }

    // শেয়ার কালেকশন: পাবলিক বা ভ্যালিডেটেড রিড
    match /shares/{shareId} {
      allow read: if true;
      allow create, update, delete: if isSignedIn() && request.resource.data.ownerId == request.auth.uid;
    }
  }
}
\`\`\`

---

### ৪. ক্লাউড স্টোরেজ বাকেট রুলস (storage.rules):
\`\`\`javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // প্রতি ব্যবহারকারী শুধুমাত্র তার নিজস্ব ফোল্ডারে ফাইল রাখতে পারবে
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId
                         && request.resource.size < 5000 * 1024 * 1024; // সর্বোচ্চ ৫ জিবি প্রতি ফাইল
    }
    // শেয়ার করা ফাইল ডাউনলোড
    match /public_shares/{shareId}/{allPaths=**} {
      allow read: if true;
    }
  }
}
\`\`\`
`;
