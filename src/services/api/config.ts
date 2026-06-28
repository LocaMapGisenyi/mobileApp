// Legacy Axios config — replaced by Supabase. Kept as empty stub so old imports don't break during gradual cleanup.
const api = { get: () => Promise.resolve(null), post: () => Promise.resolve(null), put: () => Promise.resolve(null), patch: () => Promise.resolve(null), delete: () => Promise.resolve(null) } as any;
export default api;
