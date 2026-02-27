import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import {
  useAddProject,
  useCurrentProject,
  useProjects,
  useSetCurrentProject,
} from "../../hooks/useProjects";

const navItems = [
  { to: "/", label: "Dashboard", icon: "◉" },
  { to: "/targets", label: "Targets & Suites", icon: "◎" },
  { to: "/history", label: "History", icon: "◍" },
  { to: "/settings", label: "Settings", icon: "◌" },
];

function projectNameFromPath(path: string): string {
  const segments = path.split("/").filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : "New project";
}

export default function Sidebar() {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const { data: projects = [] } = useProjects();
  const { data: currentProject } = useCurrentProject();
  const setCurrentProject = useSetCurrentProject();
  const addProject = useAddProject();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(e.target as Node)
      ) {
        setSwitcherOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddProject = async () => {
    setSwitcherOpen(false);
    console.debug("[projects] sidebar add project:open dialog");
    const selected = await open({ directory: true, multiple: false });
    console.debug("[projects] sidebar add project:dialog result", { selected });
    if (selected) {
      const path = selected as string;
      console.debug("[projects] sidebar add project:mutate", { path });
      addProject.mutate({ name: projectNameFromPath(path), path });
    } else {
      console.debug("[projects] sidebar add project:cancelled");
    }
  };

  return (
    <aside className="shell-sidebar">
      <div data-tauri-drag-region className="sidebar-titlebar">
        <span className="sidebar-brand">Xcode Test Runner</span>
      </div>

      <div className="project-switcher" ref={switcherRef}>
        <button
          type="button"
          onClick={() => setSwitcherOpen((openState) => !openState)}
          className="project-switcher-button"
        >
          <span className="truncate">{currentProject?.name ?? "No project"}</span>
          <span>{switcherOpen ? "▴" : "▾"}</span>
        </button>

        {switcherOpen && (
          <div className="project-switcher-menu">
            {projects.map((project) => {
              const isActive = currentProject?.id === project.id;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setCurrentProject.mutate(project.id);
                    setSwitcherOpen(false);
                  }}
                  className={`project-switcher-item ${isActive ? "project-switcher-item-active" : ""}`}
                >
                  {project.name}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleAddProject}
              className="project-switcher-item"
              style={{ borderTop: "1px solid var(--border-color)", color: "var(--accent)" }}
            >
              Add project...
            </button>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `nav-link ${isActive ? "nav-link-active" : ""}`
            }
          >
            <span aria-hidden>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
