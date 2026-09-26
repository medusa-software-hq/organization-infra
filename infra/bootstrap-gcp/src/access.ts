import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { organization, organizationAdminsGroup, superAdmin } from "./organization.ts";
import { stateBucket } from "./stateBucket.ts";

/** The service agent of Privileged Access Manager, shared by the whole organization. */
const pamServiceAgent = new gcp.iam.WorkloadIdentityServiceAgent("pam", {
  parent: pulumi.interpolate`organizations/${organization.orgId}/locations/global/serviceProducers/privilegedaccessmanager.googleapis.com`,
});

/** The permission for Privileged Access Manager to create and revoke grants. */
const pamServiceAgentRole = new gcp.organizations.IAMMember(
  "pam-service-agent",
  {
    orgId: organization.orgId,
    role: "roles/privilegedaccessmanager.serviceAgent",
    member: pulumi.interpolate`serviceAccount:service-org-${organization.orgId}@gcp-sa-pam.iam.gserviceaccount.com`,
  },
  { dependsOn: [pamServiceAgent] },
);

/** The condition limiting a role to the state bucket and its objects. */
const stateBucketCondition = pulumi.interpolate`resource.name == "projects/_/buckets/${stateBucket.name}" || resource.name.startsWith("projects/_/buckets/${stateBucket.name}/")`;

/** The access granted by the manual administration entitlement. */
const manualAdministrationAccess = {
  parent: pulumi.interpolate`organizations/${organization.orgId}`,
  location: "global",
  eligibleUsers: [{ principals: [organizationAdminsGroup] }],
  privilegedAccess: {
    gcpIamAccess: {
      resourceType: "cloudresourcemanager.googleapis.com/Organization",
      resource: pulumi.interpolate`//cloudresourcemanager.googleapis.com/organizations/${organization.orgId}`,
      roleBindings: [
        { role: "roles/privilegedaccessmanager.admin" },
        { role: "roles/iam.securityAdmin" },
        { role: "roles/resourcemanager.projectMover" },
        { role: "roles/billing.viewer" },
        { role: "roles/serviceusage.serviceUsageAdmin" },
        { role: "roles/orgpolicy.policyAdmin" },
        { role: "roles/storage.admin", conditionExpression: stateBucketCondition },
      ],
    },
  },
  maxRequestDuration: `${60 * 60}s`,
  requesterJustificationConfig: { unstructured: {} },
};

/** Temporary elevation for administering the organization by hand, including applying this stack. */
new gcp.privilegedaccessmanager.Entitlement(
  "manual-administration",
  {
    ...manualAdministrationAccess,
    entitlementId: "manual-administration",
    // Losing it locks out everyone but admin@
    deletionPolicy: "PREVENT",
  },
  { dependsOn: [pamServiceAgentRole], protect: true },
);

// TODO: Remove, once replaced by the manual administration entitlement
new gcp.privilegedaccessmanager.Entitlement(
  "bootstrap-operator",
  { ...manualAdministrationAccess, entitlementId: "bootstrap-operator", deletionPolicy: "DELETE" },
  { dependsOn: [pamServiceAgentRole] },
);

/** The sole holder of the organization admin role; other holders are removed. */
new gcp.organizations.IAMBinding("organization-admin", {
  orgId: organization.orgId,
  role: "roles/resourcemanager.organizationAdmin",
  members: [superAdmin],
});

new gcp.organizations.IAMMember("organization-admins-viewer", {
  orgId: organization.orgId,
  role: "roles/viewer",
  member: organizationAdminsGroup,
});

new gcp.organizations.IAMMember("organization-admins-browser", {
  orgId: organization.orgId,
  role: "roles/browser",
  member: organizationAdminsGroup,
});
