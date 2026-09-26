import * as random from "@pulumi/random";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { primaryLocation } from "./organization.ts";
import { rootProject, storageApi } from "./rootProject.ts";

/** The random suffix of the state bucket name. */
const stateBucketSuffix = new random.RandomId("state-bucket-suffix", { byteLength: 4 });

/** The bucket holding this stack's Pulumi state. */
export const stateBucket = new gcp.storage.Bucket(
  "state",
  {
    project: rootProject.projectId,
    name: pulumi.interpolate`ms-root-pulumi-state-${stateBucketSuffix.hex}`,
    location: primaryLocation,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: "enforced",
    versioning: { enabled: true },
    lifecycleRules: [
      {
        action: { type: "Delete" },
        condition: { daysSinceNoncurrentTime: 90 },
      },
    ],
    // Must never be zero; together with versioning, it allows recovering overwritten state
    softDeletePolicy: { retentionDurationSeconds: 7 * 24 * 60 * 60 },
  },
  { dependsOn: [storageApi], protect: true, retainOnDelete: true },
);
