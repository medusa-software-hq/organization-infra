import * as random from "@pulumi/random";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { billingAccountId, organization } from "./organization.ts";

/** A product the organization develops, with its own folder and projects. */
export interface Solution {
  /** The prefix of the solution's resource IDs. */
  readonly id: string;
  readonly name: string;
}

/** An environment of a solution, abbreviated in project IDs. */
export interface Environment {
  readonly code: string;
  readonly name: string;
}

export const production: Environment = { code: "p", name: "production" };

export const staging: Environment = { code: "s", name: "staging" };

/** Resources shared by the other environments, like build artifacts; `x` for "cross-environment". */
export const shared: Environment = { code: "x", name: "shared" };

/** The folder grouping the organization's solutions. */
export const solutionsFolder = new gcp.organizations.Folder(
  "solutions",
  {
    displayName: "Solutions",
    parent: pulumi.interpolate`organizations/${organization.orgId}`,
  },
  { protect: true },
);

/** Declares a solution's folder. */
export function solutionFolder(solution: Solution): gcp.organizations.Folder {
  return new gcp.organizations.Folder(
    solution.id,
    {
      displayName: solution.name,
      parent: solutionsFolder.name,
    },
    { protect: true },
  );
}

/** Declares a solution's project for an environment, e.g. `codefarm-p-1a2b3c`. */
export function solutionProject(
  solution: Solution,
  folder: gcp.organizations.Folder,
  environment: Environment,
): gcp.organizations.Project {
  const name = `${solution.id}-${environment.code}`;
  const suffix = new random.RandomId(`${name}-project-suffix`, { byteLength: 3 });

  return new gcp.organizations.Project(
    name,
    {
      projectId: pulumi.interpolate`${name}-${suffix.hex}`,
      name: `${solution.name} - ${environment.name}`,
      folderId: folder.folderId,
      billingAccount: billingAccountId,
      deletionPolicy: "PREVENT",
    },
    { protect: true },
  );
}
