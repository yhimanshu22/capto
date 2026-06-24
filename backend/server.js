const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS so frontend can communicate with backend
app.use(cors());
app.use(express.json());

// Ensure directories exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(__dirname, 'recordings.json');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify([], null, 2));
}

// Read database
function readDB() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB, resetting database:', err);
    return [];
  }
}

// Write database
function writeDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

// Serve uploaded videos statically
app.use('/videos', express.static(uploadsDir));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let ext = '.webm';
    if (file.mimetype === 'video/mp4') {
      ext = '.mp4';
    } else if (file.originalname) {
      const parsedExt = path.extname(file.originalname);
      if (parsedExt) {
        ext = parsedExt;
      }
    }
    cb(null, 'recording-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for demo recordings
});

// Upload endpoint
app.post('/api/upload', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { title, duration } = req.body;
    const db = readDB();

    const newRecording = {
      id: path.basename(req.file.filename, path.extname(req.file.filename)),
      title: title || 'Untitled Recording',
      duration: parseFloat(duration) || 0,
      createdAt: new Date().toISOString(),
      fileName: req.file.filename,
      size: req.file.size
    };

    db.push(newRecording);
    writeDB(db);

    res.status(201).json(newRecording);
  } catch (err) {
    console.error('Upload handler error:', err);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// List all recordings
app.get('/api/recordings', (req, res) => {
  try {
    const db = readDB();
    // Return sorted by date descending (latest first)
    const sorted = db.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sorted);
  } catch (err) {
    console.error('Get recordings error:', err);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

// Get a single recording
app.get('/api/recordings/:id', (req, res) => {
  try {
    const db = readDB();
    const recording = db.find(r => r.id === req.params.id);
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    res.json(recording);
  } catch (err) {
    console.error('Get recording details error:', err);
    res.status(500).json({ error: 'Failed to fetch recording details' });
  }
});

// Delete a recording
app.delete('/api/recordings/:id', (req, res) => {
  try {
    const db = readDB();
    const index = db.findIndex(r => r.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    const [deleted] = db.splice(index, 1);
    writeDB(db);

    // Delete file from disk
    const filePath = path.join(uploadsDir, deleted.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: 'Recording deleted successfully', id: req.params.id });
  } catch (err) {
    console.error('Delete recording error:', err);
    res.status(500).json({ error: 'Failed to delete recording' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Capto backend listening on port ${PORT}`);
  });
}

module.exports = app;
