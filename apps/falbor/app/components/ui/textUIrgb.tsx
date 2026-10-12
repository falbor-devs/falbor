"use client";

import { classNames } from "~/utils/classNames";

interface RainbowTextEffectProps {
    text?: string;
    className?: string;
}

export function RainbowTextEffect({
    text = "design",
    className = "",
}: RainbowTextEffectProps) {
    return (
        <span
            className={classNames(
                "inline-block italic lowercase font-black text-transparent bg-clip-text",
                className
            )}
            style={{
                backgroundImage: `
          linear-gradient(
            90deg,
            #120B09 0%,
            #3A1812 20%,
            #752F1E 50%,
            #A34A2F 72%,
            #E8D8C8 100%
          )
        `,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
            }}
        >
            {text}
        </span>
    );
}