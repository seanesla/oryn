"use client";

import { useMemo } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";

export type SplitHeadlinePart = {
  text: string;
  className?: string;
};

type SplitHeadlineLine = Array<SplitHeadlinePart>;

interface ScrollSplitHeadlineProps {
  as?: "h1" | "h2";
  lines: Array<SplitHeadlineLine>;
  className?: string;
  enterProgress?: MotionValue<number>;
  exitProgress?: MotionValue<number>;
  enterWindow?: [number, number];
  exitWindow?: [number, number];
  disabled?: boolean;
}

type WordToken = {
  text: string;
  className?: string;
  index: number;
};

function tokenizeLines(lines: Array<SplitHeadlineLine>): Array<Array<WordToken>> {
  let index = 0;

  return lines.map((line) =>
    line.flatMap((part) => {
      const words = part.text.trim().split(/\s+/).filter(Boolean);
      return words.map((word) => {
        const token: WordToken = {
          text: word,
          className: part.className,
          index,
        };
        index += 1;
        return token;
      });
    }),
  );
}

export function ScrollSplitHeadline({
  as = "h2",
  lines,
  className,
  enterProgress,
  exitProgress,
  enterWindow = [0.05, 0.64],
  exitWindow = [0.62, 0.94],
  disabled = false,
}: ScrollSplitHeadlineProps) {
  const fallbackEnter = useMotionValue(1);
  const fallbackExit = useMotionValue(-1);

  const enterSource = enterProgress ?? fallbackEnter;
  const exitSource = exitProgress ?? fallbackExit;

  const tokenLines = useMemo(() => tokenizeLines(lines), [lines]);
  const totalWords = tokenLines.reduce((total, line) => total + line.length, 0);

  const Root = as === "h1" ? motion.h1 : motion.h2;

  return (
    <Root className={className}>
      {tokenLines.map((line, lineIndex) => (
        <span key={`line-${lineIndex}`} className="block">
          <span className="inline-flex flex-wrap gap-x-[0.24em]">
            {line.map((word) => (
              <ScrollWord
                key={`word-${word.index}-${word.text}`}
                text={word.text}
                className={word.className}
                wordIndex={word.index}
                totalWords={totalWords}
                enterProgress={enterSource}
                exitProgress={exitSource}
                enterWindow={enterWindow}
                exitWindow={exitWindow}
                disabled={disabled}
              />
            ))}
          </span>
        </span>
      ))}
    </Root>
  );
}

interface ScrollWordProps {
  text: string;
  className?: string;
  wordIndex: number;
  totalWords: number;
  enterProgress: MotionValue<number>;
  exitProgress: MotionValue<number>;
  enterWindow: [number, number];
  exitWindow: [number, number];
  disabled: boolean;
}

function ScrollWord({
  text,
  className,
  wordIndex,
  totalWords,
  enterProgress,
  exitProgress,
  enterWindow,
  exitWindow,
  disabled,
}: ScrollWordProps) {
  const ratio = totalWords <= 1 ? 0 : wordIndex / (totalWords - 1);

  const enterStart = enterWindow[0] + ratio * 0.22;
  const enterEnd = Math.min(enterStart + 0.32, 1);
  const exitStart = exitWindow[0] + ratio * 0.18;
  const exitEnd = Math.min(exitStart + 0.22, 1);

  const enterOpacity = useTransform(enterProgress, [enterStart, enterEnd], [0, 1]);
  const exitOpacity = useTransform(exitProgress, [exitStart, exitEnd], [1, 0]);
  const opacity = useTransform([enterOpacity, exitOpacity], (values) => {
    const [inOpacity, outOpacity] = values as [number, number];
    return inOpacity * outOpacity;
  });

  const enterY = useTransform(enterProgress, [enterStart, enterEnd], [24, 0]);
  const exitY = useTransform(exitProgress, [exitStart, exitEnd], [0, -22 - (wordIndex % 3) * 3]);
  const y = useTransform([enterY, exitY], (values) => {
    const [inY, outY] = values as [number, number];
    return inY + outY;
  });

  const enterBlur = useTransform(enterProgress, [enterStart, enterEnd], [12, 0]);
  const exitBlur = useTransform(exitProgress, [exitStart, exitEnd], [0, 10]);
  const blur = useTransform([enterBlur, exitBlur], (values) => {
    const [inBlur, outBlur] = values as [number, number];
    return inBlur + outBlur;
  });
  const filter = useMotionTemplate`blur(${blur}px)`;

  const rotate = useTransform(
    exitProgress,
    [exitStart, exitEnd],
    [0, wordIndex % 2 === 0 ? -2.2 : 2.2],
  );

  return (
    <motion.span
      className={`inline-block will-change-transform ${className ?? ""}`.trim()}
      style={disabled ? undefined : { opacity, y, rotate, filter, transformOrigin: "50% 70%" }}
    >
      {text}
    </motion.span>
  );
}
