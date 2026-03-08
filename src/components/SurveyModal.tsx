import React, { useState, useEffect } from 'react';
import { User, Globe, AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

export interface UserProfile {
    gender: 'female' | 'male' | 'other';
    age: string;
    race: string;
    climate: string;
    skinConcerns: {
        dryness: number;
        sensitivity: number;
        pigmentation: number;
    };
    primaryConcern?: 'acne' | 'aging' | 'pigmentation' | 'pores' | 'redness' | '';
}

interface SurveyModalProps {
    isOpen: boolean;
    onComplete: (profile: UserProfile) => void;
    initialData?: UserProfile | null;
}

const SurveyModal: React.FC<SurveyModalProps> = ({ isOpen, onComplete, initialData }) => {
    const { t } = useI18n();
    const [gender, setGender] = useState<'female' | 'male' | 'other'>('female');
    const [age, setAge] = useState<string>('');
    const [race, setRace] = useState<string>('');
    const [climate, setClimate] = useState<string>('');
    const [primaryConcern, setPrimaryConcern] = useState<'acne' | 'aging' | 'pigmentation' | 'pores' | 'redness' | ''>('');

    // 0-10 Scale for self-assessment like Baumann
    const [dryness, setDryness] = useState<number>(5);
    const [sensitivity, setSensitivity] = useState<number>(5);
    const [pigmentation, setPigmentation] = useState<number>(5);

    useEffect(() => {
        if (isOpen && initialData) {
            setGender(initialData.gender || 'female');
            setAge(initialData.age);
            setRace(initialData.race);
            setClimate(initialData.climate);
            setDryness(initialData.skinConcerns?.dryness ?? 5);
            setSensitivity(initialData.skinConcerns?.sensitivity ?? 5);
            setPigmentation(initialData.skinConcerns?.pigmentation ?? 5);
            setPrimaryConcern(initialData.primaryConcern || '');
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onComplete({
            gender,
            age,
            race,
            climate,
            primaryConcern,
            skinConcerns: { dryness, sensitivity, pigmentation }
        });
    };

    if (!isOpen) return null;

    const isSubmitDisabled = !age || !race || !climate || !primaryConcern;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex justify-center items-start sm:items-center p-4 overflow-y-auto">
            <div className="bg-[#162031] w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl p-6 sm:p-8 my-auto animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                    <User className="text-cyan-400" size={24} />
                    <h2 className="text-xl font-bold text-white">{t.survey.title}</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Demographics */}
                    <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <h3 className="text-sm font-semibold text-cyan-300 flex items-center gap-2 mb-3">
                            <Globe size={16} /> {t.survey.exposomeTitle}
                        </h3>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-slate-400 font-medium">{t.survey.genderLabel}</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value as any)}
                                className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                                required
                            >
                                <option value="female">{t.survey.genderFemale}</option>
                                <option value="male">{t.survey.genderMale}</option>
                                <option value="other">{t.survey.genderOther}</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-slate-400 font-medium">{t.survey.ageLabel}</label>
                            <select
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                                required
                            >
                                <option value="" disabled>{t.survey.selectPlaceholder}</option>
                                <option value="10s">{t.survey.age10s}</option>
                                <option value="20s">{t.survey.age20s}</option>
                                <option value="30s">{t.survey.age30s}</option>
                                <option value="40s">{t.survey.age40s}</option>
                                <option value="50s_plus">{t.survey.age50sPlus}</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-slate-400 font-medium">{t.survey.raceLabel}</label>
                            <select
                                value={race}
                                onChange={(e) => setRace(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                                required
                            >
                                <option value="" disabled>{t.survey.selectPlaceholder}</option>
                                <option value="asian">{t.survey.raceAsian}</option>
                                <option value="caucasian">{t.survey.raceCaucasian}</option>
                                <option value="african">{t.survey.raceAfrican}</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-slate-400 font-medium">{t.survey.climateLabel}</label>
                            <select
                                value={climate}
                                onChange={(e) => setClimate(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                                required
                            >
                                <option value="" disabled>{t.survey.selectPlaceholder}</option>
                                <option value="dry">{t.survey.climateDry}</option>
                                <option value="humid">{t.survey.climateHumid}</option>
                                <option value="temperate">{t.survey.climateTemperate}</option>
                            </select>
                        </div>
                    </div>

                    {/* Self Assessment (Baumann inspired) */}
                    <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                                <AlertCircle size={16} /> {t.survey.selfAssessment}
                            </h3>
                            <span className="text-[10px] text-slate-500">{t.survey.scaleLowHigh}</span>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300">{t.survey.drynessLabel}</span>
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
                                    <span className="text-slate-300">{t.survey.sensitivityLabel}</span>
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
                                    <span className="text-slate-300">{t.survey.pigmentationLabel}</span>
                                    <span className="text-yellow-400 font-bold">{pigmentation}</span>
                                </div>
                                <input
                                    type="range" min="1" max="10" value={pigmentation}
                                    onChange={(e) => setPigmentation(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                />
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                                    <AlertCircle size={14} className="text-red-400" />
                                    {t.survey.primaryConcernLabel}
                                </label>
                                <select
                                    value={primaryConcern}
                                    onChange={(e) => setPrimaryConcern(e.target.value as any)}
                                    className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition mt-1"
                                    required
                                >
                                    <option value="" disabled>{t.survey.selectPlaceholder}</option>
                                    <option value="acne">{t.survey.concernAcne}</option>
                                    <option value="aging">{t.survey.concernAging}</option>
                                    <option value="pigmentation">{t.survey.concernPigmentation}</option>
                                    <option value="pores">{t.survey.concernPores}</option>
                                    <option value="redness">{t.survey.concernRedness}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitDisabled}
                        className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t.survey.submitButton}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SurveyModal;
