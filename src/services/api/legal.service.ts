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
    if (error) return [];
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
    if (error) return null;
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
      previousVersions: (data.previous_versions as any[]) ?? [],
    };
  },

  giveConsent: async (documentId: string, version: string): Promise<void> => {
    const userId = await getCurrentUserId();
    const { error } = await supabase.from('consent_records').insert({
      user_id: userId,
      document_id: documentId,
      version,
      ip_address: null,
    });
    if (error && !error.message.includes('duplicate')) throw error;
  },

  getConsentHistory: async (): Promise<ConsentRecord[]> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('consent_records')
      .select('*, document:legal_documents(title, version)')
      .eq('user_id', userId)
      .order('accepted_at', { ascending: false });
    if (error) return [];
    return (Array.isArray(data) ? data : []).map(c => ({
      documentId: c.document_id,
      documentTitle: (c.document as any)?.title ?? '',
      version: c.version,
      acceptedAt: c.accepted_at,
      ipAddress: c.ip_address ?? '',
    }));
  },

  getTaxCertificate: async (_year: number): Promise<TaxCertificate | null> =>
    null,
};
