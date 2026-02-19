
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { GalleryItem } from './types';
import { toast } from 'sonner';

export async function exportGalleryItems(items: GalleryItem[], filename = 'gallery_export.zip') {
    if (!items || items.length === 0) {
        toast.error('No items to export');
        return;
    }

    const zip = new JSZip();
    const imagesFolder = zip.folder('images');
    const metadata: any[] = [];

    const total = items.length;
    let processed = 0;

    // We can use a toast to show progress if we had a progress callback,
    // but for now we'll just show start/end.
    const toastId = toast.loading(`Preparing export for ${total} items...`);

    try {
        const promises = items.map(async (item, index) => {
            // Add to metadata
            metadata.push({
                id: item.id,
                title: item.title,
                prompt: item.prompt_used,
                negative_prompt: '', // We don't store negative prompt in gallery item explicitly unless it was part of prompt_used text or we fetch linked prompt. 
                // For now, let's stick to what's in GalleryItem.
                // If prompt_id is present, we *could* fetch it, but that requires async DB calls here which might be too heavy for a simple export utility unless we preload.
                // Let's rely on item data for now.
                model: item.model,
                rating: item.rating,
                created_at: item.created_at,
                collection_id: item.collection_id,
                filename: `image_${index + 1}.png` // We'll rename images to match
            });

            // Fetch image data
            if (item.image_url) {
                try {
                    const response = await fetch(item.image_url);
                    const blob = await response.blob();
                    const ext = blob.type.split('/')[1] || 'png';
                    const imgFilename = `image_${index + 1}.${ext}`;

                    // Update metadata filename with correct extension
                    metadata[index].filename = imgFilename;

                    if (imagesFolder) {
                        imagesFolder.file(imgFilename, blob);
                    }
                } catch (err) {
                    console.error(`Failed to fetch image for item ${item.id}`, err);
                    // We still keep the metadata but maybe mark as missing image?
                }
            }

            processed++;
        });

        await Promise.all(promises);

        // Add metadata JSON
        zip.file('metadata.json', JSON.stringify(metadata, null, 2));

        // Generate zip
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, filename);

        toast.success(`Exported ${total} items to ${filename}`, { id: toastId });
    } catch (error) {
        console.error('Export failed', error);
        toast.error('Failed to create export zip', { id: toastId });
    }
}
