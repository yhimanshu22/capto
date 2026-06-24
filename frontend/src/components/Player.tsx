import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Download, Share2, Trash2, Calendar, 
  Clock, ArrowLeft, Check, Copy, Film, HardDrive 
} from 'lucide-react';
import { Recording } from '../types';
import Modal from './Modal';

export default function Player() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRateRef = useRef(1);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalConfirmAction, setModalConfirmAction] = useState<(() => void) | null>(null);
  const [modalCancelAction, setModalCancelAction] = useState<(() => void) | undefined>(undefined);
  const [modalDanger, setModalDanger] = useState(false);
  const [modalConfirmText, setModalConfirmText] = useState('Confirm');

  const showConfirm = (title: string, message: string, onConfirm: () => void, isDanger = false) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalConfirmAction(() => () => {
      onConfirm();
      setModalOpen(false);
    });
    setModalCancelAction(() => () => setModalOpen(false));
    setModalDanger(isDanger);
    setModalConfirmText(isDanger ? 'Delete' : 'Confirm');
    setModalOpen(true);
  };

  const showAlert = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalConfirmAction(() => () => setModalOpen(false));
    setModalCancelAction(undefined);
    setModalDanger(false);
    setModalConfirmText('OK');
    setModalOpen(true);
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    fetchRecordingDetails();
  }, [id]);

  const fetchRecordingDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recordings/${id}`);
      if (!response.ok) {
        throw new Error('Recording not found');
      }
      const data = await response.json();
      setRecording(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('The video recording you are looking for does not exist or the server is offline.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDelete = () => {
    if (!recording) return;
    showConfirm(
      'Delete Recording',
      'Are you sure you want to delete this recording? This action cannot be undone.',
      async () => {
        try {
          const response = await fetch(`/api/recordings/${recording.id}`, {
            method: 'DELETE',
          });
          if (response.ok) {
            navigate('/library');
          } else {
            showAlert('Delete Failed', 'Failed to delete the recording from the server.');
          }
        } catch (err) {
          console.error(err);
          showAlert('Error', 'An error occurred while attempting to reach the server.');
        }
      },
      true
    );
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    playbackRateRef.current = rate;
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  // Format helper functions
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] w-full flex-1">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Loading Capto video player...</p>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 w-full flex-1 flex justify-center items-center min-h-[60vh]">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center max-w-md shadow-sm">
          <Film size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Video Unavailable</h2>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/library')} 
            className="px-5 py-2.5 font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 hover:shadow-md hover:shadow-violet-100 active:scale-[0.98] transition-all cursor-pointer"
          >
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  const videoUrl = `/videos/${recording.fileName}`;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 w-full flex-1 flex flex-col gap-6 animate-[fadeIn_0.4s_ease-out]">
      
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/library')} 
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>My Library</span>
        </button>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShare} 
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 hover:shadow-md hover:shadow-violet-100 active:scale-[0.98] transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={16} />
                <span>Copied Link!</span>
              </>
            ) : (
              <>
                <Share2 size={16} />
                <span>Share Video</span>
              </>
            )}
          </button>
          <a 
            href={videoUrl} 
            download={recording.title + '.' + (recording.fileName.split('.').pop() || 'webm')} 
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Download size={16} />
            <span>Download</span>
          </a>
          <button 
            onClick={handleDelete} 
            className="p-2 border border-red-100 rounded-xl hover:bg-red-50 hover:border-red-200 text-red-500 transition-colors cursor-pointer"
            title="Delete recording"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main player layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        
        {/* Left: Video screen & playback speed */}
        <div className="flex flex-col gap-4">
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-black shadow-lg border border-slate-200">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full block"
              onPlay={() => {
                if (videoRef.current) {
                  videoRef.current.playbackRate = playbackRateRef.current;
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.playbackRate = playbackRateRef.current;
                }
              }}
              onRateChange={() => {
                if (videoRef.current && videoRef.current.playbackRate !== playbackRateRef.current) {
                  videoRef.current.playbackRate = playbackRateRef.current;
                }
              }}
            />
          </div>

          {/* Speed Controls bar */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <span className="text-sm font-semibold text-slate-500">
              Playback Speed
            </span>
            <div className="flex gap-2">
              {[1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                    playbackRate === rate 
                      ? 'bg-violet-50 border-violet-200 text-violet-600 shadow-sm font-extrabold' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Video metadata details card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-snug">
              {recording.title}
            </h3>
            <span className="text-xs font-semibold text-slate-400 mt-1 block">ID: {recording.id}</span>
          </div>

          <hr className="border-slate-100" />

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-violet-50 p-2 rounded-lg text-violet-600">
                <Calendar size={16} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recorded On</div>
                <div className="text-sm font-bold text-slate-700 mt-0.5">{formatDate(recording.createdAt)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-pink-50 p-2 rounded-lg text-pink-600">
                <Clock size={16} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</div>
                <div className="text-sm font-bold text-slate-700 mt-0.5">{formatDuration(recording.duration)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                <HardDrive size={16} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">File Size</div>
                <div className="text-sm font-bold text-slate-700 mt-0.5">{formatSize(recording.size)}</div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Sharing card info panel */}
          <div className="bg-violet-50/50 border border-dashed border-violet-200 rounded-xl p-4 flex flex-col gap-2">
            <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Share Link</span>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={window.location.href}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 w-full outline-none font-medium"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button 
                onClick={handleShare} 
                className="p-2 border border-slate-200 hover:bg-slate-50 bg-white rounded-lg cursor-pointer flex items-center justify-center transition-colors text-slate-600"
                title="Copy to clipboard"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

      </div>
      <Modal
        isOpen={modalOpen}
        title={modalTitle}
        message={modalMessage}
        onConfirm={modalConfirmAction || (() => {})}
        onCancel={modalCancelAction}
        confirmText={modalConfirmText}
        isDanger={modalDanger}
      />
    </div>
  );
}
