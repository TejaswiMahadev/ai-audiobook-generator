import { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob } from '../utils/audioUtils';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const useVoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const finalTranscriptRef = useRef<string>('');
  // FIX: Initialize useRef with null as its initial value.
  const resolveTranscriptPromiseRef = useRef<((value: string) => void) | null>(null);

  // FIX: Initialize useRef with null as its initial value.
  const audioContextRef = useRef<AudioContext | null>(null);
  // FIX: Initialize useRef with null as its initial value.
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  // FIX: Initialize useRef with null as its initial value.
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  // FIX: Initialize useRef with null as its initial value.
  const streamRef = useRef<MediaStream | null>(null);

  const startListening = useCallback(async () => {
    if (isListening) return;

    finalTranscriptRef.current = '';
    setInterimTranscript('');
    setIsListening(true);
    
    const transcriptPromise = new Promise<string>((resolve) => {
        resolveTranscriptPromiseRef.current = resolve;
    });

    try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        
        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    mediaStreamSourceRef.current = audioContextRef.current?.createMediaStreamSource(streamRef.current!);
                    scriptProcessorRef.current = audioContextRef.current?.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessorRef.current!.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createPcmBlob(inputData);
                        
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };

                    mediaStreamSourceRef.current?.connect(scriptProcessorRef.current!);
                    scriptProcessorRef.current?.connect(audioContextRef.current!.destination);
                },
                onmessage: (message: LiveServerMessage) => {
                    const transcript = message.serverContent?.inputTranscription?.text ?? '';
                    if (message.serverContent?.turnComplete) {
                        finalTranscriptRef.current += transcript;
                        setInterimTranscript(finalTranscriptRef.current);
                        if (resolveTranscriptPromiseRef.current) {
                           resolveTranscriptPromiseRef.current(finalTranscriptRef.current.trim());
                        }
                    } else {
                        setInterimTranscript(finalTranscriptRef.current + transcript);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    setIsListening(false);
                },
                onclose: (e: CloseEvent) => {
                   // console.log('Live session closed');
                },
            },
            config: {
                inputAudioTranscription: {},
                // FIX: Per @google/genai guidelines, responseModalities must be set to [Modality.AUDIO] for Live API calls.
                responseModalities: [Modality.AUDIO],
            },
        });
        
        await sessionPromiseRef.current;
        return transcriptPromise;

    } catch (error) {
        console.error("Failed to start listening:", error);
        setIsListening(false);
        throw new Error("Could not access microphone.");
    }
  }, [isListening]);

  const stopListening = useCallback(async () => {
    if (!isListening) return;
    
    // Stop audio processing
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    audioContextRef.current?.close();

    // Stop microphone
    streamRef.current?.getTracks().forEach((track) => track.stop());

    // Close Gemini session
    const session = await sessionPromiseRef.current;
    session?.close();

    setIsListening(false);
    sessionPromiseRef.current = null;
  }, [isListening]);

  return { isListening, interimTranscript, startListening, stopListening };
};
