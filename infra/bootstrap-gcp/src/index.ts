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
const rootProjectSuffix = new random.RandomId("root-project-suffix", { byteLength: 4 });

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
  { protect: true },
);

/** The Cloud Storage API in the root project. */
const storageApi = new gcp.projects.Service("storage-api", {
  project: rootProject.projectId,
  service: "storage.googleapis.com",
  disableOnDestroy: false,
});

/** The random suffix of the state bucket name. */
const stateBucketSuffix = new random.RandomId("state-bucket-suffix", { byteLength: 4 });

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
  { dependsOn: [storageApi], protect: true, retainOnDelete: true },
);

export const stateBucketUrl = pulumi.interpolate`gs://${stateBucket.name}`;
