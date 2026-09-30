import { ImageResponse } from "next/og";
export const alt = "StyleSeed spacing regression: inherited 64px gap restored to the child's 12px project token. Synthetic CSS example.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", background: "#FAFDFD", color: "#090C0B", padding: "64px", fontFamily: "sans-serif" }}>
    <div style={{ display: "flex", color: "#00736B", fontSize: 24 }}>STYLESEED / UI SPACING</div>
    <div style={{ display: "flex", fontSize: 48, maxWidth: 1000, fontWeight: 700 }}>Why is my AI-generated UI spacing wrong?</div>
    <div style={{ display: "flex", alignItems: "baseline", fontSize: 110, fontWeight: 700 }}><span>64px</span><span style={{ color: "#4D5150", margin: "0 40px", fontSize: 64 }}>→</span><span style={{ color: "#00736B" }}>12px</span></div>
    <div style={{ display: "flex", fontSize: 24, color: "#4D5150" }}>Synthetic CSS regression · same content · project token preserved</div>
  </div>, size);
}
