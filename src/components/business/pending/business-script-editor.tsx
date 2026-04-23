"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { JSONContent } from "@tiptap/core"
import { EditorContent, Node, mergeAttributes, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import { cn } from "@/lib/utils"
import type { ScriptVariable } from "@/lib/business/script-template"

interface BusinessScriptEditorProps {
  value: string
  variables: ScriptVariable[]
  onChange: (value: string) => void
  onValidationChange?: (hasErrors: boolean) => void
}

const VARIABLE_PATTERN = /(\{\{[\w_]+}})/g

const ScriptVariableNode = Node.create({
  name: "scriptVariable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      key: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-script-variable-key") ?? "",
        renderHTML: (attributes) => ({
          "data-script-variable-key": attributes.key,
        }),
      },
      label: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-script-variable-label") ?? "",
        renderHTML: (attributes) => ({
          "data-script-variable-label": attributes.label,
        }),
      },
      value: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-script-variable-value") ?? "",
        renderHTML: (attributes) => ({
          "data-script-variable-value": attributes.value,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-script-variable-key]" }]
  },

  renderHTML({ HTMLAttributes }) {
    const key = HTMLAttributes["data-script-variable-key"]

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "business-script-variable",
        "data-key": key,
      }),
    ]
  },

  renderText({ node }) {
    return node.attrs.key
  },
})

function lineToNodes(line: string, variablesByKey: Map<string, ScriptVariable>): JSONContent[] {
  return line.split(VARIABLE_PATTERN).flatMap<JSONContent>((part) => {
    if (!part) return []

    const variable = variablesByKey.get(part)
    if (variable) {
      return [
        {
          type: "scriptVariable",
          attrs: {
            key: variable.key,
            label: variable.label,
            value: variable.value,
          },
        },
      ]
    }

    return [{ type: "text", text: part }]
  })
}

function templateToEditorContent(value: string, variables: ScriptVariable[]): JSONContent {
  const variablesByKey = new Map(variables.map((variable) => [variable.key, variable]))
  const lines = value.length > 0 ? value.split("\n") : [""]

  return {
    type: "doc",
    content: lines.map((line) => {
      const content = lineToNodes(line, variablesByKey)
      return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" }
    }),
  }
}

function editorContentToTemplate(content: JSONContent): string {
  return (content.content ?? [])
    .map((node) => {
      if (node.type !== "paragraph") return ""

      return (node.content ?? [])
        .map((child) => {
          if (child.type === "scriptVariable") {
            return String(child.attrs?.key ?? "")
          }

          if (child.type === "hardBreak") {
            return "\n"
          }

          return child.text ?? ""
        })
        .join("")
    })
    .join("\n")
}

export function BusinessScriptEditor({
  value,
  variables,
  onChange,
  onValidationChange,
}: BusinessScriptEditorProps) {
  const validVariableKeys = useMemo(() => new Set(variables.map((v) => v.key)), [variables])
  const [autocompleteQuery, setAutocompleteQuery] = useState<string | null>(null)
  const [autocompletePos, setAutocompletePos] = useState<{ top: number; left: number } | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const validationTimeoutRef = useRef<NodeJS.Timeout>()
  
  const content = useMemo(
    () => templateToEditorContent(value, variables),
    [value, variables]
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      ScriptVariableNode,
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const newValue = editorContentToTemplate(editor.getJSON())
      onChange(newValue)
      
      // Check for {{ trigger
      const { from } = editor.state.selection
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 50), from, '\n')
      const match = textBefore.match(/\{\{([^}]*)$/)
      
      if (match) {
        setAutocompleteQuery(match[1])
        setSelectedIndex(0)
        
        // Get cursor position
        const coords = editor.view.coordsAtPos(from)
        const editorRect = editorRef.current?.getBoundingClientRect()
        if (editorRect) {
          setAutocompletePos({
            top: coords.top - editorRect.top + 24,
            left: coords.left - editorRect.left,
          })
        }
      } else {
        setAutocompleteQuery(null)
        setAutocompletePos(null)
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[168px] px-3 py-3 font-serif text-[16px] leading-relaxed text-foreground/90",
          "focus:outline-none [&_p]:m-0 [&_p+p]:mt-3"
        ),
      },
      handleKeyDown: (view, event) => {
        if (!autocompleteQuery) return false
        
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, filteredVariables.length - 1))
          return true
        }
        
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          return true
        }
        
        if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault()
          const variable = filteredVariables[selectedIndex]
          if (variable) {
            insertVariableAtCursor(variable)
          }
          return true
        }
        
        if (event.key === 'Escape') {
          setAutocompleteQuery(null)
          setAutocompletePos(null)
          return true
        }
        
        return false
      },
      handleTextInput: (view, from, to, text) => {
        // Auto-close braces when user types second {
        if (text === '{') {
          const textBefore = view.state.doc.textBetween(Math.max(0, from - 1), from, '\n')
          if (textBefore.endsWith('{')) {
            const tr = view.state.tr
              .delete(from - 1, to)
              .insertText('{{}}', from - 1)
            const newPos = from + 1
            tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(newPos)))
            view.dispatch(tr)
            return true
          }
        }
        return false
      },
    },
  })

  const invalidVariables = useMemo(() => {
    const matches = value.match(VARIABLE_PATTERN) || []
    return matches.filter((match) => !validVariableKeys.has(match))
  }, [value, validVariableKeys])

  const filteredVariables = useMemo(() => {
    if (!autocompleteQuery) return variables
    const query = autocompleteQuery.toLowerCase()
    return variables.filter(
      (v) =>
        v.key.toLowerCase().includes(query) ||
        v.value.toLowerCase().includes(query) ||
        v.label.toLowerCase().includes(query)
    )
  }, [variables, autocompleteQuery])

  const hasIncompleteVariable = useMemo(() => {
    // Check for {{ without closing }} or {{ with text that doesn't match any variable
    // But ignore empty {{}} as user is just starting to type
    const incompletePattern = /\{\{[^}]+$/
    return incompletePattern.test(value) || (autocompleteQuery !== null && autocompleteQuery.length > 0 && filteredVariables.length === 0)
  }, [value, autocompleteQuery, filteredVariables.length])

  const insertVariableAtCursor = (variable: ScriptVariable) => {
    if (!editor) return
    
    const { from } = editor.state.selection
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 50), from, '\n')
    const match = textBefore.match(/\{\{([^}]*)$/)
    
    if (match) {
      const deleteFrom = from - match[0].length
      // Check if there are closing braces after cursor
      const textAfter = editor.state.doc.textBetween(from, Math.min(editor.state.doc.content.size, from + 2), '\n')
      const deleteTo = textAfter.startsWith('}}') ? from + 2 : from
      
      editor
        .chain()
        .focus()
        .deleteRange({ from: deleteFrom, to: deleteTo })
        .insertContent({
          type: "scriptVariable",
          attrs: {
            key: variable.key,
            label: variable.label,
            value: variable.value,
          },
        })
        .insertContent(" ")
        .run()
    }
    
    setAutocompleteQuery(null)
    setAutocompletePos(null)
  }

  useEffect(() => {
    if (!editor) return

    const current = editorContentToTemplate(editor.getJSON())
    if (current === value) return

    editor.commands.setContent(content, { emitUpdate: false })
  }, [content, editor, value])

  useEffect(() => {
    if (!autocompleteQuery) return

    const handleClickAway = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const dropdown = document.querySelector('[data-autocomplete-dropdown]')
      if (!editorRef.current?.contains(target) && !dropdown?.contains(target)) {
        setAutocompleteQuery(null)
        setAutocompletePos(null)
      }
    }

    document.addEventListener('mousedown', handleClickAway)
    return () => document.removeEventListener('mousedown', handleClickAway)
  }, [autocompleteQuery])

  useEffect(() => {
    const hasErrors = invalidVariables.length > 0 || hasIncompleteVariable
    onValidationChange?.(hasErrors)
    
    // Debounce showing validation errors
    if (hasErrors) {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
      validationTimeoutRef.current = setTimeout(() => {
        setShowValidationErrors(true)
      }, 2000)
    } else {
      setShowValidationErrors(false)
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
    
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [invalidVariables.length, hasIncompleteVariable, onValidationChange])

  const insertVariable = (variable: ScriptVariable) => {
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: "scriptVariable",
        attrs: {
          key: variable.key,
          label: variable.label,
          value: variable.value,
        },
      })
      .insertContent(" ")
      .run()
    
    setAutocompleteQuery(null)
    setAutocompletePos(null)
  }

  return (
    <div className="space-y-2">
      <div 
        ref={editorRef} 
        className="relative overflow-hidden rounded-xl border border-border/70 bg-background shadow-none focus-within:ring-1 focus-within:ring-[hsl(var(--brand))]"
        onBlur={(e) => {
          // Only trigger if focus is leaving the editor container entirely
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setShowValidationErrors(true)
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>
      
      {autocompleteQuery !== null && autocompletePos && filteredVariables.length > 0 && (
        <div
          data-autocomplete-dropdown
          className="fixed z-[100] min-w-[240px] max-w-[320px] rounded-lg border border-border/70 bg-background shadow-lg"
          style={{ 
            top: (editorRef.current?.getBoundingClientRect().top || 0) + autocompletePos.top, 
            left: (editorRef.current?.getBoundingClientRect().left || 0) + autocompletePos.left 
          }}
        >
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filteredVariables.map((variable, index) => (
              <button
                key={variable.key}
                type="button"
                onClick={() => insertVariableAtCursor(variable)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] transition-colors",
                  index === selectedIndex
                    ? "bg-[hsl(var(--brand)/0.12)] text-foreground"
                    : "text-muted-foreground hover:bg-[hsl(var(--brand)/0.06)]"
                )}
              >
                <code className="font-mono text-[11px] text-[hsl(var(--brand))]">{variable.key}</code>
                <span className="text-[10px]">→</span>
                <span className="truncate">{variable.value}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showValidationErrors && (invalidVariables.length > 0 || hasIncompleteVariable) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {invalidVariables.length > 0 && (
            <>
              <div className="font-semibold">Invalid variable{invalidVariables.length > 1 ? 's' : ''}:</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {invalidVariables.map((v, i) => (
                  <code key={i} className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-red-900/50">
                    {v}
                  </code>
                ))}
              </div>
            </>
          )}
          {hasIncompleteVariable && (
            <div className={invalidVariables.length > 0 ? "mt-2" : ""}>
              Incomplete variable syntax detected. Complete the variable or remove it.
            </div>
          )}
        </div>
      )}

      {variables.length > 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Variables
          </div>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((variable) => (
              <button
                key={variable.key}
                type="button"
                onClick={() => insertVariable(variable)}
                className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-[hsl(var(--brand)/0.24)] bg-[hsl(var(--brand)/0.08)] px-2.5 font-serif text-[12.5px] font-medium text-[hsl(var(--brand))] transition-colors hover:bg-[hsl(var(--brand)/0.14)]"
              >
                <code className="font-mono text-[11px]">{variable.key}</code>
                <span className="text-muted-foreground">→</span>
                <span>{variable.value}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <style jsx global>{`

        .ProseMirror p {
          position: relative;
        }

        .ProseMirror p::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: repeating-linear-gradient(
              90deg,
              rgb(239 68 68) 0,
              rgb(239 68 68) 4px,
              transparent 4px,
              transparent 8px
          );
          opacity: 0;
          pointer-events: none;
        }

        .ProseMirror p:has(span[data-script-variable-key]:not([data-script-variable-value]))::after {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}
