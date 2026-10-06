import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Links in AI-written or user-written notes open in a new tab and never pass the referrer or
// get a handle on this window. react-markdown already drops javascript: and data: URLs.
const components = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow">
      {children}
    </a>
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none sm:prose-base dark:prose-invert prose-headings:font-heading prose-a:text-primary prose-strong:font-semibold prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-medium prose-code:before:content-none prose-code:after:content-none prose-table:block prose-table:overflow-x-auto prose-th:bg-muted prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-li:marker:text-primary">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
