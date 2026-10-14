import React from "react";
import { EngagementEvents, HomePageEvents } from "../../lib/analytics";
import { BOOK_DEMO_URL } from "../../lib/links";
import { PixelMark } from "../brand/PixelMark";
import { AppHomePreview } from "../previews/AppHomePreview";
import { ScaledFrame } from "../previews/ScaledFrame";
import { Constellations } from "./Constellations";
import { StarField } from "./StarField";

export const HeroSection: React.FC = () => {
    const handleStart = (): void => {
        HomePageEvents.heroCtaClicked({ ctaText: "Book a demo", buttonPosition: "hero" });
        EngagementEvents.demoRequested({ referringPage: "home_hero" });
    };
    const handleHow = (): void => {
        HomePageEvents.heroCtaClicked({ ctaText: "See how it works", buttonPosition: "hero" });
    };

    return (
        <section id="top" className="relative overflow-hidden pt-[132px] pb-16 text-center">
            <StarField />
            <Constellations />
            <div className="wrap relative flex flex-col items-center gap-[26px]">
                <PixelMark size={72} live className="rise d1" />
                <h1 className="rise d2 h1 text-[52px] md:text-[96px] max-w-[980px]">
                    Describe the work. Keep the automation.
                </h1>
                <p className="rise d3 text-[18px] md:text-[21px] text-muted-foreground max-w-[640px] leading-[1.5]">
                    Chat drafts a deterministic workflow. Agents add tools and memory. Personas
                    return the finished file. 110+ integrations, durable runs, one credit meter.
                </p>
                <div className="rise d4 flex flex-col items-center gap-4">
                    <a
                        className="btn btn-solid btn-lg"
                        href={BOOK_DEMO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleStart}
                    >
                        Book a demo
                        <span className="btn-ico" aria-hidden="true">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path
                                    d="M2.5 6h7M6.5 3l3 3-3 3"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </span>
                    </a>
                    <a
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        href="#product"
                        onClick={handleHow}
                    >
                        See how it works
                    </a>
                </div>
                <p className="rise d4 font-mono text-xs text-dim tracking-[0.02em]">
                    30-minute walkthrough · bring a process you want to automate
                </p>
                <div className="rise d4 mt-10 bleed">
                    <ScaledFrame
                        label="The FlowMaestro home screen: a chat composer asking what to automate, with workflows, agents, knowledge bases and personas as building blocks"
                        className="shadow-[0_60px_140px_-60px_rgba(255,255,255,0.12)]"
                    >
                        <AppHomePreview />
                    </ScaledFrame>
                </div>
            </div>
        </section>
    );
};
