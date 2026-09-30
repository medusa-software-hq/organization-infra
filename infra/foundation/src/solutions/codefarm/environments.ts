import { projectService } from '@medusa/infra-common/utils/projectService';
import { pulumiSecretsKey } from '@medusa/infra-common/utils/pulumiSecretsKey';
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
import {
  codefarm,
  codefarmBaseProvisioner,
  codefarmFolder,
  codefarmInfraRepository,
  codefarmReader,
  handedOverToBase,
} from './base.ts';

/** One of Codefarm's environments: a project, applied by its own app stack. */
export interface CodefarmEnvironment {
  readonly project: gcp.organizations.Project;
  readonly appProvisioner: gcp.serviceaccount.Account;
  readonly appStateBucket: gcp.storage.Bucket;
}

/** Declares an environment's project, the provisioner of its app stack, and the stack's state. */
function codefarmEnvironment(environment: Environment): CodefarmEnvironment {
  const environmentProject = solutionProject(
    codefarm,
    codefarmFolder,
    environment.code,
    environment.name,
  );

  const { project, provider } = environmentProject;

  const services = solutionBaselineServices(`codefarm-${environment.code}`, environmentProject);

  const appProvisioner = new gcp.serviceaccount.Account(
    `codefarm-app-${environment.name}-provisioner`,
    { project: project.projectId, accountId: 'app-provisioner', displayName: 'App provisioner' },
    { provider, dependsOn: services, ...handedOverToBase },
  );

  new gcp.projects.IAMMember(
    `codefarm-app-${environment.name}-provisioner-owner`,
    {
      project: project.projectId,
      role: 'roles/owner',
      member: pulumi.interpolate`serviceAccount:${appProvisioner.email}`,
    },
    { provider, ...handedOverToBase },
  );

  new gcp.projects.IAMMember(
    `codefarm-base-provisioner-${environment.name}-owner`,
    {
      project: project.projectId,
      role: 'roles/owner',
      member: pulumi.interpolate`serviceAccount:${codefarmBaseProvisioner.email}`,
    },
    { provider },
  );

  rootGithubPool.allowRunsInEnvironment(
    `codefarm-app-${environment.name}-provisioner-github`,
    appProvisioner,
    codefarmInfraRepository,
    environment.name,
    { provider },
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
    { provider, dependsOn: services, ...handedOverToBase },
  );

  const kmsService = projectService(
    `codefarm-${environment.code}`,
    project.projectId,
    'cloudkms.googleapis.com',
    { provider, ...handedOverToBase },
  );

  const secretsKey = pulumiSecretsKey(
    `codefarm-${environment.name}`,
    project.projectId,
    primaryLocation,
    {
      provider,
      dependsOn: [kmsService],
      ...handedOverToBase,
    },
  );

  new gcp.kms.CryptoKeyIAMMember(
    `codefarm-app-${environment.name}-provisioner-secrets-key`,
    {
      cryptoKeyId: secretsKey.id,
      role: 'roles/cloudkms.cryptoKeyEncrypterDecrypter',
      member: pulumi.interpolate`serviceAccount:${appProvisioner.email}`,
    },
    { provider, ...handedOverToBase },
  );

  new gcp.projects.IAMMember(
    `codefarm-reader-${environment.name}-viewer`,
    {
      project: project.projectId,
      role: 'roles/viewer',
      member: pulumi.interpolate`serviceAccount:${codefarmReader.email}`,
    },
    { provider, ...handedOverToBase },
  );

  new gcp.storage.BucketIAMMember(
    `codefarm-reader-${environment.name}-state`,
    {
      bucket: appStateBucket.name,
      role: 'roles/storage.objectViewer',
      member: pulumi.interpolate`serviceAccount:${codefarmReader.email}`,
    },
    { provider, ...handedOverToBase },
  );

  return { project, appProvisioner, appStateBucket };
}

export const codefarmStaging = codefarmEnvironment(staging);

export const codefarmProduction = codefarmEnvironment(production);
