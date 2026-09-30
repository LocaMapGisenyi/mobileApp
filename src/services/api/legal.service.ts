import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LegalDocument {
  id: string;
  slug: string;
  title: string;
  version: string;
  updatedAt: string;
  summary: string;
  required: boolean;
  category: 'cgu' | 'privacy' | 'cancellation' | 'discrimination' | 'rules';
}

export interface LegalDocumentFull extends LegalDocument {
  content: string;
  previousVersions: { version: string; updatedAt: string }[];
}

export interface ConsentRecord {
  documentId: string;
  documentTitle: string;
  version: string;
  acceptedAt: string;
  ipAddress: string;
}

export interface TaxCertificate {
  year: number;
  totalRevenue: number;
  currency: string;
  commissionPaid: number;
  downloadUrl: string;
  generatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
};

// ─── Service ──────────────────────────────────────────────────────────────────
export const legalService = {
  getDocuments: async (): Promise<LegalDocument[]> => {
    const { data, error } = await supabase
      .from('legal_documents')
      .select(
        'id, slug, title, version, updated_at, summary, required, category',
      )
      .order('created_at');
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map(d => ({
      id: d.id,
      slug: d.slug,
      title: d.title,
      version: d.version,
      updatedAt: d.updated_at,
      summary: d.summary ?? '',
      required: d.required,
      category: d.category as LegalDocument['category'],
    }));
  },

  getDocument: async (slug: string): Promise<LegalDocumentFull | null> => {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) { if (error.code === 'PGRST116') return null; throw error; }
    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      version: data.version,
      updatedAt: data.updated_at,
      summary: data.summary ?? '',
      required: data.required,
      category: data.category as LegalDocument['category'],
      content: data.content ?? '',
      previousVersions: Array.isArray(data.previous_versions) ? data.previous_versions.flatMap(value =>
        value && typeof value === 'object' && !Array.isArray(value) && typeof value.version === 'string' && typeof value.updatedAt === 'string'
          ? [{version: value.version, updatedAt: value.updatedAt}] : []) : [],
    };
  },

  giveConsent: async (documentId: string, version: string): Promise<void> => {
    const { error } = await supabase.rpc('record_consent', { p_document_id: documentId, p_version: version });
    if (error) throw error;
  },

  getConsentHistory: async (): Promise<ConsentRecord[]> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('consent_records')
      .select('*, document:legal_documents(title, version)')
      .eq('user_id', userId)
      .order('accepted_at', { ascending: false });
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map(c => ({
      documentId: c.document_id,
      documentTitle: (Array.isArray(c.document) ? c.document[0]?.title : c.document?.title) ?? '',
      version: c.version,
      acceptedAt: c.accepted_at,
      ipAddress: c.ip_address ?? '',
    }));
  },

  getTaxCertificate: async (_year: number): Promise<TaxCertificate | null> =>
    null,
};
