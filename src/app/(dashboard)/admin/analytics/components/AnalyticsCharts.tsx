'use client';

import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, ComposedChart, Line
} from 'recharts';
import { cn } from '@/lib/utils';

// Premium Color Palettes
export const COLORS = {
    primary: ['#0d9488', '#2dd4bf', '#99f6e4'], // Teal
    success: ['#059669', '#34d399', '#a7f3d0'], // Emerald
    info: ['#2563eb', '#60a5fa', '#bfdbfe'],    // Blue
    warning: ['#d97706', '#fbbf24', '#fef3c7'], // Amber
    danger: ['#dc2626', '#f87171', '#fee2e2'],  // Red
    purple: ['#7c3aed', '#a78bfa', '#ddd6fe'],  // Violet
};

interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
}

export function ChartCard({ title, subtitle, children, className }: ChartCardProps) {
    return (
        <div className={cn("bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all", className)}>
            <div className="mb-6">
                <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">{title}</h3>
                {subtitle && <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">{subtitle}</p>}
            </div>
            <div className="h-[300px] w-full">
                {children}
            </div>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 backdrop-blur-md border border-slate-100 p-3 rounded-xl shadow-xl">
                <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">{label}</p>
                {payload.map((entry: any, index: number) => {
                    const isCurrency = ['revenue', 'adr', 'revpar', 'amount', 'net', 'refunds', 'sales', 'bill', 'price'].includes(entry.name?.toLowerCase());
                    const isPercentage = ['occupancy', 'rate', 'retention'].includes(entry.name?.toLowerCase());
                    const value = typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value;

                    return (
                        <div key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                            <span className="text-xs font-bold text-slate-700">
                                {entry.name}: {isCurrency ? `₹${value}` : value}{isPercentage ? '%' : ''}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    }
    return null;
};

export function RevenueAreaChart({ data, dataKey = "revenue", color = COLORS.primary[0] }: any) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.1} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                    animationDuration={1500}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

export function DistributionPieChart({ data }: any) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={1000}
                >
                    {data.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % 6][0]} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{value}</span>}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

export function ComparisonBarChart({ data, categories }: any) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    formatter={(value) => <span className="text-[10px] font-bold text-slate-500 uppercase">{value}</span>}
                />
                {categories.map((cat: any, index: number) => (
                    <Bar
                        key={cat.key}
                        dataKey={cat.key}
                        name={cat.name}
                        fill={cat.color || Object.values(COLORS)[index % 6][0]}
                        radius={[4, 4, 0, 0]}
                        barSize={12}
                        animationDuration={1500}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}
