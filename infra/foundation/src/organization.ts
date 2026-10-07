import { referenceRootGithubPool } from '@medusa/infra-common/rootGithubPool';
import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

/** The GCP organization. */
export const organization = gcp.organizations.getOrganizationOutput({
  domain: 'medusa.software',
});

/** The primary billing account; looking it up would need billing access for previews. */
export const billingAccountId = '015A16-6671FE-EC0231';

/** The default location for regional resources. */
export const primaryLocation = 'europe-central2';

/** The group of the organization's administrators. */
export const organizationAdminsGroup = 'group:gcp-organization-admins@medusa.software';

/** The root project's GitHub pool, through which workflows act as service accounts. */
export const rootGithubPool = referenceRootGithubPool();

/** Marks a project where service account keys may be created, as bootstrap allows. */
export const serviceAccountKeysAllowed = gcp.tags.getTagValueOutput({
  parent: gcp.tags.getTagKeyOutput({
    parent: pulumi.interpolate`organizations/${organization.orgId}`,
    shortName: 'service-account-keys',
  }).id,
  shortName: 'allowed',
});
