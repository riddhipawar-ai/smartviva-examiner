'use client';

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
  Volume2, VolumeX, Play, Pause, ChevronLeft, ChevronRight,
  RotateCcw, Sparkles, AlertTriangle, ShieldCheck, Zap
} from 'lucide-react';

export default function AVLStoryPage() {
  const [currentScene, setCurrentScene] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound Engine using Web Audio API
  const playSfx = (type: string) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      if (type === 'POP') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'BOING') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(320, now + 0.12);
        osc.frequency.linearRampToValueAtTime(240, now + 0.22);
        osc.frequency.linearRampToValueAtTime(300, now + 0.32);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'BEEP') {
        [0, 0.14].forEach((d) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(750, now + d);
          gain.gain.setValueAtTime(0.2, now + d);
          gain.gain.exponentialRampToValueAtTime(0.001, now + d + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + d);
          osc.stop(now + d + 0.08);
        });
      } else if (type === 'ALERT') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.exponentialRampToValueAtTime(380, now + 0.25);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'WHOOSH') {
        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(1400, now + 0.2);
        filter.frequency.exponentialRampToValueAtTime(250, now + 0.4);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.4);
      } else if (type === 'CHIME' || type === 'SUCCESS') {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.28, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.65);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.65);
        });
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  };

  useEffect(() => {
    const sfxMap: Record<number, string> = {
      1: 'CHIME', 2: 'POP', 3: 'BOING', 4: 'ALERT', 5: 'BEEP',
      6: 'WHOOSH', 7: 'POP', 8: 'ALERT', 9: 'WHOOSH', 10: 'SUCCESS'
    };
    playSfx(sfxMap[currentScene] || 'POP');
  }, [currentScene, soundEnabled]);

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoPlay) {
      timer = setInterval(() => {
        setCurrentScene((prev) => (prev >= 10 ? 1 : prev + 1));
      }, 4500);
    }
    return () => clearInterval(timer);
  }, [isAutoPlay]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Top Header Card */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-2xl shadow-lg shadow-sky-500/20">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                  AVL Tree Animated Story
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-sky-400 border border-blue-500/30">
                  Pixar 3D Mode
                </span>
              </div>
              <p className="text-xs text-slate-400">10-Page Smooth Educational Motion Graphic Storybook</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-300 border border-slate-700 transition"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
              <span>{soundEnabled ? 'SFX: ON' : 'SFX: OFF'}</span>
            </button>

            <button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-md ${
                isAutoPlay ? 'bg-amber-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
              }`}
            >
              {isAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isAutoPlay ? 'Pause Auto' : 'Auto Play'}</span>
            </button>
          </div>
        </div>

        {/* Embedded Dynamic Interactive Story Container */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-2">
          <iframe
            src="/avl_tree_story.html"
            className="w-full h-[620px] rounded-2xl border-0"
            title="AVL Tree Story Animation"
          />
        </div>

        {/* Summary Card and Rotations Cheat Sheet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Key Educational Takeaways
            </h3>
            <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <li>• <b>Balance Factor (BF)</b> = Height(Left Subtree) - Height(Right Subtree).</li>
              <li>• Permitted Balance Factors in AVL: <b>-1, 0, +1</b>.</li>
              <li>• If BF reaches <b>±2</b>, an automatic self-healing rotation is triggered!</li>
              <li>• Search time complexity stays strictly <b>O(log n)</b> instead of O(n) skewed BST.</li>
            </ul>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-sky-400" /> AVL 4 Rotation Master Rules
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-black text-amber-400">RR Imbalance</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Left Rotation (Single)</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-black text-emerald-400">LL Imbalance</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Right Rotation (Single)</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-black text-blue-400">LR Imbalance</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Left then Right Rotation</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-black text-purple-400">RL Imbalance</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Right then Left Rotation</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
