import { ImageResponse } from "next/og";
import { ogCardDescription, ogCardNameScale } from "@/lib/instance";
import { getInstanceSettings } from "@/lib/server/instance-settings";

// Metadata file exports must be static values, so keep this fallback neutral.
// The image itself still reads the active instance settings below.
export const alt = "Team task workspace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const instance = await getInstanceSettings();
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#09090b",
        color: "#ffffff",
        display: "flex",
        height: "100%",
        padding: "64px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.16), rgba(255,255,255,0) 68%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "999px",
          display: "flex",
          height: "520px",
          position: "absolute",
          right: "-80px",
          top: "-180px",
          width: "520px",
        }}
      />
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: "34px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 52px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#ffffff",
            borderRadius: "12px",
            color: "#09090b",
            display: "flex",
            fontSize: "26px",
            fontWeight: 700,
            height: "56px",
            justifyContent: "center",
            width: "56px",
          }}
        >
          {instance.monogram}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: `${Math.round(92 * ogCardNameScale(instance.name))}px`,
              fontWeight: 800,
              letterSpacing: "-0.055em",
              lineHeight: 1.05,
            }}
          >
            {instance.name}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.68)",
              display: "flex",
              fontSize: "28px",
              lineHeight: 1.4,
              marginTop: "24px",
            }}
          >
            {ogCardDescription(instance.description)}
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
