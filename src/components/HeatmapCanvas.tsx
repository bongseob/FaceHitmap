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
        Object.entries(landmarks).forEach(([region, point]: [string, any]) => {
            const value = hydrationData[region] || 0;

            ctx.beginPath();
            ctx.arc(point.x * width, point.y * height, 20, 0, 2 * Math.PI);
            ctx.fillStyle = `${(REGION_COLORS as any)[region]}88`; // Cast to any to avoid indexing error
            ctx.fill();

            // Draw value text
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText(`${value}%`, point.x * width - 10, point.y * height + 5);
        });

    }, [landmarks, hydrationData, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="absolute top-0 left-0 pointer-events-none"
        />
    );
};

export default HeatmapCanvas;
