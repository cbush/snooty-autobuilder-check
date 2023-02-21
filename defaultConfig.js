module.exports = {
  expectedErrors: [
    /(WARNING|ERROR)\(sdk\/java\/api.*/,
    /ERROR #98124  WEBPACK/,
    /WARNING.*: Directive "container" has been deprecated/,
    /WARNING.*: Directive "cssclass" has been deprecated/,
    /Title (overline|underline) too (short|long)/,
  ],
  timeoutMs: 7 * 60 * 1000,
};
