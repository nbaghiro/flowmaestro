import { useInView } from "framer-motion";
import React, { useEffect, useRef } from "react";
import { EngagementEvents, HomePageEvents } from "../../lib/analytics";
import { BOOK_DEMO_URL } from "../../lib/links";
import { Reveal } from "./Reveal";

export const FinalCta: React.FC = () => {
    const ref = useRef<HTMLElement>(null);
    const inView = useInView(ref, { once: true, margin: "-100px" });
    const tracked = useRef(false);

    useEffect(() => {
        if (inView && !tracked.current) {
            HomePageEvents.ctaSectionViewed();
            tracked.current = true;
        }
    }, [inView]);

    const handleClick = (): void => {
        EngagementEvents.demoRequested({ referringPage: "home_cta_section" });
    };

    return (
        <section ref={ref} className="sec text-center">
            <Reveal className="wrap flex flex-col items-center gap-[18px]">
                <h2 className="text-[32px] md:text-[44px] font-bold tracking-[-0.03em]">
                    See it run on one of your processes.
                </h2>
                <p className="text-muted-foreground max-w-[520px]">
                    A 30-minute walkthrough. Bring a process you want to automate and we build the
                    first version on the call.
                </p>
                <a
                    className="btn btn-solid"
                    href={BOOK_DEMO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleClick}
                >
                    Book a demo
                </a>
            </Reveal>
        </section>
    );
};
