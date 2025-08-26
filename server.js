const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic health endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files from repo root
app.use(express.static(__dirname, { extensions: ['html'] }));

// Convenience route
app.get(['/','/pdf-ocr'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'pdf-ocr.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
