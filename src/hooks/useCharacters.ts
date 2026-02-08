import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Character, CharacterDetail } from '../lib/types';
import { handleError, showSuccess } from '../lib/error-handler';

const PAGE_SIZE = 12;

/**
 * Fetch characters with pagination
 */
export function useCharacters(page: number = 0) {
    return useQuery({
        queryKey: ['characters', page],
        queryFn: async () => {
            const { data, count, error } = await supabase
                .from('characters')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (error) throw error;

            return {
                characters: data ?? [],
                totalCount: count ?? 0,
            };
        },
    });
}

/**
 * Fetch details for a specific character
 */
export function useCharacterDetails(characterId: string | null) {
    return useQuery({
        queryKey: ['character-details', characterId],
        queryFn: async () => {
            if (!characterId) return [];

            const { data, error } = await supabase
                .from('character_details')
                .select('*')
                .eq('character_id', characterId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!characterId,
    });
}

/**
 * Create a new character
 */
export function useCreateCharacter() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            user_id: string;
            name: string;
            description: string;
            reference_image_url: string;
        }) => {
            const { error } = await supabase
                .from('characters')
                .insert({ ...data, updated_at: new Date().toISOString() });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['characters'] });
            showSuccess('Character created successfully!');
        },
        onError: (error) => {
            handleError(error, 'CreateCharacter');
        },
    });
}

/**
 * Update an existing character
 */
export function useUpdateCharacter() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            id: string;
            user_id: string;
            name: string;
            description: string;
            reference_image_url: string;
        }) => {
            const { id, ...payload } = data;
            const { error } = await supabase
                .from('characters')
                .update({ ...payload, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['characters'] });
            showSuccess('Character updated successfully!');
        },
        onError: (error) => {
            handleError(error, 'UpdateCharacter');
        },
    });
}

/**
 * Delete a character
 */
export function useDeleteCharacter() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('characters').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['characters'] });
            showSuccess('Character deleted successfully!');
        },
        onError: (error) => {
            handleError(error, 'DeleteCharacter');
        },
    });
}

/**
 * Add a detail to a character
 */
export function useAddCharacterDetail() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            character_id: string;
            category: string;
            detail: string;
            works_well: boolean;
        }) => {
            const { error } = await supabase.from('character_details').insert(data);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['character-details', variables.character_id] });
            showSuccess('Detail added successfully!');
        },
        onError: (error) => {
            handleError(error, 'AddCharacterDetail');
        },
    });
}

/**
 * Delete a character detail
 */
export function useDeleteCharacterDetail() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { detailId: string; characterId: string }) => {
            const { error } = await supabase
                .from('character_details')
                .delete()
                .eq('id', data.detailId);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['character-details', variables.characterId] });
            showSuccess('Detail removed!');
        },
        onError: (error) => {
            handleError(error, 'DeleteCharacterDetail');
        },
    });
}
