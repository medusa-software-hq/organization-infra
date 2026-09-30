import * as pulumi from "@pulumi/pulumi";
import { rootProject } from "./rootProject.ts";
import { githubActionsProvider } from "./github.ts";
import { bootstrapStateBucket } from "./bootstrap.ts";
import { foundationProvisioner, foundationReader, foundationStateBucket } from "./foundation.ts";
import "./access.ts";
import "./organizationPolicies.ts";

export const rootProjectId = rootProject.projectId;

export const bootstrapStateBucketUrl = pulumi.interpolate`gs://${bootstrapStateBucket.name}`;

export const foundationStateBucketUrl = pulumi.interpolate`gs://${foundationStateBucket.name}`;

export const githubActionsProviderName = githubActionsProvider.name;

export const foundationReaderEmail = foundationReader.email;

export const foundationProvisionerEmail = foundationProvisioner.email;
