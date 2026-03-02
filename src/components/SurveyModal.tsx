import React, { useState } from 'react';
import { User, Globe, AlertCircle } from 'lucide-react';

export interface UserProfile {
    age: string;
    race: string;
    climate: string;
    skinConcerns: {
        dryness: number;
        sensitivity: number;
        pigmentation: number;
    };
}

interface SurveyModalProps {
    isOpen: boolean;
    onComplete: (profile: UserProfile) => void;
}

const SurveyModal: React.FC<SurveyModalProps> = ({ isOpen, onComplete }) => {
    const [age, setAge] = useState<string>('');
    const [race, setRace] = useState<string>('');
    const [climate, setClimate] = useState<string>('');

    // 0-10 Scale for self-assessment like Baumann
    const [dryness, setDryness] = useState<number>(5);
    const [sensitivity, setSensitivity] = useState<number>(5);
    const [pigmentation, setPigmentation] = useState<number>(5);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onComplete({
            age,
            race,
            climate,
            skinConcerns: { dryness, sensitivity, pigmentation }
        });
    };

    if (!isOpen) return null;

    const isSubmitDisabled = !age || !race || !climate;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex justify-center items-center p-4">
            <div className="bg-[#162031] w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                    <User className="text-cyan-400" size={24} />
                    <h2 className="text-xl font-bold text-white">맞춤형 피부 분석 프로필 설정</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Demographics */}
                    <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <h3 className="text-sm font-semibold text-cyan-300 flex items-center gap-2 mb-3">
                            <Globe size={16} /> 기본 인적 특성 (Exposome)
                        </h3>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-slate-400 font-medium">연령대 (Age)</label>
                            <select
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                                required
                            >
                                <option value="" disabled>선택해주세요</option>
                                <option value="10s">10대 (Teens)</option>
                                <option value="20s">20대 (20s)</option>
                                <option value="30s">30대 (30s)</option>
                                <option value="40s">40대 (40s)</option>
                                <option value="50s_plus">50대 이상 (50s+)</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-slate-400 font-medium">피부타입/인종 (Skin Type/Race)</label>
                            <select
                                value={race}
                                onChange={(e) => setRace(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                                required
                            >
                                <option value="" disabled>선택해주세요</option>
                                <option value="asian">아시아인 (Asian / Type III-IV)</option>
                                <option value="caucasian">백인 (Caucasian / Type I-II)</option>
                                <option value="african">흑인 (African / Type V-VI)</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-slate-400 font-medium">주 거주 환경 (Climate)</label>
                            <select
                                value={climate}
                                onChange={(e) => setClimate(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                                required
                            >
                                <option value="" disabled>선택해주세요</option>
                                <option value="dry">건조한 기후 (Dry/Arid)</option>
                                <option value="humid">덥고 습한 기후 (Hot/Humid)</option>
                                <option value="temperate">온화한 기후 (Temperate)</option>
                            </select>
                        </div>
                    </div>

                    {/* Self Assessment (Baumann inspired) */}
                    <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                                <AlertCircle size={16} /> 자가 진단 평가
                            </h3>
                            <span className="text-[10px] text-slate-500">1: 낮음 / 10: 높음</span>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300">평소 피부 건조함/당김 정도</span>
                                    <span className="text-cyan-400 font-bold">{dryness}</span>
                                </div>
                                <input
                                    type="range" min="1" max="10" value={dryness}
                                    onChange={(e) => setDryness(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300">피부 민감도 (붉어짐, 트러블 빈도)</span>
                                    <span className="text-purple-400 font-bold">{sensitivity}</span>
                                </div>
                                <input
                                    type="range" min="1" max="10" value={sensitivity}
                                    onChange={(e) => setSensitivity(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300">색소침착 (기미, 잡티 등) 체감 정도</span>
                                    <span className="text-yellow-400 font-bold">{pigmentation}</span>
                                </div>
                                <input
                                    type="range" min="1" max="10" value={pigmentation}
                                    onChange={(e) => setPigmentation(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitDisabled}
                        className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        프로필 저장 및 분석 준비 완료
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SurveyModal;
