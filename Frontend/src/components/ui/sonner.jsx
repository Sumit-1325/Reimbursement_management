import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const sonnerStyles = `
  [data-sonner-toaster] {
    z-index: 9999 !important;
  }

  [data-sonner-toast] {
    background: linear-gradient(160deg, #0f172a 0%, #111827 100%) !important;
    border: 1px solid rgba(71, 85, 105, 0.7) !important;
    border-radius: 12px !important;
    box-shadow: 0 16px 40px -24px rgba(15, 23, 42, 0.85) !important;
    padding: 14px 16px !important;
    width: 360px !important;
    max-width: calc(100vw - 24px) !important;
    color: #e2e8f0 !important;
  }

  [data-sonner-toast][data-type="success"] {
    border-color: rgba(37, 99, 235, 0.65) !important;
    box-shadow: 0 16px 40px -24px rgba(37, 99, 235, 0.5) !important;
  }

  [data-sonner-toast][data-type="error"] {
    border-color: rgba(220, 38, 38, 0.55) !important;
  }

  [data-sonner-toast][data-type="warning"] {
    border-color: rgba(217, 119, 6, 0.55) !important;
  }

  [data-sonner-toast] [data-title] {
    color: #f8fafc !important;
    font-weight: 600 !important;
    font-size: 14px !important;
    line-height: 1.4 !important;
  }

  [data-sonner-toast] [data-description] {
    color: #94a3b8 !important;
    font-size: 13px !important;
    line-height: 1.45 !important;
  }

  /* Hide default status icons for a cleaner professional look */
  [data-sonner-toast] [data-icon] {
    display: none !important;
  }

  [data-sonner-toast] [data-button],
  [data-sonner-toast] [data-cancel] {
    border-radius: 8px !important;
    font-weight: 600 !important;
    font-size: 12px !important;
    padding: 8px 12px !important;
  }

  [data-sonner-toast] [data-button] {
    background: #2563eb !important;
    color: #eff6ff !important;
    border: 1px solid rgba(59, 130, 246, 0.75) !important;
  }

  [data-sonner-toast] [data-cancel] {
    background: #0f172a !important;
    color: #cbd5e1 !important;
    border: 1px solid rgba(71, 85, 105, 0.8) !important;
  }
`

if (typeof document !== 'undefined') {
  const STYLE_ID = "custom-sonner-styles"
  const existingStyle = document.getElementById(STYLE_ID)

  if (existingStyle) {
    existingStyle.textContent = sonnerStyles
  } else {
    const styleSheet = document.createElement('style')
    styleSheet.id = STYLE_ID
    styleSheet.textContent = sonnerStyles
    document.head.appendChild(styleSheet)
  }
}

export const toastPresets = {
  delete: {
    title: "Confirm Deletion",
    description: "This will permanently remove your account and all associated data. This action cannot be undone.",
  },
}

export const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme === "system" ? "dark" : theme}
      position="top-right"
      visibleToasts={3}
      expand={false}
      richColors={false}
      {...props}
    />
  )
}