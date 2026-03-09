import { GoogleGenerativeAI } from "@google/generative-ai";
import { SensorData } from '../utils/constants';
import { UserProfile } from '../components/SurveyModal';
import { Locale } from '../i18n/types';
import ko from '../i18n/locales/ko';
import en from '../i18n/locales/en';
import zh from '../i18n/locales/zh';
import ja from '../i18n/locales/ja';
import { SkinToneResult } from "../utils/skinToneAnalysis";

const dictionaries = { ko, en, zh, ja };

const LANGUAGE_NAMES: Record<Locale, string> = {
    ko: 'Korean',
    en: 'English',
    zh: 'Simplified Chinese',
    ja: 'Japanese',
};

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

export const getAIRecommendation = async (
    hydrationData: Record<string, SensorData>,
    faceType: string | null,
    userProfile?: UserProfile | null,
    locale: Locale = 'ko',
    toneData?: SkinToneResult | null
): Promise<string> => {
    if (!API_KEY) {
        return simulateAIResponse(hydrationData, faceType, userProfile, locale);
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const profileContext = userProfile
            ? `
            [Target User Profile]
            - Age: ${userProfile.age}
            - Ethnicity/Race: ${userProfile.race}
            - Climate: ${userProfile.climate}
            - Self-assessment [Scale 1-10]: Dryness(${userProfile.skinConcerns.dryness}), Sensitivity(${userProfile.skinConcerns.sensitivity}), Pigmentation(${userProfile.skinConcerns.pigmentation})
            - Primary Goal to Resolve: ${userProfile.primaryConcern || 'None specified'}
            `
            : "No specific demographic data provided.";

        const prompt = `
      You are a world-class dermatologist and skincare expert consulting a patient.
      Based on the following objective data and subjective self-assessment:
      
      [Objective Hardware Data]
      Face Type: ${faceType || 'Oval'}
      Hydration/Sebum %: ${JSON.stringify(hydrationData)}
      [Visual Analysis Data]
      Redness Score: ${toneData?.averageRedness || 'N/A'} (0-100)
      Tone Evenness: ${toneData?.averageEvenness || 'N/A'} (0-100)
      Region Lab Data: ${toneData ? JSON.stringify(toneData.regions) : 'N/A'}
      
      ${profileContext}

      Please provide a highly professional, expert "Prescription/Consultation Report" (AI Recommendation Reason) in ${LANGUAGE_NAMES[locale]} (approx. 250-300 characters).
      - Act as a doctor giving a direct prescription. Use a professional and encouraging medical tone.
      - First, classify the innate skin type (Alipic, Normal, Oily) using sebum data, then state the acquired state (Dryness, Sensitivity, Redness, etc) using the climate, self-assessment, and visual data (Redness Score/Evenness).
      - Briefly explain why this diagnosis is made considering their age, race, and climate context, and how it correlates with the visual redness/unevenness seen in the scan.
      - CRITICAL: Must focus your advice on solving their [Primary Goal to Resolve] if provided.
      - Suggest what kind of base texture (cream, gel, etc) and active ingredients they need based on this combo.
      - Return ONLY the consultation text without any markdown tags.
      - ${dictionaries[locale].gemini.responseLanguage}
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        return simulateAIResponse(hydrationData, faceType, userProfile, locale);
    }
};

const simulateAIResponse = (
    hydrationData: Record<string, SensorData>,
    faceType: string | null,
    userProfile?: UserProfile | null,
    locale: Locale = 'ko'
): string => {
    const t = dictionaries[locale];
    const values = Object.values(hydrationData);
    const avgMoisture = values.reduce((a, b) => a + b.moisture, 0) / values.length;
    const avgSebum = values.reduce((a, b) => a + b.sebum, 0) / values.length;

    if (avgMoisture < 40 && avgSebum > 60) {
        return t.gemini.dehydratedOilyFallback;
    } else if (avgMoisture < 40 && avgSebum < 40) {
        return t.gemini.dryFallback;
    } else if (avgSebum > 60) {
        return t.gemini.oilyFallback;
    } else {
        return t.gemini.balancedFallback;
    }
};

// ─── Skincare Routine ───────────────────────────────

export interface RoutineStep {
    order: number;
    step: string;
    product: string;
    ingredient: string;
    tip: string;
}

export interface InnerBeautyAdvice {
    nutrient: string;
    foods: string[];
    advice: string;
    warning: string;
}

export interface SkincareRoutine {
    morning: RoutineStep[];
    evening: RoutineStep[];
    innerBeauty: InnerBeautyAdvice;
}

export const getSkincareRoutine = async (
    hydrationData: Record<string, SensorData>,
    faceType: string | null,
    userProfile?: UserProfile | null,
    locale: Locale = 'ko',
    toneData?: SkinToneResult | null
): Promise<SkincareRoutine> => {
    if (!API_KEY) {
        return fallbackRoutine(hydrationData, locale);
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const values = Object.values(hydrationData);
        const avgMoisture = values.reduce((a, b) => a + b.moisture, 0) / values.length;
        const avgSebum = values.reduce((a, b) => a + b.sebum, 0) / values.length;

        const profileContext = userProfile
            ? `Age: ${userProfile.age}, Race: ${userProfile.race}, Climate: ${userProfile.climate}, Dryness: ${userProfile.skinConcerns.dryness}/10, Sensitivity: ${userProfile.skinConcerns.sensitivity}/10, Pigmentation: ${userProfile.skinConcerns.pigmentation}/10, Primary Goal: ${userProfile.primaryConcern || 'None'}`
            : "No profile data.";

        const prompt = `
You are a skincare expert. Based on the following data, generate a personalized morning and evening skincare routine.

[Data]
- Average Moisture: ${Math.round(avgMoisture)}%
- Average Sebum: ${Math.round(avgSebum)}%
- Face Type: ${faceType || 'Oval'}
- Skin Redness: ${toneData?.averageRedness || 'N/A'}/100
- Tone Evenness: ${toneData?.averageEvenness || 'N/A'}/100
- Profile: ${profileContext}

CRITICAL INSTRUCTION: Tailor the routine specifically to address their "Primary Goal" and the visual issues (Redness if high, Unevenness if low).

Respond ONLY with valid JSON (no markdown, no code fences) in this exact format:
{
  "morning": [
    {"order": 1, "step": "step name", "product": "recommended product type", "ingredient": "key ingredient", "tip": "usage tip"}
  ],
  "evening": [
    {"order": 1, "step": "step name", "product": "recommended product type", "ingredient": "key ingredient", "tip": "usage tip"}
  ],
  "innerBeauty": {
    "nutrient": "core nutrient name (e.g. Zinc, Vitamin C)",
    "foods": ["food1", "food2"],
    "advice": "one-sentence nutritional tip",
    "warning": "one-sentence dietary warning or allergy note"
  }
}

- Morning routine: 3-5 steps
- Evening routine: 3-5 steps
- ${dictionaries[locale].gemini.responseLanguage}
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        // Strip possible markdown code fences
        const jsonStr = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(jsonStr) as SkincareRoutine;
        return parsed;
    } catch (error) {
        console.error("Gemini Skincare Routine Error:", error);
        return fallbackRoutine(hydrationData, locale);
    }
};

const fallbackRoutine = (
    hydrationData: Record<string, SensorData>,
    locale: Locale
): SkincareRoutine => {
    const isKo = locale === 'ko';
    const isZh = locale === 'zh';
    const isJa = locale === 'ja';

    const values = Object.values(hydrationData);
    const avgMoisture = values.reduce((a, b) => a + b.moisture, 0) / values.length;

    const isDry = avgMoisture < 40;

    if (isKo) {
        return {
            morning: [
                { order: 1, step: '클렌징', product: isDry ? '저자극 클렌징 밀크' : '폼 클렌저', ingredient: isDry ? '세라마이드' : '살리실산', tip: '미지근한 물로 30초간 부드럽게' },
                { order: 2, step: '토너', product: isDry ? '보습 토너' : '수렴 토너', ingredient: isDry ? '히알루론산' : '나이아신아마이드', tip: '손바닥으로 가볍게 패팅' },
                { order: 3, step: '보습 + 자외선 차단', product: isDry ? '수분 크림 + SPF50' : '수분 젤 + SPF50', ingredient: isDry ? '세라마이드' : '알로에', tip: '외출 30분 전 도포' },
            ],
            evening: [
                { order: 1, step: '클렌징', product: isDry ? '클렌징 오일' : '이중 클렌징', ingredient: isDry ? '호호바 오일' : '미셀라 워터', tip: '메이크업을 완전히 제거' },
                { order: 2, step: '토너', product: isDry ? '보습 토너' : '각질 케어 토너', ingredient: isDry ? '히알루론산' : 'AHA/BHA', tip: '코튼 패드로 부드럽게 닦아내기' },
                { order: 3, step: '나이트 크림', product: isDry ? '리치 나이트 크림' : '수분 젤 크림', ingredient: isDry ? '스쿠알란' : '나이아신아마이드', tip: '얼굴 전체에 골고루 도포 후 마사지' },
            ],
            innerBeauty: {
                nutrient: isDry ? '오메가-3' : '아연',
                foods: isDry ? ['연어', '호두'] : ['굴', '호박씨'],
                advice: isDry ? '충분한 수분 섭취와 건강한 지방산은 피부 장벽에 도움이 됩니다.' : '아연은 피지 조절과 피부 진정에 효과적입니다.',
                warning: '알레르기가 있는 식품은 섭취 전 반드시 확인하세요.'
            }
        };
    } else if (isZh) {
        return {
            morning: [
                { order: 1, step: '洁面', product: isDry ? '温和洁面乳' : '泡沫洁面', ingredient: isDry ? '神经酰胺' : '水杨酸', tip: '用温水轻柔清洗30秒' },
                { order: 2, step: '爽肤水', product: isDry ? '保湿爽肤水' : '收敛爽肤水', ingredient: isDry ? '透明质酸' : '烟酰胺', tip: '用手掌轻拍至吸收' },
                { order: 3, step: '保湿+防晒', product: isDry ? '保湿霜+SPF50' : '水凝胶+SPF50', ingredient: isDry ? '神经酰胺' : '芦荟', tip: '出门前30分钟涂抹' },
            ],
            innerBeauty: {
                nutrient: isDry ? '欧米茄-3 (Omega-3)' : '锌 (Zinc)',
                foods: isDry ? ['三文鱼', '核桃'] : ['牡蛎', '南瓜子'],
                advice: isDry ? '摄入足够的水分和健康的脂肪酸有助于修复皮肤屏障。' : '锌对控制皮脂分泌和镇静皮肤非常有效。',
                warning: '请务必在食用前确认是否存在食物过敏。'
            },
            evening: [
                { order: 1, step: '洁面', product: isDry ? '卸妆油' : '双重清洁', ingredient: isDry ? '荷荷巴油' : '胶束水', tip: '彻底卸除彩妆' },
                { order: 2, step: '爽肤水', product: isDry ? '保湿爽肤水' : '去角质爽肤水', ingredient: isDry ? '透明质酸' : 'AHA/BHA', tip: '用化妆棉轻柔擦拭' },
                { order: 3, step: '晚霜', product: isDry ? '滋润晚霜' : '水分凝胶', ingredient: isDry ? '角鲨烷' : '烟酰胺', tip: '均匀涂抹全脸后按摩' },
            ],
        };
    } else if (isJa) {
        return {
            morning: [
                { order: 1, step: 'クレンジング', product: isDry ? '低刺激クレンジングミルク' : 'フォームクレンザー', ingredient: isDry ? 'セラミド' : 'サリチル酸', tip: 'ぬるま湯で30秒間やさしく' },
                { order: 2, step: '化粧水', product: isDry ? '保湿化粧水' : '収れん化粧水', ingredient: isDry ? 'ヒアルロン酸' : 'ナイアシンアミド', tip: '手のひらでやさしくパッティング' },
                { order: 3, step: '保湿+UV', product: isDry ? '保湿クリーム+SPF50' : 'ジェル+SPF50', ingredient: isDry ? 'セラミド' : 'アロエ', tip: '外出30分前に塗布' },
            ],
            innerBeauty: {
                nutrient: isDry ? 'オメガ3' : '亜鉛',
                foods: isDry ? ['サーモン', 'くるみ'] : ['牡蠣', 'かぼちゃの種'],
                advice: isDry ? '十分な水分摂取と健康的な脂肪酸は肌のバリアに役立ちます。' : '亜鉛は皮脂のコントロールと肌の鎮静に効果的です。',
                warning: '食物アレルギーがある場合は、摂取前に必ずご確認ください。'
            },
            evening: [
                { order: 1, step: 'クレンジング', product: isDry ? 'クレンジングオイル' : 'ダブル洗顔', ingredient: isDry ? 'ホホバオイル' : 'ミセラーウォーター', tip: 'メイクを完全に除去' },
                { order: 2, step: '化粧水', product: isDry ? '保湿化粧水' : '角質ケア化粧水', ingredient: isDry ? 'ヒアルロン酸' : 'AHA/BHA', tip: 'コットンでやさしく拭き取り' },
                { order: 3, step: 'ナイトクリーム', product: isDry ? 'リッチナイトクリーム' : '水分ジェルクリーム', ingredient: isDry ? 'スクワラン' : 'ナイアシンアミド', tip: '顔全体に均一に塗布してマッサージ' },
            ],
        };
    } else {
        return {
            morning: [
                { order: 1, step: 'Cleansing', product: isDry ? 'Gentle Cleansing Milk' : 'Foam Cleanser', ingredient: isDry ? 'Ceramide' : 'Salicylic Acid', tip: 'Gently wash with lukewarm water for 30 seconds' },
                { order: 2, step: 'Toner', product: isDry ? 'Hydrating Toner' : 'Astringent Toner', ingredient: isDry ? 'Hyaluronic Acid' : 'Niacinamide', tip: 'Gently pat with palms until absorbed' },
                { order: 3, step: 'Moisturize + SPF', product: isDry ? 'Moisture Cream + SPF50' : 'Hydra Gel + SPF50', ingredient: isDry ? 'Ceramide' : 'Aloe Vera', tip: 'Apply 30 minutes before going out' },
            ],
            innerBeauty: {
                nutrient: isDry ? 'Omega-3' : 'Zinc',
                foods: isDry ? ['Salmon', 'Walnuts'] : ['Oysters', 'Pumpkin Seeds'],
                advice: isDry ? 'Sufficient hydration and healthy fatty acids help maintain the skin barrier.' : 'Zinc is effective for controlling sebum and soothing the skin.',
                warning: 'Check for food allergies before consuming.'
            },
            evening: [
                { order: 1, step: 'Cleansing', product: isDry ? 'Cleansing Oil' : 'Double Cleanse', ingredient: isDry ? 'Jojoba Oil' : 'Micellar Water', tip: 'Completely remove all makeup' },
                { order: 2, step: 'Toner', product: isDry ? 'Hydrating Toner' : 'Exfoliating Toner', ingredient: isDry ? 'Hyaluronic Acid' : 'AHA/BHA', tip: 'Gently wipe with a cotton pad' },
                { order: 3, step: 'Night Cream', product: isDry ? 'Rich Night Cream' : 'Hydra Gel Cream', ingredient: isDry ? 'Squalane' : 'Niacinamide', tip: 'Apply evenly and massage gently' },
            ],
        };
    }
};

// ─── Skin Age ────────────────────────────────────────

export interface SkinAgeResult {
    actualAge: number;
    skinAge: number;
    difference: number;
    verdict: string;
}

const AGE_MAP: Record<string, number> = {
    '10s': 15, 'Teens': 15, '10代 (Teens)': 15, '10-19岁': 15, '10代': 15,
    '20s': 25, '20代 (20s)': 25, '20-29岁': 25, '20代': 25,
    '30s': 35, '30代 (30s)': 35, '30-39岁': 35, '30代': 35,
    '40s': 45, '40代 (40s)': 45, '40-49岁': 45, '40代': 45,
    '50s_plus': 55, '50s+': 55, '50s and above': 55, '50代 이상 (50s+)': 55, '50岁以上': 55, '50代以上': 55,
};

export const getSkinAge = async (
    hydrationData: Record<string, SensorData>,
    userProfile?: UserProfile | null,
    locale: Locale = 'ko',
    toneData?: SkinToneResult | null
): Promise<SkinAgeResult> => {
    const actualAge = userProfile?.age ? (AGE_MAP[userProfile.age] || 30) : 30;

    if (!API_KEY) {
        return fallbackSkinAge(hydrationData, actualAge, locale);
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const values = Object.values(hydrationData);
        const avgMoisture = values.reduce((a, b) => a + b.moisture, 0) / values.length;
        const avgSebum = values.reduce((a, b) => a + b.sebum, 0) / values.length;

        const profileContext = userProfile
            ? `Dryness: ${userProfile.skinConcerns.dryness}/10, Sensitivity: ${userProfile.skinConcerns.sensitivity}/10, Pigmentation: ${userProfile.skinConcerns.pigmentation}/10, Climate: ${userProfile.climate}`
            : "";

        const prompt = `
You are a dermatologist estimating skin age based on measured data.

[Data]
- Actual age: ${actualAge}
- Average Moisture: ${Math.round(avgMoisture)}%
- Average Sebum: ${Math.round(avgSebum)}%
- Visual Redness/Evenness: ${toneData?.averageRedness || 'N/A'}/${toneData?.averageEvenness || 'N/A'}
- ${profileContext}

Estimate the skin age and respond ONLY with valid JSON (no markdown, no code fences):
{
  "skinAge": <number>,
  "verdict": "<one-sentence explanation>"
}

- ${dictionaries[locale].gemini.responseLanguage}
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        const jsonStr = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(jsonStr);

        return {
            actualAge,
            skinAge: parsed.skinAge,
            difference: actualAge - parsed.skinAge,
            verdict: parsed.verdict,
        };
    } catch (error) {
        console.error("Gemini Skin Age Error:", error);
        return fallbackSkinAge(hydrationData, actualAge, locale);
    }
};

const fallbackSkinAge = (
    hydrationData: Record<string, SensorData>,
    actualAge: number,
    locale: Locale
): SkinAgeResult => {
    const t = dictionaries[locale];
    const values = Object.values(hydrationData);
    const avgMoisture = values.reduce((a, b) => a + b.moisture, 0) / values.length;
    const avgSebum = values.reduce((a, b) => a + b.sebum, 0) / values.length;

    // Simple heuristic
    let offset = 0;
    if (avgMoisture > 60) offset -= 3;
    else if (avgMoisture < 30) offset += 3;
    if (avgSebum > 30 && avgSebum < 60) offset -= 2;
    else if (avgSebum > 70) offset += 1;

    const skinAge = Math.max(10, actualAge + offset);
    const difference = actualAge - skinAge;

    let verdict: string;
    if (difference > 0) {
        verdict = t.report.skinAgeYounger.replace('{{diff}}', String(Math.abs(difference)));
    } else if (difference < 0) {
        verdict = t.report.skinAgeOlder.replace('{{diff}}', String(Math.abs(difference)));
    } else {
        verdict = t.report.skinAgeSame;
    }

    return { actualAge, skinAge, difference, verdict };
};
