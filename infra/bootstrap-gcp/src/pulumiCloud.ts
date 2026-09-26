import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { organizationProvisioner } from "./organizationProvisioner.ts";
import { iamApi, rootProject, stsApi } from "./rootProject.ts";

/** The Pulumi Cloud organization. */
const pulumiOrganization = "medusa-software";

/** The trust domain for tokens issued by Pulumi Cloud. */
const pulumiCloudPool = new gcp.iam.WorkloadIdentityPool(
  "pulumi-cloud",
  {
    project: rootProject.projectId,
    workloadIdentityPoolId: "pulumi-cloud",
    displayName: "Pulumi Cloud",
  },
  { dependsOn: [iamApi, stsApi] },
);

/** Accepts OIDC tokens that Pulumi ESC issues for this Pulumi organization. */
new gcp.iam.WorkloadIdentityPoolProvider("pulumi-esc", {
  project: rootProject.projectId,
  workloadIdentityPoolId: pulumiCloudPool.workloadIdentityPoolId,
  workloadIdentityPoolProviderId: "pulumi-esc",
  displayName: "Pulumi ESC",
  oidc: {
    issuerUri: "https://api.pulumi.com/oidc",
    allowedAudiences: [`gcp:${pulumiOrganization}`],
  },
  attributeMapping: { "google.subject": "assertion.sub" },
});

/** The OIDC subject of Pulumi ESC tokens for an environment opened directly. */
function environmentSubject(environment: string): string {
  return `pulumi:environments:org:${pulumiOrganization}:env:${environment}`;
}

/** Lets the foundation's preview environment act as the organization provisioner. */
new gcp.serviceaccount.IAMMember("organization-provisioner-user-foundation-preview", {
  serviceAccountId: organizationProvisioner.name,
  role: "roles/iam.workloadIdentityUser",
  member: pulumi.interpolate`principal://iam.googleapis.com/${pulumiCloudPool.name}/subject/${environmentSubject("foundation/preview")}`,
});

/** Lets the foundation's apply environment act as the organization provisioner. */
new gcp.serviceaccount.IAMMember("organization-provisioner-user-foundation-apply", {
  serviceAccountId: organizationProvisioner.name,
  role: "roles/iam.workloadIdentityUser",
  member: pulumi.interpolate`principal://iam.googleapis.com/${pulumiCloudPool.name}/subject/${environmentSubject("foundation/apply")}`,
});
