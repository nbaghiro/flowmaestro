import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps {
    value?: string;
    onChange: (value: string) => void;
    options?: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    children?: React.ReactNode;
}

export function Select({
    value,
    onChange,
    options,
    placeholder = "Select an option...",
    disabled = false,
    className,
    children
}: SelectProps) {
    return (
        <SelectPrimitive.Root
            value={value || undefined}
            onValueChange={onChange}
            disabled={disabled}
        >
            <SelectPrimitive.Trigger
                className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "data-[placeholder]:text-muted-foreground",
                    "min-w-0",
                    className
                )}
            >
                <span className="truncate">
                    <SelectPrimitive.Value placeholder={placeholder} />
                </span>
                <SelectPrimitive.Icon className="ml-2 flex-shrink-0">
                    <ChevronDown className="w-4 h-4" />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    className={cn(
                        "overflow-hidden bg-card border border-border rounded-lg shadow-lg",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                        "max-h-[400px]",
                        "z-[100]"
                    )}
                    position="popper"
                    sideOffset={4}
                >
                    <SelectPrimitive.Viewport
                        className="p-1 max-h-[400px] overflow-y-auto"
                        style={
                            {
                                scrollbarWidth: "thin",
                                scrollbarColor: "hsl(var(--border)) transparent"
                            } as React.CSSProperties
                        }
                    >
                        {options
                            ? options.map((option) => (
                                  <SelectItem
                                      key={option.value}
                                      value={option.value}
                                      disabled={option.disabled}
                                  >
                                      {option.label}
                                  </SelectItem>
                              ))
                            : children}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    );
}

interface SelectItemProps {
    value: string;
    children: React.ReactNode;
    disabled?: boolean;
}

export function SelectItem({ value, children, disabled }: SelectItemProps) {
    return (
        <SelectPrimitive.Item
            value={value}
            disabled={disabled}
            className={cn(
                "relative flex items-center w-full px-8 py-2 text-sm rounded-md cursor-pointer select-none",
                "text-foreground",
                "focus:bg-primary/10 focus:outline-none",
                "data-[disabled]:opacity-50 data-[disabled]:pointer-events-none"
            )}
        >
            <span className="absolute left-2 flex items-center justify-center w-4 h-4">
                <SelectPrimitive.ItemIndicator>
                    <Check className="w-4 h-4" />
                </SelectPrimitive.ItemIndicator>
            </span>
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    );
}
