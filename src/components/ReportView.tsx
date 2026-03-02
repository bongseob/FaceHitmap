"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, CheckCircle2, Sparkles, Beaker, Activity, BrainCircuit } from 'lucide-react';
import { REGION_COLORS, FACE_REGIONS, DEFAULT_LANDMARKS, SensorData } from '../utils/constants';
import { getAdvancedRecommendations } from '../utils/recommendations';
import { getAIRecommendation } from '../services/GeminiService';
import { UserProfile } from './SurveyModal';

interface ReportViewProps {
    landmarks: any;
    hydrationData: Record<string, SensorData>;
    faceType: string | null;
    userProfile?: UserProfile | null;
    onReset: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({ landmarks, hydrationData, faceType, userProfile, onReset }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [aiReason, setAiReason] = useState<string>("AI 분석 중...");

    const hydrationValues = Object.values(hydrationData);
    const averageHydration = hydrationValues.length > 0
        ? Math.round(hydrationValues.reduce((acc, curr) => acc + curr.moisture, 0) / hydrationValues.length)
        : 0;

    const averageSebum = hydrationValues.length > 0
        ? Math.round(hydrationValues.reduce((acc, curr) => acc + curr.sebum, 0) / hydrationValues.length)
        : 0;

    const advancedRecs = getAdvancedRecommendations(hydrationData, userProfile);

    useEffect(() => {
        const fetchAI = async () => {
            const reason = await getAIRecommendation(hydrationData, faceType, userProfile);
            setAiReason(reason);
        };
        fetchAI();
    }, [hydrationData, faceType, userProfile]);

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

        const drawOverlaysAndHeatmap = () => {
            // 2. Draw Thermal Heatmap (Smooth continuous gradients)
            // We draw multiple overlapping radial gradients
            Object.entries(drawingLandmarks).forEach(([region, point]: [string, any]) => {
                const x = point.x * width;
                const y = point.y * height;
                // 배경 히트맵 컬러는 직관적인 '수분' 베이스로 그립니다
                const value = hydrationData[region]?.moisture || (landmarks ? 0 : 50);

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

            // Restore from clipping to draw UI overlays perfectly
            ctx.restore();

            // 3. Draw UI Overlay (Labels and Lines)
            ctx.globalCompositeOperation = 'source-over';

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
        };

        // 1. Create Clipping Mask for the Template
        ctx.save();
        ctx.beginPath();

        const centerX = width / 2;
        const centerY = height * 0.50;

        // Determine ellipse size based on faceType
        let radiusX = width * 0.35;
        let radiusY = height * 0.40;

        if (faceType === 'Round / Square') {
            radiusX = width * 0.38;
            radiusY = height * 0.38;
        } else if (faceType === 'Long / Oval') {
            radiusX = width * 0.30;
            radiusY = height * 0.43;
        }

        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.clip(); // Limit all subsequent drawings to this path!

        // Draw Base Outline Graphic Background inside map
        ctx.globalCompositeOperation = 'source-over';

        // Dark Base Color for the Face Form
        ctx.fillStyle = '#1e293b';
        ctx.fill();

        // Add some technical wireframe / outline accents
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;

        // Vertical Center Line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radiusY);
        ctx.lineTo(centerX, centerY + radiusY);
        ctx.stroke();

        // Horizontal Grid Lines
        for (let i = 1; i <= 5; i++) {
            const yOffset = centerY - radiusY + (radiusY * 2 * (i / 6));
            ctx.beginPath();
            ctx.moveTo(centerX - radiusX, yOffset);
            ctx.lineTo(centerX + radiusX, yOffset);
            ctx.stroke();
        }

        // Draw Heatmap and Overlays (which will naturally be masked inside the face)
        drawOverlaysAndHeatmap();

    }, [landmarks, hydrationData, faceType]);

    return (
        <div className="fixed inset-0 bg-[#0b121ecf] backdrop-blur-md z-50 flex items-center justify-center p-0 md:p-4 overflow-hidden print:static print:inset-auto print:bg-[#0b121e] print:p-0 print:overflow-visible print:block">
            <div className="max-w-[1000px] max-h-[95vh] w-full bg-[#162031] rounded-[2rem] border border-[#2d3a4f] shadow-2xl flex flex-col md:flex-row overflow-hidden scale-in-95 animate-in fade-in duration-300 print:!max-w-full print:!max-h-none print:!w-full print:!rounded-none print:!border-none print:!shadow-none print:flex-col print:overflow-visible print:!h-auto print:scale-100 print:!p-0 print:!m-0">

                {/* Left Column */}
                <div className="md:w-[42%] bg-[#0f172a] p-6 lg:p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-[#2d3a4f] overflow-y-auto overflow-x-hidden custom-scrollbar transform-gpu will-change-scroll overscroll-contain print:!w-full print:!h-auto print:overflow-visible print:!border-none print:p-4">
                    <div className="w-full flex items-center gap-2 text-[#22d3ee] text-[9px] font-bold uppercase tracking-widest mb-6 border-b border-white/5 pb-4">
                        <CheckCircle2 size={12} />
                        ANALYSIS COMPLETE
                    </div>

                    <div className="w-full shrink-0 relative bg-black rounded-[1.5rem] border border-[#2d3a4f] mb-6 flex items-center justify-center overflow-hidden shadow-inner group py-4">
                        <canvas
                            ref={canvasRef}
                            width={320}
                            height={360}
                            className="w-auto h-auto max-w-full max-h-[360px] object-contain"
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
                        <h3 className="text-[#64748b] text-[9px] font-bold uppercase tracking-[0.2em] mb-1">ANALYSIS & PROFILE</h3>
                        <p className="text-xl font-black text-white print:text-gray-900 tracking-tight leading-none mb-1">{faceType || 'Oval Template'}</p>
                        <p className="text-sm font-bold text-cyan-400 mb-3">{advancedRecs.primaryType}</p>

                        {userProfile && (
                            <div className="flex flex-wrap justify-center gap-1 mt-2 mb-2">
                                <span className="px-2 py-0.5 bg-cyan-900/30 border border-cyan-800/50 text-cyan-300 text-[10px] rounded-full">
                                    {userProfile.age}
                                </span>
                                <span className="px-2 py-0.5 bg-purple-900/30 border border-purple-800/50 text-purple-300 text-[10px] rounded-full">
                                    {userProfile.race}
                                </span>
                                <span className="px-2 py-0.5 bg-yellow-900/30 border border-yellow-800/50 text-yellow-300 text-[10px] rounded-full">
                                    {userProfile.climate}
                                </span>
                            </div>
                        )}

                        {advancedRecs.secondaryConditions.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-1">
                                {advancedRecs.secondaryConditions.map((cond, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-red-900/30 border border-red-800/50 text-red-300 text-[10px] rounded-full font-medium">
                                        {cond}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-full space-y-4 mb-6">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles size={12} className="text-[#fbbf24]" />
                            <h4 className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-widest">추천 제형 및 활성 성분</h4>
                        </div>

                        <div className="space-y-3">
                            {/* Base Texture */}
                            <div className="bg-[#1e293b]/40 p-3 rounded-xl border border-[#2d3a4f] border-l-4 border-l-cyan-500">
                                <div className="text-[9px] font-bold text-cyan-400 mb-1 uppercase tracking-wider">Base Texture</div>
                                {advancedRecs.baseTexture.map((ing, idx) => (
                                    <div key={idx} className="flex flex-col mt-1">
                                        <div className="text-[12px] font-bold text-white print:text-gray-900 leading-none">{ing.name}</div>
                                        <div className="text-[10px] text-[#64748b] mt-0.5">{ing.description}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Active Ingredients */}
                            <div className="grid grid-cols-1 gap-2">
                                {advancedRecs.activeIngredients.map((ing, idx) => (
                                    <div key={idx} className="bg-[#1e293b]/40 p-2.5 rounded-xl border border-[#2d3a4f] flex items-center gap-3">
                                        <div className="p-1.5 bg-[#0f172a] rounded-lg text-purple-400 shrink-0">
                                            <Beaker size={14} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[11px] font-bold text-white print:text-gray-900 mb-0.5 leading-none flex justify-between">
                                                <span>{ing.name}</span>
                                                <span className="text-[9px] text-purple-400 bg-purple-900/30 px-1.5 rounded">{ing.benefit}</span>
                                            </div>
                                            <div className="text-[9px] text-[#64748b] leading-tight">{ing.description.substring(0, 40)}...</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                <div className="md:w-[58%] p-6 lg:p-10 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar transform-gpu will-change-scroll overscroll-contain print:!w-full print:!h-auto print:overflow-visible print:p-4 print:mt-4">
                    <div className="mb-6 lg:mb-8">
                        <h2 className="text-3xl font-black mb-1.5 tracking-tighter text-white print:text-gray-900">스킨케어 분석 보고서</h2>
                        <p className="text-[#64748b] text-sm font-medium">부위별 정밀 수분 분포 결과입니다.</p>
                    </div>

                    <div className="space-y-6 flex-grow">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Average Moisture Card */}
                            <div className="bg-[#1e293b]/40 p-5 rounded-[1.5rem] border border-[#2d3a4f] relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] rotate-12 pointer-events-none">
                                    <Activity size={80} />
                                </div>
                                <div className="flex flex-col mb-4 relative z-10">
                                    <span className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-[0.15em] mb-2">전체 평균 수분도</span>
                                    <span className="text-4xl font-black text-[#22d3ee] tracking-tighter leading-none">{averageHydration}%</span>
                                </div>
                                <div className="w-full bg-[#0b121e] h-2 rounded-full overflow-hidden border border-white/[0.02]">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#2563eb] via-[#22d3ee] to-[#34d399] transition-all duration-1000 ease-out"
                                        style={{ width: `${averageHydration}%` }}
                                    />
                                </div>
                            </div>

                            {/* Average Sebum Card */}
                            <div className="bg-[#1e293b]/40 p-5 rounded-[1.5rem] border border-[#2d3a4f] relative overflow-hidden">
                                <div className="absolute top-0 left-0 p-4 opacity-[0.03] -rotate-12 pointer-events-none">
                                    <Activity size={80} />
                                </div>
                                <div className="flex flex-col mb-4 relative z-10">
                                    <span className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-[0.15em] mb-2 text-right">전체 평균 유분도</span>
                                    <span className="text-4xl font-black text-[#fbbf24] tracking-tighter leading-none text-right">{averageSebum}%</span>
                                </div>
                                <div className="w-full bg-[#0b121e] h-2 rounded-full overflow-hidden border border-white/[0.02]">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#b45309] via-[#f59e0b] to-[#fcd34d] transition-all duration-1000 ease-out ml-auto"
                                        style={{ width: `${averageSebum}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <p className="text-[11px] text-[#64748b] leading-relaxed w-full bg-[#1e293b]/20 p-4 rounded-xl border border-[#2d3a4f]/50">
                            분석 결과, 현재 수분도는 <span className="text-[#22d3ee] font-bold">{averageHydration}%</span>로 {averageHydration < 40 ? '관리가 시급하며' : '양호하며'}, 유분은 <span className="text-[#fbbf24] font-bold">{averageSebum}%</span>로 측정되어
                            복합적인 {averageSebum > 60 && averageHydration < 40 ? '수분 부족 지성(수부지)' : averageSebum > 60 ? '지성 피부' : averageHydration < 40 ? '건성 피부' : '균형 잡힌 피부'} 타입으로 분석됩니다.
                        </p>

                        <div className="grid grid-cols-2 gap-3 lg:gap-4">
                            {[
                                { label: 'FOREHEAD', id: FACE_REGIONS.FOREHEAD },
                                { label: 'LEFT CHEEK', id: FACE_REGIONS.LEFT_CHEEK },
                                { label: 'RIGHT CHEEK', id: FACE_REGIONS.RIGHT_CHEEK },
                                { label: 'CHIN', id: FACE_REGIONS.CHIN },
                                { label: 'NOSE', id: FACE_REGIONS.NOSE },
                                { label: 'T ZONE', id: FACE_REGIONS.T_ZONE }
                            ].map((region) => {
                                const data = hydrationData[region.id] || { moisture: 0, sebum: 0 };
                                return (
                                    <div key={region.id} className="bg-[#1e293b]/30 p-5 rounded-xl border border-[#2d3a4f] transition-all group flex flex-col justify-between">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[9px] text-[#475569] font-black uppercase tracking-widest">{region.label}</span>
                                        </div>
                                        <div className="flex justify-between items-end w-full">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-[#22d3ee]/60 font-bold mb-1">수분</span>
                                                <div className="text-lg font-mono font-black text-white print:text-gray-900 leading-none">{data.moisture}%</div>
                                            </div>
                                            <div className="h-6 w-px bg-[#2d3a4f]" /> {/* Divider */}
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-[#fbbf24]/60 font-bold mb-1">유분</span>
                                                <div className="text-lg font-mono font-black text-white print:text-gray-900 leading-none">{data.sebum}%</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-10 flex flex-col sm:flex-row gap-3 print:hidden">
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
        
        @media print {
            body {
                background-color: #0b121e !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            @page {
                size: A4 portrait;
                margin: 0.5cm;
            }
        }
      `}</style>
        </div>
    );
};

export default ReportView;
