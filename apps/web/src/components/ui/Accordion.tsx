"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";

import { cn } from "@/lib/cn";

export const Accordion = AccordionPrimitive.Root;
export const AccordionItem = AccordionPrimitive.Item;

export function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "flex flex-1 items-center justify-between gap-3 py-2 text-left text-sm font-medium",
          "text-[color:var(--fg)]",
          className
        )}
        {...props}
      >
        {children}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.AccordionContentProps) {
  return (
    <AccordionPrimitive.Content
      className={cn(
        "overflow-hidden data-[state=closed]:animate-[accordion-up_220ms_cubic-bezier(0.4,0,0.2,1)] data-[state=open]:animate-[accordion-down_300ms_cubic-bezier(0.22,1,0.36,1)]",
        className
      )}
      {...props}
    >
      <div className="pb-3 pt-1">{children}</div>
    </AccordionPrimitive.Content>
  );
}
