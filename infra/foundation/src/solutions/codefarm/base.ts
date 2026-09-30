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

/** The repository of Codefarm's application code. */
const codefarmRepository: GithubRepository = { name: 'codefarm', id: '1389872450' };

export const codefarmFolder = solutionFolder(codefarm);

/** Resources shared by the environments, like build artifacts; `x` for "cross-environment". */
const codefarmShared = solutionProject(codefarm, codefarmFolder, 'x', 'shared');

export const codefarmSharedProject = codefarmShared.project;

const { provider } = codefarmShared;

const sharedServices = solutionBaselineServices('codefarm-x', codefarmShared);

/** Applies the base stack, which manages the shared project. */
export const codefarmBaseProvisioner = new gcp.serviceaccount.Account(
  'codefarm-base-provisioner',
  {
    project: codefarmSharedProject.projectId,
    accountId: 'base-provisioner',
    displayName: 'Base provisioner',
  },
  { provider, dependsOn: sharedServices },
);

/** Previews Codefarm's stacks from pull requests; never writes. */
export const codefarmReader = new gcp.serviceaccount.Account(
  'codefarm-reader',
  { project: codefarmSharedProject.projectId, accountId: 'reader', displayName: 'Reader' },
  { provider, dependsOn: sharedServices },
);

/** Pushes the images built from the application code. */
export const codefarmImageBuilder = new gcp.serviceaccount.Account(
  'codefarm-image-builder',
  {
    project: codefarmSharedProject.projectId,
    accountId: 'image-builder',
    displayName: 'Image builder',
  },
  { provider, dependsOn: sharedServices },
);

new gcp.projects.IAMMember(
  'codefarm-base-provisioner-owner',
  {
    project: codefarmSharedProject.projectId,
    role: 'roles/owner',
    member: pulumi.interpolate`serviceAccount:${codefarmBaseProvisioner.email}`,
  },
  { provider },
);

new gcp.projects.IAMMember(
  'codefarm-reader-shared-viewer',
  {
    project: codefarmSharedProject.projectId,
    role: 'roles/viewer',
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

rootGithubPool.allowRunsOnBranch(
  'codefarm-image-builder-github',
  codefarmImageBuilder,
  codefarmRepository,
  'main',
  { provider },
);

/** The random suffix of the base state bucket name. */
const codefarmBaseStateBucketSuffix = new random.RandomId('codefarm-base-state-bucket-suffix', {
  byteLength: 4,
});

export const codefarmBaseStateBucket = pulumiStateBucket(
  'codefarm-base-state',
  codefarmSharedProject.projectId,
  pulumi.interpolate`codefarm-base-state-${codefarmBaseStateBucketSuffix.hex}`,
  primaryLocation,
  { provider, dependsOn: sharedServices },
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
