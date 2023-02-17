import yargs from "yargs";
import { strict as assert } from "assert";
import {
  AnonymousCredential,
  RemoteMongoClient,
  Stitch,
  Stream,
} from "mongodb-stitch-server-sdk";
import { loadConfig } from "./config";

const STITCH_APP_ID = "workerpool-boxgs";

const stitchClient = Stitch.initializeDefaultAppClient(STITCH_APP_ID);

type Build = {
  endTime: Date;
  status: "inQueue" | "inProgress" | "completed" | "failed";
  logs: string[];
  error?: {
    time: string;
    reason: string;
  };
};

async function nextInStream<T>(
  stream: Stream<T>,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Stream watcher timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    stream.onNext((event) => {
      clearTimeout(timeout);
      stream.close();
      resolve(event);
    });
  });
}

type MainArgs = {
  actorOwnerRepoBranch: string;
  configPath?: string;
};

async function main({
  actorOwnerRepoBranch,
  configPath,
}: MainArgs): Promise<void> {
  try {
    const { expectedErrors, timeoutMs } = await loadConfig(configPath);

    const errors = await evaluateBuild({
      actorOwnerRepoBranch,
      timeoutMs,
    });

    if (errors.length === 0) {
      console.log("Build completed without errors.");
      process.exit(0);
    }
    const unexpectedErrors = errors.filter((error) => {
      for (const expectedError of expectedErrors) {
        const re =
          typeof expectedError === "string"
            ? new RegExp(expectedError)
            : expectedError;
        if (re.test(error)) {
          return false;
        }
      }
      return true;
    });
    if (unexpectedErrors.length === 0) {
      console.log("Passed with expected errors.");
      process.exit(0);
    }
    console.error("Encountered the following unexpected errors:");
    console.error(unexpectedErrors.join("\n"));
    process.exit(1);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

async function evaluateBuild({
  actorOwnerRepoBranch,
  timeoutMs,
}: {
  actorOwnerRepoBranch: string;
  timeoutMs: number;
}): Promise<string[]> {
  const [actor, owner, repo, branch] = actorOwnerRepoBranch.split("/");
  if (!actor || !owner || !repo || !branch) {
    return [
      `Expected CLI argument in form 'actor/owner/repo/branch', got '${actorOwnerRepoBranch}`,
    ];
  }

  await stitchClient.auth.loginWithCredential(new AnonymousCredential());
  const remoteMongoClient = stitchClient.getServiceClient(
    RemoteMongoClient.factory,
    "mongodb-atlas"
  );
  const db = remoteMongoClient.db("pool");
  const collection = db.collection<Build>("queue");
  const filter = {
    $or: [{ "payload.repoOwner": actor }, { "payload.repoOwner": owner }],
    "payload.repoName": repo,
    "payload.branchName": branch,
    endTime: {
      $ne: null,
    },
  };

  const watchFilter = {
    $or: [
      { "fullDocument.payload.repoOwner": actor },
      { "fullDocument.payload.repoOwner": owner },
    ],
    "fullDocument.payload.repoName": repo,
    "fullDocument.payload.branchName": branch,
  };

  // First check if a build is ongoing
  const ongoingBuildStream = await collection.watch({
    ...watchFilter,
    "fullDocument.endTime": {
      $eq: null,
    },
  });

  let build: Build | null;
  try {
    console.log("Checking for ongoing build...");
    build =
      (await nextInStream(ongoingBuildStream, timeoutMs)).fullDocument ?? null;

    console.log("Ongoing build found.");
    const stream = await collection.watch({
      ...watchFilter,
      "fullDocument.endTime": {
        $ne: null,
      },
    });

    console.log("Waiting for build to complete...");
    build = (await nextInStream(stream, timeoutMs)).fullDocument ?? null;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    console.warn(`Update never received: ${message}`);
    console.log("No ongoing build found. Falling back to findOne.");
    build = await collection.findOne(filter, {
      sort: {
        endTime: -1,
      },
    });
  }

  if (!build) {
    return [
      `Nothing found for filter: ${JSON.stringify(
        filter
      )}, build=${JSON.stringify(build)}

This might happen if the autobuilder is not set up on your fork.
`,
    ];
  }

  if (build.status === "failed") {
    const { time, reason } = build.error!;
    return [
      `Build failed at ${time}

${reason}`,
    ];
  }

  if (build?.logs === undefined) {
    return [`build.logs undefined! build=${JSON.stringify(build)}`];
  }

  if (build?.logs.length === 0) {
    return [`build.logs.length === 0! build=${JSON.stringify(build)}`];
  }

  const log = build?.logs.join("\n") as string;

  if (log === undefined) {
    return [`log undefined?! build=${JSON.stringify(build)}`];
  }

  console.log("Build completed at", build.endTime);
  const re = /^(?:WARNING|ERROR).*$/;
  const errors: string[] = [];
  log.split("\n").forEach((line) => {
    const match = re.exec(line);
    if (match !== null) {
      errors.push(match[0]);
    }
  });

  return errors;
}

yargs
  .command(
    "$0 <actorOwnerRepoBranch>",
    "Checks snooty autobuilder build status for a commit.",
    (yargs) => {
      return yargs

        .positional("actorOwnerRepoBranch", {
          describe: "actor/owner/repo/branch to check build",
          type: "string",
        })
        .option("config", {
          string: true,
          description:
            "Path to configuration JavaScript file. See defaultConfig.js for an example.",
        });
    },
    ({ actorOwnerRepoBranch, config }) => {
      assert(actorOwnerRepoBranch !== undefined); // Protected by yargs at runtime, but not typed properly
      return main({
        actorOwnerRepoBranch,
        configPath: config,
      });
    }
  )
  .help()
  .parse();
