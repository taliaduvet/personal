import { describe, expect, it } from "vitest";
import { collectProjectPeople } from "./project-people";

describe("collectProjectPeople", () => {
  it("merges attached people and task assignees", () => {
    const people = collectProjectPeople(
      "p1",
      ["c1"],
      [
        {
          id: "t1",
          title: "Call",
          lifeAreaId: "people",
          projectId: "p1",
          workModeId: null,
          doPlan: null,
          deadlineInDays: null,
          status: "todo",
          inToday: false,
          completedAtInDays: null,
          parkedAt: 1,
          notes: "",
          subtasks: [],
          personId: "c2",
          personName: "Bob",
        },
      ],
      [
        { id: "c1", name: "Alice", email: "a@x.com" },
        { id: "c2", name: "Bob" },
      ]
    );
    expect(people).toHaveLength(2);
    expect(people.find((p) => p.id === "c1")?.attached).toBe(true);
    expect(people.find((p) => p.id === "c2")?.viaTask).toBe(true);
  });
});
