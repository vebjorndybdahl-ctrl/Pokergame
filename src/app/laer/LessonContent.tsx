"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import HandRankings from "./widgets/HandRankings";
import OddsCalculator from "./widgets/OddsCalculator";
import PositionTrainer from "./widgets/PositionTrainer";
import Quiz from "./widgets/Quiz";

const WIDGETS: Record<string, React.ComponentType> = {
  "hand-rankings": HandRankings,
  "odds-calculator": OddsCalculator,
  "position-trainer": PositionTrainer,
  quiz: Quiz,
};

// Custom renderers so markdown picks up our gold/emerald design system instead
// of raw browser defaults. A fenced ```widget block is swapped for a component.
const components: Components = {
  h2: ({ children }) => (
    <h2 className="mt-10 mb-3 flex items-center gap-3 font-[family-name:var(--font-display)] text-2xl font-black text-white">
      <span className="gold-text">♠</span>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-7 mb-2 text-lg font-bold text-amber-100/90">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="my-4 leading-relaxed text-zinc-300">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-white">{children}</strong>
  ),
  em: ({ children }) => <em className="text-amber-100/90">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-4 space-y-2 text-zinc-300">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-5 text-zinc-300 marker:text-amber-300/70">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed [ul>&]:relative [ul>&]:pl-5 [ul>&]:before:absolute [ul>&]:before:left-0 [ul>&]:before:text-emerald-400 [ul>&]:before:content-['♦']">
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="glass-emerald my-6 rounded-xl px-5 py-4 text-zinc-200 [&>p]:my-0">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-amber-300 underline underline-offset-2 hover:text-amber-200">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="glass my-6 overflow-x-auto rounded-xl">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="text-left text-xs uppercase tracking-wider text-zinc-500">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-white/10 px-4 py-3 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-t border-white/5 px-4 py-3 text-zinc-300">
      {children}
    </td>
  ),
  hr: () => <hr className="gold-rule my-8 h-px border-0" />,
  code: ({ className, children }) => {
    // Fenced ```widget blocks: the language is "widget" and the content names
    // the component. We render the component instead of a code block.
    const isWidget = className === "language-widget";
    if (isWidget) {
      const name = String(children).trim();
      const Widget = WIDGETS[name];
      if (Widget) return <Widget />;
      return (
        <span className="text-rose-400">[ukjent widget: {name}]</span>
      );
    }
    return (
      <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm text-amber-100">
        {children}
      </code>
    );
  },
};

export default function LessonContent({ markdown }: { markdown: string }) {
  return (
    <div className="prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
