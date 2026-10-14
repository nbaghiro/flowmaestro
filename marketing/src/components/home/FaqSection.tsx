import React from "react";
import { Reveal } from "./Reveal";

const QUESTIONS = [
    {
        q: "What is FlowMaestro?",
        a: "A workflow automation platform that combines visual, deterministic workflows with AI agents and briefable personas, without writing code."
    },
    {
        q: "What is the difference between workflows, agents and personas?",
        a: "Workflows run defined steps in order. Agents converse, decide and use tools. Personas take a brief, work in the background within a budget, and return a deliverable."
    },
    {
        q: "Do I need to code?",
        a: "No. The visual editor and pre-built integrations cover most cases. Code nodes in JavaScript or Python are there when you want them."
    },
    {
        q: "What happens when a step fails?",
        a: "Runs are durable. Retries with backoff, fallback paths and notifications are configurable, and a run resumes where it left off."
    },
    {
        q: "Which triggers are available?",
        a: "Webhooks, schedules, manual runs and API calls, plus provider events such as a GitHub push, a Slack message or a new Airtable record. Agents can also start a workflow."
    },
    {
        q: "Is there a free plan?",
        a: "Yes. 250 credits every month, no card required."
    }
];

export const FaqSection: React.FC = () => (
    <section id="faq" className="sec">
        <div className="wrap" style={{ maxWidth: 760 }}>
            <Reveal>
                <h2 className="h2">Questions</h2>
            </Reveal>
            <div className="flex flex-col gap-[10px] mt-7">
                {QUESTIONS.map((item) => (
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
);
