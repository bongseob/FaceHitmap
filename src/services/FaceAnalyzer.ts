import { FACE_REGIONS } from '../utils/constants';

// Define types to avoid any
export interface SegmentedData {
    [key: string]: { x: number; y: number; z: number };
}

export class FaceAnalyzer {
    private faceMesh: any = null;

    constructor() {
        // MediaPipe is often better loaded via script or dynamic import in Next.js
        if (typeof window !== 'undefined') {
            this.init();
        }
    }

    private async init() {
        // Dynamic import to avoid SSR issues
        const { FaceMesh } = await import('@mediapipe/face_mesh');
        this.faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });
    }

    public async analyze(imageElement: HTMLImageElement | HTMLVideoElement): Promise<{ landmarks: any[], segmentedData: SegmentedData } | null> {
        if (!this.faceMesh) return null;

        return new Promise((resolve) => {
            this.faceMesh.onResults((results: any) => {
                if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                    resolve(null);
                    return;
                }

                const landmarks = results.multiFaceLandmarks[0];
                const segmentedData = this.segmentFace(landmarks);
                resolve({ landmarks, segmentedData });
            });

            this.faceMesh.send({ image: imageElement });
        });
    }

    private segmentFace(landmarks: any[]): SegmentedData {
        return {
            [FACE_REGIONS.FOREHEAD]: landmarks[10],
            [FACE_REGIONS.LEFT_CHEEK]: landmarks[234],
            [FACE_REGIONS.RIGHT_CHEEK]: landmarks[454],
            [FACE_REGIONS.CHIN]: landmarks[152],
            [FACE_REGIONS.NOSE]: landmarks[1],
            [FACE_REGIONS.T_ZONE]: landmarks[168],
        };
    }

    public matchTemplate(landmarks: any[]): string {
        if (!landmarks || landmarks.length === 0) return 'Unknown';

        const width = Math.abs(landmarks[234].x - landmarks[454].x);
        const height = Math.abs(landmarks[10].y - landmarks[152].y);
        const ratio = width / height;

        if (ratio > 0.85) return 'Round / Square';
        if (ratio < 0.75) return 'Long / Oval';
        return 'Oval / Heart';
    }
}
