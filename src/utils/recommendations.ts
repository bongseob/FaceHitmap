import { SensorData } from './constants';
import { UserProfile } from '../components/SurveyModal';

export interface Ingredient {
    name: string;
    description: string;
    benefit: string;
}

export interface RecommendationResult {
    baseTexture: Ingredient[];
    activeIngredients: Ingredient[];
    primaryType: string;
    secondaryConditions: string[];
    toneAnalysis?: {
        evenness: number;
        redness: number;
    };
}

// Locale-aware ingredient library builder
// We keep keys constant and build localised labels on-the-fly using the
// translation dictionaries.  However, because `recommendations.ts` is a
// pure utility (no React hooks), we import dictionaries directly.
import { Locale } from '../i18n/types';
import ko from '../i18n/locales/ko';
import en from '../i18n/locales/en';
import zh from '../i18n/locales/zh';
import ja from '../i18n/locales/ja';
import { SkinToneResult } from './skinToneAnalysis';

const dicts = { ko, en, zh, ja };

function buildIngredientLibrary(locale: Locale = 'ko') {
    const t = dicts[locale].recommendations;
    return {
        RICH_CREAM: { name: t.richCreamName, description: t.richCreamDesc, benefit: t.richCreamBenefit },
        MILD_LOTION: { name: t.mildLotionName, description: t.mildLotionDesc, benefit: t.mildLotionBenefit },
        LIGHT_GEL: { name: t.lightGelName, description: t.lightGelDesc, benefit: t.lightGelBenefit },
        HYALURONIC_ACID: { name: t.hyaluronicAcidName, description: t.hyaluronicAcidDesc, benefit: t.hyaluronicAcidBenefit },
        CERAMIDE: { name: t.ceramideName, description: t.ceramideDesc, benefit: t.ceramideBenefit },
        PANTHENOL: { name: t.panthenolName, description: t.panthenolDesc, benefit: t.panthenolBenefit },
        NIACINAMIDE: { name: t.niacinamideName, description: t.niacinamideDesc, benefit: t.niacinamideBenefit },
        CENTELLA: { name: t.centellaName, description: t.centellaDesc, benefit: t.centellaBenefit },
        SQUALANE: { name: t.squalaneName, description: t.squalaneDesc, benefit: t.squalaneBenefit },
        ALLANTOIN: { name: t.allantoinName, description: t.allantoinDesc, benefit: t.allantoinBenefit },
        RETINOL: { name: t.retinolName, description: t.retinolDesc, benefit: t.retinolBenefit },
        VITAMIN_C: { name: t.vitaminCName, description: t.vitaminCDesc, benefit: t.vitaminCBenefit },
        BAKUCHIOL: { name: t.bakuchiolName, description: t.bakuchiolDesc, benefit: t.bakuchiolBenefit },
    };
}

// Default library for backward compatibility
export const INGREDIENT_LIBRARY = buildIngredientLibrary('ko');

export const getAdvancedRecommendations = (
    hydrationData: Record<string, SensorData>,
    profile?: UserProfile | null,
    locale: Locale = 'ko',
    toneData?: SkinToneResult | null
): RecommendationResult => {
    const lib = buildIngredientLibrary(locale);
    const t = dicts[locale].recommendations;

    const defaultResult: RecommendationResult = {
        baseTexture: [lib.MILD_LOTION],
        activeIngredients: [lib.PANTHENOL, lib.CERAMIDE],
        primaryType: 'Normal',
        secondaryConditions: []
    };

    const values = Object.values(hydrationData);
    if (values.length === 0) return defaultResult;

    let avgMoisture = values.reduce((a, b) => a + b.moisture, 0) / values.length;
    let avgSebum = values.reduce((a, b) => a + b.sebum, 0) / values.length;

    // --- Stage 1: Innate Skin Classification ---
    let primaryType = 'Normal';
    let baseTexture: Ingredient[] = [];

    if (avgSebum < 35) {
        primaryType = t.alipic;
        baseTexture = [lib.RICH_CREAM];
    } else if (avgSebum > 60) {
        primaryType = t.oily;
        baseTexture = [lib.LIGHT_GEL];
    } else {
        primaryType = t.normal;
        baseTexture = [lib.MILD_LOTION];
    }

    // --- Stage 2: Acquired / Environmental Analysis ---
    const activeIngredients: Ingredient[] = [];
    const secondaryConditions: string[] = [];

    const ageGroup = profile?.age || '';
    const race = profile?.race || '';
    const climate = profile?.climate || '';
    const drynessScale = profile?.skinConcerns?.dryness || 5;
    const sensitivityScale = profile?.skinConcerns?.sensitivity || 5;
    const pigmentationScale = profile?.skinConcerns?.pigmentation || 5;

    // 2-1. Dryness & Barrier
    if (avgMoisture < 40 || drynessScale >= 7 || climate === 'dry') {
        secondaryConditions.push('Dehydrated');
        activeIngredients.push(lib.HYALURONIC_ACID);
        activeIngredients.push(lib.CERAMIDE);
    } else if (drynessScale > 4) {
        activeIngredients.push(lib.PANTHENOL);
    }

    // 2-2. Sensitivity
    if (sensitivityScale >= 7) {
        secondaryConditions.push('Sensitive');
        activeIngredients.push(lib.CENTELLA);
        activeIngredients.push(lib.ALLANTOIN);
    }

    // 2-3. Pigmentation
    if (pigmentationScale >= 7 || (race === 'asian' && pigmentationScale >= 5)) {
        secondaryConditions.push('Pigmented');
        activeIngredients.push(lib.VITAMIN_C);
        activeIngredients.push(lib.NIACINAMIDE);
    }

    // 2-4. Aging
    if (ageGroup === '30s' || ageGroup === '40s' || ageGroup === '50s_plus') {
        secondaryConditions.push('Aging');
        if (sensitivityScale >= 7) {
            activeIngredients.push(lib.BAKUCHIOL);
        } else {
            activeIngredients.push(lib.RETINOL);
        }
    }

    // 2-6. Tone & Redness (Visual Analytics)
    if (toneData) {
        if (toneData.averageRedness >= 40) {
            if (!secondaryConditions.includes('Sensitive')) {
                secondaryConditions.push('Sensitive');
            }
            secondaryConditions.push('Redness');
            activeIngredients.push(lib.CENTELLA);
            activeIngredients.push(lib.ALLANTOIN);
        }

        if (toneData.averageEvenness <= 65) {
            secondaryConditions.push('Uneven Tone');
            activeIngredients.push(lib.VITAMIN_C);
            activeIngredients.push(lib.NIACINAMIDE);
        }
    }

    // Deduplicate and limit to 4
    const seen = new Set<string>();
    const uniqueActives = activeIngredients.filter(i => {
        if (seen.has(i.name)) return false;
        seen.add(i.name);
        return true;
    }).slice(0, 4);

    if (uniqueActives.length === 0) {
        uniqueActives.push(lib.PANTHENOL);
    }

    return {
        baseTexture,
        activeIngredients: uniqueActives,
        primaryType,
        secondaryConditions,
        toneAnalysis: toneData ? {
            evenness: toneData.averageEvenness,
            redness: toneData.averageRedness
        } : undefined
    };
};
