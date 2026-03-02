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
}

export const INGREDIENT_LIBRARY: Record<string, Ingredient> = {
    // [Base Textures]
    RICH_CREAM: { name: '리치 크림/밤 (Rich Cream/Balm)', description: '오일 베이스의 밀도 높은 크림 제형', benefit: '강력 보습막 수분 이탈 방지' },
    MILD_LOTION: { name: '마일드 로션 (Mild Lotion)', description: '수분과 유분이 적절하게 배합된 에멀전', benefit: '유수분 밸런스 유지' },
    LIGHT_GEL: { name: '수분 젤/세럼 (Light Gel/Serum)', description: '오일 프리 또는 산뜻한 수분 베이스 제형', benefit: '끈적임 없는 수분 공급' },

    // [Active Ingredients]
    HYALURONIC_ACID: { name: '히알루론산', description: '강력한 수분 유지력을 가진 천연 보습 인자', benefit: '속건조 해결' },
    CERAMIDE: { name: '세라마이드', description: '피부 장벽을 구성하는 핵심 성분', benefit: '장벽 강화' },
    PANTHENOL: { name: '판테놀 (비타민 B5)', description: '피부 재생 및 진정 효과가 뛰어난 보습 성분', benefit: '피부 진정' },
    NIACINAMIDE: { name: '나이아신아마이드', description: '미백 및 유수분 밸런스 조절', benefit: '톤 개선/피지 밸런싱' },
    CENTELLA: { name: '병풀 추출물 (Cica)', description: '자극받은 피부를 진정시키고 재생을 도움', benefit: '진정/회복' },
    SQUALANE: { name: '스쿠알란', description: '피부 보호막 형성과 매끄러운 피부결', benefit: '영양 공급' },
    ALLANTOIN: { name: '알란토인', description: '자극 완화 및 피부 보호 (민감성 최적화)', benefit: '저자극 진정' },
    RETINOL: { name: '레티놀 / 펩타이드', description: '콜라겐 합성 촉진 및 주름 개선', benefit: '안티에이징' },
    VITAMIN_C: { name: '비타민 C 유도체', description: '멜라닌 색소 억제 및 항산화 작용', benefit: '색소침착 완화' },
    BAKUCHIOL: { name: '바쿠치올', description: '자극이 적은 식물성 안티에이징 성분', benefit: '민감성 안티에이징' }
};

export const getAdvancedRecommendations = (hydrationData: Record<string, SensorData>, profile?: UserProfile | null): RecommendationResult => {
    const defaultResult: RecommendationResult = {
        baseTexture: [INGREDIENT_LIBRARY.MILD_LOTION],
        activeIngredients: [INGREDIENT_LIBRARY.PANTHENOL, INGREDIENT_LIBRARY.CERAMIDE],
        primaryType: 'Normal',
        secondaryConditions: []
    };

    const values = Object.values(hydrationData);
    if (values.length === 0) return defaultResult;

    let avgMoisture = values.reduce((a, b) => a + b.moisture, 0) / values.length;
    let avgSebum = values.reduce((a, b) => a + b.sebum, 0) / values.length;

    // --- 1차 분류: 선천적 피부 판별 엔진 (Alipic, Normal, Oily) ---
    // 하드웨어 측정된 T/U존 피지량 베이스
    let primaryType = 'Normal';
    let baseTexture: Ingredient[] = [];

    if (avgSebum < 35) {
        primaryType = 'Alipic (건성 베이스)';
        baseTexture = [INGREDIENT_LIBRARY.RICH_CREAM];
    } else if (avgSebum > 60) {
        primaryType = 'Oily (지성 베이스)';
        baseTexture = [INGREDIENT_LIBRARY.LIGHT_GEL];
    } else {
        primaryType = 'Normal (중성 베이스)';
        baseTexture = [INGREDIENT_LIBRARY.MILD_LOTION];
    }

    // --- 2차 분류: 후천적 / 환경 요인 분석 엔진 ---
    const activeIngredients: Ingredient[] = [];
    const secondaryConditions: string[] = [];

    // 설문 및 인구통계학 정보 파싱
    const ageGroup = profile?.age || '';
    const race = profile?.race || '';
    const climate = profile?.climate || '';
    const drynessScale = profile?.skinConcerns?.dryness || 5;
    const sensitivityScale = profile?.skinConcerns?.sensitivity || 5;
    const pigmentationScale = profile?.skinConcerns?.pigmentation || 5;

    // 2-1. 건조감/장벽 (Dryness & Barrier)
    if (avgMoisture < 40 || drynessScale >= 7 || climate === 'dry') {
        secondaryConditions.push('Dehydrated (수분부족/건조)');
        activeIngredients.push(INGREDIENT_LIBRARY.HYALURONIC_ACID);
        activeIngredients.push(INGREDIENT_LIBRARY.CERAMIDE);
    } else if (drynessScale > 4) {
        activeIngredients.push(INGREDIENT_LIBRARY.PANTHENOL);
    }

    // 2-2. 민감도 (Sensitivity)
    if (sensitivityScale >= 7) {
        secondaryConditions.push('Sensitive (민감성)');
        activeIngredients.push(INGREDIENT_LIBRARY.CENTELLA);
        activeIngredients.push(INGREDIENT_LIBRARY.ALLANTOIN);
    }

    // 2-3. 색소침착 (Pigmentation / Race effect)
    // 동양인은 색소침착에 상대적으로 취약, 백인은 붉은기/주름에 취약 (간단한 로직화)
    if (pigmentationScale >= 7 || (race === 'asian' && pigmentationScale >= 5)) {
        secondaryConditions.push('Pigmented (색소침착 주의)');
        activeIngredients.push(INGREDIENT_LIBRARY.VITAMIN_C);
        activeIngredients.push(INGREDIENT_LIBRARY.NIACINAMIDE); // 다목적
    }

    // 2-4. 노화 (Aging / Age effect)
    if (ageGroup === '30s' || ageGroup === '40s' || ageGroup === '50s_plus') {
        secondaryConditions.push('Aging (노화 방지)');
        // 민감도가 높으면 레티놀 대신 바쿠치올 추천
        if (sensitivityScale >= 7) {
            activeIngredients.push(INGREDIENT_LIBRARY.BAKUCHIOL);
        } else {
            activeIngredients.push(INGREDIENT_LIBRARY.RETINOL);
        }
    }

    // 2-5. 복합성 특수 예외 처리 (T-Zone 측정치 활용)
    const tZoneSebum = Math.max(hydrationData['t_zone']?.sebum || 0, hydrationData['nose']?.sebum || 0);
    if (tZoneSebum > 65 && avgSebum < 50) {
        secondaryConditions.push('Combination (T존 유분과다)');
        if (!activeIngredients.includes(INGREDIENT_LIBRARY.NIACINAMIDE)) {
            activeIngredients.push(INGREDIENT_LIBRARY.NIACINAMIDE); // 피지 조절 위해 투입
        }
    }

    // 중복 제거 후 최대 4개까지만 반환
    const uniqueActives = Array.from(new Set(activeIngredients)).slice(0, 4);

    // 최소 1개 보장
    if (uniqueActives.length === 0) {
        uniqueActives.push(INGREDIENT_LIBRARY.PANTHENOL);
    }

    return {
        baseTexture,
        activeIngredients: uniqueActives,
        primaryType,
        secondaryConditions
    };
};
