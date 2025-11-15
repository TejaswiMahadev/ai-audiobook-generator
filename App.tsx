import React, { useState, useCallback, useEffect, useRef } from 'react';
import { InputForm } from './components/InputForm';
import { AudioPlayer } from './components/AudioPlayer';
import { InsightsDisplay } from './components/InsightsDisplay';
import { Loader } from './components/Loader';
import { LogoIcon } from './components/icons/LogoIcon';
import { generateScript, generateSpeech } from './services/geminiService';
import type { ScriptSection } from './types';
import { useAudioPlayback } from './hooks/useSpeechSynthesis';
import { VoiceAssistant } from './components/VoiceAssistant';

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [script, setScript] = useState<ScriptSection[] | null>(null);
  const [currentHighlight, setCurrentHighlight] = useState<number>(-1);
  const resultsRef = useRef<HTMLDivElement>(null);

  const allParagraphs = React.useMemo(() => {
    return script?.flatMap(section => section.paragraphs) || [];
  }, [script]);

  const onParagraphStart = useCallback((index: number) => {
    setCurrentHighlight(index);
    const element = document.getElementById(`paragraph-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const onPlaybackEnd = useCallback(() => {
    setCurrentHighlight(-1);
  }, []);
  
  const { 
    play, 
    pause, 
    stop, 
    isPlaying, 
  } = useAudioPlayback(allParagraphs, generateSpeech, onParagraphStart, onPlaybackEnd);

  useEffect(() => {
    if (summary && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [summary]);

  const handleGenerate = async (text: string, image?: { data: string; mimeType: string }) => {
    if (isLoading || (!text.trim() && !image)) return;

    setIsLoading(true);
    setError(null);
    setSummary(null);
    setScript(null);
    stop();

    try {
      const result = await generateScript(text, image);
      setSummary(result.summary);
      setScript(result.script);
    } catch (err) {
      setError(err instanceof Error ? `Failed to generate content: ${err.message}` : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStop = () => {
    stop();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-gray-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <LogoIcon className="w-12 h-12 text-cyan-400" />
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">AI Narrator & Content Deconstructor</h1>
            <p className="text-gray-400">Transform any text into a structured, narrated audio experience.</p>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6 p-6 bg-slate-900/50 rounded-2xl border border-slate-700 shadow-2xl">
            <InputForm onGenerate={handleGenerate} isLoading={isLoading} initialText={inputText} setInitialText={setInputText} />
            {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</div>}
            {script && script.length > 0 && (
              <AudioPlayer
                isPlaying={isPlaying}
                onPlay={play}
                onPause={pause}
                onStop={handleStop}
              />
            )}
          </div>

          <div className="flex flex-col gap-8 max-h-[calc(100vh-8rem)]">
            {isLoading && <Loader />}
            
            {!isLoading && summary && script && (
              <>
                <div ref={resultsRef} className="bg-slate-900/50 rounded-2xl border border-slate-700 shadow-2xl flex-1 overflow-y-auto">
                  <InsightsDisplay 
                    summary={summary} 
                    script={script}
                    currentHighlight={currentHighlight}
                  />
                </div>
                <VoiceAssistant script={script} />
              </>
            )}
            
            {!isLoading && !summary && (
               <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-700 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-white">Your generated content will appear here.</h3>
                  <p className="text-slate-400 mt-2">Enter some text, a topic, or paste an article and click "Generate" to get started.</p>
                </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;