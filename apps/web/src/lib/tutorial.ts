import { COLORS, type Task } from "@/context/AppContext";

// Pre-loaded tutorial tasks — the tutorial IS five real tasks on the wheel.
// Each one teaches a feature; they behave like normal tasks and disappear once done.
export interface TutorialTask extends Task {
  step: number;
  feature: string;
}

export const TUTORIAL_TASKS: TutorialTask[] = [
  { id: "tut_1", step: 1, name: "Take your first spin",   minutes: 0,  color: COLORS[0], icon: "create",  feature: "The wheel" },
  { id: "tut_2", step: 2, name: "Finish a focus session", minutes: 25, color: COLORS[2], icon: "mind",    feature: "Focus mode" },
  { id: "tut_3", step: 3, name: "Add your own task",      minutes: 5,  color: COLORS[4], icon: "work",    feature: "Task creation" },
  { id: "tut_4", step: 4, name: "Check off a habit",      minutes: 10, color: COLORS[3], icon: "care",    feature: "Habits" },
  { id: "tut_5", step: 5, name: "Open the You tab",       minutes: 0,  color: COLORS[6], icon: "social",  feature: "Stats" },
];

export const isTutorialTask = (id: string) => id.startsWith("tut_");

export const tutorialStepFor = (id: string): TutorialTask | undefined =>
  TUTORIAL_TASKS.find((t) => t.id === id);
