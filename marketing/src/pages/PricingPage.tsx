import React, { useEffect, useRef, useState } from "react";
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from "@flowmaestro/shared";
import type { SubscriptionPlan } from "@flowmaestro/shared";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/home/Reveal";
import { Tile } from "../components/home/Tile";
import { Navigation } from "../components/Navigation";
import { EngagementEvents, PricingEvents } from "../lib/analytics";
import { BOOK_DEMO_URL } from "../lib/links";
import { cn } from "../lib/utils";
import "../styles/home.css";
import "../styles/pricing.css";

const PLANS: SubscriptionPlan[] = [
    SUBSCRIPTION_PLANS.free,
    SUBSCRIPTION_PLANS.pro,
    SUBSCRIPTION_PLANS.team
];

// The estimator slider runs from the free allowance to well past the Team plan on a log scale.
const MIN_CREDITS = 250;
const MAX_CREDITS = 100000;
const TICKS = [250, 1000, 5000, 25000, 100000];

const ENTERPRISE_POINTS = [
    "Role based access control",
    "SCIM and SAML",
    "Admin dashboard",
    "Audit logs",
    "Custom data retention",
    "Regular security reports",
    "Data exports",
    "Incognito mode",
    "AI model access control",
    "Virtual private cloud",
    "Flow queuing",
    "Dedicated support"
];

const FAQ: { q: string; a: string }[] = [
    {
        q: "What does a credit pay for?",
        a: "Model calls are metered by tokens, with a minimum of 25 credits per call. Tool calls and agent turns cost 15 credits, agent memory 25, and routing 30 to 50. Triggers, conditions, loops, merges, delays, variables and outputs are free."
    },
    {
        q: "What happens when I run out?",
        a: "A run that would exceed your balance does not start. It fails with an insufficient credits error until you add a pack or the plan refreshes."
    },
    {
        q: "Do unused credits roll over?",
        a: "Plan credits reset at the start of each billing period. Credit packs are added to your purchased balance and are not reset."
    },
    {
        q: "Is there a trial?",
        a: "Pro and Team start with a 14-day trial. The Free plan needs no card."
    },
    {
        q: "Can I change plans later?",
        a: "Yes. Upgrade, downgrade or cancel from the workspace billing settings at any time."
    },
    {
        q: "Do you bill annually?",
        a: "Yes. Pro is $290 a year and Team is $990 a year, which is two months free compared with monthly billing."
    }
];

function sliderToCredits(position: number): number {
    const minLog = Math.log(MIN_CREDITS);
    const maxLog = Math.log(MAX_CREDITS);
    const raw = Math.exp(minLog + ((maxLog - minLog) * position) / 100);
    if (raw < 1000) return Math.round(raw / 50) * 50;
    if (raw < 10000) return Math.round(raw / 250) * 250;
    return Math.round(raw / 1000) * 1000;
}

function creditsToSlider(credits: number): number {
    const minLog = Math.log(MIN_CREDITS);
    const maxLog = Math.log(MAX_CREDITS);
    return ((Math.log(credits) - minLog) / (maxLog - minLog)) * 100;
}

function formatTick(credits: number): string {
    return credits >= 1000 ? `${credits / 1000}k` : String(credits);
}

function dollars(cents: number): string {
    return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

function limitLabel(value: number): string {
    return value < 0 ? "Unlimited" : value.toLocaleString("en-US");
}

const PACK_UNITS = CREDIT_PACKS.map((pack) => ({
    units: pack.credits / 1000,
    cents: pack.priceInCents
}));

/** Cheapest combination of packs that covers `extra` credits, in cents. */
function packCostCents(extra: number): number {
    const units = Math.ceil(extra / 1000);
    const best: number[] = new Array<number>(units + 1).fill(Number.POSITIVE_INFINITY);
    best[0] = 0;
    for (let u = 1; u <= units; u++) {
        for (const pack of PACK_UNITS) {
            const candidate = best[Math.max(0, u - pack.units)] + pack.cents;
            if (candidate < best[u]) best[u] = candidate;
        }
    }
    return best[units];
}

interface Estimate {
    extra: number;
    packCents: number;
    totalCents: number;
}

function estimate(plan: SubscriptionPlan, credits: number, annual: boolean): Estimate {
    const base = annual ? plan.annualPriceCents / 12 : plan.monthlyPriceCents;
    const extra = Math.max(0, credits - plan.monthlyCredits);
    const packCents = extra > 0 ? packCostCents(extra) : 0;
    return { extra, packCents, totalCents: base + packCents };
}

const Eyebrow: React.FC<{ children: React.ReactNode; bright?: boolean }> = ({
    children,
    bright
}) => (
    <p
        className={cn(
            "font-mono text-[11px] tracking-[0.08em] uppercase",
            bright ? "text-foreground" : "text-dim"
        )}
    >
        {children}
    </p>
);

interface PlanCardProps {
    plan: SubscriptionPlan;
    annual: boolean;
    onCta: (plan: SubscriptionPlan) => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, annual, onCta }) => {
    const highlight = plan.slug === "pro";
    const free = plan.monthlyPriceCents === 0;
    const price = annual ? plan.annualPriceCents : plan.monthlyPriceCents;
    const period = free ? "" : annual ? " /year" : " /month";
    const note = free
        ? "no card required"
        : annual
          ? `${dollars(plan.annualPriceCents / 12)} a month, billed yearly`
          : `or ${dollars(plan.annualPriceCents)} a year`;
    const features = plan.features.filter((feature) => !/credits\/month/.test(feature));

    return (
        <Reveal className="span2">
            <Tile className="flex flex-col gap-[14px] h-full" style={{ padding: "32px 24px" }}>
                <Eyebrow bright={highlight}>{plan.name}</Eyebrow>
                <p className="text-[40px] font-bold tracking-[-0.03em] leading-none">
                    {dollars(price)}
                    {period && <span className="text-sm text-dim font-medium">{period}</span>}
                </p>
                <p className="text-sm text-muted-foreground">
                    {plan.monthlyCredits.toLocaleString("en-US")} credits a month · {note}
                </p>
                <ul className="m-0 pl-[18px] text-body text-sm leading-[1.8] list-disc">
                    {features.map((feature) => (
                        <li key={feature}>{feature}</li>
                    ))}
                </ul>
                <a
                    href={BOOK_DEMO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onCta(plan)}
                    className={cn("btn mt-auto w-full", highlight ? "btn-solid" : "btn-ghost")}
                >
                    Book a demo
                </a>
            </Tile>
        </Reveal>
    );
};

const LIMIT_ROWS: { label: string; value: (plan: SubscriptionPlan) => string }[] = [
    { label: "Credits a month", value: (plan) => plan.monthlyCredits.toLocaleString("en-US") },
    { label: "Workflows", value: (plan) => limitLabel(plan.limits.maxWorkflows) },
    { label: "Agents", value: (plan) => limitLabel(plan.limits.maxAgents) },
    { label: "Knowledge bases", value: (plan) => limitLabel(plan.limits.maxKnowledgeBases) },
    { label: "Indexed chunks", value: (plan) => limitLabel(plan.limits.maxKbChunks) },
    { label: "Members", value: (plan) => limitLabel(plan.limits.maxMembers) },
    { label: "Connections", value: (plan) => limitLabel(plan.limits.maxConnections) },
    { label: "Execution history", value: (plan) => `${plan.limits.executionHistoryDays} days` },
    { label: "Trial", value: (plan) => (plan.trialDays > 0 ? `${plan.trialDays} days` : "None") }
];

export const PricingPage: React.FC = () => {
    const [annual, setAnnual] = useState(false);
    const [slider, setSlider] = useState(() => creditsToSlider(5000));
    const credits = sliderToCredits(slider);
    const viewed = useRef(false);
    const lastTracked = useRef<number | null>(null);

    useEffect(() => {
        if (!viewed.current) {
            PricingEvents.pageViewed();
            viewed.current = true;
        }
    }, []);

    useEffect(() => {
        if (lastTracked.current === null) {
            lastTracked.current = credits;
            return;
        }
        if (lastTracked.current === credits) return;
        const timer = setTimeout(() => {
            PricingEvents.creditSliderMoved({
                selectedCreditAmount: credits,
                estimatedPrice: estimate(SUBSCRIPTION_PLANS.pro, credits, false).totalCents / 100
            });
            lastTracked.current = credits;
        }, 500);
        return () => clearTimeout(timer);
    }, [credits]);

    const toggle = (next: boolean): void => {
        setAnnual(next);
        PricingEvents.annualToggled({ isAnnual: next });
    };

    const handleCta = (plan: SubscriptionPlan): void => {
        PricingEvents.pricingCtaClicked({ planName: plan.name, creditAmount: credits });
        EngagementEvents.demoRequested({ referringPage: `pricing_${plan.slug}` });
    };

    return (
        <div className="lp min-h-screen bg-background text-foreground">
            <Navigation />
            <main>
                <section className="relative pt-[150px] pb-[56px]">
                    <div
                        className="absolute inset-0 grid-pattern pointer-events-none [mask-image:radial-gradient(ellipse_60%_70%_at_50%_30%,#000_20%,transparent_100%)]"
                        aria-hidden="true"
                    />
                    <div className="wrap relative flex flex-col items-center text-center">
                        <span className="chip font-mono">Free · Pro · Team</span>
                        <h1 className="mt-5 text-[44px] md:text-[64px] font-bold tracking-[-0.03em] leading-[1.02]">
                            Pay for what runs.
                        </h1>
                        <p className="lead mt-4 max-w-[560px]">
                            Every plan has all the building blocks and all 110+ integrations.
                            Credits meter model calls, tool calls and agent turns. Triggers,
                            conditions and loops are free.
                        </p>
                        <div className="tabs" role="tablist" aria-label="Billing period">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={!annual}
                                className={cn("tab", !annual && "on")}
                                onClick={() => toggle(false)}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={annual}
                                className={cn("tab", annual && "on")}
                                onClick={() => toggle(true)}
                            >
                                Annual
                                <span className="ml-2 text-[12px] opacity-70">2 months free</span>
                            </button>
                        </div>
                    </div>
                </section>

                <section className="sec">
                    <div className="wrap">
                        <div className="bento">
                            {PLANS.map((plan) => (
                                <PlanCard
                                    key={plan.slug}
                                    plan={plan}
                                    annual={annual}
                                    onCta={handleCta}
                                />
                            ))}

                            <Reveal className="span6">
                                <Tile
                                    className="flex flex-col gap-5"
                                    style={{ padding: "28px 24px" }}
                                >
                                    <div className="flex flex-wrap items-end justify-between gap-3">
                                        <div>
                                            <Eyebrow>Estimate</Eyebrow>
                                            <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">
                                                How many credits a month?
                                            </h2>
                                        </div>
                                        <p className="font-mono text-[28px] font-medium leading-none">
                                            {credits.toLocaleString("en-US")}
                                            <span className="text-sm text-dim"> credits</span>
                                        </p>
                                    </div>
                                    <div>
                                        <input
                                            type="range"
                                            className="range"
                                            min={0}
                                            max={100}
                                            step={0.5}
                                            value={slider}
                                            onChange={(event) =>
                                                setSlider(Number(event.target.value))
                                            }
                                            aria-label="Credits per month"
                                        />
                                        <div className="relative mt-2 h-5">
                                            {TICKS.map((tick) => {
                                                const left = creditsToSlider(tick);
                                                const shift =
                                                    left === 0
                                                        ? "translate-x-0"
                                                        : left === 100
                                                          ? "-translate-x-full"
                                                          : "-translate-x-1/2";
                                                const active =
                                                    Math.abs(credits - tick) < tick * 0.1;
                                                return (
                                                    <button
                                                        key={tick}
                                                        type="button"
                                                        className={cn(
                                                            "absolute font-mono text-[11px] transition-colors",
                                                            shift,
                                                            active
                                                                ? "text-foreground"
                                                                : "text-dim hover:text-foreground"
                                                        )}
                                                        style={{ left: `${left}%` }}
                                                        onClick={() => setSlider(left)}
                                                    >
                                                        {formatTick(tick)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        {PLANS.map((plan) => {
                                            const result = estimate(plan, credits, annual);
                                            return (
                                                <div
                                                    key={plan.slug}
                                                    className="rounded-xl border border-line bg-sunken p-4"
                                                >
                                                    <Eyebrow>{plan.name}</Eyebrow>
                                                    <p className="mt-2 text-[26px] font-bold tracking-[-0.03em] leading-none">
                                                        {dollars(result.totalCents)}
                                                        <span className="text-xs text-dim font-medium">
                                                            {" "}
                                                            /month
                                                        </span>
                                                    </p>
                                                    <p className="mt-2 text-xs text-muted-foreground leading-[1.5]">
                                                        {result.extra > 0
                                                            ? `${plan.monthlyCredits.toLocaleString("en-US")} included, ${result.extra.toLocaleString("en-US")} from packs (${dollars(result.packCents)})`
                                                            : "Covered by the plan"}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-dim">
                                        Packs at list price, rounded up to whole packs. Annual plans
                                        are shown per month.
                                    </p>
                                </Tile>
                            </Reveal>

                            <Reveal className="span6">
                                <Tile style={{ padding: "28px 24px" }}>
                                    <Eyebrow>Limits</Eyebrow>
                                    <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">
                                        Every limit, side by side.
                                    </h2>
                                    <div className="mt-5 overflow-x-auto">
                                        <table className="limits">
                                            <thead>
                                                <tr>
                                                    <th scope="col">
                                                        <span className="sr-only">Limit</span>
                                                    </th>
                                                    {PLANS.map((plan) => (
                                                        <th key={plan.slug} scope="col">
                                                            {plan.name}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {LIMIT_ROWS.map((row) => (
                                                    <tr key={row.label}>
                                                        <td>{row.label}</td>
                                                        {PLANS.map((plan) => (
                                                            <td key={plan.slug}>
                                                                {row.value(plan)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Tile>
                            </Reveal>

                            <Reveal className="span3">
                                <Tile
                                    className="flex flex-col gap-4 h-full"
                                    style={{ padding: "28px 24px" }}
                                >
                                    <Eyebrow>Credit packs</Eyebrow>
                                    <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
                                        Top up when you need to.
                                    </h2>
                                    <ul className="m-0 p-0 list-none flex flex-col">
                                        {CREDIT_PACKS.map((pack) => (
                                            <li
                                                key={pack.id}
                                                className="flex items-center justify-between gap-3 py-3 text-sm border-t border-line first:border-t-0"
                                            >
                                                <span>
                                                    <span className="font-semibold">
                                                        {pack.credits.toLocaleString("en-US")}{" "}
                                                        credits
                                                    </span>
                                                    <span className="text-dim">
                                                        {" "}
                                                        · {pack.label}
                                                    </span>
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    {pack.savingsPercent > 0 && (
                                                        <span className="chip font-mono text-[10px]">
                                                            save {pack.savingsPercent}%
                                                        </span>
                                                    )}
                                                    <span className="font-mono">
                                                        {dollars(pack.priceInCents)}
                                                    </span>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="mt-auto text-xs text-muted-foreground leading-[1.5]">
                                        Plan credits reset every billing period. Packs are added to
                                        your purchased balance and are not reset.
                                    </p>
                                </Tile>
                            </Reveal>

                            <Reveal className="span3">
                                <Tile
                                    className="flex flex-col gap-4 h-full"
                                    style={{ padding: "28px 24px" }}
                                >
                                    <Eyebrow>Enterprise</Eyebrow>
                                    <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
                                        Custom pricing. Everything in Team, plus:
                                    </h2>
                                    <ul className="m-0 p-0 list-none grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-body">
                                        {ENTERPRISE_POINTS.map((point) => (
                                            <li key={point} className="flex items-start gap-2">
                                                <span
                                                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground"
                                                    aria-hidden="true"
                                                />
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                    <a
                                        href={BOOK_DEMO_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => PricingEvents.billingContactClicked()}
                                        className="btn btn-ghost mt-auto w-full"
                                    >
                                        Contact sales
                                    </a>
                                </Tile>
                            </Reveal>
                        </div>
                    </div>
                </section>

                <section className="sec" id="faq">
                    <div className="wrap">
                        <Reveal>
                            <h2 className="h2">Questions</h2>
                        </Reveal>
                        <div className="mx-auto flex max-w-[720px] flex-col gap-[10px]">
                            {FAQ.map((item) => (
                                <Reveal key={item.q}>
                                    <details className="faq">
                                        <summary>{item.q}</summary>
                                        <p>{item.a}</p>
                                    </details>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};
