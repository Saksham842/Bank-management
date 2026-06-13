import React, {
	useEffect,
	useState,
	useRef,
	createContext,
	useContext,
} from "react";
import {
	HashRouter as Router,
	Routes,
	Route,
	Link,
	useNavigate,
	useLocation,
	Navigate,
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
	LayoutDashboard,
	Receipt,
	BarChart3,
	Target,
	Settings,
	Plus,
	Trash2,
	Edit3,
	AlertTriangle,
	TrendingUp,
	TrendingDown,
	Download,
	Upload,
	X,
	ChevronRight,
	Calendar,
	User,
	Shield,
	Activity,
	Sparkles,
	Clock,
	Coins,
	Menu,
	RefreshCw,
	Eye,
	PiggyBank,
} from "lucide-react";
import { format, parseISO, differenceInDays, addDays, subDays } from "date-fns";
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
	RadarChart,
	PolarGrid,
	PolarAngleAxis,
	PolarRadiusAxis,
	Radar,
	Line,
	ComposedChart,
} from "recharts";
import { Dashboard as ModularDashboard } from "./pages/Dashboard";
import { Transactions as ModularTransactions } from "./pages/Transactions";
import { Reports as ModularReports } from "./pages/Reports";
import { BudgetPage as ModularBudgetPage } from "./pages/Budget";
import { Settings as ModularSettings } from "./pages/Settings";
import { RetirementPage as ModularRetirementPage } from "./pages/Retirement";
import { Login as ModularLogin } from "./pages/Auth/Login";
import { Register as ModularRegister } from "./pages/Auth/Register";
import { AppContext } from "./AppContext";
import { useAuthStore } from "./store/useAuthStore";

const CATEGORY_COLORS = {
	Food: "#F59E0B",
	Transport: "#3B82F6",
	Shopping: "#EC4899",
	Bills: "#10B981",
	Health: "#EF4444",
	Entertainment: "#8B5CF6",
};

const SEED_GOALS = [
	{
		id: "g1",
		name: "Emergency Fund",
		emoji: "🚨",
		targetAmount: 50000,
		savedAmount: 12000,
		targetDate: format(addDays(new Date(), 180), "yyyy-MM-dd"),
		monthlyContribution: 5000,
		monteCarloProbability: 78,
		contributions: [
			{ amount: 6000, date: format(subDays(new Date(), 60), "yyyy-MM-dd") },
			{ amount: 6000, date: format(subDays(new Date(), 30), "yyyy-MM-dd") },
		],
	},
	{
		id: "g2",
		name: "New Laptop",
		emoji: "💻",
		targetAmount: 80000,
		savedAmount: 5000,
		targetDate: format(addDays(new Date(), 240), "yyyy-MM-dd"),
		monthlyContribution: 8000,
		monteCarloProbability: 45,
		contributions: [
			{ amount: 2500, date: format(subDays(new Date(), 40), "yyyy-MM-dd") },
			{ amount: 2500, date: format(subDays(new Date(), 10), "yyyy-MM-dd") },
		],
	},
];

const generateSeedTransactions = () => {
	const transactions = [];
	const today = new Date();

	// Salary: ₹45,000 on 1st of each month
	for (let i = 0; i < 3; i++) {
		const salaryDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
		transactions.push({
			id: `salary-${i}`,
			amount: 45000,
			merchant: "HDFC Corporate Salary",
			category: "Income",
			type: "income",
			date: format(salaryDate, "yyyy-MM-dd"),
			notes: "Monthly payroll credit",
			version: 1,
			auditTrail: [],
		});
	}

	// Regular expenses over the last 90 days
	for (let i = 90; i >= 0; i--) {
		const currentDate = subDays(today, i);
		const dayOfWeek = currentDate.getDay();
		const dateStr = format(currentDate, "yyyy-MM-dd");

		// Skip salary day transactions for realism
		if (currentDate.getDate() === 1) continue;

		// Zomato: 3-4x per week
		if ([0, 3, 5, 6].includes(dayOfWeek) && Math.random() > 0.3) {
			transactions.push({
				id: `zomato-${i}`,
				amount: Math.floor(Math.random() * 401) + 200, // ₹200-600
				merchant: "Zomato Food Delivery",
				category: "Food",
				type: "expense",
				date: dateStr,
				notes: "Lunch delivery",
				version: 1,
				auditTrail: [],
			});
		}

		// Uber: 2x per week
		if ([1, 4].includes(dayOfWeek) && Math.random() > 0.2) {
			transactions.push({
				id: `uber-${i}`,
				amount: Math.floor(Math.random() * 251) + 150, // ₹150-400
				merchant: "Uber Ride",
				category: "Transport",
				type: "expense",
				date: dateStr,
				notes: "Commute to office",
				version: 1,
				auditTrail: [],
			});
		}

		// Grocery store: 4x per month (every Sat)
		if (dayOfWeek === 6 && Math.random() > 0.1) {
			transactions.push({
				id: `grocery-${i}`,
				amount: Math.floor(Math.random() * 3001) + 2000, // ₹2000-5000
				merchant: "Reliance Smart Supermarket",
				category: "Food",
				type: "expense",
				date: dateStr,
				notes: "Monthly staples & groceries",
				version: 1,
				auditTrail: [],
			});
		}

		// Petrol: 2x per month
		if (currentDate.getDate() === 7 || currentDate.getDate() === 21) {
			transactions.push({
				id: `petrol-${i}`,
				amount: Math.floor(Math.random() * 1001) + 500, // ₹500-1500
				merchant: "HP Fuel Station",
				category: "Transport",
				type: "expense",
				date: dateStr,
				notes: "Car refuel",
				version: 1,
				auditTrail: [],
			});
		}

		// Amazon: 2x per month
		if (currentDate.getDate() === 10 || currentDate.getDate() === 22) {
			transactions.push({
				id: `amazon-${i}`,
				amount: Math.floor(Math.random() * 2501) + 500, // ₹500-3000
				merchant: "Amazon Marketplace",
				category: "Shopping",
				type: "expense",
				date: dateStr,
				notes: "Utility orders",
				version: 1,
				auditTrail: [],
			});
		}

		// Netflix: 1x per month (5th)
		if (currentDate.getDate() === 5) {
			transactions.push({
				id: `netflix-${i}`,
				amount: 649,
				merchant: "Netflix Subscription",
				category: "Entertainment",
				type: "expense",
				date: dateStr,
				notes: "Premium plan",
				version: 1,
				auditTrail: [],
			});
		}

		// Electricity bill: 1x per month (15th)
		if (currentDate.getDate() === 15) {
			transactions.push({
				id: `electricity-${i}`,
				amount: 1200,
				merchant: "State Electricity Board",
				category: "Bills",
				type: "expense",
				date: dateStr,
				notes: "Power bill",
				version: 1,
				auditTrail: [],
			});
		}

		// Jio Recharge: 1x per month (18th)
		if (currentDate.getDate() === 18) {
			transactions.push({
				id: `jio-${i}`,
				amount: 239,
				merchant: "Jio Mobile Recharge",
				category: "Bills",
				type: "expense",
				date: dateStr,
				notes: "Prepaid phone plan",
				version: 1,
				auditTrail: [],
			});
		}

		// Apollo Pharmacy: 1x per month (25th)
		if (currentDate.getDate() === 25) {
			transactions.push({
				id: `apollo-${i}`,
				amount: Math.floor(Math.random() * 601) + 200, // ₹200-800
				merchant: "Apollo Pharmacy",
				category: "Health",
				type: "expense",
				date: dateStr,
				notes: "Monthly vitamins & meds",
				version: 1,
				auditTrail: [],
			});
		}
	}

	// Anomaly Transactions
	const date15DaysAgo = format(subDays(today, 15), "yyyy-MM-dd");
	const date45DaysAgo = format(subDays(today, 45), "yyyy-MM-dd");

	transactions.push({
		id: `anomaly-1`,
		amount: 8500, // Food — 8x normal
		merchant: "Grand Hyatt Luxury Dinner",
		category: "Food",
		type: "expense",
		date: date15DaysAgo,
		notes: "Outlier family dinner celebration",
		version: 1,
		auditTrail: [],
	});

	transactions.push({
		id: `anomaly-2`,
		amount: 24999, // Shopping — 10x normal
		merchant: "Amazon Electronics Store",
		category: "Shopping",
		type: "expense",
		date: date45DaysAgo,
		notes: "Office monitor upgrade",
		version: 1,
		auditTrail: [],
	});

	// Sort by date descending
	return transactions.sort((a, b) => b.date.localeCompare(a.date));
};

// ==========================================
const parseSMS = async (text) => {
	try {
		const res = await fetch(
			`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/nlp/extract`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ rawText: text }),
			},
		);
		const data = await res.json();
		if (data.success && data.data) {
			const d = data.data;
			return {
				amount: d.amount || 0,
				merchant: d.merchant || "Unknown Merchant",
				category: d.category || "Other",
				type: d.type === "CREDIT" ? "income" : "expense",
				date: d.date || format(new Date(), "yyyy-MM-dd"),
				notes: `Gemini AI: ${d.confidence ? Math.round(d.confidence * 100) + "% confidence" : "AI parsed"}`,
			};
		}
	} catch (e) {
		console.warn("NLP API unavailable, using local fallback:", e.message);
	}

	// Fallback: basic regex extraction when backend is offline
	const textLower = text.toLowerCase();
	let amount = 0;
	const amtMatch = text.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{2})?)/i);
	if (amtMatch) amount = parseFloat(amtMatch[1].replace(/,/g, ""));
	else {
		const numMatch = text.match(/\b(\d+(?:\.\d{1,2})?)\b/);
		if (numMatch) amount = parseFloat(numMatch[1]);
	}

	let type = "expense";
	if (
		textLower.includes("credited") || textLower.includes("received") ||
		textLower.includes("refund") || textLower.includes("earned") ||
		textLower.includes("salary") || textLower.includes("credit") ||
		textLower.includes("deposit") || textLower.includes("income")
	) {
		type = "income";
	}

	let merchant = "Unknown Merchant";
	const mMatch = text.match(/(?:at|to|from|via)\s+([A-Za-z0-9\s]{3,30}?)(?:\s+on|\s+at|\s+ref|\s+using|\s+for|\s+rs\.?|\b|$)/i);
	if (mMatch) merchant = mMatch[1].trim();
	else if (textLower.includes("zomato")) merchant = "Zomato";
	else if (textLower.includes("uber") || textLower.includes("ola")) merchant = "Uber";

	let category = "Other";
	if (type === "income") category = "Salary";
	else if (textLower.includes("food") || textLower.includes("zomato") || textLower.includes("restaurant")) category = "Food";
	else if (textLower.includes("uber") || textLower.includes("ola") || textLower.includes("petrol") || textLower.includes("fuel")) category = "Transport";
	else if (textLower.includes("amazon") || textLower.includes("flipkart") || textLower.includes("shopping")) category = "Shopping";
	else if (textLower.includes("netflix") || textLower.includes("movie") || textLower.includes("game")) category = "Entertainment";
	else if (textLower.includes("electricity") || textLower.includes("bill") || textLower.includes("recharge")) category = "Bills";
	else if (textLower.includes("pharmacy") || textLower.includes("hospital") || textLower.includes("doctor")) category = "Health";

	const date = format(new Date(), "yyyy-MM-dd");

	return { amount: amount || 0, merchant, category, type, date, notes: "Fallback parsed locally" };
};

// ==========================================
// 3. FINANCIAL ALGORITHMS (ANOMALIES & HEALTH)
// ==========================================

const detectAnomalies = (transactions) => {
	const categories = {};
	transactions
		.filter((t) => t.type === "expense")
		.forEach((t) => {
			if (!categories[t.category]) categories[t.category] = [];
			categories[t.category].push(t.amount);
		});

	const anomalies = [];
	transactions
		.filter((t) => t.type === "expense")
		.forEach((t) => {
			const amounts = categories[t.category].filter((a) => a !== t.amount);
			if (amounts.length < 5) return;

			const sum = amounts.reduce((a, b) => a + b, 0);
			const mean = sum / amounts.length;

			const variance =
				amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
			const stdDev = Math.sqrt(variance);

			const threshold = mean + 2.5 * stdDev;
			if (t.amount > threshold) {
				anomalies.push({
					transactionId: t.id,
					merchant: t.merchant,
					amount: t.amount,
					categoryAverage: Math.round(mean),
					multiplier: (t.amount / (mean || 1)).toFixed(1),
					detectedAt: new Date().toISOString(),
					dismissed: false,
				});
			}
		});

	return anomalies;
};

const calculateFinancialHealth = (
	transactions,
	goals,
	monthlyIncome = 45000,
) => {
	const today = new Date();
	const last30Days = transactions.filter(
		(t) => differenceInDays(today, parseISO(t.date)) <= 30,
	);

	const incomeLast30 =
		last30Days
			.filter((t) => t.type === "income")
			.reduce((sum, t) => sum + t.amount, 0) || monthlyIncome;
	const expenseLast30 = last30Days
		.filter((t) => t.type === "expense")
		.reduce((sum, t) => sum + t.amount, 0);

	// 1. Savings Rate (Max 30pts)
	const savingsRate = Math.max(
		0,
		(incomeLast30 - expenseLast30) / incomeLast30,
	);
	const savingsScore = Math.min(30, savingsRate * 100);

	// 2. Consistency Score (Max 25pts)
	const dailySpend = Array(30).fill(0);
	last30Days
		.filter((t) => t.type === "expense")
		.forEach((t) => {
			const dayIndex = differenceInDays(today, parseISO(t.date));
			if (dayIndex >= 0 && dayIndex < 30) {
				dailySpend[dayIndex] += t.amount;
			}
		});
	const avgDailySpend = dailySpend.reduce((a, b) => a + b, 0) / 30;
	const varianceDaily =
		dailySpend.reduce((a, b) => a + Math.pow(b - avgDailySpend, 2), 0) / 30;
	const stdDaily = Math.sqrt(varianceDaily);
	const cv = stdDaily / (avgDailySpend || 1);
	let consistencyScore = 25;
	if (cv > 2.0) consistencyScore = 5;
	else if (cv > 1.5) consistencyScore = 10;
	else if (cv > 1.0) consistencyScore = 15;
	else if (cv > 0.5) consistencyScore = 20;

	// 3. Category Diversity (Max 20pts)
	const categorySums = {};
	last30Days
		.filter((t) => t.type === "expense")
		.forEach((t) => {
			categorySums[t.category] = (categorySums[t.category] || 0) + t.amount;
		});
	let maxCatSpendPct = 0;
	if (expenseLast30 > 0) {
		const maxCatSpend = Math.max(...Object.values(categorySums));
		maxCatSpendPct = maxCatSpend / expenseLast30;
	}
	let diversityScore = 20;
	if (maxCatSpendPct > 0.8) diversityScore = 5;
	else if (maxCatSpendPct > 0.6) diversityScore = 10;
	else if (maxCatSpendPct > 0.4) diversityScore = 15;

	// 4. Goal Progress (Max 15pts)
	let goalScore = 15;
	if (goals.length > 0) {
		const totalProgress = goals.reduce(
			(acc, goal) => acc + goal.savedAmount / goal.targetAmount,
			0,
		);
		goalScore = Math.min(15, (totalProgress / goals.length) * 15);
	}

	// 5. Streak Bonus (Max 10pts)
	let streakDays = 0;
	for (let i = 0; i < 10; i++) {
		const dStr = format(subDays(today, i), "yyyy-MM-dd");
		const logged = transactions.some((t) => t.date === dStr);
		if (logged) streakDays++;
	}
	let streakScore = 0;
	if (streakDays >= 7) streakScore = 10;
	else if (streakDays >= 4) streakScore = 7;
	else if (streakDays >= 1) streakScore = 4;

	const totalScore = Math.round(
		savingsScore + consistencyScore + diversityScore + goalScore + streakScore,
	);

	let grade = "F";
	if (totalScore >= 85) grade = "A";
	else if (totalScore >= 70) grade = "B";
	else if (totalScore >= 55) grade = "C";
	else if (totalScore >= 40) grade = "D";

	let tip =
		"Your budget is well-balanced. Keep maintaining the streak of logging transactions!";
	if (savingsRate < 0.2) {
		tip =
			"Your savings rate is below the recommended 20%. Try reducing discretionary Food/Shopping expenses.";
	} else if (consistencyScore < 15) {
		tip =
			"Your daily spending is highly volatile. Try to set daily spending limits to keep your cash flow predictable.";
	} else if (diversityScore < 15) {
		tip =
			"You are spending more than 40% of your total expense in one category. Diversify your spending allocations.";
	} else if (goalScore < 10) {
		tip =
			"Goal savings are falling behind. Increase your monthly goal contributions by ₹1,000 to catch up.";
	}

	return {
		score: totalScore,
		grade,
		breakdown: {
			savingsScore,
			consistencyScore,
			diversityScore,
			goalScore,
			streakScore,
		},
		tip,
		computedAt: new Date().toISOString(),
	};
};

// ==========================================
// 4. PROVIDER IMPLEMENTATION
// ==========================================

export function App() {
	const [user, setUser] = useState(null);
	const [transactions, setTransactions] = useState([]);
	const [goals, setGoals] = useState([]);
	const [anomalies, setAnomalies] = useState([]);
	const [healthScore, setHealthScore] = useState({
		score: 80,
		grade: "B",
		tip: "Initializing core intelligence...",
	});
	const [settings, setSettings] = useState({
		mfaEnabled: false,
		mfaSecret: "",
		currency: "₹",
		theme: "dark",
	});
	const [toasts, setToasts] = useState([]);
	const [isLoading, setIsLoading] = useState(true);

	// Initialize and Seed Data
	useEffect(() => {
		const loadData = () => {
			try {
				// Check auth store first, then localStorage fallback
				const authUser = useAuthStore.getState().user;
				const storedUser = authUser || localStorage.getItem("ledger_user");
				const storedTx = localStorage.getItem("ledger_transactions");
				const storedGoals = localStorage.getItem("ledger_goals");
				const storedSettings = localStorage.getItem("ledger_settings");

				let loadedUser = storedUser ? JSON.parse(typeof storedUser === 'string' ? storedUser : JSON.stringify(storedUser)) : null;
				let loadedTx = storedTx ? JSON.parse(storedTx) : [];
				let loadedGoals = storedGoals ? JSON.parse(storedGoals) : [];
				let loadedSettings = storedSettings
					? JSON.parse(storedSettings)
					: { mfaEnabled: false, mfaSecret: "", currency: "₹", theme: "dark" };

				if (loadedTx.length === 0) {
					loadedTx = generateSeedTransactions();
					localStorage.setItem("ledger_transactions", JSON.stringify(loadedTx));
				}

				if (loadedGoals.length === 0) {
					loadedGoals = SEED_GOALS;
					localStorage.setItem("ledger_goals", JSON.stringify(loadedGoals));
				}

				setTransactions(loadedTx);
				setGoals(loadedGoals);
				setSettings(loadedSettings);

				if (loadedUser) {
					setUser(loadedUser);
					const computedHealth = calculateFinancialHealth(
						loadedTx,
						loadedGoals,
						loadedUser.income || 45000,
					);
					setHealthScore(computedHealth);
					localStorage.setItem(
						"ledger_health_score",
						JSON.stringify(computedHealth),
					);

					const computedAnomalies = detectAnomalies(loadedTx);
					setAnomalies(computedAnomalies);
					localStorage.setItem(
						"ledger_anomalies",
						JSON.stringify(computedAnomalies),
					);
				}

				setIsLoading(false);
			} catch (err) {
				console.error("App load error:", err);
				setIsLoading(false);
			}
		};

		loadData();
	}, []);

	// Sync user state with auth store (for login/register navigation)
	useEffect(() => {
		const unsub = useAuthStore.subscribe((state) => {
			if (state.user) {
				const storedProfile = localStorage.getItem("ledger_user");
				let merged = state.user;
				if (storedProfile) {
					try {
						const profile = JSON.parse(storedProfile);
						merged = { ...profile, ...state.user };
					} catch (e) {}
				}
				setUser(merged);
			} else {
				setUser(null);
			}
		});
		return () => unsub();
	}, []);

	const recomputeFinancialStatus = (txs, currentGoals, currentUser) => {
		if (!currentUser) return;
		const computedHealth = calculateFinancialHealth(
			txs,
			currentGoals,
			currentUser.income,
		);
		const computedAnomalies = detectAnomalies(txs);
		setHealthScore(computedHealth);
		setAnomalies(computedAnomalies);
		localStorage.setItem("ledger_health_score", JSON.stringify(computedHealth));
		localStorage.setItem("ledger_anomalies", JSON.stringify(computedAnomalies));
	};

	const showToast = (type, message) => {
		const id = Math.random().toString(36).substr(2, 9);
		setToasts((prev) => [...prev, { id, type, message }]);
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 3000);
	};

	const saveUser = (newProfile) => {
		setUser(newProfile);
		localStorage.setItem("ledger_user", JSON.stringify(newProfile));
		recomputeFinancialStatus(transactions, goals, newProfile);
	};

	const addTransaction = (tx) => {
		const newTx = {
			...tx,
			id: Math.random().toString(36).substr(2, 9),
			version: 1,
			auditTrail: [],
		};
		const updated = [newTx, ...transactions];
		setTransactions(updated);
		localStorage.setItem("ledger_transactions", JSON.stringify(updated));
		showToast("success", `Transaction saved: ${tx.merchant}`);
		recomputeFinancialStatus(updated, goals, user);
	};

	const updateTransaction = (updatedTx) => {
		const original = transactions.find((t) => t.id === updatedTx.id);
		const auditRecord = {
			version: original.version,
			editedAt: new Date().toISOString(),
			previousValue: {
				amount: original.amount,
				merchant: original.merchant,
				category: original.category,
				type: original.type,
				date: original.date,
				notes: original.notes,
			},
		};

		const finalTx = {
			...updatedTx,
			version: original.version + 1,
			auditTrail: [...(original.auditTrail || []), auditRecord],
		};

		const updatedList = transactions.map((t) =>
			t.id === updatedTx.id ? finalTx : t,
		);
		setTransactions(updatedList);
		localStorage.setItem("ledger_transactions", JSON.stringify(updatedList));
		showToast("info", `Transaction updated with audit trail log.`);
		recomputeFinancialStatus(updatedList, goals, user);
	};

	const deleteTransaction = (id) => {
		const updated = transactions.filter((t) => t.id !== id);
		setTransactions(updated);
		localStorage.setItem("ledger_transactions", JSON.stringify(updated));
		showToast("warning", `Transaction deleted.`);
		recomputeFinancialStatus(updated, goals, user);
	};

	const saveGoal = (goal) => {
		const newGoal = {
			...goal,
			id: Math.random().toString(36).substr(2, 9),
			savedAmount: 0,
			contributions: [],
			monteCarloProbability: 50,
		};
		const updated = [...goals, newGoal];
		setGoals(updated);
		localStorage.setItem("ledger_goals", JSON.stringify(updated));
		showToast("success", `Goal created: ${goal.name}`);
		recomputeFinancialStatus(transactions, updated, user);
	};

	const addGoalContribution = (goalId, amount) => {
		const updated = goals.map((g) => {
			if (g.id === goalId) {
				const currentSaved = parseFloat(g.savedAmount) + parseFloat(amount);
				return {
					...g,
					savedAmount: currentSaved,
					contributions: [
						...(g.contributions || []),
						{
							amount: parseFloat(amount),
							date: format(new Date(), "yyyy-MM-dd"),
						},
					],
				};
			}
			return g;
		});
		setGoals(updated);
		localStorage.setItem("ledger_goals", JSON.stringify(updated));
		showToast(
			"success",
			`Added contribution of ${settings.currency}${amount}!`,
		);
		recomputeFinancialStatus(transactions, updated, user);
	};

	const updateSettings = (newSettings) => {
		setSettings(newSettings);
		localStorage.setItem("ledger_settings", JSON.stringify(newSettings));
	};

	// Use native browser scrolling; Lenis was removed to keep scrolling natural.

	useEffect(() => {
		const cursor = document.getElementById("cursor");
		if (!cursor) return;

		const onMouseMove = (e) => {
			cursor.style.left = `${e.clientX}px`;
			cursor.style.top = `${e.clientY}px`;
		};

		window.addEventListener("mousemove", onMouseMove);

		return () => {
			window.removeEventListener("mousemove", onMouseMove);
		};
	}, []);

	// Keyboard shortcut listener
	useEffect(() => {
		const handleKeyDown = (e) => {
			// Ctrl+N -> opens add transaction modal
			if (e.ctrlKey && e.key === "n") {
				e.preventDefault();
				window.location.hash = "#/transactions";
			}
			// Ctrl+/ -> focus search bar
			if (e.ctrlKey && e.key === "/") {
				e.preventDefault();
				const searchInput = document.querySelector(
					'input[placeholder*="Search"]',
				);
				searchInput?.focus();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	if (isLoading) {
		return (
			<div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-spaceBlack">
				<RefreshCw className="h-10 w-10 animate-spin text-primaryViolet" />
				<p className="font-heading text-sm text-slate-400 tracking-wider animate-pulse">
					LedgerPro Platform Booting...
				</p>
			</div>
		);
	}

	return (
		<AppContext.Provider
			value={{
				user,
				saveUser,
				transactions,
				addTransaction,
				updateTransaction,
				deleteTransaction,
				goals,
				saveGoal,
				addGoalContribution,
				anomalies,
				setAnomalies,
				healthScore,
				settings,
				updateSettings,
				toasts,
				showToast,
			}}
		>
			<Router>
				<div className="relative min-h-screen text-slate-100 flex flex-col justify-between">
					<Routes>
						<Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
						<Route
							path="/onboarding"
							element={
								user?.onboardingDone ? (
									<Navigate to="/dashboard" />
								) : (
									<OnboardingWizard />
								)
							}
						/>
						<Route
							path="/login"
							element={user ? <Navigate to="/dashboard" /> : <ModularLogin />}
						/>
						<Route
							path="/register"
							element={user ? <Navigate to="/dashboard" /> : <ModularRegister />}
						/>

						<Route
							path="/*"
							element={
								user ? (
									<Layout>
										<Routes>
											<Route path="/dashboard" element={<ModularDashboard />} />
											<Route
												path="/transactions"
												element={<ModularTransactions />}
											/>
											<Route path="/analytics" element={<ModularReports />} />
											<Route path="/goals" element={<ModularBudgetPage />} />
											<Route path="/retirement" element={<ModularRetirementPage />} />
											<Route path="/settings" element={<ModularSettings />} />
											<Route path="*" element={<Navigate to="/dashboard" />} />
										</Routes>
									</Layout>
								) : (
									<Navigate to="/" />
								)
							}
						/>
					</Routes>

					<ToastStack />
				</div>
			</Router>
		</AppContext.Provider>
	);
}

// ==========================================
// 5. HELPER UX COMPONENTS (CURSOR / TOASTS)
// ==========================================

const ToastStack = () => {
	const { toasts } = useContext(AppContext);
	return (
		<div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full">
			<AnimatePresence>
				{toasts.map((t) => (
					<motion.div
						key={t.id}
						initial={{ opacity: 0, y: 20, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
						className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm backdrop-blur-md shadow-xl ${
							t.type === "success"
								? "bg-emerald-950/80 border-emerald-500/30 text-emerald-300 shadow-emerald-950/20"
								: t.type === "error"
									? "bg-red-950/80 border-red-500/30 text-red-300 shadow-red-950/20"
									: t.type === "warning"
										? "bg-amber-950/80 border-amber-500/30 text-amber-300 shadow-amber-950/20"
										: "bg-indigo-950/80 border-indigo-500/30 text-indigo-300 shadow-indigo-950/20"
						}`}
					>
						<div className="flex-shrink-0">
							{t.type === "success" && <Coins className="h-5 w-5" />}
							{t.type === "error" && <AlertTriangle className="h-5 w-5" />}
							{t.type === "warning" && <AlertTriangle className="h-5 w-5" />}
							{t.type === "info" && <Sparkles className="h-5 w-5" />}
						</div>
						<p className="font-medium text-xs leading-normal">{t.message}</p>
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	);
};

// ==========================================
// 6. LAYOUT COMPONENTS (NAVBAR & SIDEBAR)
// ==========================================

const Layout = ({ children }) => {
	const { user, healthScore, settings } = useContext(AppContext);
	const location = useLocation();
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const navItems = [
		{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
		{ label: "Transactions", path: "/transactions", icon: Receipt },
		{ label: "Analytics", path: "/analytics", icon: BarChart3 },
		{ label: "Goals", path: "/goals", icon: Target },
		{ label: "Retirement", path: "/retirement", icon: PiggyBank },
		{ label: "Settings", path: "/settings", icon: Settings },
	];

	const getHealthColor = (score) => {
		if (score < 40) return "text-red-500 border-red-500/30 bg-red-500/10";
		if (score < 70) return "text-amber-400 border-amber-400/30 bg-amber-400/10";
		return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
	};

	return (
		<div className="flex min-h-screen bg-spaceBlack w-full">
			{/* Sidebar - Desktop */}
			<aside className="hidden md:flex flex-col w-64 bg-slate-950/80 border-r border-slate-900/90 backdrop-blur-md p-6 fixed h-full z-30">
				<div className="flex items-center gap-3 mb-8">
					<div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-primaryViolet to-primaryCyan flex items-center justify-center font-heading font-bold text-lg text-white">
						L
					</div>
					<span className="font-heading font-bold tracking-tight text-xl bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
						LedgerPro
					</span>
				</div>

				<nav className="flex-1 space-y-2">
					{navItems.map((item) => {
						const Icon = item.icon;
						const active = location.pathname === item.path;
						return (
							<Link
								key={item.path}
								to={item.path}
								className={`flex items-center gap-3.5 px-4.5 py-3 rounded-lg text-sm font-medium tracking-wide transition-all ${
									active
										? "bg-gradient-to-r from-primaryViolet/20 to-primaryIndigo/10 text-white border-l-2 border-primaryViolet shadow-lg shadow-primaryViolet/5"
										: "text-slate-400 hover:text-white hover:bg-slate-900/50"
								}`}
							>
								<Icon className="h-4.5 w-4.5" />
								{item.label}
							</Link>
						);
					})}
				</nav>

				<div className="border-t border-slate-900 pt-6 mt-6">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-primaryCyan border border-primaryCyan/20">
							{user.name.charAt(0).toUpperCase()}
						</div>
						<div className="overflow-hidden">
							<p className="text-xs font-semibold text-slate-300 truncate">
								{user.name}
							</p>
							<p className="text-[10px] text-slate-500 truncate">
								{settings.mfaEnabled ? "🛡️ MFA Secured" : "Guest Account"}
							</p>
						</div>
					</div>
				</div>
			</aside>

			{/* Main Panel Wrapper */}
			<div className="flex-1 flex flex-col md:pl-64 min-w-0">
				{/* Top Navbar */}
				<header className="sticky top-0 z-40 bg-spaceBlack/70 backdrop-blur-md border-b border-slate-900/50 py-3.5 px-6 flex items-center justify-between">
					<div className="flex items-center gap-3 md:hidden">
						<button
							onClick={() => setSidebarOpen(!sidebarOpen)}
							className="p-1 text-slate-400 hover:text-white"
						>
							<Menu className="h-6 w-6" />
						</button>
						<span className="font-heading font-bold text-lg bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
							LedgerPro
						</span>
					</div>

					<div className="hidden md:block">
						<h1 className="font-heading font-semibold text-lg text-slate-300 capitalize">
							{location.pathname.substring(1) || "Home"}
						</h1>
					</div>

					<div className="flex items-center gap-4">
						<div
							className={`flex items-center gap-2 border px-3 py-1 rounded-full text-xs font-semibold ${getHealthColor(healthScore.score)}`}
						>
							<Activity className="h-3.5 w-3.5" />
							<span>
								Health: {healthScore.score}% ({healthScore.grade})
							</span>
						</div>

						<div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-primaryViolet border border-primaryViolet/20 md:hidden">
							{user.name.charAt(0).toUpperCase()}
						</div>
					</div>
				</header>

				{/* Dynamic Navigation Drawer (Mobile) */}
				<AnimatePresence>
					{sidebarOpen && (
						<div className="fixed inset-0 z-50 md:hidden flex">
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								onClick={() => setSidebarOpen(false)}
								className="fixed inset-0 bg-spaceBlack/80 backdrop-blur-sm"
							/>
							<motion.div
								initial={{ x: "-100%" }}
								animate={{ x: 0 }}
								exit={{ x: "-100%" }}
								transition={{ type: "tween", duration: 0.3 }}
								className="relative w-64 bg-slate-950 h-full p-6 border-r border-slate-900 flex flex-col justify-between z-10"
							>
								<div>
									<div className="flex items-center justify-between mb-8">
										<span className="font-heading font-bold text-xl text-white">
											LedgerPro
										</span>
										<button
											onClick={() => setSidebarOpen(false)}
											className="text-slate-400 hover:text-white"
										>
											<X className="h-6 w-6" />
										</button>
									</div>
									<nav className="space-y-2">
										{navItems.map((item) => {
											const Icon = item.icon;
											const active = location.pathname === item.path;
											return (
												<Link
													key={item.path}
													to={item.path}
													onClick={() => setSidebarOpen(false)}
													className={`flex items-center gap-3.5 px-4.5 py-3 rounded-lg text-sm font-medium transition-all ${
														active
															? "bg-primaryViolet/20 text-white border-l-2 border-primaryViolet"
															: "text-slate-400 hover:text-white hover:bg-slate-900/50"
													}`}
												>
													<Icon className="h-4.5 w-4.5" />
													{item.label}
												</Link>
											);
										})}
									</nav>
								</div>
								<div className="border-t border-slate-900 pt-6">
									<p className="text-xs text-slate-400 font-semibold">
										{user.name}
									</p>
								</div>
							</motion.div>
						</div>
					)}
				</AnimatePresence>

				{/* Content Body */}
				<main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
					<AnimatePresence mode="wait">
						<motion.div
							key={location.pathname}
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -15 }}
							transition={{ duration: 0.25 }}
						>
							{children}
						</motion.div>
					</AnimatePresence>
				</main>

				{/* Mobile Tab Bar */}
				<div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 border-t border-slate-900/60 backdrop-blur-md flex items-center justify-around py-3">
					{navItems.map((item) => {
						const Icon = item.icon;
						const active = location.pathname === item.path;
						return (
							<Link
								key={item.path}
								to={item.path}
								className={`flex flex-col items-center justify-center text-[10px] ${active ? "text-primaryViolet font-medium" : "text-slate-500"}`}
							>
								<Icon className="h-5 w-5 mb-1" />
								<span>{item.label}</span>
							</Link>
						);
					})}
				</div>
			</div>
		</div>
	);
};

// ==========================================
// 7. PAGE 1: LANDING PAGE (/)
// ==========================================

const LandingPage = () => {
	const { user } = useContext(AppContext);
	const navigate = useNavigate();
	const canvasRef = useRef(null);

	// Three.js floating background
	useEffect(() => {
		if (!canvasRef.current || !window.THREE) return;
		const THREE = window.THREE;

		const width = window.innerWidth;
		const height = window.innerHeight;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
		camera.position.z = 200;

		const renderer = new THREE.WebGLRenderer({
			canvas: canvasRef.current,
			alpha: true,
			antialias: true,
		});
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		const particleCount = 200;
		const geometry = new THREE.BufferGeometry();
		const positions = new Float32Array(particleCount * 3);
		const velocities = new Float32Array(particleCount * 3);

		for (let i = 0; i < particleCount * 3; i += 3) {
			positions[i] = (Math.random() - 0.5) * 300;
			positions[i + 1] = (Math.random() - 0.5) * 300;
			positions[i + 2] = (Math.random() - 0.5) * 150;

			velocities[i] = (Math.random() - 0.5) * 0.4;
			velocities[i + 1] = (Math.random() - 0.5) * 0.4;
			velocities[i + 2] = (Math.random() - 0.5) * 0.2;
		}

		geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

		const pMaterial = new THREE.PointsMaterial({
			color: 0x7c3aed,
			size: 4,
			transparent: true,
			opacity: 0.85,
			blending: THREE.AdditiveBlending,
		});

		const particles = new THREE.Points(geometry, pMaterial);
		scene.add(particles);

		let mouseX = 0;
		let mouseY = 0;
		const handleMouseMove = (e) => {
			mouseX = (e.clientX - window.innerWidth / 2) * 0.05;
			mouseY = (e.clientY - window.innerHeight / 2) * 0.05;
		};
		window.addEventListener("mousemove", handleMouseMove);

		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};
		window.addEventListener("resize", handleResize);

		let animationFrameId;
		const animate = () => {
			animationFrameId = requestAnimationFrame(animate);

			const positionsArray = geometry.attributes.position.array;
			for (let i = 0; i < particleCount * 3; i += 3) {
				positionsArray[i] += velocities[i];
				positionsArray[i + 1] += velocities[i + 1];
				positionsArray[i + 2] += velocities[i + 2];

				if (Math.abs(positionsArray[i]) > 160) velocities[i] *= -1;
				if (Math.abs(positionsArray[i + 1]) > 160) velocities[i + 1] *= -1;
				if (Math.abs(positionsArray[i + 2]) > 100) velocities[i + 2] *= -1;
			}
			geometry.attributes.position.needsUpdate = true;

			camera.position.x += (mouseX - camera.position.x) * 0.05;
			camera.position.y += (-mouseY - camera.position.y) * 0.05;
			camera.lookAt(scene.position);

			renderer.render(scene, camera);
		};
		animate();

		return () => {
			cancelAnimationFrame(animationFrameId);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("resize", handleResize);
			renderer.dispose();
		};
	}, []);

	const [taglineIndex, setTaglineIndex] = useState(0);
	const taglines = [
		"Track Wealth.",
		"Predict Spending.",
		"Visualize Your Money.",
	];
	const [displayedText, setDisplayedText] = useState("");

	useEffect(() => {
		let timer;
		let word = taglines[taglineIndex];
		let isDeleting = false;
		let charIndex = 0;

		const tick = () => {
			if (!isDeleting) {
				setDisplayedText(word.substring(0, charIndex + 1));
				charIndex++;
				if (charIndex === word.length) {
					isDeleting = true;
					timer = setTimeout(tick, 1500);
				} else {
					timer = setTimeout(tick, 100);
				}
			} else {
				setDisplayedText(word.substring(0, charIndex - 1));
				charIndex--;
				if (charIndex === 0) {
					isDeleting = false;
					setTaglineIndex((prev) => (prev + 1) % taglines.length);
					timer = setTimeout(tick, 500);
				} else {
					timer = setTimeout(tick, 50);
				}
			}
		};

		tick();
		return () => clearTimeout(timer);
	}, [taglineIndex]);

	const handleStart = () => {
		if (user?.onboardingDone) {
			navigate("/dashboard");
		} else {
			navigate("/onboarding");
		}
	};

	const handleScrollToFeatures = () => {
		document
			.getElementById("features-section")
			.scrollIntoView({ behavior: "smooth" });
	};

	return (
		<div className="relative min-h-screen bg-spaceBlack overflow-hidden flex flex-col w-full">
			<canvas
				ref={canvasRef}
				className="absolute inset-0 z-0 pointer-events-none w-full h-full"
			/>

			<section className="relative z-10 flex-1 flex flex-col justify-center items-center px-6 text-center h-screen max-w-4xl mx-auto">
				<motion.h1
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, ease: "easeOut" }}
					className="font-heading font-bold text-5xl md:text-7xl mb-4 tracking-tight"
				>
					<span className="shimmer-text">LedgerPro</span>
				</motion.h1>

				<p className="font-heading font-medium text-lg md:text-2xl text-slate-300 min-h-[2.5rem] tracking-wide mb-8">
					{displayedText}
					<span className="inline-block w-0.5 h-6 bg-primaryCyan animate-pulse ml-1 align-middle"></span>
				</p>

				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3, duration: 0.8 }}
					className="text-slate-400 text-sm md:text-base max-w-lg mb-10 leading-relaxed font-light"
				>
					Unlock state-of-the-art client-side AI financial modeling. Clean
					receipts with OCR, run Monte Carlo simulators, and project future
					patterns, all computed 100% locally in your browser.
				</motion.p>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5, duration: 0.6 }}
					className="flex flex-col sm:flex-row gap-4.5"
				>
					<button
						onClick={handleStart}
						className="px-8 py-3.5 bg-gradient-to-r from-primaryViolet to-primaryIndigo hover:from-primaryCyan hover:to-primaryIndigo rounded-full text-sm font-semibold tracking-wider transition-all duration-300 shadow-[0_0_20px_rgba(124,58,237,0.4)]"
					>
						Get Started Free
					</button>
					<button
						onClick={handleScrollToFeatures}
						className="px-8 py-3.5 border border-primaryViolet/40 hover:border-primaryCyan bg-slate-950/30 hover:bg-slate-900/30 rounded-full text-sm font-semibold tracking-wider transition-all duration-300"
					>
						See Features
					</button>
				</motion.div>

				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.8, duration: 0.6 }}
					className="mt-8 flex items-center gap-4 text-sm"
				>
					<span className="text-slate-500">Already have an account?</span>
					<button
						onClick={() => navigate("/login")}
						className="px-5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 font-semibold transition-all"
					>
						Sign In
					</button>
					<span className="text-slate-600">or</span>
					<button
						onClick={() => navigate("/register")}
						className="px-5 py-2 bg-gradient-to-r from-primaryViolet to-primaryIndigo rounded-lg text-white font-semibold transition-all hover:opacity-90"
					>
						Create Account
					</button>
				</motion.div>
			</section>

			<section
				id="features-section"
				className="relative z-10 bg-slate-950/60 border-t border-slate-900/60 py-20 px-6 backdrop-blur"
			>
				<div className="max-w-6xl mx-auto">
					<h2 className="font-heading font-semibold text-2xl md:text-3xl text-center text-white mb-12 tracking-tight">
						Next-Gen Personal Capital Infrastructure
					</h2>

					<div className="grid md:grid-cols-3 gap-8">
						<motion.div
							whileHover={{ y: -8, scale: 1.01 }}
							className="glass-panel rounded-xl p-6.5 text-left transition-all duration-300 flex flex-col justify-between"
						>
							<div>
								<div className="h-10 w-10 bg-primaryViolet/20 rounded-lg flex items-center justify-center text-primaryViolet mb-5 border border-primaryViolet/20">
									<Activity className="h-5 w-5" />
								</div>
								<h3 className="font-heading font-semibold text-lg text-white mb-2">
									Automated Local OCR
								</h3>
								<p className="text-slate-400 text-xs leading-relaxed font-light">
									Upload transaction billing receipts. The built-in Tesseract.js
									engine parses receipt text dynamically and categorizes
									expenditures locally.
								</p>
							</div>
						</motion.div>

						<motion.div
							whileHover={{ y: -8, scale: 1.01 }}
							className="glass-panel rounded-xl p-6.5 text-left transition-all duration-300 flex flex-col justify-between"
						>
							<div>
								<div className="h-10 w-10 bg-primaryCyan/20 rounded-lg flex items-center justify-center text-primaryCyan mb-5 border border-primaryCyan/20">
									<TrendingUp className="h-5 w-5" />
								</div>
								<h3 className="font-heading font-semibold text-lg text-white mb-2">
									Neural Net Forecasting
								</h3>
								<p className="text-slate-400 text-xs leading-relaxed font-light">
									A local LSTM neural network built via Brain.js runs directly
									in-browser. Train model layers in real-time to forecast the
									next 30 days of expenses.
								</p>
							</div>
						</motion.div>

						<motion.div
							whileHover={{ y: -8, scale: 1.01 }}
							className="glass-panel rounded-xl p-6.5 text-left transition-all duration-300 flex flex-col justify-between"
						>
							<div>
								<div className="h-10 w-10 bg-primaryIndigo/20 rounded-lg flex items-center justify-center text-primaryIndigo mb-5 border border-primaryIndigo/20">
									<Target className="h-5 w-5" />
								</div>
								<h3 className="font-heading font-semibold text-lg text-white mb-2">
									Monte Carlo Simulation
								</h3>
								<p className="text-slate-400 text-xs leading-relaxed font-light">
									Run 500 parallel stochastic financial projections. Calculate
									target goals completion percentages using daily cashflow
									probability curves.
								</p>
							</div>
						</motion.div>
					</div>
				</div>
			</section>
		</div>
	);
};

// ==========================================
// 8. PAGE 2: ONBOARDING WIZARD
// ==========================================

const OnboardingWizard = () => {
	const { saveUser } = useContext(AppContext);
	const navigate = useNavigate();
	const [step, setStep] = useState(1);
	const [formData, setFormData] = useState({
		name: "",
		income: "45000",
		currency: "₹",
		firstGoalName: "Emergency Savings",
		firstGoalAmount: "50000",
		smsPaste:
			"Debited Rs. 450.00 spent at Zomato on 28-05-2026. Available balance: Rs. 12,000.",
	});

	const nextStep = () => setStep((s) => s + 1);
	const prevStep = () => setStep((s) => s - 1);

	const handleSubmit = async () => {
		const profile = {
			name: formData.name || "Guest User",
			income: parseFloat(formData.income) || 45000,
			currency: formData.currency,
			createdAt: new Date().toISOString(),
			onboardingDone: true,
		};

		saveUser(profile);

		if (formData.firstGoalAmount) {
			const g = {
				id: "g-onboard",
				name: formData.firstGoalName,
				emoji: "🚨",
				targetAmount: parseFloat(formData.firstGoalAmount),
				savedAmount: 0,
				targetDate: format(addDays(new Date(), 180), "yyyy-MM-dd"),
				monthlyContribution: Math.round(
					parseFloat(formData.firstGoalAmount) / 6,
				),
				monteCarloProbability: 50,
				contributions: [],
			};
			localStorage.setItem("ledger_goals", JSON.stringify([g]));
		}

		if (formData.smsPaste) {
			const parsed = await parseSMS(formData.smsPaste);
			if (parsed.amount > 0) {
				const txList = generateSeedTransactions();
				const firstTx = {
					...parsed,
					id: "onboard-tx-1",
					version: 1,
					auditTrail: [],
				};
				const newList = [firstTx, ...txList];
				localStorage.setItem("ledger_transactions", JSON.stringify(newList));
			}
		}

		navigate("/dashboard");
	};

	return (
		<div className="min-h-screen bg-spaceBlack flex items-center justify-center p-6 w-full">
			<div className="glass-panel w-full max-w-xl rounded-2xl p-8 relative overflow-hidden transition-all duration-300">
				<div className="flex justify-between items-center mb-10">
					<span className="text-[10px] uppercase font-semibold text-primaryCyan tracking-widest font-heading">
						Setup Wizard — Step {step} of 3
					</span>
					<div className="flex gap-2">
						{[1, 2, 3].map((s) => (
							<div
								key={s}
								className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
									s === step
										? "bg-primaryViolet shadow-[0_0_8px_#7C3AED]"
										: s < step
											? "bg-indigo-700"
											: "bg-slate-800"
								}`}
							/>
						))}
					</div>
				</div>

				<AnimatePresence mode="wait">
					<motion.div
						key={step}
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -20 }}
						transition={{ duration: 0.3 }}
					>
						{step === 1 && (
							<div>
								<h2 className="font-heading font-semibold text-2xl text-white mb-2">
									Welcome to LedgerPro
								</h2>
								<p className="text-slate-400 text-xs mb-8">
									Establish your base credentials to personalize local
									dashboards.
								</p>

								<div className="space-y-5">
									<div>
										<label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
											Your Name
										</label>
										<input
											type="text"
											value={formData.name}
											onChange={(e) =>
												setFormData({ ...formData, name: e.target.value })
											}
											placeholder="e.g. John Doe"
											className="w-full bg-slate-950/60 border border-slate-800 focus:border-primaryViolet rounded-lg px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all focus:ring-1 focus:ring-primaryViolet/50"
										/>
									</div>

									<div className="grid grid-cols-3 gap-4">
										<div className="col-span-2">
											<label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
												Monthly Net Income
											</label>
											<input
												type="number"
												value={formData.income}
												onChange={(e) =>
													setFormData({ ...formData, income: e.target.value })
												}
												placeholder="45000"
												className="w-full bg-slate-950/60 border border-slate-800 focus:border-primaryViolet rounded-lg px-4 py-3 text-sm text-slate-100 focus:outline-none transition-all"
											/>
										</div>
										<div>
											<label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
												Currency
											</label>
											<select
												value={formData.currency}
												onChange={(e) =>
													setFormData({ ...formData, currency: e.target.value })
												}
												className="w-full bg-slate-950/60 border border-slate-800 focus:border-primaryViolet rounded-lg px-4 py-3 text-sm text-slate-100 focus:outline-none transition-all"
											>
												<option value="₹">INR (₹)</option>
												<option value="$">USD ($)</option>
												<option value="€">EUR (€)</option>
											</select>
										</div>
									</div>
								</div>
							</div>
						)}

						{step === 2 && (
							<div>
								<h2 className="font-heading font-semibold text-2xl text-white mb-2">
									Establish a Goal
								</h2>
								<p className="text-slate-400 text-xs mb-8">
									Establish targets to enable the local Monte Carlo stochastic
									calculations.
								</p>

								<div className="space-y-5">
									<div>
										<label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
											Goal Name
										</label>
										<input
											type="text"
											value={formData.firstGoalName}
											onChange={(e) =>
												setFormData({
													...formData,
													firstGoalName: e.target.value,
												})
											}
											className="w-full bg-slate-950/60 border border-slate-800 focus:border-primaryViolet rounded-lg px-4 py-3 text-sm text-slate-100 focus:outline-none"
										/>
									</div>

									<div>
										<label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
											Target Savings Amount
										</label>
										<input
											type="number"
											value={formData.firstGoalAmount}
											onChange={(e) =>
												setFormData({
													...formData,
													firstGoalAmount: e.target.value,
												})
											}
											className="w-full bg-slate-950/60 border border-slate-800 focus:border-primaryViolet rounded-lg px-4 py-3 text-sm text-slate-100 focus:outline-none"
										/>
									</div>
								</div>
							</div>
						)}

						{step === 3 && (
							<div>
								<h2 className="font-heading font-semibold text-2xl text-white mb-2">
									Test statement Parser
								</h2>
								<p className="text-slate-400 text-xs mb-8">
									Test-drive NLP transaction compilation by pasting a bank
									notification below.
								</p>

								<div>
									<label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
										Bank SMS Statement
									</label>
									<textarea
										rows="4"
										value={formData.smsPaste}
										onChange={(e) =>
											setFormData({ ...formData, smsPaste: e.target.value })
										}
										className="w-full bg-slate-950/60 border border-slate-800 focus:border-primaryViolet rounded-lg px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none font-mono"
									/>
								</div>
							</div>
						)}
					</motion.div>
				</AnimatePresence>

				<div className="flex justify-between items-center mt-12 border-t border-slate-900 pt-6">
					<button
						onClick={step === 1 ? () => navigate("/") : prevStep}
						className="px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-semibold tracking-wider transition-all"
					>
						{step === 1 ? "Exit" : "Back"}
					</button>

					<div className="flex gap-3">
						<button
							onClick={handleSubmit}
							className="px-5 py-2.5 text-slate-500 hover:text-slate-300 text-xs font-semibold tracking-wider"
						>
							Skip Setup
						</button>
						<button
							onClick={step === 3 ? handleSubmit : nextStep}
							className="px-6 py-2.5 bg-gradient-to-r from-primaryViolet to-primaryIndigo text-white rounded-lg text-xs font-semibold tracking-wider shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all hover:opacity-90"
						>
							{step === 3 ? "Complete Setup" : "Continue"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default App;
