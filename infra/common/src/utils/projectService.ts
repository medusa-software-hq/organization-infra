import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

/** Enables an API in a project, e.g. `iam.googleapis.com` as `<namePrefix>-iam`. */
export function projectService(
  namePrefix: string,
  project: pulumi.Input<string>,
  service: string,
): gcp.projects.Service {
  return new gcp.projects.Service(`${namePrefix}-${service.split(".")[0]}`, {
    project,
    service,
    // Removing the resource shouldn't break whatever else still uses the API
    disableOnDestroy: false,
  });
}
