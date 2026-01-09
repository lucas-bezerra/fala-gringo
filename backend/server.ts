import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3000;

// __dirname compatível com ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS (seguro manter)
app.use(cors());

// 🔒 Rate limit (proteção principal)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30,            // 30 req por IP
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', apiLimiter);

// 📁 caminho correto para dictionaries
const DICT_DIR = path.join(__dirname, '..', 'dictionaries');

// 🧠 Cache em memória (reduz IO e CPU)
const fileCache = new Map<string, string>();

// 📦 API
app.get('/api/dictionary/:name', async (req, res) => {
  const name = req.params.name;

  // 🚫 validação básica (anti path traversal / spam)
  if (!/^[a-zA-Z0-9_-]+\.txt$/.test(name)) {
    return res.status(400).json({ error: 'Invalid dictionary name' });
  }

  // 🧠 cache hit
  if (fileCache.has(name)) {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h
    return res.json({
      source: 'memory',
      size: fileCache.get(name)!.length,
      text: fileCache.get(name)
    });
  }

  try {
    const filePath = path.join(DICT_DIR, name);
    const text = await fs.readFile(filePath, 'utf-8');

    // salva em memória
    fileCache.set(name, text);

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.json({
      source: 'file',
      size: text.length,
      text
    });
  } catch {
    res.status(404).json({ error: 'Dictionary not found' });
  }
});

// 🟢 Servir frontend buildado
const distPath = path.join(__dirname, '..', '..', 'dist');
app.use(express.static(distPath));

// 🔁 SPA fallback (Express 5 safe)
app.get(/.*/, (_, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});
