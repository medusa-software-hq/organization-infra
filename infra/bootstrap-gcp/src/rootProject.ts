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
