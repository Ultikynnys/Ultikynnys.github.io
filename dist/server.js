"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const express_1 = __importDefault(require("express"));
const compression_1 = __importDefault(require("compression"));
const app = (0, express_1.default)();
const root = node_path_1.default.resolve(__dirname, __dirname.endsWith('dist') ? '..' : '.');
const port = Number(process.env.PORT ?? 3000);
// Fingerprint-free assets: a week of browser cache, then revalidate. Text gets gzip via compression().
const CACHEABLE = /\.(?:woff2?|ttf|otf|webp|png|jpe?g|gif|svg|ico|mp4|webm|ogg|wav|mp3)$/i;
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use((0, compression_1.default)());
app.use(express_1.default.static(root, {
    extensions: ['html'],
    dotfiles: 'deny',
    setHeaders: (res, filePath) => {
        if (CACHEABLE.test(filePath))
            res.setHeader('Cache-Control', 'public, max-age=604800');
        else if (/\.html?$/i.test(filePath))
            res.setHeader('Cache-Control', 'no-cache');
        else
            res.setHeader('Cache-Control', 'public, max-age=3600');
    }
}));
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
