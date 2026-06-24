import { AlertTriangle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void; // Optional: If missing, serves as a standard Alert
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export default function Modal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onCancel || onConfirm} // Close on backdrop click
    >
      <div 
        className="bg-white border border-slate-100 rounded-2xl max-w-md w-full p-6 shadow-xl animate-[slideUp_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()} // Prevent closing on modal click
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2.5 rounded-xl ${isDanger ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-violet-50 text-violet-600 border border-violet-100'}`}>
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 font-display">
            {title}
          </h3>
        </div>
        
        <p className="text-sm text-slate-500 mb-6 leading-relaxed font-medium">
          {message}
        </p>

        <div className="flex gap-3 justify-end">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-xl active:scale-[0.98] transition-all cursor-pointer ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-700 hover:shadow-md hover:shadow-red-100' 
                : 'bg-violet-600 hover:bg-violet-700 hover:shadow-md hover:shadow-violet-100'
            }`}
          >
            {onCancel ? confirmText : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
