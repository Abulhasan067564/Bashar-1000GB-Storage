export interface SecurityTopic {
  id: string;
  titleBn: string;
  titleEn: string;
  badge: string;
  severity: 'Critical' | 'High' | 'Medium';
  descriptionBn: string;
  vulnerableCode: string;
  securedCode: string;
  bestPracticesBn: string[];
}

export const SQL_SECURITY_GUIDELINES: SecurityTopic[] = [
  {
    id: 'parameterized-queries',
    titleBn: 'প্যারামিটারাইজড কোয়েরি এবং প্রিপেয়ার্ড স্টেটমেন্ট',
    titleEn: 'Parameterized Queries & Prepared Statements',
    badge: 'SQLi Defense #1',
    severity: 'Critical',
    descriptionBn: 'এসকিউএল ইনজেকশন (SQL Injection) আক্রমণের বিরুদ্ধে প্রধান প্রতিরক্ষা ব্যবস্থা হলো ডায়নামিক স্ট্রিং কনক্যাটেনেশন বর্জন করা এবং ডেটাবেস ড্রাইভারের প্যারামিটার বাইন্ডিং ব্যবহার করা। ডেটা ও এসকিউএল কোড আলাদা চ্যানেলে প্রক্রিয়া হওয়ায় আক্রমণকারীর ক্ষতিকর ইনপুট কোড হিসেবে কার্যকর হতে পারে না।',
    vulnerableCode: `// ❌ বিপজ্জনক: সরাসরি ইনপুট কনক্যাটেনেশন (SQL Injection Vulnerable)
const query = "SELECT * FROM users WHERE email = '" + req.body.email + "' AND password = '" + req.body.password + "'";
const result = await db.query(query);
// যদি আক্রমণকারী email = "admin' --" দেয়, সে পাসওয়ার্ড ছাড়াই লগইন করতে পারবে!`,
    securedCode: `// ✅ সুরক্ষিত: প্যারামিটারাইজড স্টেটমেন্ট (Parameterized Query)
// PostgreSQL (pg / postgres)
const query = 'SELECT id, email, password_hash, secret_name FROM users WHERE email = $1 LIMIT 1';
const result = await db.query(query, [req.body.email]);

// Drizzle ORM / Prisma (স্বয়ংক্রিয় প্যারামিটারাইজেশন)
const user = await db.select().from(users).where(eq(users.email, req.body.email));`,
    bestPracticesBn: [
      'ব্যবহারকারীর কোনো ইনপুট সরাসরি এসকিউএল স্টেটমেন্টে যোগ (concatenate) করবেন না।',
      'PostgreSQL এ $1, $2 এবং MySQL এ ? প্লেসহোল্ডার ব্যবহার করুন।',
      'Drizzle ORM বা Prisma এর মতো টাইপসেফ ও প্যারামিটারাইজড ORM ব্যবহার করুন।',
      'প্রিপেয়ার্ড স্টেটমেন্ট ব্যবহার করলে ডেটাবেস সার্ভার কোয়েরি প্ল্যান ক্যাশ করে পারফরম্যান্সও বৃদ্ধি করে।'
    ]
  },
  {
    id: 'least-privilege',
    titleBn: 'ন্যূনতম সুবিধাপ্রাপ্ত ডেটাবেস ইউজার (Least Privilege Principle)',
    titleEn: 'Principle of Least Privilege for DB Users',
    badge: 'Access Control',
    severity: 'Critical',
    descriptionBn: 'ওয়েব অ্যাপ্লিকেশনের ডেটাবেস কানেকশনকে কখনোই superuser বা root হিসেবে চালাবেন না। অ্যাপ্লিকেশনের জন্য কেবল প্রয়োজনীয় টেবিলসমূহে SELECT, INSERT, UPDATE, DELETE অনুমতি সম্বলিত আলাদা ডেটাবেস ব্যবহারকারী তৈরি করুন।',
    vulnerableCode: `// ❌ বিপজ্জনক: ডেটাবেসে postgres / root বা superuser দিয়ে সংযোগ স্থাপন
DATABASE_URL="postgres://postgres:supersecret@localhost:5432/bashar1000gb"
-- এই ইউজার চাইলে DROP TABLE, ALTER DATABASE, বা ফাইল সিস্টেম কমান্ড চালাতে পারে!`,
    securedCode: `// ✅ সুরক্ষিত: নিয়ন্ত্রিত ইউজার ও রোল ডিফাইন করা
-- PostgreSQL Role Configuration
CREATE ROLE bashar_app_user WITH LOGIN PASSWORD 'strong_random_password_here';
GRANT CONNECT ON DATABASE bashar1000gb TO bashar_app_user;
GRANT USAGE ON SCHEMA public TO bashar_app_user;

-- শুধু প্রয়োজনীয় টেবিলে নির্দিষ্ট অনুমতি প্রদান:
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users, files, shares TO bashar_app_user;
-- DROP TABLE, TRUNCATE বা ALTER অনুমতি বাতিল রাখুন!`,
    bestPracticesBn: [
      'অ্যাপ্লিকেশনের মূল ডেটাবেস রোলকে DDL (Data Definition Language) যেমন DROP TABLE থেকে বিরত রাখুন।',
      'মাইগ্রেশন চালানোর জন্য আলাদা সিআই/সিডি রোল রাখুন যা সাধারণ ওয়েব সার্ভারের হাতে থাকবে না।',
      'কনফিগারেশনে একাধিক রিড-রেপ্লিকার জন্য READ-ONLY ডেটাবেস ইউজার ব্যবহার করুন।'
    ]
  },
  {
    id: 'order-by-injection',
    titleBn: 'ORDER BY ও কলাম নেম ইনজেকশন প্রতিরোধ',
    titleEn: 'Identifier & ORDER BY Injection Guard',
    badge: 'Dynamic SQL',
    severity: 'High',
    descriptionBn: 'এসকিউএল এ কলামের নাম বা ORDER BY ডিরেকশন ($1 প্লেসহোল্ডার হিসেবে) সাধারণ প্যারামিটার বাইন্ডিংয়ে কাজ করে না। তাই এগুলো ডায়নামিক করার সময় কঠোর হোয়াইটলিস্ট (Allowlist) যাচাই করা বাধ্যতামূলক।',
    vulnerableCode: `// ❌ বিপজ্জনক: সরাসরি কাস্টম সর্ট বা ফিল্টার ফিল্ড কোয়েরিতে প্রবেশ
const sortBy = req.query.sortBy; // আক্রমণকারী দিতে পারে: "id; DROP TABLE files; --"
const query = "SELECT * FROM files ORDER BY " + sortBy;
const files = await db.query(query);`,
    securedCode: `// ✅ সুরক্ষিত: কঠোর হোয়াইটলিস্ট এবং টাইপ ভ্যালিডেশন
const ALLOWED_COLUMNS: Record<string, string> = {
  name: 'name',
  size: 'size',
  date: 'created_at',
  category: 'category'
};
const ALLOWED_ORDERS = ['ASC', 'DESC'] as const;

const sortBy = ALLOWED_COLUMNS[String(req.query.sortBy)] || 'created_at';
const sortOrder = ALLOWED_ORDERS.includes(req.query.order?.toUpperCase()) ? req.query.order.toUpperCase() : 'DESC';

// সুরক্ষিত কোয়েরি
const query = \`SELECT * FROM files WHERE owner_id = $1 ORDER BY \${sortBy} \${sortOrder}\`;
const files = await db.query(query, [userId]);`,
    bestPracticesBn: [
      'ডায়নামিক কলাম নেম, টেবিল নেম বা সর্ট ডিরেকশনে কখনোই ইউজার ইনপুট সরাসরি নেবেন না।',
      'অবশ্যই নির্দিষ্ট অবজেক্ট বা অ্যারে হোয়াইটলিস্ট দিয়ে ইনপুট ম্যাপ করুন।',
      'Zod বা Joi এর মতো স্কিমা ভ্যালিডেটর দিয়ে কোয়েরি প্যারামস যাচাই করুন।'
    ]
  },
  {
    id: 'password-security',
    titleBn: 'নিরাপদ পাসওয়ার্ড হ্যাশিং ও সল্টিং (Argon2 / bcrypt)',
    titleEn: 'Password Hashing, Salt & 2FA Enforcement',
    badge: 'Auth Hardening',
    severity: 'Critical',
    descriptionBn: 'ডেটাবেসে পাসওয়ার্ড বা সিক্রেট তথ্য কখনোই প্লেইনটেক্সট বা দুর্বল হ্যাশ (MD5, SHA1) হিসেবে রাখবেন না। সর্বদা Argon2id বা bcrypt ব্যবহার করে শক্তিশালী হ্যাশ তৈরি করুন। সাথে টু-ফ্যাক্টর অথেনটিকেশন (2FA) যুক্ত রাখুন।',
    vulnerableCode: `// ❌ বিপজ্জনক: MD5 বা প্লেইনটেক্সট পাসওয়ার্ড সংরক্ষণ
const crypto = require('crypto');
const passwordHash = crypto.createHash('md5').update(password).digest('hex');
// রেইনবো টেবিল বা ব্রুট-ফোর্স আক্রমণে তাৎক্ষণিক ভেঙে ফেলা সম্ভব!`,
    securedCode: `// ✅ সুরক্ষিত: Argon2id বা bcrypt (Work Factor >= 12)
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);

// লগইন ভেরিফিকেশন:
const isMatch = await bcrypt.compare(candidatePassword, user.passwordHash);
if (!isMatch) throw new Error('ভুল ক্রেডেনশিয়াল!');`,
    bestPracticesBn: [
      'Argon2id অথবা bcrypt দিয়ে কমপক্ষে ১২ সল্ট রাউন্ড ব্যবহার করুন।',
      'সিক্রেট নাম বা সিকিউরিটি উত্তরের ক্ষেত্রেও হ্যাশ করে সংরক্ষণ করুন।',
      'লগইন প্রচেষ্টায় রেট-লিমিটিং (Rate Limiting) প্রয়োগ করুন যাতে ব্রুট-ফোর্স রোধ করা যায়।'
    ]
  },
  {
    id: 'encryption-at-rest',
    titleBn: 'ডেটাবেস এনক্রিপশন ও কানেকশন সিকিউরিটি (TLS/SSL)',
    titleEn: 'Data Encryption at Rest & In-Transit (TLS)',
    badge: 'Network & Storage',
    severity: 'High',
    descriptionBn: 'ডেটাবেস ট্র্যাফিক ও সংবেদনশীল ফাইল মেটাডেটা সুরক্ষিত রাখতে ক্লায়েন্ট ও সার্ভারের মধ্যে TLS/SSL এনক্রিপশন বাধ্যতামূলক। ক্লাউড স্টোরেজে ফাইলগুলো AES-256 এনক্রিপ্ট করে সংরক্ষণ করা উচিত।',
    vulnerableCode: `// ❌ বিপজ্জনক: প্লেইনটেক্সট আনএনক্রিপ্টেড ডাটাবেস সংযোগ
const pool = new Pool({
  host: 'db.example.com',
  ssl: false // ট্রানজিট ডেটা স্নিফিং এর শিকার হতে পারে!
});`,
    securedCode: `// ✅ সুরক্ষিত: কঠোর SSL/TLS ভেরিফিকেশন
const pool = new Pool({
  host: process.env.DB_HOST,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/certs/db-ca-certificate.crt').toString()
  }
});`,
    bestPracticesBn: [
      'ডেটাবেসের সমস্ত সংযোগে SSL/TLS বাধ্যতামূলক করুন।',
      'ক্লাউড প্রোভাইডারে (GCP Cloud SQL, AWS RDS) Encryption at Rest (AES-256) সক্রিয় রাখুন।',
      'পরিবেশগত ভেরিয়েবল (.env) নিরাপদ ক্লাউড সিক্রেট ম্যানেজারে রাখুন।'
    ]
  }
];
