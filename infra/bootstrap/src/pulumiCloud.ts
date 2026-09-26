import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import * as pulumiservice from "@pulumi/pulumiservice";
import { organizationProvisioner, organizationReader } from "./automation.ts";
import { iamApi, rootProject, stsApi } from "./rootProject.ts";
import { yamlAsset } from "./utils/pulumi.ts";

/** The Pulumi Cloud organization. */
const pulumiOrganization = "medusa-software";

/** The Pulumi Cloud user whom automation acts as. */
const pulumiUser = "medusa-software";

/** GitHub's OIDC subject prefix for this repository, whose IDs a re-registered name can't match. */
const githubRepositorySubject = "repo:medusa-software-hq@243778050/organization-infra@1387288516";

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
const pulumiEscProvider = new gcp.iam.WorkloadIdentityPoolProvider("pulumi-esc", {
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

/** Lets the foundation's preview environment act as the organization reader. */
new gcp.serviceaccount.IAMMember("organization-reader-user-foundation-preview", {
  serviceAccountId: organizationReader.name,
  role: "roles/iam.workloadIdentityUser",
  member: pulumi.interpolate`principal://iam.googleapis.com/${pulumiCloudPool.name}/subject/${environmentSubject("foundation/preview")}`,
});

/** Lets the foundation's apply environment act as the organization provisioner. */
new gcp.serviceaccount.IAMMember("organization-provisioner-user-foundation-apply", {
  serviceAccountId: organizationProvisioner.name,
  role: "roles/iam.workloadIdentityUser",
  member: pulumi.interpolate`principal://iam.googleapis.com/${pulumiCloudPool.name}/subject/${environmentSubject("foundation/apply")}`,
});

/** The definition of an ESC environment that logs in to GCP as a service account. */
function gcpLoginEnvironment(
  serviceAccount: gcp.serviceaccount.Account,
): pulumi.Output<pulumi.asset.StringAsset> {
  return yamlAsset({
    values: {
      gcp: {
        login: {
          "fn::open::gcp-login": {
            project: rootProject.number.apply(Number),
            oidc: {
              workloadPoolId: pulumiCloudPool.workloadIdentityPoolId,
              providerId: pulumiEscProvider.workloadIdentityPoolProviderId,
              serviceAccount: serviceAccount.email,
            },
          },
        },
      },
      environmentVariables: {
        GOOGLE_OAUTH_ACCESS_TOKEN: "${gcp.login.accessToken}",
        CLOUDSDK_AUTH_ACCESS_TOKEN: "${gcp.login.accessToken}",
      },
    },
  });
}

/** GCP credentials for previewing the foundation. */
new pulumiservice.Environment("foundation-preview", {
  organization: pulumiOrganization,
  project: "foundation",
  name: "preview",
  yaml: gcpLoginEnvironment(organizationReader),
});

/** GCP credentials for applying the foundation. */
new pulumiservice.Environment("foundation-apply", {
  organization: pulumiOrganization,
  project: "foundation",
  name: "apply",
  yaml: gcpLoginEnvironment(organizationProvisioner),
});

/** Lets this repository's workflows log in to Pulumi Cloud without a stored token. */
new pulumiservice.OidcIssuer("github-actions", {
  organization: pulumiOrganization,
  name: "github-actions",
  url: "https://token.actions.githubusercontent.com",
  maxExpirationSeconds: 60 * 60,
  // The Free edition only issues personal tokens
  policies: [
    {
      decision: "allow",
      tokenType: "personal",
      userLogin: pulumiUser,
      rules: {
        aud: `urn:pulumi:org:${pulumiOrganization}`,
        sub: `${githubRepositorySubject}:ref:refs/heads/main`,
      },
    },
    {
      decision: "allow",
      tokenType: "personal",
      userLogin: pulumiUser,
      rules: {
        aud: `urn:pulumi:org:${pulumiOrganization}`,
        sub: `${githubRepositorySubject}:pull_request`,
      },
    },
  ],
});
