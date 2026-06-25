import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from './types';
import User from './models/User';
import Recording from './models/Recording';

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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/capto';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    // Redact password from the URI before logging
    const redactedURI = MONGODB_URI.replace(/:([^:@]+)@/, ':***@');
    console.log(`Connected to MongoDB at ${redactedURI}`);
  })
  .catch(err => console.error('MongoDB connection error:', err));

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

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email: normalizedEmail,
      passwordHash
    });

    const token = jwt.sign({ id: newUser._id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: newUser._id,
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

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
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
    let finalFileName = req.file.filename;
    let finalSize = req.file.size;

    // Check if the file needs transcoding to MP4
    if (path.extname(req.file.filename).toLowerCase() !== '.mp4') {
      const mp4FileName = req.file.filename.replace(path.extname(req.file.filename), '.mp4');
      const mp4Path = path.join(uploadsDir, mp4FileName);
      
      try {
        await transcodeToMp4(req.file.path, mp4Path);
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        finalFileName = mp4FileName;
        finalSize = fs.statSync(mp4Path).size;
      } catch (transcodeErr) {
        console.error('Transcoding to MP4 failed, falling back to original file:', transcodeErr);
      }
    }

    const newRecording = await Recording.create({
      title: title || 'Untitled Recording',
      duration: parseFloat(duration) || 0,
      fileName: finalFileName,
      size: finalSize,
      userId: req.user?.id
    });

    res.status(201).json(newRecording);
  } catch (err) {
    console.error('Upload handler error:', err);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// List all recordings
app.get('/api/recordings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRecordings = await Recording.find({ userId: req.user?.id }).sort({ createdAt: -1 });
    res.json(userRecordings);
  } catch (err) {
    console.error('Get recordings error:', err);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

// Get a single recording
app.get('/api/recordings/:id', async (req: Request, res: Response) => {
  try {
    const recording = await Recording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    res.json(recording);
  } catch (err) {
    console.error('Get recording details error:', err);
    // If it's an invalid ObjectId format, mongoose will throw CastError, we should treat it as 404
    res.status(404).json({ error: 'Recording not found' });
  }
});

// Delete a recording
app.delete('/api/recordings/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const recording = await Recording.findById(req.params.id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    if (recording.userId && recording.userId !== req.user?.id) {
      return res.status(403).json({ error: 'You are not authorized to delete this recording' });
    }

    await Recording.findByIdAndDelete(req.params.id);

    // Delete file from disk
    const filePath = path.join(uploadsDir, recording.fileName);
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
