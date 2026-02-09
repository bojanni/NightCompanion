import { useState, useEffect } from 'react';
import { Save, Loader2, Plus, X } from 'lucide-react';
import type { Prompt, Tag } from '../lib/types';
import { TAG_CATEGORIES, TAG_COLORS } from '../lib/types';
import { db, supabase } from '../lib/api';
import { trackKeywordsFromPrompt } from '../lib/style-analysis';
import { PromptSchema } from '../lib/validation-schemas';
import StarRating from './StarRating';
import TagBadge from './TagBadge';

interface PromptEditorProps {
  prompt: Prompt | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function PromptEditor({ prompt, onSave, onCancel }: PromptEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [isTemplate, setIsTemplate] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [saving, setSaving] = useState(false);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [newTagCategory, setNewTagCategory] = useState<string>(TAG_CATEGORIES[0]);

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setContent(prompt.content);
      setNotes(prompt.notes);
      setRating(prompt.rating);
      setIsTemplate(prompt.is_template);
      setIsFavorite(prompt.is_favorite);
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
        is_template: validated.is_template,
        is_favorite: isFavorite,
        updated_at: new Date().toISOString(),
      };

      let promptId = prompt?.id;

      if (prompt) {
        await db.from('prompts').update(payload).eq('id', prompt.id);
      } else {
        const { data } = await db.from('prompts').insert(payload).select().maybeSingle();
        promptId = data?.id;
      }

      if (promptId) {
        await db.from('prompt_tags').delete().eq('prompt_id', promptId);
        if (selectedTagIds.length > 0) {
          await supabase
            .from('prompt_tags')
            .insert(selectedTagIds.map((tag_id) => ({ prompt_id: promptId!, tag_id })));
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
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A descriptive name for this prompt"
          className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Prompt</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Your full prompt text..."
          rows={5}
          className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm resize-none"
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
        <label className="block text-sm font-medium text-slate-300 mb-2">Tags</label>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {allTags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              onClick={() => toggleTag(tag.id)}
              selected={selectedTagIds.includes(tag.id)}
            />
          ))}
          <button
            onClick={() => setShowNewTag(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            <Plus size={12} /> New Tag
          </button>
        </div>

        {showNewTag && (
          <div className="flex flex-wrap items-end gap-2 p-3 bg-slate-700/30 rounded-xl">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40"
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
              <button onClick={handleCreateTag} className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600">
                Add
              </button>
              <button onClick={() => setShowNewTag(false)} className="p-1.5 text-slate-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
