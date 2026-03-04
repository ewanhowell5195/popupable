import CleanCSS from "clean-css"
import { minify } from "terser"
import fs from "node:fs"

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version

fs.mkdirSync("dist", { recursive: true })

const js = fs.readFileSync("src/popupable.js", "utf8")
const css = fs.readFileSync("src/popupable.css", "utf8")

const banner = `/*!
 * popupable
 * Version  : ${version}
 * License  : MIT
 * Copyright: ${new Date().getFullYear()} Ewan Howell
 */
`

const minifiedJs = (await minify(js, {
  compress: true
})).code

const minifiedCss = new CleanCSS().minify(css).styles

fs.writeFileSync("dist/popupable.min.js", banner + minifiedJs)
fs.writeFileSync("dist/popupable.min.css", banner + minifiedCss)

console.log("Built popupable v" + version)
