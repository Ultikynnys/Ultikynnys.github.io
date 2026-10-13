import path from 'node:path';
import express from 'express';

const app = express();
const root = path.resolve(__dirname, __dirname.endsWith('dist') ? '..' : '.');
const port = Number(process.env.PORT ?? 3000);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use(express.static(root, { extensions: ['html'], dotfiles: 'deny' }));
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
