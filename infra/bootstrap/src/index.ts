import * as pulumi from "@pulumi/pulumi";
import { rootProject } from "./rootProject.ts";
import { organizationProvisioner, organizationReader } from "./automation.ts";
import { githubActionsProvider } from "./github.ts";
import { bootstrapStateBucket, foundationStateBucket } from "./stateBuckets.ts";
import "./access.ts";
import "./organizationPolicies.ts";

export const rootProjectId = rootProject.projectId;

export const bootstrapStateBucketUrl = pulumi.interpolate`gs://${bootstrapStateBucket.name}`;

export const foundationStateBucketUrl = pulumi.interpolate`gs://${foundationStateBucket.name}`;

export const githubActionsProviderName = githubActionsProvider.name;

export const organizationReaderEmail = organizationReader.email;

export const organizationProvisionerEmail = organizationProvisioner.email;
