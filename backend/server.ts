import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Recording, User, AuthenticatedRequest } from './types';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

function transcodeToMp4(inputPath: string, outputPath: string): Promise<void> {
  console.log(`[Transcoder] Starting transcoding of ${path.basename(inputPath)} to MP4...`);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioFilters('highpass=f=100, lowpass=f=10000, afftdn=nr=24')
      .outputOptions([
        '-crf 20',
        '-preset fast',
        '-b:a 128k',
        '-movflags +faststart'
      ])
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[Transcoder] Transcoding progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`[Transcoder] Successfully transcoded to ${path.basename(outputPath)}`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`[Transcoder] Transcoding failed:`, err);
        reject(err);
      })
      .run();
  });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Custom Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Enable CORS so frontend can communicate with backend
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'capto-fallback-secret-key-12345';

// Ensure directories exist
const uploadsDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'recordings.json');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify([], null, 2));
}

const usersDbPath = process.env.USERS_DB_PATH || path.join(process.cwd(), 'users.json');
if (!fs.existsSync(usersDbPath)) {
  fs.writeFileSync(usersDbPath, JSON.stringify([], null, 2));
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

// Read Users database
function readUsersDB(): User[] {
  try {
    const data = fs.readFileSync(usersDbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading Users DB, resetting:', err);
    return [];
  }
}

// Write Users database
function writeUsersDB(data: User[]): void {
  try {
    fs.writeFileSync(usersDbPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing Users DB:', err);
  }
}

// Authentication Middleware
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded as { id: string; email: string };
    next();
  });
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

// Auth Endpoints
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const users = readUsersDB();
    const normalizedEmail = email.toLowerCase().trim();
    if (users.some(u => u.email === normalizedEmail)) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: User = {
      id: 'user-' + Date.now() + '-' + Math.round(Math.random() * 1e9),
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeUsersDB(users);

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = readUsersDB();
    const normalizedEmail = email.toLowerCase().trim();
    const user = users.find(u => u.email === normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// Upload endpoint
app.post('/api/upload', authenticateToken, upload.single('video'), async (req: AuthenticatedRequest, res: Response) => {
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
      size: finalSize,
      userId: req.user?.id
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
app.get('/api/recordings', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = readDB();
    // Only return recordings belonging to the current user
    const userRecordings = db.filter(r => r.userId === req.user?.id);
    // Return sorted by date descending (latest first)
    const sorted = userRecordings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
app.delete('/api/recordings/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = readDB();
    const index = db.findIndex(r => r.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    const recording = db[index];
    if (recording.userId && recording.userId !== req.user?.id) {
      return res.status(403).json({ error: 'You are not authorized to delete this recording' });
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
