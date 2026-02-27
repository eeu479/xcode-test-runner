import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import TopBar from "../components/layout/TopBar";
import { useCurrentProject } from "../hooks/useProjects";
import { useSettings, useUpdateSetting } from "../hooks/useSettings";

interface SimulatorDevice {
  udid: string;
  name: string;
  runtime: string;
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { data: currentProject } = useCurrentProject();
  const updateSetting = useUpdateSetting();
  const { data: simulators = [], isLoading: simulatorsLoading } = useQuery({
    queryKey: ["simulators"],
    queryFn: () => invoke<SimulatorDevice[]>("list_simulators"),
  });

  const toggle = (key: string, current: boolean) => {
    updateSetting.mutate({ key, value: (!current).toString() });
  };

  if (isLoading || !settings) {
    return (
      <>
        <TopBar title="Settings" />
        <div className="page-scroll muted" style={{ display: "grid", placeItems: "center" }}>
          Loading settings...
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Settings" />
      <div className="page-scroll">
        <div className="stack" style={{ maxWidth: 760 }}>
          <section className="stack" style={{ gap: 8 }}>
            <h2 className="section-title">Project</h2>
            <div className="card">
              <div style={{ color: currentProject ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                {currentProject?.name ?? "No project selected"}
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Switch or add projects using the sidebar.
              </p>
            </div>
          </section>

          <section className="stack" style={{ gap: 8 }}>
            <h2 className="section-title">Default Scope</h2>
            <div className="card flex gap-2 flex-wrap">
              {["all", "project", "packages"].map((scope) => (
                <button
                  key={scope}
                  onClick={() => updateSetting.mutate({ key: "default_scope", value: scope })}
                  className={`btn ${settings.default_scope === scope ? "btn-chip-active" : ""}`}
                  style={{ textTransform: "capitalize" }}
                >
                  {scope}
                </button>
              ))}
            </div>
          </section>

          <section className="stack" style={{ gap: 8 }}>
            <h2 className="section-title">Test runs</h2>
            <div className="card flex items-center justify-between gap-3">
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                Default simulator
              </span>
              <select
                value={settings.default_simulator}
                onChange={(event) =>
                  updateSetting.mutate({
                    key: "default_simulator",
                    value: event.target.value,
                  })
                }
                className="ui-select"
                style={{ minWidth: 200 }}
                disabled={simulatorsLoading}
              >
                <option value="">System default</option>
                {simulators.map((s) => (
                  <option key={s.udid} value={s.udid}>
                    {s.name} ({s.runtime})
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="stack" style={{ gap: 8 }}>
            <h2 className="section-title">Run Behaviour</h2>
            <div className="list">
              <ToggleRow
                label="Stop on first failure"
                checked={settings.stop_on_first_failure}
                onChange={() =>
                  toggle("stop_on_first_failure", settings.stop_on_first_failure)
                }
              />
            </div>
          </section>

          <section className="stack" style={{ gap: 8 }}>
            <h2 className="section-title">Notifications</h2>
            <div className="list">
              <ToggleRow
                label="Notify on completion"
                checked={settings.notify_on_completion}
                onChange={() =>
                  toggle("notify_on_completion", settings.notify_on_completion)
                }
              />
              <ToggleRow
                label="Notify only on failure"
                checked={settings.notify_only_on_failure}
                onChange={() =>
                  toggle("notify_only_on_failure", settings.notify_only_on_failure)
                }
              />
            </div>
          </section>

          <section className="stack" style={{ gap: 8 }}>
            <h2 className="section-title">Storage</h2>
            <div className="card flex items-center justify-between gap-3">
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                Retain last runs
              </span>
              <select
                value={settings.retain_last_runs}
                onChange={(event) =>
                  updateSetting.mutate({
                    key: "retain_last_runs",
                    value: event.target.value,
                  })
                }
                className="ui-select"
                style={{ width: 110 }}
              >
                {[10, 25, 50, 100, 200].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="list-item" style={{ cursor: "pointer" }}>
      <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{label}</span>
      <button
        onClick={onChange}
        className={`toggle ${checked ? "toggle-on" : ""}`}
        type="button"
      >
        <span className="toggle-knob" />
      </button>
    </label>
  );
}
