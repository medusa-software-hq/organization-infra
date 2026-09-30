import { referenceRootGithubPool } from '@medusa/infra-common/rootGithubPool';
import * as gcp from '@pulumi/gcp';

/** The GCP organization. */
export const organization = gcp.organizations.getOrganizationOutput({
  domain: 'medusa.software',
});

/** The primary billing account; looking it up would need billing access for previews. */
export const billingAccountId = '015A16-6671FE-EC0231';

/** The default location for regional resources. */
export const primaryLocation = 'europe-central2';

/** The root project's GitHub pool, through which workflows act as service accounts. */
export const rootGithubPool = referenceRootGithubPool();

/** The group of the organization's administrators. */
export const organizationAdminsGroup = 'group:gcp-organization-admins@medusa.software';
