import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent = ({ content, className }: MarkdownContentProps) => (
  <div className={cn(
    "prose prose-sm max-w-none",
    "prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5",
    "prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1",
    "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
    "text-inherit",
    className
  )}>
    <ReactMarkdown>{content}</ReactMarkdown>
  </div>
);
