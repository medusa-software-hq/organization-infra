import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { organization, organizationDomain } from "./organization.ts";

/** Declares an organization policy for a constraint. */
function organizationPolicy(
  constraint: string,
  rule: gcp.types.input.orgpolicy.PolicySpecRule,
  opts?: pulumi.CustomResourceOptions,
): gcp.orgpolicy.Policy {
  return new gcp.orgpolicy.Policy(
    constraint,
    {
      parent: pulumi.interpolate`organizations/${organization.orgId}`,
      name: pulumi.interpolate`organizations/${organization.orgId}/policies/${constraint}`,
      spec: { rules: [rule] },
    },
    opts,
  );
}

/** Temporarily adopts a policy that already exists in the organization. */
function adopted(constraint: string): pulumi.CustomResourceOptions {
  return { import: `organizations/773468735623/policies/${constraint}` }; // TODO: Remove the import
}

// No downloadable service account keys can be created
organizationPolicy(
  "iam.disableServiceAccountKeyCreation",
  { enforce: "TRUE" },
  adopted("iam.disableServiceAccountKeyCreation"),
);

// No externally generated keys can be uploaded to service accounts
organizationPolicy(
  "iam.disableServiceAccountKeyUpload",
  { enforce: "TRUE" },
  adopted("iam.disableServiceAccountKeyUpload"),
);

// Default service accounts don't get the Editor role automatically
organizationPolicy(
  "iam.automaticIamGrantsForDefaultServiceAccounts",
  { enforce: "TRUE" },
  adopted("iam.automaticIamGrantsForDefaultServiceAccounts"),
);

// Only principals from the organization's own directory can be granted roles
organizationPolicy(
  "iam.allowedPolicyMemberDomains",
  { values: { allowedValues: [organization.directoryCustomerId] } },
  adopted("iam.allowedPolicyMemberDomains"),
);

// Buckets can't use per-object ACLs, only IAM
organizationPolicy(
  "storage.uniformBucketLevelAccess",
  { enforce: "TRUE" },
  adopted("storage.uniformBucketLevelAccess"),
);

// Buckets and objects can't be made public
organizationPolicy("storage.publicAccessPrevention", { enforce: "TRUE" });

// New projects don't get the permissive "default" network
organizationPolicy("compute.skipDefaultNetworkCreation", { enforce: "TRUE" });

// New projects use zonal internal DNS names, which are more resilient than global ones
organizationPolicy(
  "compute.setNewProjectDefaultToZonalDNSOnly",
  { enforce: "TRUE" },
  adopted("compute.setNewProjectDefaultToZonalDNSOnly"),
);

// Protocol forwarding can only be used for internal traffic
organizationPolicy(
  "compute.restrictProtocolForwardingCreationForTypes",
  { values: { allowedValues: ["INTERNAL"] } },
  adopted("compute.restrictProtocolForwardingCreationForTypes"),
);

// Essential contacts (security, billing notices) must be the organization's own addresses
organizationPolicy(
  "essentialcontacts.allowedContactDomains",
  { values: { allowedValues: [`@${organizationDomain}`] } },
  adopted("essentialcontacts.allowedContactDomains"),
);
