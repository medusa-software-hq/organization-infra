import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

/** The GitHub organization whose repositories the pool trusts. */
const githubOrganization = {
  name: "medusa-software-hq",
  id: "243778050",
};

/** A GitHub repository, identified by its immutable ID as well as its name. */
export interface GithubRepository {
  readonly name: string;
  readonly id: string;
}

/** The number of the root project, where the pool lives. */
const rootProjectNumber = "626887270411";

const poolId = "github";

const providerId = "github-actions";

/** The pool's full name, as declared in the root project. */
const rootGithubPoolName = `projects/${rootProjectNumber}/locations/global/workloadIdentityPools/${poolId}`;

/** GitHub's OIDC subject prefix for a repository's runs, whose IDs a re-registered name can't match. */
function repositorySubject(repository: GithubRepository): string {
  return `repo:${githubOrganization.name}@${githubOrganization.id}/${repository.name}@${repository.id}`;
}

/** The root project's GitHub pool, as seen by a stack using it. */
class RootGithubPool {
  readonly poolName: pulumi.Input<string>;
  readonly providerName: pulumi.Input<string>;

  constructor(poolName: pulumi.Input<string>, providerName: pulumi.Input<string>) {
    this.poolName = poolName;
    this.providerName = providerName;
  }

  /** Lets the repository's pull request runs act as the service account. */
  allowRunsOnPullRequests(
    name: string,
    serviceAccount: gcp.serviceaccount.Account,
    repository: GithubRepository,
  ): gcp.serviceaccount.IAMMember {
    return this.allow(name, serviceAccount, `${repositorySubject(repository)}:pull_request`);
  }

  /** Lets the repository's runs on the branch act as the service account. */
  allowRunsOnBranch(
    name: string,
    serviceAccount: gcp.serviceaccount.Account,
    repository: GithubRepository,
    branch: string,
  ): gcp.serviceaccount.IAMMember {
    return this.allow(
      name,
      serviceAccount,
      `${repositorySubject(repository)}:ref:refs/heads/${branch}`,
    );
  }

  /**
   * Lets the repository's runs in a GitHub environment act as the service account.
   * Which branches may use the environment is up to its settings in GitHub.
   */
  allowRunsInEnvironment(
    name: string,
    serviceAccount: gcp.serviceaccount.Account,
    repository: GithubRepository,
    environment: string,
  ): gcp.serviceaccount.IAMMember {
    return this.allow(
      name,
      serviceAccount,
      `${repositorySubject(repository)}:environment:${environment}`,
    );
  }

  private allow(
    name: string,
    serviceAccount: gcp.serviceaccount.Account,
    subject: string,
  ): gcp.serviceaccount.IAMMember {
    return new gcp.serviceaccount.IAMMember(name, {
      serviceAccountId: serviceAccount.name,
      role: "roles/iam.workloadIdentityUser",
      member: pulumi.interpolate`principal://iam.googleapis.com/${this.poolName}/subject/${subject}`,
    });
  }
}

export type { RootGithubPool };

/** Declares the root project's pool, trusting GitHub Actions in the organization's repositories. */
export function declareRootGithubPool(
  project: pulumi.Input<string>,
  opts?: pulumi.CustomResourceOptions,
): RootGithubPool {
  const pool = new gcp.iam.WorkloadIdentityPool(
    "github",
    {
      project,
      workloadIdentityPoolId: poolId,
      displayName: "GitHub",
    },
    opts,
  );

  const provider = new gcp.iam.WorkloadIdentityPoolProvider("github-actions", {
    project,
    workloadIdentityPoolId: pool.workloadIdentityPoolId,
    workloadIdentityPoolProviderId: providerId,
    displayName: "GitHub Actions",
    oidc: { issuerUri: "https://token.actions.githubusercontent.com" },
    // The subject is what principals match, so it must stay in sync with `repositorySubject()`
    attributeMapping: { "google.subject": "assertion.sub" },
    attributeCondition: `assertion.repository_owner_id == "${githubOrganization.id}"`,
  });

  // Other stacks reference the pool by this constant, which must not go stale
  const poolName = pool.name.apply((name) => {
    if (name !== rootGithubPoolName) {
      throw new Error(
        `The GitHub pool is ${name}, but rootGithubPoolName is ${rootGithubPoolName}`,
      );
    }

    return name;
  });

  return new RootGithubPool(poolName, provider.name);
}

/** References the root project's pool, declared by the bootstrap stack. */
export function referenceRootGithubPool(): RootGithubPool {
  return new RootGithubPool(rootGithubPoolName, `${rootGithubPoolName}/providers/${providerId}`);
}
