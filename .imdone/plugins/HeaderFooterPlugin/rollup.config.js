import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: 'main.js',
  output: {
    file: 'bundle.js',
    format: 'cjs',
    exports: 'default'
  },
  plugins: [commonjs(), nodeResolve()]
};