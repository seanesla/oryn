"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

export function SheetContent({
  className,
  children,
  ...props
}: DialogPrimitive.DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-[min(420px,100vw)] overflow-y-auto overscroll-contain",
          "border-l border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--surface-1)_96%,transparent)] shadow-[var(--shadow-elevated)] backdrop-blur-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          "duration-300",
          className
        )}
        {...props}
      >
        <div className="sticky top-0 z-10 flex items-center justify-end border-b border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-1)_92%,transparent)] px-4 py-3 backdrop-blur-md">
          <DialogPrimitive.Close className="rounded-[0.45rem] p-1.5 text-[color:var(--muted-fg)] hover:bg-[color:color-mix(in_oklab,var(--surface-3)_80%,transparent)] hover:text-[color:var(--fg)]">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>
        <div className="p-4">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
