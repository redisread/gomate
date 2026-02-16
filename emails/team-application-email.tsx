import { Heading, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { Button } from "./components/Button";

interface TeamApplicationEmailProps {
  teamOwnerName: string;
  applicantName: string;
  locationName: string;
  teamTitle: string;
  applicationMessage?: string;
  reviewUrl: string;
}

export const TeamApplicationEmail: React.FC<TeamApplicationEmailProps> = ({
  teamOwnerName,
  applicantName,
  locationName,
  teamTitle,
  applicationMessage,
  reviewUrl,
}) => {
  return (
    <EmailLayout preview={`${applicantName} 申请加入您的队伍 - ${teamTitle}`}>
      <Heading style={heading}>新的组队申请</Heading>
      <Text style={text}>
        您好 {teamOwnerName}，
        <br />
        <br />
        <strong>{applicantName}</strong> 申请加入您在{" "}
        <strong>{locationName}</strong> 的队伍。
      </Text>
      <Section style={infoBox}>
        <Text style={infoItem}>
          <strong>队伍：</strong>
          {teamTitle}
        </Text>
        <Text style={infoItem}>
          <strong>地点：</strong>
          {locationName}
        </Text>
        <Text style={infoItem}>
          <strong>申请人：</strong>
          {applicantName}
        </Text>
      </Section>
      {applicationMessage && (
        <Section style={messageBox}>
          <Text style={messageText}>&ldquo;{applicationMessage}&rdquo;</Text>
        </Section>
      )}
      <Section style={buttonContainer}>
        <Button href={reviewUrl}>查看申请</Button>
      </Section>
      <Text style={footer}>请及时处理申请，申请人正在等待您的回复。</Text>
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

const infoBox = {
  backgroundColor: "#f8f8f8",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const infoItem = {
  color: "#111",
  fontSize: "14px",
  margin: "0 0 8px",
};

const messageBox = {
  backgroundColor: "#f0f7ff",
  borderLeft: "4px solid #0066ff",
  padding: "16px",
  margin: "24px 0",
};

const messageText = {
  color: "#555",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0",
  fontStyle: "italic",
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

export default TeamApplicationEmail;
