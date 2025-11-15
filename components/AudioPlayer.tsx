
import React from 'react';
import { PlayIcon, PauseIcon, StopIcon } from './icons/PlayerIcons';

interface AudioPlayerProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ isPlaying, onPlay, onPause, onStop }) => {
  return (
    <div className="mt-auto pt-6 border-t border-slate-700">
       <h3 className="mb-4 text-lg font-semibold text-cyan-300">Player Controls</h3>
      <div className="flex items-center justify-center gap-6 p-4 bg-slate-800 rounded-xl">
        <button
          onClick={onStop}
          className="p-3 rounded-full bg-slate-700 hover:bg-red-500 text-slate-300 hover:text-white transition-all duration-200"
          aria-label="Stop"
        >
          <StopIcon className="w-6 h-6" />
        </button>
        {isPlaying ? (
          <button
            onClick={onPause}
            className="p-5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition-all duration-200 shadow-lg shadow-cyan-500/30"
            aria-label="Pause"
          >
            <PauseIcon className="w-8 h-8" />
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="p-5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition-all duration-200 shadow-lg shadow-cyan-500/30"
            aria-label="Play"
          >
            <PlayIcon className="w-8 h-8" />
          </button>
        )}
      </div>
    </div>
  );
};
