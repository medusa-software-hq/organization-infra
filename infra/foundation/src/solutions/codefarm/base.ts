import * as random from "@pulumi/random";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import type { GithubRepository } from "@medusa/infra-common/rootGithubPool";
import { primaryLocation, rootGithubPool } from "../../organization.ts";
import { pulumiStateBucket } from "@medusa/infra-common/utils/pulumiStateBucket";
import {
  type Solution,
  solutionBaselineServices,
  solutionFolder,
  solutionProject,
} from "../convention.ts";

export const codefarm: Solution = { id: "codefarm", name: "Codefarm" };

/** The repository of Codefarm's infrastructure: its base and app stacks. */
export const codefarmInfraRepository: GithubRepository = {
  name: "codefarm-infra",
  id: "1389872325",
};

/** The repository of Codefarm's application code. */
const codefarmRepository: GithubRepository = { name: "codefarm", id: "1389872450" };

export const codefarmFolder = solutionFolder(codefarm);

/** Resources shared by the environments, like build artifacts; `x` for "cross-environment". */
export const codefarmSharedProject = solutionProject(codefarm, codefarmFolder, "x", "shared");

const sharedServices = solutionBaselineServices("codefarm-x", codefarmSharedProject);

/** Applies the base stack, which manages the shared project. */
export const codefarmBaseProvisioner = new gcp.serviceaccount.Account(
  "codefarm-base-provisioner",
  {
    project: codefarmSharedProject.projectId,
    accountId: "base-provisioner",
    displayName: "Base provisioner",
  },
  { dependsOn: sharedServices },
);

/** Previews Codefarm's stacks from pull requests; never writes. */
export const codefarmReader = new gcp.serviceaccount.Account(
  "codefarm-reader",
  { project: codefarmSharedProject.projectId, accountId: "reader", displayName: "Reader" },
  { dependsOn: sharedServices },
);

/** Pushes the images built from the application code. */
export const codefarmImageBuilder = new gcp.serviceaccount.Account(
  "codefarm-image-builder",
  {
    project: codefarmSharedProject.projectId,
    accountId: "image-builder",
    displayName: "Image builder",
  },
  { dependsOn: sharedServices },
);

new gcp.projects.IAMMember("codefarm-base-provisioner-owner", {
  project: codefarmSharedProject.projectId,
  role: "roles/owner",
  member: pulumi.interpolate`serviceAccount:${codefarmBaseProvisioner.email}`,
});

new gcp.projects.IAMMember("codefarm-reader-shared-viewer", {
  project: codefarmSharedProject.projectId,
  role: "roles/viewer",
  member: pulumi.interpolate`serviceAccount:${codefarmReader.email}`,
});

rootGithubPool.allowRunsOnBranch(
  "codefarm-base-provisioner-github",
  codefarmBaseProvisioner,
  codefarmInfraRepository,
  "main",
);

rootGithubPool.allowRunsOnPullRequests(
  "codefarm-reader-github",
  codefarmReader,
  codefarmInfraRepository,
);

rootGithubPool.allowRunsOnBranch(
  "codefarm-image-builder-github",
  codefarmImageBuilder,
  codefarmRepository,
  "main",
);

/** The random suffix of the base state bucket name. */
const codefarmBaseStateBucketSuffix = new random.RandomId("codefarm-base-state-bucket-suffix", {
  byteLength: 4,
});

export const codefarmBaseStateBucket = pulumiStateBucket(
  "codefarm-base-state",
  codefarmSharedProject.projectId,
  pulumi.interpolate`codefarm-base-state-${codefarmBaseStateBucketSuffix.hex}`,
  primaryLocation,
  { dependsOn: sharedServices },
);

new gcp.storage.BucketIAMMember("codefarm-reader-base-state", {
  bucket: codefarmBaseStateBucket.name,
  role: "roles/storage.objectViewer",
  member: pulumi.interpolate`serviceAccount:${codefarmReader.email}`,
});
