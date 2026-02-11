import {
    Building2,
    Users,
    Mail,
    MessageSquare,
    Shield,
    HelpCircle,
    LayoutTemplate
} from "lucide-react";
import type { DropdownItem } from "../components/common/Dropdown";

export const COMPANY_NAV_ITEMS: DropdownItem[] = [
    {
        label: "About Us",
        href: "/about",
        icon: Building2,
        description: "Our mission and story"
    },
    {
        label: "Careers",
        href: "/careers",
        icon: Users,
        description: "Join our team"
    },
    {
        label: "Security",
        href: "/security",
        icon: Shield,
        description: "Enterprise-grade protection"
    },
    {
        label: "Contact",
        href: "/contact",
        icon: Mail,
        description: "Get in touch with us"
    }
];

export const RESOURCES_NAV_ITEMS: DropdownItem[] = [
    {
        label: "Templates",
        href: "/templates",
        icon: LayoutTemplate,
        description: "Pre-built workflow templates"
    },
    {
        label: "Help Center",
        href: "/help",
        icon: HelpCircle,
        description: "FAQs and support resources"
    },
    {
        label: "Community",
        href: "/community",
        icon: MessageSquare,
        description: "Join the discussion"
    }
];
