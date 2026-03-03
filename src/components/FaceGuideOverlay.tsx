"use client";

import React from 'react';
import { Camera } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

interface FaceGuideOverlayProps {
    isFaceDetected: boolean;
    onCapture: () => void;
}

export default function FaceGuideOverlay({ isFaceDetected, onCapture }: FaceGuideOverlayProps) {
    const { t } = useI18n();

    return (
        <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Dark mask with transparent ellipse cutout */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <mask id="guideMask">
                        <rect x="0" y="0" width="100" height="100" fill="white" />
                        <ellipse cx="50" cy="46" rx="28" ry="40" fill="black" />
                    </mask>
                </defs>
                <rect x="0" y="0" width="100" height="100" fill="rgba(0,0,0,0.6)" mask="url(#guideMask)" />
            </svg>

            {/* Ellipse guide border */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <ellipse
                    cx="50"
                    cy="46"
                    rx="28"
                    ry="40"
                    fill="none"
                    stroke={isFaceDetected ? '#22c55e' : '#f87171'}
                    strokeWidth="0.4"
                    strokeDasharray={isFaceDetected ? 'none' : '2 1'}
                    className="transition-all duration-300"
                />
                {/* Corner markers */}
                {[
                    { x: 22, y: 6 },
                    { x: 78, y: 6 },
                    { x: 22, y: 86 },
                    { x: 78, y: 86 },
                ].map((pos, i) => (
                    <circle
                        key={i}
                        cx={pos.x}
                        cy={pos.y}
                        r="0.8"
                        fill={isFaceDetected ? '#22c55e' : '#f87171'}
                        className="transition-all duration-300"
                    />
                ))}
            </svg>

            {/* Status text */}
            <div className="absolute top-6 left-0 right-0 flex justify-center">
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-2 transition-all duration-300 ${isFaceDetected
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${isFaceDetected ? 'bg-green-400' : 'bg-red-400'}`} />
                    {isFaceDetected ? t.dashboard.readyToCapture : t.dashboard.alignFace}
                </div>
            </div>

            {/* Capture button */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-auto">
                <button
                    onClick={onCapture}
                    disabled={!isFaceDetected}
                    className={`flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 shadow-2xl ${isFaceDetected
                        ? 'bg-white hover:bg-gray-100 scale-100 active:scale-90'
                        : 'bg-white/20 opacity-40 cursor-not-allowed scale-90'
                        }`}
                >
                    <div className={`w-[52px] h-[52px] rounded-full border-[3px] flex items-center justify-center transition-all ${isFaceDetected
                        ? 'border-slate-900 bg-white'
                        : 'border-white/30 bg-transparent'
                        }`}>
                        <Camera size={20} className={isFaceDetected ? 'text-slate-900' : 'text-white/40'} />
                    </div>
                </button>
            </div>
        </div>
    );
}
