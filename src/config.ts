import * as Path from "path";

export type Config = {
  expectedErrors: (RegExp | string)[];
};

export async function loadConfig(
  path = `${__dirname}/../defaultConfig.js`
): Promise<Config> {
  // Convert potentially relative path (from user's cwd) to absolute path -- as
  // import() expects relative paths from Bluehawk bin directory
  const absolutePath = Path.resolve(path);
  const module = await import(absolutePath);
  console.log(module);
  const { expectedErrors } = module as {
    expectedErrors?: unknown;
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

  return { expectedErrors };
}
