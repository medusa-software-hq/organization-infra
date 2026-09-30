import * as random from "@pulumi/random";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { billingAccountId } from "../organization.ts";
import { solutionsFolder } from "../solutions.ts";
import { projectService } from "@medusa/infra-common/utils/projectService";

/** A product the organization develops, with its own folder and projects. */
export interface Solution {
  /** The prefix of the solution's resource IDs. */
  readonly id: string;
  readonly name: string;
}

/** An environment of a solution, like staging; its code abbreviates it in project IDs. */
export interface Environment {
  readonly code: string;
  readonly name: string;
}

export const production: Environment = { code: "p", name: "production" };

export const staging: Environment = { code: "s", name: "staging" };

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

/** Declares one of a solution's projects, e.g. `codefarm-p-1a2b3c` named "Codefarm - production". */
export function solutionProject(
  solution: Solution,
  folder: gcp.organizations.Folder,
  code: string,
  name: string,
): gcp.organizations.Project {
  const resourceName = `${solution.id}-${code}`;
  const suffix = new random.RandomId(`${resourceName}-project-suffix`, { byteLength: 3 });

  return new gcp.organizations.Project(
    resourceName,
    {
      projectId: pulumi.interpolate`${resourceName}-${suffix.hex}`,
      name: `${solution.name} - ${name}`,
      folderId: folder.folderId,
      billingAccount: billingAccountId,
      deletionPolicy: "PREVENT",
    },
    { protect: true },
  );
}

/** Enables the APIs a solution's identities need before they can manage its project themselves. */
export function solutionBaselineServices(
  namePrefix: string,
  project: gcp.organizations.Project,
): gcp.projects.Service[] {
  return [
    projectService(namePrefix, project.projectId, "cloudresourcemanager.googleapis.com"),
    projectService(namePrefix, project.projectId, "serviceusage.googleapis.com"),
    projectService(namePrefix, project.projectId, "iam.googleapis.com"),
    projectService(namePrefix, project.projectId, "iamcredentials.googleapis.com"),
    projectService(namePrefix, project.projectId, "storage.googleapis.com"),
  ];
}
