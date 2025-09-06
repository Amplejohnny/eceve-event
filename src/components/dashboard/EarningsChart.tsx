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

    // Set canvas size properly for high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get sorted months and ensure we have data
    const months = Object.keys(monthlyData).sort();
    if (months.length === 0) {
      // Draw "No data" message
      ctx.fillStyle = "#9ca3af";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        "No earnings data available",
        rect.width / 2,
        rect.height / 2
      );
      return;
    }

    const values = months.map((month) => monthlyData[month]);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    // Handle case where all values are the same
    const valueRange = maxValue - minValue;
    const adjustedMaxValue =
      valueRange === 0 ? maxValue + (maxValue * 0.1 || 1000) : maxValue;
    const adjustedMinValue =
      valueRange === 0
        ? Math.max(0, minValue - (minValue * 0.1 || 1000))
        : minValue;

    // Chart dimensions (use canvas rect, not scaled canvas)
    const padding = 60;
    const chartWidth = rect.width - 2 * padding;
    const chartHeight = rect.height - 2 * padding;

    // Draw axes
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, rect.height - padding);
    ctx.lineTo(rect.width - padding, rect.height - padding);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, rect.height - padding);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = "#f9fafb";
    ctx.lineWidth = 0.5;

    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding + (i * chartHeight) / gridLines;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(rect.width - padding, y);
      ctx.stroke();
    }

    // Draw data line and points
    if (months.length > 1) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();

      months.forEach((month, index) => {
        const x =
          padding + (index * chartWidth) / Math.max(months.length - 1, 1);
        const normalizedValue =
          (values[index] - adjustedMinValue) /
          (adjustedMaxValue - adjustedMinValue);
        const y = rect.height - padding - normalizedValue * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // Draw data points
    ctx.fillStyle = "#3b82f6";
    months.forEach((month, index) => {
      const x = padding + (index * chartWidth) / Math.max(months.length - 1, 1);
      const normalizedValue =
        (values[index] - adjustedMinValue) /
        (adjustedMaxValue - adjustedMinValue);
      const y = rect.height - padding - normalizedValue * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px system-ui, -apple-system, sans-serif";

    // X-axis labels (months)
    ctx.textAlign = "center";
    months.forEach((month, index) => {
      const x = padding + (index * chartWidth) / Math.max(months.length - 1, 1);
      const y = rect.height - padding + 20;

      const monthLabel = new Date(month + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: months.length > 6 ? undefined : "2-digit",
      });
      ctx.fillText(monthLabel, x, y);
    });

    // Y-axis labels
    ctx.textAlign = "right";
    for (let i = 0; i <= gridLines; i++) {
      const y = padding + (i * chartHeight) / gridLines + 4;
      const value =
        adjustedMaxValue -
        (i * (adjustedMaxValue - adjustedMinValue)) / gridLines;

      // Format currency more compactly for chart
      let formattedValue;
      if (value >= 1000000) {
        formattedValue = `₦${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        formattedValue = `₦${(value / 1000).toFixed(0)}K`;
      } else {
        formattedValue = `₦${Math.round(value)}`;
      }

      ctx.fillText(formattedValue, padding - 10, y);
    }
  }, [monthlyData, currency]);

  // Updated return JSX
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Monthly Earnings
      </h3>
      <div className="relative w-full h-80">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
