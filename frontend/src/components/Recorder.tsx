import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, CameraOff, Mic, MicOff, StopCircle, Play, 
  Video, AlertTriangle, ArrowLeft, Loader2, Sparkles 
} from 'lucide-react';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';

export default function Recorder() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [streamReady, setStreamReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Stream references
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<number | null>(null);

  // HTMLVideoElement refs for canvas drawing (hidden)
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawLoopRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Refs to avoid stale closures in callbacks
  const durationRef = useRef<number>(0);
  const titleRef = useRef<string>('');
  const mimeTypeRef = useRef<string>('video/webm;codecs=vp8,opus');
  const extensionRef = useRef<string>('webm');

  // Track title changes in real-time
  titleRef.current = title;

  useEffect(() => {
    // Default title
    const dateStr = new Date().toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    setTitle(`Capto Video - ${dateStr}`);

    // Cleanup resources on unmount
    return () => {
      stopAllStreams();
    };
  }, []);

  const stopAllStreams = () => {
    if (drawLoopRef.current) {
      cancelAnimationFrame(drawLoopRef.current);
    }
    if (workerRef.current) {
      workerRef.current.postMessage({ action: 'stop' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }
    
    // Stop tracks
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    screenStreamRef.current = null;
    cameraStreamRef.current = null;
    combinedStreamRef.current = null;
    audioContextRef.current = null;
  };

  // Step 1: Request permission and get media streams
  const setupStreams = async () => {
    try {
      setError(null);
      stopAllStreams();

      // 1. Get Screen Stream (with optional system audio)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });
      screenStreamRef.current = screenStream;

      // Handle screen sharing cancellation by user (native UI)
      screenStream.getVideoTracks()[0].onended = () => {
        const isRecordingActive = mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive';
        if (isRecordingActive) {
          handleStopRecording(false); // Stop and Save the active recording
        } else {
          handleStopRecording(true);  // Discard and clean up if not recording yet
        }
      };

      // Create hidden video element to render the screen stream
      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;
      screenVideo.playsInline = true;
      screenVideo.autoplay = true;
      await new Promise((resolve) => {
        screenVideo.onloadedmetadata = () => {
          screenVideo.play().then(resolve);
        };
      });
      screenVideoRef.current = screenVideo;

      // 2. Get Camera & Mic stream
      if (cameraEnabled || micEnabled) {
        try {
          let videoConstraint: any = cameraEnabled ? {
            width: { ideal: 320 },
            height: { ideal: 320 },
            frameRate: { ideal: 30 }
          } : false;

          let audioConstraint: any = micEnabled ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } : false;

          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            const isVirtualOrPhone = (label: string) => {
              const l = label.toLowerCase();
              return (
                l.includes('droidcam') ||
                l.includes('iriun') ||
                l.includes('womic') ||
                l.includes('redmi') ||
                l.includes('virtual') ||
                l.includes('obs camera') ||
                l.includes('obs-camera') ||
                l.includes('phone')
              );
            };

            if (cameraEnabled) {
              const videoDevices = devices.filter(d => d.kind === 'videoinput');
              const realVideoDevice = videoDevices.find(d => d.label && !isVirtualOrPhone(d.label));
              if (realVideoDevice) {
                videoConstraint = {
                  ...videoConstraint,
                  deviceId: { ideal: realVideoDevice.deviceId }
                };
              }
            }

            if (micEnabled) {
              const audioDevices = devices.filter(d => d.kind === 'audioinput');
              const realAudioDevice = audioDevices.find(d => d.label && !isVirtualOrPhone(d.label));
              
              audioConstraint = {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              };
              if (realAudioDevice) {
                audioConstraint.deviceId = { ideal: realAudioDevice.deviceId };
              }
            }
          } catch (deviceErr) {
            console.warn('Error filtering input devices:', deviceErr);
          }

          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraint,
            audio: audioConstraint
          });
          cameraStreamRef.current = cameraStream;

          if (cameraEnabled) {
            // Create hidden video element to render the camera stream
            const cameraVideo = document.createElement('video');
            cameraVideo.srcObject = cameraStream;
            cameraVideo.muted = true;
            cameraVideo.playsInline = true;
            cameraVideo.autoplay = true;
            await new Promise((resolve) => {
              cameraVideo.onloadedmetadata = () => {
                cameraVideo.play().then(resolve);
              };
            });
            cameraVideoRef.current = cameraVideo;
          }
        } catch (err) {
          console.warn('Failed to load camera/mic, continuing with screen only:', err);
          setCameraEnabled(false);
          setMicEnabled(false);
        }
      }

      setStreamReady(true);
      startCompositing();
    } catch (err: any) {
      console.error('Error setting up recording sources:', err);
      setError(err.message || 'Permission denied or screen sharing was cancelled.');
      setStreamReady(false);
    }
  };

  // Step 2: Continuous Compositing Loop onto Canvas
  const startCompositing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clean up any existing worker
    if (workerRef.current) {
      workerRef.current.postMessage({ action: 'stop' });
      workerRef.current.terminate();
      workerRef.current = null;
    }

    const draw = () => {
      if (!canvas || !ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.fillStyle = '#0f172a'; // slate-900 background inside recording canvas
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Screen Video
      const screenVid = screenVideoRef.current;
      if (screenVid && screenVid.readyState >= 2) {
        ctx.drawImage(screenVid, 0, 0, width, height);
      } else {
        // Draw loading background if screen video is not loaded yet
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('Initializing Screen Share...', width / 2, height / 2);
      }

      // 2. Draw Camera Bubble (Circular)
      const cameraVid = cameraVideoRef.current;
      if (cameraEnabled && cameraVid && cameraVid.readyState >= 2) {
        const radius = 80;
        const cx = 110;
        const cy = height - 110;

        ctx.save();
        
        // Glow/Border
        ctx.shadowColor = 'rgba(124, 58, 237, 0.6)';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
        
        // Clip to Circle
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();

        // Draw cropped camera stream
        const camWidth = cameraVid.videoWidth;
        const camHeight = cameraVid.videoHeight;
        const size = Math.min(camWidth, camHeight);
        const sx = (camWidth - size) / 2;
        const sy = (camHeight - size) / 2;

        ctx.drawImage(
          cameraVid, 
          sx, sy, size, size, 
          cx - radius, cy - radius, radius * 2, radius * 2
        );

        ctx.restore();
      }
    };

    // Create a Web Worker to drive the rendering ticks to bypass background tab throttling of requestAnimationFrame.
    const workerCode = `
      let timer = null;
      self.onmessage = (e) => {
        if (e.data.action === 'start') {
          const interval = e.data.interval || 33; // ~30 FPS
          timer = setInterval(() => {
            self.postMessage('tick');
          }, interval);
        } else if (e.data.action === 'stop') {
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
        }
      };
    `;

    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      worker.onmessage = (e) => {
        if (e.data === 'tick') {
          draw();
        }
      };
      worker.postMessage({ action: 'start', interval: 33 });
      workerRef.current = worker;
    } catch (workerErr) {
      console.warn('Failed to create Web Worker for compositing, falling back to requestAnimationFrame:', workerErr);
      const drawLoop = () => {
        draw();
        drawLoopRef.current = requestAnimationFrame(drawLoop);
      };
      drawLoop();
    }
  };

  // Step 3: Start MediaRecorder
  const handleStartRecording = async () => {
    try {
      if (!streamReady) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      recordedChunksRef.current = [];

      // 1. Capture stream from compositing Canvas
      const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : (canvas as any).mozCaptureStream(30);
      const canvasVideoTrack = canvasStream.getVideoTracks()[0];

      // 2. Build Audio Web Audio merge
      const audioTracks: MediaStreamTrack[] = [];
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const audioDest = audioCtx.createMediaStreamDestination();
      let hasAudio = false;

      // Add system audio from screen capture if available
      if (screenStreamRef.current && screenStreamRef.current.getAudioTracks().length > 0) {
        const screenAudioSource = audioCtx.createMediaStreamSource(screenStreamRef.current);
        screenAudioSource.connect(audioDest);
        hasAudio = true;
      }

      // Add mic audio if available
      if (micEnabled && cameraStreamRef.current && cameraStreamRef.current.getAudioTracks().length > 0) {
        const micAudioSource = audioCtx.createMediaStreamSource(cameraStreamRef.current);
        micAudioSource.connect(audioDest);
        hasAudio = true;
      }

      if (hasAudio) {
        audioTracks.push(...audioDest.stream.getAudioTracks());
      }

      // 3. Combine video and merged audio tracks
      const combinedStream = new MediaStream([canvasVideoTrack, ...audioTracks]);
      combinedStreamRef.current = combinedStream;

      // 4. Initialize MediaRecorder
      // Choose container options: try WebM first (standard and highly stable in all browsers),
      // then fall back to MP4 if needed (like Safari).
      let mimeType = 'video/webm;codecs=vp8,opus';
      let extension = 'webm';
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4;codecs=h264,aac';
        extension = 'mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
        extension = 'mp4';
      }

      mimeTypeRef.current = mimeType;
      extensionRef.current = extension;

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        await uploadRecording();
      };

      // Start recording
      recorder.start(1000); // chunk size 1s
      setIsRecording(true);
      setIsPaused(false);
      
      // Reset duration ref and state
      durationRef.current = 0;
      setRecordDuration(0);

      // Duration counter (updates ref for uploads, and state for UI)
      durationTimerRef.current = window.setInterval(() => {
        durationRef.current += 1;
        setRecordDuration(durationRef.current);
      }, 1000);

    } catch (err: any) {
      console.error('Error starting MediaRecorder:', err);
      setError('Failed to start recorder: ' + err.message);
    }
  };

  const handlePauseToggle = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (isPaused) {
      recorder.resume();
      setIsPaused(false);
      durationTimerRef.current = window.setInterval(() => {
        durationRef.current += 1;
        setRecordDuration(durationRef.current);
      }, 1000);
    } else {
      recorder.pause();
      setIsPaused(true);
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    }
  };

  const handleStopRecording = (cancelled = false) => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }
    
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    setIsRecording(false);
    setIsPaused(false);

    if (cancelled) {
      stopAllStreams();
      setStreamReady(false);
    }
  };

  // Step 4: Upload chunks to server
  const uploadRecording = async () => {
    try {
      setUploading(true);
      const chunks = recordedChunksRef.current;
      if (chunks.length === 0) {
        throw new Error('No recorded data found');
      }

      const videoBlob = new Blob(chunks, { type: mimeTypeRef.current });
      
      const formData = new FormData();
      formData.append('video', videoBlob, `recording.${extensionRef.current}`);
      formData.append('title', titleRef.current.trim() || 'Capto Recording');
      formData.append('duration', durationRef.current.toString());

      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Server returned error during upload');
      }

      const data = await response.json();
      
      // Cleanup
      stopAllStreams();

      // Navigate to watch player view
      navigate(`/share/${data.id}`);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError('Recording ended, but we could not upload it: ' + (err.message || err));
      setUploading(false);
    }
  };

  // Helper formatting for durations
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 w-full flex-1 flex flex-col gap-6 animate-[fadeIn_0.4s_ease-out]">
      
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => { stopAllStreams(); navigate('/library'); }} 
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Library</span>
        </button>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet-600" />
          <h2 className="text-xl font-bold text-slate-850 font-display">Record Studio</h2>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-2xl p-5 flex items-center gap-4 shadow-sm animate-pulse">
          <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
          <div>
            <h4 className="font-semibold text-red-950">Error encountered</h4>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Main workspace layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 flex-1 items-start">
        
        {/* Left: Composited canvas view window */}
        <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900 border border-slate-200 flex flex-col items-center justify-center shadow-lg">
          {/* Compositing Canvas (Fixed HD aspect ratio) */}
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-full object-contain"
            style={{ display: streamReady ? 'block' : 'none' }}
          />

          {/* Idle Placeholder when streams not ready */}
          {!streamReady && (
            <div className="text-center p-8 max-w-sm flex flex-col items-center">
              <div className="bg-violet-50/10 w-16 h-16 rounded-full flex items-center justify-center text-violet-400 mb-5 border border-violet-500/20">
                <Video size={32} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Setup Video Streams</h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Grant screen and camera sharing permissions to setup the Canvas overlay before recording.
              </p>
              <button 
                onClick={setupStreams} 
                className="w-full py-3 font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 hover:shadow-md hover:shadow-violet-100 active:scale-[0.98] transition-all cursor-pointer"
              >
                Configure Media Streams
              </button>
            </div>
          )}

          {/* Uploading screen cover */}
          {uploading && (
            <div className="absolute inset-0 bg-slate-50/95 flex flex-col items-center justify-center gap-4 z-50">
              <Loader2 size={36} className="animate-spin text-violet-600" />
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-800">Saving Recording</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Uploading video to storage folder...</p>
              </div>
            </div>
          )}

          {/* Status Indicator floating inside canvas view */}
          {isRecording && (
            <div className="absolute top-4 left-4 bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg z-10">
              <span className="pulse-red w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
              <span>REC</span>
              <span className="text-slate-500">|</span>
              <span>{formatDuration(recordDuration)}</span>
            </div>
          )}
        </div>

        {/* Right: Controls & Parameters sidebar */}
        <div className="flex flex-col gap-5">
          
          {/* Metadata configurations */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 font-display mb-4">Recording Settings</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Video Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g. Engineering sync"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-850 outline-none focus:border-violet-600 focus:bg-white transition-all font-medium"
                  disabled={isRecording}
                />
              </div>

              {/* Camera configuration */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-2.5 text-slate-700">
                  {cameraEnabled ? <Camera size={18} className="text-violet-600" /> : <CameraOff size={18} className="text-slate-400" />}
                  <span className="text-sm font-semibold">Webcam Bubble</span>
                </div>
                <input
                  type="checkbox"
                  checked={cameraEnabled}
                  onChange={(e) => {
                    setCameraEnabled(e.target.checked);
                    setStreamReady(false);
                  }}
                  disabled={isRecording}
                  className="w-5 h-5 accent-violet-600 cursor-pointer"
                />
              </div>

              {/* Microphone Configuration */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-2.5 text-slate-700">
                  {micEnabled ? <Mic size={18} className="text-violet-600" /> : <MicOff size={18} className="text-slate-400" />}
                  <span className="text-sm font-semibold">Microphone Sound</span>
                </div>
                <input
                  type="checkbox"
                  checked={micEnabled}
                  onChange={(e) => {
                    setMicEnabled(e.target.checked);
                    setStreamReady(false);
                  }}
                  disabled={isRecording}
                  className="w-5 h-5 accent-violet-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Active Record Controls Board */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                disabled={!streamReady}
                className={`py-3.5 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  !streamReady 
                    ? 'bg-slate-100 text-slate-450 cursor-not-allowed' 
                    : 'bg-violet-600 hover:bg-violet-700 hover:shadow-md hover:shadow-violet-100 text-white active:scale-[0.98]'
                }`}
              >
                <Play size={18} fill={streamReady ? '#fff' : 'none'} className={streamReady ? 'text-white' : 'text-slate-450'} />
                <span>Start Recording</span>
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handlePauseToggle}
                  className="py-3 font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer text-sm"
                >
                  {isPaused ? 'Resume Capture' : 'Pause Capture'}
                </button>
                <button
                  onClick={() => handleStopRecording(false)}
                  className="py-3 font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 hover:shadow-md hover:shadow-red-100 active:scale-[0.98] transition-all cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  <StopCircle size={18} />
                  <span>Stop & Save Video</span>
                </button>
              </div>
            )}

            {!isRecording && (
              <button
                onClick={setupStreams}
                className="py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
              >
                {streamReady ? 'Reload Streams' : 'Link Streams'}
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
