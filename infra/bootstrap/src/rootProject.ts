import * as random from "@pulumi/random";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { billingAccount, organization } from "./organization.ts";

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
export const storageApi = new gcp.projects.Service("storage-api", {
  project: rootProject.projectId,
  service: "storage.googleapis.com",
  disableOnDestroy: false,
});

/** The IAM API in the root project, for managing service accounts and workload identity. */
export const iamApi = new gcp.projects.Service("iam-api", {
  project: rootProject.projectId,
  service: "iam.googleapis.com",
  disableOnDestroy: false,
});

/** The IAM Service Account Credentials API in the root project, for impersonating service accounts. */
export const iamCredentialsApi = new gcp.projects.Service("iam-credentials-api", {
  project: rootProject.projectId,
  service: "iamcredentials.googleapis.com",
  disableOnDestroy: false,
});

/** The Security Token Service API in the root project, for exchanging external tokens. */
export const stsApi = new gcp.projects.Service("sts-api", {
  project: rootProject.projectId,
  service: "sts.googleapis.com",
  disableOnDestroy: false,
});

/** The Resource Manager API in the root project, which automation's API calls are billed to. */
export const resourceManagerApi = new gcp.projects.Service("resource-manager-api", {
  project: rootProject.projectId,
  service: "cloudresourcemanager.googleapis.com",
  disableOnDestroy: false,
});
