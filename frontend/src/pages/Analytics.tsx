import { BarChart3, TrendingUp, DollarSign, Clock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { PageHeader } from "../components/common/PageHeader";
import {
    getAnalyticsOverview,
    getModelAnalytics,
    type AnalyticsOverview,
    type ModelAnalytics
} from "../lib/api";

export function Analytics() {
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [models, setModels] = useState<ModelAnalytics[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<number>(7);

    useEffect(() => {
        loadAnalytics();
    }, [selectedPeriod]);

    const loadAnalytics = async () => {
        setIsLoading(true);
        try {
            const [overviewRes, modelsRes] = await Promise.all([
                getAnalyticsOverview(selectedPeriod),
                getModelAnalytics({ days: selectedPeriod })
            ]);

            if (overviewRes.success && overviewRes.data) {
                setOverview(overviewRes.data);
            }
            if (modelsRes.success && modelsRes.data) {
                setModels(modelsRes.data);
            }
        } catch (error) {
            console.error("Failed to load analytics:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCost = (cost: number) => {
        return `$${cost.toFixed(4)}`;
    };

    const formatNumber = (num: number) => {
        return num.toLocaleString();
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms.toFixed(0)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!overview) {
        return (
            <div className="p-4">
                <PageHeader title="Analytics" description="View usage statistics and costs" />
                <div className="mt-8 text-center text-slate-500">No analytics data available</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <PageHeader
                title="Analytics"
                description="View usage statistics, costs, and performance metrics"
            />

            {/* Period Selector */}
            <div className="mt-6 flex gap-2">
                {[7, 14, 30, 90].map((days) => (
                    <button
                        key={days}
                        onClick={() => setSelectedPeriod(days)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedPeriod === days
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                    >
                        {days} days
                    </button>
                ))}
            </div>

            {/* Overview Stats Grid */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Executions */}
                <div className="bg-card p-6 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Total Executions</p>
                            <p className="mt-2 text-3xl font-semibold text-slate-900">
                                {formatNumber(overview.totalExecutions)}
                            </p>
                        </div>
                        <BarChart3 className="w-10 h-10 text-indigo-600" />
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                        <span className="text-green-600 font-medium">
                            {overview.successRate.toFixed(1)}% success rate
                        </span>
                    </div>
                </div>

                {/* Total Cost */}
                <div className="bg-card p-6 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Total Cost</p>
                            <p className="mt-2 text-3xl font-semibold text-slate-900">
                                {formatCost(overview.totalCost)}
                            </p>
                        </div>
                        <DollarSign className="w-10 h-10 text-green-600" />
                    </div>
                    <div className="mt-4 flex items-center text-sm text-slate-600">
                        {formatNumber(overview.totalTokens)} total tokens
                    </div>
                </div>

                {/* Avg Duration */}
                <div className="bg-card p-6 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Avg Duration</p>
                            <p className="mt-2 text-3xl font-semibold text-slate-900">
                                {formatDuration(overview.avgDurationMs)}
                            </p>
                        </div>
                        <Clock className="w-10 h-10 text-blue-600" />
                    </div>
                    <div className="mt-4 flex items-center text-sm text-slate-600">
                        Per execution
                    </div>
                </div>

                {/* Success/Failure Split */}
                <div className="bg-card p-6 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Success/Failure</p>
                            <p className="mt-2 text-3xl font-semibold text-slate-900">
                                {formatNumber(overview.successfulExecutions)}
                            </p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-emerald-600" />
                    </div>
                    <div className="mt-4 flex items-center text-sm text-red-600">
                        {formatNumber(overview.failedExecutions)} failed
                    </div>
                </div>
            </div>

            {/* Top Models by Cost */}
            {overview.topModels.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                        Top Models by Cost
                    </h2>
                    <div className="bg-card rounded-lg border border-slate-200 p-6">
                        <div className="space-y-4">
                            {overview.topModels.map((model, index) => {
                                const maxCost = overview.topModels[0].totalCost;
                                const percentage = (model.totalCost / maxCost) * 100;

                                return (
                                    <div key={`${model.provider}-${model.model}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-slate-500">
                                                    #{index + 1}
                                                </span>
                                                <span className="font-medium text-slate-900">
                                                    {model.provider}
                                                </span>
                                                <span className="text-slate-600">/</span>
                                                <span className="text-slate-700">
                                                    {model.model}
                                                </span>
                                            </div>
                                            <span className="font-semibold text-slate-900">
                                                {formatCost(model.totalCost)}
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Model Usage Breakdown */}
            {models.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                        Model Usage Breakdown
                    </h2>
                    <div className="bg-card rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Model
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Calls
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Success Rate
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Tokens
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Total Cost
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Avg Cost/Call
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Avg Duration
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {models.map((model) => {
                                    const successRate =
                                        model.totalCalls > 0
                                            ? (model.successfulCalls / model.totalCalls) * 100
                                            : 0;

                                    return (
                                        <tr
                                            key={`${model.provider}-${model.model}`}
                                            className="hover:bg-slate-50"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-900">
                                                        {model.provider}
                                                    </span>
                                                    <span className="text-sm text-slate-500">
                                                        {model.model}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                                                {formatNumber(model.totalCalls)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span
                                                    className={`text-sm font-medium ${
                                                        successRate >= 90
                                                            ? "text-green-600"
                                                            : successRate >= 70
                                                              ? "text-yellow-600"
                                                              : "text-red-600"
                                                    }`}
                                                >
                                                    {successRate.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-600">
                                                {formatNumber(model.totalTokens)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-slate-900">
                                                {formatCost(model.totalCost)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-600">
                                                {formatCost(model.avgCostPerCall)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-600">
                                                {formatDuration(model.avgDurationMs)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {models.length === 0 && overview.totalExecutions === 0 && (
                <div className="mt-12 text-center">
                    <BarChart3 className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-medium text-slate-900">No usage data yet</h3>
                    <p className="mt-2 text-sm text-slate-500">
                        Execute some workflows or agents to see analytics data here.
                    </p>
                </div>
            )}
        </div>
    );
}
