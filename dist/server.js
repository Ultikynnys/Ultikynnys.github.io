"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const root = node_path_1.default.resolve(__dirname, __dirname.endsWith('dist') ? '..' : '.');
const port = Number(process.env.PORT ?? 3000);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use(express_1.default.static(root, { extensions: ['html'], dotfiles: 'deny' }));
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
