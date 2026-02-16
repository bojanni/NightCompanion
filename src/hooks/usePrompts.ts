import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/api';

import { handleError, showSuccess } from '../lib/error-handler';

const PAGE_SIZE = 20;

interface UsePromptsOptions {
    page?: number;
    filterType?: 'all' | 'templates' | 'favorites';
    filterTag?: string | null;
}

/**
 * Fetch prompts with filters and pagination
 */
export function usePrompts({ page = 0, filterType = 'all', filterTag = null }: UsePromptsOptions = {}) {
    return useQuery({
        queryKey: ['prompts', page, filterType, filterTag],
        queryFn: async () => {
            let query = db
                .from('prompts')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (filterType === 'templates') {
                query = query.eq('is_template', true);
            } else if (filterType === 'favorites') {
                query = query.eq('is_favorite', true);
            }

            const { data: promptsData, count, error } = await query.range(
                page * PAGE_SIZE,
                (page + 1) * PAGE_SIZE - 1
            );

            if (error) throw error;

            return {
                prompts: promptsData ?? [],
                totalCount: count ?? 0,
            };
        },
    });
}

/**
 * Fetch all tags
 */
export function useTags() {
    return useQuery({
        queryKey: ['tags'],
        queryFn: async () => {
            const { data, error } = await db.from('tags').select('*').order('name');

            if (error) throw error;
            return data ?? [];
        },
        staleTime: 10 * 60 * 1000, // Tags don't change often, cache for 10 min
    });
}

/**
 * Fetch prompt tags mapping
 */
export function usePromptTags(promptIds: string[]) {
    return useQuery({
        queryKey: ['prompt-tags', promptIds],
        queryFn: async () => {
            if (promptIds.length === 0) return {};

            const { data, error } = await db
                .from('prompt_tags')
                .select('*')
                .in('prompt_id', promptIds);

            if (error) throw error;

            const map: Record<string, string[]> = {};
            (data ?? []).forEach((pt: { prompt_id: string; tag_id: string }) => {
                if (!map[pt.prompt_id]) map[pt.prompt_id] = [];
                map[pt.prompt_id]?.push(pt.tag_id);
            });

            return map;
        },
        enabled: promptIds.length > 0,
    });
}

/**
 * Delete a prompt
 */
export function useDeletePrompt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await db.from('prompts').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
            showSuccess('Prompt deleted successfully!');
        },
        onError: (error) => {
            handleError(error, 'DeletePrompt');
        },
    });
}

/**
 * Toggle favorite status on a prompt
 */
export function useToggleFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { id: string; is_favorite: boolean }) => {
            const { error } = await db
                .from('prompts')
                .update({ is_favorite: data.is_favorite })
                .eq('id', data.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
        },
        onError: (error) => {
            handleError(error, 'ToggleFavorite');
        },
    });
}

/**
 * Update prompt content
 */
export function useUpdatePrompt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { id: string; content: string }) => {
            const { error } = await db
                .from('prompts')
                .update({ content: data.content, updated_at: new Date().toISOString() })
                .eq('id', data.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
            showSuccess('Prompt updated successfully!');
        },
        onError: (error) => {
            handleError(error, 'UpdatePrompt');
        },
    });
}
