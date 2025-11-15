import { useState, useCallback, useRef, useEffect } from 'react';
import { decode, decodeAudioData } from '../utils/audioUtils';

export const useAudioPlayback = (
  paragraphs: string[],
  generateSpeech: (text: string) => Promise<string>,
  onParagraphStart: (index: number) => void,
  onPlaybackEnd: () => void
) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const paragraphQueueRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);
  const audioBufferCacheRef = useRef<Map<number, AudioBuffer>>(new Map());

  const cleanup = useCallback(() => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current.disconnect();
      currentSourceRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    currentIndexRef.current = 0;
    paragraphQueueRef.current = [];
    onPlaybackEnd();
  }, [onPlaybackEnd]);

  const fetchAndDecode = useCallback(async (text: string, index: number) => {
    if (audioBufferCacheRef.current.has(index)) {
        return audioBufferCacheRef.current.get(index);
    }
    if (!audioContextRef.current) return null;

    try {
        const base64Audio = await generateSpeech(text);
        const audioBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
        audioBufferCacheRef.current.set(index, audioBuffer);
        return audioBuffer;
    } catch (error) {
        console.error(`Failed to fetch or decode audio for paragraph ${index}:`, error);
        return null;
    }
  }, [generateSpeech]);

  const playNext = useCallback(async () => {
    if (isPaused) return;

    const currentParagraphIndex = currentIndexRef.current;
    if (currentParagraphIndex >= paragraphQueueRef.current.length) {
      cleanup();
      return;
    }

    onParagraphStart(currentParagraphIndex);
    
    const audioBuffer = await fetchAndDecode(paragraphQueueRef.current[currentParagraphIndex], currentParagraphIndex);

    if (!audioBuffer || !audioContextRef.current) {
      console.error("Could not play audio, buffer or context is missing.");
      cleanup();
      return;
    }

    // Pre-fetch next paragraph's audio
    const nextIndex = currentParagraphIndex + 1;
    if (nextIndex < paragraphQueueRef.current.length) {
        fetchAndDecode(paragraphQueueRef.current[nextIndex], nextIndex);
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      currentIndexRef.current++;
      playNext();
    };
    source.start();
    currentSourceRef.current = source;
  }, [isPaused, cleanup, onParagraphStart, fetchAndDecode]);

  const play = useCallback(() => {
    if (!paragraphs || paragraphs.length === 0) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (isPaused) {
      audioContextRef.current?.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    if (isPlaying) return;

    paragraphQueueRef.current = paragraphs;
    audioBufferCacheRef.current.clear();
    currentIndexRef.current = 0;
    setIsPlaying(true);
    setIsPaused(false);
    playNext();
  }, [paragraphs, isPaused, isPlaying, playNext]);

  const pause = useCallback(() => {
    if (isPlaying) {
      audioContextRef.current?.suspend();
      setIsPaused(true);
      setIsPlaying(false);
    }
  }, [isPlaying]);
  
  const stop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
      audioContextRef.current?.close();
    };
  }, [cleanup]);
  
  // Stop playback if the source paragraphs change
  useEffect(() => {
    stop();
  }, [paragraphs, stop]);

  return { play, pause, stop, isPlaying };
};