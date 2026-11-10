import type { ReactNode } from "react";

type Props = {
  as?: "h1" | "h2" | "h3";
  className?: string;
  children: ReactNode;
};

export function SerifHeadline({ as: Tag = "h2", className = "", children }: Props) {
  return (
    <Tag
      className={`serif-headline ${
        Tag === "h1"
          ? "text-[44px] md:text-[84px]"
          : Tag === "h2"
            ? "text-[36px] md:text-[56px]"
            : "text-[28px] md:text-[36px]"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
