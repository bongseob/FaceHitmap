import { FACE_REGIONS } from './constants';

export interface LabColor {
    l: number; // Lightness (0-100)
    a: number; // Red/Green (-128 to 127)
    b: number; // Yellow/Blue (-128 to 127)
}

export type SkinStatus = 'normal' | 'caution' | 'warning';

export interface ToneData {
    l: number;
    a: number;
    b: number;
    redness: number; // Normalized 0-100 (based on a*)
    relativeScore: number; // 0-100 (Difference from average)
    status: SkinStatus;
}

export interface SkinToneResult {
    regions: Record<string, ToneData>;
    averageEvenness: number; // 0-100 (100 is perfectly even)
    averageRedness: number; // 0-100
}

/**
 * Converts RGB to CIELAB color space
 */
export function rgbToLab(r: number, g: number, b: number): LabColor {
    // Normalize RGB to 0-1
    let nr = r / 255;
    let ng = g / 255;
    let nb = b / 255;

    // Gamma correction
    nr = nr > 0.04045 ? Math.pow((nr + 0.055) / 1.055, 2.4) : nr / 12.92;
    ng = ng > 0.04045 ? Math.pow((ng + 0.055) / 1.055, 2.4) : ng / 12.92;
    nb = nb > 0.04045 ? Math.pow((nb + 0.055) / 1.055, 2.4) : nb / 12.92;

    nr *= 100;
    ng *= 100;
    nb *= 100;

    // RGB to XYZ (D65 white point)
    const x = nr * 0.4124 + ng * 0.3576 + nb * 0.1805;
    const y = nr * 0.2126 + ng * 0.7152 + nb * 0.0722;
    const z = nr * 0.0193 + ng * 0.1192 + nb * 0.9505;

    // XYZ to Lab
    const xn = 95.047;
    const yn = 100.000;
    const zn = 108.883;

    const fx = x / xn > 0.008856 ? Math.pow(x / xn, 1 / 3) : (7.787 * (x / xn)) + (16 / 116);
    const fy = y / yn > 0.008856 ? Math.pow(y / yn, 1 / 3) : (7.787 * (y / yn)) + (16 / 116);
    const fz = z / zn > 0.008856 ? Math.pow(z / zn, 1 / 3) : (7.787 * (z / zn)) + (16 / 116);

    return {
        l: (116 * fy) - 16,
        a: 500 * (fx - fy),
        b: 200 * (fy - fz)
    };
}

/**
 * Extracts skin tone metrics from a canvas given landmarks
 */
export function analyzeSkinTone(
    canvas: HTMLCanvasElement,
    landmarks: Record<string, { x: number, y: number }>
): SkinToneResult {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get canvas context");

    const width = canvas.width;
    const height = canvas.height;
    const regions: Record<string, ToneData> = {};
    const sampleSize = 10; // 10x10 area

    Object.entries(landmarks).forEach(([region, point]) => {
        const px = Math.floor(point.x * width);
        const py = Math.floor(point.y * height);

        // Sample area to get average
        const imageData = ctx.getImageData(
            Math.max(0, px - sampleSize / 2),
            Math.max(0, py - sampleSize / 2),
            sampleSize,
            sampleSize
        );
        const data = imageData.data;

        let rSum = 0, gSum = 0, bSum = 0;
        for (let i = 0; i < data.length; i += 4) {
            rSum += data[i];
            gSum += data[i + 1];
            bSum += data[i + 2];
        }

        const count = data.length / 4;
        const avgR = rSum / count;
        const avgG = gSum / count;
        const avgB = bSum / count;

        const lab = rgbToLab(avgR, avgG, avgB);

        // Redness calculation
        const redness = Math.max(0, Math.min(100, (lab.a / 30) * 100));

        regions[region] = {
            ...lab,
            redness,
            relativeScore: 0, // calculated below
            status: 'normal'
        };
    });

    // Post-process for relative scoring and status
    const regionalData = Object.values(regions);
    const avgA = regionalData.reduce((acc, curr) => acc + curr.a, 0) / regionalData.length;
    const avgL = regionalData.reduce((acc, curr) => acc + curr.l, 0) / regionalData.length;

    Object.keys(regions).forEach(region => {
        const data = regions[region];

        // Relative redness deviation
        const aDev = Math.max(0, data.a - avgA);
        const redRelScore = Math.min(100, (aDev / 15) * 100);

        // Determine status based on absolute redness and relative deviation
        let status: SkinStatus = 'normal';
        if (data.redness > 60 || redRelScore > 70) status = 'warning';
        else if (data.redness > 40 || redRelScore > 40) status = 'caution';

        regions[region].relativeScore = Math.round(redRelScore);
        regions[region].status = status;
    });

    const lValues = Object.values(regions).map(r => r.l);
    const aValues = Object.values(regions).map(r => r.a);

    // Calculate Evenness (based on L* variance)
    const currentAvgL = lValues.reduce((a, b) => a + b, 0) / lValues.length;
    const varianceL = lValues.reduce((a, b) => a + Math.pow(b - avgL, 2), 0) / lValues.length;
    const stdDevL = Math.sqrt(varianceL);

    // stdDevL of 0 is 100% even. stdDevL of 10+ is quite uneven.
    const evenness = Math.max(0, Math.min(100, 100 - (stdDevL * 5)));

    const averageRedness = aValues.reduce((a, b) => a + b, 0) / aValues.length;
    const normalizedAvgRedness = Math.max(0, Math.min(100, (averageRedness / 30) * 100));

    return {
        regions,
        averageEvenness: Math.round(evenness),
        averageRedness: Math.round(normalizedAvgRedness)
    };
}
