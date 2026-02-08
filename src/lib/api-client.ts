
// This file replaces the functionality of @supabase/supabase-js 
// by adapting calls to our local Express API

const API_URL = 'http://localhost:3000/api';

class LocalSupabaseClient {
    auth = {
        getUser: async () => {
            try {
                const response = await fetch(`${API_URL}/auth/user`);
                const user = await response.json();
                return { data: { user }, error: null };
            } catch (error) {
                return { data: { user: null }, error };
            }
        },
        getSession: async () => {
            // Mock session
            const { data } = await this.auth.getUser();
            return {
                data: { session: data.user ? { user: data.user, access_token: 'mock-token' } : null },
                error: null
            };
        },
        onAuthStateChange: (callback) => {
            // Immediately trigger signed in state
            this.auth.getSession().then(({ data }) => {
                if (data.session) {
                    callback('SIGNED_IN', data.session);
                }
            });
            return { data: { subscription: { unsubscribe: () => { } } } };
        },
        signInWithOAuth: async () => {
            console.warn("OAuth not supported in local mode");
            return { error: { message: "Not supported locally" } };
        },
        signOut: async () => {
            window.location.reload();
            return { error: null };
        }
    };

    from(table) {
        return new QueryBuilder(table);
    }
}

class QueryBuilder {
    constructor(table) {
        this.table = table;
        this.url = `${API_URL}/${table}`;
        this.queryParams = {};
    }

    select(columns = '*') {
        // We currently ignore specific columns and return all
        // In a real adapter, we'd handle this
        return this;
    }

    eq(column, value) {
        // MVP: We only support basic filtering if the backend supports it. 
        // Our current generic backend only supports user_id filtering automatically.
        // For specific ID queries, we can handle it if it's the primary key
        if (column === 'id') {
            this.id = value;
        }
        return this;
    }

    order(column, { ascending = false } = {}) {
        // Backend defaults to created_at DESC roughly
        return this;
    }

    async single() {
        const { data, error } = await this.then(res => res); // Execute
        if (data && data.length > 0) return { data: data[0], error: null };
        return { data: null, error: { message: 'Not found', code: 'PGRST116' } };
    }

    async insert(data) {
        try {
            const response = await fetch(this.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(await response.text());
            const result = await response.json();
            // Insert potentially returns array or single object depending on Supabase version/headers
            // Our API returns single object. Supabase usually returns array if select() is chained.
            return { data: [result], error: null };
        } catch (e) {
            return { data: null, error: e };
        }
    }

    async update(data) {
        this.updateData = data;
        this.method = 'PUT';
        return this;
    }

    async delete() {
        this.method = 'DELETE';
        return this;
    }

    // Thenable to execute the query
    then(resolve, reject) {
        if (this.id && this.method === 'PUT') {
            // Handle Update: /api/table/:id
            fetch(`${this.url}/${this.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.updateData)
            }).then(r => r.json().then(d => resolve({ data: [d], error: null })))
                .catch(e => resolve({ data: null, error: e }));
            return;
        }

        if (this.id && this.method === 'DELETE') {
            // Handle Delete: /api/table/:id
            fetch(`${this.url}/${this.id}`, { method: 'DELETE' })
                .then(r => r.json().then(() => resolve({ data: null, error: null })))
                .catch(e => resolve({ data: null, error: e }));
            return;
        }

        if (this.id) {
            // Handle Get by ID: /api/table/:id
            fetch(`${this.url}/${this.id}`)
                .then(res => {
                    if (res.ok) return res.json().then(data => resolve({ data: [data], error: null }));
                    resolve({ data: null, error: { message: 'Not found' } });
                })
                .catch(e => resolve({ data: null, error: e }));
            return;
        }

        // Default: GET all
        fetch(this.url)
            .then(res => res.json())
            .then(data => {
                // Handle error response from backend
                if (data.error) resolve({ data: null, error: data });
                else resolve({ data, error: null });
            })
            .catch(err => resolve({ data: null, error: err }));
    }
}

export const supabase = new LocalSupabaseClient();
