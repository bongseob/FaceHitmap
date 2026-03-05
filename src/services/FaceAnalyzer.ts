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

export interface FaceValidationResult {
    isValid: boolean;
    reason?: 'too_small' | 'not_centered' | 'not_frontal' | 'no_face';
}

export class FaceAnalyzer {
    private faceMesh: any = null;
    public isReady: boolean = false;
    private initPromise: Promise<void> | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.initPromise = this.init();
        }
    }

    private async init(): Promise<void> {
        try {
            const { FaceMesh } = await import('@mediapipe/face_mesh');
            this.faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://unpkg.com/@mediapipe/face_mesh/${file}`;
                },
            });

            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            await this.faceMesh.initialize();
            this.isReady = true;
        } catch (error) {
            console.error("FaceMesh initialization failed:", error);
        }
    }

    public async analyze(imageElement: HTMLImageElement | HTMLVideoElement): Promise<{ landmarks: any[], segmentedData: SegmentedData, faceOval: FaceOvalData[] } | null> {
        if (this.initPromise) {
            await this.initPromise;
        }

        if (!this.faceMesh || !this.isReady) {
            console.warn("FaceMesh is not ready yet.");
            return null;
        }

        return new Promise((resolve, reject) => {
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

            try {
                this.faceMesh.send({ image: imageElement }).catch((err: any) => {
                    console.error("Error inside faceMesh.send:", err);
                    resolve(null);
                });
            } catch (err) {
                console.error("Sync error calling faceMesh.send:", err);
                resolve(null);
            }
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

    /**
     * Measure face dimensions and position for analytical validation.
     * Rejects faces that are too small, wildly off-center, or heavily turned.
     */
    public validateFacePosition(landmarks: any[]): FaceValidationResult {
        if (!landmarks || landmarks.length === 0) {
            return { isValid: false, reason: 'no_face' };
        }

        const leftEar = landmarks[234];
        const rightEar = landmarks[454];
        const topHead = landmarks[10];
        const chin = landmarks[152];
        const nose = landmarks[1];

        // 1. 크기(Size) 검증: 좌우 머리 너비가 캔버스 너비의 일정 비율(ex. 25~30% 이상)이어야 함
        const faceWidth = Math.abs(rightEar.x - leftEar.x);
        const faceHeight = Math.abs(chin.y - topHead.y);

        // 최소 25% 크기
        if (faceWidth < 0.25 || faceHeight < 0.35) {
            return { isValid: false, reason: 'too_small' };
        }

        // 2. 중앙(Center) 검증: 코의 위치가 화면 중앙(0.5, 0.5) 부근에서 크게 벗어나지 않아야 함
        const cx = 0.5;
        const cy = 0.5;
        const dx = Math.abs(nose.x - cx);
        const dy = Math.abs(nose.y - cy);

        // 상하좌우 ±25% 편차 허용
        if (dx > 0.25 || dy > 0.25) {
            return { isValid: false, reason: 'not_centered' };
        }

        // 3. 정면(Frontal) 검증: 코가 왼쪽 귀와 오른쪽 귀의 정가운데에 어느 정도 위치하는지 (Yaw 추정)
        const leftDist = Math.abs(nose.x - leftEar.x);
        const rightDist = Math.abs(nose.x - rightEar.x);
        const yawRatio = leftDist / rightDist;

        // 양쪽 귀-코 거리의 비율이 0.5(심한 틀어짐) ~ 2.0 밖이면 측면
        if (yawRatio < 0.6 || yawRatio > 1.6) {
            return { isValid: false, reason: 'not_frontal' };
        }

        return { isValid: true };
    }
}
