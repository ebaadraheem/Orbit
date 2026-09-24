import type { Conversation } from "../types/orbit";

const minutes = (m: number) => Date.now() - m * 60_000;

export const mockConversations: Conversation[] = [
  {
    id: "c1",
    title: "Latest research paper",
    preview: "Summarised hierarchical memory paper",
    updatedAt: minutes(12),
    group: "Today",
    taskCount: 2,
  },
  {
    id: "c2",
    title: "Computer setup",
    preview: "Installed dependencies, opened VS Code",
    updatedAt: minutes(96),
    group: "Today",
    taskCount: 3,
  },
  {
    id: "c3",
    title: "PhD applications",
    preview: "Compared two drafts of the SOP",
    updatedAt: minutes(240),
    group: "Today",
    taskCount: 1,
  },
  {
    id: "c4",
    title: "Agent architecture",
    preview: "Notes on tool routing",
    updatedAt: minutes(1500),
    group: "Yesterday",
    taskCount: 4,
  },
  {
    id: "c5",
    title: "Linear algebra",
    preview: "Worked through eigenvector proofs",
    updatedAt: minutes(1700),
    group: "Yesterday",
    taskCount: 1,
  },
  {
    id: "c6",
    title: "Downloads cleanup",
    preview: "Removed 1.4 GB of installers",
    updatedAt: minutes(4400),
    group: "Earlier",
    taskCount: 2,
  },
];
