import {
  production,
  shared,
  type Solution,
  solutionFolder,
  solutionProject,
  staging,
} from "./solutions.ts";

const codefarm: Solution = { id: "codefarm", name: "Codefarm" };

const codefarmFolder = solutionFolder(codefarm);

export const codefarmProductionProject = solutionProject(codefarm, codefarmFolder, production);

export const codefarmStagingProject = solutionProject(codefarm, codefarmFolder, staging);

export const codefarmSharedProject = solutionProject(codefarm, codefarmFolder, shared);
