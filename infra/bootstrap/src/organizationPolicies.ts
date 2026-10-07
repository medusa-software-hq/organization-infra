import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import { foundationProvisioner } from './foundation.ts';
import { organization, organizationDomain } from './organization.ts';

/** Declares an organization policy for a constraint, whose first matching rule applies. */
function organizationPolicy(
  constraint: string,
  ...rules: gcp.types.input.orgpolicy.PolicySpecRule[]
): gcp.orgpolicy.Policy {
  return new gcp.orgpolicy.Policy(constraint, {
    parent: pulumi.interpolate`organizations/${organization.orgId}`,
    name: pulumi.interpolate`organizations/${organization.orgId}/policies/${constraint}`,
    spec: { rules },
  });
}

/** Marks the projects where service account keys may be created, as exceptions to the policy. */
const serviceAccountKeys = new gcp.tags.TagKey('service-account-keys', {
  parent: pulumi.interpolate`organizations/${organization.orgId}`,
  shortName: 'service-account-keys',
  description: 'Whether service account keys may be created in a project',
});

const serviceAccountKeysAllowed = new gcp.tags.TagValue('service-account-keys-allowed', {
  parent: serviceAccountKeys.id,
  shortName: 'allowed',
  description: 'Service account keys may be created',
});

// The foundation decides which of the projects it creates are exceptions
new gcp.tags.TagValueIamMember('foundation-provisioner-service-account-keys-allowed', {
  tagValue: serviceAccountKeysAllowed.name,
  role: 'roles/resourcemanager.tagUser',
  member: pulumi.interpolate`serviceAccount:${foundationProvisioner.email}`,
});

const unlessServiceAccountKeysAllowed: gcp.types.input.orgpolicy.PolicySpecRule = {
  condition: {
    title: 'Service account keys allowed',
    expression: pulumi.interpolate`resource.matchTag('${serviceAccountKeys.namespacedName}', 'allowed')`,
  },
  enforce: 'FALSE',
};

// No downloadable service account keys can be created, unless the project is tagged as allowed;
// in both the original constraint and its newer, managed version
organizationPolicy('iam.disableServiceAccountKeyCreation', unlessServiceAccountKeysAllowed, {
  enforce: 'TRUE',
});
organizationPolicy(
  'iam.managed.disableServiceAccountKeyCreation',
  unlessServiceAccountKeysAllowed,
  { enforce: 'TRUE' },
);

// No externally generated keys can be uploaded to service accounts
organizationPolicy('iam.disableServiceAccountKeyUpload', { enforce: 'TRUE' });

// Default service accounts don't get the Editor role automatically
organizationPolicy('iam.automaticIamGrantsForDefaultServiceAccounts', { enforce: 'TRUE' });

// Only principals from the organization's own directory can be granted roles
organizationPolicy('iam.allowedPolicyMemberDomains', {
  values: { allowedValues: [organization.directoryCustomerId] },
});

// Buckets can't use per-object ACLs, only IAM
organizationPolicy('storage.uniformBucketLevelAccess', { enforce: 'TRUE' });

// Buckets and objects can't be made public
organizationPolicy('storage.publicAccessPrevention', { enforce: 'TRUE' });

// New projects don't get the permissive "default" network
organizationPolicy('compute.skipDefaultNetworkCreation', { enforce: 'TRUE' });

// New projects use zonal internal DNS names, which are more resilient than global ones
organizationPolicy('compute.setNewProjectDefaultToZonalDNSOnly', { enforce: 'TRUE' });

// Protocol forwarding can only be used for internal traffic
organizationPolicy('compute.restrictProtocolForwardingCreationForTypes', {
  values: { allowedValues: ['INTERNAL'] },
});

// Essential contacts (security, billing notices) must be the organization's own addresses
organizationPolicy('essentialcontacts.allowedContactDomains', {
  values: { allowedValues: [`@${organizationDomain}`] },
});
