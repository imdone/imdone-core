# #TODO Fix vulnerabilities and deprecations
<!--
remind:2025-02-26T17:13:04-05:00
#imdone-1.54.4
#bug
created:2025-02-25T17:09:23-05:00
order:-215
-->

Fix 2 per week from this list

## :ballot_box_with_check: Tasks

- [ ] npm WARN EBADENGINE Unsupported engine {
  npm WARN EBADENGINE   package: 'cheerio@1.0.0',
  npm WARN EBADENGINE   required: { node: '>=18.17' },
  npm WARN EBADENGINE   current: { node: 'v18.16.1', npm: '9.5.1' }
  npm WARN EBADENGINE }
- [ ] npm WARN EBADENGINE Unsupported engine {
  npm WARN EBADENGINE   package: 'undici@6.21.1',
  npm WARN EBADENGINE   required: { node: '>=18.17' },
  npm WARN EBADENGINE   current: { node: 'v18.16.1', npm: '9.5.1' }
  npm WARN EBADENGINE }
- [ ] npm WARN deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
- [ ] npm WARN deprecated lodash.pick@3.1.0: This package is deprecated. Use destructuring assignment syntax instead.
- [ ] npm WARN deprecated source-map-url@0.4.1: See https://github.com/lydell/source-map-url#deprecated
- [ ] npm WARN deprecated lodash.get@4.4.2: This package is deprecated. Use the optional chaining (?.) operator instead.
- [ ] npm WARN deprecated lodash.omit@4.5.0: This package is deprecated. Use destructuring assignment syntax instead.
- [ ] npm WARN deprecated urix@0.1.0: Please see https://github.com/lydell/urix#deprecated
- [ ] npm WARN deprecated lodash.isequal@4.5.0: This package is deprecated. Use require('node:util').isDeepStrictEqual instead.
- [ ] npm WARN deprecated lodash.clone@4.5.0: This package is deprecated. Use structuredClone instead.
- [ ] npm WARN deprecated lodash.template@4.5.0: This package is deprecated. Use https://socket.dev/npm/package/eta instead.
- [ ] npm WARN deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
- [ ] npm WARN deprecated resolve-url@0.2.1: https://github.com/lydell/resolve-url#deprecated
- [ ] npm WARN deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
- [ ] npm WARN deprecated source-map-resolve@0.5.3: See https://github.com/lydell/source-map-resolve#deprecated
- [ ] npm WARN deprecated sane@4.1.0: some dependency vulnerabilities fixed, support for node < 10 dropped, and newer ECMAScript syntax/features added

## :white_check_mark: DoD

- [ ] Reproduce the bug
- [ ] Write a failing test that demonstrates the bug
- [ ] Fix the bug
- [ ] Ensure all tests pass
- [ ] Review the code changes
- [ ] Update documentation if necessary


