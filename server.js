const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow requests from the Vercel frontend (and localhost in dev)
app.use((req, res, next) => {
  const allowed = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
const DB_PATH = path.join(__dirname, 'data', 'assets.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Ensure uploads folder exists
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer — save files to public/uploads with their original extension
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
// Cover image uploader — images only
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    cb(null, imageExts.includes(path.extname(file.originalname).toLowerCase()));
  }
});

// Brand asset uploader — any file type up to 100 MB
const uploadAny = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

// -------------------------------------------------------
// Auth config — change these before sharing the project
// -------------------------------------------------------
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'newbelgium';
const activeSessions = new Set(); // in-memory session tokens

app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDB(assets) {
  fs.writeFileSync(DB_PATH, JSON.stringify(assets, null, 2));
}

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.replace('Bearer ', '');
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized. Please log in at /admin.' });
  }
  next();
}

// -------------------------------------------------------
// POST /admin/upload — upload a cover image (auth required)
// Returns: { url } — the public URL for the uploaded file
// -------------------------------------------------------
app.post('/admin/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided, or file type not allowed (jpg, png, gif, webp, svg).' });
  }
  const url = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  res.json({ url });
});

// -------------------------------------------------------
// POST /admin/upload-asset — upload any brand asset file (auth required)
// Returns: { url, filename, originalName, format, size }
// -------------------------------------------------------
app.post('/admin/upload-asset', requireAuth, uploadAny.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided.' });
  const ext  = path.extname(req.file.originalname).toLowerCase().replace('.', '');
  const size = req.file.size < 1024 * 1024
    ? `${(req.file.size / 1024).toFixed(0)} KB`
    : `${(req.file.size / 1024 / 1024).toFixed(1)} MB`;
  res.json({
    url:          `http://localhost:${PORT}/uploads/${req.file.filename}`,
    filename:     req.file.filename,
    originalName: req.file.originalname,
    format:       ext.toUpperCase(),
    size,
  });
});

// -------------------------------------------------------
// POST /auth/login
// Body: { username, password }
// Returns: { token }
// -------------------------------------------------------
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    activeSessions.add(token);
    return res.json({ token });
  }
  res.status(401).json({ error: 'Invalid credentials.' });
});

// -------------------------------------------------------
// POST /auth/logout
// -------------------------------------------------------
app.post('/auth/logout', requireAuth, (req, res) => {
  const token = req.headers['authorization'].replace('Bearer ', '');
  activeSessions.delete(token);
  res.json({ message: 'Logged out.' });
});

// -------------------------------------------------------
// GET /assets — all assets
// -------------------------------------------------------
app.get('/assets', (req, res) => {
  const assets = readDB();
  res.json({ total: assets.length, assets });
});

// -------------------------------------------------------
// GET /assets/search?q=keyword
// -------------------------------------------------------
app.get('/assets/search', (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Please provide a search term using ?q=keyword' });
  }
  const keyword = query.toLowerCase();
  const assets = readDB();
  const results = assets.filter(asset =>
    asset.productName.toLowerCase().includes(keyword) ||
    asset.sku.toLowerCase().includes(keyword) ||
    asset.tags.some(tag => tag.toLowerCase().includes(keyword))
  );
  res.json({ query, total: results.length, assets: results });
});

// -------------------------------------------------------
// GET /assets/filter?category=ipa
// -------------------------------------------------------
app.get('/assets/filter', (req, res) => {
  const category = req.query.category;
  if (!category) {
    return res.status(400).json({ error: 'Please provide a category using ?category=ipa' });
  }
  const assets = readDB();
  const results = assets.filter(
    asset => asset.category.toLowerCase() === category.toLowerCase()
  );
  res.json({ category, total: results.length, assets: results });
});

// -------------------------------------------------------
// GET /assets/:id — single asset with its files
// -------------------------------------------------------
app.get('/assets/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const assets = readDB();
  const asset = assets.find(a => a.id === id);
  if (!asset) return res.status(404).json({ error: `Asset with id ${id} not found.` });
  res.json(asset);
});

// -------------------------------------------------------
// POST /assets/:id/files — add a downloadable file to an asset (auth required)
// Body: { name, type, format, fileUrl, size }
// -------------------------------------------------------
app.post('/assets/:id/files', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const assets = readDB();
  const index = assets.findIndex(a => a.id === id);
  if (index === -1) return res.status(404).json({ error: `Asset with id ${id} not found.` });

  const { name, type, format, fileUrl, size } = req.body;
  if (!name || !format || !fileUrl) {
    return res.status(400).json({ error: 'name, format, and fileUrl are required.' });
  }

  const newFile = {
    id: `${id}-${type || 'file'}-${Date.now()}`,
    name,
    type: type || 'other',
    format: format.toUpperCase(),
    size: size || 'Unknown',
    fileUrl,
  };

  if (!assets[index].files) assets[index].files = [];
  assets[index].files.push(newFile);
  writeDB(assets);
  res.status(201).json(newFile);
});

// -------------------------------------------------------
// POST /assets — create a new asset (auth required)
// -------------------------------------------------------
app.post('/assets', requireAuth, (req, res) => {
  const { productName, sku, category, season, tags, imageUrl } = req.body;
  if (!productName || !sku || !category || !season) {
    return res.status(400).json({ error: 'productName, sku, category, and season are required.' });
  }
  const assets = readDB();
  const newAsset = {
    id: assets.length > 0 ? Math.max(...assets.map(a => a.id)) + 1 : 1,
    productName,
    sku,
    category: category.toLowerCase(),
    season: season.toLowerCase(),
    tags: Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean),
    imageUrl: imageUrl || `https://placehold.co/400x400?text=${encodeURIComponent(productName)}`
  };
  assets.push(newAsset);
  writeDB(assets);
  res.status(201).json(newAsset);
});

// -------------------------------------------------------
// PUT /assets/:id — update an asset (auth required)
// -------------------------------------------------------
app.put('/assets/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const assets = readDB();
  const index = assets.findIndex(a => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Asset with id ${id} not found.` });
  }
  const { productName, sku, category, season, tags, imageUrl } = req.body;
  assets[index] = {
    ...assets[index],
    ...(productName && { productName }),
    ...(sku && { sku }),
    ...(category && { category: category.toLowerCase() }),
    ...(season && { season: season.toLowerCase() }),
    ...(tags !== undefined && {
      tags: Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean)
    }),
    ...(imageUrl !== undefined && { imageUrl })
  };
  writeDB(assets);
  res.json(assets[index]);
});

// -------------------------------------------------------
// DELETE /assets/:id — delete an asset (auth required)
// -------------------------------------------------------
app.delete('/assets/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const assets = readDB();
  const index = assets.findIndex(a => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Asset with id ${id} not found.` });
  }
  const [deleted] = assets.splice(index, 1);
  writeDB(assets);
  res.json({ message: `Deleted "${deleted.productName}".`, asset: deleted });
});

// Start the server
app.listen(PORT, () => {
  console.log(`\nNew Belgium DAM API is running!`);
  console.log(`Open: http://localhost:${PORT}/assets\n`);
  console.log('Public endpoints:');
  console.log(`  GET    /assets`);
  console.log(`  GET    /assets/search?q=keyword`);
  console.log(`  GET    /assets/filter?category=ipa`);
  console.log('\nAdmin endpoints (require auth token):');
  console.log(`  POST   /auth/login`);
  console.log(`  POST   /auth/logout`);
  console.log(`  POST   /assets`);
  console.log(`  PUT    /assets/:id`);
  console.log(`  DELETE /assets/:id`);
});
