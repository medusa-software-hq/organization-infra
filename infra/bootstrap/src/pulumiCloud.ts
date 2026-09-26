import * as pulumiservice from "@pulumi/pulumiservice";

// TODO: Remove, once deleted; the foundation's state lives in GCS
new pulumiservice.Stack("foundation", {
  organizationName: "medusa-software",
  projectName: "foundation",
  stackName: "main",
});
