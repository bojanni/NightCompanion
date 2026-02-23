import { useEffect } from 'react';
import { useExtension } from '../context/ExtensionContext';

export default function useSSERefresh(
    onNewItem?: (item: { id: string; title: string }) => void
) {
    const { registerImportListener } = useExtension();

    useEffect(() => {
        if (!onNewItem) return;
        const unsubscribe = registerImportListener(onNewItem);
        return () => unsubscribe();
    }, [registerImportListener, onNewItem]);
}
