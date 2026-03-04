import CleanCSS from "clean-css"
import { minify } from "terser"
import fs from "node:fs"

const version = "1.0.2"

fs.mkdirSync("dist", { recursive: true })

const js = fs.readFileSync("src/popupable.js", "utf8")
const css = fs.readFileSync("src/popupable.css", "utf8")

const banner = `/*!
 * popupable
 * Version  : ${version}
 * License  : MIT
 * Copyright: 2025 Ewan Howell
 */
`

const minifiedJs = (await minify(js, {
  compress: true
})).code

const minifiedCss = new CleanCSS().minify(css).styles

fs.writeFileSync("dist/popupable.min.js", banner + minifiedJs)
fs.writeFileSync("dist/popupable.min.css", banner + minifiedCss)

console.log("Built popupable v" + version)
