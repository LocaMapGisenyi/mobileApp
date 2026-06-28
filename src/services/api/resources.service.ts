import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ResourceLevel = 'beginner' | 'intermediate' | 'advanced';
export type ResourceLang = 'fr' | 'en' | 'rw' | 'sw';

export interface Article {
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  level: ResourceLevel;
  lang: ResourceLang;
  readMinutes: number;
  publishedAt: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
}

export interface ArticleListItem {
  slug: string;
  title: string;
  summary: string;
  category: string;
  level: ResourceLevel;
  lang: ResourceLang;
  readMinutes: number;
  publishedAt: string;
  thumbnailUrl: string | null;
  hasVideo: boolean;
}

export interface CourseStep {
  id: string;
  title: string;
  type: 'article' | 'video' | 'quiz';
  durationMinutes: number;
  completed: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  level: ResourceLevel;
  totalSteps: number;
  completedSteps: number;
  coverUrl: string | null;
  certificateBadge: string | null;
  steps: CourseStep[];
}

// ─── Cache keys ───────────────────────────────────────────────────────────────
const CACHE = {
  articles: (cat: string, lvl: string, lang: string) =>
    `@resources_articles_${cat}_${lvl}_${lang}`,
  article: (slug: string) => `@resources_article_${slug}`,
  courses: '@resources_courses',
  bookmarks: '@resources_bookmarks',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getCurrentUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

// ─── Service ──────────────────────────────────────────────────────────────────
export const resourcesService = {
  getArticles: async (params?: {
    category?: string;
    level?: ResourceLevel;
    lang?: ResourceLang;
    search?: string;
  }): Promise<ArticleListItem[]> => {
    const cat = params?.category ?? '';
    const lvl = params?.level ?? '';
    const lang = params?.lang ?? '';
    const cacheKey = CACHE.articles(cat, lvl, lang);

    try {
      let query = supabase
        .from('articles')
        .select(
          'slug, title, summary, category, level, lang, read_minutes, published_at, thumbnail_url, has_video',
        )
        .order('published_at', { ascending: false });
      if (params?.category) query = query.eq('category', params.category);
      if (params?.level) query = query.eq('level', params.level);
      if (params?.lang) query = query.eq('lang', params.lang);
      if (params?.search)
        query = query.or(
          `title.ilike.%${params.search}%,summary.ilike.%${params.search}%`,
        );
      const { data, error } = await query;
      if (error) throw error;
      const items = (Array.isArray(data) ? data : []).map(a => ({
        slug: a.slug,
        title: a.title,
        summary: a.summary ?? '',
        category: a.category,
        level: a.level as ResourceLevel,
        lang: a.lang as ResourceLang,
        readMinutes: a.read_minutes,
        publishedAt: a.published_at,
        thumbnailUrl: a.thumbnail_url,
        hasVideo: a.has_video,
      }));
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({ ts: Date.now(), data: items }),
      ).catch(() => {});
      return items;
    } catch {
      const cached = await AsyncStorage.getItem(cacheKey).catch(() => null);
      if (cached) return JSON.parse(cached).data ?? [];
      return [];
    }
  },

  getArticle: async (slug: string): Promise<Article | null> => {
    const cacheKey = CACHE.article(slug);
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) return null;
      const article: Article = {
        slug: data.slug,
        title: data.title,
        summary: data.summary ?? '',
        content: data.content,
        category: data.category,
        level: data.level as ResourceLevel,
        lang: data.lang as ResourceLang,
        readMinutes: data.read_minutes,
        publishedAt: data.published_at,
        thumbnailUrl: data.thumbnail_url,
        videoUrl: data.video_url,
      };
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({ ts: Date.now(), data: article }),
      ).catch(() => {});
      return article;
    } catch {
      const cached = await AsyncStorage.getItem(cacheKey).catch(() => null);
      return cached ? JSON.parse(cached).data ?? null : null;
    }
  },

  getCourses: async (): Promise<Course[]> => {
    const userId = await getCurrentUserId();
    try {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*, steps:course_steps(*)')
        .order('created_at');
      if (error) throw error;
      let completedStepIds: string[] = [];
      if (userId) {
        const { data: progress } = await supabase
          .from('course_progress')
          .select('step_id')
          .eq('user_id', userId);
        completedStepIds = (Array.isArray(progress) ? progress : []).map(
          p => p.step_id,
        );
      }
      return (Array.isArray(courses) ? courses : []).map(c => {
        const steps: CourseStep[] = (Array.isArray(c.steps) ? c.steps : [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((s: any) => ({
            id: s.id,
            title: s.title,
            type: s.type as CourseStep['type'],
            durationMinutes: s.duration_minutes,
            completed: completedStepIds.includes(s.id),
          }));
        return {
          id: c.id,
          title: c.title,
          description: c.description ?? '',
          level: c.level as ResourceLevel,
          totalSteps: steps.length,
          completedSteps: steps.filter(s => s.completed).length,
          coverUrl: c.cover_url,
          certificateBadge: c.certificate_badge,
          steps,
        };
      });
    } catch {
      const cached = await AsyncStorage.getItem(CACHE.courses).catch(() => null);
      if (cached) return JSON.parse(cached).data ?? [];
      return [];
    }
  },

  markStepComplete: async (courseId: string, stepId: string): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await supabase
      .from('course_progress')
      .upsert(
        { user_id: userId, step_id: stepId },
        { onConflict: 'user_id,step_id' },
      );
  },

  getBookmarks: async (): Promise<string[]> => {
    const raw = await AsyncStorage.getItem(CACHE.bookmarks).catch(() => null);
    return raw ? JSON.parse(raw) : [];
  },

  toggleBookmark: async (slug: string): Promise<boolean> => {
    const bookmarks = await resourcesService.getBookmarks();
    const isBookmarked = bookmarks.includes(slug);
    const updated = isBookmarked
      ? bookmarks.filter(s => s !== slug)
      : [...bookmarks, slug];
    await AsyncStorage.setItem(CACHE.bookmarks, JSON.stringify(updated)).catch(
      () => {},
    );
    return !isBookmarked;
  },

  isBookmarked: async (slug: string): Promise<boolean> => {
    const bookmarks = await resourcesService.getBookmarks();
    return bookmarks.includes(slug);
  },
};
