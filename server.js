import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');

const app = express();
app.use(express.static(distDir));
// SPA fallback — no path pattern (Express 5's path-to-regexp no longer accepts bare '*').
app.use((_req, res) => res.sendFile(path.join(distDir, 'index.html')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Serving dist/ on port ${port}`));
