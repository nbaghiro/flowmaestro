// Knowledge Base category definitions for the two-step creation flow
// These are starter templates displayed in the Create Knowledge Base dialog

export interface KBCategory {
    id: string;
    name: string;
    description: string;
    icon: string; // Lucide icon name
    color: string; // Tailwind color name
    exampleDocs: string[]; // 3 example document types
    suggestedName: string; // Pre-fill for name field
    suggestedDescription: string;
}

// Product Documentation
const productDocsCategory: KBCategory = {
    id: "product-docs",
    name: "Product Documentation",
    description: "Technical docs, API references, and product manuals",
    icon: "FileText",
    color: "blue",
    exampleDocs: ["API docs", "User guides", "Release notes"],
    suggestedName: "Product Documentation",
    suggestedDescription:
        "Technical docs, API references, and product manuals for customer and internal use."
};

// FAQ & Help Articles
const faqHelpCategory: KBCategory = {
    id: "faq-help",
    name: "FAQ & Help Articles",
    description: "Frequently asked questions and troubleshooting guides",
    icon: "HelpCircle",
    color: "emerald",
    exampleDocs: ["FAQs", "Troubleshooting", "How-tos"],
    suggestedName: "FAQ & Help Center",
    suggestedDescription: "Frequently asked questions, troubleshooting guides, and how-to articles."
};

// Research Papers
const researchCategory: KBCategory = {
    id: "research",
    name: "Research Papers",
    description: "Academic papers, studies, and analysis reports",
    icon: "GraduationCap",
    color: "violet",
    exampleDocs: ["Papers", "Studies", "Analysis reports"],
    suggestedName: "Research Library",
    suggestedDescription: "Academic papers, research studies, and detailed analysis reports."
};

// Company Wiki
const companyWikiCategory: KBCategory = {
    id: "company-wiki",
    name: "Company Wiki",
    description: "Internal policies, procedures, and organizational info",
    icon: "Building2",
    color: "amber",
    exampleDocs: ["Policies", "Procedures", "Org info"],
    suggestedName: "Company Wiki",
    suggestedDescription: "Internal policies, standard procedures, and organizational information."
};

// Training Materials
const trainingCategory: KBCategory = {
    id: "training",
    name: "Training Materials",
    description: "Onboarding docs, tutorials, and course content",
    icon: "BookOpen",
    color: "cyan",
    exampleDocs: ["Onboarding", "Tutorials", "Courses"],
    suggestedName: "Training Materials",
    suggestedDescription: "Onboarding documentation, tutorials, and training course content."
};

// Legal & Compliance
const legalCategory: KBCategory = {
    id: "legal",
    name: "Legal & Compliance",
    description: "Contracts, terms of service, and regulatory docs",
    icon: "Scale",
    color: "rose",
    exampleDocs: ["Contracts", "Terms", "Regulations"],
    suggestedName: "Legal & Compliance",
    suggestedDescription: "Contracts, terms of service, and regulatory compliance documents."
};

// Sales Enablement
const salesCategory: KBCategory = {
    id: "sales",
    name: "Sales Enablement",
    description: "Case studies, battlecards, and pricing guides",
    icon: "TrendingUp",
    color: "orange",
    exampleDocs: ["Case studies", "Battlecards", "Pricing"],
    suggestedName: "Sales Enablement",
    suggestedDescription: "Case studies, competitive battlecards, and pricing documentation."
};

// Engineering Docs
const engineeringCategory: KBCategory = {
    id: "engineering",
    name: "Engineering Docs",
    description: "Architecture docs, runbooks, and technical specs",
    icon: "Code",
    color: "purple",
    exampleDocs: ["Architecture", "Runbooks", "Specs"],
    suggestedName: "Engineering Docs",
    suggestedDescription: "Architecture documentation, runbooks, and technical specifications."
};

// Blank
const blankCategory: KBCategory = {
    id: "blank",
    name: "Blank",
    description: "Start from scratch with a custom knowledge base",
    icon: "Plus",
    color: "gray",
    exampleDocs: [],
    suggestedName: "",
    suggestedDescription: ""
};

export const KB_CATEGORIES: KBCategory[] = [
    productDocsCategory,
    faqHelpCategory,
    researchCategory,
    companyWikiCategory,
    trainingCategory,
    legalCategory,
    salesCategory,
    engineeringCategory,
    blankCategory
];

export function getKBCategoryById(id: string): KBCategory | undefined {
    return KB_CATEGORIES.find((c) => c.id === id);
}

export function getKBCategories(): KBCategory[] {
    return KB_CATEGORIES;
}

// Export blank category for direct access
export const BLANK_KB_CATEGORY = blankCategory;
