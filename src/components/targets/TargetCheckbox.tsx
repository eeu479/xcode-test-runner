import * as Checkbox from "@radix-ui/react-checkbox";

interface TargetCheckboxProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  subtitle?: string;
}

export default function TargetCheckbox({
  label,
  checked,
  onCheckedChange,
  subtitle,
}: TargetCheckboxProps) {
  return (
    <label
      className="target-row"
      style={{ backgroundColor: checked ? "var(--bg-hover)" : "transparent" }}
    >
      <Checkbox.Root
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="target-row-checkbox"
        style={{
          borderColor: checked ? "var(--accent)" : "var(--border-color)",
          backgroundColor: checked ? "var(--accent)" : "transparent",
        }}
      >
        <Checkbox.Indicator>
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Checkbox.Indicator>
      </Checkbox.Root>

      <div className="min-w-0">
        <div className="truncate" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
          {label}
        </div>
        {subtitle && (
          <div className="text-[12px] truncate" style={{ color: "var(--text-secondary)" }}>
            {subtitle}
          </div>
        )}
      </div>
    </label>
  );
}
