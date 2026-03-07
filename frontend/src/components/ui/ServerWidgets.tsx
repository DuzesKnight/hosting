'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/* ═══════════════ Circular Progress Dial ═══════════════ */
export function CircularProgress({ value, label, sublabel, color, glowColor }: { 
  value: number; label: string; sublabel?: string; color: string; glowColor: string; 
}) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-5 rounded-2xl neo-card w-full overflow-hidden bg-[#09090b]/80">
      <div className="relative w-[96px] h-[96px] mb-3">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="7" />
          <defs>
            <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={glowColor} />
            </linearGradient>
          </defs>
          <motion.circle
            cx="48" cy="48" r={radius} fill="none"
            stroke={`url(#grad-${label})`} strokeWidth="7"
            strokeLinecap="round"
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            key={clamped} 
            initial={{ scale: 1.05, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-[22px] font-black text-white tracking-tight tabular-nums"
          >
            {clamped}<span className="text-[13px] font-semibold text-gray-400">%</span>
          </motion.span>
        </div>
      </div>
      <span className="text-[11px] font-semibold text-gray-400 tracking-[0.15em] uppercase">{label}</span>
      {sublabel && <span className="text-[10px] text-gray-600 mt-0.5 tracking-wide">{sublabel}</span>}
    </div>
  );
}

/* ═══════════════ Realtime Resource Bar ═══════════════ */
export function ResourceBar({ value, max, label, unit, color, icon }: {
  value: number; max: number; label: string; unit: string; color: string; icon?: React.ReactNode;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  
  const formatValue = (v: number) => {
    if (unit === 'MB' && v >= 1024) return `${(v / 1024).toFixed(1)} GB`;
    if (unit === 'bytes') {
      if (v >= 1073741824) return `${(v / 1073741824).toFixed(1)} GB`;
      if (v >= 1048576) return `${(v / 1048576).toFixed(1)} MB`;
      if (v >= 1024) return `${(v / 1024).toFixed(0)} KB`;
      return `${v} B`;
    }
    return `${v}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-500">{icon}</span>}
          <span className="text-[11px] font-semibold text-gray-400 tracking-[0.12em] uppercase">{label}</span>
        </div>
        <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color }}>
          {formatValue(value)}
          {max > 0 && <span className="text-gray-600"> / {formatValue(max)}</span>}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

/* ═══════════════ Sparkline Mini Chart ═══════════════ */
export function Sparkline({ data, color, height = 40 }: {
  data: number[]; color: string; height?: number;
}) {
  const maxVal = Math.max(...data, 1);
  const width = 200;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - (v / maxVal) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-fill-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-fill-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══════════════ Realtime Stats Panel ═══════════════ */
export function RealtimeStatsPanel({ stats, limits }: {
  stats: {
    cpuPercent: number;
    memoryBytes: number;
    diskBytes: number;
    networkRx: number;
    networkTx: number;
    uptime: number;
  };
  limits: {
    memory: number;
    disk: number;
    cpu: number;
  };
}) {
  const cpuPct = Math.min(100, Math.round(stats.cpuPercent));
  const memMB = stats.memoryBytes / 1048576;
  const memPct = limits.memory > 0 ? Math.min(100, Math.round((memMB / limits.memory) * 100)) : 0;
  const diskMB = stats.diskBytes / 1048576;
  const diskPct = limits.disk > 0 ? Math.min(100, Math.round((diskMB / limits.disk) * 100)) : 0;

  const formatUptime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  // Tier color — muted neutral by default, soft warm warning, red for critical
  const tierColor = (pct: number) => {
    if (pct >= 90) return { stroke: '#ef4444', text: 'text-red-400', bg: 'rgba(239,68,68,0.06)' };
    if (pct >= 70) return { stroke: '#f59e0b', text: 'text-amber-400', bg: 'rgba(245,158,11,0.06)' };
    return { stroke: '#a1a1aa', text: 'text-gray-300', bg: 'rgba(161,161,170,0.04)' };
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="xl:col-span-3 neo-card p-6 bg-[#09090b]/80 relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] font-semibold text-gray-500 tracking-[0.2em] uppercase">LIVE RESOURCES</span>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse" />
          <span className="text-[10px] text-gray-500 font-medium tracking-wider">REALTIME</span>
        </div>
      </div>

      {/* Gauge dials row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <ArcGauge value={cpuPct} label="CPU" tier={tierColor(cpuPct)} />
        <ArcGauge value={memPct} label="RAM" tier={tierColor(memPct)} />
        <ArcGauge value={diskPct} label="DISK" tier={tierColor(diskPct)} />
      </div>

      {/* Resource bars */}
      <div className="space-y-4">
        <ResourceBar 
          value={memMB} max={limits.memory} 
          label="Memory" unit="MB" 
          color="#a1a1aa"
        />
        <ResourceBar 
          value={diskMB} max={limits.disk} 
          label="Storage" unit="MB" 
          color="#71717a"
        />
        <div className="grid grid-cols-2 gap-4 pt-1">
          <ResourceBar 
            value={stats.networkRx} max={0} 
            label="Net ↓" unit="bytes" 
            color="#a1a1aa"
          />
          <ResourceBar 
            value={stats.networkTx} max={0} 
            label="Net ↑" unit="bytes" 
            color="#71717a"
          />
        </div>
      </div>

      {/* Uptime badge */}
      {stats.uptime > 0 && (
        <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center justify-between">
          <span className="text-[10px] text-gray-600 tracking-wider uppercase">Uptime</span>
          <span className="text-[12px] font-mono font-bold text-gray-300 tabular-nums">{formatUptime(stats.uptime)}</span>
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════ Arc Gauge (premium semi-circle) ═══════════════ */
function ArcGauge({ value, label, tier }: {
  value: number; label: string; tier: { stroke: string; text: string; bg: string };
}) {
  const clamped = Math.min(100, Math.max(0, value));
  // 240-degree arc gauge
  const r = 30;
  const cx = 40;
  const cy = 40;
  const startAngle = 150;  // degrees from 12 o'clock
  const sweep = 240;
  const circumference = (sweep / 360) * 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;

  const polarToCart = (angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  // Tick marks
  const ticks = [0, 25, 50, 75, 100];
  const tickMarks = ticks.map(t => {
    const angle = startAngle + (t / 100) * sweep;
    const inner = polarToCart(angle);
    const outerR = r + 4;
    const rad = ((angle - 90) * Math.PI) / 180;
    const outer = { x: cx + outerR * Math.cos(rad), y: cy + outerR * Math.sin(rad) };
    return { inner, outer, t };
  });

  // Arc path description
  const arcStart = polarToCart(startAngle);
  const arcEnd = polarToCart(startAngle + sweep);

  return (
    <div className="flex flex-col items-center rounded-xl p-3 transition-colors" style={{ background: tier.bg }}>
      <div className="relative w-[80px] h-[60px]">
        <svg viewBox="0 0 80 66" className="w-full h-full">
          {/* Track */}
          <path
            d={describeArc(cx, cy, r, startAngle, startAngle + sweep)}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" strokeLinecap="round"
          />
          {/* Tick marks */}
          {tickMarks.map(({ inner, outer, t }) => (
            <line key={t} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke="rgba(255,255,255,0.08)" strokeWidth="1"
            />
          ))}
          {/* Progress arc */}
          <motion.path
            d={describeArc(cx, cy, r, startAngle, startAngle + sweep)}
            fill="none" stroke={tier.stroke} strokeWidth="5" strokeLinecap="round"
            initial={false}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: '2px' }}>
          <motion.span 
            key={clamped}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            className={`text-[17px] font-black tabular-nums ${tier.text}`}
          >
            {clamped}<span className="text-[9px] text-gray-500">%</span>
          </motion.span>
        </div>
      </div>
      <span className="text-[9px] font-bold text-gray-500 tracking-[0.2em] -mt-0.5">{label}</span>
    </div>
  );
}

/** SVG arc path helper */
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = {
    x: cx + r * Math.cos(((startAngle - 90) * Math.PI) / 180),
    y: cy + r * Math.sin(((startAngle - 90) * Math.PI) / 180),
  };
  const end = {
    x: cx + r * Math.cos(((endAngle - 90) * Math.PI) / 180),
    y: cy + r * Math.sin(((endAngle - 90) * Math.PI) / 180),
  };
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}
