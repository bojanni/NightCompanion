
// LOCAL ADAPTER REPLACING SUPABASE CLIENT
// This redirects calls to our local Express API at http://localhost:3000

const API_URL = 'http://localhost:3000/api';

class LocalSupabaseClient {
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
            // Mock session
            const { data } = await this.auth.getUser();
            return {
                data: { session: data.user ? { user: data.user, access_token: 'mock-token' } : null },
                error: null
            };
        },
        onAuthStateChange: (callback: any) => {
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

    from(table: string) {
        return new QueryBuilder(table);
    }
}

class QueryBuilder {
    table: string;
    url: string;
    method: string = 'GET';
    body: any = null;
    id: any = null;

    constructor(table: string) {
        this.table = table;
        this.url = `${API_URL}/${table}`;
    }

    select(columns = '*') {
        return this;
    }

    eq(column: string, value: any) {
        if (column === 'id') {
            this.id = value;
        } else if (column === 'user_id') {
            // Backend handles user_id automatically usually, but we can verify
        }
        return this;
    }

    order(column: string, { ascending = false } = {}) {
        return this;
    }

    single() {
        // This is a modifier that expects single result
        // In real Supabase, this affects the return type (obj vs array)
        // We'll handle this in the execution phase
        this.isSingle = true;
        return this;
    }

    insert(data: any) {
        this.method = 'POST';
        this.body = data;
        return this;
    }

    update(data: any) {
        this.method = 'PUT';
        this.body = data;
        return this;
    }

    delete() {
        this.method = 'DELETE';
        return this;
    }

    limit(n: number) {
        return this;
    }

    // Thenable to execute the query
    then(resolve: any, reject: any) {
        this.execute().then(resolve).catch(reject);
    }

    async execute() {
        let fetchUrl = this.url;
        const options: any = {
            method: this.method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (this.body) {
            options.body = JSON.stringify(this.body);
        }

        // Handle ID in URL for UPDATE/DELETE/GET-one
        if (this.id) {
            fetchUrl += `/${this.id}`;
        }

        try {
            const response = await fetch(fetchUrl, options);
            if (!response.ok) {
                const text = await response.text();
                return { data: null, error: { message: text } };
            }

            if (this.method === 'DELETE') {
                return { data: null, error: null };
            }

            const result = await response.json();

            let data = result;
            // Supabase select() returns an array by default
            // Our backend GET / usually returns array
            // Our backend GET /:id returns object

            if (this.method === 'GET' && !this.id) {
                // generic list query
                if (!Array.isArray(data)) data = [data]; // Should be array
                if (this.isSingle && data.length > 0) data = data[0];
            } else {
                // POST/PUT/GET-one usually return single object
                // But Supabase often wraps in array unless .single() used? 
                // Actually .insert().select() returns array.
                if (!Array.isArray(data)) data = [data];
                if (this.isSingle) data = data[0];
            }

            return { data, error: null };

        } catch (err: any) {
            console.error("API Request Failed", err);
            return { data: null, error: err };
        }
    }

    isSingle = false;
}

export const supabase = new LocalSupabaseClient() as any;
