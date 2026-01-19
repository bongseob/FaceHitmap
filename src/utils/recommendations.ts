export interface Ingredient {
    name: string;
    description: string;
    benefit: string;
}

export const INGREDIENT_LIBRARY: Record<string, Ingredient> = {
    HYALURONIC_ACID: {
        name: '히알루론산',
        description: '강력한 수분 유지력을 가진 천연 보습 인자',
        benefit: '속건조 해결'
    },
    CERAMIDE: {
        name: '세라마이드',
        description: '피부 장벽을 구성하는 핵심 성분',
        benefit: '장벽 강화'
    },
    PANTHENOL: {
        name: '판테놀 (비타민 B5)',
        description: '피부 재생 및 진정 효과가 뛰어난 보습 성분',
        benefit: '피부 진정'
    },
    NIACINAMIDE: {
        name: '나이아신아마이드',
        description: '미백 및 유수분 밸런스 조절',
        benefit: '톤 개선/밸런싱'
    },
    CENTELLA: {
        name: '병풀 추출물 (Cica)',
        description: '자극받은 피부를 진정시키고 재생을 도움',
        benefit: '진정/회복'
    },
    GLYCERIN: {
        name: '글리세린',
        description: '기초적인 수분 공급과 보습막 형성',
        benefit: '기초 보습'
    },
    SQUALANE: {
        name: '스쿠알란',
        description: '피부 보호막 형성과 매끄러운 피부결',
        benefit: '영양 공급'
    }
};

export const getRecommendedIngredients = (hydrationData: Record<string, number>): Ingredient[] => {
    const values = Object.values(hydrationData);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    const recommendations: Ingredient[] = [];

    // Deep Hydration (Very Dry)
    if (avg < 30) {
        recommendations.push(INGREDIENT_LIBRARY.HYALURONIC_ACID);
        recommendations.push(INGREDIENT_LIBRARY.CERAMIDE);
        recommendations.push(INGREDIENT_LIBRARY.GLYCERIN);
    }
    // Standard Care
    else if (avg < 60) {
        recommendations.push(INGREDIENT_LIBRARY.PANTHENOL);
        recommendations.push(INGREDIENT_LIBRARY.NIACINAMIDE);
        recommendations.push(INGREDIENT_LIBRARY.SQUALANE);
    }
    // Maintenance & Soothing
    else {
        recommendations.push(INGREDIENT_LIBRARY.CENTELLA);
        recommendations.push(INGREDIENT_LIBRARY.PANTHENOL);
    }

    // Region specific logic (Example: T-Zone balancing)
    const tZone = hydrationData['t_zone'] || hydrationData['nose'] || 0;
    if (tZone > 60 && avg < 40) {
        // Combination skin logic
        if (!recommendations.includes(INGREDIENT_LIBRARY.NIACINAMIDE)) {
            recommendations.push(INGREDIENT_LIBRARY.NIACINAMIDE);
        }
    }

    return recommendations.slice(0, 3); // Return top 3
};
