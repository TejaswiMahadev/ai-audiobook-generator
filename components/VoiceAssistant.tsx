import React, { useState, useRef, useEffect } from 'react';
import type { ScriptSection, ChatMessage } from '../types';
import { askAssistant, generateSpeech } from '../services/geminiService';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { MicIcon } from './icons/AssistantIcons';

interface VoiceAssistantProps {
  script: ScriptSection[];
}

type Status = 'idle' | 'listening' | 'processing';

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ script }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const { isListening, interimTranscript, startListening, stopListening } = useVoiceAssistant();
  const transcriptPromiseRef = useRef<Promise<string> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const fullScriptText = React.useMemo(() => {
    return script.map(s => `Section: ${s.title}\n${s.paragraphs.join('\n')}`).join('\n\n');
  }, [script]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);
  
  const playAudio = async (base64Audio: string) => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    const audioBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.start();
  };

  const handleInteractionEnd = async () => {
    if (!isListening) return;

    try {
      await stopListening();
      const question = await transcriptPromiseRef.current;

      if (!question || question.trim().length === 0) {
        setStatus('idle');
        return;
      }
      
      const userMessage: ChatMessage = { id: Date.now(), role: 'user', text: question };
      setConversation(prev => [...prev, userMessage]);
      setStatus('processing');
      setError(null);
      
      const assistantResponseText = await askAssistant(question, fullScriptText);
      const assistantMessage: ChatMessage = { id: Date.now() + 1, role: 'assistant', text: assistantResponseText };
      setConversation(prev => [...prev, assistantMessage]);
      
      const audioResponse = await generateSpeech(assistantResponseText);
      await playAudio(audioResponse);

    } catch (err) {
       const message = err instanceof Error ? err.message : 'An unknown error occurred.';
       setError(message);
       console.error("Assistant error:", err);
    } finally {
      setStatus('idle');
    }
  };

  const handleInteractionStart = async () => {
    if (status !== 'idle') return;
    try {
      setError(null);
      transcriptPromiseRef.current = startListening();
      setStatus('listening');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start listening. Please check microphone permissions.';
      setError(message);
      console.error(err);
      setStatus('idle');
    }
  };
  
  const getButtonState = () => {
    switch(status) {
        case 'listening': return { text: "Listening...", class: "bg-red-600 animate-pulse" };
        case 'processing': return { text: "Thinking...", class: "bg-yellow-600" };
        default: return { text: "Hold to Speak", class: "bg-cyan-600 hover:bg-cyan-500" };
    }
  };
  
  const { text: buttonText, class: buttonClass } = getButtonState();

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-700 shadow-2xl p-4 flex-shrink-0">
      <h3 className="text-lg font-semibold text-cyan-300 mb-2 text-center">Study Assistant</h3>
      <p className="text-sm text-gray-400 text-center mb-4">Ask a question about the content.</p>
      
      <div 
        ref={chatContainerRef}
        className="h-32 overflow-y-auto p-3 bg-slate-900 rounded-lg mb-4 space-y-3"
      >
        {conversation.length === 0 && !isListening && (
          <p className="text-slate-500 text-center pt-8">Conversation will appear here.</p>
        )}
        {conversation.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p className={`max-w-[80%] p-2 rounded-lg text-sm ${
              msg.role === 'user' 
                ? 'bg-cyan-800 text-white' 
                : 'bg-slate-700 text-gray-200'
            }`}>
              {msg.text}
            </p>
          </div>
        ))}
        {isListening && (
            <p className="text-cyan-300 italic">{interimTranscript || "Listening..."}</p>
        )}
      </div>

       {error && <div className="text-red-400 text-xs text-center mb-2">{error}</div>}

      <div className="flex flex-col items-center">
        <button
          onMouseDown={handleInteractionStart}
          onMouseUp={handleInteractionEnd}
          onTouchStart={handleInteractionStart}
          onTouchEnd={handleInteractionEnd}
          disabled={status === 'processing'}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed ${buttonClass}`}
          aria-label="Speak to assistant"
        >
          <MicIcon className="w-8 h-8" />
        </button>
        <p className="text-xs text-slate-400 mt-2">{buttonText}</p>
      </div>
    </div>
  );
};