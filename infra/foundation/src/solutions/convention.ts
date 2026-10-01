import { projectService } from '@medusa/infra-common/utils/projectService';
import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';
import { billingAccountId } from '../organization.ts';
import { ownQuotaServices } from '../projects.ts';
import { solutionsFolder } from '../solutions.ts';

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

export const production: Environment = { code: 'p', name: 'production' };

export const staging: Environment = { code: 's', name: 'staging' };

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

/** One of a solution's projects, with the provider for declaring resources inside it. */
export interface SolutionProject {
  readonly project: gcp.organizations.Project;
  /** Counts requests against the project itself, rather than the caller's project. */
  readonly provider: gcp.Provider;
}

/** Declares one of a solution's projects, e.g. `codefarm-p-1a2b3c` named "Codefarm - production". */
export function solutionProject(
  solution: Solution,
  folder: gcp.organizations.Folder,
  code: string,
  name: string,
): SolutionProject {
  const resourceName = `${solution.id}-${code}`;
  const suffix = new random.RandomId(`${resourceName}-project-suffix`, { byteLength: 3 });

  const project = new gcp.organizations.Project(
    resourceName,
    {
      projectId: pulumi.interpolate`${resourceName}-${suffix.hex}`,
      name: `${solution.name} - ${name}`,
      folderId: folder.folderId,
      billingAccount: billingAccountId,
      deletionPolicy: 'PREVENT',
    },
    { protect: true },
  );

  const provider = new gcp.Provider(resourceName, {
    project: project.projectId,
    billingProject: project.projectId,
    userProjectOverride: true,
  });

  return { project, provider };
}

/** Enables the APIs a solution's identities need before they can manage its project themselves. */
export function solutionBaselineServices(
  namePrefix: string,
  { project, provider }: SolutionProject,
): gcp.projects.Service[] {
  const ownQuota = ownQuotaServices(namePrefix, project);
  const opts = { provider, dependsOn: ownQuota };

  return [
    ...ownQuota,
    projectService(namePrefix, project.projectId, 'iam.googleapis.com', opts),
    projectService(namePrefix, project.projectId, 'iamcredentials.googleapis.com', opts),
    projectService(namePrefix, project.projectId, 'storage.googleapis.com', opts),
  ];
}
