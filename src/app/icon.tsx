/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { brandLogoData, brandPalette } from "@/lib/brand-palette";

export const size={width:64,height:64};
export const contentType="image/png";
export default function Icon() {
  const palette=brandPalette();
  return new ImageResponse(<div style={{display:"flex",width:"100%",height:"100%",alignItems:"center",justifyContent:"center",background:palette.primary,borderRadius:14}}><img alt="" src={brandLogoData().data} width={48} height={48}/></div>,size);
}
