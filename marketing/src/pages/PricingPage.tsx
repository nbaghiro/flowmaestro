import { motion } from "framer-motion";
import {
    Check,
    Users,
    Zap,
    Building2,
    Shield,
    FileText,
    Download,
    Cloud,
    Key,
    Database,
    EyeOff,
    ListOrdered,
    LayoutDashboard,
    FileCheck,
    Bot
} from "lucide-react";
import React from "react";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

// Credit tier breakpoints for labels
const CREDIT_TIERS = [
    { value: 5000, label: "5k" },
    { value: 25000, label: "25k" },
    { value: 50000, label: "50k" },
    { value: 100000, label: "100k" },
    { value: 250000, label: "250k" },
    { value: 500000, label: "500k" },
    { value: 1000000, label: "1M" }
];

// Min and max credit values for the slider
const MIN_CREDITS = 5000;
const MAX_CREDITS = 1000000;

// Convert slider position (0-100) to credit value with non-linear scaling
const sliderToCredits = (sliderValue: number): number => {
    // Use logarithmic scale for better UX across wide range
    const minLog = Math.log(MIN_CREDITS);
    const maxLog = Math.log(MAX_CREDITS);
    const scale = (maxLog - minLog) / 100;
    const credits = Math.exp(minLog + scale * sliderValue);

    // Round to nice numbers
    if (credits < 10000) return Math.round(credits / 1000) * 1000;
    if (credits < 100000) return Math.round(credits / 5000) * 5000;
    if (credits < 500000) return Math.round(credits / 10000) * 10000;
    return Math.round(credits / 50000) * 50000;
};

// Convert credit value to slider position (0-100)
const creditsToSlider = (credits: number): number => {
    const minLog = Math.log(MIN_CREDITS);
    const maxLog = Math.log(MAX_CREDITS);
    return ((Math.log(credits) - minLog) / (maxLog - minLog)) * 100;
};

// Get slider position for a tier (for tick marks)
const getTierSliderPosition = (tierValue: number): number => {
    return creditsToSlider(tierValue);
};

// Price calculation based on credits
const calculatePrice = (
    basePrice: number,
    baseCredits: number,
    selectedCredits: number
): number => {
    if (selectedCredits <= baseCredits) return basePrice;
    const additionalCredits = selectedCredits - baseCredits;
    // $5 per 10k additional credits
    const additionalCost = Math.ceil(additionalCredits / 10000) * 5;
    return basePrice + additionalCost;
};

interface PlanFeature {
    text: string;
    included: boolean;
}

interface PricingPlan {
    name: string;
    tagline: string;
    basePrice: number;
    baseCredits: number;
    icon: React.ReactNode;
    color: string;
    borderColor: string;
    features: PlanFeature[];
    cta: string;
    popular?: boolean;
}

const plans: PricingPlan[] = [
    {
        name: "Free",
        tagline: "Get started for free",
        basePrice: 0,
        baseCredits: 5000,
        icon: <Zap className="w-5 h-5" />,
        color: "bg-amber-500",
        borderColor: "border-amber-500/50",
        cta: "Start Free",
        features: [
            { text: "5k credits/month", included: true },
            { text: "1 Builder", included: true },
            { text: "3 Active Workflows", included: true },
            { text: "1 Parallel Execution", included: true },
            { text: "5 Agent Sessions/day", included: true },
            { text: "Community Discord", included: true },
            { text: "All 220+ Integrations", included: true }
        ]
    },
    {
        name: "Solo",
        tagline: "For power users",
        basePrice: 29,
        baseCredits: 25000,
        icon: <Users className="w-5 h-5" />,
        color: "bg-foreground",
        borderColor: "border-foreground/50",
        cta: "Start Trial",
        popular: true,
        features: [
            { text: "25k+ credits/month", included: true },
            { text: "Everything in Free, plus:", included: true },
            { text: "Unlimited Workflows", included: true },
            { text: "3 Parallel Executions", included: true },
            { text: "Unlimited Agent Sessions", included: true },
            { text: "Custom Triggers & Webhooks", included: true },
            { text: "Version History (30 days)", included: true },
            { text: "Email Support", included: true },
            { text: "Use Your Own LLM Keys", included: true }
        ]
    },
    {
        name: "Team",
        tagline: "For growing teams",
        basePrice: 99,
        baseCredits: 50000,
        icon: <Building2 className="w-5 h-5" />,
        color: "bg-pink-500",
        borderColor: "border-pink-500/50",
        cta: "Start Trial",
        features: [
            { text: "50k+ credits/month", included: true },
            { text: "Everything in Solo, plus:", included: true },
            { text: "Up to 10 Builders", included: true },
            { text: "10 Parallel Executions", included: true },
            { text: "Shared Workflow Library", included: true },
            { text: "Team Permissions & Roles", included: true },
            { text: "Execution Analytics", included: true },
            { text: "Version History (Unlimited)", included: true },
            { text: "Priority Support", included: true },
            { text: "Custom Integrations (coming soon)", included: true }
        ]
    }
];

interface PricingCardProps {
    plan: PricingPlan;
    selectedCredits: number;
    isAnnual: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({ plan, selectedCredits, isAnnual }) => {
    const monthlyPrice = calculatePrice(plan.basePrice, plan.baseCredits, selectedCredits);
    const displayPrice = isAnnual ? Math.round(monthlyPrice * 0.8) : monthlyPrice;
    const creditsDisplay =
        selectedCredits >= 1000000 ? `${selectedCredits / 1000000}M` : `${selectedCredits / 1000}k`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-2xl bg-background-surface backdrop-blur-sm border ${
                plan.popular ? plan.borderColor : "border-stroke"
            } p-6 flex flex-col h-full`}
        >
            {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-medium bg-foreground text-background rounded-full">
                        Most Popular
                    </span>
                </div>
            )}

            {/* Plan Icon & Name */}
            <div className="mb-4">
                <div
                    className={`w-10 h-10 rounded-lg ${plan.color} flex items-center justify-center mb-3`}
                >
                    {plan.icon}
                </div>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-sm text-gray-400">{plan.tagline}</p>
            </div>

            {/* Price */}
            <div className="mb-6">
                {plan.basePrice === 0 ? (
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">Free</span>
                    </div>
                ) : (
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">${displayPrice}</span>
                        <span className="text-gray-400">/ month</span>
                    </div>
                )}
                <p className="text-sm text-gray-500 mt-1">{creditsDisplay}+ credits/month</p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-6 flex-grow">
                {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{feature.text}</span>
                    </li>
                ))}
            </ul>

            {/* CTA Button */}
            <a
                href={import.meta.env.VITE_APP_URL || "http://localhost:3000"}
                className={`w-full py-3 rounded-lg font-semibold text-center transition-all duration-200 ${
                    plan.popular
                        ? "bg-white text-black hover:bg-gray-100"
                        : "bg-background-elevated text-white hover:bg-border border border-stroke"
                }`}
            >
                {plan.cta}
            </a>
        </motion.div>
    );
};

export const PricingPage: React.FC = () => {
    const [sliderValue, setSliderValue] = React.useState(() => creditsToSlider(25000)); // Default to 25k
    const [isAnnual, setIsAnnual] = React.useState(false);

    const selectedCredits = sliderToCredits(sliderValue);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navigation />

            {/* Hero Section */}
            <section className="relative pt-32 pb-8 px-4 sm:px-6 lg:px-8">
                <div className="absolute inset-0 grid-pattern opacity-50"></div>
                <div className="relative z-10 max-w-5xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
                            Pricing that scales
                            <span className="gradient-text"> with you</span>
                        </h1>
                        <p className="text-xl text-gray-400">Easy to start, easy to grow</p>
                    </motion.div>
                </div>
            </section>

            {/* Billing Toggle */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-center items-center gap-3">
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                !isAnnual ? "bg-white text-black" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                isAnnual ? "bg-white text-black" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            Annually
                            <span className="px-2 py-0.5 text-xs font-bold bg-green-500 text-white rounded-full">
                                20% OFF
                            </span>
                        </button>
                    </div>
                </div>
            </section>

            {/* Credit Slider */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-12">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-background-surface backdrop-blur-sm border border-stroke rounded-2xl p-8">
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-gray-400">I need</span>
                            <span className="text-4xl font-bold text-white font-mono">
                                {selectedCredits.toLocaleString()}
                            </span>
                            <span className="text-gray-400">credits per month</span>
                        </div>

                        {/* Slider */}
                        <div className="relative">
                            <input
                                type="range"
                                min={0}
                                max={100}
                                step={0.5}
                                value={sliderValue}
                                onChange={(e) => setSliderValue(Number(e.target.value))}
                                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
                            />

                            {/* Tick marks with absolute positioning */}
                            <div className="relative mt-2 h-6">
                                {CREDIT_TIERS.map((tier) => {
                                    const position = getTierSliderPosition(tier.value);
                                    const isActive =
                                        Math.abs(selectedCredits - tier.value) < tier.value * 0.1;
                                    return (
                                        <button
                                            key={tier.value}
                                            onClick={() =>
                                                setSliderValue(creditsToSlider(tier.value))
                                            }
                                            className={`absolute text-xs font-mono transition-colors -translate-x-1/2 ${
                                                isActive
                                                    ? "text-white font-semibold"
                                                    : "text-gray-500 hover:text-gray-300"
                                            }`}
                                            style={{ left: `${position}%` }}
                                        >
                                            {tier.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-24">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <PricingCard
                                key={plan.name}
                                plan={plan}
                                selectedCredits={selectedCredits}
                                isAnnual={isAnnual}
                            />
                        ))}
                    </div>

                    {/* Enterprise Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-8 rounded-2xl bg-background-surface backdrop-blur-sm border border-stroke p-8"
                    >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
                            <div>
                                <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center mb-3">
                                    <Building2 className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-white">Enterprise</h3>
                                <p className="text-gray-400">Teams looking to scale</p>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-bold text-primary-400">
                                    Custom Pricing
                                </span>
                            </div>
                        </div>

                        <p className="text-gray-400 mb-6">Everything included in Team, plus:</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4 mb-8">
                            <div className="flex items-center gap-3">
                                <Shield className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-300">
                                    Role Based Access Control
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Key className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-300">SCIM/SAML Support</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <LayoutDashboard className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-300">Admin Dashboard</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-300">Audit Logs</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Database className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-300">Custom Data Retention</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <FileCheck className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-300">
                                    Regular Security Reports
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Download className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-300">Data Exports</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <EyeOff className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-300">Incognito Mode</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Bot className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-300">
                                    AI Model Access Control
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Cloud className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-300">Virtual Private Cloud</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <ListOrdered className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-300">Flow Queuing</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-300">Dedicated Support</span>
                            </div>
                        </div>

                        <a
                            href="https://cal.com/naib-baghirov-o5surn/30min"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-3 rounded-lg font-semibold text-center bg-gray-800 text-white hover:bg-gray-700 transition-all duration-200"
                        >
                            Contact Sales
                        </a>
                    </motion.div>
                </div>
            </section>

            <Footer />

            {/* Custom slider styles */}
            <style>{`
                .slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    border: 3px solid white;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                }

                .slider::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    border: 3px solid white;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                }
            `}</style>
        </div>
    );
};
