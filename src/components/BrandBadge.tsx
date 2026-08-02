'use client';

import React from 'react';
import { ExternalLink, Sparkles, Zap } from 'lucide-react';

interface BrandBadgeProps {
  variant?: 'compact' | 'full' | 'floating';
  className?: string;
}

export default function BrandBadge({ variant = 'compact', className = '' }: BrandBadgeProps) {
  if (variant === 'floating') {
    return (
      <div className={`flex justify-center w-full my-4 ${className}`}>
        <a
          href="https://www.expandete.cloud/"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-violet-950/80 via-fuchsia-950/80 to-indigo-950/80 border border-fuchsia-500/40 backdrop-blur-xl shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.6)] hover:border-fuchsia-400 transition-all duration-300 transform hover:-translate-y-0.5"
        >
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-500 opacity-30 group-hover:opacity-100 blur transition duration-300 -z-10 animate-pulse"></div>
          
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-fuchsia-500 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-inner">
            <Zap className="w-3 h-3 text-white fill-white" />
          </div>
          
          <span className="text-[11px] font-medium text-gray-300">
            Elaborada por:{' '}
            <strong className="bg-gradient-to-r from-fuchsia-300 via-pink-200 to-cyan-300 bg-clip-text text-transparent font-bold tracking-wide group-hover:underline">
              Expandete Cloud
            </strong>
          </span>

          <ExternalLink className="w-3 h-3 text-fuchsia-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`glass p-4 rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/40 via-indigo-950/30 to-purple-950/40 relative overflow-hidden group shadow-xl ${className}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl group-hover:bg-fuchsia-500/20 transition-all"></div>
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-fuchsia-600/30 shrink-0">
              <Sparkles className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-fuchsia-400">Desarrollo High-Tech</p>
              <h4 className="text-xs font-bold text-white">Plataforma Creada por Expandete Cloud</h4>
            </div>
          </div>
          <a
            href="https://www.expandete.cloud/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-fuchsia-600/30 transition cursor-pointer shrink-0"
          >
            <span>Visitar Sitio</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  // Compact default
  return (
    <a
      href="https://www.expandete.cloud/"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-950/60 border border-fuchsia-500/30 hover:border-fuchsia-400/70 text-[10px] transition-all group ${className}`}
    >
      <span className="text-gray-400">Elaborada por:</span>
      <span className="font-bold bg-gradient-to-r from-fuchsia-300 to-indigo-300 bg-clip-text text-transparent group-hover:underline">
        Expandete Cloud
      </span>
      <ExternalLink className="w-2.5 h-2.5 text-fuchsia-400" />
    </a>
  );
}
