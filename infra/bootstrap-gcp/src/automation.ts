import * as gcp from "@pulumi/gcp";
import { iamApi, rootProject } from "./rootProject.ts";

/** The identity through which automation administers the organization. */
export const organizationProvisioner = new gcp.serviceaccount.Account(
  "organization-provisioner",
  {
    project: rootProject.projectId,
    accountId: "organization-provisioner",
    displayName: "Organization provisioner",
  },
  { dependsOn: [iamApi] },
);

/** The identity through which automation inspects the organization; never elevated. */
export const organizationReader = new gcp.serviceaccount.Account(
  "organization-reader",
  {
    project: rootProject.projectId,
    accountId: "organization-reader",
    displayName: "Organization reader",
  },
  { dependsOn: [iamApi] },
);
