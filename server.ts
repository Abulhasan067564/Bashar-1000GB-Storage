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

// Server-side Gemini Chat API proxy route
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, model, systemInstruction, driveContext } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined in server environment.');
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY is not configured on the server. Please add your Gemini API key in Secrets.' 
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Validate model selection according to Gemini guidelines
    const allowedModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-4-argon'];
    const selectedModel = allowedModels.includes(model) ? model : 'gemini-3.8-flash';

    // Format chat conversation history for @google/genai SDK
    const contents = (messages || []).map((m: { role: string; text: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    // Rich context-aware system instruction
    const baseInstruction = systemInstruction || 
      `You are Bashar Cloud Assistant, an intelligent, helpful, and friendly AI assistant built directly into Bashar 1000GB Cloud Storage.
You help users manage files, organize folders, find photos and videos, explain cloud storage features (such as 1000GB storage, batch upload, zip downloads, vault encryption, secret name recovery), answer questions in Bengali or English, and provide smart productivity tips.
Always be polite, warm, concise, and helpful. If the user writes in Bengali, reply naturally in clear, pleasant Bengali.`;

    const fullInstruction = driveContext 
      ? `${baseInstruction}\n\n[Active User Drive Context: Total Files: ${driveContext.fileCount || 0}, Storage Used: ${driveContext.usedStorage || '0 MB'} of 1000 GB, User: ${driveContext.userName || 'User'}]`
      : baseInstruction;

    let response;
    let actualModel = selectedModel;
    try {
      response = await ai.models.generateContent({
        model: selectedModel,
        contents,
        config: {
          systemInstruction: fullInstruction,
        }
      });
    } catch (primaryErr: any) {
      const errStr = primaryErr?.message || String(primaryErr);
      if ((errStr.includes('503') || errStr.includes('high demand') || errStr.includes('UNAVAILABLE')) && selectedModel !== 'gemini-3.1-flash-lite') {
        console.warn(`Model ${selectedModel} experienced high demand spike, seamlessly falling back to gemini-3.1-flash-lite`);
        actualModel = 'gemini-3.1-flash-lite';
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: {
            systemInstruction: fullInstruction,
          }
        });
      } else {
        throw primaryErr;
      }
    }

    const reply = response.text || 'কোনো উত্তর পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।';
    return res.json({ reply, model: actualModel });
  } catch (err: any) {
    console.error('Server Gemini API error:', err);
    return res.status(500).json({ 
      error: err.message || 'Failed to process AI chat request' 
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
