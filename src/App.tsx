/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Mic, MicOff, Send, Copy, Check, RotateCcw, Mail, Loader2, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types for Speech Recognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export default function App() {
  const [roughNote, setRoughNote] = useState('');
  const [result, setResult] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const recognitionRef = useRef<any>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  useEffect(() => {
    const SpeechRecognition = (window as unknown as WindowWithSpeech).SpeechRecognition || (window as unknown as WindowWithSpeech).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setRoughNote(prev => {
          // If we had a previous value, we might want to append if it's new
          // But SpeechRecognition results are accumulated in continuous mode
          // For simplicity in this UI, we'll just track the latest result carefully
          // This is a basic implementation of 'talk while typing'
          return transcript;
        });
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleTransform = async () => {
    if (!roughNote.trim()) return;

    setIsLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "You are Robbie, an expert corporate communications specialist and executive assistant. Your task is to transform rough, informal notes or transcripts into polished, professional emails. Follow these rules:\n1. Identify core message and intent.\n2. Elevate tone to be polite, clear, and professional.\n3. Remove filler words, slang, casual phrasing.\n4. Neutralize emotion if hurried/frustrated.\n5. Format exactly with Subject Line, Salutation, Body, and Sign-off.\n6. Do not invent info. Use [Name]/[Time] for missing context.\n\nOutput format:\nSubject: [Subject]\n\nHi [Name/Team],\n\n[Body]\n\nBest regards,\n\n[My Name]",
        },
        contents: `Please transform this rough note into a professional email: "${roughNote}"`,
      });

      setResult(response.text || 'I apologize, I could not transform that note. Could you try providing more context?');
    } catch (error) {
      console.error('Transformation error:', error);
      setResult('Error transforming note. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setRoughNote('');
    setResult('');
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg-gradient)] font-sans text-dark selection:bg-teal-100">
      <header className="flex h-[70px] items-center justify-between border-b border-black/5 bg-white px-10 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 text-xl font-extrabold text-primary-blue">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-blue to-accent-teal" />
          BWAI Prompt - Robbie
        </div>
        <div className="flex items-center gap-5">
          <span className="rounded-[20px] bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
            PRO ACCOUNT
          </span>
          <div className="h-9 w-9 rounded-full border-2 border-accent-teal bg-slate-200" />
        </div>
      </header>

      <main className="grid flex-1 grid-cols-2 gap-[30px] overflow-hidden p-[30px_40px]">
        {/* Input Pane */}
        <section className="flex flex-col rounded-2xl border border-black/5 bg-white shadow-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <span className="text-[0.75rem] font-bold uppercase tracking-wider text-muted font-sans">
              Live Transcription / Rough Note
            </span>
            <span className="text-xs text-muted">
              {isListening ? 'Voice Input Active' : 'Ready to draft'}
            </span>
          </div>
          <textarea
            id="rough-note-input"
            value={roughNote}
            onChange={(e) => setRoughNote(e.target.value)}
            placeholder="e.g., 'Hey Sarah can you send me that report by 3? Im super busy and need it fast lol thanks'"
            className="flex-1 resize-none bg-slate-50/50 p-6 text-[1rem] leading-relaxed text-slate-600 outline-none placeholder:text-slate-300"
          />
        </section>

        {/* Output Pane */}
        <section className="flex flex-col rounded-2xl border border-black/5 bg-white shadow-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <span className="text-[0.75rem] font-bold uppercase tracking-wider text-muted font-sans">
              Polished Draft
            </span>
            {result && (
              <div className="flex items-center gap-3">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-accent-teal transition-colors hover:bg-slate-100"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <span className="text-xs font-semibold text-accent-teal">Ready to Send</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-1 flex-col overflow-y-auto">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col"
                >
                  <div className="flex-1 p-8 font-serif text-[1.05rem] leading-[1.7] text-slate-900">
                    {result}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-full flex-col items-center justify-center gap-4 p-12 text-center"
                >
                  <div className="rounded-full bg-slate-50 p-6 text-slate-200">
                    <Mail size={48} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-slate-400">Waiting for your thoughts</h3>
                    <p className="max-w-xs text-sm text-slate-300">
                      Speak or type on the left to generate your professional email.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Control Bar */}
      <div className="flex h-[100px] items-center gap-4 border-t border-black/5 bg-white px-10">
        <button
          id="mic-button"
          onClick={toggleListening}
          className={`group flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-lg transition-all ${
            isListening 
            ? 'bg-red-500 text-white animate-pulse' 
            : 'bg-accent-teal text-white hover:opacity-90 shadow-accent-teal/30'
          }`}
          title={isListening ? 'Stop recording' : 'Start recording'}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <div className="flex flex-1 items-center gap-4 rounded-[50px] bg-slate-100 px-6 py-2 border-2 border-transparent transition-all hover:border-accent-teal/10">
          <span className="flex-1 text-[0.95rem] text-slate-400 truncate">
            {isListening ? 'Listening to voice note...' : 'Typing draft or waiting for transformation...'}
          </span>
          {isListening && (
            <div className="flex items-center gap-1.5 text-[13px] italic text-accent-teal font-medium">
              Robbie is listening
              <span className="flex gap-1">
                <span className="h-1 w-1 rounded-full bg-accent-teal animate-bounce" />
                <span className="h-1 w-1 rounded-full bg-accent-teal opacity-60 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1 w-1 rounded-full bg-accent-teal opacity-30 animate-bounce [animation-delay:-0.3s]" />
              </span>
            </div>
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-[13px] italic text-primary-blue font-medium">
              Robbie is thinking...
              <Loader2 size={14} className="animate-spin" />
            </div>
          )}
        </div>

        <button
          id="transform-button"
          onClick={handleTransform}
          disabled={!roughNote.trim() || isLoading}
          className="flex items-center gap-2 rounded-[50px] bg-primary-blue px-7 py-3 text-[0.95rem] font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Send size={18} />
          )}
          <span>Transform Email</span>
        </button>
        
        <button 
          onClick={reset}
          title="Reset"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
}
