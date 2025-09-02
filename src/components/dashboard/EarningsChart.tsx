"use client";

import { useEffect, useRef } from "react";

interface EarningsChartProps {
  monthlyData: Record<string, number>;
  currency: string;
}

export default function EarningsChart({
  monthlyData,
  currency,
}: EarningsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !monthlyData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get sorted months
    const months = Object.keys(monthlyData).sort();
    if (months.length === 0) return;

    const values = months.map((month) => monthlyData[month]);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values);

    // Chart dimensions
    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;

    // Draw axes
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 0.5;

    // Horizontal grid lines
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding + (i * chartHeight) / gridLines;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
    }

    // Draw data points and lines
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#3b82f6";

    ctx.beginPath();
    months.forEach((month, index) => {
      const x = padding + (index * chartWidth) / (months.length - 1);
      const normalizedValue =
        (values[index] - minValue) / (maxValue - minValue);
      const y = canvas.height - padding - normalizedValue * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      // Draw data point
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";

    // X-axis labels (months)
    months.forEach((month, index) => {
      const x = padding + (index * chartWidth) / (months.length - 1);
      const y = canvas.height - padding + 20;

      // Format month label (e.g., "2024-01" -> "Jan")
      const monthLabel = new Date(month + "-01").toLocaleDateString("en-US", {
        month: "short",
      });
      ctx.fillText(monthLabel, x, y);
    });

    // Y-axis labels
    ctx.textAlign = "right";
    for (let i = 0; i <= gridLines; i++) {
      const y = padding + (i * chartHeight) / gridLines;
      const value = maxValue - (i * (maxValue - minValue)) / gridLines;
      const formattedValue = new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);

      ctx.fillText(formattedValue, padding - 10, y + 4);
    }
  }, [monthlyData, currency]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Monthly Earnings
      </h3>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={300}
          className="w-full h-auto"
        />
        {Object.keys(monthlyData).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            No earnings data available
          </div>
        )}
      </div>
    </div>
  );
}
