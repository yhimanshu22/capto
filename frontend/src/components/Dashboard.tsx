import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Share2, Trash2, Calendar, Clock, Film, 
  Check, Copy, AlertCircle, Video 
} from 'lucide-react';
import { Recording } from '../types';
import Modal from './Modal';

export default function Dashboard() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();

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

  // Load recordings on mount
  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recordings');
      if (!response.ok) {
        throw new Error('Failed to load recordings');
      }
      const data = await response.json();
      setRecordings(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('Could not connect to the backend server. Make sure it is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm(
      'Delete Recording',
      'Are you sure you want to delete this recording? This action cannot be undone.',
      async () => {
        try {
          const response = await fetch(`/api/recordings/${id}`, {
            method: 'DELETE',
          });
          if (response.ok) {
            setRecordings(prev => prev.filter(rec => rec.id !== id));
          } else {
            showAlert('Delete Failed', 'We could not delete the recording from the server.');
          }
        } catch (err) {
          console.error(err);
          showAlert('Network Error', 'An error occurred while attempting to reach the server.');
        }
      },
      true
    );
  };

  const handleShare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/share/${id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Helper formatting functions
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Stat computations
  const totalDuration = recordings.reduce((acc, rec) => acc + rec.duration, 0);
  const totalSize = recordings.reduce((acc, rec) => acc + (rec.size || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 w-full flex-1 flex flex-col animate-[fadeIn_0.4s_ease-out]">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 font-display mb-2">
          Welcome back to Capto
        </h1>
        <p className="text-slate-500 font-medium text-lg">
          Record your screen, voice, and webcam, and share the links instantly with anyone.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 shadow-sm">
          <AlertCircle className="text-red-500 flex-shrink-0" size={24} />
          <div>
            <h4 className="font-semibold text-red-950">Connection Offline</h4>
            <p className="text-sm text-red-700 mt-0.5">{error}</p>
          </div>
          <button 
            onClick={fetchRecordings} 
            className="sm:ml-auto px-4 py-2 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-xl hover:bg-red-100 active:scale-[0.98] transition-all cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Stats Board */}
      {!loading && recordings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="bg-violet-50 p-3 rounded-xl text-violet-600">
              <Film size={24} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Recordings</div>
              <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{recordings.length}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="bg-pink-50 p-3 rounded-xl text-pink-600">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Time Recorded</div>
              <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{formatDuration(totalDuration)}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
              <Share2 size={24} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Storage Used</div>
              <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{formatSize(totalSize)}</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 flex-1">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">Fetching your library...</p>
        </div>
      ) : recordings.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl flex flex-col items-center justify-center p-12 text-center shadow-sm">
          <div className="bg-gradient-to-tr from-violet-50 to-pink-50 p-6 rounded-full text-violet-600 mb-6">
            <Video size={48} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Create Your First Capture</h2>
          <p className="text-slate-500 max-w-md mb-6 leading-relaxed text-sm">
            It looks like your video library is empty. You can record your screen and camera bubble instantly with no extra plugins.
          </p>
          <button 
            onClick={() => navigate('/record')} 
            className="px-6 py-3 font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 hover:shadow-md hover:shadow-violet-100 active:scale-[0.98] transition-all cursor-pointer"
          >
            Start Recording Now
          </button>
        </div>
      ) : (
        <div>
          <h3 className="text-xl font-bold text-slate-800 mb-6 font-display">Your Recordings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recordings.map((rec) => (
              <div 
                key={rec.id} 
                className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200/60 transition-all overflow-hidden flex flex-col group cursor-pointer"
                onClick={() => navigate(`/share/${rec.id}`)}
              >
                {/* Visual Video Card Preview */}
                <div className="h-40 bg-slate-950 flex items-center justify-center relative overflow-hidden border-b border-slate-100">
                  <video 
                    src={`/videos/${rec.fileName}#t=0.1`} 
                    preload="metadata" 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-350 pointer-events-none"
                  />

                  {/* Play icon overlay */}
                  <div className="absolute bg-violet-600/90 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none">
                    <Play size={20} fill="#fff" className="ml-0.5" />
                  </div>

                  {/* Duration overlay badge */}
                  <span className="absolute bottom-3 right-3 bg-slate-900/80 px-2.5 py-1 rounded-md text-[10px] font-bold text-white flex items-center gap-1">
                    <Clock size={10} />
                    {formatDuration(rec.duration)}
                  </span>
                </div>

                {/* Info and action panel */}
                <div className="p-5 flex flex-col flex-1">
                  <h4 className="text-base font-bold text-slate-800 mb-2 truncate group-hover:text-violet-600 transition-colors">
                    {rec.title}
                  </h4>
                  
                  <div className="flex flex-col gap-1.5 mb-4 text-xs font-semibold text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-300" />
                      <span>{formatDate(rec.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Film size={13} className="text-slate-300" />
                      <span>{formatSize(rec.size)}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-auto">
                    <button 
                      onClick={(e) => handleShare(rec.id, e)} 
                      className="flex-1 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-slate-700 bg-white"
                    >
                      {copiedId === rec.id ? (
                        <>
                          <Check size={14} className="text-emerald-500" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                    <button 
                      onClick={(e) => handleDelete(rec.id, e)} 
                      className="px-3 py-2 border border-red-100 rounded-xl hover:bg-red-50 hover:border-red-200 text-red-500 transition-colors cursor-pointer"
                      title="Delete recording"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
