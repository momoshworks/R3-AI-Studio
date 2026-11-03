import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Repeat,
  Film,
  Music,
  Maximize2,
} from 'lucide-react';
import { MediaItem } from '../types';

interface BackgroundMediaPlayerProps {
  activeMedia: MediaItem | null;
  onClose: () => void;
  currentTab: string;
}

export const BackgroundMediaPlayer: React.FC<BackgroundMediaPlayerProps> = ({
  activeMedia,
  onClose,
  currentTab,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isVideo = activeMedia?.category === 'video';
  const isAudio = activeMedia?.category === 'audio';

  const speeds = [1, 1.25, 1.5, 2];

  const cycleSpeed = () => {
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextRate = speeds[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
    if (videoRef.current) videoRef.current.playbackRate = nextRate;
  };

  // Load and play media whenever activeMedia changes
  useEffect(() => {
    if (!activeMedia) {
      if (audioRef.current) audioRef.current.pause();
      if (videoRef.current) videoRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (isVideo && videoRef.current) {
      videoRef.current.src = activeMedia.url;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else if (isAudio && audioRef.current) {
      audioRef.current.src = activeMedia.url;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }

    // Windows Media Session Integration (Control playback from Lock Screen / Keyboard / Windows notification)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeMedia.name,
        artist: 'R3 Media Studio',
        album: 'R3 AI Workstation',
        artwork: [
          { src: '/app-icon.png', sizes: '256x256', type: 'image/png' },
          { src: '/app-icon.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) handleSeekTime(details.seekTime);
      });
    }
  }, [activeMedia]);

  const togglePlay = () => {
    const el = isVideo ? videoRef.current : audioRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    const el = e.currentTarget;
    setCurrentTime(el.currentTime);
    setDuration(el.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    handleSeekTime(time);
  };

  const handleSeekTime = (time: number) => {
    setCurrentTime(time);
    const el = isVideo ? videoRef.current : audioRef.current;
    if (el) el.currentTime = time;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    setIsMuted(false);
    const el = isVideo ? videoRef.current : audioRef.current;
    if (el) {
      el.volume = val;
      el.muted = false;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    const el = isVideo ? videoRef.current : audioRef.current;
    if (el) el.muted = nextMuted;
  };

  const toggleLoop = () => {
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    const el = isVideo ? videoRef.current : audioRef.current;
    if (el) el.loop = nextLoop;
  };

  const triggerPictureInPicture = async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.warn('PiP error:', err);
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!activeMedia) return null;

  return (
    <>
      {/* Invisible Persistent Audio Element (Keeps audio playing seamlessly in background across all tabs) */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          if (!isLooping) setIsPlaying(false);
        }}
      />

      {/* ONLY display the player UI inside the Media Vault (currentTab === 'media') */}
      {currentTab === 'media' && (
        <div
          className="fixed bottom-4 left-6 right-6 md:left-24 md:right-24 z-40 bg-[#1c1d20]/95 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-6 duration-300"
          dir="rtl"
        >
          {/* Track / Media Info */}
          <div className="flex items-center gap-3 w-full md:w-1/4 truncate">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600/30 to-purple-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
              {isVideo ? (
                <Film className={`w-5 h-5 text-blue-400 ${isPlaying ? 'animate-pulse' : ''}`} />
              ) : (
                <Music className={`w-5 h-5 text-blue-400 ${isPlaying ? 'animate-bounce' : ''}`} />
              )}
            </div>

            <div className="truncate">
              <div className="text-xs font-bold text-gray-100 truncate" title={activeMedia.name}>
                {activeMedia.name}
              </div>
              <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1.5">
                <span>R3 Media Studio</span>
                {isPlaying && (
                  <div className="flex items-end gap-0.5 h-3 px-1">
                    <span className="w-0.5 bg-cyan-400 rounded-full wave-bar-1" />
                    <span className="w-0.5 bg-blue-400 rounded-full wave-bar-2" />
                    <span className="w-0.5 bg-purple-400 rounded-full wave-bar-3" />
                    <span className="w-0.5 bg-pink-400 rounded-full wave-bar-4" />
                    <span className="w-0.5 bg-amber-400 rounded-full wave-bar-5" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls & Scrubber */}
          <div className="flex-1 w-full flex flex-col items-center gap-1.5 max-w-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleLoop}
                className={`p-1.5 rounded-lg transition-colors ${
                  isLooping ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'
                }`}
                title={isLooping ? 'التكرار مفعل' : 'تفعيل التكرار'}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={cycleSpeed}
                className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-500/30 transition-colors"
                title="تغيير سرعة التشغيل"
              >
                {playbackRate}x
              </button>

              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-transform active:scale-95"
                title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5 fill-current" />
                )}
              </button>

              {isVideo && (
                <button
                  onClick={triggerPictureInPicture}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 transition-colors"
                  title="نافذة عائمة فوق النظام (Picture-in-Picture)"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="w-full flex items-center gap-2 text-[10px] text-gray-400 font-mono" dir="ltr">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-gray-700/80 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume & Close */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5">
              <button onClick={toggleMute} className="p-1 text-gray-400 hover:text-white transition-colors">
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="إغلاق المشغل"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Mini Pill when playing in background outside the media tab */}
      {currentTab !== 'media' && activeMedia && (
        <div
          className="fixed bottom-4 left-4 z-40 bg-[#1c1d20]/95 backdrop-blur-xl border border-blue-500/40 rounded-full shadow-2xl px-3 py-1.5 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 select-none"
          dir="ltr"
        >
          <button
            onClick={togglePlay}
            className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md active:scale-95"
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
            )}
          </button>
          <div className="max-w-[140px] truncate text-xs text-gray-200 font-medium" title={activeMedia.name}>
            {activeMedia.name}
          </div>
          {isPlaying && (
            <div className="flex items-end gap-0.5 h-3 px-1">
              <span className="w-0.5 bg-cyan-400 rounded-full wave-bar-1" />
              <span className="w-0.5 bg-blue-400 rounded-full wave-bar-2" />
              <span className="w-0.5 bg-purple-400 rounded-full wave-bar-3" />
            </div>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10"
            title="إغلاق المشغل"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};
