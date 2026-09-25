import * as random from "@pulumi/random";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

/** The organization's internet domain, which is also the name of its Cloud Identity account. */
const organizationDomain = "medusa.software";

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
