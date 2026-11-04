export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  saved_path?: string;
  preview_url?: string;
  is_image?: boolean;
  data?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: AttachedFile[];
}

export interface Session {
  id: string;
  title: string;
  timestamp: number;
  messages: ChatMessage[];
}

export interface SystemMetrics {
  cpu_usage: number;
  memory_used_mb: number;
  memory_total_mb: number;
  memory_percentage: number;
  disk_free_gb: number;
  disk_total_gb: number;
}

export interface GoogleUser {
  authenticated: boolean;
  name?: string;
  email?: string;
  picture?: string;
  storage_used_gb?: number;
  storage_total_gb?: number;
}

export interface DriveStatus {
  authenticated: boolean;
  display_name?: string;
  email?: string;
  photo_link?: string;
  storage_used_gb?: number;
  storage_total_gb?: number;
  error?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  picture?: string;
  is_active: boolean;
  api_key?: string;
}

export interface SettingsState {
  has_api_key: boolean;
  api_key_masked: string;
  raw_key: string;
  has_openai_key?: boolean;
  openai_key_masked?: string;
  raw_openai_key?: string;
}

export type SidebarTab = 'chats' | 'tools' | 'drive' | 'media' | 'notebook';

export interface MediaItem {
  id: string;
  name: string;
  filename: string;
  extension: string;
  size_bytes: number;
  size_human: string;
  category: 'video' | 'audio' | 'image' | 'other';
  mime_type: string;
  url: string;
  modified_at: number;
  thumbnail_url?: string;
  duration?: number;
}

export interface NotebookSource {
  id: string;
  name: string;
  file_type: string;
  size_bytes: number;
  size_human: string;
  page_count: number;
  chunk_count: number;
  created_at: number;
  path?: string;
  status: 'indexed' | 'indexing' | 'error';
}

export interface NotebookChunk {
  id: string;
  source_id: string;
  source_name: string;
  page: number;
  text: string;
  similarity?: number;
}

export interface Citation {
  source_id: string;
  source_name: string;
  page: number;
  excerpt: string;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  source_name?: string;
  page?: number;
}

export interface QuizOption {
  key: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correct_option: string;
  explanation: string;
  source_name?: string;
  page?: number;
}

export interface KeyConcept {
  id: string;
  term: string;
  definition: string;
  context?: string;
  source_name?: string;
  page?: number;
}

export interface StudyGuideData {
  summary: string;
  key_points: string[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  key_concepts: KeyConcept[];
  generated_at: number;
}

export interface Notebook {
  id: string;
  title: string;
  description: string;
  created_at: number;
  updated_at: number;
  sources: NotebookSource[];
  study_guide?: StudyGuideData;
}
