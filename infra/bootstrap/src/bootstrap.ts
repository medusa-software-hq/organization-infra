import * as random from "@pulumi/random";
import * as pulumi from "@pulumi/pulumi";
import { primaryLocation } from "./organization.ts";
import { rootProject, storageApi } from "./rootProject.ts";
import { pulumiStateBucket } from "./utils/pulumiStateBucket.ts";

/** The random suffix of the bootstrap state bucket name. */
const bootstrapStateBucketSuffix = new random.RandomId("bootstrap-state-bucket-suffix", {
  byteLength: 4,
});

/** The name of the bucket holding this stack's Pulumi state. */
export const bootstrapStateBucketName = pulumi.interpolate`ms-root-bootstrap-state-${bootstrapStateBucketSuffix.hex}`;

/** The bucket holding this stack's Pulumi state. */
export const bootstrapStateBucket = pulumiStateBucket(
  "bootstrap-state",
  rootProject.projectId,
  bootstrapStateBucketName,
  primaryLocation,
  { dependsOn: [storageApi] },
);
