import { toast } from 'sonner';

/**
 * Error mapping for common error patterns to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
    // Network errors
    'fetch failed': 'Unable to connect to the server. Please check your connection.',
    'network error': 'Network error. Please check your internet connection.',
    'failed to fetch': 'Unable to reach the server. Please try again.',

    // Database errors
    'duplicate': 'This item already exists.',
    'unique constraint': 'This item already exists.',
    'foreign key': 'Cannot delete this item as it is being used elsewhere.',
    'not found': 'Item not found.',

    // Validation errors
    'required': 'Please fill in all required fields.',
    'invalid': 'The provided data is invalid.',
    'validation': 'Please check your inputs and try again.',

    // Authentication errors
    'unauthorized': 'You are not authorized to perform this action.',
    'forbidden': 'Access denied.',
    'session expired': 'Your session has expired. Please sign in again.',

    // File/JSON errors
    'invalid json': 'Invalid file format. Please select a valid backup file.',
    'syntaxerror': 'Invalid file format. Please select a valid backup file.',
    'parse error': 'Unable to read the file. Please check the file format.',
};

/**
 * Convert technical error messages to user-friendly messages
 */
export function getUserFriendlyError(error: unknown): string {
    if (typeof error === 'string') {
        const lowerError = error.toLowerCase();

        // Check for known error patterns
        for (const [pattern, message] of Object.entries(ERROR_MESSAGES)) {
            if (lowerError.includes(pattern)) {
                return message;
            }
        }

        return error;
    }

    if (error instanceof Error) {
        const lowerMessage = error.message.toLowerCase();

        // Check for known error patterns
        for (const [pattern, message] of Object.entries(ERROR_MESSAGES)) {
            if (lowerMessage.includes(pattern)) {
                return message;
            }
        }

        return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
}

/**
 * Handle errors with toast notifications and console logging
 */
export function handleError(
    error: unknown,
    context: string,
    metadata?: Record<string, any>
) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const userMessage = getUserFriendlyError(error);

    // Show user-friendly toast
    toast.error(userMessage);

    // Log technical details for debugging
    console.error(`[${context}]`, errorMessage, metadata || {});
}

/**
 * Show success toast with optional message
 */
export function showSuccess(message: string) {
    toast.success(message);
}

/**
 * Show info toast with optional message
 */
export function showInfo(message: string) {
    toast.info(message);
}

/**
 * Show warning toast with optional message
 */
export function showWarning(message: string) {
    toast.warning(message);
}

/**
 * Show loading toast - returns toast ID for dismissal
 */
export function showLoading(message: string) {
    return toast.loading(message);
}

/**
 * Dismiss a specific toast by ID
 */
export function dismissToast(toastId: string | number) {
    toast.dismiss(toastId);
}

/**
 * Handle AI-specific errors with richer feedback
 */
export function handleAIError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMsg = message.toLowerCase();

    // Check for OpenRouter / API Rate Limits
    if (lowerMsg.includes('rate limit') || lowerMsg.includes('429') || lowerMsg.includes('insufficient credits')) {
        toast.error('AI Service Busy or Limit Reached', {
            description: 'The free AI model is currently overloaded or rate-limited. Please try again later, or switch to a different model in settings (e.g. Gemini 2.0 Flash or Llama 3).',
            duration: 8000,
        });
        return;
    }

    // Check for specific provider errors
    if (lowerMsg.includes('openrouter')) {
        toast.error('AI Provider Error', {
            description: 'OpenRouter reported an issue. ' + message.replace(/OpenRouter Provider Error:/gi, '').trim(),
            duration: 6000,
        });
        return;
    }

    // Default error
    toast.error('AI Generation Failed', {
        description: getUserFriendlyError(error),
        duration: 5000
    });
}
