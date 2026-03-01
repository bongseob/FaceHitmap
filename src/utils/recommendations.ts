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

import { SensorData } from './constants';

export const getRecommendedIngredients = (hydrationData: Record<string, SensorData>): Ingredient[] => {
    const values = Object.values(hydrationData);
    if (values.length === 0) return [];

    const avgMoisture = values.reduce((a, b) => a + b.moisture, 0) / values.length;
    const avgSebum = values.reduce((a, b) => a + b.sebum, 0) / values.length;

    const recommendations: Ingredient[] = [];

    // 1. 수분 부족 지성 (수부지): 수분 부족 + 유분 과다
    if (avgMoisture < 40 && avgSebum > 60) {
        recommendations.push(INGREDIENT_LIBRARY.HYALURONIC_ACID); // 속건조
        recommendations.push(INGREDIENT_LIBRARY.NIACINAMIDE); // 피지 조절
        recommendations.push(INGREDIENT_LIBRARY.PANTHENOL); // 진정
    }
    // 2. 건성 피부: 수분 부족 + 유분 부족
    else if (avgMoisture < 40 && avgSebum < 40) {
        recommendations.push(INGREDIENT_LIBRARY.CERAMIDE); // 장벽 강화
        recommendations.push(INGREDIENT_LIBRARY.SQUALANE); // 영양 공급
        recommendations.push(INGREDIENT_LIBRARY.GLYCERIN); // 딥 수분
    }
    // 3. 지성 피부: 유분 과다 (수분 양호)
    else if (avgSebum > 60) {
        recommendations.push(INGREDIENT_LIBRARY.NIACINAMIDE); // 피지 밸런스
        recommendations.push(INGREDIENT_LIBRARY.CENTELLA); // 진정
        recommendations.push(INGREDIENT_LIBRARY.PANTHENOL); // 가벼운 수분
    }
    // 4. 일반 복합성 / 유지 상태
    else {
        recommendations.push(INGREDIENT_LIBRARY.PANTHENOL);
        recommendations.push(INGREDIENT_LIBRARY.CENTELLA);
        recommendations.push(INGREDIENT_LIBRARY.CERAMIDE);
    }

    // T-Zone specific logic (복합성 감지 보강)
    const tZone = hydrationData['t_zone'];
    const nose = hydrationData['nose'];
    const tZoneSebum = Math.max(tZone?.sebum || 0, nose?.sebum || 0);

    if (tZoneSebum > 60 && avgSebum < 50) {
        // 얼굴 전체 유분은 적은데 T존만 유분이 많은 전형적 복합성
        if (!recommendations.includes(INGREDIENT_LIBRARY.NIACINAMIDE)) {
            recommendations.push(INGREDIENT_LIBRARY.NIACINAMIDE);
        }
    }

    // 중복 제거 및 상위 3개 반환
    return Array.from(new Set(recommendations)).slice(0, 3);
};
