import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface GuideCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
}

export interface Guide {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  image: string;
  content: string;
  isNew?: boolean;
  createdAt: Date;
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const guidesService = {
  getCategories: async (): Promise<GuideCategory[]> => {
    const { data, error } = await supabase
      .from('guide_categories')
      .select('*')
      .order('title');
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map(c => ({
      id: c.id,
      title: c.title,
      icon: c.icon ?? '',
      description: c.description ?? '',
    }));
  },

  getAll: async (categoryId?: string): Promise<Guide[]> => {
    let query = supabase
      .from('guides')
      .select('*')
      .order('created_at', { ascending: false });
    if (categoryId) query = query.eq('category_id', categoryId);
    const { data, error } = await query;
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map(g => ({
      id: g.id,
      categoryId: g.category_id ?? '',
      title: g.title,
      summary: g.summary ?? '',
      image: g.image ?? '',
      content: g.content,
      isNew: g.is_new,
      createdAt: new Date(g.created_at),
    }));
  },

  getById: async (id: string): Promise<Guide> => {
    const { data, error } = await supabase
      .from('guides')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return {
      id: data.id,
      categoryId: data.category_id ?? '',
      title: data.title,
      summary: data.summary ?? '',
      image: data.image ?? '',
      content: data.content,
      isNew: data.is_new,
      createdAt: new Date(data.created_at),
    };
  },

  getNew: async (): Promise<Guide[]> => {
    const { data, error } = await supabase
      .from('guides')
      .select('*')
      .eq('is_new', true)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map(g => ({
      id: g.id,
      categoryId: g.category_id ?? '',
      title: g.title,
      summary: g.summary ?? '',
      image: g.image ?? '',
      content: g.content,
      isNew: g.is_new,
      createdAt: new Date(g.created_at),
    }));
  },
};
