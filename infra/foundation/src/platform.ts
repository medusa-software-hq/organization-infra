import { projectService } from '@medusa/infra-common/utils/projectService';
import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';
import { billingAccountId, organization, organizationAdminsGroup } from './organization.ts';

/** The random suffix of the platform project ID. */
const platformProjectSuffix = new random.RandomId('platform-project-suffix', { byteLength: 4 });

/**
 * For organization-level things that every solution uses but that aren't critical, unlike the
 * root project, e.g. the OAuth client people sign in to the solutions with.
 */
export const platformProject = new gcp.organizations.Project(
  'platform',
  {
    name: 'Platform',
    projectId: pulumi.interpolate`ms-platform-${platformProjectSuffix.hex}`,
    orgId: organization.orgId,
    billingAccount: billingAccountId,
    deletionPolicy: 'PREVENT',
  },
  { protect: true },
);

// Counts requests against the platform project itself, rather than the caller's project
const provider = new gcp.Provider('platform', {
  project: platformProject.projectId,
  billingProject: platformProject.projectId,
  userProjectOverride: true,
});

// Cloudflare's Google Workspace sign-in reads the signed-in people through the Admin SDK
projectService('platform', platformProject.projectId, 'admin.googleapis.com', { provider });

// The OAuth consent screen and client have no API, so admins create them in the console
new gcp.projects.IAMMember(
  'organization-admins-platform-oauth-config',
  {
    project: platformProject.projectId,
    role: 'roles/oauthconfig.editor',
    member: organizationAdminsGroup,
  },
  { provider },
);
