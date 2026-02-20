import { useState, useEffect } from 'react';
import { Plus, X, FolderOpen, Edit3, Trash2, Check, Palette } from 'lucide-react';
import { db } from '../lib/api';
import type { Collection } from '../lib/types';
import { toast } from 'sonner';
import ChoiceModal from './ChoiceModal';

interface CollectionManagerProps {
    onSelect?: (collectionId: string) => void;
    selectedId?: string | null;
    className?: string;
}

const COLORS = [
    '#64748b', // slate
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#84cc16', // lime
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#a855f7', // purple
    '#d946ef', // fuchsia
    '#ec4899', // pink
];

export default function CollectionManager({ onSelect, selectedId, className = '' }: CollectionManagerProps) {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        loadCollections();
    }, []);

    async function loadCollections() {
        setLoading(true);
        try {
            const { data, error } = await db.from('collections').select('*').order('name');
            if (error) throw error;
            setCollections(data || []);
        } catch (err) {
            console.error('Error loading collections:', err);
            toast.error('Failed to load collections');
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setName('');
        setDescription('');
        setColor(COLORS[0]);
        setEditingId(null);
        setShowForm(false);
    }

    function startEdit(c: Collection) {
        setName(c.name);
        setDescription(c.description || '');
        setColor(c.color || COLORS[0]);
        setEditingId(c.id);
        setShowForm(true);
    }

    async function handleSubmit() {
        if (!name.trim()) {
            toast.error('Name is required');
            return;
        }

        try {
            const payload = {
                name: name.trim(),
                description: description.trim(),
                color
            };

            if (editingId) {
                const { error } = await db.from('collections').update(payload).eq('id', editingId);
                if (error) throw error;
                toast.success('Collection updated');
                setCollections(prev => prev.map(c => c.id === editingId ? { ...c, ...payload, color: payload.color || COLORS[0] } : c));
            } else {
                const { data, error } = await db.from('collections').insert(payload).select().maybeSingle();
                if (error) throw error;
                toast.success('Collection created');
                if (data) setCollections(prev => [...prev, data]);
            }
            resetForm();
        } catch (err) {
            console.error('Error saving collection:', err);
            toast.error('Failed to save collection');
        }
    }

    async function handleDelete(id: string) {
        try {
            const { error } = await db.from('collections').delete().eq('id', id);
            if (error) throw error;
            setCollections(prev => prev.filter(c => c.id !== id));
            if (selectedId === id && onSelect) onSelect('');
            toast.success('Collection deleted');
        } catch (err) {
            console.error('Error deleting collection:', err);
            toast.error('Failed to delete collection');
        }
    }

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-slate-300">Collections</h3>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="text-xs flex items-center gap-1 text-amber-500 hover:text-amber-400"
                    >
                        <Plus size={14} /> New
                    </button>
                )}
            </div>

            {showForm && (
                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 space-y-3 animate-in fade-in zoom-in-95">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                            placeholder="Collection Name"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                            placeholder="What is this collection about?"
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Color Code</label>
                        <div className="flex flex-wrap gap-1.5">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-5 h-5 rounded-full transition-all ${color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
                                    style={{ backgroundColor: c }}
                                    title={c}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1.5">
                        <button
                            onClick={resetForm}
                            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 flex items-center gap-1"
                        >
                            <Check size={14} /> {editingId ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {loading ? (
                    <div className="text-center py-4 text-slate-500 text-xs">Loading...</div>
                ) : collections.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-xs italic">
                        No collections yet. Create one to organize your images.
                    </div>
                ) : (
                    collections.map(collection => (
                        <div
                            key={collection.id}
                            onClick={() => onSelect && onSelect(selectedId === collection.id ? '' : collection.id)}
                            className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${selectedId === collection.id
                                ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/30'
                                : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50'
                                }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div
                                    className="w-2 h-8 rounded-full shrink-0"
                                    style={{ backgroundColor: collection.color || '#64748b' }}
                                />
                                <div className="min-w-0">
                                    <h4 className={`text-sm font-medium truncate ${selectedId === collection.id ? 'text-amber-400' : 'text-slate-200'}`}>
                                        {collection.name}
                                    </h4>
                                    {collection.description && (
                                        <p className="text-[10px] text-slate-500 truncate">{collection.description}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); startEdit(collection); }}
                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                                    title="Edit"
                                >
                                    <Edit3 size={12} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(collection.id); }}
                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg"
                                    title="Delete"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ChoiceModal
                isOpen={deleteConfirmId !== null}
                onClose={() => setDeleteConfirmId(null)}
                title="Delete Collection"
                message="Are you sure? Images in this collection will not be deleted, just unlinked."
                choices={[
                    {
                        label: 'Delete',
                        variant: 'danger',
                        onClick: () => {
                            if (deleteConfirmId) {
                                handleDelete(deleteConfirmId);
                                setDeleteConfirmId(null);
                            }
                        }
                    }
                ]}
            />
        </div>
    );
}
