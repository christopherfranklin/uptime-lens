import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface EmailChangeEmailProps {
  url: string;
}

export default function EmailChangeEmail({ url }: EmailChangeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your new email for Uptime Lens</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container
          style={{ margin: "0 auto", padding: "40px 20px", maxWidth: "560px" }}
        >
          <Section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              padding: "40px",
            }}
          >
            <Text
              style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a" }}
            >
              UL
            </Text>
            <Text style={{ fontSize: "16px", color: "#334155" }}>
              Verify your new email for Uptime Lens
            </Text>
            <Text style={{ fontSize: "14px", color: "#475569" }}>
              Click the button below to confirm your new email address.
            </Text>
            <Button
              href={url}
              style={{
                backgroundColor: "#10b981",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "600",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Verify email
            </Button>
            <Text
              style={{ fontSize: "12px", color: "#94a3b8", marginTop: "24px" }}
            >
              If you didn't request this change, you can safely ignore this
              email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
