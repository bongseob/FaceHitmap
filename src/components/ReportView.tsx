"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, CheckCircle2, Sparkles, Beaker, Activity, BrainCircuit } from 'lucide-react';
import { REGION_COLORS, FACE_REGIONS, DEFAULT_LANDMARKS } from '../utils/constants';
import { getRecommendedIngredients } from '../utils/recommendations';
import { getAIRecommendation } from '../services/GeminiService';

interface ReportViewProps {
    landmarks: any;
    hydrationData: Record<string, number>;
    faceType: string | null;
    onReset: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({ landmarks, hydrationData, faceType, onReset }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [aiReason, setAiReason] = useState<string>("AI 분석 중...");

    const hydrationValues = Object.values(hydrationData);
    const averageHydration = hydrationValues.length > 0
        ? Math.round(hydrationValues.reduce((a, b) => a + b, 0) / hydrationValues.length)
        : 0;

    const recommendedIngredients = getRecommendedIngredients(hydrationData);

    useEffect(() => {
        const fetchAI = async () => {
            const reason = await getAIRecommendation(hydrationData, faceType);
            setAiReason(reason);
        };
        fetchAI();
    }, [hydrationData, faceType]);

    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Use landmarks if available, otherwise fallback to template
        const drawingLandmarks = landmarks || DEFAULT_LANDMARKS;

        const width = canvasRef.current.width;
        const height = canvasRef.current.height;
        ctx.clearRect(0, 0, width, height);

        // Thermal Color Map function: Blue (0) -> Green (50) -> Red (100)
        const getThermalColor = (value: number, alpha: number = 1) => {
            const v = Math.max(0, Math.min(100, value));
            let r, g, b;

            if (v < 25) { // Blue to Cyan
                r = 0; g = v * 4 * 2.55; b = 255;
            } else if (v < 50) { // Cyan to Green
                r = 0; g = 255; b = (50 - v) * 4 * 2.55;
            } else if (v < 75) { // Green to Yellow
                r = (v - 50) * 4 * 2.55; g = 255; b = 0;
            } else { // Yellow to Red
                r = 255; g = (100 - v) * 4 * 2.55; b = 0;
            }
            return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
        };

        // 1. Draw Background Mask (Silhouette)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(width / 2, height * 0.48, width * 0.35, height * 0.42, 0, 0, 2 * Math.PI);
        ctx.fill();

        // 2. Draw Thermal Heatmap (Smooth continuous gradients)
        // We draw multiple overlapping radial gradients
        Object.entries(drawingLandmarks).forEach(([region, point]: [string, any]) => {
            const x = point.x * width;
            const y = point.y * height;
            const value = hydrationData[region] || (landmarks ? 0 : 50); // Use 50 as dummy for template if no real data

            const radius = 100; // Larger radius for more overlap
            const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
            grad.addColorStop(0, getThermalColor(value, 0.6));
            grad.addColorStop(0.6, getThermalColor(value, 0.2));
            grad.addColorStop(1, getThermalColor(value, 0));

            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
        });

        // 3. Draw UI Overlay (Labels and Lines)
        ctx.globalCompositeOperation = 'source-over';

        // Subtle Face Outline
        ctx.strokeStyle = '#ffffff15';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(width / 2, height * 0.48, width * 0.35, height * 0.42, 0, 0, 2 * Math.PI);
        ctx.stroke();

        // Points
        Object.entries(drawingLandmarks).forEach(([region, point]: [string, any]) => {
            const x = point.x * width;
            const y = point.y * height;

            // Small crosshair
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y);
            ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5);
            ctx.stroke();

            // Simple circle
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, 2 * Math.PI);
            ctx.fillStyle = 'cyan';
            ctx.fill();
        });

        // 4. Color Scale Bar
        const scaleX = width - 25;
        const scaleY = height * 0.2;
        const scaleWidth = 8;
        const scaleHeight = height * 0.6;

        const scaleGradient = ctx.createLinearGradient(0, scaleY + scaleHeight, 0, scaleY);
        scaleGradient.addColorStop(0, getThermalColor(0));
        scaleGradient.addColorStop(0.25, getThermalColor(25));
        scaleGradient.addColorStop(0.5, getThermalColor(50));
        scaleGradient.addColorStop(0.75, getThermalColor(75));
        scaleGradient.addColorStop(1, getThermalColor(100));

        ctx.fillStyle = scaleGradient;
        ctx.fillRect(scaleX, scaleY, scaleWidth, scaleHeight);

        ctx.fillStyle = '#64748b';
        ctx.font = '8px Monospace';
        ctx.textAlign = 'right';
        ctx.fillText('100%', scaleX - 5, scaleY + 5);
        ctx.fillText('0%', scaleX - 5, scaleY + scaleHeight);

    }, [landmarks, hydrationData]);

    return (
        <div className="fixed inset-0 bg-[#0b121ecf] backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-4 overflow-hidden">
            <div className="max-w-[1000px] max-h-[95vh] w-full bg-[#162031] rounded-[2rem] border border-[#2d3a4f] shadow-2xl flex flex-col md:flex-row overflow-hidden scale-in-95 animate-in fade-in duration-300">

                {/* Left Column */}
                <div className="md:w-[42%] bg-[#0f172a] p-6 lg:p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-[#2d3a4f] overflow-y-auto custom-scrollbar">
                    <div className="w-full flex items-center gap-2 text-[#22d3ee] text-[9px] font-bold uppercase tracking-widest mb-6 border-b border-white/5 pb-4">
                        <CheckCircle2 size={12} />
                        ANALYSIS COMPLETE
                    </div>

                    <div className="w-full relative bg-black rounded-[1.5rem] border border-[#2d3a4f] mb-6 flex items-center justify-center overflow-hidden shadow-inner group">
                        <canvas
                            ref={canvasRef}
                            width={320}
                            height={360}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 right-10 text-[8px] text-white/50 font-mono text-right pointer-events-none">
                            THERMAL_ID: SC-029<br />
                            SCAN_COMPLETED
                        </div>
                        {!landmarks && (
                            <div className="absolute inset-0 flex items-end justify-center pb-4">
                                <span className="text-[8px] text-white/20 uppercase tracking-widest">Template Visualization Mode</span>
                            </div>
                        )}
                    </div>

                    <div className="text-center mb-6">
                        <h3 className="text-[#64748b] text-[9px] font-bold uppercase tracking-[0.2em] mb-1">DETECTED FACE TYPE</h3>
                        <p className="text-xl font-black text-white tracking-tight leading-none">{faceType || 'Oval Template'}</p>
                    </div>

                    <div className="w-full space-y-4 mb-6">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles size={12} className="text-[#fbbf24]" />
                            <h4 className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-widest">추천 성분 리스트</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                            {recommendedIngredients.map((ing, idx) => (
                                <div key={idx} className="bg-[#1e293b]/40 p-3 rounded-xl border border-[#2d3a4f] flex items-start gap-3">
                                    <div className="p-2 bg-[#0f172a] rounded-lg text-[#22d3ee] shrink-0">
                                        <Beaker size={14} />
                                    </div>
                                    <div>
                                        <div className="text-[12px] font-bold text-white mb-0.5 leading-none">{ing.name}</div>
                                        <div className="text-[9px] text-[#64748b] leading-tight">{ing.description.substring(0, 45)}...</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="w-full mt-auto pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <BrainCircuit size={14} className="text-[#a78bfa]" />
                            <h4 className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-widest">AI 추천 사유</h4>
                        </div>
                        <div className="bg-gradient-to-br from-[#1e1b4b]/50 to-[#1e293b]/30 p-4 rounded-xl border border-[#312e81]/30 shadow-inner">
                            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                                {aiReason}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="md:w-[58%] p-6 lg:p-10 flex flex-col overflow-y-auto custom-scrollbar">
                    <div className="mb-6 lg:mb-8">
                        <h2 className="text-3xl font-black mb-1.5 tracking-tighter text-white">스킨케어 분석 보고서</h2>
                        <p className="text-[#64748b] text-sm font-medium">부위별 정밀 수분 분포 결과입니다.</p>
                    </div>

                    <div className="space-y-6 flex-grow">
                        <div className="bg-[#1e293b]/40 p-6 lg:p-8 rounded-[1.5rem] border border-[#2d3a4f] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] rotate-12 pointer-events-none">
                                <Activity size={100} />
                            </div>
                            <div className="flex justify-between items-end mb-4 relative z-10">
                                <span className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-[0.15em]">전체 평균 수분도</span>
                                <span className="text-5xl font-black text-[#22d3ee] tracking-tighter leading-none">{averageHydration}%</span>
                            </div>
                            <div className="w-full bg-[#0b121e] h-2 rounded-full overflow-hidden border border-white/[0.02]">
                                <div
                                    className="h-full bg-gradient-to-r from-[#2563eb] via-[#22d3ee] to-[#34d399] transition-all duration-1000 ease-out"
                                    style={{ width: `${averageHydration}%` }}
                                />
                            </div>
                            <p className="mt-4 text-[11px] text-[#64748b] leading-relaxed max-w-[90%]">
                                분석 결과, 현재 수분도는 <span className="text-[#22d3ee] font-bold">{averageHydration}%</span>로 {averageHydration < 40 ? '수분 관리가 시급한' : '양호한'} 상태입니다.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 lg:gap-4">
                            {[
                                { label: 'FOREHEAD', id: FACE_REGIONS.FOREHEAD },
                                { label: 'LEFT CHEEK', id: FACE_REGIONS.LEFT_CHEEK },
                                { label: 'RIGHT CHEEK', id: FACE_REGIONS.RIGHT_CHEEK },
                                { label: 'CHIN', id: FACE_REGIONS.CHIN },
                                { label: 'NOSE', id: FACE_REGIONS.NOSE },
                                { label: 'T ZONE', id: FACE_REGIONS.T_ZONE }
                            ].map((region) => {
                                const value = hydrationData[region.id] || 0;
                                return (
                                    <div key={region.id} className="bg-[#1e293b]/30 p-5 rounded-xl border border-[#2d3a4f] transition-all group">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] text-[#475569] font-black uppercase tracking-widest">{region.label}</span>
                                            <div className={`w-1.5 h-1.5 rounded-full ${value > 50 ? 'bg-[#22d3ee] shadow-[0_0_8px_#22d3ee]' : 'bg-[#f87171] shadow-[0_0_8px_#f87171]'}`} />
                                        </div>
                                        <div className="text-xl lg:text-2xl font-mono font-black text-white">{value}%</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-10 flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => window.print()}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white text-[#0f172a] text-sm font-black rounded-xl hover:bg-[#e2e8f0] active:scale-[0.98] transition-all"
                        >
                            <Download size={16} />
                            리포트 저장 (PDF)
                        </button>
                        <button
                            onClick={onReset}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#1e293b]/60 text-white text-sm font-bold rounded-xl hover:bg-[#1e293b] active:scale-[0.98] transition-all border border-[#2d3a4f]"
                        >
                            <RefreshCw size={16} />
                            다시 측정하기
                        </button>
                    </div>
                </div>
            </div>
            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2d3a4f; border-radius: 10px; }
      `}</style>
        </div>
    );
};

export default ReportView;
