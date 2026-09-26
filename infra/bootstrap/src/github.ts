import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { organizationProvisioner, organizationReader } from "./automation.ts";
import { iamApi, rootProject, stsApi } from "./rootProject.ts";

/** The GitHub organization whose repositories GCP trusts. */
const githubOrganization = {
  name: "medusa-software-hq",
  id: "243778050",
};

/** The GitHub repository of this organization's infrastructure. */
const githubRepository = {
  name: "organization-infra",
  id: "1387288516",
};

/** GitHub's OIDC subject prefix for this repository, whose IDs a re-registered name can't match. */
export const githubRepositorySubject = `repo:${githubOrganization.name}@${githubOrganization.id}/${githubRepository.name}@${githubRepository.id}`;

/** The trust domain for tokens issued by GitHub. */
const githubPool = new gcp.iam.WorkloadIdentityPool(
  "github",
  {
    project: rootProject.projectId,
    workloadIdentityPoolId: "github",
    displayName: "GitHub",
  },
  { dependsOn: [iamApi, stsApi] },
);

/** Accepts OIDC tokens that GitHub Actions issues for the organization's repositories. */
export const githubActionsProvider = new gcp.iam.WorkloadIdentityPoolProvider("github-actions", {
  project: rootProject.projectId,
  workloadIdentityPoolId: githubPool.workloadIdentityPoolId,
  workloadIdentityPoolProviderId: "github-actions",
  displayName: "GitHub Actions",
  oidc: { issuerUri: "https://token.actions.githubusercontent.com" },
  attributeMapping: { "google.subject": "assertion.sub" },
  attributeCondition: `assertion.repository_owner_id == "${githubOrganization.id}"`,
});

/** Lets this repository's pull request workflows act as the organization reader. */
new gcp.serviceaccount.IAMMember("organization-reader-user-github-pull-request", {
  serviceAccountId: organizationReader.name,
  role: "roles/iam.workloadIdentityUser",
  member: pulumi.interpolate`principal://iam.googleapis.com/${githubPool.name}/subject/${githubRepositorySubject}:pull_request`,
});

/** Lets this repository's workflows on the main branch act as the organization provisioner. */
new gcp.serviceaccount.IAMMember("organization-provisioner-user-github-main", {
  serviceAccountId: organizationProvisioner.name,
  role: "roles/iam.workloadIdentityUser",
  member: pulumi.interpolate`principal://iam.googleapis.com/${githubPool.name}/subject/${githubRepositorySubject}:ref:refs/heads/main`,
});
