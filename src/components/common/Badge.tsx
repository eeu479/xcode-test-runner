interface BadgeProps {
  variant: "success" | "danger" | "warning" | "neutral";
  children: React.ReactNode;
}

const variantColors = {
  success: { bg: "rgba(35, 123, 75, 0.16)", text: "var(--success)" },
  danger: { bg: "rgba(194, 64, 29, 0.16)", text: "var(--danger)" },
  warning: { bg: "rgba(178, 116, 23, 0.18)", text: "var(--warning)" },
  neutral: { bg: "var(--bg-active)", text: "var(--text-secondary)" },
};

export default function Badge({ variant, children }: BadgeProps) {
  const colors = variantColors[variant];

  return (
    <span
      className="badge"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {children}
    </span>
  );
}
