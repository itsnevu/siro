import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Server renderers read the same token file as CSS; no duplicate palette literals. */
export function brandPalette() {
  const css=readFileSync(join(process.cwd(),"src/styles/tokens.css"),"utf8");
  function token(name:string) {
    const value=css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1];
    if(!value)throw new Error(`Missing brand token: ${name}`);
    return value.trim();
  }
  return {bg:token("bg"),surface:token("surface"),fg:token("text"),primary:token("accent-mint"),secondary:token("accent-mint-soft"),fg70:token("text-muted"),subtle:token("text-subtle"),dim:token("text-dim"),cream:token("light-cream"),dark:token("bg")};
}

/** Recolor only the original logo's alpha silhouette; its geometry is untouched. */
export function brandLogoData(mint=false) {
  const palette=brandPalette();
  const source=readFileSync(join(process.cwd(),"src/assets/siro-original.png")).toString("base64");
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512"><defs><filter id="ink" color-interpolation-filters="sRGB"><feFlood flood-color="${mint?palette.primary:palette.fg}"/><feComposite in2="SourceAlpha" operator="in"/></filter></defs><image width="512" height="512" xlink:href="data:image/png;base64,${source}" filter="url(#ink)"/></svg>`;
  return {svg,data:`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`};
}
