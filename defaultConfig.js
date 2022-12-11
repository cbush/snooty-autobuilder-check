module.exports = {
  expectedErrors: [
    /(WARNING|ERROR)\(sdk\/java\/api.*/,
    /ERROR #98124  WEBPACK/,
    /WARNING.*: Directive "container" has been deprecated/,
    /Title (overline|underline) too (short|long)/, // Seriously?!
  ],
};
