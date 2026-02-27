import { useExecutionStore } from "../../stores/executionStore";

interface ActionButtonsProps {
  onRunAll: () => void;
  onRunSelected: () => void;
  onRerunFailed: () => void;
  onCancel: () => void;
  hasSelection: boolean;
}

export default function ActionButtons({
  onRunAll,
  onRunSelected,
  onRerunFailed,
  onCancel,
  hasSelection,
}: ActionButtonsProps) {
  const isRunning = useExecutionStore((state) => state.isRunning);

  if (isRunning) {
    return (
      <div className="flex gap-3 flex-wrap">
        <button onClick={onCancel} className="btn btn-danger">
          Cancel Run
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-3 flex-wrap">
      <button onClick={onRunAll} className="btn btn-primary">
        Run All
      </button>
      <button onClick={onRunSelected} disabled={!hasSelection} className="btn">
        Run Selected
      </button>
      <button onClick={onRerunFailed} className="btn">
        Re-run Failed
      </button>
    </div>
  );
}
