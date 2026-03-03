import { FACE_REGIONS } from '../utils/constants';

// Define types to avoid any
export interface SegmentedData {
    [key: string]: { x: number; y: number; z: number };
}

export interface FaceOvalData {
    x: number;
    y: number;
    z: number;
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

    public async analyze(imageElement: HTMLImageElement | HTMLVideoElement): Promise<{ landmarks: any[], segmentedData: SegmentedData, faceOval: FaceOvalData[] } | null> {
        if (!this.faceMesh) return null;

        return new Promise((resolve) => {
            this.faceMesh.onResults((results: any) => {
                if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                    resolve(null);
                    return;
                }

                const landmarks = results.multiFaceLandmarks[0];
                const segmentedData = this.segmentFace(landmarks);
                const faceOval = this.getFaceOval(landmarks);
                resolve({ landmarks, segmentedData, faceOval });
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

    private getFaceOval(landmarks: any[]): FaceOvalData[] {
        // MediaPipe Face Mesh Silhouette (Oval) Indices
        const ovalIndices = [
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
            400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
            54, 103, 67, 109
        ];

        return ovalIndices.map(index => ({
            x: landmarks[index].x,
            y: landmarks[index].y,
            z: landmarks[index].z
        }));
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

    /**
     * Check if the detected face fits within the guide ellipse bounds.
     * Guide ellipse: center (0.5, 0.45), rx=0.22, ry=0.32 (normalized coords)
     */
    public isFaceInBounds(landmarks: any[]): boolean {
        if (!landmarks || landmarks.length === 0) return false;

        // Guide ellipse parameters (matching FaceGuideOverlay SVG)
        const cx = 0.5, cy = 0.46, rx = 0.28, ry = 0.40;

        // Key face boundary points: top of head, chin, left cheek, right cheek
        const keyPoints = [
            landmarks[10],   // forehead top
            landmarks[152],  // chin
            landmarks[234],  // left ear
            landmarks[454],  // right ear
        ];

        // Check each key point is inside the ellipse
        for (const pt of keyPoints) {
            const dx = (pt.x - cx) / rx;
            const dy = (pt.y - cy) / ry;
            if (dx * dx + dy * dy > 1.3) return false; // 30% tolerance
        }

        // Check face is large enough (not too far away)
        const faceWidth = Math.abs(landmarks[234].x - landmarks[454].x);
        if (faceWidth < 0.15) return false;

        return true;
    }
}
