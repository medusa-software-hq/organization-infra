import * as gcp from "@pulumi/gcp";

/** The GCP organization. */
export const organization = gcp.organizations.getOrganizationOutput({
  domain: "medusa.software",
});

/** The primary billing account; looking it up would need billing access for previews. */
export const billingAccountId = "015A16-6671FE-EC0231";
