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
        <div className="relative">
            {/* Cover */}
            <div
                className="h-40 w-full"
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
            <div className="mx-auto max-w-2xl px-4">
                <div className="-mt-10 flex items-center gap-4">
                    {iconUrl && (
                        <img
                            src={iconUrl}
                            alt="Interface icon"
                            className="h-16 w-16 rounded-md border bg-background object-cover"
                        />
                    )}

                    <div>
                        <h1 className="text-2xl font-semibold">{title}</h1>
                        {description && (
                            <p className="text-sm text-muted-foreground">{description}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
