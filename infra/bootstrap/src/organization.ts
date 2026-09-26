import * as gcp from "@pulumi/gcp";

/** The organization's internet domain, which is also the name of its Cloud Identity account. */
export const organizationDomain = "medusa.software";

/** The default location for regional resources. */
export const primaryLocation = "europe-central2";

/** The group of the organization's administrators. */
export const organizationAdminsGroup = "group:gcp-organization-admins@medusa.software";

/** The super admin, reserved for the initial bootstrap and break-glass. */
export const superAdmin = "user:admin@medusa.software";

/** The GCP organization. */
export const organization = gcp.organizations.getOrganizationOutput({
  domain: organizationDomain,
});

/** The primary billing account. */
export const billingAccount = gcp.organizations.getBillingAccountOutput({
  displayName: "My Billing Account",
  open: true,
  lookupProjects: false,
});
