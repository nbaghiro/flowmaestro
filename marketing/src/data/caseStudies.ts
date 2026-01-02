export interface CaseStudyResult {
    metric: string;
    label: string;
}

export interface CaseStudyQuote {
    text: string;
    author: string;
    role: string;
}

export interface CaseStudyCompany {
    name: string;
    logo: string;
    industry: string;
    size: string;
}

export interface CaseStudy {
    slug: string;
    company: CaseStudyCompany;
    headline: string;
    summary: string;
    challenge: string;
    solution: string;
    results: CaseStudyResult[];
    workflowImage: string;
    quote: CaseStudyQuote;
    category: string;
}

export const caseStudies: CaseStudy[] = [
    {
        slug: "techstyle-ecommerce-automation",
        company: {
            name: "TechStyle",
            logo: "https://ui-avatars.com/api/?name=TS&background=3b82f6&color=fff&size=128&bold=true",
            industry: "Fashion E-commerce",
            size: "50-200 employees"
        },
        headline: "How TechStyle eliminated inventory errors and saved 15 hours per week",
        summary:
            "TechStyle automated their entire order-to-fulfillment process, eliminating manual data entry and inventory sync issues across multiple sales channels.",
        challenge:
            "TechStyle was struggling with manual order processing across Shopify, Amazon, and their wholesale portal. Their team spent hours each day copying order data between systems, leading to frequent inventory mismatches and overselling. Customer complaints about delayed shipments were increasing, and the operations team was burning out.",
        solution:
            "Using FlowMaestro, TechStyle built an automated workflow that instantly syncs orders from all sales channels to their fulfillment center. The workflow validates inventory levels in real-time, automatically routes orders to the nearest warehouse, and updates stock counts across all platforms simultaneously. When inventory runs low, it triggers automated reorder alerts to their suppliers.",
        results: [
            { metric: "60%", label: "Faster order processing" },
            { metric: "0", label: "Inventory errors per month" },
            { metric: "15 hrs", label: "Saved per week" },
            { metric: "98%", label: "On-time delivery rate" }
        ],
        workflowImage: "https://placehold.co/800x500/27272a/52525b?text=Order+Automation+Workflow",
        quote: {
            text: "FlowMaestro transformed our operations overnight. What used to take our team 3 hours every morning now happens automatically while we sleep. We haven't had a single inventory error since going live.",
            author: "Sarah Chen",
            role: "Head of Operations, TechStyle"
        },
        category: "operations"
    },
    {
        slug: "cloudsync-lead-scoring-agent",
        company: {
            name: "CloudSync",
            logo: "https://ui-avatars.com/api/?name=CS&background=22d3ee&color=fff&size=128&bold=true",
            industry: "B2B SaaS",
            size: "200-500 employees"
        },
        headline: "How CloudSync tripled qualified leads with AI-powered lead scoring",
        summary:
            "CloudSync deployed an intelligent agent that automatically scores, enriches, and routes leads, reducing response time by 50% and tripling their qualified pipeline.",
        challenge:
            "CloudSync's sales team was drowning in leads from multiple sources—website forms, LinkedIn, trade shows, and partner referrals. SDRs spent hours researching each lead manually before deciding who to prioritize. High-value leads often sat untouched for days while the team chased unqualified prospects.",
        solution:
            "FlowMaestro's AI agent now processes every incoming lead in real-time. It enriches lead data from LinkedIn and company databases, scores leads based on CloudSync's ideal customer profile, and automatically routes hot leads to the right SDR with full context. Low-priority leads are nurtured through automated email sequences until they're ready for sales engagement.",
        results: [
            { metric: "3x", label: "Qualified leads" },
            { metric: "50%", label: "Faster response time" },
            { metric: "40%", label: "Higher conversion rate" },
            { metric: "12 hrs", label: "SDR time saved weekly" }
        ],
        workflowImage: "https://placehold.co/800x500/27272a/52525b?text=Lead+Scoring+Agent",
        quote: {
            text: "Our SDRs used to spend half their day researching leads. Now the AI agent does that work instantly and surfaces the best opportunities. Our pipeline has never been healthier.",
            author: "Michael Rodriguez",
            role: "VP of Sales, CloudSync"
        },
        category: "sales"
    },
    {
        slug: "medflow-patient-scheduling",
        company: {
            name: "MedFlow",
            logo: "https://ui-avatars.com/api/?name=MF&background=10b981&color=fff&size=128&bold=true",
            industry: "Healthcare Services",
            size: "100-250 employees"
        },
        headline: "How MedFlow reduced no-shows by 40% with automated scheduling",
        summary:
            "MedFlow implemented an intelligent scheduling workflow that handles appointment booking, confirmations, and reminders, dramatically reducing no-shows and administrative burden.",
        challenge:
            "MedFlow's clinics were losing significant revenue to patient no-shows—nearly 25% of appointments. Front desk staff spent countless hours playing phone tag to confirm appointments. Last-minute cancellations left gaps in the schedule that could have been filled, and patients complained about long wait times for available slots.",
        solution:
            "FlowMaestro powers MedFlow's entire patient scheduling system. Patients can self-book through a smart interface that considers provider availability, appointment type, and patient preferences. The workflow sends automated confirmations via SMS and email, with intelligent reminder sequences that adapt based on patient behavior. Cancellations trigger automatic waitlist notifications to fill empty slots.",
        results: [
            { metric: "40%", label: "Fewer no-shows" },
            { metric: "8 hrs", label: "Admin time saved weekly" },
            { metric: "95%", label: "Schedule utilization" },
            { metric: "4.8/5", label: "Patient satisfaction" }
        ],
        workflowImage:
            "https://placehold.co/800x500/27272a/52525b?text=Patient+Scheduling+Workflow",
        quote: {
            text: "Our no-show rate was killing us financially and frustrating our providers. The automated scheduling and smart reminders have been a game-changer. Patients love the convenience too.",
            author: "Dr. Emily Watson",
            role: "Chief Medical Officer, MedFlow"
        },
        category: "operations"
    },
    {
        slug: "brightmedia-reporting-agent",
        company: {
            name: "BrightMedia",
            logo: "https://ui-avatars.com/api/?name=BM&background=f59e0b&color=fff&size=128&bold=true",
            industry: "Digital Marketing Agency",
            size: "25-50 employees"
        },
        headline: "How BrightMedia saved 20 hours monthly on client reporting",
        summary:
            "BrightMedia built an automated reporting agent that pulls data from 10+ marketing platforms and generates beautiful client reports automatically.",
        challenge:
            "BrightMedia's account managers were spending the first week of every month manually pulling data from Google Ads, Meta, LinkedIn, Google Analytics, and various other platforms for each client. Reports were inconsistent, often contained errors, and left little time for actual strategic work. Clients were asking for more frequent updates that the team couldn't deliver.",
        solution:
            "FlowMaestro's reporting agent connects to all of BrightMedia's marketing platforms and automatically aggregates performance data. Every week, it generates customized reports for each client with key metrics, trend analysis, and AI-generated insights. The agent even flags anomalies and suggests optimizations, enabling account managers to focus on strategy rather than data wrangling.",
        results: [
            { metric: "20 hrs", label: "Saved monthly" },
            { metric: "100%", label: "Report accuracy" },
            { metric: "Weekly", label: "Report frequency (was monthly)" },
            { metric: "35%", label: "Client retention improvement" }
        ],
        workflowImage: "https://placehold.co/800x500/27272a/52525b?text=Reporting+Agent",
        quote: {
            text: "We went from dreading the first week of every month to actually looking forward to client conversations. The AI-generated insights help us deliver more value, not just more data.",
            author: "Jessica Park",
            role: "Managing Director, BrightMedia"
        },
        category: "marketing"
    },
    {
        slug: "logitech-shipment-tracking",
        company: {
            name: "LogiTrack",
            logo: "https://ui-avatars.com/api/?name=LT&background=8b5cf6&color=fff&size=128&bold=true",
            industry: "Supply Chain & Logistics",
            size: "500-1000 employees"
        },
        headline: "How LogiTrack cut support tickets by 90% with proactive notifications",
        summary:
            "LogiTrack deployed an automated tracking and notification workflow that keeps customers informed at every step, eliminating 'where is my shipment?' inquiries.",
        challenge:
            "LogiTrack's customer service team was overwhelmed with tracking inquiries. 'Where is my package?' accounted for 70% of all support tickets. Customers were frustrated by the lack of proactive updates, and the support team couldn't focus on resolving actual issues. NPS scores were declining, and customer churn was increasing.",
        solution:
            "FlowMaestro now monitors every shipment in real-time across LogiTrack's carrier network. The workflow automatically sends proactive updates at key milestones—pickup, in transit, out for delivery, and delivered. When delays occur, customers are notified immediately with updated ETAs before they even think to ask. The system also handles exception cases, automatically escalating issues that need human attention.",
        results: [
            { metric: "90%", label: "Fewer 'where is it' tickets" },
            { metric: "Real-time", label: "Shipment visibility" },
            { metric: "+25", label: "NPS score improvement" },
            { metric: "60%", label: "Support cost reduction" }
        ],
        workflowImage: "https://placehold.co/800x500/27272a/52525b?text=Shipment+Tracking+Workflow",
        quote: {
            text: "Our support team used to spend all day answering the same question. Now customers get updates before they even think to ask. Support tickets are down 90% and our NPS has never been higher.",
            author: "David Kim",
            role: "VP of Customer Experience, LogiTrack"
        },
        category: "support"
    }
];

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
    return caseStudies.find((cs) => cs.slug === slug);
}

export function getCaseStudiesByCategory(category: string): CaseStudy[] {
    return caseStudies.filter((cs) => cs.category === category);
}
