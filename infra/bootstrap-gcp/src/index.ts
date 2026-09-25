import * as random from "@pulumi/random";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

/** The organization's internet domain, which is also the name of its Cloud Identity account. */
const organizationDomain = "medusa.software";

/** The default location for regional resources. */
const primaryLocation = "europe-central2";

/** The GCP organization. */
const organization = gcp.organizations.getOrganizationOutput({
  domain: organizationDomain,
});

/** The primary billing account. */
const billingAccount = gcp.organizations.getBillingAccountOutput({
  displayName: "My Billing Account",
  open: true,
  lookupProjects: false,
});

/** The random suffix of the root project ID. */
const rootProjectSuffix = new random.RandomId(
  "root-project-suffix",
  { byteLength: 4 },
  { import: "9p8qbQ" }, // TODO: Remove the import
);

/** The root project. */
export const rootProject = new gcp.organizations.Project(
  "root",
  {
    name: "bootstrap",
    projectId: pulumi.interpolate`ms-root-${rootProjectSuffix.hex}`,
    orgId: organization.orgId,
    billingAccount: billingAccount.id,
    // Deleting the root of trust must be a deliberate, two-step change
    deletionPolicy: "PREVENT",
  },
  { protect: true, import: "projects/ms-root-f69f2a6d" }, // TODO: Remove the import
);

/** The Cloud Storage API in the root project. */
const storageApi = new gcp.projects.Service(
  "storage-api",
  {
    project: rootProject.projectId,
    service: "storage.googleapis.com",
    disableOnDestroy: false,
  },
  { import: "ms-root-f69f2a6d/storage.googleapis.com" }, // TODO: Remove the import
);

/** The random suffix of the state bucket name. */
const stateBucketSuffix = new random.RandomId(
  "state-bucket-suffix",
  { byteLength: 4 },
  { import: "a21wdw" }, // TODO: Remove the import
);

/** The bucket holding this stack's Pulumi state. */
const stateBucket = new gcp.storage.Bucket(
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
  {
    dependsOn: [storageApi],
    protect: true,
    retainOnDelete: true,
    import: "ms-root-pulumi-state-6b6d7077", // TODO: Remove the import
  },
);

export const stateBucketUrl = pulumi.interpolate`gs://${stateBucket.name}`;
