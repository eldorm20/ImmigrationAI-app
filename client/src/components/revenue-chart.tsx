import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, BarChart3, Calendar } from "lucide-react";
import { AnimatedCard } from "@/components/ui/live-elements";

interface RevenueDataPoint {
    name: string; // "Jan", "Feb" etc
    value: number;
}

interface RevenueResponse {
    period: string;
    startDate: string;
    endDate: string;
    data: RevenueDataPoint[];
}

export default function RevenueChart() {
    const [data, setData] = useState<RevenueDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRevenue, setTotalRevenue] = useState(0);

    useEffect(() => {
        fetchRevenue();
    }, []);

    const fetchRevenue = async () => {
        try {
            const response = await apiRequest<RevenueResponse>("/analytics/lawyer/revenue?period=monthly");
            setData(response.data);
            setTotalRevenue(response.data.reduce((sum, item) => sum + item.value, 0));
        } catch (error) {
            console.error("Failed to fetch revenue chart data:", error);
        } finally {
            setLoading(false);
        }
    };

    const maxValue = Math.max(...data.map(d => d.value), 100); // Minimum scale of 100

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <AnimatedCard className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <BarChart3 size={20} className="text-emerald-400" />
                        Revenue Trends
                    </h3>
                    <p className="text-xs text-slate-500">Monthly breakdown</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-white">${totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-emerald-400 flex items-center justify-end gap-1">
                        <TrendingUp size={12} /> Last 6 months
                    </p>
                </div>
            </div>

            <div className="h-48 flex items-end justify-between gap-2 md:gap-4 px-2">
                {data.length === 0 ? (
                    <div className="w-full text-center text-slate-500 flex flex-col items-center">
                        <DollarSign size={24} className="opacity-20 mb-2" />
                        <span className="text-sm">No revenue data recorded</span>
                    </div>
                ) : (
                    data.map((item, index) => {
                        const heightPercentage = Math.max((item.value / maxValue) * 100, 2); // Min 2% height

                        return (
                            <div key={item.name} className="flex-1 flex flex-col items-center gap-2 group">
                                <div className="relative w-full flex items-end h-full">
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: `${heightPercentage}%`, opacity: 1 }}
                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                        className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300 transition-colors relative"
                                    >
                                        {/* Tooltip */}
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700 pointer-events-none z-10">
                                            ${item.value.toLocaleString()}
                                        </div>
                                    </motion.div>
                                </div>
                                <span className="text-xs text-slate-500 font-medium">{item.name}</span>
                            </div>
                        );
                    })
                )}
            </div>
        </AnimatedCard>
    );
}
