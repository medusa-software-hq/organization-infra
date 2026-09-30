import { declareRootGithubPool } from '@medusa/infra-common/rootGithubPool';
import { iamApi, rootProject, stsApi } from './rootProject.ts';

export const rootGithubPool = declareRootGithubPool(rootProject.projectId, {
  dependsOn: [iamApi, stsApi],
});
