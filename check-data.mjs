// check-data.mjs
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import dotenv from "dotenv";

// .env.local 파일에서 설정 로드
dotenv.config({ path: ".env.local" });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getLatestMeasurements() {
    console.log("🔍 최신 측정 데이터 5개를 불러오는 중...\n");
    const q = query(collection(db, "measurements"), orderBy("timestamp", "desc"), limit(5));

    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            console.log("❌ 저장된 데이터가 없습니다.");
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = new Date(data.timestamp).toLocaleString();
            console.log(`[ID: ${doc.id}] - ${date}`);
            console.log(JSON.stringify(data, null, 2));
            console.log("\n" + "=".repeat(50) + "\n");
        });
    } catch (e) {
        console.error("❌ 에러 발생:", e.message);
    }
}

getLatestMeasurements();
