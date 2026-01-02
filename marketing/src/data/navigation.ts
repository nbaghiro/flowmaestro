import {
    Building2,
    Users,
    Mail,
    BookOpen,
    FileText,
    History,
    GraduationCap,
    MessageSquare
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
        label: "Blog",
        href: "/blog",
        icon: FileText,
        description: "Latest updates and insights"
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
        label: "Documentation",
        href: "/docs",
        icon: BookOpen,
        description: "Guides and API reference"
    },
    {
        label: "Case Studies",
        href: "/case-studies",
        icon: GraduationCap,
        description: "Customer success stories"
    },
    {
        label: "Changelog",
        href: "/changelog",
        icon: History,
        description: "Product updates and releases"
    },
    {
        label: "Community",
        href: "/community",
        icon: MessageSquare,
        description: "Join the discussion"
    }
];
