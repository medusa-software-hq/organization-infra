import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import {
  type Environment,
  production,
  solutionBaselineServices,
  solutionProject,
  staging,
} from '../convention.ts';
import { codefarm, codefarmBaseProvisioner, codefarmFolder, codefarmReader } from './base.ts';

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

  return project;
}

export const codefarmStagingProject = codefarmEnvironment(staging);

export const codefarmProductionProject = codefarmEnvironment(production);
