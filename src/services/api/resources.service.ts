import { supabase } from '../../lib/supabase';


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

async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Connectez-vous pour enregistrer vos ressources.');
  return user.id;
}
export const resourcesService = {
  async getArticles(params?: { category?: string; level?: ResourceLevel; lang?: ResourceLang; search?: string }): Promise<ArticleListItem[]> {
    let query = supabase.from('articles').select('slug,title,summary,category,level,lang,read_minutes,published_at,thumbnail_url,has_video').order('published_at', { ascending: false });
    if (params?.category) query = query.eq('category', params.category);
    if (params?.level) query = query.eq('level', params.level);
    if (params?.lang) query = query.eq('lang', params.lang);
    const search = params?.search?.replace(/[%_(),.]/g, ' ').trim().slice(0, 200);
    if (search) query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(a => ({ slug: a.slug, title: a.title, summary: a.summary ?? '', category: a.category,
      level: a.level as ResourceLevel, lang: a.lang as ResourceLang, readMinutes: a.read_minutes,
      publishedAt: a.published_at, thumbnailUrl: a.thumbnail_url, hasVideo: a.has_video }));
  },
  async getArticle(slug: string): Promise<Article | null> {
    const { data, error } = await supabase.from('articles').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { slug: data.slug, title: data.title, summary: data.summary ?? '', content: data.content, category: data.category,
      level: data.level as ResourceLevel, lang: data.lang as ResourceLang, readMinutes: data.read_minutes,
      publishedAt: data.published_at, thumbnailUrl: data.thumbnail_url, videoUrl: data.video_url };
  },
  async getCourses(): Promise<Course[]> {
    const userId = await getCurrentUserId();
    const { data: courses, error } = await supabase.from('courses').select('*, steps:course_steps(*)').order('created_at');
    if (error) throw error;
    const { data: progress, error: progressError } = await supabase.from('course_progress').select('step_id').eq('user_id', userId);
    if (progressError) throw progressError;
    const completed = new Set((progress ?? []).map(row => row.step_id));
    return (courses ?? []).map(course => {
      const steps: CourseStep[] = [...course.steps].sort((a, b) => a.position - b.position).map(step => ({
        id: step.id, title: step.title, type: step.type as CourseStep['type'], durationMinutes: step.duration_minutes, completed: completed.has(step.id),
      }));
      return { id: course.id, title: course.title, description: course.description ?? '', level: course.level as ResourceLevel,
        totalSteps: steps.length, completedSteps: steps.filter(step => step.completed).length,
        coverUrl: course.cover_url, certificateBadge: course.certificate_badge, steps };
    });
  },
  async markStepComplete(_courseId: string, stepId: string): Promise<void> {
    const userId = await getCurrentUserId();
    const { error } = await supabase.from('course_progress').upsert({ user_id: userId, step_id: stepId }, { onConflict: 'user_id,step_id' });
    if (error) throw error;
  },
  async getBookmarks(): Promise<string[]> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('user_bookmarks').select('article_slug').eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map(row => row.article_slug);
  },
  async toggleBookmark(slug: string): Promise<boolean> {
    const userId = await getCurrentUserId();
    const { data, error: readError } = await supabase.from('user_bookmarks').select('article_slug').eq('user_id', userId).eq('article_slug', slug).maybeSingle();
    if (readError) throw readError;
    const result = data
      ? await supabase.from('user_bookmarks').delete().eq('user_id', userId).eq('article_slug', slug)
      : await supabase.from('user_bookmarks').upsert({ user_id: userId, article_slug: slug }, { onConflict: 'user_id,article_slug', ignoreDuplicates: true });
    if (result.error) throw result.error;
    return !data;
  },
  async isBookmarked(slug: string): Promise<boolean> { return (await resourcesService.getBookmarks()).includes(slug); },
};
