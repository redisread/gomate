import { Heading, Text, Section, Link } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { Button } from "./components/Button";

interface VerificationEmailProps {
  name: string;
  verificationUrl: string;
}

export const VerificationEmail: React.FC<VerificationEmailProps> = ({
  name,
  verificationUrl,
}) => {
  return (
    <EmailLayout preview="验证您的邮箱地址 - GoMate">
      <Heading style={heading}>验证您的邮箱</Heading>
      <Text style={text}>
        您好 {name}，
        <br />
        <br />
        感谢您注册 GoMate！请点击下方按钮验证您的邮箱地址：
      </Text>
      <Section style={buttonContainer}>
        <Button href={verificationUrl}>验证邮箱</Button>
      </Section>
      <Text style={hint}>
        或者复制以下链接到浏览器：
        <br />
        <Link href={verificationUrl} style={link}>
          {verificationUrl}
        </Link>
      </Text>
      <Text style={footer}>
        此链接将在 24 小时后过期。如果您没有注册 GoMate，请忽略此邮件。
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
