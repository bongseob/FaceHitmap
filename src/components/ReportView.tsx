"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, CheckCircle2, Sparkles, Beaker, Activity, BrainCircuit, Sun, Moon, Dna, Store, ShoppingCart } from 'lucide-react';
import { REGION_COLORS, FACE_REGIONS, DEFAULT_LANDMARKS, SensorData } from '../utils/constants';
import { getAdvancedRecommendations } from '../utils/recommendations';
import { getAIRecommendation, getSkincareRoutine, getSkinAge, SkincareRoutine, SkinAgeResult } from '../services/GeminiService';
import { getRecommendedProducts, getDriveDirectLink } from '../utils/affiliates';
import { UserProfile } from './SurveyModal';
import { useI18n } from '../i18n/I18nContext';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getOrCreateDeviceId } from '../utils/session';

interface ReportViewProps {
    landmarks: any;
    hydrationData: Record<string, SensorData>;
    faceType: string | null;
    userProfile?: UserProfile | null;
    onReset: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({ landmarks, hydrationData, faceType, userProfile, onReset }) => {
    const { t, locale } = useI18n();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [aiReason, setAiReason] = useState<string>("");
    const [heatmapMode, setHeatmapMode] = useState<'moisture' | 'sebum'>('moisture');
    const [skinAgeResult, setSkinAgeResult] = useState<SkinAgeResult | null>(null);
    const [routine, setRoutine] = useState<SkincareRoutine | null>(null);
    const [routineTab, setRoutineTab] = useState<'morning' | 'evening'>('morning');

    const hydrationValues = Object.values(hydrationData);
    const averageHydration = hydrationValues.length > 0
        ? Math.round(hydrationValues.reduce((acc, curr) => acc + curr.moisture, 0) / hydrationValues.length)
        : 0;

    const averageSebum = hydrationValues.length > 0
        ? Math.round(hydrationValues.reduce((acc, curr) => acc + curr.sebum, 0) / hydrationValues.length)
        : 0;

    const advancedRecs = getAdvancedRecommendations(hydrationData, userProfile, locale);

    const [isProductsReady, setIsProductsReady] = useState(false);

    useEffect(() => {
        // ... (AI fetch routines)
        setAiReason(t.report.aiAnalyzing);
        const fetchAI = async () => {
            const reason = await getAIRecommendation(hydrationData, faceType, userProfile, locale);
            setAiReason(reason);
        };
        fetchAI();

        const fetchSkinAge = async () => {
            const result = await getSkinAge(hydrationData, userProfile, locale);
            setSkinAgeResult(result);
        };
        fetchSkinAge();

        const fetchRoutine = async () => {
            const result = await getSkincareRoutine(hydrationData, faceType, userProfile, locale);
            setRoutine(result);
        };
        fetchRoutine();

        // Simple polling to check if products are loaded from Google Sheets
        const checkProducts = setInterval(() => {
            // we can just force a re-render to check getRecommendedProducts
            setIsProductsReady(prev => !prev);
        }, 1000);

        return () => clearInterval(checkProducts);
    }, [hydrationData, faceType, userProfile, locale]);

    // ---- Firebase Data Logging (Run ONLY once when component mounts) ----
    const hasLogged = useRef(false);
    useEffect(() => {
        if (hasLogged.current) return;
        if (!advancedRecs || !advancedRecs.primaryType) return; // Wait until local recs are computed

        const logMeasurementData = async () => {
            try {
                const deviceId = getOrCreateDeviceId();
                const payload = {
                    sessionId: deviceId,
                    timestamp: new Date().getTime(),
                    profile: userProfile || null,
                    rawSensorData: hydrationData,
                    analysisResult: {
                        primaryType: advancedRecs.primaryType,
                        secondaryConditions: advancedRecs.secondaryConditions,
                        baseTexture: advancedRecs.baseTexture.map(t => t.name),
                        activeIngredients: advancedRecs.activeIngredients.map(i => i.name)
                    },
                    metadata: {
                        appVersion: "0.1.0",
                        locale: locale
                    }
                };

                addDoc(collection(db, "measurements"), payload)
                    .then((docRef) => console.log("Measurement logged with ID: ", docRef.id))
                    .catch((e) => console.error("Error logging measurement: ", e));

                hasLogged.current = true;
            } catch (error) {
                console.error("Failed to build/send measurement payload:", error);
            }
        };

        logMeasurementData();
    }, [hydrationData, userProfile, locale, advancedRecs]);

    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Use landmarks if available, otherwise fallback to template
        const drawingLandmarks = landmarks || DEFAULT_LANDMARKS;

        const width = canvasRef.current.width;
        const height = canvasRef.current.height;
        ctx.clearRect(0, 0, width, height);

        // Moisture Color Map: Blue (0) -> Green (50) -> Red (100)
        const getMoistureColor = (value: number, alpha: number = 1) => {
            const v = Math.max(0, Math.min(100, value));
            let r, g, b;

            if (v < 25) { r = 0; g = v * 4 * 2.55; b = 255; }
            else if (v < 50) { r = 0; g = 255; b = (50 - v) * 4 * 2.55; }
            else if (v < 75) { r = (v - 50) * 4 * 2.55; g = 255; b = 0; }
            else { r = 255; g = (100 - v) * 4 * 2.55; b = 0; }
            return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
        };

        // Sebum Color Map: Light Yellow (0) -> Orange (50) -> Deep Red (100)
        const getSebumColor = (value: number, alpha: number = 1) => {
            const v = Math.max(0, Math.min(100, value));
            let r, g, b;

            if (v < 33) { r = 255; g = 240 - v * 2; b = 100 - v * 2; }
            else if (v < 66) { r = 255; g = 180 - (v - 33) * 3; b = 40 - (v - 33); }
            else { r = 255 - (v - 66) * 2; g = 80 - (v - 66) * 2; b = 10; }
            return `rgba(${Math.round(Math.max(0, r))}, ${Math.round(Math.max(0, g))}, ${Math.round(Math.max(0, b))}, ${alpha})`;
        };

        // Select color function and data field based on mode
        const getColor = heatmapMode === 'moisture' ? getMoistureColor : getSebumColor;
        const dataField = heatmapMode === 'moisture' ? 'moisture' : 'sebum';

        const drawOverlaysAndHeatmap = () => {
            // Calculate the bounding box of the normalized landmarks
            let minX = 1, maxX = 0, minY = 1, maxY = 0;
            Object.values(drawingLandmarks).forEach((pt: any) => {
                if (pt.x < minX) minX = pt.x;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.y > maxY) maxY = pt.y;
            });

            if (minX > maxX) { minX = 0; maxX = 1; minY = 0; maxY = 1; }

            const faceWidth = maxX - minX;
            const faceHeight = maxY - minY;
            const faceCenterX = minX + faceWidth / 2;
            const faceCenterY = minY + faceHeight / 2;

            const transformPoint = (pt: any, region: string) => {
                if (faceWidth === 0 || faceHeight === 0) return { x: pt.x * width, y: pt.y * height };
                const nx = (pt.x - faceCenterX) / faceWidth;
                const ny = (pt.y - faceCenterY) / faceHeight;

                let px = centerX - (nx * radiusX * 1.5);
                let py = centerY + (ny * radiusY * 1.4);

                // Force align points exactly to the crosshairs
                if (
                    region === FACE_REGIONS.FOREHEAD ||
                    region === FACE_REGIONS.CHIN ||
                    region === FACE_REGIONS.NOSE ||
                    region === FACE_REGIONS.T_ZONE
                ) {
                    px = centerX;
                }
                if (
                    region === FACE_REGIONS.LEFT_CHEEK ||
                    region === FACE_REGIONS.RIGHT_CHEEK
                ) {
                    py = centerY;
                }

                return { x: px, y: py };
            };

            // Draw Thermal Heatmap (Smooth continuous gradients)
            Object.entries(drawingLandmarks).forEach(([region, point]: [string, any]) => {
                const { x, y } = transformPoint(point, region);
                const value = hydrationData[region]?.[dataField] || (landmarks ? 0 : 50);

                const radius = Math.max(radiusX, radiusY) * 0.75; // Adjusted gradient size
                const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
                grad.addColorStop(0, getColor(value, 0.6));
                grad.addColorStop(0.6, getColor(value, 0.2));
                grad.addColorStop(1, getColor(value, 0));

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
                const { x, y } = transformPoint(point, region);

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
            scaleGradient.addColorStop(0, getColor(0));
            scaleGradient.addColorStop(0.25, getColor(25));
            scaleGradient.addColorStop(0.5, getColor(50));
            scaleGradient.addColorStop(0.75, getColor(75));
            scaleGradient.addColorStop(1, getColor(100));

            ctx.fillStyle = scaleGradient;
            ctx.fillRect(scaleX, scaleY, scaleWidth, scaleHeight);

            ctx.fillStyle = '#64748b';
            ctx.font = '10px Monospace';
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

    }, [landmarks, hydrationData, faceType, heatmapMode]);

    return (
        <div className="fixed inset-0 bg-[#0b121ecf] backdrop-blur-md z-50 overflow-y-auto print:static print:inset-auto print:bg-[#0b121e] print:p-0 print:overflow-visible print:block">
            <div className="flex min-h-full items-start md:items-center justify-center p-0 md:p-4 print:block print:p-0">
                <div className="max-w-[1000px] w-full bg-[#162031] md:col-span-1 border border-[#2d3a4f] shadow-2xl flex flex-col md:flex-row md:max-h-[95vh] md:rounded-[2rem] md:overflow-hidden scale-in-95 animate-in fade-in duration-300 print:!w-[21cm] print:!max-w-[21cm] print:!min-w-[21cm] print:!max-h-none print:!rounded-none print:!border-none print:!shadow-none print:flex-col print:overflow-visible print:!h-auto print:scale-100 print:!p-0 print:!m-0 mx-auto">

                    {/* Left Column */}
                    <div className="md:w-[42%] bg-[#0f172a] p-4 sm:p-6 lg:p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-[#2d3a4f] overflow-visible md:overflow-y-auto overflow-x-hidden custom-scrollbar md:transform-gpu md:will-change-scroll md:overscroll-contain print:!w-full print:!h-auto print:overflow-visible print:!border-none print:p-4">
                        <div className="w-full flex items-center gap-2 text-[#22d3ee] text-[11px] font-bold uppercase tracking-widest mb-6 border-b border-white/5 pb-4">
                            <CheckCircle2 size={12} />
                            {t.report.analysisComplete}
                        </div>

                        {/* Heatmap Mode Toggle Tabs */}
                        <div className="w-full flex gap-1.5 mb-3">
                            <button
                                onClick={() => setHeatmapMode('moisture')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-bold tracking-wide transition-all border ${heatmapMode === 'moisture'
                                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                                    : 'bg-slate-800/30 border-slate-700/50 text-slate-500 hover:text-slate-400 hover:bg-slate-800/50'
                                    }`}
                            >
                                💧 {t.report.moistureMap}
                            </button>
                            <button
                                onClick={() => setHeatmapMode('sebum')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-bold tracking-wide transition-all border ${heatmapMode === 'sebum'
                                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.15)]'
                                    : 'bg-slate-800/30 border-slate-700/50 text-slate-500 hover:text-slate-400 hover:bg-slate-800/50'
                                    }`}
                            >
                                💛 {t.report.sebumMap}
                            </button>
                        </div>

                        <div className="w-full shrink-0 relative bg-black rounded-[1.5rem] border border-[#2d3a4f] mb-6 flex items-center justify-center overflow-hidden shadow-inner group py-4">
                            <canvas
                                ref={canvasRef}
                                width={320}
                                height={360}
                                className="w-auto h-auto max-w-full max-h-[360px] object-contain"
                            />
                            <div className="absolute top-4 right-10 text-[10px] text-white/50 font-mono text-right pointer-events-none">
                                THERMAL_ID: SC-029<br />
                                SCAN_COMPLETED
                            </div>
                            {!landmarks && (
                                <div className="absolute inset-0 flex items-end justify-center pb-4">
                                    <span className="text-[10px] text-white/20 uppercase tracking-widest">Template Visualization Mode</span>
                                </div>
                            )}
                        </div>

                        <div className="text-center mb-6">
                            <h3 className="text-[#64748b] text-[11px] font-bold uppercase tracking-[0.2em] mb-1">{t.report.analysisProfile}</h3>
                            <p className="text-2xl font-black text-white print:text-gray-900 tracking-tight leading-none mb-1">{faceType || 'Oval Template'}</p>
                            <p className="text-base font-bold text-cyan-400 mb-3">{advancedRecs.primaryType}</p>

                            {userProfile && (
                                <div className="flex flex-wrap justify-center gap-1 mt-2 mb-2">
                                    <span className="px-2 py-0.5 bg-cyan-900/30 border border-cyan-800/50 text-cyan-300 text-[12px] rounded-full">
                                        {userProfile.age}
                                    </span>
                                    <span className="px-2 py-0.5 bg-purple-900/30 border border-purple-800/50 text-purple-300 text-[12px] rounded-full">
                                        {userProfile.race}
                                    </span>
                                    <span className="px-2 py-0.5 bg-yellow-900/30 border border-yellow-800/50 text-yellow-300 text-[12px] rounded-full">
                                        {userProfile.climate}
                                    </span>
                                </div>
                            )}

                            {advancedRecs.secondaryConditions.length > 0 && (
                                <div className="flex flex-wrap justify-center gap-1">
                                    {advancedRecs.secondaryConditions.map((cond, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-red-900/30 border border-red-800/50 text-red-300 text-[12px] rounded-full font-medium">
                                            {cond}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="w-full space-y-4 mb-6">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles size={12} className="text-[#fbbf24]" />
                                <h4 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest">{t.report.baseTexture} & {t.report.activeIngredients}</h4>
                            </div>

                            <div className="space-y-3">
                                {/* Base Texture */}
                                <div className="bg-[#1e293b]/40 p-3 rounded-xl border border-[#2d3a4f] border-l-4 border-l-cyan-500">
                                    <div className="text-[11px] font-bold text-cyan-400 mb-1 uppercase tracking-wider">{t.report.baseTexture}</div>
                                    {advancedRecs.baseTexture.map((ing, idx) => (
                                        <div key={idx} className="flex flex-col mt-1">
                                            <div className="text-[14px] font-bold text-white print:text-gray-900 leading-none">{ing.name}</div>
                                            <div className="text-[12px] text-[#64748b] mt-0.5">{ing.description}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Active Ingredients */}
                                <div className="grid grid-cols-1 gap-2">
                                    {advancedRecs.activeIngredients.map((ing, idx) => {
                                        const recommendedProducts = getRecommendedProducts(ing.name);

                                        return (
                                            <div key={idx} className="bg-[#1e293b]/40 p-2.5 rounded-xl border border-[#2d3a4f] flex flex-col gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-[#0f172a] rounded-lg text-purple-400 shrink-0">
                                                        <Beaker size={14} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-[13px] font-bold text-white print:text-gray-900 mb-0.5 leading-none flex justify-between">
                                                            <span>{ing.name}</span>
                                                            <span className="text-[11px] text-purple-400 bg-purple-900/30 px-1.5 rounded">{ing.benefit}</span>
                                                        </div>
                                                        <div className="text-[11px] text-[#64748b] leading-tight line-clamp-2">{ing.description}</div>
                                                    </div>
                                                </div>

                                                {/* Affiliate Links Section */}
                                                {recommendedProducts.length > 0 && (
                                                    <div className="mt-1 pt-3 border-t border-[#2d3a4f]/50 flex flex-col gap-2">
                                                        <div className="text-[12px] font-bold text-teal-400 mb-1 flex items-center gap-1.5 px-1">
                                                            <Store size={12} /> {t.affiliate.recommendedProducts}
                                                        </div>
                                                        {recommendedProducts.map(product => (
                                                            <div key={product.id} className="flex gap-3 items-center bg-[#0b121e]/80 p-2.5 rounded-lg border border-[#2d3a4f]/50 hover:border-teal-500/40 transition-all shadow-inner group relative overflow-hidden">
                                                                <div className="w-14 h-14 rounded-md bg-[#1e293b] overflow-hidden shrink-0 border border-slate-700/50 flex items-center justify-center relative">
                                                                    {product.mediaType === 'video' ? (
                                                                        <video src={getDriveDirectLink(product.mediaUrl)} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                                                                    ) : (
                                                                        <img src={getDriveDirectLink(product.mediaUrl)} alt={product.productName} className="w-full h-full object-cover" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                                                    <span className="text-[11px] text-[#94a3b8] tracking-wider uppercase">{product.brand}</span>
                                                                    <span className="text-[13px] font-bold text-white truncate leading-snug group-hover:text-teal-300 transition-colors">{product.productName}</span>
                                                                    <span className="text-[14px] font-black text-white mt-1">{product.price.toLocaleString()}₩</span>
                                                                </div>
                                                                <a
                                                                    href={product.buyUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="shrink-0 w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-teal-600 border border-slate-700 hover:border-teal-500 text-white rounded-lg transition-all shadow-sm"
                                                                    title={product.buyUrl.includes('coupang') ? t.affiliate.buyNowCoupang : product.buyUrl.includes('oliveyoung') ? t.affiliate.buyNowOliveYoung : t.affiliate.buyNowDefault}
                                                                >
                                                                    <ShoppingCart size={14} className="group-hover:scale-110 transition-transform" />
                                                                </a>
                                                            </div>
                                                        ))}
                                                        <div className="text-[10px] text-slate-500/80 text-right mt-1 px-1 italic">
                                                            * {t.affiliate.adNotice}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="w-full mt-auto pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2 mb-3">
                                <BrainCircuit size={14} className="text-[#a78bfa]" />
                                <h4 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest">{t.report.aiRecommendation}</h4>
                            </div>
                            <div className="bg-gradient-to-br from-[#1e1b4b]/50 to-[#1e293b]/30 p-4 rounded-xl border border-[#312e81]/30 shadow-inner">
                                <p className="text-[13px] text-[#94a3b8] leading-relaxed">
                                    {aiReason}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="md:w-[58%] p-4 sm:p-6 lg:p-10 flex flex-col overflow-visible md:overflow-y-auto overflow-x-hidden custom-scrollbar md:transform-gpu md:will-change-scroll md:overscroll-contain print:!w-full print:!h-auto print:overflow-visible print:p-4 print:mt-4">
                        <div className="mb-6 lg:mb-8">
                            <h2 className="text-3xl font-black mb-1.5 tracking-tighter text-white print:text-gray-900">{t.report.reportTitle}</h2>
                            <p className="text-[#64748b] text-sm font-medium">{t.report.reportSubtitle}</p>
                        </div>

                        <div className="space-y-6 flex-grow">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Average Moisture Card */}
                                <div className="bg-[#1e293b]/40 p-5 rounded-[1.5rem] border border-[#2d3a4f] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] rotate-12 pointer-events-none">
                                        <Activity size={80} />
                                    </div>
                                    <div className="flex flex-col mb-2 sm:mb-4 relative z-10">
                                        <span className="text-[#94a3b8] text-[10px] sm:text-[12px] font-bold uppercase tracking-[0.15em] mb-1 sm:mb-2">{t.report.avgMoisture}</span>
                                        <span className="text-2xl sm:text-4xl font-black text-[#22d3ee] tracking-tighter leading-none">{averageHydration}%</span>
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
                                        <span className="text-[#94a3b8] text-[12px] font-bold uppercase tracking-[0.15em] mb-2 text-right">{t.report.avgSebum}</span>
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

                            {/* Skin Age Gauge Card */}
                            <div className="bg-gradient-to-br from-[#1e1b4b]/40 to-[#1e293b]/30 p-5 rounded-[1.5rem] border border-[#312e81]/30 relative overflow-hidden">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 bg-purple-500/10 rounded-lg">
                                        <Dna size={16} className="text-purple-400" />
                                    </div>
                                    <h4 className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-[0.15em]">{t.report.skinAge}</h4>
                                </div>
                                {skinAgeResult ? (
                                    <>
                                        <div className="flex items-end justify-between mb-3">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] text-[#64748b] font-bold uppercase tracking-wider mb-1">{t.report.actualAge}</span>
                                                <span className="text-2xl font-black text-white/60">{skinAgeResult.actualAge}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[11px] text-[#64748b] font-bold uppercase tracking-wider mb-1">{t.report.estimatedSkinAge}</span>
                                                <span className={`text-3xl font-black ${skinAgeResult.difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {skinAgeResult.skinAge}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Gauge Bar */}
                                        <div className="relative w-full h-3 bg-[#0b121e] rounded-full overflow-hidden border border-white/[0.03] mb-3">
                                            <div className="absolute inset-0 flex">
                                                <div className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400 transition-all duration-1000" style={{ width: `${Math.max(5, Math.min(95, ((skinAgeResult.actualAge - skinAgeResult.skinAge + 15) / 30) * 100))}%` }} />
                                            </div>
                                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg shadow-white/20 border-2 border-purple-400 transition-all duration-1000" style={{ left: `${Math.max(2, Math.min(95, ((skinAgeResult.actualAge - skinAgeResult.skinAge + 15) / 30) * 100))}%` }} />
                                        </div>
                                        {skinAgeResult.difference !== 0 && (
                                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-bold mb-2 ${skinAgeResult.difference > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                                {skinAgeResult.difference > 0 ? '↓' : '↑'} {Math.abs(skinAgeResult.difference)}
                                            </div>
                                        )}
                                        <p className="text-[12px] text-[#94a3b8] leading-relaxed">{skinAgeResult.verdict}</p>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2 py-4">
                                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[13px] text-[#64748b]">{t.report.skinAgeAnalyzing}</span>
                                    </div>
                                )}
                            </div>

                            <p className="text-[13px] text-[#64748b] leading-relaxed w-full bg-[#1e293b]/20 p-4 rounded-xl border border-[#2d3a4f]/50">
                                {t.report.skinType}: <span className="text-[#22d3ee] font-bold">{averageHydration}%</span> {t.common.moisture}, <span className="text-[#fbbf24] font-bold">{averageSebum}%</span> {t.common.sebum} — {t.report.complexType}{' '}
                                {averageSebum > 60 && averageHydration < 40 ? t.report.dehydratedOily : averageSebum > 60 ? t.report.oilySkin : averageHydration < 40 ? t.report.drySkin : t.report.balancedSkin}
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
                                                <span className="text-[11px] text-[#475569] font-black uppercase tracking-widest">{region.label}</span>
                                            </div>
                                            <div className="flex justify-between items-end w-full">
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] text-[#22d3ee]/60 font-bold mb-1">{t.common.moisture}</span>
                                                    <div className="text-lg font-mono font-black text-white print:text-gray-900 leading-none">{data.moisture}%</div>
                                                </div>
                                                <div className="h-6 w-px bg-[#2d3a4f]" /> {/* Divider */}
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[12px] text-[#fbbf24]/60 font-bold mb-1">{t.common.sebum}</span>
                                                    <div className="text-lg font-mono font-black text-white print:text-gray-900 leading-none">{data.sebum}%</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Skincare Routine Section */}
                            <div className="bg-[#1e293b]/30 p-5 rounded-[1.5rem] border border-[#2d3a4f]">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles size={14} className="text-amber-400" />
                                    <h4 className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-[0.15em]">{t.report.skincareRoutine}</h4>
                                </div>

                                {/* Morning / Evening Tabs */}
                                <div className="flex gap-1.5 mb-4">
                                    <button
                                        onClick={() => setRoutineTab('morning')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-bold tracking-wide transition-all border ${routineTab === 'morning'
                                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.1)]'
                                            : 'bg-slate-800/30 border-slate-700/50 text-slate-500 hover:text-slate-400 hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <Sun size={12} /> {t.report.morningRoutine}
                                    </button>
                                    <button
                                        onClick={() => setRoutineTab('evening')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-bold tracking-wide transition-all border ${routineTab === 'evening'
                                            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.1)]'
                                            : 'bg-slate-800/30 border-slate-700/50 text-slate-500 hover:text-slate-400 hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <Moon size={12} /> {t.report.eveningRoutine}
                                    </button>
                                </div>

                                {/* Steps */}
                                {routine ? (
                                    <div className="space-y-2.5">
                                        {(routineTab === 'morning' ? routine.morning : routine.evening).map((step) => (
                                            <div key={step.order} className="flex gap-3 items-start bg-[#0f172a]/40 p-3 rounded-xl border border-[#2d3a4f]/50 hover:border-[#2d3a4f] transition-colors">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-black shrink-0 ${routineTab === 'morning'
                                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                    : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                                                    }`}>
                                                    {step.order}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-[14px] font-bold text-white">{step.step}</span>
                                                        <span className="text-[11px] px-1.5 py-0.5 bg-purple-900/30 text-purple-300 rounded font-medium">{step.ingredient}</span>
                                                    </div>
                                                    <div className="text-[12px] text-[#64748b] mb-1">{step.product}</div>
                                                    <div className="text-[11px] text-cyan-400/70 flex items-center gap-1">
                                                        <span className="opacity-60">→</span> {step.tip}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Recommended Affiliate Products for this Routine */}
                                        {(() => {
                                            const activeSteps = routineTab === 'morning' ? routine.morning : routine.evening;
                                            const routineIngredients = activeSteps.map(s => s.ingredient);

                                            // Extract and deduplicate products
                                            const allRoutineProducts = routineIngredients.flatMap(ing => getRecommendedProducts(ing));
                                            const uniqueProducts = Array.from(new Map(allRoutineProducts.map(item => [item.id, item])).values()).slice(0, 3); // Max 3 items

                                            if (uniqueProducts.length === 0) return null;

                                            return (
                                                <div className="mt-4 pt-4 border-t border-[#2d3a4f]/50 flex flex-col gap-2">
                                                    <div className="text-[12px] font-bold text-teal-400 mb-1 flex items-center gap-1.5 px-1">
                                                        <Store size={12} /> {t.affiliate.recommendedProducts}
                                                    </div>
                                                    {uniqueProducts.map(product => (
                                                        <div key={product.id} className="flex gap-3 items-center bg-[#0b121e]/80 p-2.5 rounded-lg border border-[#2d3a4f]/50 hover:border-teal-500/40 transition-all shadow-inner group relative overflow-hidden">
                                                            <div className="w-14 h-14 rounded-md bg-[#1e293b] overflow-hidden shrink-0 border border-slate-700/50 flex items-center justify-center relative">
                                                                {product.mediaType === 'video' ? (
                                                                    <video src={getDriveDirectLink(product.mediaUrl, product.mediaType)} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                                                                ) : (
                                                                    <img src={getDriveDirectLink(product.mediaUrl, product.mediaType)} alt={product.productName} className="w-full h-full object-cover" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                                                <span className="text-[11px] text-[#94a3b8] tracking-wider uppercase">{product.brand}</span>
                                                                <span className="text-[13px] font-bold text-white truncate leading-snug group-hover:text-teal-300 transition-colors">{product.productName}</span>
                                                                <span className="text-[14px] font-black text-white mt-1">{product.price.toLocaleString()}₩</span>
                                                            </div>
                                                            <a
                                                                href={product.buyUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="shrink-0 w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-teal-600 border border-slate-700 hover:border-teal-500 text-white rounded-lg transition-all shadow-sm"
                                                                title={product.buyUrl.includes('coupang') ? t.affiliate.buyNowCoupang : product.buyUrl.includes('oliveyoung') ? t.affiliate.buyNowOliveYoung : t.affiliate.buyNowDefault}
                                                            >
                                                                <ShoppingCart size={14} className="group-hover:scale-110 transition-transform" />
                                                            </a>
                                                        </div>
                                                    ))}
                                                    <div className="text-[10px] text-slate-500/80 text-right mt-1 px-1 italic">
                                                        * {t.affiliate.adNotice}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 py-6 justify-center">
                                        <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[13px] text-[#64748b]">{t.report.routineAnalyzing}</span>
                                    </div>
                                )}
                            </div>

                            {/* Inner Beauty Section */}
                            <div className="bg-gradient-to-br from-[#0f172a]/60 to-[#1e293b]/40 p-5 rounded-[1.5rem] border border-[#2d3a4f] shadow-lg">
                                <div className="flex items-center gap-2 mb-4">
                                    <Beaker size={14} className="text-emerald-400" />
                                    <h4 className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-[0.15em]">{t.report.innerBeautyCare}</h4>
                                </div>

                                {routine?.innerBeauty ? (
                                    <div className="space-y-4">
                                        <div className="bg-[#0b121e]/60 p-4 rounded-xl border border-[#2d3a4f]/50">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">{t.report.recommendedNutrient}</span>
                                                <span className="px-2 py-0.5 bg-emerald-900/30 text-emerald-300 text-[12px] font-black rounded-full border border-emerald-800/50">
                                                    {routine.innerBeauty.nutrient}
                                                </span>
                                            </div>

                                            <div className="mb-4">
                                                <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block mb-2">{t.report.recommendedFoods}</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {routine.innerBeauty.foods.map((food, i) => (
                                                        <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e293b] text-white text-[13px] font-bold rounded-lg border border-[#2d3a4f]">
                                                            <span className="text-emerald-400">🥗</span> {food}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-3 border-t border-[#2d3a4f]/30">
                                                <div>
                                                    <div className="text-[11px] font-bold text-cyan-400 mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                                                        <Sparkles size={10} /> {t.report.dietaryAdvice}
                                                    </div>
                                                    <p className="text-[12px] text-[#94a3b8] leading-relaxed">{routine.innerBeauty.advice}</p>
                                                </div>
                                                <div>
                                                    <div className="text-[11px] font-bold text-rose-400 mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                                                        <Activity size={10} /> {t.report.dietaryWarning}
                                                    </div>
                                                    <p className="text-[11px] text-[#64748b] italic leading-relaxed">{routine.innerBeauty.warning}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 py-6 justify-center">
                                        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[13px] text-[#64748b]">{t.report.routineAnalyzing}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-10 flex flex-col sm:flex-row gap-3 print:hidden">
                            <button
                                onClick={() => window.print()}
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white text-[#0f172a] text-sm font-black rounded-xl hover:bg-[#e2e8f0] active:scale-[0.98] transition-all"
                            >
                                <Download size={16} />
                                {t.report.savePdf}
                            </button>
                            <button
                                onClick={onReset}
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#1e293b]/60 text-white text-sm font-bold rounded-xl hover:bg-[#1e293b] active:scale-[0.98] transition-all border border-[#2d3a4f]"
                            >
                                <RefreshCw size={16} />
                                {t.report.measureAgain}
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
                width: 21cm !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            @page {
                size: A4 portrait;
                margin: 0;
            }
            * {
                box-sizing: border-box !important;
            }
        }
      `}</style>
            </div>
        </div>
    );
};

export default ReportView;
