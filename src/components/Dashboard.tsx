"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Bluetooth, Activity, ShieldCheck, CheckCircle } from 'lucide-react';
import HeatmapCanvas from '../components/HeatmapCanvas';
import ReportView from '../components/ReportView';
import { useBluetoothDevice } from '../hooks/useBluetoothDevice';
import { FaceAnalyzer, SegmentedData } from '../services/FaceAnalyzer';
import { INITIAL_HYDRATION_DATA } from '../utils/constants';

export default function Dashboard() {
    const [landmarks, setLandmarks] = useState<SegmentedData | null>(null);
    const [hydrationData, setHydrationData] = useState(INITIAL_HYDRATION_DATA);
    const [faceType, setFaceType] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [hasMeasured, setHasMeasured] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const analyzerRef = useRef<FaceAnalyzer | null>(null);

    const { connect, disconnect, isConnecting, measurementData, error: btError, isSimulating } = useBluetoothDevice();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            analyzerRef.current = new FaceAnalyzer();
        }
    }, []);

    useEffect(() => {
        if (measurementData) {
            setHydrationData(prev => ({
                ...prev,
                [measurementData.region]: measurementData.value
            }));
            setHasMeasured(true);
        }
    }, [measurementData]);

    const handleCameraStart = async () => {
        try {
            setIsCameraActive(true);
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    startAnalysis();
                };
            }
        } catch (err) {
            console.error("Camera access failed", err);
            setIsCameraActive(false);
        }
    };

    const startAnalysis = async () => {
        if (!videoRef.current || !analyzerRef.current) return;

        const runAnalysis = async () => {
            if (!isCameraActive || !analyzerRef.current || !videoRef.current || showReport) return;

            const result = await analyzerRef.current.analyze(videoRef.current);
            if (result) {
                setLandmarks(result.segmentedData);
                if (!faceType) {
                    setFaceType(analyzerRef.current.matchTemplate(result.landmarks));
                }
            }

            if (isCameraActive && !showReport) {
                requestAnimationFrame(runAnalysis);
            }
        };

        runAnalysis();
    };

    const handleComplete = () => {
        // Stop all updates and freeze the current data for the report
        setIsCameraActive(false);
        disconnect(); // Also stop Bluetooth/Simulation updates

        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }

        setShowReport(true);
    };

    const handleReset = () => {
        setShowReport(false);
        setHydrationData(INITIAL_HYDRATION_DATA);
        setHasMeasured(false);
        setLandmarks(null);
        setFaceType(null);
        disconnect();
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            {showReport && (
                <ReportView
                    landmarks={landmarks}
                    hydrationData={hydrationData}
                    faceType={faceType}
                    onReset={handleReset}
                />
            )}

            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        Face Hitmap
                    </h1>
                    <p className="text-slate-400">실시간 얼굴 부위별 수분 측정 및 분석</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg text-xs border border-slate-700">
                        <ShieldCheck size={14} className={isSimulating ? "text-yellow-400" : "text-green-400"} />
                        <span>상태: {isSimulating ? '시뮬레이션 모드' : '실시간 모드'}</span>
                    </div>
                    <button
                        onClick={connect}
                        disabled={isConnecting}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isConnecting ? 'bg-slate-700' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20'
                            }`}
                    >
                        <Bluetooth size={18} />
                        {isConnecting ? '연결 중...' : '장비 연결'}
                    </button>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Viewport */}
                <div className="lg:col-span-2 relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 aspect-video group">
                    {!isCameraActive ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 backdrop-blur-sm">
                            <Camera size={48} className="mb-4 opacity-20" />
                            <button
                                onClick={handleCameraStart}
                                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-all border border-slate-700"
                            >
                                카메라 시작하기
                            </button>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover opacity-60 grayscale-[30%]"
                                autoPlay
                                muted
                                playsInline
                            />
                            <HeatmapCanvas
                                landmarks={landmarks}
                                hydrationData={hydrationData}
                                width={1280}
                                height={720}
                            />
                            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] text-slate-300 border border-white/10">
                                SCANNED: {faceType || 'PENDING...'}
                            </div>

                            {hasMeasured && (
                                <button
                                    onClick={handleComplete}
                                    className="absolute bottom-4 right-4 flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl shadow-xl transition-all animate-bounce"
                                >
                                    <CheckCircle size={20} />
                                    측정 완료
                                </button>
                            )}

                            <button
                                onClick={() => setIsCameraActive(false)}
                                className="absolute top-4 right-4 px-3 py-1 bg-red-600/30 hover:bg-red-600/80 rounded-lg text-xs transition-all border border-red-500/30"
                            >
                                카메라 중지
                            </button>
                        </>
                    )}
                </div>

                {/* Right: Info Panel */}
                <div className="space-y-6">
                    {/* Info Panels same as before */}
                    <section className="bg-slate-800/50 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-xl">
                        <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Activity size={18} className="text-cyan-400" />
                                부위별 측정치
                            </div>
                            {isSimulating && <span className="text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-400/20 animate-pulse">SIM</span>}
                        </h2>
                        <div className="space-y-4">
                            {Object.entries(hydrationData).map(([region, value]) => (
                                <div key={region} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="capitalize text-slate-400 font-medium">{region.replace('_', ' ')}</span>
                                        <span className="font-mono text-cyan-400 font-bold">{value}%</span>
                                    </div>
                                    <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-700/50 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${value > 70 ? 'bg-cyan-400' : value > 40 ? 'bg-blue-400' : 'bg-red-400'
                                                }`}
                                            style={{ width: `${value}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-slate-800/50 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-xl">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Upload size={18} className="text-purple-400" />
                            얼굴 유형 매칭
                        </h2>
                        <div className="text-center p-6 bg-slate-900/80 rounded-xl border border-slate-700 border-dashed relative overflow-hidden">
                            {faceType ? (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-pink-500 mb-2">
                                        {faceType}
                                    </div>
                                    <div className="h-0.5 w-12 bg-purple-500/30 mx-auto mb-3" />
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        분석 결과, 균형 잡힌 관리와 <br />
                                        <span className="text-purple-300">T존 유수분 밸런스</span> 조절이 추천됩니다.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 opacity-40">
                                    <div className="w-8 h-8 rounded-full border-2 border-slate-600 border-t-purple-400 animate-spin" />
                                    <p className="text-xs text-slate-500">얼굴 스캔을 기다리는 중...</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {btError && (
                        <div className="p-4 bg-yellow-400/5 border border-yellow-400/20 rounded-xl text-yellow-200/80 text-[10px] text-center leading-normal">
                            알림: {btError}
                        </div>
                    )}
                </div>
            </main>

            <footer className="mt-12 text-center text-slate-600 text-[10px] uppercase tracking-widest font-medium">
                Face Hydration Heatmap System &copy; 2026
            </footer>
        </div>
    );
}
