import typescript from 'rollup-plugin-typescript';
import commonjs from 'rollup-plugin-commonjs'
import dts from "rollup-plugin-dts";
import { terser } from 'rollup-plugin-terser';

export default [{
  name: 'apipost-mock-schema',
  input: 'src/index.ts',
  output: {
    name: 'apipost-mock-schema',
    file: 'dist/index.js',
    format: 'cjs'
  },
  plugins: [
    typescript(),
    commonjs(),
    terser(),
  ]
},
{
  input: "src/index.ts",
  output: [{ file: "dist/index.d.ts", format: "es" }],
  plugins: [dts()],
}]

