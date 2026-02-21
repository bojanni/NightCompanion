import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface DropZoneProps {
    onFileSelect: (file: File) => void;
    accept?: string; // e.g., "image/*"
    maxSizeMB?: number;
    className?: string;
    children?: React.ReactNode;
}

export default function DropZone({
    onFileSelect,
    accept = 'image/*,video/*',
    maxSizeMB = 50,
    className = '',
    children
}: DropZoneProps) {
    const [isDragActive, setIsDragActive] = useState(false);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const validateAndPassFile = useCallback((file: File) => {
        // Validate against each comma-separated accept pattern individually
        if (accept) {
            const patterns = accept.split(',').map(p => p.trim());
            const isAccepted = patterns.some(pattern => {
                if (pattern === '*' || pattern === '*/*') return true;
                // e.g. "image/*" → match any image/... type
                if (pattern.endsWith('/*')) {
                    return file.type.startsWith(pattern.slice(0, -1));
                }
                // exact match (e.g. "image/png")
                return file.type === pattern;
            });
            if (!isAccepted) {
                toast.error(`Invalid file type. Accepted: ${accept}`);
                return;
            }
        }

        // Check size
        if (file.size > maxSizeMB * 1024 * 1024) {
            toast.error(`File too large. Max size: ${maxSizeMB}MB`);
            return;
        }

        onFileSelect(file);
    }, [accept, maxSizeMB, onFileSelect]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file) validateAndPassFile(file);
        }
    }, [validateAndPassFile]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file) validateAndPassFile(file);
        }
        // Reset input value to allow selecting same file again
        e.target.value = '';
    }, [validateAndPassFile]);

    return (
        <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative group cursor-pointer transition-all duration-200 
        ${isDragActive
                    ? 'border-amber-500 bg-amber-500/10 scale-[1.02]'
                    : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
                }
        border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center ${className}`}
        >
            <input
                type="file"
                accept={accept}
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />

            {children || (
                <>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${isDragActive ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'}`}>
                        <Upload size={24} />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                        {isDragActive ? 'Drop media here' : 'Click or drag media'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Max size {maxSizeMB}MB
                    </p>
                </>
            )}

            {isDragActive && (
                <div className="absolute inset-0 bg-amber-500/10 rounded-xl pointer-events-none flex items-center justify-center backdrop-blur-[1px]">
                    <div className="bg-background/80 px-4 py-2 rounded-full shadow-lg border border-amber-500/30 text-amber-500 font-bold animate-bounce">
                        Drop it!
                    </div>
                </div>
            )}
        </div>
    );
}
