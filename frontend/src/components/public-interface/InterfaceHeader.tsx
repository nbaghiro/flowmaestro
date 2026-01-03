import type { InterfaceCoverType } from "@flowmaestro/shared";

interface Props {
    title: string;
    description?: string | null;
    iconUrl?: string | null;

    coverType: InterfaceCoverType;
    coverValue: string;
}

export function InterfaceHeader({ title, description, iconUrl, coverType, coverValue }: Props) {
    return (
        <div className="border-b bg-card">
            {/* Cover */}
            <div
                className="h-48 w-full"
                style={
                    coverType === "color"
                        ? { backgroundColor: coverValue }
                        : coverType === "image" || coverType === "stock"
                          ? {
                                backgroundImage: `url(${coverValue})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center"
                            }
                          : undefined
                }
            />

            {/* Content */}
            <div className="mx-auto max-w-3xl px-6 py-8">
                <div className="flex items-start gap-5">
                    {iconUrl && (
                        <img
                            src={iconUrl}
                            alt="Interface icon"
                            className="h-20 w-20 shrink-0 rounded-xl border-2 border-background bg-background object-cover shadow-sm"
                        />
                    )}

                    <div className="min-w-0 flex-1">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            {title}
                        </h1>
                        {description && (
                            <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
