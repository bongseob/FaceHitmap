"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Bluetooth, Activity, ShieldCheck, CheckCircle } from 'lucide-react';
import HeatmapCanvas from '../components/HeatmapCanvas';
import ReportView from '../components/ReportView';
import { useBluetoothDevice } from '../hooks/useBluetoothDevice';
import { FaceAnalyzer, SegmentedData, FaceOvalData } from '../services/FaceAnalyzer';
import { INITIAL_HYDRATION_DATA, FACE_REGIONS } from '../utils/constants';

const MEASUREMENT_SEQUENCE = [
    FACE_REGIONS.FOREHEAD,
    FACE_REGIONS.LEFT_CHEEK,
    FACE_REGIONS.RIGHT_CHEEK,
    FACE_REGIONS.NOSE,
    FACE_REGIONS.CHIN,
    FACE_REGIONS.T_ZONE
];

const REGION_KOREAN_NAMES: Record<string, string> = {
    [FACE_REGIONS.FOREHEAD]: '이마',
    [FACE_REGIONS.LEFT_CHEEK]: '왼쪽 볼',
    [FACE_REGIONS.RIGHT_CHEEK]: '오른쪽 볼',
    [FACE_REGIONS.NOSE]: '코',
    [FACE_REGIONS.CHIN]: '턱',
    [FACE_REGIONS.T_ZONE]: 'T존'
};

export default function Dashboard() {
    const [landmarks, setLandmarks] = useState<SegmentedData | null>(null);
    const [faceOval, setFaceOval] = useState<FaceOvalData[] | null>(null);
    const [hydrationData, setHydrationData] = useState(INITIAL_HYDRATION_DATA);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [faceType, setFaceType] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [hasMeasured, setHasMeasured] = useState(false);

    // 수동 입력용 State 추가
    const [manualMoisture, setManualMoisture] = useState<string>('');
    const [manualSebum, setManualSebum] = useState<string>('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const analyzerRef = useRef<FaceAnalyzer | null>(null);

    const { connect, disconnect, isConnecting, measurementData, setMeasurementData, error: btError, isSimulating } = useBluetoothDevice();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            analyzerRef.current = new FaceAnalyzer();
        }
    }, []);

    useEffect(() => {
        // 카메라 스캔 모드이고 결과 화면이 아닐 때만 측정값을 수집합니다
        if (measurementData !== null && isCameraActive && !showReport) {
            const currentRegion = MEASUREMENT_SEQUENCE[currentStepIndex];

            setHydrationData(prev => ({
                ...prev,
                [currentRegion]: measurementData
            }));

            // 이벤트를 1회성으로 소모 (중복 실행 방지)
            setMeasurementData(null);
            setHasMeasured(true);

            if (currentStepIndex >= MEASUREMENT_SEQUENCE.length - 1) {
                // 모든 순서 측정이 완료되면 1초 뒤 자동으로 완료 처리 (마지막 데이터가 화면에 표시될 시간 확보)
                setTimeout(() => {
                    handleComplete();
                }, 1000);
            } else {
                // 다음 단계로 이동
                setCurrentStepIndex(prev => prev + 1);
                // 수동 입력 값 초기화
                setManualMoisture('');
                setManualSebum('');
            }
        }
    }, [measurementData, currentStepIndex, isCameraActive, showReport]);

    const handleManualSubmit = () => {
        const moistureValue = parseInt(manualMoisture, 10);
        const sebumValue = parseInt(manualSebum, 10);

        if (isNaN(moistureValue) || moistureValue < 0 || moistureValue > 100) {
            alert('수분을 0에서 100 사이의 숫자로 입력해주세요.');
            return;
        }
        if (isNaN(sebumValue) || sebumValue < 0 || sebumValue > 100) {
            alert('유분을 0에서 100 사이의 숫자로 입력해주세요.');
            return;
        }

        // 블루투스로 값이 들어온 것과 똑같이 measurementData 상태 갱신
        setMeasurementData({ moisture: moistureValue, sebum: sebumValue });
    };

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
                setFaceOval(result.faceOval);
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
        setCurrentStepIndex(0);
        setLandmarks(null);
        setFaceOval(null);
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
                    {/* Measurement Guide Panel */}
                    <section className="bg-slate-800/50 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-xl">
                        <h2 className="text-lg font-semibold mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Activity size={18} className="text-cyan-400 animate-pulse" />
                                측정 가이드
                            </div>
                            {isSimulating && <span className="text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-400/20 animate-pulse">SIM</span>}
                        </h2>

                        {!isCameraActive && !showReport ? (
                            <div className="text-center text-slate-400 py-8 text-sm border border-dashed border-slate-700 rounded-xl">
                                카메라를 먼저 시작해주세요.
                            </div>
                        ) : showReport ? (
                            <div className="text-center text-green-400 py-8 font-bold border border-green-500/30 bg-green-500/10 rounded-xl flex flex-col items-center justify-center gap-3">
                                <CheckCircle size={32} />
                                측정이 모두 완료되었습니다.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-center py-5 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-cyan-500/30 rounded-xl shadow-inner mb-6">
                                    <div className="text-[10px] text-cyan-300 font-bold tracking-widest uppercase mb-1">
                                        STEP {currentStepIndex + 1} / {MEASUREMENT_SEQUENCE.length}
                                    </div>
                                    <div className="text-lg font-black text-white">
                                        장비를 <span className="text-cyan-400 border-b-2 border-cyan-400 pb-0.5">{REGION_KOREAN_NAMES[MEASUREMENT_SEQUENCE[currentStepIndex]]}</span>에 대고 버튼을 누르세요.
                                    </div>
                                </div>

                                {/* Sequence Steps Indicator */}
                                <div className="flex flex-col gap-2.5">
                                    {MEASUREMENT_SEQUENCE.map((region, idx) => {
                                        const isPast = idx < currentStepIndex;
                                        const isCurrent = idx === currentStepIndex;
                                        const value = hydrationData[region];

                                        return (
                                            <React.Fragment key={region}>
                                                <div
                                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${isCurrent
                                                        ? 'bg-slate-700/80 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-[1.02]'
                                                        : isPast
                                                            ? 'bg-slate-800/30 border-slate-700/50 opacity-60'
                                                            : 'bg-slate-800/10 border-slate-800 opacity-40'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isCurrent ? 'bg-cyan-500 text-white' : isPast ? 'bg-slate-700 text-slate-400' : 'bg-slate-800 text-slate-500'
                                                            }`}>
                                                            {isPast ? <CheckCircle size={12} /> : idx + 1}
                                                        </div>
                                                        <span className={`text-sm font-medium ${isCurrent ? 'text-white' : 'text-slate-400'}`}>
                                                            {REGION_KOREAN_NAMES[region]}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="font-mono text-sm font-bold flex gap-2">
                                                            {isPast || (isCurrent && value.moisture > 0) ? (
                                                                <>
                                                                    <span className="text-cyan-400">수분 {value.moisture}%</span>
                                                                    <span className="text-yellow-400 text-opacity-80 border-l border-slate-700 pl-2">유분 {value.sebum}%</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-slate-600">-</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 수동 입력 폼 (현재 활성화된 단계에만 표시) */}
                                                {
                                                    isCurrent && (
                                                        <div className="mt-2 bg-slate-900/50 p-3 rounded-xl border border-slate-700 flex flex-col sm:flex-row items-center gap-3 justify-between">
                                                            <div className="flex items-center gap-2 flex-1 w-full">
                                                                <div className="flex items-center bg-slate-800 rounded-lg px-2 flex-1 border border-slate-700 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 transition-all">
                                                                    <span className="text-[10px] text-slate-400 mr-1 whitespace-nowrap">수분</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0" max="100"
                                                                        value={manualMoisture}
                                                                        onChange={(e) => setManualMoisture(e.target.value)}
                                                                        placeholder="0~100"
                                                                        className="w-full bg-transparent text-sm text-white text-right py-1.5 focus:outline-none placeholder-slate-600 font-mono"
                                                                    />
                                                                    <span className="text-[10px] text-slate-500 ml-1">%</span>
                                                                </div>
                                                                <div className="flex items-center bg-slate-800 rounded-lg px-2 flex-1 border border-slate-700 focus-within:border-yellow-500 focus-within:ring-1 focus-within:ring-yellow-500 transition-all">
                                                                    <span className="text-[10px] text-slate-400 mr-1 whitespace-nowrap">유분</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0" max="100"
                                                                        value={manualSebum}
                                                                        onChange={(e) => setManualSebum(e.target.value)}
                                                                        placeholder="0~100"
                                                                        className="w-full bg-transparent text-sm text-white text-right py-1.5 focus:outline-none placeholder-slate-600 font-mono"
                                                                    />
                                                                    <span className="text-[10px] text-slate-500 ml-1">%</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={handleManualSubmit}
                                                                disabled={!manualMoisture || !manualSebum}
                                                                className="w-full sm:w-auto px-4 py-1.5 bg-slate-700 hover:bg-cyan-600 disabled:opacity-50 disabled:hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all border border-slate-600 hover:border-cyan-500 whitespace-nowrap"
                                                            >
                                                                ✔ 입력
                                                            </button>
                                                        </div>
                                                    )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
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
