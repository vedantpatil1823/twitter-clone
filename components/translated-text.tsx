"use client";

import React from "react";
import { useLanguage } from "@/context/language-context";

/**
 * Thin client wrapper for translatable text in server components.
 * Usage: <T k="home" /> or <T k="home" tag="h1" className="text-xl" />
 */
export function T({
    k,
    tag: Tag = "span",
    className,
    values,
}: {
    k: string;
    tag?: keyof React.JSX.IntrinsicElements;
    className?: string;
    values?: Record<string, string | number>;
}) {
    const { t } = useLanguage();
    let text = t(k as never);

    // Simple interpolation: "{{name}} liked your post" -> "John liked your post"
    if (values) {
        for (const [key, val] of Object.entries(values)) {
            text = text.replace(`{{${key}}}`, String(val));
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <Tag className={className}>{text}</Tag>;
}
