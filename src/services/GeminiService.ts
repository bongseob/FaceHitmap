import { GoogleGenerativeAI } from "@google/generative-ai";

// Note: In a real production app, the API key should be handled securely on the server-side
// or via environment variables. For this demo, we use a placeholder or check for window.ENV
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

export const getAIRecommendation = async (hydrationData: Record<string, number>, faceType: string | null): Promise<string> => {
    if (!API_KEY) {
        // Fallback simulation if no API key is provided
        return simulateAIResponse(hydrationData, faceType);
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      You are a professional skincare AI assistant. 
      Based on the following facial hydration data (percentage):
      ${JSON.stringify(hydrationData)}
      And the detected face type: ${faceType || 'Oval'}

      Please provide a concise and expert "AI Recommendation Reason" in Korean (approx. 200 characters).
      - Analyze which regions are dry or balanced.
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

const simulateAIResponse = (hydrationData: Record<string, number>, faceType: string | null): string => {
    const avg = Object.values(hydrationData).reduce((a, b) => a + b, 0) / Object.values(hydrationData).length;

    if (avg < 40) {
        return `측정 결과, 전반적인 수분도가 매우 낮아 집중적인 '속건조' 케어가 시급합니다. 특히 건조함이 심한 부위를 중심으로 히알루론산 고농축 앰플 사용을 권장하며, 세라마이드 성분으로 장벽을 보강해 수분 이탈을 막아주세요. ${faceType || '계란형'} 얼굴형의 윤곽을 살리는 수분 마사지가 도움이 됩니다.`;
    } else if (avg < 60) {
        return `정상 범위에 근접해 있으나 부위별 편차가 존재합니다. T존의 유수분 밸런스를 맞추면서 볼 부위의 보습막을 유지하는 것이 핵심입니다. 가벼운 수분 젤과 나이아신아마이드 성분을 조합하여 매끄러운 피부 결을 완성해 보세요.`;
    } else {
        return `매우 우수한 수분 보유력을 유지하고 계십니다! 현재의 스킨케어 루틴을 유지하시되, 외부 자극으로부터 피부를 보호하기 위해 진정 성분이 포함된 가벼운 로션을 추가해 보세요. 광채를 살려주는 항산화 케어를 병행하면 시너지 효과가 납니다.`;
    }
};
