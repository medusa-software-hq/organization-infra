import * as gcp from "@pulumi/gcp";

/** The GCP organization. */
const organization = gcp.organizations.getOrganizationOutput({
  domain: "medusa.software",
});

export const organizationId = organization.orgId;
