import { projectService } from '@medusa/infra-common/utils/projectService';
import type * as gcp from '@pulumi/gcp';

/**
 * Turns on the two APIs that let a new project be billed for its own requests: Service Usage to
 * turn on its other APIs, and Resource Manager for its IAM.
 *
 * The only requests billed to the caller's project, the root, since the new project can't be
 * billed for them yet. Everything else goes through the project's own provider, so this set
 * never grows.
 */
export function ownQuotaServices(
  namePrefix: string,
  project: gcp.organizations.Project,
): gcp.projects.Service[] {
  return [
    projectService(namePrefix, project.projectId, 'serviceusage.googleapis.com'),
    projectService(namePrefix, project.projectId, 'cloudresourcemanager.googleapis.com'),
  ];
}
