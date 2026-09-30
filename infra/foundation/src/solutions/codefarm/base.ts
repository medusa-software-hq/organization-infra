import type { GithubRepository } from '@medusa/infra-common/rootGithubPool';
import { pulumiStateBucket } from '@medusa/infra-common/utils/pulumiStateBucket';
import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';
import { primaryLocation, rootGithubPool } from '../../organization.ts';
import {
  type Solution,
  solutionBaselineServices,
  solutionFolder,
  solutionProject,
} from '../convention.ts';

export const codefarm: Solution = { id: 'codefarm', name: 'Codefarm' };

/** The repository of Codefarm's infrastructure: its base and app stacks. */
export const codefarmInfraRepository: GithubRepository = {
  name: 'codefarm-infra',
  id: '1389872325',
};

export const codefarmFolder = solutionFolder(codefarm);

/** The base stack's project, for what the environments share, like build artifacts; `x` for "cross-environment". */
const codefarmBase = solutionProject(codefarm, codefarmFolder, 'x', 'base');

export const codefarmBaseProject = codefarmBase.project;

const { provider } = codefarmBase;

const baseServices = solutionBaselineServices('codefarm-x', codefarmBase);

/** Applies the base stack. */
export const codefarmBaseProvisioner = new gcp.serviceaccount.Account(
  'codefarm-base-provisioner',
  {
    project: codefarmBaseProject.projectId,
    accountId: 'base-provisioner',
    displayName: 'Base provisioner',
  },
  { provider, dependsOn: baseServices },
);

/** Previews Codefarm's stacks from pull requests; never writes. */
export const codefarmReader = new gcp.serviceaccount.Account(
  'codefarm-reader',
  { project: codefarmBaseProject.projectId, accountId: 'reader', displayName: 'Reader' },
  { provider, dependsOn: baseServices },
);

new gcp.projects.IAMMember(
  'codefarm-base-provisioner-owner',
  {
    project: codefarmBaseProject.projectId,
    role: 'roles/owner',
    member: pulumi.interpolate`serviceAccount:${codefarmBaseProvisioner.email}`,
  },
  { provider },
);

new gcp.projects.IAMMember(
  'codefarm-reader-shared-viewer',
  {
    project: codefarmBaseProject.projectId,
    role: 'roles/viewer',
    member: pulumi.interpolate`serviceAccount:${codefarmReader.email}`,
  },
  { provider },
);

// Lets the reader preview the IAM that Codefarm's stacks manage, which viewers can't see
new gcp.projects.IAMMember(
  'codefarm-reader-base-security-reviewer',
  {
    project: codefarmBaseProject.projectId,
    role: 'roles/iam.securityReviewer',
    member: pulumi.interpolate`serviceAccount:${codefarmReader.email}`,
  },
  { provider },
);

rootGithubPool.allowRunsOnBranch(
  'codefarm-base-provisioner-github',
  codefarmBaseProvisioner,
  codefarmInfraRepository,
  'main',
  { provider },
);

rootGithubPool.allowRunsOnPullRequests(
  'codefarm-reader-github',
  codefarmReader,
  codefarmInfraRepository,
  { provider },
);

/** The random suffix of the base state bucket name. */
const codefarmBaseStateBucketSuffix = new random.RandomId('codefarm-base-state-bucket-suffix', {
  byteLength: 4,
});

export const codefarmBaseStateBucket = pulumiStateBucket(
  'codefarm-base-state',
  codefarmBaseProject.projectId,
  pulumi.interpolate`codefarm-base-state-${codefarmBaseStateBucketSuffix.hex}`,
  primaryLocation,
  { provider, dependsOn: baseServices },
);

new gcp.storage.BucketIAMMember(
  'codefarm-reader-base-state',
  {
    bucket: codefarmBaseStateBucket.name,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${codefarmReader.email}`,
  },
  { provider },
);
