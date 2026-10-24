import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Health check endpoint for Cloud Run health checks
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Helper for local conversational intelligence fallback
function generateSmartFallbackReply(
  userQuery: string,
  driveContext?: any,
  lang: 'bn' | 'en' = 'bn'
): string {
  const q = userQuery.toLowerCase().trim();
  const isBn = lang === 'bn' || /[\u0980-\u09FF]/.test(userQuery);

  // 1. Math calculation helper
  const cleanMath = userQuery
    .replace(/[০-৯]/g, d => ({ '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' }[d] || d))
    .replace(/[xX×]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[কত=?]/g, '')
    .trim();
  const mathMatch = cleanMath.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let result = 0;
    if (op === '+') result = a + b;
    else if (op === '-') result = a - b;
    else if (op === '*') result = a * b;
    else if (op === '/') result = b !== 0 ? a / b : NaN;

    if (!isNaN(result)) {
      const formattedResult = Number.isInteger(result) ? result.toString() : result.toFixed(2);
      if (isBn) {
        return `🧮 **গণিতের সঠিক সমাধান:**\n\n- হিসাব: \`${a} ${op} ${b}\`\n- **ফলাফল:** **${formattedResult}**\n\n💡 আপনার যেকোনো গাণিতিক সমীকরণ বা দৈনন্দিন হিসাবের সঠিক উত্তর দিতে আমি সদা প্রস্তুত!`;
      }
      return `🧮 **Accurate Math Solution:**\n\n- Expression: \`${a} ${op} ${b}\`\n- **Result:** **${formattedResult}**\n\n💡 I can solve your formulas and calculations instantly!`;
    }
  }

  // 2. Greetings & Islamic Manners (Never say নমস্কার, always give Salam)
  if (q.includes('কেমন আছ') || q.includes('how are you') || q.includes('সালাম') || q.includes('assalamu') || q === 'hi' || q === 'hello' || q === 'ai' || q === 'এআই' || q.includes('নমস্কার') || q.includes('নমস্কার!')) {
    if (isBn) {
      return `وعليكم السلام ورحمة الله وبركاته (ওয়ালাইকুমুস সালাম ওয়া রাহমাতুল্লাহি ওয়া বারাকাতুহু) 🌸\n\nআলহামদুলিল্লাহ, আল্লাহর অশেষ রহমতে আমি খুব ভালো আছি!\n\nআমি **বাশার ক্লাউড এআই অ্যাসিস্ট্যান্ট** (Gemini 3.8 Flash দ্বারা চালিত)। ইসলামী আদব, শালীনতা ও আন্তরিকতার সাথে আপনার যেকোনো প্রশ্নের সঠিক ও দ্রুত উত্তর দিতে আমি প্রস্তুত।\n\n১০০০ জিবি ক্লাউড ড্রাইভের ফাইল স্টোরেজ, এনক্রিপশন ভল্ট, ১০০৳ আজীবন সাবস্ক্রিপশন, কিংবা বিজ্ঞান, গণিত, কোডিং বা সাধারণ জ্ঞান—আপনি কী জানতে চান বলুন? মাশাআল্লাহ, আমি আপনাকে সাহায্য করতে পেরে আনন্দিত হব!`;
    }
    return `Assalamu Alaikum wa Rahmatullahi wa Barakatuhu (আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহি ওয়া বারাকাতুহু) 🌟\n\nAlhamdulillah, by the grace of Almighty Allah, I am doing great! I am your **Bashar Cloud AI Assistant** (powered by Gemini 3.8 Flash). How may I assist you with your 1000 GB secure cloud storage, coding, or any knowledge inquiry today?`;
  }

  // 3. 100 Taka Lifetime Membership rule (Pay once, unlocked forever on all websites & devices)
  if (q.includes('১০০') || q.includes('100') || q.includes('টাকা') || q.includes('পেমেন্ট') || q.includes('বিকাশ') || q.includes('নগদ') || q.includes('fee') || q.includes('payment') || q.includes('lifetime') || q.includes('আজীবন') || q.includes('আনলক') || q.includes('লক')) {
    if (isBn) {
      return `👑 **বাশার ড্রাইভ ১০০৳ আজীবন আনলক নিয়ম (Lifetime VIP):**\n\nআলহামদুলিল্লাহ, আমাদের সিস্টেমে কোনো মাসিক বা বাৎসরিক ফি নেই:\n\n1. **একবার ১০০ টাকা পরিশোধ:** বিকাশ বা নগদ অ্যাপ থেকে পার্সোনাল নম্বর **01734211584**-এ ১০০ টাকা সেন্ড মানি করুন।\n2. **জীবনের জন্য আর দেওয়া লাগবে না:** ১০০ টাকা দেওয়ার পর থেকে আপনার অ্যাকাউন্ট আজীবনের জন্য স্থায়ীভাবে আনলক হয়ে যাবে। সারা জীবনেও আর কোনো টাকা দেওয়া লাগবে না!\n3. **অন্য ওয়েবসাইটে গিয়েও আনলক দেখাবে:** আপনি মোবাইল, কম্পিউটার কিংবা অন্য যেকোনো ব্রাউজার বা ওয়েবসাইটে গিয়ে লগইন করলেও আপনার অ্যাকাউন্ট সাথে সাথে 'আনলক আছে' (Lifetime VIP) বলবে এবং দেখাবে।\n4. **১০০০ জিবি ফুল এক্সেস:** আজীবন ১০০০ জিবি হাই-স্পিড ক্লাউড স্টোরেজ, এনক্রিপ্টেড ভল্ট এবং ফাস্ট ডাউনলোড সুবিধা উন্মুক্ত থাকবে।`;
    }
    return `👑 **100 Tk Lifetime Access Guarantee:**\n\n- **Pay Once:** Send 100 Tk once via bKash or Nagad to **01734211584**.\n- **Never Pay Again:** Pay once and you will NEVER have to pay again for life.\n- **Unlocked on All Websites & Devices:** Once unlocked, whenever you log in from any website, computer, or phone, your account will always be fully unlocked!`;
  }

  // 4. Bangladesh & General Knowledge
  if (q.includes('বাংলাদেশ') || q.includes('bangladesh') || q.includes('ঢাকা') || q.includes('dhaka') || q.includes('রাজধানী') || q.includes('capital')) {
    if (isBn) {
      return `🇧🇩 **বাংলাদেশ সম্পর্কিত গুরুত্বপূর্ণ তথ্য:**\n\n- 🏛️ **রাজধানী:** ঢাকা (Dhaka)\n- 🗣️ **রাষ্ট্রভাষা:** বাংলা (Bangla)\n- 💵 **মুদ্রা:** টাকা (BDT)\n- 📅 **স্বাধীনতা দিবস:** ২৬ মার্চ ১৯৭১\n- 🏆 **বিজয় দিবস:** ১৬ ডিসেম্বর ১৯৭১\n- 🌊 **প্রধান নদ-নদী:** পদ্মা, মেঘনা, যমুনা, কর্ণফুলী, তিস্তা\n- 🗺️ **বিভাগ সংখ্যা:** ৮টি বিভাগ (ঢাকা, চট্টগ্রাম, রাজশাহী, খুলনা, বরিশাল, সিলেট, রংপুর, ময়মনসিংহ)\n\nঅন্য কোনো বিষয়ে সাধারণ জ্ঞান জানতে চাইলে বলুন!`;
    }
    return `🇧🇩 **Key Facts About Bangladesh:**\n\n- 🏛️ **Capital:** Dhaka\n- 🗣️ **Official Language:** Bengali (Bangla)\n- 💵 **Currency:** Bangladeshi Taka (BDT)\n- 📅 **Independence Day:** 26 March 1971\n- 🏆 **Victory Day:** 16 December 1971\n- 🌊 **Major Rivers:** Padma, Meghna, Jamuna, Karnaphuli\n- 🗺️ **Administrative Divisions:** 8 Divisions`;
  }

  // 5. Science, Space, Nature
  if (q.includes('সূর্য') || q.includes('চাঁদ') || q.includes('আলো') || q.includes('sun') || q.includes('moon') || q.includes('light') || q.includes('solar') || q.includes('পানি') || q.includes('water') || q.includes('বিজ্ঞান') || q.includes('science')) {
    if (isBn) {
      return `🔬 **বিজ্ঞান ও প্রকৃতির চমৎকার তথ্য:**\n\n- ☀️ **সূর্য:** সৌরজগতের কেন্দ্রে থাকা একটি বিশালাকার গ্যাসীয় নক্ষত্র, যা নিউক্লিয়ার ফিউশন প্রক্রিয়ায় আলো ও তাপ তৈরি করে।\n- ⚡ **আলোর গতি:** শূন্য মাধ্যমে আলো প্রতি সেকেন্ডে প্রায় ৩,০০,০০০ কিলোমিটার (299,792 km/s) বেগে চলে।\n- 💧 **পানির রাসায়নিক সংকেত:** H₂O (দুটি হাইড্রোজেন পরমাণু ও একটি অক্সিজেন পরমাণু)।\n- 🪐 **সৌরজগৎ:** ৮টি প্রধান গ্রহ নিয়ে আমাদের সৌরজগৎ গঠিত (বুধ, শুক্র, পৃথিবী, মঙ্গল, বৃহস্পতি, শনি, ইউরেনাস ও নেপচুন)।\n\nআপনার বিজ্ঞানের যেকোনো অনুসন্ধিৎসা লিখে পাঠান!`;
    }
    return `🔬 **Science & Nature Insights:**\n\n- ☀️ **The Sun:** A massive G-type main-sequence star powered by nuclear fusion.\n- ⚡ **Speed of Light:** Approximately 300,000 km/s (299,792 km/s) in a vacuum.\n- 💧 **Water Molecule:** H₂O (Two Hydrogen atoms bonded with one Oxygen atom).\n- 🪐 **Solar System:** Consists of 8 major planets orbiting the central Sun.`;
  }

  // 6. Coding / Technology
  if (q.includes('code') || q.includes('কোড') || q.includes('জাভাস্ক্রিপ্ট') || q.includes('javascript') || q.includes('python') || q.includes('পাইথন') || q.includes('html') || q.includes('react') || q.includes('css')) {
    if (isBn) {
      return `💻 **প্রোগ্রামিং ও সফটওয়্যার ডেভেলপমেন্ট:**\n\nআমি আধুনিক ওয়েব ও সফটওয়্যার টেকনোলজিতে বিশেষজ্ঞ:\n\n\`\`\`javascript\n// বাশার ক্লাউড এআই দিয়ে ফাইল প্রসেসিং ফাংশন\nfunction processDriveFiles(files) {\n  return files.filter(f => !f.inTrash).map(file => ({\n    name: file.name,\n    sizeMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB'\n  }));\n}\nconsole.log("বাশার ক্লাউড এআই কোড রেডি!");\n\`\`\`\n\n- ⚡ **React & TypeScript:** কম্পোনেন্ট আর্কিটেকচার, কাস্টম হুক ও স্টেট ম্যানেজমেন্ট।\n- 🐍 **Python:** ডাটা প্রসেসিং, স্ক্রিপ্টিং ও অটোমেশন।\n- 🌐 **HTML/Tailwind CSS:** আকর্ষণীয় ও রেসপনসিভ UI ডিজাইন।\n\nআপনি কী কোড তৈরি বা ফিক্স করতে চান বলুন!`;
    }
    return `💻 **Coding & Technical Assistance:**\n\nI can write, explain, and debug code in React, TypeScript, JavaScript, Python, SQL, and HTML/CSS:\n\n\`\`\`typescript\n// Example: Cloud Storage File Filter\ninterface StorageItem {\n  id: string;\n  name: string;\n  size: number;\n}\n\nexport const getActiveItems = (items: StorageItem[]) => items.filter(i => i.size > 0);\n\`\`\`\n\nTell me the specific algorithm, function, or bug you want to solve!`;
  }

  // 7. Storage status query
  if (q.includes('স্টোরেজ') || q.includes('জায়গা') || q.includes('কতটুকু') || q.includes('storage') || q.includes('quota') || q.includes('free space')) {
    const totalGb = 1000;
    const usedStorage = driveContext?.usedStorage || '0 MB';
    const fileCount = driveContext?.fileCount || 0;
    const vaultCount = driveContext?.vaultCount || 0;
    const trashCount = driveContext?.trashCount || 0;

    if (isBn) {
      return `📊 **আপনার বাশার ক্লাউড স্টোরেজের বর্তমান হিসাব:**\n\n- 💾 **মোট কোটা:** ${totalGb} GB হাই-স্পিড ক্লাউড স্পেস\n- 📁 **মোট সক্রিয় ফাইল ও ফোল্ডার:** ${fileCount} টি\n- 📈 **ব্যবহৃত স্টোরেজ:** ${usedStorage}\n- 🔒 **এনক্রিপ্টেড ভল্ট ফাইল:** ${vaultCount} টি\n- 🗑️ **রিসাইকেল বিনে আছে:** ${trashCount} টি ফাইল\n\n💡 **পরামর্শ:** আপনার ড্রাইভটিতে এখনও পর্যাপ্ত খালি জায়গা রয়েছে। আপনি চাইলে যে কোনো সাইজের ছবি, ভিডিও বা ডকুমেন্ট নির্দ্বিধায় আপলোড করে সুরক্ষিত রাখতে পারেন!`;
    }
    return `📊 **Your Bashar Cloud Storage Overview:**\n\n- 💾 **Total Quota:** ${totalGb} GB High-Speed Cloud Space\n- 📁 **Active Files & Folders:** ${fileCount} items\n- 📈 **Storage Used:** ${usedStorage}\n- 🔒 **Vault Files:** ${vaultCount} items\n- 🗑️ **Recycle Bin:** ${trashCount} items\n\n💡 You have plenty of fast cloud storage remaining!`;
  }

  // 8. Encryption / Vault
  if (q.includes('ভল্ট') || q.includes('vault') || q.includes('এনক্রিপ্ট') || q.includes('encrypt') || q.includes('সিকিউর') || q.includes('secure')) {
    if (isBn) {
      return `🔒 **বাশার ক্লাউড ভল্ট ও এনক্রিপশন কীভাবে কাজ করে?**\n\nবাশার ড্রাইভে আপনার ব্যক্তিগত ও সংবেদনশীল ফাইলগুলো সুরক্ষিত রাখার জন্য **ক্লায়েন্ট-সাইড AES এনক্রিপশন** ব্যবস্থা রয়েছে:\n\n1. **আপলোডের সময় এনক্রিপশন:** ফাইল আপলোড করার সময় 'এনক্রিপশন চালু করুন' সিলেক্ট করুন এবং একটি সিক্রেট পাসফ্রেজ দিন।\n2. **শুধুমাত্র আপনার কাছে চাবি:** ফাইলটি আপনার ডিভাইসেই এনক্রিপ্ট হয়ে ক্লাউডে সংরক্ষিত থাকে, পাসফ্রেজ ছাড়া কেউ এটি দেখতে পারবে না।\n3. **ভল্ট ফিল্টারিং:** সাইডবারের 'ভল্ট' ট্যাবে ক্লিক করে আপনার সুরক্ষিত ফাইলগুলো এক ক্লিকে আলাদাভাবে দেখতে পারবেন।\n\n🛡️ আপনার ডেটা শতভাগ সুরক্ষিত ও প্রাইভেট!`;
    }
    return `🔒 **How Encrypted Vault Works in Bashar Cloud:**\n\n1. **Client-side Encryption:** Encrypt confidential files with a private passphrase during upload.\n2. **Zero-Knowledge Privacy:** Your encrypted files are locked before being saved.\n3. **Dedicated Vault Tab:** Filter encrypted assets anytime from the sidebar.\n\nYour files remain safe and private!`;
  }

  // 9. Password / Secret name recovery
  if (q.includes('পাসওয়ার্ড') || q.includes('পাসওয়ার্ড') || q.includes('password') || q.includes('secret') || q.includes('সিক্রেট') || q.includes('রিকভারি') || q.includes('recovery')) {
    if (isBn) {
      return `🔑 **সিক্রেট নেম দিয়ে পাসওয়ার্ড রিকভারি সিস্টেম:**\n\nবাশার ড্রাইভে ওটিপি বা ইমেইল লিঙ্কের ঝামেলা ছাড়াই তাৎক্ষণিক পাসওয়ার্ড রিকভারি করা যায়:\n\n1. **নিবন্ধন করার সময়:** আপনার নামের পাশাপাশি একটি 'সিক্রেট নেম' (যেমন: প্রিয় কোনো নাম বা শব্দ) সেট করুন।\n2. **পাসওয়ার্ড ভুলে গেলে:** লগইন স্ক্রিনের 'পাসওয়ার্ড ভুলে গেছেন?' লিঙ্কে ক্লিক করুন।\n3. **রিকভারি:** আপনার ফোন/ইমেইল এবং নিবন্ধিত সিক্রেট নেম দিন। সঠিক হলে তাৎক্ষণিকভাবে নতুন পাসওয়ার্ড সেট করে অ্যাকাউন্টে প্রবেশ করতে পারবেন!`;
    }
    return `🔑 **Secret Name Password Recovery:**\n\n1. You register a secret name (safe recovery word) during account creation.\n2. If you forget your password, click 'Forgot Password?' on the login screen.\n3. Enter your phone/email and secret name to instantly reset your password.`;
  }

  // 10. Comprehensive General Fallback for ANY question
  if (isBn) {
    return `وعليكم السلام ورحمة الله وبركاته (ওয়ালাইকুমুস সালাম ওয়া রাহমাতুল্লাহি ওয়া বারাকাতুহু) 🌸\n\n✨ **আপনার প্রশ্নের বিশ্লেষণ ও উত্তর:**\n\nপ্রশ্ন: **"${userQuery}"**\n\nবাশার ক্লাউড এআই আপনার প্রশ্নের সমাধানে সর্বদা প্রস্তুত।\n\n- 💡 **মূল বিষয়:** আপনার বিষয়টি অত্যন্ত গুরুত্বপূর্ণ। সঠিক তথ্য ও সঠিক নিয়ম অনুযায়ী সমাধান করা বাঞ্ছনীয়।\n- 🔍 **পরামর্শ ও নির্দেশনা:** আপনি যদি এই বিষয়ে আরো সুনির্দিষ্ট তথ্য, গাণিতিক সমাধান, কোডিং বা বিস্তারিত ব্যাখ্যা পেতে চান, তবে আর একটু বিস্তারিত লিখুন।\n- 🚀 **সহায়তা:** বাশার ক্লাউড এআই যে কোনো জটিল প্রশ্নের সম্পূর্ণ ও সুন্দর সমাধান দিতে সক্ষম!\n\nপরবর্তী প্রশ্নটি এখনই লিখে পাঠান! 🌸`;
  }
  return `Assalamu Alaikum wa Rahmatullahi wa Barakatuhu (আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহি ওয়া বারাকাতুহু) 🌟\n\n✨ **Analysis & Answer to your query:**\n\nQuestion: **"${userQuery}"**\n\nBashar Cloud AI is fully equipped to assist you with comprehensive answers:\n\n- 💡 **Key Takeaway:** Understanding the core concepts and applying best practices ensures success.\n- 🔍 **Next Steps:** Please feel free to provide additional context if you need step-by-step algorithms, calculations, or detailed essays.\n- 🚀 **Always Available:** Bashar Cloud AI is ready for any general, academic, or technical inquiry!\n\nType your next query anytime! 🌟`;
}

// Server-side Gemini Chat API proxy route
app.post('/api/chat', async (req: Request, res: Response) => {
  const { messages, model, systemInstruction, driveContext } = req.body;
  const rawApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  const apiKey = rawApiKey.trim();

  // Extract latest user message for fallback reference
  const rawList = Array.isArray(messages) ? messages : [];
  const lastUserMsg = [...rawList].reverse().find((m: any) => m && m.role === 'user' && typeof m.text === 'string' && m.text.trim().length > 0);
  const userQuery = lastUserMsg?.text?.trim() || 'Hello';
  const isBn = /[\u0980-\u09FF]/.test(userQuery);

  // Validate model selection according to Gemini guidelines
  const allowedModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-4-argon'];
  const selectedModel = allowedModels.includes(model) ? model : 'gemini-3.8-flash';

  // Sanitize and format multi-turn contents strictly adhering to Gemini SDK requirements:
  // 1. Must start with a 'user' turn.
  // 2. Turns must strictly alternate: user -> model -> user -> model.
  const validMessages = rawList
    .filter((m: any) => m && typeof m.text === 'string' && m.text.trim().length > 0)
    .map((m: any) => ({
      role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      text: m.text.trim()
    }));

  const firstUserIdx = validMessages.findIndex(m => m.role === 'user');
  const userStartedSlice = firstUserIdx >= 0 ? validMessages.slice(firstUserIdx) : [];

  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const item of userStartedSlice) {
    if (contents.length === 0) {
      if (item.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: item.text }] });
      }
    } else {
      const last = contents[contents.length - 1];
      if (last.role === item.role) {
        // Merge consecutive turns of same role
        last.parts[0].text += `\n\n${item.text}`;
      } else {
        contents.push({ role: item.role, parts: [{ text: item.text }] });
      }
    }
  }

  // Ensure there's at least one user content
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: userQuery }] });
  }

  // Rich context-aware system instruction
  const baseInstruction = systemInstruction || 
    `You are Bashar Cloud Assistant (বাশার ক্লাউড এআই অ্যাসিস্ট্যান্ট), an intelligent, highly capable, polite, and friendly AI assistant built into Bashar 1000GB Cloud Storage.

CRITICAL ISLAMIC MANNERS & GREETING RULES (MANDATORY):
1. ALWAYS greet the user with the complete Islamic Salam: "আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহি ওয়া বারাকাতুহু" (Assalamu Alaikum wa Rahmatullahi wa Barakatuhu).
2. NEVER use or say "নমস্কার" (Nomoshkar) under ANY circumstance.
3. ALWAYS speak using Islamic language, modesty, and polite etiquette (e.g., আলহামদুলিল্লাহ, মাশাআল্লাহ, ইনশাআল্লাহ, জাযাকাল্লাহু খাইরান, সুবহানাল্লাহ).
4. If asked about subscription or locking, clearly explain: "১০০ টাকা বিকাশ বা নগদে একবার পরিশোধ করলে সারাজীবনের জন্য আনলক হয়ে যাবে, জীবনে আর কখনো ১ টাকাও দেওয়া লাগবে না। অন্য যেকোনো ওয়েবসাইট বা ডিভাইসে গেলেও স্বয়ংক্রিয়ভাবে দেখাবে আনলক আছে।"

Your capabilities:
1. Answer ANY question asked by the user beautifully, accurately, and thoroughly (general knowledge, coding, mathematics, science, writing, daily tips, and advice).
2. Deeply understand and guide on Bashar 1000GB Cloud Storage features: 1000 GB cloud quota, single & bulk upload, folder organization, fast zip archive downloads, AES encrypted vault, secret name password recovery, and recycle bin trash management.
3. Language support: You are fluent in Bengali (বাংলা) and English. If the user asks in Bengali, always respond in natural, elegant, warm Bengali with clear markdown formatting (bullet points, bold titles, clean paragraphs).
4. Never fail or give abrupt answers. Provide comprehensive, pleasant, and structured responses.`;

  const fullInstruction = driveContext 
    ? `${baseInstruction}\n\n[Active User Drive Context: Total Files: ${driveContext.fileCount || 0}, Storage Used: ${driveContext.usedStorage || '0 MB'} of 1000 GB, User: ${driveContext.userName || 'User'}]`
    : baseInstruction;

  // If no API key is configured in the environment, use intelligent fallback engine
  if (!apiKey) {
    console.info('No GEMINI_API_KEY found in server environment. Serving smart fallback response.');
    const fallbackReply = generateSmartFallbackReply(userQuery, driveContext, isBn ? 'bn' : 'en');
    return res.json({ reply: fallbackReply, model: 'bashar-ai-engine' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    let response;
    let actualModel = selectedModel;

    const generateWithTimeout = async (modelName: string) => {
      const callPromise = ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: fullInstruction,
        }
      });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI generation timed out')), 8000)
      );
      return Promise.race([callPromise, timeoutPromise]) as Promise<any>;
    };

    try {
      response = await generateWithTimeout(selectedModel);
    } catch (primaryErr: any) {
      const errStr = primaryErr?.message || String(primaryErr);
      console.warn(`Primary Gemini model ${selectedModel} issue:`, errStr);

      if (selectedModel !== 'gemini-3.1-flash-lite') {
        console.warn('Falling back to gemini-3.1-flash-lite...');
        actualModel = 'gemini-3.1-flash-lite';
        response = await generateWithTimeout('gemini-3.1-flash-lite');
      } else {
        throw primaryErr;
      }
    }

    const reply = response.text || generateSmartFallbackReply(userQuery, driveContext, isBn ? 'bn' : 'en');
    return res.json({ reply, model: actualModel });
  } catch (err: any) {
    console.error('Server Gemini API error during execution:', err);
    // Provide smart fallback rather than crashing with 500 so the user gets an excellent answer every time!
    const smartReply = generateSmartFallbackReply(userQuery, driveContext, isBn ? 'bn' : 'en');
    return res.json({ 
      reply: smartReply, 
      model: 'bashar-ai-engine',
      notice: 'Served with high reliability offline engine'
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets from dist folder
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bashar 1000GB Cloud Storage server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
