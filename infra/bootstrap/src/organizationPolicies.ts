import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { organization, organizationDomain } from "./organization.ts";

/** Declares an organization policy for a constraint. */
function organizationPolicy(
  constraint: string,
  rule: gcp.types.input.orgpolicy.PolicySpecRule,
): gcp.orgpolicy.Policy {
  return new gcp.orgpolicy.Policy(constraint, {
    parent: pulumi.interpolate`organizations/${organization.orgId}`,
    name: pulumi.interpolate`organizations/${organization.orgId}/policies/${constraint}`,
    spec: { rules: [rule] },
  });
}

// No downloadable service account keys can be created
organizationPolicy("iam.disableServiceAccountKeyCreation", { enforce: "TRUE" });

// No externally generated keys can be uploaded to service accounts
organizationPolicy("iam.disableServiceAccountKeyUpload", { enforce: "TRUE" });

// Default service accounts don't get the Editor role automatically
organizationPolicy("iam.automaticIamGrantsForDefaultServiceAccounts", { enforce: "TRUE" });

// Only principals from the organization's own directory can be granted roles
organizationPolicy("iam.allowedPolicyMemberDomains", {
  values: { allowedValues: [organization.directoryCustomerId] },
});

// Buckets can't use per-object ACLs, only IAM
organizationPolicy("storage.uniformBucketLevelAccess", { enforce: "TRUE" });

// Buckets and objects can't be made public
organizationPolicy("storage.publicAccessPrevention", { enforce: "TRUE" });

// New projects don't get the permissive "default" network
organizationPolicy("compute.skipDefaultNetworkCreation", { enforce: "TRUE" });

// New projects use zonal internal DNS names, which are more resilient than global ones
organizationPolicy("compute.setNewProjectDefaultToZonalDNSOnly", { enforce: "TRUE" });

// Protocol forwarding can only be used for internal traffic
organizationPolicy("compute.restrictProtocolForwardingCreationForTypes", {
  values: { allowedValues: ["INTERNAL"] },
});

// Essential contacts (security, billing notices) must be the organization's own addresses
organizationPolicy("essentialcontacts.allowedContactDomains", {
  values: { allowedValues: [`@${organizationDomain}`] },
});
