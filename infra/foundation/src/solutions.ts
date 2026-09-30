import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { organization } from "./organization.ts";

/** The folder grouping the organization's solutions. */
export const solutionsFolder = new gcp.organizations.Folder(
  "solutions",
  {
    displayName: "Solutions",
    parent: pulumi.interpolate`organizations/${organization.orgId}`,
  },
  { protect: true },
);
