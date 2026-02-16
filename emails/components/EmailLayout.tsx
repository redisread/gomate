import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
  children: React.ReactNode;
  preview?: string;
}

export const EmailLayout: React.FC<EmailLayoutProps> = ({
  children,
  preview,
}) => {
  return (
    <Html lang="zh-CN">
      <Head />
      {preview && <Preview>{preview}</Preview>}
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>GoMate</Text>
          </Section>
          <Section style={content}>{children}</Section>
          <Section style={footer}>
            <Text style={footerText}>
              此邮件由 GoMate 自动发送，请勿回复。
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} GoMate. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0",
  maxWidth: "600px",
};

const header = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const logo = {
  color: "#111",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0",
};

const content = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "32px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const footer = {
  marginTop: "24px",
  textAlign: "center" as const,
};

const footerText = {
  color: "#888",
  fontSize: "12px",
  margin: "4px 0",
};

export default EmailLayout;
