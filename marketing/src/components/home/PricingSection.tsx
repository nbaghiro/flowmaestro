import React from "react";
import { Link } from "react-router-dom";
import { SUBSCRIPTION_PLANS } from "@flowmaestro/shared";
import { EngagementEvents } from "../../lib/analytics";
import { BOOK_DEMO_URL } from "../../lib/links";
import { Reveal } from "./Reveal";
import { Tile } from "./Tile";

interface Plan {
    slug: string;
    name: string;
    price: string;
    period?: string;
    credits: string;
    features: string[];
    cta: { label: string; solid?: boolean };
    highlight?: boolean;
}

const { free, pro, team } = SUBSCRIPTION_PLANS;

const dollars = (cents: number): string => `$${Math.round(cents / 100).toLocaleString("en-US")}`;
const monthly = (plan: typeof free): string =>
    `${plan.monthlyCredits.toLocaleString("en-US")} credits a month`;

// Prices, credits and limits come from shared/src/billing.ts; the feature lines summarise them.
const PLANS: Plan[] = [
    {
        slug: free.slug,
        name: "FREE",
        price: dollars(free.monthlyPriceCents),
        credits: monthly(free),
        features: [
            "5 workflows, 2 agents",
            "All 110+ integrations",
            "1 knowledge base",
            "Community support"
        ],
        cta: { label: "Book a demo" }
    },
    {
        slug: pro.slug,
        name: "PRO",
        price: dollars(pro.monthlyPriceCents),
        period: ` /month, or ${dollars(pro.annualPriceCents)} a year`,
        credits: monthly(pro),
        features: [
            "50 workflows, 20 agents, 5 members",
            "Use your own LLM keys",
            "10 knowledge bases",
            "Priority support"
        ],
        cta: { label: "Book a demo", solid: true },
        highlight: true
    },
    {
        slug: team.slug,
        name: "TEAM",
        price: dollars(team.monthlyPriceCents),
        period: ` /month, or ${dollars(team.annualPriceCents)} a year`,
        credits: monthly(team),
        features: [
            "Unlimited workflows, agents, members",
            "50 knowledge bases",
            "90 days execution history",
            "Custom integrations"
        ],
        cta: { label: "Book a demo" }
    }
];

const PlanCard: React.FC<Plan> = ({
    slug,
    name,
    price,
    period,
    credits,
    features,
    cta,
    highlight
}) => {
    const buttonClass = cta.solid ? "btn btn-solid mt-auto w-full" : "btn btn-ghost mt-auto w-full";
    const track = (): void => {
        EngagementEvents.demoRequested({ referringPage: `home_pricing_${slug}` });
    };
    return (
        <Reveal className="span2">
            <Tile className="flex flex-col gap-[14px]" style={{ padding: "32px 24px" }}>
                <p
                    className={
                        highlight
                            ? "font-mono text-[11px] text-foreground"
                            : "font-mono text-[11px] text-dim"
                    }
                >
                    {name}
                </p>
                <p className="text-[40px] font-bold tracking-[-0.03em]">
                    {price}
                    {period && <span className="text-sm text-dim font-medium">{period}</span>}
                </p>
                <p className="text-sm text-muted-foreground">{credits}</p>
                <ul className="m-0 pl-[18px] text-body text-sm leading-[1.8] list-disc">
                    {features.map((feature) => (
                        <li key={feature}>{feature}</li>
                    ))}
                </ul>
                <a
                    href={BOOK_DEMO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass}
                    onClick={track}
                >
                    {cta.label}
                </a>
            </Tile>
        </Reveal>
    );
};

export const PricingSection: React.FC = () => (
    <section id="pricing" className="sec scroll-mt-20">
        <div className="wrap">
            <Reveal>
                <h2 className="h2">Credits, not seats.</h2>
            </Reveal>
            <Reveal>
                <p className="lead">
                    Model calls, tool calls and agent turns are metered. Triggers, conditions and
                    loops are free. Credit packs start at $10 for 1,000.
                </p>
            </Reveal>
            <div className="bento">
                {PLANS.map((plan) => (
                    <PlanCard key={plan.slug} {...plan} />
                ))}
            </div>
            <Reveal className="text-center mt-5">
                <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
                    Compare every limit on the pricing page
                </Link>
            </Reveal>
        </div>
    </section>
);
