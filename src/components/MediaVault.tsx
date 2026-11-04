import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Music,
  Image as ImageIcon,
  Upload,
  Play,
  Pause,
  Trash2,
  Download,
  RotateCw,
  ZoomIn,
  ZoomOut,
  X,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
  Search,
  RefreshCw,
  HardDrive,
  FolderOpen,
  Check,
} from 'lucide-react';
import { MediaItem } from '../types';
import { Theme, Language, Translations, translations } from '../utils/translations';

interface MediaVaultProps {
  onSendToChat?: (file: { name: string; url: string; type: string }) => void;
  activeMedia?: MediaItem | null;
  onPlayMedia: (item: MediaItem) => void;
  theme?: Theme;
  lang?: Language;
  t?: Translations;
}

export const MediaVault: React.FC<MediaVaultProps> = ({
  onSendToChat,
  activeMedia,
  onPlayMedia,
  theme = 'dark',
  lang = 'ar',
  t = translations[lang || 'ar'],
}) => {
  const isDark = theme === 'dark';
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [totalHuman, setTotalHuman] = useState('0 MB');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Active Players State
  const [activeVideo, setActiveVideo] = useState<MediaItem | null>(null);
  const [activeAudio, setActiveAudio] = useState<MediaItem | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(1);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Active Lightbox State
  const [activeImage, setActiveImage] = useState<MediaItem | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/media/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotalHuman(data.total_human || '0 MB');
      }
    } catch (err) {
      console.error('Failed to load media vault items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 2500);
        await fetchMedia();
      }
    } catch (err) {
      console.error('Failed to upload media:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الملف "${filename}" من مخزن الوسائط؟`)) return;

    try {
      const res = await fetch(`/api/media/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.filename !== filename));
        if (activeAudio?.filename === filename) setActiveAudio(null);
        if (activeVideo?.filename === filename) setActiveVideo(null);
        if (activeImage?.filename === filename) setActiveImage(null);
      }
    } catch (err) {
      console.error('Failed to delete media:', err);
    }
  };

  // Audio Playback Controller
  const playAudio = (item: MediaItem) => {
    if (activeAudio?.id === item.id) {
      if (isPlayingAudio) {
        audioRef.current?.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current?.play();
        setIsPlayingAudio(true);
      }
    } else {
      setActiveAudio(item);
      setIsPlayingAudio(true);
    }
  };

  useEffect(() => {
    if (activeAudio && audioRef.current) {
      audioRef.current.src = activeAudio.url;
      audioRef.current.play().catch(() => setIsPlayingAudio(false));
      setIsPlayingAudio(true);
    }
  }, [activeAudio]);

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioProgress(audioRef.current.currentTime);
      setAudioDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setAudioProgress(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCat = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.extension.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden select-none transition-colors ${
        isDark ? 'bg-gemini-dark text-gray-100' : 'bg-slate-50 text-slate-900'
      }`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top Media Vault Header */}
      <div
        className={`px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          isDark ? 'bg-[#17181a] border-gemini-border/70' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 via-purple-500 to-cyan-400 p-[1.5px] shadow-lg shadow-blue-500/20 shrink-0">
            <div className={`w-full h-full rounded-[14px] flex items-center justify-center ${isDark ? 'bg-[#1e1f20]' : 'bg-white'}`}>
              <Film className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div>
            <h1 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span>{t.mediaVaultTitle}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono">
                Nerdo Studio
              </span>
            </h1>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              {t.mediaVaultSub}
            </p>
          </div>
        </div>

        {/* Action Controls & Upload */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchMedia}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-gemini-border transition-colors"
            title="تحديث قائمة الوسائط"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept="video/*,audio/*,image/*"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all ${
              uploadSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/20'
            }`}
          >
            {uploadSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>تم الرفع بنجاح!</span>
              </>
            ) : isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري استيراد الوسائط...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>استيراد وسائط جديدة</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-6 py-3 border-b border-gemini-border/50 bg-[#131314]/90 flex flex-wrap items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#1e1f20] border border-gemini-border/60">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            الكل ({items.length})
          </button>
          <button
            onClick={() => setActiveCategory('video')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
              activeCategory === 'video'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-cyan-400" />
            <span>فيديو ({items.filter((i) => i.category === 'video').length})</span>
          </button>
          <button
            onClick={() => setActiveCategory('audio')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
              activeCategory === 'audio'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5 text-pink-400" />
            <span>صوتيات ({items.filter((i) => i.category === 'audio').length})</span>
          </button>
          <button
            onClick={() => setActiveCategory('image')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
              activeCategory === 'image'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>صور ({items.filter((i) => i.category === 'image').length})</span>
          </button>
        </div>

        {/* Search Input & Vault Stats */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالاسم أو الامتداد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e1f20] border border-gemini-border rounded-xl pr-9 pl-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-gemini-border text-[11px] text-gray-400 font-mono">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span>الحجم الإجمالي: {totalHuman}</span>
          </div>
        </div>
      </div>

      {/* Media Grid Canvas */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
            <span className="text-xs">جاري فحص مخزن الوسائط...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="h-[55vh] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gemini-border/70 rounded-3xl bg-[#17181a]/50">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-gray-400">
              <FolderOpen className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-gray-200 mb-1">المخزن خالي من الوسائط حالياً</h3>
            <p className="text-xs text-gray-400 max-w-md mb-6 leading-relaxed">
              يمكنك استيراد مقاطع الفيديو، التسجيلات الصوتية، أو ألبومات الصور بسهولة. يدعم DOQ&amp;S كافة صيغ
              MP4, WEBM, MKV, MP3, WAV, PNG, JPG وغيرها مع مشغل فائق الأداء.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-blue-600/30"
            >
              <Upload className="w-4 h-4" />
              <span>استيراد ملفات الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-24">
            {filteredItems.map((item) => {
              const isPlayingThis = activeMedia?.id === item.id || activeAudio?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`group relative bg-[#1c1d1f] hover:bg-[#232427] border ${isPlayingThis ? 'border-blue-500 shadow-md shadow-blue-500/20' : 'border-gemini-border'} rounded-2xl overflow-hidden transition-all duration-200 hover:border-blue-500/50 hover:shadow-xl hover:shadow-black/40 flex flex-col`}
                >
                  {/* Thumbnail / Media Preview Area */}
                  <div className="relative aspect-video bg-[#131314] overflow-hidden flex items-center justify-center">
                    {item.category === 'image' ? (
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onClick={() => setActiveImage(item)}
                      />
                    ) : item.category === 'video' ? (
                      <div
                        className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-amber-950/40 to-slate-900 cursor-pointer group/vid"
                        onClick={() => onPlayMedia(item)}
                      >
                        <Film className="w-10 h-10 text-amber-400/40 group-hover/vid:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-opacity">
                          <div className="w-12 h-12 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg shadow-amber-500/50">
                            <Play className="w-5 h-5 ml-0.5 fill-current" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 transition-colors ${
                          activeMedia?.id === item.id ? 'bg-amber-950/30' : 'bg-[#18191c]'
                        }`}
                        onClick={() => onPlayMedia(item)}
                      >
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-transform group-hover:scale-110 ${
                            activeMedia?.id === item.id
                              ? 'bg-amber-500 text-black animate-pulse'
                              : 'bg-white/5 text-amber-400 border border-white/10'
                          }`}
                        >
                          <Play className="w-5 h-5 ml-0.5 fill-current" />
                        </div>
                        {/* Audio Waveform Graphic */}
                        <div className="flex items-center gap-1 h-3">
                          {[40, 75, 50, 90, 60, 100, 45, 80, 60].map((h, idx) => (
                            <span
                              key={idx}
                              style={{ height: `${activeMedia?.id === item.id ? h : 30}%` }}
                              className={`w-0.5 rounded-full transition-all duration-300 ${
                                activeMedia?.id === item.id ? 'bg-amber-400' : 'bg-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Category & Extension Badge */}
                    <span className="absolute top-2.5 right-2.5 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white border border-white/10">
                      {item.extension}
                    </span>
                  </div>

                  {/* Info & Footer Actions */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-xs text-gray-100 truncate mb-1" title={item.name}>
                        {item.name}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                        <span>{item.size_human}</span>
                        <span>{new Date(item.modified_at).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gemini-border/40">
                      <div className="flex items-center gap-1.5">
                        {item.category === 'video' && (
                          <button
                            onClick={() => onPlayMedia(item)}
                            className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-xs transition-colors"
                            title="تشغيل في الخلفية والمشغل العائم"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                        {item.category === 'audio' && (
                          <button
                            onClick={() => onPlayMedia(item)}
                            className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-xs transition-colors"
                            title="تشغيل مستمر في الخلفية"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                        {item.category === 'image' && (
                          <button
                            onClick={() => setActiveImage(item)}
                            className="p-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 text-xs transition-colors"
                            title="تكبير ومعاينة الصورة"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onSendToChat && (
                          <button
                            onClick={() =>
                              onSendToChat({
                                name: item.filename,
                                url: item.url,
                                type: item.mime_type,
                              })
                            }
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-purple-300 transition-colors"
                            title="إرسال هذا الملف إلى محادثة الذكاء الاصطناعي لتحليله"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <a
                          href={item.url}
                          download={item.filename}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
                          title="تحميل الملف على جهازك"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <button
                        onClick={() => handleDelete(item.filename)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                        title="حذف الملف من المخزن"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================================== */}
      {/* 1. Pro Video Player Modal (Full Streaming with Range Headers & PiP) */}
      {/* ============================================================================== */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl bg-[#131314] border border-gemini-border rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Player Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-gemini-border/60 bg-[#1c1d20]">
              <div className="flex items-center gap-2.5 truncate">
                <Film className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-semibold text-xs md:text-sm text-gray-100 truncate">{activeVideo.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 text-gray-400">
                  {activeVideo.extension.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activeVideo.url}
                  download={activeVideo.filename}
                  className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  title="تحميل المقطع"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setActiveVideo(null)}
                  className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  title="إغلاق المشغل"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Screen */}
            <div className="relative bg-black flex items-center justify-center min-h-[360px] max-h-[70vh]">
              <video
                ref={videoRef}
                src={activeVideo.url}
                controls
                autoPlay
                className="w-full h-full max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 2. Floating Persistent Audio Player (Runs while using the app!) */}
      {/* ============================================================================== */}
      {activeAudio && (
        <div className="fixed bottom-4 left-6 right-6 md:left-24 md:right-24 z-40 bg-[#1c1d20]/95 backdrop-blur-xl border border-pink-500/30 rounded-2xl shadow-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-6 duration-300">
          <audio
            ref={audioRef}
            onTimeUpdate={handleAudioTimeUpdate}
            onEnded={() => setIsPlayingAudio(false)}
          />

          {/* Track Info */}
          <div className="flex items-center gap-3 w-full md:w-1/4 truncate">
            <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center shrink-0">
              <Music className={`w-5 h-5 text-pink-400 ${isPlayingAudio ? 'animate-bounce' : ''}`} />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-gray-100 truncate">{activeAudio.name}</div>
              <div className="text-[10px] text-pink-300 font-mono">مشغل الصوتيات الذكي</div>
            </div>
          </div>

          {/* Controls & Scrubber */}
          <div className="flex-1 w-full flex flex-col items-center gap-1.5 max-w-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => playAudio(activeAudio)}
                className="w-9 h-9 rounded-full bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center shadow-lg shadow-pink-600/30 transition-transform active:scale-95"
              >
                {isPlayingAudio ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5 fill-current" />
                )}
              </button>
            </div>

            <div className="w-full flex items-center gap-2 text-[10px] text-gray-400 font-mono" dir="ltr">
              <span>{formatTime(audioProgress)}</span>
              <input
                type="range"
                min="0"
                max={audioDuration || 100}
                value={audioProgress}
                onChange={handleAudioSeek}
                className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
              <span>{formatTime(audioDuration)}</span>
            </div>
          </div>

          {/* Volume & Close */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const muted = !isAudioMuted;
                  setIsAudioMuted(muted);
                  if (audioRef.current) audioRef.current.muted = muted;
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white"
              >
                {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isAudioMuted ? 0 : audioVolume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAudioVolume(val);
                  setIsAudioMuted(false);
                  if (audioRef.current) {
                    audioRef.current.volume = val;
                    audioRef.current.muted = false;
                  }
                }}
                className="w-16 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
            </div>

            <button
              onClick={() => {
                if (audioRef.current) audioRef.current.pause();
                setActiveAudio(null);
                setIsPlayingAudio(false);
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              title="إغلاق المشغل"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 3. Image Lightbox Modal with Zoom & Rotation */}
      {/* ============================================================================== */}
      {activeImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-200">
          {/* Lightbox Toolbar */}
          <div className="flex items-center justify-between pb-3 px-4 border-b border-white/10">
            <div className="text-xs text-gray-200 font-semibold truncate max-w-sm">{activeImage.name}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setImageZoom((z) => Math.min(z + 0.25, 3))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="تكبير"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setImageZoom((z) => Math.max(z - 0.25, 0.5))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="تصغير"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setImageRotation((r) => (r + 90) % 360)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="تدوير 90 درجة"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <a
                href={activeImage.url}
                download={activeImage.filename}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="تحميل الصورة"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                onClick={() => {
                  setActiveImage(null);
                  setImageZoom(1);
                  setImageRotation(0);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Zoomable Image Container */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            <img
              src={activeImage.url}
              alt={activeImage.name}
              style={{
                transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                transition: 'transform 0.2s ease-out',
              }}
              className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
