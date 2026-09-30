import { pulumiStateBucket } from '@medusa/infra-common/utils/pulumiStateBucket';
import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';
import { primaryLocation, rootGithubPool } from '../../organization.ts';
import {
  type Environment,
  production,
  solutionBaselineServices,
  solutionProject,
  staging,
} from '../convention.ts';
import { codefarm, codefarmFolder, codefarmInfraRepository, codefarmReader } from './base.ts';

/** One of Codefarm's environments: a project, applied by its own app stack. */
export interface CodefarmEnvironment {
  readonly project: gcp.organizations.Project;
  readonly appProvisioner: gcp.serviceaccount.Account;
  readonly appStateBucket: gcp.storage.Bucket;
}

/** Declares an environment's project, the provisioner of its app stack, and the stack's state. */
function codefarmEnvironment(environment: Environment): CodefarmEnvironment {
  const project = solutionProject(codefarm, codefarmFolder, environment.code, environment.name);

  const services = solutionBaselineServices(`codefarm-${environment.code}`, project);

  const appProvisioner = new gcp.serviceaccount.Account(
    `codefarm-app-${environment.name}-provisioner`,
    { project: project.projectId, accountId: 'app-provisioner', displayName: 'App provisioner' },
    { dependsOn: services },
  );

  new gcp.projects.IAMMember(`codefarm-app-${environment.name}-provisioner-owner`, {
    project: project.projectId,
    role: 'roles/owner',
    member: pulumi.interpolate`serviceAccount:${appProvisioner.email}`,
  });

  rootGithubPool.allowRunsInEnvironment(
    `codefarm-app-${environment.name}-provisioner-github`,
    appProvisioner,
    codefarmInfraRepository,
    environment.name,
  );

  const appStateBucketSuffix = new random.RandomId(
    `codefarm-app-${environment.name}-state-bucket-suffix`,
    { byteLength: 4 },
  );

  const appStateBucket = pulumiStateBucket(
    `codefarm-app-${environment.name}-state`,
    project.projectId,
    pulumi.interpolate`codefarm-app-${environment.name}-state-${appStateBucketSuffix.hex}`,
    primaryLocation,
    { dependsOn: services },
  );

  new gcp.projects.IAMMember(`codefarm-reader-${environment.name}-viewer`, {
    project: project.projectId,
    role: 'roles/viewer',
    member: pulumi.interpolate`serviceAccount:${codefarmReader.email}`,
  });

  new gcp.storage.BucketIAMMember(`codefarm-reader-${environment.name}-state`, {
    bucket: appStateBucket.name,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${codefarmReader.email}`,
  });

  return { project, appProvisioner, appStateBucket };
}

export const codefarmStaging = codefarmEnvironment(staging);

export const codefarmProduction = codefarmEnvironment(production);
