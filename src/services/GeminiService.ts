import { GoogleGenerativeAI } from "@google/generative-ai";
import { SensorData } from '../utils/constants';

// Note: In a real production app, the API key should be handled securely on the server-side
// or via environment variables. For this demo, we use a placeholder or check for window.ENV
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

export const getAIRecommendation = async (hydrationData: Record<string, SensorData>, faceType: string | null): Promise<string> => {
    if (!API_KEY) {
        // Fallback simulation if no API key is provided
        return simulateAIResponse(hydrationData, faceType);
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      You are a professional skincare AI assistant. 
      Based on the following facial hydration and sebum (oil) data (percentage):
      ${JSON.stringify(hydrationData)}
      And the detected face type: ${faceType || 'Oval'}

      Please provide a concise and expert "AI Recommendation Reason" in Korean (approx. 200 characters).
      - Analyze which regions are dry (low moisture), oily (high sebum), or balanced.
      - Diagnose the comprehensive skin type (e.g. Dry, Oily, Combination, Dehydrated Oily).
      - Suggest specific care based on the data.
      - Sound premium, professional, and encouraging.
      - Return only the text.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        return simulateAIResponse(hydrationData, faceType);
    }
};

const simulateAIResponse = (hydrationData: Record<string, SensorData>, faceType: string | null): string => {
    const values = Object.values(hydrationData);
    const avgMoisture = values.reduce((a, b) => a + b.moisture, 0) / values.length;
    const avgSebum = values.reduce((a, b) => a + b.sebum, 0) / values.length;

    if (avgMoisture < 40 && avgSebum > 60) {
        return `측정 결과, 전반적인 수분은 부족하나 유분 분비가 많은 전형적인 '수분 부족 지성(수부지)' 피부입니다. 피지 조절과 함께 산뜻한 수분 공급이 필요합니다. 모공을 막지 않는 가벼운 제형의 수분 크림과 나이아신아마이드 성분을 추천합니다.`;
    } else if (avgMoisture < 40 && avgSebum < 40) {
        return `측정 결과, 수분과 유분이 모두 현저히 부족한 '건성' 피부입니다. 강력한 수분 공급과 더불어 수분이 날아가지 않도록 세라마이드, 스쿠알란 등을 함유한 고보습 크림으로 탄탄한 보습막을 형성해야 합니다.`;
    } else if (avgSebum > 60) {
        return `유분량이 다소 높은 '지성' 피부 상태입니다. ${faceType || '계란형'} 얼굴형의 윤곽을 살리면서 번들거림을 잡기 위해, 피지 분비를 조절해 주는 성분을 중심으로 가벼운 스킨케어 단계를 유지해 주세요.`;
    } else {
        return `수분과 유분 밸런스가 매우 이상적인 훌륭한 피부 상태입니다! 현재의 스킨케어 루틴을 잘 유지하시되, 진정 성분이 포함된 가벼운 케어로 외부 자극을 예방해 주시면 더욱 빛나는 광채 피부를 완성할 수 있습니다.`;
    }
};
