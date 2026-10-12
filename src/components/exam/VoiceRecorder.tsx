'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, RefreshCw } from 'lucide-react';

interface VoiceRecorderProps {
  questionText: string;
  onTranscriptChange: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ questionText, onTranscriptChange, disabled = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [browserSupported, setBrowserSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setBrowserSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let fullText = '';
      for (let i = 0; i < event.results.length; i++) {
        fullText += event.results[i][0].transcript + ' ';
      }
      const trimmed = fullText.trim();
      setTranscript(trimmed);
      onTranscriptChange(trimmed);
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition status:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        try {
          recognition.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer effect during recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
  }, [isRecording]);

  const toggleRecording = () => {
    if (disabled) return;

    if (isRecording) {
      setIsRecording(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    } else {
      if (!browserSupported) {
        alert('Speech recognition is not natively supported in this browser. You can type your answer directly in the box below.');
        return;
      }
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Error starting recognition:', e);
      }
    }
  };

  const handleSpeakQuestion = () => {
    if (!window.speechSynthesis) return;

    if (isSpeakingQuestion) {
      window.speechSynthesis.cancel();
      setIsSpeakingQuestion(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(questionText);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeakingQuestion(false);
      utterance.onerror = () => setIsSpeakingQuestion(false);
      setIsSpeakingQuestion(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full rounded-2xl border border-indigo-100 dark:border-indigo-950 bg-gradient-to-b from-indigo-50/50 to-white dark:from-slate-900/60 dark:to-slate-900 p-6 shadow-sm space-y-4">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
            Voice Viva Mode Active
          </span>
        </div>

        {/* Text to speech speaker for AI Question */}
        <button
          type="button"
          onClick={handleSpeakQuestion}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-200 transition shadow-sm"
          title="AI Professor speaks question aloud"
        >
          {isSpeakingQuestion ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-rose-500" />
              <span>Stop AI Voice</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Listen to AI Professor</span>
            </>
          )}
        </button>
      </div>

      {/* Mic Record Button and Soundwave animation */}
      <div className="flex flex-col items-center justify-center py-4 space-y-3">
        <button
          type="button"
          onClick={toggleRecording}
          disabled={disabled}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-lg ${
            isRecording
              ? 'bg-rose-600 text-white shadow-rose-500/40 animate-pulse ring-8 ring-rose-200 dark:ring-rose-950/60'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30 ring-4 ring-indigo-100 dark:ring-indigo-950/40'
          }`}
        >
          {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </button>

        {isRecording && (
          <div className="flex flex-col items-center space-y-2">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              Recording viva answer... ({formatSeconds(recordingSeconds)})
            </span>
            {/* Visualizer bars */}
            <div className="flex items-center space-x-1 h-8">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-indigo-600 to-rose-500 rounded-full voice-bar"
                  style={{ animationDuration: `${0.8 + (i % 3) * 0.3}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {!isRecording && (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Click the microphone and speak your answer clearly.
          </p>
        )}
      </div>

      {/* Real-time transcribed text display & editable area */}
      <div>
        <label className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
          <span>Transcribed Viva Response (Editable):</span>
          {transcript && (
            <button
              type="button"
              onClick={() => {
                setTranscript('');
                onTranscriptChange('');
              }}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </label>
        <textarea
          rows={3}
          value={transcript}
          disabled={disabled}
          onChange={(e) => {
            setTranscript(e.target.value);
            onTranscriptChange(e.target.value);
          }}
          placeholder="Your speech transcript will automatically appear here. You can also refine or type directly..."
          className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition resize-none"
        />
      </div>
    </div>
  );
}
