import { useEffect } from 'react';

type KeyCombo = string;

interface HotkeyOptions {
    preventDefault?: boolean;
    stopPropagation?: boolean;
    enableOnInputs?: boolean;
}

/**
 * A hook for binding keyboard shortcuts globally.
 * @param combo The keyboard combo to listen for (e.g. 'ctrl+n', '/', 'ArrowLeft')
 * @param callback The function to fire when the combo is pressed
 * @param options Configurations like preventing default behavior and enabling inside inputs
 */
export function useHotkeys(
    combo: KeyCombo,
    callback: (e: KeyboardEvent) => void,
    options: HotkeyOptions = {}
) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore events inside inputs/textareas unless explicitly permitted
            if (
                !options.enableOnInputs &&
                (e.target instanceof HTMLInputElement ||
                    e.target instanceof HTMLTextAreaElement ||
                    e.target instanceof HTMLSelectElement)
            ) {
                return;
            }

            const keys = combo.toLowerCase().split('+');
            const requiresCtrl = keys.includes('ctrl');
            const requiresShift = keys.includes('shift');
            const requiresAlt = keys.includes('alt');
            const mainKey = keys.find(k => k !== 'ctrl' && k !== 'shift' && k !== 'alt');

            if (
                e.ctrlKey === requiresCtrl &&
                e.shiftKey === requiresShift &&
                e.altKey === requiresAlt &&
                e.key.toLowerCase() === mainKey
            ) {
                if (options.preventDefault !== false) e.preventDefault();
                if (options.stopPropagation !== false) e.stopPropagation();
                callback(e);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [combo, callback, options]);
}
