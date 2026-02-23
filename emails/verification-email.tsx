import { Heading, Text, Section, Link } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { Button } from "./components/Button";
import { copy } from "@/lib/copy";

interface VerificationEmailProps {
  name: string;
  verificationUrl: string;
}

export const VerificationEmail: React.FC<VerificationEmailProps> = ({
  name,
  verificationUrl,
}) => {
  return (
    <EmailLayout preview={copy.email.verificationPreview}>
      <Heading style={heading}>{copy.email.verificationTitle}</Heading>
      <Text style={text}>
        {copy.email.verificationBody.replace('{name}', name)}
      </Text>
      <Section style={buttonContainer}>
        <Button href={verificationUrl}>{copy.email.verifyEmail}</Button>
      </Section>
      <Text style={hint}>
        {copy.email.copyLinkToBrowser}
        <br />
        <Link href={verificationUrl} style={link}>
          {verificationUrl}
        </Link>
      </Text>
      <Text style={footer}>
        {copy.email.linkExpires}
      </Text>
    </EmailLayout>
  );
};

const heading = {
  color: "#111",
  fontSize: "20px",
  fontWeight: "600",
  margin: "0 0 16px",
};

const text = {
  color: "#555",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const hint = {
  color: "#888",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0",
};

const link = {
  color: "#555",
  wordBreak: "break-all" as const,
};

const footer = {
  color: "#888",
  fontSize: "12px",
  marginTop: "32px",
  paddingTop: "24px",
  borderTop: "1px solid #eee",
};

export default VerificationEmail;
