import { afterEach, describe, expect, it } from "vitest";
import { groupTasks, isInboxTask } from "./lenses";
import { setActiveProjects } from "./project-registry";
import { PROJECTS } from "./sample-data";
import type { LifeArea, Task } from "./types";

const customAreas: LifeArea[] = [
  { id: "music", name: "Music", color: "#5b61e8" },
  { id: "area-studio", name: "Studio", color: "#3c8262" },
  { id: "health", name: "Cycles", color: "#a17bdb" },
];

afterEach(() => {
  setActiveProjects(PROJECTS);
});

function task(partial: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    lifeAreaId: "",
    projectId: null,
    workModeId: null,
    doPlan: null,
    deadlineInDays: null,
    status: "todo",
    inToday: false,
    completedAtInDays: null,
    parkedAt: Date.now(),
    notes: "",
    subtasks: [],
    ...partial,
  };
}

describe("groupTasks area lens", () => {
  it("places tasks in custom life area columns from settings", () => {
    const tasks = [
      task({ id: "a", title: "Mix the single", lifeAreaId: "area-studio" }),
      task({ id: "b", title: "Email venues", lifeAreaId: "music" }),
    ];

    const groups = groupTasks(tasks, "area", 0, customAreas);
    const studio = groups.find((g) => g.key === "area-studio");
    const music = groups.find((g) => g.key === "music");

    expect(studio?.tasks.map((t) => t.id)).toEqual(["a"]);
    expect(music?.tasks.map((t) => t.id)).toEqual(["b"]);
  });

  it("keeps empty custom life area columns visible", () => {
    const groups = groupTasks([], "area", 0, customAreas);
    expect(groups.some((g) => g.key === "area-studio")).toBe(true);
  });

  it("dedupes renamed life areas that share an id so tasks land in one column", () => {
    const duplicateAreas: LifeArea[] = [
      { id: "health", name: "Health", color: "#bc6740" },
      { id: "health", name: "Cycles", color: "#a17bdb" },
      { id: "music", name: "Music", color: "#5b61e8" },
      { id: "music", name: "Talia Duvet", color: "#56b6e6" },
    ];
    const tasks = [
      task({ id: "a", title: "First Mix", lifeAreaId: "health", inToday: true }),
    ];

    const groups = groupTasks(tasks, "area", 0, duplicateAreas);
    const cycles = groups.filter((g) => g.key === "health");

    expect(cycles).toHaveLength(1);
    expect(cycles[0]?.label).toBe("Cycles");
    expect(cycles[0]?.tasks.map((t) => t.id)).toEqual(["a"]);
  });
});

describe("groupTasks project lens", () => {
  it("keeps Today bench tasks visible under their project", () => {
    setActiveProjects([
      { id: "proj-fool-me", name: "Fool Me", lifeAreaId: "health", why: null },
    ]);
    const tasks = [
      task({
        id: "a",
        title: "First Mix",
        lifeAreaId: "health",
        projectId: "proj-fool-me",
        inToday: true,
      }),
    ];

    const groups = groupTasks(tasks, "project", 0, customAreas);
    const foolMe = groups.find((g) => g.key === "proj-fool-me");

    expect(foolMe?.tasks.map((t) => t.id)).toEqual(["a"]);
  });
});

describe("isInboxTask", () => {
  it("treats tasks with a known life area as filed", () => {
    const filed = task({ id: "x", title: "Book studio time", lifeAreaId: "area-studio" });
    expect(isInboxTask(filed, customAreas)).toBe(false);
  });
});
