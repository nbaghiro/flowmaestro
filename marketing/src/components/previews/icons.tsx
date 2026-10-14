import React from "react";
import { PixelMark } from "../brand/PixelMark";

interface IconProps {
    size?: number;
    color?: string;
    strokeWidth?: number;
    className?: string;
}

/** The brand mark as used inside the product previews (static frame). */
export const FmMark: React.FC<{ size?: number }> = ({ size = 24 }) => <PixelMark size={size} />;

function makeIcon(shape: React.ReactNode): React.FC<IconProps> {
    const Icon: React.FC<IconProps> = ({
        size = 16,
        color = "currentColor",
        strokeWidth = 2,
        className
    }) => (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            {shape}
        </svg>
    );
    return Icon;
}

export const IconChat = makeIcon(<path d="M4 6h16v10H8l-4 4z" />);
export const IconWorkflows = makeIcon(
    <>
        <rect x="3" y="4" width="6" height="6" rx="1.5" />
        <rect x="15" y="14" width="6" height="6" rx="1.5" />
        <path d="M9 7h4a3 3 0 0 1 3 3v4" />
    </>
);
export const IconAgents = makeIcon(
    <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
    </>
);
export const IconKnowledge = makeIcon(<path d="M4 5h16v14H4zM4 10h16" />);
export const IconPlus = makeIcon(<path d="M12 5v14M5 12h14" />);
export const IconIntegrations = makeIcon(<path d="M9 7V4h6v3M4 11h16v9H4z" />);
export const IconSettings = makeIcon(
    <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.3 3h-4l-.4 2.5a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.5h4l.4-2.5a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />
    </>
);
export const IconSend = makeIcon(<path d="M12 19V5M5 12l7-7 7 7" />);
export const IconAttach = makeIcon(
    <path d="M21 12l-8.5 8.5a5 5 0 0 1-7-7L14 5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 8" />
);
export const IconPersonas = makeIcon(
    <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9L9.5 8z" />
);
export const IconBolt = makeIcon(<path d="M13 2L4 14h7l-1 8 9-12h-7z" />);
export const IconSparkle = makeIcon(
    <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
);
export const IconSparkles = makeIcon(
    <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
);
export const IconBranch = makeIcon(
    <>
        <circle cx="6" cy="5" r="2.5" />
        <circle cx="6" cy="19" r="2.5" />
        <circle cx="18" cy="12" r="2.5" />
        <path d="M6 7.5v9M8 6l7.5 5M8 18l7.5-5" />
    </>
);
export const IconOut = makeIcon(<path d="M12 21V9M6 15l6-6 6 6" />);
export const IconSearch = makeIcon(
    <>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
    </>
);
export const IconInputs = makeIcon(<path d="M12 3v12M6 9l6 6 6-6M4 21h16" />);
export const IconOutputs = makeIcon(<path d="M12 21V9M6 15l6-6 6 6M4 3h16" />);
export const IconTools = makeIcon(
    <>
        <path d="M14.7 6.3a4 4 0 0 0 5 5L13 18a2.1 2.1 0 0 1-3-3l6.7-6.7z" />
        <path d="M4 20l5-5" />
    </>
);
export const IconFit = makeIcon(<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />);
export const IconLock = makeIcon(
    <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
);
export const IconUpload = makeIcon(<path d="M12 16V4M6 10l6-6 6 6M4 20h16" />);
export const IconChevronDown = makeIcon(<path d="M6 9l6 6 6-6" />);
export const IconFile = makeIcon(<path d="M6 3h8l4 4v14H6zM14 3v4h4" />);
