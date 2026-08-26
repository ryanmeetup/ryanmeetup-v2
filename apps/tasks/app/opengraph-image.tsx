import { ImageResponse } from "next/og";
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
            display: "flex",
            fontSize: "22px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#ffffff",
              borderRadius: "12px",
              color: "#09090b",
              display: "flex",
              height: "48px",
              justifyContent: "center",
              marginRight: "18px",
              width: "48px",
            }}
          >
            {instance.monogram}
          </div>
          {instance.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: "92px",
              fontWeight: 800,
              letterSpacing: "-0.055em",
              lineHeight: 1,
            }}
          >
            {instance.ogHeadline}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.68)",
              display: "flex",
              fontSize: "28px",
              marginTop: "24px",
            }}
          >
            {instance.ogTagline}
          </div>
        </div>
        <div
          style={{
            alignItems: "center",
            color: "rgba(255,255,255,0.52)",
            display: "flex",
            fontSize: "20px",
          }}
        >
          <div
            style={{
              background: "#4ade80",
              borderRadius: "999px",
              height: "10px",
              marginRight: "12px",
              width: "10px",
            }}
          />
          {instance.ogMotto}
        </div>
      </div>
    </div>,
    size,
  );
}
