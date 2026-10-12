import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Health check endpoint for Cloud Run health checks
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Serve production static assets from dist folder
app.use(express.static(path.resolve(__dirname, 'dist')));

// Fallback to index.html for SPA client-side routing
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bashar 1000GB Cloud Storage server running on http://0.0.0.0:${PORT}`);
});
