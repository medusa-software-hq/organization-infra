import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import { organizationAdminsGroup, primaryLocation } from '../../organization.ts';
import {
  type Environment,
  production,
  solutionBaselineServices,
  solutionProject,
  staging,
} from '../convention.ts';
import {
  codefarm,
  codefarmBase,
  codefarmBaseProvisioner,
  codefarmBaseSecretManagerApi,
  codefarmFolder,
  codefarmReader,
} from './base.ts';

/** Declares an environment's project, whose contents Codefarm's base stack manages. */
function codefarmEnvironment(environment: Environment): gcp.organizations.Project {
  const environmentProject = solutionProject(
    codefarm,
    codefarmFolder,
    environment.code,
    environment.name,
  );

  const { project, provider } = environmentProject;

  solutionBaselineServices(`codefarm-${environment.code}`, environmentProject);

  new gcp.projects.IAMMember(
    `codefarm-base-provisioner-${environment.name}-owner`,
    {
      project: project.projectId,
      role: 'roles/owner',
      member: pulumi.interpolate`serviceAccount:${codefarmBaseProvisioner.email}`,
    },
    { provider },
  );

  // Lets the reader preview through providers that count requests against the project
  new gcp.projects.IAMMember(
    `codefarm-reader-${environment.name}-service-usage`,
    {
      project: project.projectId,
      role: 'roles/serviceusage.serviceUsageConsumer',
      member: pulumi.interpolate`serviceAccount:${codefarmReader.email}`,
    },
    { provider },
  );

  // Lets the reader preview the IAM that Codefarm's stacks manage, which viewers can't see
  new gcp.projects.IAMMember(
    `codefarm-reader-${environment.name}-security-reviewer`,
    {
      project: project.projectId,
      role: 'roles/iam.securityReviewer',
      member: pulumi.interpolate`serviceAccount:${codefarmReader.email}`,
    },
    { provider },
  );

  /**
   * Holds the token Codefarm mints the environment's Cloudflare tokens with; only admins add it.
   * Kept in the base project, out of the reach of the environment project's owners.
   */
  const minterToken = new gcp.secretmanager.Secret(
    `codefarm-${environment.name}-cloudflare-minter-token`,
    {
      project: codefarmBase.project.projectId,
      secretId: `cloudflare-${environment.name}-minter-token`,
      replication: { userManaged: { replicas: [{ location: primaryLocation }] } },
    },
    { provider: codefarmBase.provider, dependsOn: [codefarmBaseSecretManagerApi] },
  );

  new gcp.secretmanager.SecretIamMember(
    `codefarm-${environment.name}-cloudflare-minter-token-admins`,
    {
      secretId: minterToken.id,
      role: 'roles/secretmanager.secretVersionAdder',
      member: organizationAdminsGroup,
    },
    { provider: codefarmBase.provider },
  );

  return project;
}

export const codefarmStagingProject = codefarmEnvironment(staging);

export const codefarmProductionProject = codefarmEnvironment(production);
