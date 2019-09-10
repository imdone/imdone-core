/**
 * Checks if an event is supported in the current execution environment.
 *
 * NOTE This will not work correctly for non-generic events such as `change`,
 * `reset`, `load`, `error`, and `select`.
 * 
 * Borrows from Modernizr.
 * 
 * @param {string} eventNameSuffix Event name, e.g. "click".
 * @return {boolean} True if the event is supported.
 * @internal
 * @license Modernizr 3.0.0pre (Custom Build) | MIT
 */

             // There is no error code for this message. Add an inline comment
            // that flags this as an unminified error. This allows the build
            // to proceed, while also allowing a post-build linter to detect it.
            //
            // Outputs:
            //   /* FIXME (minify-errors-in-prod): Unminified error message in production build! */
            //   if (!condition) {
            //     throw ReactError(Error(`A ${adj} message that contains ${noun}`));
            //   }


      // NOTE We could also support `ClassProperty` and `MethodDefinition`
      // here to be pedantic. However, hooks in a class are an anti-pattern. So
      // we don't allow it to error early.
      // 
      // class {useHook = () => {}}
      // class {useHook() {}}