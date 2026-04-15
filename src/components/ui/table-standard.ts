import { cva } from "class-variance-authority"

export const standardTableShellVariants = cva("table-shell-standard !overflow-visible", {
  variants: {
    variant: {
      default: "",
      app: "bg-white shadow-[0_0_0_1px_hsl(var(--table-shell-border)/0.08)]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

export const standardTableVariants = cva("text-[length:var(--table-body-font-size)]", {
  variants: {
    density: {
      default: "",
      compact: [
        "[--table-head-height:2.25rem]",
        "[--table-cell-px:0.625rem]",
        "[--table-row-py:0.4rem]",
        "[--table-meta-font-size:11.5px]",
      ].join(" "),
    },
    dividers: {
      default: "",
      subtle: [
        "[&_thead_tr]:border-0",
        "[&_tbody_tr]:border-b",
        "[&_tbody_tr]:border-[hsl(var(--table-row-divider)/0.38)]",
        "[&_tbody_tr:last-child]:border-0",
      ].join(" "),
    },
  },
  defaultVariants: {
    density: "default",
    dividers: "default",
  },
})

export const standardTableHeaderVariants = cva("", {
  variants: {
    sticky: {
      false: "",
      true: "sticky top-0 z-30",
    },
    variant: {
      default: "",
      app: "bg-white",
    },
  },
  defaultVariants: {
    sticky: false,
    variant: "default",
  },
})

export const standardTableHeaderRowVariants = cva("table-header-row-standard", {
  variants: {
    variant: {
      default: "",
      app: "hover:!bg-transparent [&>th:first-child]:rounded-tl-md [&>th:last-child]:rounded-tr-md",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

export const standardStickyHeadCellVariants = cva("", {
  variants: {
    variant: {
      default: "",
      app: "bg-white",
    },
    kind: {
      select: "w-9 px-2.5",
      actions: "w-11",
      data: "sticky top-0 z-20 bg-[hsl(var(--table-header-bg)/0.98)] text-foreground/60 backdrop-blur-sm",
    },
  },
  compoundVariants: [
    {
      variant: "app",
      kind: "data",
      className: "bg-[hsl(var(--table-header-bg)/0.98)] text-foreground/60",
    },
  ],
  defaultVariants: {
    variant: "default",
    kind: "data",
  },
})

export const sortableTableHeaderButtonVariants = cva(
  "group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 -mx-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors",
  {
    variants: {
      variant: {
        default: "hover:bg-gray-200",
        app: "hover:bg-black/[0.045]",
      },
      active: {
        false: "",
        true: "",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        active: true,
        className: "bg-gray-200 text-foreground/85",
      },
      {
        variant: "default",
        active: false,
        className: "text-foreground/55 hover:text-foreground/80",
      },
      {
        variant: "app",
        active: true,
        className: "bg-black/[0.05] text-foreground/80",
      },
      {
        variant: "app",
        active: false,
        className: "text-foreground/60 hover:text-foreground/82",
      },
    ],
    defaultVariants: {
      variant: "default",
      active: false,
    },
  }
)
