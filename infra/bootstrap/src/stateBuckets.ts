import * as random from "@pulumi/random";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { primaryLocation } from "./organization.ts";
import { rootProject, storageApi } from "./rootProject.ts";

/** Declares a bucket for Pulumi state. */
function pulumiStateBucket(name: string, bucketName: pulumi.Output<string>): gcp.storage.Bucket {
  return new gcp.storage.Bucket(
    name,
    {
      project: rootProject.projectId,
      name: bucketName,
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
}

/** The random suffix of the bootstrap state bucket name. */
const bootstrapStateBucketSuffix = new random.RandomId("state-bucket-suffix", { byteLength: 4 });

/** The name of the bucket holding this stack's Pulumi state. */
export const bootstrapStateBucketName = pulumi.interpolate`ms-root-pulumi-state-${bootstrapStateBucketSuffix.hex}`;

/** The bucket holding this stack's Pulumi state. */
export const bootstrapStateBucket = pulumiStateBucket("state", bootstrapStateBucketName);

/** The random suffix of the foundation state bucket name. */
const foundationStateBucketSuffix = new random.RandomId("foundation-state-bucket-suffix", {
  byteLength: 4,
});

/** The name of the bucket holding the foundation stack's Pulumi state. */
export const foundationStateBucketName = pulumi.interpolate`ms-root-foundation-state-${foundationStateBucketSuffix.hex}`;

/** The bucket holding the foundation stack's Pulumi state. */
export const foundationStateBucket = pulumiStateBucket(
  "foundation-state",
  foundationStateBucketName,
);
