import { formatInTimeZone } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'Europe/Amsterdam';
export const DATE_FORMAT = 'dd/MM/yyyy HH:mm';

export function getUserTimezone(): string {
    if (typeof window === 'undefined') return DEFAULT_TIMEZONE;
    return localStorage.getItem('user_timezone') || DEFAULT_TIMEZONE;
}

export function setUserTimezone(timezone: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('user_timezone', timezone);
    // Dispatch a custom event so components can react immediately if they listen
    window.dispatchEvent(new Event('timezone-changed'));
}

export function formatDate(dateString: string | Date, timezone?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const tz = timezone || getUserTimezone();

    try {
        return formatInTimeZone(date, tz, DATE_FORMAT);
    } catch (e) {
        console.error('Error formatting date:', e);
        return date.toLocaleString();
    }
}

export const COMMON_TIMEZONES = [
    'UTC',
    'Europe/London',
    'Europe/Amsterdam',
    'Europe/Paris',
    'Europe/Berlin',
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
    'Pacific/Auckland',
];
