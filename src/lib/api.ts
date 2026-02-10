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

    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET';
    body: any = null;

    constructor(table: string) {
        this.table = table;
        this.url = `${API_URL}/${table}`;
    }

    select(columns = '*', options?: any) {
        if (this.method === 'POST' || this.method === 'PUT' || this.method === 'DELETE') {
            return this;
        }
        this.method = 'GET';
        return this;
    }

    eq(column: string, value: any) {
        if (column === 'user_id') {
            // Ignore user_id filters for local mode
            return this;
        } else if (column === 'id') {
            this.url = `${API_URL}/${this.table}/${value}`;
        }
        this.filters[column] = value;
        return this;
    }

    neq(column: string, value: any) {
        if (column === 'user_id') return this;
        this.filters[column] = `neq.${value}`;
        return this;
    }

    gte(column: string, value: any) {
        this.filters[column] = `gte.${value}`;
        return this;
    }

    lte(column: string, value: any) {
        this.filters[column] = `lte.${value}`;
        return this;
    }

    in(column: string, values: any[]) {
        if (column === 'user_id') return this;
        if (values && values.length > 0) {
            this.filters[column] = `in.(${values.join(',')})`;
        }
        return this;
    }

    order(column: string, options?: { ascending?: boolean }) {
        // Send order as query param: sort_col.desc or sort_col.asc
        // My simple crud.js expects "column.desc"
        const dir = options?.ascending ? 'asc' : 'desc';
        this.filters['order'] = `${column}.${dir}`;
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
        // Reuse query logic but expect one result
        return new Promise<{ data: any, error: any }>((resolve) => {
            this.then((res: any) => {
                if (res.error) {
                    resolve({ data: null, error: res.error });
                } else if (Array.isArray(res.data) && res.data.length > 0) {
                    resolve({ data: res.data[0], error: null });
                } else {
                    resolve({ data: null, error: { message: 'Row not found', code: 'PGRST116' } });
                }
            });
        });
    }

    async then(resolve: any, reject?: any) {
        try {
            let url = this.url;
            const params = new URLSearchParams();

            // Only append params for GET or DELETE (sometimes)
            // For POST/PUT with body, we usually don't need params unless it's specific args
            // But our local crud.js uses path params for ID update, which is handled in .eq()

            if (this.limitValue) params.append('limit', this.limitValue.toString());
            if (this.offsetValue) params.append('offset', this.offsetValue.toString());

            Object.entries(this.filters).forEach(([key, value]) => {
                // don't append filters if we are using ID in path for single item ops
                if (key === 'id' && url.includes(`/${value}`)) return;
                params.append(key, String(value));
            });

            if (params.toString() && (this.method === 'GET' || this.method === 'DELETE')) {
                url += '?' + params.toString();
            }

            const options: RequestInit = {
                method: this.method,
                headers: { 'Content-Type': 'application/json' }
            };

            if (this.body && (this.method === 'POST' || this.method === 'PUT')) {
                options.body = JSON.stringify(this.body);
            }

            const response = await fetch(url, options);

            if (!response.ok) {
                const error = { message: `HTTP ${response.status}`, status: response.status };
                return resolve({ data: null, error });
            }

            // DELETE might return empty or status only
            if (this.method === 'DELETE') {
                return resolve({ data: null, error: null });
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

    insert(data: any | any[]) {
        this.method = 'POST';
        if (Array.isArray(data)) {
            // Strip user_id from each item
            this.body = data.map(({ user_id, ...rest }) => rest);
        } else {
            // Strip user_id
            const { user_id, ...cleanData } = data;
            this.body = cleanData;
        }

        // Supabase allows .insert().select(), so we return this
        // But if they await .insert(), it calls .then()
        return this;
    }

    update(data: any) {
        this.method = 'PUT';
        // Strip user_id
        const { user_id, ...cleanData } = data;
        this.body = cleanData;
        return this;
    }

    delete() {
        this.method = 'DELETE';
        return this;
    }
}

export const db = new LocalApiClient() as any;
export const supabase = db; // Alias for backward compatibility
