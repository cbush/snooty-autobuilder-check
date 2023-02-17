import * as Path from "path";

export type Config = {
  expectedErrors: (RegExp | string)[];

  /**
    How long to wait for the build to complete.
   */
  timeoutMs: number;
};

export async function loadConfig(
  path = `${__dirname}/../defaultConfig.js`
): Promise<Config> {
  // Convert potentially relative path (from user's cwd) to absolute path -- as
  // import() expects relative paths from Bluehawk bin directory
  const absolutePath = Path.resolve(path);
  const module = await import(absolutePath);
  console.log(module);
  const { expectedErrors, timeoutMs } = module as {
    expectedErrors?: unknown;
    timeoutMs?: unknown;
  };

  if (expectedErrors === undefined) {
    throw new Error(`${absolutePath} does not export 'expectedErrors'!`);
  }

  if (!Array.isArray(expectedErrors)) {
    throw new Error(`${absolutePath}'s 'expectedErrors' is not an array!`);
  }

  expectedErrors.forEach((entry) => {
    if (typeof entry !== "string" && !(entry instanceof RegExp)) {
      throw new Error(
        `${absolutePath}'s 'expectedErrors' array contains non-string or non-RegExp: ${entry}`
      );
    }
  });

  if (timeoutMs === undefined) {
    throw new Error(`${absolutePath} does not export 'timeoutMs'!`);
  }

  if (!Number.isInteger(timeoutMs)) {
    throw new Error(`${absolutePath}'s 'timeoutMs' is not an integer!`);
  }

  return { expectedErrors, timeoutMs: timeoutMs as number };
}
