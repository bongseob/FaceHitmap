"use client";

import React, { useRef, useEffect } from 'react';
import { REGION_COLORS } from '../utils/constants';

interface HeatmapCanvasProps {
    landmarks: any;
    hydrationData: any;
    width: number;
    height: number;
}

const HeatmapCanvas: React.FC<HeatmapCanvasProps> = ({ landmarks, hydrationData, width, height }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !landmarks) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        // Draw landmarks with heatmap colors based on hydrationData
        // Mirror x-coordinate (1 - x) to match front camera mirror display
        Object.entries(landmarks).forEach(([region, point]: [string, any]) => {
            const value = hydrationData[region]?.moisture || 0;
            const mirroredX = (1 - point.x) * width;
            const posY = point.y * height;

            ctx.beginPath();
            ctx.arc(mirroredX, posY, 20, 0, 2 * Math.PI);
            ctx.fillStyle = `${(REGION_COLORS as any)[region]}88`;
            ctx.fill();

            // Draw value text
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText(`${value}%`, mirroredX - 10, posY + 5);
        });

    }, [landmarks, hydrationData, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
    );
};

export default HeatmapCanvas;
