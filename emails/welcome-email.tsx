import { Heading, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { Button } from "./components/Button";
import { copy } from "@/lib/copy";

interface WelcomeEmailProps {
  name: string;
  exploreUrl: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  name,
  exploreUrl,
}) => {
  return (
    <EmailLayout preview={copy.email.welcomePreview}>
      <Heading style={heading}>{copy.email.welcomeTitle}</Heading>
      <Text style={text}>
        {copy.email.welcomeBody.replace('{name}', name)}
      </Text>
      <Section style={featureBox}>
        <Text style={featureTitle}>{copy.email.features}</Text>
        <ul style={featureList}>
          <li style={featureItem}>{copy.email.feature1}</li>
          <li style={featureItem}>{copy.email.feature2}</li>
          <li style={featureItem}>{copy.email.feature3}</li>
          <li style={featureItem}>{copy.email.feature4}</li>
        </ul>
      </Section>
      <Section style={buttonContainer}>
        <Button href={exploreUrl}>{copy.email.startExploring}</Button>
      </Section>
      <Text style={footer}>
        {copy.email.supportContact}
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

const featureBox = {
  backgroundColor: "#f8f8f8",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const featureTitle = {
  color: "#111",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 12px",
};

const featureList = {
  color: "#555",
  fontSize: "14px",
  lineHeight: "1.8",
  margin: "0",
  paddingLeft: "20px",
};

const featureItem = {
  margin: "4px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const footer = {
  color: "#888",
  fontSize: "12px",
  marginTop: "32px",
  paddingTop: "24px",
  borderTop: "1px solid #eee",
};

export default WelcomeEmail;
