"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/cn";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: TabsPrimitive.TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-10 items-center gap-1 rounded-[0.62rem] border border-[color:color-mix(in_oklab,var(--border-strong)_64%,var(--border))]",
        "bg-[color:color-mix(in oklab,var(--surface-3) 94%,transparent)] p-1",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-[0.48rem] px-2.5 text-xs font-medium",
        "text-[color:var(--muted-fg)] transition",
        "data-[state=active]:bg-[color:color-mix(in oklab,var(--accent) 18%,var(--surface-2))] data-[state=active]:text-[color:var(--fg)]",
        "data-[state=active]:shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent)_36%,var(--border))]",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: TabsPrimitive.TabsContentProps) {
  return (
    <TabsPrimitive.Content
      className={cn(
        "outline-none data-[state=active]:animate-[tab-content-in_320ms_cubic-bezier(0.22,1,0.36,1)]",
        className
      )}
      {...props}
    />
  );
}
