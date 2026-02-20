/**
 * Appends provider filter to query based on 'neq.' prefix convention.
 * @param {string} baseQuery - The initial SQL query string (e.g., 'UPDATE table SET x=$1').
 * @param {Array} params - The current array of query parameters.
 * @param {string} provider - The provider filter string from query params.
 * @returns {object} - { query: string, params: Array }
 */
function applyProviderFilter(baseQuery, params, provider) {
    let query = baseQuery;

    if (provider) {
        // Assume the next param index is params.length + 1
        const paramIndex = params.length + 1;

        if (provider.startsWith('neq.')) {
            const val = provider.substring(4);
            query += ` WHERE provider != $${paramIndex}`;
            params.push(val);
        } else {
            query += ` WHERE provider = $${paramIndex}`;
            params.push(provider);
        }
    }

    return { query, params };
}

module.exports = { applyProviderFilter };
