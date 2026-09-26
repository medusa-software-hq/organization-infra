import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { organization, organizationAdminsGroup, superAdmin } from "./organization.ts";
import { organizationProvisioner, organizationReader } from "./automation.ts";
import {
  bootstrapStateBucketName,
  foundationStateBucket,
  foundationStateBucketName,
} from "./stateBuckets.ts";

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

/** The condition limiting a role to a bucket and its objects. */
function bucketCondition(bucketName: pulumi.Output<string>): pulumi.Output<string> {
  return pulumi.interpolate`resource.name == "projects/_/buckets/${bucketName}" || resource.name.startsWith("projects/_/buckets/${bucketName}/")`;
}

/** Temporary elevation for administering the organization by hand, including applying this stack. */
new gcp.privilegedaccessmanager.Entitlement(
  "manual-administration",
  {
    parent: pulumi.interpolate`organizations/${organization.orgId}`,
    location: "global",
    entitlementId: "manual-administration",
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
          { role: "roles/iam.serviceAccountAdmin" },
          { role: "roles/iam.workloadIdentityPoolAdmin" },
          {
            role: "roles/storage.admin",
            conditionExpression: pulumi.interpolate`${bucketCondition(bootstrapStateBucketName)} || ${bucketCondition(foundationStateBucketName)}`,
          },
        ],
      },
    },
    maxRequestDuration: `${60 * 60}s`,
    requesterJustificationConfig: { unstructured: {} },
    // Losing it locks out everyone but admin@
    deletionPolicy: "PREVENT",
  },
  { dependsOn: [pamServiceAgentRole], protect: true },
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

new gcp.organizations.IAMMember("organization-reader-viewer", {
  orgId: organization.orgId,
  role: "roles/viewer",
  member: pulumi.interpolate`serviceAccount:${organizationReader.email}`,
});

/** Lets the organization reader look up the organization itself, which viewers can't. */
new gcp.organizations.IAMMember("organization-reader-browser", {
  orgId: organization.orgId,
  role: "roles/browser",
  member: pulumi.interpolate`serviceAccount:${organizationReader.email}`,
});

/** Lets the organization reader see organization and folder IAM policies, which viewers can't. */
new gcp.organizations.IAMMember("organization-reader-security-reviewer", {
  orgId: organization.orgId,
  role: "roles/iam.securityReviewer",
  member: pulumi.interpolate`serviceAccount:${organizationReader.email}`,
});

new gcp.organizations.IAMMember("organization-provisioner-viewer", {
  orgId: organization.orgId,
  role: "roles/viewer",
  member: pulumi.interpolate`serviceAccount:${organizationProvisioner.email}`,
});

/** Lets the organization provisioner look up the organization itself, which viewers can't. */
new gcp.organizations.IAMMember("organization-provisioner-browser", {
  orgId: organization.orgId,
  role: "roles/browser",
  member: pulumi.interpolate`serviceAccount:${organizationProvisioner.email}`,
});

/** Lets the organization provisioner see organization and folder IAM policies, which viewers can't. */
new gcp.organizations.IAMMember("organization-provisioner-security-reviewer", {
  orgId: organization.orgId,
  role: "roles/iam.securityReviewer",
  member: pulumi.interpolate`serviceAccount:${organizationProvisioner.email}`,
});

new gcp.storage.BucketIAMMember("organization-reader-foundation-state", {
  bucket: foundationStateBucket.name,
  role: "roles/storage.objectViewer",
  member: pulumi.interpolate`serviceAccount:${organizationReader.email}`,
});

new gcp.storage.BucketIAMMember("organization-provisioner-foundation-state", {
  bucket: foundationStateBucket.name,
  role: "roles/storage.objectAdmin",
  member: pulumi.interpolate`serviceAccount:${organizationProvisioner.email}`,
});
