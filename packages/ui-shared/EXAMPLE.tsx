import React from "react";
import { PageLayout, theme } from "ui-shared";

/**
 * Example usage of the ui-shared package
 * Demonstrates semantic colors and separation between site/viz colors
 */
export function ExampleApp() {
  return (
    <PageLayout>
      <h1
        style={{
          color: theme.colors.site.content.text,
          marginBottom: theme.spacing.lg,
        }}
      >
        Semantic Color System
      </h1>

      <p
        style={{
          color: theme.colors.site.content.textMuted,
          marginBottom: theme.spacing.md,
        }}
      >
        This demonstrates the organized color system with frame (dark theme) and
        content (light theme) semantic colors.
      </p>

      {/* Frame colors demo */}
      <div
        style={{
          marginTop: theme.spacing.xl,
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.site.frame.background,
          color: theme.colors.site.frame.text,
          borderRadius: "8px",
        }}
      >
        <h2 style={{ marginBottom: theme.spacing.md }}>
          Frame Colors (Dark Theme)
        </h2>
        <p style={{ marginBottom: theme.spacing.sm }}>
          Used for header and margins outside content column
        </p>
        <div
          style={{
            display: "inline-block",
            padding: "0.5rem 1rem",
            backgroundColor: theme.colors.site.frame.accent,
            color: theme.colors.site.content.text,
            borderRadius: "4px",
            fontWeight: 600,
          }}
        >
          Accent Highlight
        </div>
      </div>

      {/* Interactive colors demo */}
      <div
        style={{
          marginTop: theme.spacing.xl,
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.site.goldenrod[100],
          borderRadius: "8px",
          border: `1px solid ${theme.colors.site.content.border}`,
        }}
      >
        <h2
          style={{
            color: theme.colors.site.content.text,
            marginBottom: theme.spacing.md,
          }}
        >
          Interactive Elements
        </h2>
        <div
          style={{ display: "flex", gap: theme.spacing.md, flexWrap: "wrap" }}
        >
          <button
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: theme.colors.site.interactive.primary,
              color: theme.colors.site.interactive.primaryText,
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Primary Button
          </button>
          <a
            href="#"
            style={{
              color: theme.colors.site.interactive.link,
              textDecoration: "underline",
              padding: "0.75rem 0",
            }}
          >
            Hyperlink Example
          </a>
        </div>
      </div>

      {/* Status colors demo */}
      <div
        style={{
          marginTop: theme.spacing.xl,
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.site.content.background,
          borderRadius: "8px",
          border: `1px solid ${theme.colors.site.content.border}`,
        }}
      >
        <h2
          style={{
            color: theme.colors.site.content.text,
            marginBottom: theme.spacing.md,
          }}
        >
          Status Colors
        </h2>
        <div
          style={{ display: "flex", gap: theme.spacing.sm, flexWrap: "wrap" }}
        >
          <div
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: theme.colors.site.status.success,
              color: "white",
              borderRadius: "4px",
            }}
          >
            Success
          </div>
          <div
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: theme.colors.site.status.error,
              color: "white",
              borderRadius: "4px",
            }}
          >
            Error
          </div>
          <div
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: theme.colors.site.status.warning,
              color: theme.colors.site.content.text,
              borderRadius: "4px",
            }}
          >
            Warning
          </div>
          <div
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: theme.colors.site.status.info,
              color: "white",
              borderRadius: "4px",
            }}
          >
            Info
          </div>
        </div>
      </div>

      {/* Viz colors note */}
      <div
        style={{
          marginTop: theme.spacing.xl,
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.site.gray[100],
          borderRadius: "8px",
          border: `2px solid ${theme.colors.site.content.border}`,
        }}
      >
        <h2
          style={{
            color: theme.colors.site.content.text,
            marginBottom: theme.spacing.md,
          }}
        >
          Visualization Colors (theme.colors.viz.*)
        </h2>
        <p
          style={{
            color: theme.colors.site.content.textMuted,
            marginBottom: theme.spacing.sm,
          }}
        >
          Material Design color scales - use ONLY for data viz elements. Each
          hue has 10 shades (50-900) for encoding both category and magnitude.
        </p>

        {/* Show categorical base colors (500 shade) */}
        <div style={{ marginBottom: theme.spacing.md }}>
          <strong style={{ color: theme.colors.site.content.text }}>
            Base colors (500 shade):
          </strong>
          <div
            style={{
              display: "flex",
              gap: theme.spacing.sm,
              marginTop: theme.spacing.sm,
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                backgroundColor: theme.colors.viz.red[500],
                borderRadius: "4px",
              }}
              title="Red"
            />
            <div
              style={{
                width: "60px",
                height: "60px",
                backgroundColor: theme.colors.viz.purple[500],
                borderRadius: "4px",
              }}
              title="Purple"
            />
            <div
              style={{
                width: "60px",
                height: "60px",
                backgroundColor: theme.colors.viz.blue[500],
                borderRadius: "4px",
              }}
              title="Blue"
            />
            <div
              style={{
                width: "60px",
                height: "60px",
                backgroundColor: theme.colors.viz.cyan[500],
                borderRadius: "4px",
              }}
              title="Cyan"
            />
            <div
              style={{
                width: "60px",
                height: "60px",
                backgroundColor: theme.colors.viz.green[500],
                borderRadius: "4px",
              }}
              title="Green"
            />
            <div
              style={{
                width: "60px",
                height: "60px",
                backgroundColor: theme.colors.viz.amber[500],
                borderRadius: "4px",
              }}
              title="Amber"
            />
          </div>
        </div>

        {/* Show scale example for one color */}
        <div>
          <strong style={{ color: theme.colors.site.content.text }}>
            Example: Blue scale (50-900):
          </strong>
          <div
            style={{ display: "flex", gap: "2px", marginTop: theme.spacing.sm }}
          >
            {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
              <div
                key={shade}
                style={{
                  width: "40px",
                  height: "40px",
                  backgroundColor:
                    theme.colors.viz.blue[
                      shade as keyof typeof theme.colors.viz.blue
                    ],
                  borderRadius: "2px",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  fontSize: "10px",
                  color:
                    shade >= 500 ? "white" : theme.colors.site.content.text,
                  padding: "2px",
                }}
              >
                {shade}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
