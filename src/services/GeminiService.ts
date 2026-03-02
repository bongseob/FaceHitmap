import { GoogleGenerativeAI } from "@google/generative-ai";
import { SensorData } from '../utils/constants';
import { UserProfile } from '../components/SurveyModal';
import { Locale } from '../i18n/types';
import ko from '../i18n/locales/ko';
import en from '../i18n/locales/en';
import zh from '../i18n/locales/zh';
import ja from '../i18n/locales/ja';

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
    locale: Locale = 'ko'
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
            `
            : "No specific demographic data provided.";

        const prompt = `
      You are a world-class dermatologist and skincare expert consulting a patient.
      Based on the following objective data and subjective self-assessment:
      
      [Objective Hardware Data]
      Face Type: ${faceType || 'Oval'}
      Hydration/Sebum %: ${JSON.stringify(hydrationData)}
      
      ${profileContext}

      Please provide a highly professional, expert "Prescription/Consultation Report" (AI Recommendation Reason) in ${LANGUAGE_NAMES[locale]} (approx. 250-300 characters).
      - Act as a doctor giving a direct prescription. Use a professional and encouraging medical tone.
      - First, classify the innate skin type (Alipic, Normal, Oily) using sebum data, then state the acquired state (Dryness, Sensitivity, etc) using the climate and self-assessment data.
      - Briefly explain why this diagnosis is made considering their age, race, and climate context.
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
