"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Bluetooth, Activity, ShieldCheck, CheckCircle, Globe, CameraOff, RotateCcw, ArrowRight } from 'lucide-react';
import HeatmapCanvas from '../components/HeatmapCanvas';
import FaceGuideOverlay from '../components/FaceGuideOverlay';
import ReportView from '../components/ReportView';
import { useBluetoothDevice } from '../hooks/useBluetoothDevice';
import { FaceAnalyzer, SegmentedData, FaceOvalData } from '../services/FaceAnalyzer';
import { INITIAL_HYDRATION_DATA, FACE_REGIONS } from '../utils/constants';
import SurveyModal, { UserProfile } from './SurveyModal';
import { useI18n, SUPPORTED_LOCALES } from '../i18n/I18nContext';

const MEASUREMENT_SEQUENCE = [
    FACE_REGIONS.FOREHEAD,
    FACE_REGIONS.LEFT_CHEEK,
    FACE_REGIONS.RIGHT_CHEEK,
    FACE_REGIONS.NOSE,
    FACE_REGIONS.CHIN,
    FACE_REGIONS.T_ZONE
];

const REGION_KEYS: Record<string, keyof typeof INITIAL_HYDRATION_DATA extends string ? string : never> = {
    [FACE_REGIONS.FOREHEAD]: 'forehead',
    [FACE_REGIONS.LEFT_CHEEK]: 'leftCheek',
    [FACE_REGIONS.RIGHT_CHEEK]: 'rightCheek',
    [FACE_REGIONS.NOSE]: 'nose',
    [FACE_REGIONS.CHIN]: 'chin',
    [FACE_REGIONS.T_ZONE]: 'tZone',
};

export default function Dashboard() {
    const { t, locale, setLocale } = useI18n();
    const [showLangMenu, setShowLangMenu] = useState(false);

    const [landmarks, setLandmarks] = useState<SegmentedData | null>(null);
    const [faceOval, setFaceOval] = useState<FaceOvalData[] | null>(null);
    const [hydrationData, setHydrationData] = useState(INITIAL_HYDRATION_DATA);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [faceType, setFaceType] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isSimulatingCamera, setIsSimulatingCamera] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [hasMeasured, setHasMeasured] = useState(false);
    const [cameraPhase, setCameraPhase] = useState<'shooting' | 'preview' | 'measuring'>('shooting');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isFaceInGuide, setIsFaceInGuide] = useState(false);

    // 사용자 프로필 및 설문 상태
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [showSurvey, setShowSurvey] = useState(true);

    // 컴포넌트 마운트 시 로컬 스토리지에서 프로필 데이터 불러오기
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('faceHitmapUserProfile');
            if (stored) {
                try {
                    const parsedProfile = JSON.parse(stored);
                    setUserProfile(parsedProfile);
                    setShowSurvey(false);
                } catch (e) {
                    console.error("Failed to parse stored profile", e);
                }
            }
        }
    }, []);

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
        if (measurementData !== null && isCameraActive && !showReport) {
            const currentRegion = MEASUREMENT_SEQUENCE[currentStepIndex];

            setHydrationData(prev => ({
                ...prev,
                [currentRegion]: measurementData
            }));

            setMeasurementData(null);
            setHasMeasured(true);

            if (currentStepIndex >= MEASUREMENT_SEQUENCE.length - 1) {
                setTimeout(() => {
                    handleComplete();
                }, 1000);
            } else {
                setCurrentStepIndex(prev => prev + 1);
                setManualMoisture('');
                setManualSebum('');
            }
        }
    }, [measurementData, currentStepIndex, isCameraActive, showReport]);

    const handleManualSubmit = () => {
        const moistureValue = parseInt(manualMoisture, 10);
        const sebumValue = parseInt(manualSebum, 10);

        if (isNaN(moistureValue) || moistureValue < 0 || moistureValue > 100) {
            alert(t.dashboard.moistureValidation);
            return;
        }
        if (isNaN(sebumValue) || sebumValue < 0 || sebumValue > 100) {
            alert(t.dashboard.sebumValidation);
            return;
        }

        setMeasurementData({ moisture: moistureValue, sebum: sebumValue });
    };

    const handleCameraStart = async () => {
        try {
            setIsCameraActive(true);
            setIsSimulatingCamera(false);
            setCameraPhase('shooting');
            setCapturedImage(null);
            setIsFaceInGuide(false);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    startFaceDetection();
                };
            }
        } catch (err) {
            console.error("Camera access failed", err);
            setIsCameraActive(false);
        }
    };

    const handleSimulateScan = () => {
        setIsCameraActive(true);
        setIsSimulatingCamera(true);
        setCameraPhase('measuring');
        setCapturedImage(null);

        setTimeout(() => {
            import('../utils/constants').then(({ DEFAULT_LANDMARKS }) => {
                setLandmarks(DEFAULT_LANDMARKS as any);
                setFaceType('Oval / Heart');
            });
        }, 1500);
    };

    // Face detection loop for guide-only (no measurement yet)
    const startFaceDetection = async () => {
        if (!videoRef.current || !analyzerRef.current) return;

        const runDetection = async () => {
            if (!videoRef.current || !analyzerRef.current) return;
            // Only run during shooting phase
            const result = await analyzerRef.current.analyze(videoRef.current);
            if (result) {
                const inBounds = analyzerRef.current.isFaceInBounds(result.landmarks);
                setIsFaceInGuide(inBounds);
            } else {
                setIsFaceInGuide(false);
            }
            // Continue detection loop only during shooting phase
            requestAnimationFrame(runDetection);
        };

        runDetection();
    };

    // Capture still photo
    const handleCapture = async () => {
        if (!videoRef.current || !analyzerRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);

        // Analyze the captured frame
        const result = await analyzerRef.current.analyze(videoRef.current);
        if (result) {
            setLandmarks(result.segmentedData);
            setFaceOval(result.faceOval);
            setFaceType(analyzerRef.current.matchTemplate(result.landmarks));
        }

        // Stop camera stream
        if (videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }

        setCameraPhase('preview');
    };

    // Retake photo
    const handleRetake = () => {
        setCapturedImage(null);
        setFaceType(null);
        setLandmarks(null);
        setFaceOval(null);
        handleCameraStart();
    };

    // Move from preview to measurement
    const handleStartMeasurement = () => {
        setCameraPhase('measuring');
    };

    const handleComplete = () => {
        setIsCameraActive(false);
        disconnect();

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
        setIsSimulatingCamera(false);
        setCameraPhase('shooting');
        setCapturedImage(null);
        setIsFaceInGuide(false);
        disconnect();
    };

    const handleSurveyComplete = (profile: UserProfile) => {
        setUserProfile(profile);
        setShowSurvey(false);
        if (typeof window !== 'undefined') {
            localStorage.setItem('faceHitmapUserProfile', JSON.stringify(profile));
        }
    };

    const getRegionName = (regionId: string): string => {
        const key = REGION_KEYS[regionId] as keyof typeof t.dashboard.regions;
        return t.dashboard.regions[key] || regionId;
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <SurveyModal
                isOpen={showSurvey}
                onComplete={handleSurveyComplete}
                initialData={userProfile}
            />

            {showReport && (
                <ReportView
                    landmarks={landmarks}
                    hydrationData={hydrationData}
                    faceType={faceType}
                    userProfile={userProfile}
                    onReset={handleReset}
                />
            )}

            <header className="mb-8 flex justify-between items-center print:hidden">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        {t.dashboard.title}
                    </h1>
                    <p className="text-slate-400">{t.dashboard.subtitle}</p>
                </div>
                <div className="flex gap-4">
                    {/* Language Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs border border-slate-700 transition-all text-slate-300"
                        >
                            <Globe size={14} className="text-cyan-400" />
                            {SUPPORTED_LOCALES.find(l => l.code === locale)?.flag}
                        </button>
                        {showLangMenu && (
                            <div className="absolute right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden min-w-[140px]">
                                {SUPPORTED_LOCALES.map(l => (
                                    <button
                                        key={l.code}
                                        onClick={() => { setLocale(l.code); setShowLangMenu(false); }}
                                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-all ${locale === l.code ? 'bg-cyan-600/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'}`}
                                    >
                                        <span>{l.flag}</span>
                                        <span>{l.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {userProfile && (
                        <button
                            onClick={() => setShowSurvey(true)}
                            className="flex items-center gap-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs border border-slate-700 transition-all text-cyan-400"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span className="hidden sm:inline">{t.common.editProfile}</span>
                        </button>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg text-xs border border-slate-700">
                        <ShieldCheck size={14} className={isSimulating ? "text-yellow-400" : "text-green-400"} />
                        <span>{t.common.status}: {isSimulating ? t.common.simulationMode : t.common.realtimeMode}</span>
                    </div>
                    <button
                        onClick={connect}
                        disabled={isConnecting}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isConnecting ? 'bg-slate-700' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20'
                            }`}
                    >
                        <Bluetooth size={18} />
                        {isConnecting ? t.common.connecting : t.common.connectDevice}
                    </button>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
                {/* Left: Viewport */}
                <div className="lg:col-span-2 relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 aspect-video group">
                    {!isCameraActive ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 backdrop-blur-sm">
                            <Camera size={48} className="mb-4 opacity-20" />
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleCameraStart}
                                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-all border border-slate-700"
                                >
                                    {t.dashboard.startCamera}
                                </button>
                                <button
                                    onClick={handleSimulateScan}
                                    className="px-6 py-2 bg-indigo-900/50 hover:bg-indigo-800/80 rounded-lg text-sm text-indigo-300 transition-all border border-indigo-700/50 flex items-center gap-2"
                                >
                                    <Activity size={16} />
                                    Simulate Scan (Dev)
                                </button>
                            </div>
                        </div>

                    ) : cameraPhase === 'shooting' ? (
                        /* Phase 1: Shooting — Camera + Guide Overlay */
                        <>
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover z-0 relative"
                                autoPlay
                                muted
                                playsInline
                                style={{ transform: 'scaleX(-1)' }}
                            />
                            <FaceGuideOverlay
                                isFaceDetected={isFaceInGuide}
                                onCapture={handleCapture}
                            />
                            <button
                                onClick={() => {
                                    setIsCameraActive(false);
                                    if (videoRef.current?.srcObject) {
                                        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                                    }
                                }}
                                className="absolute top-4 right-4 z-20 px-3 py-1 bg-red-600/30 hover:bg-red-600/80 rounded-lg text-xs transition-all border border-red-500/30"
                            >
                                {t.dashboard.stopCamera}
                            </button>
                        </>

                    ) : cameraPhase === 'preview' ? (
                        /* Phase 2: Preview — Captured image + face type result */
                        <>
                            {capturedImage && (
                                <img
                                    src={capturedImage}
                                    alt="Captured face"
                                    className="w-full h-full object-cover"
                                    style={{ transform: 'scaleX(-1)' }}
                                />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-10">
                                <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-700 shadow-2xl text-center max-w-xs">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">{t.dashboard.photoPreview}</div>
                                    {faceType && (
                                        <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-pink-500 mb-1">
                                            {faceType}
                                        </div>
                                    )}
                                    <div className="h-px bg-slate-700 my-3" />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleRetake}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold border border-slate-600 transition-all"
                                        >
                                            <RotateCcw size={14} />
                                            {t.dashboard.retake}
                                        </button>
                                        <button
                                            onClick={handleStartMeasurement}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-bold shadow-lg shadow-cyan-900/30 transition-all"
                                        >
                                            {t.dashboard.startMeasurement}
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>

                    ) : (
                        /* Phase 3: Measuring — Existing sensor measurement UI */
                        <>
                            {isSimulatingCamera ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-0">
                                    <div className="w-48 h-64 border-2 border-dashed border-indigo-500/30 rounded-[100px] flex items-center justify-center relative">
                                        <div className="absolute inset-0 bg-indigo-500/5 rounded-[100px] animate-pulse" />
                                        <span className="text-xs text-indigo-500/50 uppercase tracking-widest font-mono text-center">Simulated<br />Face Data</span>
                                    </div>
                                </div>
                            ) : capturedImage ? (
                                <img
                                    src={capturedImage}
                                    alt="Captured face"
                                    className="w-full h-full object-cover opacity-40 z-0"
                                    style={{ transform: 'scaleX(-1)' }}
                                />
                            ) : null}
                            <div className="hidden md:block">
                                <HeatmapCanvas
                                    landmarks={landmarks}
                                    hydrationData={hydrationData}
                                    width={1280}
                                    height={720}
                                />
                            </div>
                            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] text-slate-300 border border-white/10">
                                SCANNED: {faceType || 'PENDING...'}
                            </div>

                            {hasMeasured && (
                                <button
                                    onClick={handleComplete}
                                    className="absolute bottom-4 right-4 flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl shadow-xl transition-all animate-bounce"
                                >
                                    <CheckCircle size={20} />
                                    {t.dashboard.measureComplete}
                                </button>
                            )}

                            <button
                                onClick={() => setIsCameraActive(false)}
                                className="absolute top-4 right-4 px-3 py-1 bg-red-600/30 hover:bg-red-600/80 rounded-lg text-xs transition-all border border-red-500/30"
                            >
                                {t.dashboard.stopCamera}
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
                                {t.dashboard.measureGuide}
                            </div>
                            {isSimulating && <span className="text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-400/20 animate-pulse">SIM</span>}
                        </h2>

                        {!isCameraActive && !showReport ? (
                            <div className="text-center text-slate-400 py-8 text-sm border border-dashed border-slate-700 rounded-xl">
                                {t.dashboard.startCameraFirst}
                            </div>
                        ) : showReport ? (
                            <div className="text-center text-green-400 py-8 font-bold border border-green-500/30 bg-green-500/10 rounded-xl flex flex-col items-center justify-center gap-3">
                                <CheckCircle size={32} />
                                {t.dashboard.allMeasurementsComplete}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-center py-5 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-cyan-500/30 rounded-xl shadow-inner mb-6">
                                    <div className="text-[10px] text-cyan-300 font-bold tracking-widest uppercase mb-1">
                                        {t.dashboard.step} {currentStepIndex + 1} {t.dashboard.of} {MEASUREMENT_SEQUENCE.length}
                                    </div>
                                    <div className="text-lg font-black text-white">
                                        {t.dashboard.placeDeviceOn} <span className="text-cyan-400 border-b-2 border-cyan-400 pb-0.5">{getRegionName(MEASUREMENT_SEQUENCE[currentStepIndex])}</span> {t.dashboard.pressButton}
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
                                                            {getRegionName(region)}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="font-mono text-sm font-bold flex gap-2">
                                                            {isPast || (isCurrent && value.moisture > 0) ? (
                                                                <>
                                                                    <span className="text-cyan-400">{t.common.moisture} {value.moisture}%</span>
                                                                    <span className="text-yellow-400 text-opacity-80 border-l border-slate-700 pl-2">{t.common.sebum} {value.sebum}%</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-slate-600">-</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Manual input form */}
                                                {
                                                    isCurrent && (
                                                        <div className="mt-2 bg-slate-900/50 p-3 rounded-xl border border-slate-700 flex flex-col sm:flex-row items-center gap-3 justify-between">
                                                            <div className="flex items-center gap-2 flex-1 w-full">
                                                                <div className="flex items-center bg-slate-800 rounded-lg px-2 flex-1 border border-slate-700 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 transition-all">
                                                                    <span className="text-[10px] text-slate-400 mr-1 whitespace-nowrap">{t.common.moisture}</span>
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
                                                                    <span className="text-[10px] text-slate-400 mr-1 whitespace-nowrap">{t.common.sebum}</span>
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
                                                                ✔ {t.common.input}
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
                            {t.dashboard.faceTypeMatch}
                        </h2>
                        <div className="text-center p-6 bg-slate-900/80 rounded-xl border border-slate-700 border-dashed relative overflow-hidden">
                            {faceType ? (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-pink-500 mb-2">
                                        {faceType}
                                    </div>
                                    <div className="h-0.5 w-12 bg-purple-500/30 mx-auto mb-3" />
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        {t.dashboard.analysisResult}<br />
                                        <span className="text-purple-300">{t.dashboard.tZoneBalance}</span>
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 opacity-40">
                                    <div className="w-8 h-8 rounded-full border-2 border-slate-600 border-t-purple-400 animate-spin" />
                                    <p className="text-xs text-slate-500">{t.dashboard.waitingForScan}</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {btError && (
                        <div className="p-4 bg-yellow-400/5 border border-yellow-400/20 rounded-xl text-yellow-200/80 text-[10px] text-center leading-normal">
                            {t.common.alert}: {
                                btError === 'BT_NOT_SUPPORTED' ? t.bluetooth.notSupported
                                    : btError === 'BT_DISCONNECTED' ? t.bluetooth.disconnected
                                        : btError === 'BT_CONNECT_FAILED' ? t.bluetooth.connectionFailed
                                            : btError
                            }
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
