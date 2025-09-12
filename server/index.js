// index.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors({
  exposedHeaders: ['X-Metadata']  // allow client to read X-Metadata
}));

app.use(express.json());

// Directories
const uploadsDir = path.join(__dirname, 'uploads');
const metaDir = path.join(__dirname, 'metadata');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(metaDir)) fs.mkdirSync(metaDir);

// Multer storage
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

// POST /upload
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file received" });

    const id = uuidv4();

    // Parse metadata sent from client
    let metadata = {};
    if (req.body.metadata) {
      try {
        metadata = typeof req.body.metadata === "string"
          ? JSON.parse(req.body.metadata)
          : req.body.metadata;
      } catch (err) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Invalid metadata JSON" });
      }
    }

    // Save uploaded file
    const savedFilename = `${id}_${req.file.originalname}`;
    const savedPath = path.join(uploadsDir, savedFilename);
    fs.renameSync(req.file.path, savedPath);

    // Extend metadata
    metadata.id = id;
    metadata.originalFilename = req.file.originalname;
    metadata.savedFilename = savedFilename;
    metadata.uploadTime = new Date().toISOString();

    // Save metadata to disk
    const metaPath = path.join(metaDir, `${id}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), "utf8");

    return res.json({ message: "File uploaded successfully", id, metadata });

  } catch (err) {
    console.error("[ERROR] /upload", err);
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});

// GET /file/:id
app.get('/file/:id', (req, res) => {
  const id = req.params.id;
  const metaPath = path.join(metaDir, `${id}.json`);
  if (!fs.existsSync(metaPath)) return res.status(404).json({ error: 'Metadata not found' });

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const filePath = path.join(uploadsDir, meta.savedFilename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing' });

  // Set metadata header (base64)
  res.setHeader('X-Metadata', Buffer.from(JSON.stringify(meta)).toString('base64'));

  // Set file download headers
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${meta.originalFilename}"`);

  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  fileStream.on('error', (err) => {
    console.error('[ERROR] Streaming file:', err);
    res.status(500).end();
  });
});

// GET /list — list all uploaded files
app.get('/list', (req, res) => {
  const files = fs.readdirSync(metaDir).filter(f => f.endsWith('.json'));
  const metas = files.map(f => JSON.parse(fs.readFileSync(path.join(metaDir, f), 'utf8')));
  res.json(metas);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));
