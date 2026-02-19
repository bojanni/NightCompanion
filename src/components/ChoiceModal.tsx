import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';

interface ChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    choices: {
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'secondary' | 'danger' | 'default';
    }[];
}

export default function ChoiceModal({ isOpen, onClose, title, message, choices }: ChoiceModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                        {message}
                    </p>

                    <div className="space-y-3">
                        {choices.map((choice, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    choice.onClick();
                                    onClose();
                                }}
                                className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all border ${choice.variant === 'primary'
                                        ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-lg shadow-amber-500/20'
                                        : choice.variant === 'danger'
                                            ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                            : choice.variant === 'secondary'
                                                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                    }`}
                            >
                                {choice.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-3 py-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
