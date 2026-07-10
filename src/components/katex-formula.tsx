import katex from "katex";

export function KaTeXFormula({
  formula,
  displayMode = true,
}: {
  formula: string;
  displayMode?: boolean;
}) {
  const html = katex.renderToString(formula, {
    displayMode,
    throwOnError: false,
    output: "html",
  });

  if (!displayMode) {
    return (
      <span
        className="inline max-w-full overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 sm:px-4 [-webkit-overflow-scrolling:touch]">
      <div
        className="text-slate-800 [&_.katex-display]:!my-0 [&_.katex]:text-[clamp(0.72rem,3.2vw,1rem)] sm:[&_.katex]:text-base"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
