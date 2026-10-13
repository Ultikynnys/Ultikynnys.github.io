import path from 'node:path';
import express from 'express';
import compression from 'compression';

const app = express();
const root = path.resolve(__dirname, __dirname.endsWith('dist') ? '..' : '.');
const port = Number(process.env.PORT ?? 3000);

// Fingerprint-free assets: a week of browser cache, then revalidate. Text gets gzip via compression().
const CACHEABLE = /\.(?:woff2?|ttf|otf|webp|png|jpe?g|gif|svg|ico|mp4|webm|ogg|wav|mp3)$/i;

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use(compression());
app.use(express.static(root, {
    extensions: ['html'],
    dotfiles: 'deny',
    setHeaders: (res, filePath) => {
        if (CACHEABLE.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=604800');
        else if (/\.html?$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
        else res.setHeader('Cache-Control', 'public, max-age=3600');
    }
}));
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
