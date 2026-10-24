import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ title, onClose, children }) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    // Clicking the backdrop (outside the card) closes the modal
    <div
      className="fixed inset-0 bg-brand-900/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      {/* Stop clicks inside the card from bubbling to the backdrop */}
      <div
        className="card w-full max-w-md shadow-2xl border border-brand-100 animate-[fadeIn_.18s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-brand-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg p-1 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
