import { MilestoneRecord } from "./types";

let nextId = 100;

export const mockMilestoneStore: Record<string, MilestoneRecord[]> = {
  argus: [
    { id: nextId++, title: "Sprint 2 review", description: "Demo of settlement pipeline changes to Zeus stakeholders.", date: "2026-08-05" },
    { id: nextId++, title: "UAT sign-off", description: "Final UAT walkthrough with client stakeholders before go-live sign-off.", date: "2026-08-19" },
    { id: nextId++, title: "Client demo", description: "Live walkthrough of the full reporting dashboard for the client's ops team.", date: "2026-09-02" },
    { id: nextId++, title: "Sprint Refinement", description: "Backlog grooming and estimation for the next sprint cycle.", date: "2026-09-09" },
    { id: nextId++, title: "End of Sprint", description: "Sprint close-out and retrospective.", date: "2026-09-30" },
  ],
};

export function getNextMilestoneId(): number {
  return nextId++;
}
