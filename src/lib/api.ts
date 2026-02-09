// LOCAL ADAPTER REPLACING API CLIENT
const API_URL = 'http://localhost:3000/api';

class LocalApiClient {
    auth = {
        getUser: async () => {
            try {
                const response = await fetch(`${API_URL}/auth/user`);
                if (!response.ok) throw new Error('Auth failed');
                const user = await response.json();
                return { data: { user }, error: null };
            } catch (error) {
                return { data: { user: null }, error };
            }
        },
        getSession: async () => {
            const { data } = await this.auth.getUser();
            return {
                data: { session: data.user ? { user: data.user, access_token: 'mock-token' } : null },
                error: null
            };
        },
        onAuthStateChange: (callback: any) => {
            this.auth.getSession().then(({ data }) => {
                if (data.session) {
                    callback('SIGNED_IN', data.session);
                }
            });
            return { data: { subscription: { unsubscribe: () => { } } } };
        },
        signInWithPassword: async () => {
            // Auto login for local development
            return { data: { session: null, user: null }, error: null };
        },
        signUp: async () => {
            return { data: { session: null, user: null }, error: null };
        },
        signOut: async () => {
            window.location.reload();
            return { error: null };
        }
    };

    from(table: string) {
        return new QueryBuilder(table);
    }

    // Mock functions object for edge function calls
    functions = {
        invoke: async (functionName: string, options?: any) => {
            console.log(`🔄 Edge function call intercepted: ${functionName}`);

            // Redirect edge function calls to local API
            if (functionName === 'manage-api-keys') {
                return this.handleApiKeyOperation(options?.body);
            }

            return { data: null, error: { message: 'Function not implemented locally' } };
        }
    };

    private async handleApiKeyOperation(body: any) {
        const { action } = body || {};

        try {
            switch (action) {
                case 'list':
                    const listRes = await fetch(`${API_URL}/user_api_keys`);
                    const keys = await listRes.json();
                    return { data: keys, error: null };

                case 'save':
                    const saveRes = await fetch(`${API_URL}/user_api_keys`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    const saved = await saveRes.json();
                    return { data: saved, error: null };

                case 'delete':
                    const { provider } = body;
                    const deleteRes = await fetch(`${API_URL}/user_api_keys/${provider}`, {
                        method: 'DELETE'
                    });
                    const deleted = await deleteRes.json();
                    return { data: deleted, error: null };

                case 'test':
                    const testRes = await fetch(`${API_URL}/user_api_keys/test`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    const testResult = await testRes.json();
                    return { data: testResult, error: null };

                default:
                    return { data: null, error: { message: 'Unknown action' } };
            }
        } catch (error) {
            console.error('API key operation error:', error);
            return { data: null, error };
        }
    }
}

class QueryBuilder {
    table: string;
    url: string;
    filters: Record<string, any> = {};
    orderBy: { column: string; ascending: boolean } | null = null;
    limitValue: number | null = null;
    offsetValue: number | null = null;

    constructor(table: string) {
        this.table = table;
        this.url = `${API_URL}/${table}`;
    }

    select(columns = '*', options?: any) {
        return this;
    }

    eq(column: string, value: any) {
        if (column === 'user_id') {
            // Ignore user_id filters for local mode
            return this;
        } else if (column === 'id') {
            this.url = `${API_URL}/${this.table}/${value}`;
        }
        return this;
    }

    order(column: string, options?: { ascending?: boolean }) {
        this.orderBy = { column, ascending: options?.ascending ?? true };
        return this;
    }

    limit(count: number) {
        this.limitValue = count;
        return this;
    }

    range(from: number, to: number) {
        this.offsetValue = from;
        this.limitValue = to - from + 1;
        return this;
    }

    maybeSingle() {
        return this.executeSingle();
    }

    single() {
        return this.executeSingle();
    }

    async executeSingle() {
        try {
            const response = await fetch(this.url);
            if (!response.ok) {
                return { data: null, error: { message: `HTTP ${response.status}` } };
            }
            const text = await response.text();
            const data = text ? JSON.parse(text) : null;
            return { data, error: null };
        } catch (error) {
            console.error('Query error:', error);
            return { data: null, error };
        }
    }

    async then(resolve: any, reject?: any) {
        try {
            let url = this.url;
            const params = new URLSearchParams();

            if (this.limitValue) params.append('limit', this.limitValue.toString());
            if (this.offsetValue) params.append('offset', this.offsetValue.toString());

            if (params.toString()) {
                url += '?' + params.toString();
            }

            const response = await fetch(url);

            if (!response.ok) {
                const error = { message: `HTTP ${response.status}`, status: response.status };
                return resolve({ data: null, error });
            }

            const text = await response.text();

            // Handle empty response
            if (!text || text.trim() === '') {
                return resolve({ data: [], error: null, count: 0 });
            }

            const data = JSON.parse(text);

            resolve({
                data: Array.isArray(data) ? data : [data],
                error: null,
                count: Array.isArray(data) ? data.length : 1
            });
        } catch (error) {
            console.error('Query execution error:', error);
            resolve({ data: null, error });
        }
    }

    async insert(data: any) {
        try {
            // Strip user_id from payload
            const { user_id, ...cleanData } = data;

            const response = await fetch(this.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanData)
            });

            if (!response.ok) {
                return { data: null, error: { message: `HTTP ${response.status}` } };
            }

            const result = await response.json();
            return { data: result, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async update(data: any) {
        try {
            // Strip user_id from payload
            const { user_id, ...cleanData } = data;

            const response = await fetch(this.url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanData)
            });

            if (!response.ok) {
                return { data: null, error: { message: `HTTP ${response.status}` } };
            }

            const result = await response.json();
            return { data: result, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async delete() {
        try {
            const response = await fetch(this.url, {
                method: 'DELETE'
            });

            if (!response.ok) {
                return { data: null, error: { message: `HTTP ${response.status}` } };
            }

            return { data: null, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }
}

export const db = new LocalApiClient() as any;
export const supabase = db; // Alias for backward compatibility
