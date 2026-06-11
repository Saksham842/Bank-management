import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../AppContext";
import { SpendingDNA } from "../components/dashboard/SpendingDNA";
import { InvestmentPredictor } from "../components/dashboard/InvestmentPredictor";
import { SubscriptionTracker } from "../components/dashboard/SubscriptionTracker";
import { SmartAnomalyBanner } from "../components/dashboard/SmartAnomalyBanner";
import {
	Coins,
	TrendingUp,
	TrendingDown,
	Activity,
	AlertTriangle,
	ChevronRight,
	Shield,
	Sparkles,
	Receipt,
} from "lucide-react";
import { format, parseISO, differenceInDays, subDays } from "date-fns";
import {
	ResponsiveContainer,
	AreaChart,
	Area,
	XAxis,
	YAxis,
	Tooltip,
	PieChart,
	Pie,
	Cell,
	Legend,
	BarChart,
	Bar,
} from "recharts";
import { motion } from "framer-motion";

const CATEGORY_COLORS = {
	Food: "#F59E0B",
	Transport: "#3B82F6",
	Shopping: "#EC4899",
	Bills: "#10B981",
	Health: "#EF4444",
	Entertainment: "#8B5CF6",
};

export const Dashboard = () => {
	const { user, transactions, healthScore, anomalies, settings, setAnomalies } =
		useContext(AppContext);
	const [activeAnomalyList, setActiveAnomalyList] = useState([]);

	useEffect(() => {
		if (anomalies) {
			setActiveAnomalyList(anomalies.filter((a) => !a.dismissed));
		}
	}, [anomalies]);

	const dismissAnomaly = (id) => {
		const updated = anomalies.map((a) =>
			a.transactionId === id ? { ...a, dismissed: true } : a,
		);
		setAnomalies(updated);
		localStorage.setItem("ledger_anomalies", JSON.stringify(updated));
	};

	const markAnomalyNormal = (id) => {
		// Mark as normal — update baseline (dismissed + flagged as user-confirmed)
		const updated = anomalies.map((a) =>
			a.transactionId === id ? { ...a, dismissed: true, userConfirmed: true } : a,
		);
		setAnomalies(updated);
		localStorage.setItem("ledger_anomalies", JSON.stringify(updated));
	};

	const getStats = () => {
		const today = new Date();
		const currentMonthTxs = transactions.filter((t) => {
			const txDate = parseISO(t.date);
			return (
				txDate.getMonth() === today.getMonth() &&
				txDate.getFullYear() === today.getFullYear()
			);
		});

		const income =
			currentMonthTxs
				.filter((t) => t.type === "income")
				.reduce((sum, t) => sum + t.amount, 0) ||
			user?.income ||
			45000;
		const expenses = currentMonthTxs
			.filter((t) => t.type === "expense")
			.reduce((sum, t) => sum + t.amount, 0);
		const balance = income - expenses;

		return { income, expenses, balance };
	};

	const { income, expenses, balance } = getStats();

	const getChartData = () => {
		const today = new Date();
		const map = {};
		for (let i = 29; i >= 0; i--) {
			map[format(subDays(today, i), "yyyy-MM-dd")] = 0;
		}

		let cumulative = transactions
			.filter((t) => differenceInDays(today, parseISO(t.date)) > 30)
			.reduce(
				(sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
				0,
			);

		const rangeTxs = transactions.filter(
			(t) => differenceInDays(today, parseISO(t.date)) <= 30,
		);
		const sortedTxs = [...rangeTxs].sort((a, b) =>
			a.date.localeCompare(b.date),
		);

		const dailyDelta = {};
		sortedTxs.forEach((t) => {
			dailyDelta[t.date] =
				(dailyDelta[t.date] || 0) +
				(t.type === "income" ? t.amount : -t.amount);
		});

		const data = [];
		Object.keys(map)
			.sort()
			.forEach((date) => {
				if (dailyDelta[date]) {
					cumulative += dailyDelta[date];
				}
				data.push({
					date: format(parseISO(date), "MMM dd"),
					Balance: cumulative,
				});
			});

		return data;
	};

	const getPieData = () => {
		const sums = {};
		transactions
			.filter((t) => t.type === "expense")
			.forEach((t) => {
				sums[t.category] = (sums[t.category] || 0) + t.amount;
			});

		return Object.entries(sums)
			.map(([name, value]) => ({
				name,
				value,
				color: CATEGORY_COLORS[name] || "#64748B",
			}))
			.sort((a, b) => b.value - a.value);
	};

	const getBarData = () => {
		const today = new Date();
		const monthData = [];

		for (let i = 5; i >= 0; i--) {
			const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
			const mStr = format(monthDate, "MMM");

			const filtered = transactions.filter((t) => {
				const d = parseISO(t.date);
				return (
					d.getMonth() === monthDate.getMonth() &&
					d.getFullYear() === monthDate.getFullYear()
				);
			});

			const inc = filtered
				.filter((t) => t.type === "income")
				.reduce((s, t) => s + t.amount, 0);
			const exp = filtered
				.filter((t) => t.type === "expense")
				.reduce((s, t) => s + t.amount, 0);

			monthData.push({
				name: mStr,
				Income: inc || (i === 0 ? user?.income || 45000 : 0),
				Expenses: exp,
			});
		}

		return monthData;
	};

	const statCards = [
		{
			title: "Total Capital",
			value: balance,
			glow: "shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:border-emerald-500/30",
			color: "text-emerald-400",
			icon: Coins,
		},
		{
			title: "Monthly Income",
			value: income,
			glow: "shadow-[0_0_20px_rgba(59,130,246,0.1)] hover:border-blue-500/30",
			color: "text-blue-400",
			icon: TrendingUp,
		},
		{
			title: "Monthly Expenses",
			value: expenses,
			glow: "shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:border-red-500/30",
			color: "text-red-400",
			icon: TrendingDown,
		},
	];

	const getHealthColor = (score) => {
		if (score < 40) return "#EF4444";
		if (score < 70) return "#F59E0B";
		return "#10B981";
	};

	return (
		<div className="space-y-6 w-full">
			{/* Smart Anomaly Banner — with contextual AI questions */}
			<SmartAnomalyBanner
				anomalies={anomalies}
				currency={settings.currency}
				onDismiss={dismissAnomaly}
				onMarkNormal={markAnomalyNormal}
			/>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				{statCards.map((card, idx) => {
					const Icon = card.icon;
					return (
						<motion.div
							key={idx}
							whileHover={{ y: -4, scale: 1.01 }}
							className={`glass-panel rounded-2xl p-5.5 transition-all duration-300 flex flex-col justify-between ${card.glow}`}
						>
							<div className="flex justify-between items-center mb-4">
								<span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 font-heading">
									{card.title}
								</span>
								<div className="h-8 w-8 bg-slate-900/60 rounded-lg flex items-center justify-center text-slate-400 border border-slate-800/40">
									<Icon className="h-4 w-4" />
								</div>
							</div>
							<div>
								<span
									className={`font-heading font-bold text-2xl tracking-tight ${card.color}`}
								>
									{settings.currency}
									{card.value.toLocaleString()}
								</span>
								<div className="flex items-center gap-1.5 mt-2">
									<TrendingUp className="h-3 w-3 text-emerald-500" />
									<span className="text-[10px] text-slate-500 font-light">
										Last 30 Days
									</span>
								</div>
							</div>
						</motion.div>
					);
				})}

				{/* Health Radial Gauge */}
				<motion.div
					whileHover={{ y: -4, scale: 1.01 }}
					className="glass-panel rounded-2xl p-5.5 shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:border-primaryViolet/30 flex items-center gap-4.5 justify-between"
				>
					<div className="relative flex-shrink-0">
						<svg className="h-20 w-20 transform -rotate-90">
							<circle
								cx="40"
								cy="40"
								r="32"
								stroke="rgba(255,255,255,0.03)"
								strokeWidth="6"
								fill="transparent"
							/>
							<circle
								cx="40"
								cy="40"
								r="32"
								stroke={getHealthColor(healthScore.score)}
								strokeWidth="6"
								fill="transparent"
								strokeDasharray={2 * Math.PI * 32}
								strokeDashoffset={
									2 * Math.PI * 32 * (1 - healthScore.score / 100)
								}
								strokeLinecap="round"
								className="transition-all duration-1000 ease-out"
							/>
						</svg>
						<div className="absolute inset-0 flex flex-col items-center justify-center">
							<span className="font-heading font-bold text-lg text-white leading-none">
								{healthScore.score}
							</span>
							<span className="text-[9px] text-slate-500 mt-1 uppercase font-bold">
								Grade {healthScore.grade}
							</span>
						</div>
					</div>
					<div className="overflow-hidden">
						<span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 font-heading">
							Health Score
						</span>
						<p className="text-[10px] text-slate-500 mt-2 font-light leading-relaxed truncate">
							{healthScore.tip}
						</p>
					</div>
				</motion.div>
			</div>

			{/* Middle row charts */}
			<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
				{/* Balance Trend Area Chart */}
				<div className="glass-panel rounded-2xl p-5 lg:col-span-3">
					<div className="flex justify-between items-center mb-6">
						<span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 font-heading">
							Balance Trend (Last 30 Days)
						</span>
					</div>
					<div className="h-72 w-full">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={getChartData()}>
								<defs>
									<linearGradient id="balanceGlow" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25} />
										<stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
									</linearGradient>
								</defs>
								<XAxis
									dataKey="date"
									stroke="#475569"
									fontSize={9}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									stroke="#475569"
									fontSize={9}
									tickLine={false}
									axisLine={false}
									tickFormatter={(v) => `${settings.currency}${v}`}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "#0f172a",
										border: "1px solid rgba(124,58,237,0.25)",
										borderRadius: "8px",
									}}
									labelStyle={{
										color: "#94a3b8",
										fontSize: "10px",
										fontWeight: 600,
									}}
									itemStyle={{ color: "#fff", fontSize: "11px" }}
									formatter={(value) => [
										`${settings.currency}${value.toLocaleString()}`,
										"Balance",
									]}
								/>
								<Area
									type="monotone"
									dataKey="Balance"
									stroke="#7C3AED"
									strokeWidth={2.5}
									fillOpacity={1}
									fill="url(#balanceGlow)"
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* Expenditure Pie Breakdown */}
				<div className="glass-panel rounded-2xl p-5 lg:col-span-2 flex flex-col justify-between">
					<div className="mb-4">
						<span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 font-heading">
							Expenditure Distribution
						</span>
					</div>

					{getPieData().length > 0 ? (
						<div className="flex-grow flex flex-col sm:flex-row items-center justify-around h-60">
							<div className="h-44 w-44">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={getPieData()}
											cx="50%"
											cy="50%"
											innerRadius={50}
											outerRadius={70}
											paddingAngle={4}
											dataKey="value"
										>
											{getPieData().map((entry, idx) => (
												<Cell key={`cell-${idx}`} fill={entry.color} />
											))}
										</Pie>
										<Tooltip
											contentStyle={{
												backgroundColor: "#0f172a",
												border: "1px solid rgba(124,58,237,0.25)",
												borderRadius: "8px",
											}}
											itemStyle={{ color: "#fff", fontSize: "10px" }}
											formatter={(v) =>
												`${settings.currency}${v.toLocaleString()}`
											}
										/>
									</PieChart>
								</ResponsiveContainer>
							</div>
							<div className="space-y-1.5 text-xs self-center">
								{getPieData().map((item, idx) => (
									<div key={idx} className="flex items-center gap-2">
										<div
											className="h-2 w-2 rounded-full"
											style={{ backgroundColor: item.color }}
										/>
										<span className="text-slate-400 text-[11px] truncate max-w-[100px]">
											{item.name}
										</span>
										<span className="text-white font-semibold text-[11px]">
											{settings.currency}
											{item.value.toLocaleString()}
										</span>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="flex-grow flex flex-col items-center justify-center text-center p-8">
							<Coins className="h-10 w-10 text-slate-600 mb-3 animate-pulse" />
							<p className="text-xs text-slate-400 font-light">
								No expenses tracked yet.
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Bottom row delta & list */}
			<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
				<div className="glass-panel rounded-2xl p-5 lg:col-span-3">
					<div className="mb-6">
						<span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 font-heading">
							Capital Delta (Last 6 Months)
						</span>
					</div>
					<div className="h-64 w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={getBarData()}>
								<XAxis
									dataKey="name"
									stroke="#475569"
									fontSize={9}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									stroke="#475569"
									fontSize={9}
									tickLine={false}
									axisLine={false}
									tickFormatter={(v) => `${settings.currency}${v}`}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "#0f172a",
										border: "1px solid rgba(124,58,237,0.25)",
										borderRadius: "8px",
									}}
									itemStyle={{ fontSize: "10px" }}
									formatter={(v) => `${settings.currency}${v.toLocaleString()}`}
								/>
								<Legend
									iconType="circle"
									wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }}
								/>
								<Bar dataKey="Income" fill="#3B82F6" radius={[4, 4, 0, 0]} />
								<Bar dataKey="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>

				<div className="glass-panel rounded-2xl p-5 lg:col-span-2 flex flex-col justify-between">
					<div>
						<div className="flex justify-between items-center mb-6">
							<span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 font-heading">
								Recent Ledger Entries
							</span>
						</div>

						<div className="space-y-3.5">
							{transactions.slice(0, 5).map((t, idx) => (
								<div
									key={t.id || idx}
									className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-900/60 transition-all hover:bg-slate-900/30"
								>
									<div className="flex items-center gap-3">
										<div
											className="h-8.5 w-8.5 rounded-lg flex items-center justify-center text-white border"
											style={{
												backgroundColor: `${CATEGORY_COLORS[t.category] || "#4F46E5"}1A`,
												borderColor: `${CATEGORY_COLORS[t.category] || "#4F46E5"}40`,
												color: CATEGORY_COLORS[t.category] || "#4F46E5",
											}}
										>
											{t.category === "Food" && (
												<Coins className="h-4.5 w-4.5" />
											)}
											{t.category === "Transport" && (
												<Activity className="h-4.5 w-4.5" />
											)}
											{t.category === "Shopping" && (
												<Sparkles className="h-4.5 w-4.5" />
											)}
											{t.category === "Bills" && (
												<Receipt className="h-4.5 w-4.5" />
											)}
											{t.category === "Health" && (
												<Shield className="h-4.5 w-4.5" />
											)}
											{t.category === "Entertainment" && (
												<Sparkles className="h-4.5 w-4.5" />
											)}
											{(t.category === "Income" || t.type === "income") && (
												<TrendingUp className="h-4.5 w-4.5" />
											)}
										</div>
										<div className="overflow-hidden">
											<p className="text-xs font-semibold text-white truncate max-w-[120px]">
												{t.merchant}
											</p>
											<p className="text-[9px] text-slate-500 font-light mt-0.5">
												{format(parseISO(t.date), "MMM dd, yyyy")}
											</p>
										</div>
									</div>
									<span
										className={`text-xs font-bold ${t.type === "income" ? "text-emerald-400" : "text-slate-300"}`}
									>
										{t.type === "income" ? "+" : "-"}
										{settings.currency}
										{t.amount.toLocaleString()}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* ── NEW FEATURES ROW: Spending DNA + Subscription Tracker ── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<SpendingDNA
					transactions={transactions}
					monthlyIncome={user?.income || 45000}
					settings={settings}
				/>
				<SubscriptionTracker
					transactions={transactions}
					settings={settings}
				/>
			</div>

			{/* ── Investment Predictor (full width) ── */}
			<InvestmentPredictor
				monthlyIncome={user?.income || 45000}
				settings={settings}
			/>
		</div>
	);
};
