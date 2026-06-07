import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Heading2, Undo, Redo } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[80px] max-h-[200px] overflow-y-auto px-3 py-2 focus:outline-none text-sm",
      },
      transformPastedHTML(html) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const body = doc.body;

        // Step 1: Remove all style and data-* attributes
        body.querySelectorAll("*").forEach((el) => {
          el.removeAttribute("style");
          Array.from(el.attributes).forEach((attr) => {
            if (attr.name.startsWith("data-")) el.removeAttribute(attr.name);
          });
        });

        // Step 2: Recursively unwrap divs that only wrap block elements
        const blockTags = new Set(["UL", "OL", "H1", "H2", "H3", "H4", "H5", "H6", "P", "BLOCKQUOTE", "TABLE", "HR"]);
        const unwrapDivs = () => {
          let changed = false;
          body.querySelectorAll("div").forEach((div) => {
            // If div contains a single block child, replace div with that child
            const children = Array.from(div.children);
            if (children.length === 1 && blockTags.has(children[0].tagName)) {
              div.replaceWith(children[0]);
              changed = true;
            }
            // If div has no text of its own and all children are block elements, unwrap
            else if (children.length > 0 && children.every((c) => blockTags.has(c.tagName) || c.tagName === "DIV")) {
              div.replaceWith(...Array.from(div.childNodes));
              changed = true;
            }
          });
          return changed;
        };
        // Run multiple passes to handle nested divs
        for (let i = 0; i < 5 && unwrapDivs(); i++);

        // Step 3: Rescue orphaned <li> elements (not inside ul/ol)
        body.querySelectorAll("li").forEach((li) => {
          if (!li.parentElement || (li.parentElement.tagName !== "UL" && li.parentElement.tagName !== "OL")) {
            const ul = document.createElement("ul");
            li.replaceWith(ul);
            ul.appendChild(li);
          }
        });

        // Step 4: Notion class-name conversion (fallback)
        body.querySelectorAll('div[class*="bulleted"], div[class*="bullet"]').forEach((div) => {
          const li = document.createElement("li");
          li.innerHTML = div.innerHTML;
          const ul = document.createElement("ul");
          ul.appendChild(li);
          div.replaceWith(ul);
        });
        body.querySelectorAll('div[class*="numbered"]').forEach((div) => {
          const li = document.createElement("li");
          li.innerHTML = div.innerHTML;
          const ol = document.createElement("ol");
          ol.appendChild(li);
          div.replaceWith(ol);
        });

        // Step 5: Bullet-character prefix conversion
        body.querySelectorAll("div, p").forEach((el) => {
          const text = el.textContent || "";
          if (/^[\s]*[•●‣⁃]\s*/.test(text) && !el.closest("ul") && !el.closest("ol")) {
            const li = document.createElement("li");
            li.innerHTML = el.innerHTML.replace(/^[\s]*[•●‣⁃]\s*/, "");
            const ul = document.createElement("ul");
            ul.appendChild(li);
            el.replaceWith(ul);
          }
        });

        // Step 6: Merge adjacent same-type lists
        const mergeLists = () => {
          body.querySelectorAll("ul + ul, ol + ol").forEach((el) => {
            const prev = el.previousElementSibling;
            if (prev && prev.tagName === el.tagName) {
              while (el.firstChild) prev.appendChild(el.firstChild);
              el.remove();
            }
          });
        };
        mergeLists();

        // Step 7: Remove empty wrapper elements
        body.querySelectorAll("div, p").forEach((el) => {
          if (!el.textContent?.trim() && !el.querySelector("img, br, ul, ol, table")) {
            el.remove();
          }
        });

        // Final merge pass
        mergeLists();

        return body.innerHTML;
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value]);

  if (!editor) return null;

  const ToolBtn = ({
    active,
    onClick,
    children,
  }: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", active && "bg-accent text-accent-foreground")}
      onClick={onClick}
    >
      {children}
    </Button>
  );

  return (
    <div className="rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <div className="flex flex-wrap gap-0.5 border-b border-border px-1 py-1">
        <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>
        <div className="ml-auto flex gap-0.5">
          <ToolBtn onClick={() => editor.chain().focus().undo().run()}>
            <Undo className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()}>
            <Redo className="h-3.5 w-3.5" />
          </ToolBtn>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
