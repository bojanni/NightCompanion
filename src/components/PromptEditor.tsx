import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, Wand2, Star, Tag, AlertCircle, Copy, Check, ExternalLink, Paperclip, Unlink, Loader2, Image as ImageIcon, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { Prompt, Tag } from '../lib/types';
import { TAG_CATEGORIES, TAG_COLORS } from '../lib/types';
import { supabase, db } from '../lib/api';
import type { Database } from '../lib/database.types';
import { PromptSchema } from '../lib/validation-schemas';
import { generateTitle, suggestTags } from '../lib/ai-service';
import { handleAIError } from '../lib/error-handler';
import { MODELS } from '../lib/models-data';
import ModelSelector from './ModelSelector';
import StarRating from './StarRating';
import TagBadge from './TagBadge';

interface PromptEditorProps {
  prompt: Prompt | null;
  isLinked?: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export default function PromptEditor({ prompt, isLinked = false, onSave, onCancel }: PromptEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [model, setModel] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI Auto-Generation State
  const [autoGenerateTitle, setAutoGenerateTitle] = useState(true);
  const [autoGenerateTags, setAutoGenerateTags] = useState(true);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [newTagCategory, setNewTagCategory] = useState<string>(TAG_CATEGORIES[0]);

  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Models State - Derived from static data
  const availableModels = useMemo(() => MODELS.map(m => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    description: m.description
  })), []);

  const availableProviders = useMemo(() => {
    const uniqueProviders = Array.from(new Set(MODELS.map(m => m.provider)));
    return uniqueProviders.map(p => ({
      id: p,
      name: p,
      type: 'cloud' as const
    }));
  }, []);

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setContent(prompt.content);
      setNotes(prompt.notes);
      setRating(prompt.rating);
      setModel(prompt.model || '');
      setIsTemplate(prompt.is_template);
      setIsFavorite(prompt.is_favorite);
      setAutoGenerateTitle(false); // Don't auto-gen on edit
    } else {
      // New prompt default values
      const lastModel = localStorage.getItem('lastUsedModel');
      if (lastModel) setModel(lastModel);
    }
    loadTags();
  }, [prompt]);

  async function loadTags() {
    const { data } = await db.from('tags').select('*').order('name');
    setAllTags(data ?? []);

    if (prompt) {
      const { data: ptData } = await supabase
        .from('prompt_tags')
        .select('tag_id')
        .eq('prompt_id', prompt.id);
      setSelectedTagIds(ptData?.map((pt) => pt.tag_id) ?? []);
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    const { data } = await supabase
      .from('tags')
      .insert({ name: newTagName.trim(), color: newTagColor, category: newTagCategory })
      .select()
      .maybeSingle();
    if (data) {
      setAllTags((prev) => [...prev, data]);
      setSelectedTagIds((prev) => [...prev, data.id]);
      setNewTagName('');
      setShowNewTag(false);
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function clearImage() {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }


  async function generateTags() {
    if (isGeneratingTags || !content.trim()) return;

    setIsGeneratingTags(true);
    try {
      const tagString = await suggestTags(content, 'dummy-token');
      if (tagString) {
        const suggestedTags = tagString.split(',').map(t => t.trim().toLowerCase()).filter(t => t);

        // Find existing tags that match
        const existingTagsMap = new Map(allTags.map(t => [t.name.toLowerCase(), t]));
        const newTagIds = [...selectedTagIds];
        const tagsToCreate: string[] = [];

        suggestedTags.forEach(tagName => {
          const existing = existingTagsMap.get(tagName);
          if (existing) {
            if (!newTagIds.includes(existing.id)) newTagIds.push(existing.id);
          } else {
            tagsToCreate.push(tagName);
          }
        });

        // Create new tags if they don't exist
        if (tagsToCreate.length > 0) {
          const createdTags = await Promise.all(tagsToCreate.map(async (name) => {
            const { data } = await supabase
              .from('tags')
              .insert({
                name: name,
                color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)],
                category: 'General'
              })
              .select()
              .maybeSingle();
            return data;
          }));

          createdTags.forEach(tag => {
            if (tag) {
              newTagIds.push(tag.id);
              // Update local formatted cache to avoid refetch
              setAllTags(prev => [...prev, tag]);
            }
          });
        }

        setSelectedTagIds(newTagIds);
      }
    } catch (e) {
      handleAIError(e);
    } finally {
      setIsGeneratingTags(false);
    }
  }

  async function handlePromptBlur() {
    if (!content.trim()) return;

    // Generate Title
    if (autoGenerateTitle && !title && !isGeneratingTitle) {
      setIsGeneratingTitle(true);
      try {
        const newTitle = await generateTitle(content, 'dummy-token');
        if (newTitle) setTitle(newTitle.replace(/^"|"$/g, '').trim()); // Remove quotes if present
      } catch (e) {
        console.error('Failed to generate title:', e);
        // Silent fail for title auto-gen
      } finally {
        setIsGeneratingTitle(false);
      }
    }

    // Generate Tags
    if (autoGenerateTags) {
      generateTags();
    }
  }

  async function handleSave() {
    setSaving(true);

    try {
      const validated = PromptSchema.parse({
        content,
        title: title.trim() || 'Untitled',
        is_template: isTemplate,
        rating: rating || null,
        tags: []
      });

      const payload = {
        title: validated.title,
        content: validated.content,
        notes,
        rating: validated.rating,
        model: model || null,
        is_template: validated.is_template,
        is_favorite: isFavorite,
        updated_at: new Date().toISOString(),
      };

      let promptId = prompt?.id;

      if (prompt) {
        const { error } = await db.from('prompts').update(payload).eq('id', prompt.id);
        if (error) throw error;
      } else {
        const { data, error } = await db.from('prompts').insert(payload).select().maybeSingle();
        if (error) {
          console.error('Error creating prompt:', error);
          throw error;
        }
        promptId = data?.id;

      }

      if (promptId) {
        await db.from('prompt_tags').delete().eq('prompt_id', promptId);
        if (selectedTagIds.length > 0) {
          const { error: tagError } = await supabase
            .from('prompt_tags')
            .insert(selectedTagIds.map((tag_id) => ({ prompt_id: promptId!, tag_id })));
          if (tagError) console.error('Error saving tags:', tagError);
        }

        // Handle Image Upload & Linking
        if (selectedImage) {

          const formData = new FormData();
          formData.append('image', selectedImage);

          try {
            const uploadRes = await fetch('http://localhost:3000/api/upload', {
              method: 'POST',
              body: formData
            });

            if (uploadRes.ok) {
              const { url } = await uploadRes.json();


              // Create Gallery Item linked to Prompt
              const { data: galleryItem, error: galleryError } = await db.from('gallery_items').insert({
                title: validated.title || 'Prompt Image',
                image_url: url,
                prompt_used: validated.content,
                prompt_id: promptId,
                rating: 0,
                model: model || null,
                notes: 'Uploaded via Prompt Editor',
                created_at: new Date().toISOString()
              }).select().maybeSingle();

              if (galleryError) console.error('Error creating gallery item:', galleryError);

              if (galleryItem) {

                // Bi-directional link: Update Prompt with gallery_item_id
                const { error: updateError } = await db.from('prompts').update({ gallery_item_id: galleryItem.id }).eq('id', promptId);
                if (updateError) console.error('Error linking prompt to gallery:', updateError);
              }

              toast.success('Image uploaded and linked to gallery');
            } else {
              console.error('Upload failed:', await uploadRes.text());
              toast.error('Failed to upload image');
            }
          } catch (uploadErr) {
            console.error('Upload exception:', uploadErr);
            toast.error('Failed to upload image (Network/Server error)');
          }
        }
      }

      if (validated.content.trim()) {
        trackKeywordsFromPrompt(validated.content).catch(() => { });
      }

      setSaving(false);
      onSave();
    } catch (error) {
      console.error('Validation error:', error);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="block text-sm font-medium text-slate-300">Title</label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <button
              onClick={async () => {
                if (!content.trim()) return;
                setIsGeneratingTitle(true);
                try {
                  const newTitle = await generateTitle(content, 'dummy-token');
                  if (newTitle) setTitle(newTitle.replace(/^"|"$/g, '').trim());
                } catch (e) {
                  handleAIError(e);
                } finally {
                  setIsGeneratingTitle(false);
                }
              }}
              disabled={isGeneratingTitle || !content.trim()}
              className="text-xs text-amber-500 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Wand2 size={12} />
              Regenerate
            </button>
            <div className="w-px h-3 bg-slate-700 mx-1" />
            <input
              type="checkbox"
              checked={autoGenerateTitle}
              onChange={(e) => setAutoGenerateTitle(e.target.checked)}
              className="w-3.5 h-3.5 bg-slate-700 border-slate-600 rounded text-amber-500 focus:ring-amber-500/40"
            />
            <span className="text-xs text-slate-400">Auto-generate</span>
            {isGeneratingTitle && <Loader2 size={12} className="animate-spin text-amber-500 ml-1" />}
          </label>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A descriptive name for this prompt"
          className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
        />
      </div>

      <ModelSelector
        value={model}
        onChange={(id) => setModel(id)}
        models={availableModels}
        providers={availableProviders}
      />

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="block text-sm font-medium text-slate-300">Prompt</label>
          {isLinked && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Linked to image - content locked
            </span>
          )}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Your full prompt text..."

          rows={5}
          onBlur={handlePromptBlur}
          disabled={isLinked}
          className={`w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm resize-none ${isLinked ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What worked well? What to try next time?"
          rows={2}
          className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm resize-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Rating</label>
          <StarRating rating={rating} onChange={setRating} size={20} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer mt-5">
          <input
            type="checkbox"
            checked={isTemplate}
            onChange={(e) => setIsTemplate(e.target.checked)}
            className="w-4 h-4 bg-slate-700 border-slate-600 rounded text-amber-500 focus:ring-amber-500/40"
          />
          <span className="text-sm text-slate-300">Template</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer mt-5">
          <input
            type="checkbox"
            checked={isFavorite}
            onChange={(e) => setIsFavorite(e.target.checked)}
            className="w-4 h-4 bg-slate-700 border-slate-600 rounded text-amber-500 focus:ring-amber-500/40"
          />
          <span className="text-sm text-slate-300">Favorite</span>
        </label>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-slate-300">Tags</label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <button
              onClick={generateTags}
              disabled={isGeneratingTags || !content.trim()}
              className="text-xs text-amber-500 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Wand2 size={12} />
              Regenerate
            </button>
            <div className="w-px h-3 bg-slate-700 mx-1" />
            <input
              type="checkbox"
              checked={autoGenerateTags}
              onChange={(e) => setAutoGenerateTags(e.target.checked)}
              className="w-3.5 h-3.5 bg-slate-700 border-slate-600 rounded text-amber-500 focus:ring-amber-500/40"
            />
            <span className="text-xs text-slate-400">Auto-suggest</span>
            {isGeneratingTags && <Loader2 size={12} className="animate-spin text-amber-500 ml-1" />}
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {allTags.filter(t => selectedTagIds.includes(t.id)).map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              onClick={() => toggleTag(tag.id)}
              selected={true}
            />
          ))}
          <button
            onClick={() => setShowNewTag(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            <Plus size={12} /> Add Tag
          </button>
        </div>

        {showNewTag && (
          <div className="p-3 bg-slate-700/30 rounded-xl space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs text-slate-400 mb-1">Search or Create</label>
                <input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Type tag name..."
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Color</label>
                <div className="flex gap-1">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewTagColor(c)}
                      className={`w-5 h-5 rounded-full transition-all ${newTagColor === c ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Category</label>
                <select
                  value={newTagCategory}
                  onChange={(e) => setNewTagCategory(e.target.value)}
                  className="px-2 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs focus:outline-none"
                >
                  {TAG_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || allTags.some(t => t.name.toLowerCase() === newTagName.trim().toLowerCase() && selectedTagIds.includes(t.id))}
                  className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
                <button onClick={() => setShowNewTag(false)} className="p-1.5 text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Existing Tags Suggestions */}
            {newTagName.trim() && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-700/50">
                {allTags
                  .filter(t =>
                    t.name.toLowerCase().includes(newTagName.toLowerCase()) &&
                    !selectedTagIds.includes(t.id)
                  )
                  .slice(0, 8)
                  .map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        toggleTag(tag.id);
                        setNewTagName('');
                      }}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-colors flex items-center gap-1"
                    >
                      <Plus size={10} />
                      {tag.name}
                    </button>
                  ))}
                {allTags.filter(t => t.name.toLowerCase().includes(newTagName.toLowerCase()) && !selectedTagIds.includes(t.id)).length === 0 && (
                  <span className="text-xs text-slate-500 italic">No existing tags match. Create new?</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>



      {!isLinked && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Reference Image</label>

          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-800/30 hover:bg-slate-800/50"
            >
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center mb-2 text-slate-400">
                <Upload size={20} />
              </div>
              <p className="text-sm text-slate-400 font-medium">Click to upload image</p>
              <p className="text-xs text-slate-500 mt-1">Saves to gallery & links to prompt</p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-slate-700 group">
              <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={(e) => { e.stopPropagation(); clearImage(); }}
                  className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {prompt ? 'Update' : 'Create'} Prompt
        </button>
      </div>
    </div >
  );
}
