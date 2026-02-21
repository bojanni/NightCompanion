import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'ai-task-models';

export interface TaskModels {
    generate: string;
    improve: string;
    vision: string;
    research: string;
}

const DEFAULT_MODELS: TaskModels = {
    generate: 'google:gemini-1.5-flash',
    improve: 'anthropic:claude-3-5-sonnet-20241022',
    vision: 'openai:gpt-4o',
    research: 'openai:gpt-4o',
};

export function useTaskModels() {
    const [taskModels, setTaskModelsState] = useState<TaskModels>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return { ...DEFAULT_MODELS, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error('Failed to parse task models from local storage', e);
        }
        return DEFAULT_MODELS;
    });

    const setModel = useCallback((task: keyof TaskModels, id: string) => {
        setTaskModelsState((prev) => {
            const updated = { ...prev, [task]: id };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.error('Failed to save task models to local storage', e);
            }
            return updated;
        });
    }, []);

    // Listen for changes from other tabs/components
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                try {
                    setTaskModelsState({ ...DEFAULT_MODELS, ...JSON.parse(e.newValue) });
                } catch (err) {
                    console.error(err);
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return {
        generate: taskModels.generate,
        improve: taskModels.improve,
        vision: taskModels.vision,
        research: taskModels.research,
        setModel,
    };
}
