import * as random from "@pulumi/random";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { primaryLocation } from "./organization.ts";
import { iamApi, rootProject, storageApi } from "./rootProject.ts";
import { pulumiStateBucket } from "./utils/pulumiStateBucket.ts";

/** The identity that applies the foundation stack. */
export const foundationProvisioner = new gcp.serviceaccount.Account(
  "organization-provisioner",
  {
    project: rootProject.projectId,
    accountId: "organization-provisioner",
    displayName: "Organization provisioner",
  },
  { dependsOn: [iamApi] },
);

/** The identity that previews the foundation stack; never elevated. */
export const foundationReader = new gcp.serviceaccount.Account(
  "organization-reader",
  {
    project: rootProject.projectId,
    accountId: "organization-reader",
    displayName: "Organization reader",
  },
  { dependsOn: [iamApi] },
);

/** The random suffix of the foundation state bucket name. */
const foundationStateBucketSuffix = new random.RandomId("foundation-state-bucket-suffix", {
  byteLength: 4,
});

/** The name of the bucket holding the foundation stack's Pulumi state. */
export const foundationStateBucketName = pulumi.interpolate`ms-root-foundation-state-${foundationStateBucketSuffix.hex}`;

/** The bucket holding the foundation stack's Pulumi state. */
export const foundationStateBucket = pulumiStateBucket(
  "foundation-state",
  rootProject.projectId,
  foundationStateBucketName,
  primaryLocation,
  { dependsOn: [storageApi] },
);
