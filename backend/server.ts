import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { Recording } from './types';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

function transcodeToMp4(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-crf 20',
        '-preset fast',
        '-b:a 128k',
        '-movflags +faststart'
      ])
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

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
function readDB(): Recording[] {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB, resetting database:', err);
    return [];
  }
}

// Write database
function writeDB(data: Recording[]): void {
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
app.post('/api/upload', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { title, duration } = req.body;
    const db = readDB();
    
    let finalFileName = req.file.filename;
    let finalSize = req.file.size;

    // Check if the file needs transcoding to MP4
    if (path.extname(req.file.filename).toLowerCase() !== '.mp4') {
      const mp4FileName = req.file.filename.replace(path.extname(req.file.filename), '.mp4');
      const mp4Path = path.join(uploadsDir, mp4FileName);
      
      try {
        await transcodeToMp4(req.file.path, mp4Path);
        // Clean up the original uploaded file (e.g. WebM)
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        finalFileName = mp4FileName;
        finalSize = fs.statSync(mp4Path).size;
      } catch (transcodeErr) {
        console.error('Transcoding to MP4 failed, falling back to original file:', transcodeErr);
        // Keep the original uploaded file parameters
      }
    }

    const newRecording: Recording = {
      id: path.basename(finalFileName, path.extname(finalFileName)),
      title: title || 'Untitled Recording',
      duration: parseFloat(duration) || 0,
      createdAt: new Date().toISOString(),
      fileName: finalFileName,
      size: finalSize
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
app.get('/api/recordings', (req: Request, res: Response) => {
  try {
    const db = readDB();
    // Return sorted by date descending (latest first)
    const sorted = db.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(sorted);
  } catch (err) {
    console.error('Get recordings error:', err);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

// Get a single recording
app.get('/api/recordings/:id', (req: Request, res: Response) => {
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
app.delete('/api/recordings/:id', (req: Request, res: Response) => {
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

export default app;
