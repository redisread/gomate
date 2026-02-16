import { Heading, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { Button } from "./components/Button";

interface ApplicationResultEmailProps {
  applicantName: string;
  locationName: string;
  teamTitle: string;
  isApproved: boolean;
  teamUrl: string;
  rejectionReason?: string;
  exploreUrl: string;
}

export const ApplicationResultEmail: React.FC<ApplicationResultEmailProps> = ({
  applicantName,
  locationName,
  teamTitle,
  isApproved,
  teamUrl,
  rejectionReason,
  exploreUrl,
}) => {
  if (isApproved) {
    return (
      <EmailLayout preview={`您的申请已通过 - ${teamTitle}`}>
        <Section style={iconContainer}>
          <Text style={successIcon}>✓</Text>
        </Section>
        <Heading style={{ ...heading, textAlign: "center" }}>
          申请已通过！
        </Heading>
        <Text style={{ ...text, textAlign: "center" }}>
          恭喜 {applicantName}！
          <br />
          您已成功加入 <strong>{locationName}</strong> 的队伍。
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
        </Section>
        <Section style={buttonContainer}>
          <Button href={teamUrl}>查看队伍</Button>
        </Section>
        <Text style={{ ...footer, textAlign: "center" }}>祝您旅途愉快！</Text>
      </EmailLayout>
    );
  }

  return (
    <EmailLayout preview={`您的申请未通过 - ${teamTitle}`}>
      <Section style={iconContainer}>
        <Text style={rejectIcon}>✕</Text>
      </Section>
      <Heading style={{ ...heading, textAlign: "center" }}>
        申请未通过
      </Heading>
      <Text style={{ ...text, textAlign: "center" }}>
        您好 {applicantName}，
        <br />
        很抱歉，您申请加入 <strong>{locationName}</strong> 队伍的请求未被通过。
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
      </Section>
      {rejectionReason && (
        <Section style={rejectionBox}>
          <Text style={rejectionText}>
            <strong>原因：</strong>
            {rejectionReason}
          </Text>
        </Section>
      )}
      <Section style={buttonContainer}>
        <Button href={exploreUrl}>探索其他队伍</Button>
      </Section>
      <Text style={{ ...footer, textAlign: "center" }}>
        不要灰心，还有很多其他精彩的队伍等着您！
      </Text>
    </EmailLayout>
  );
};

const iconContainer = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const successIcon = {
  display: "inline-block",
  width: "64px",
  height: "64px",
  backgroundColor: "#22c55e",
  borderRadius: "50%",
  lineHeight: "64px",
  color: "#fff",
  fontSize: "32px",
  margin: "0",
};

const rejectIcon = {
  display: "inline-block",
  width: "64px",
  height: "64px",
  backgroundColor: "#ef4444",
  borderRadius: "50%",
  lineHeight: "64px",
  color: "#fff",
  fontSize: "32px",
  margin: "0",
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

const rejectionBox = {
  backgroundColor: "#fef2f2",
  borderLeft: "4px solid #ef4444",
  padding: "16px",
  margin: "24px 0",
};

const rejectionText = {
  color: "#555",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0",
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

export default ApplicationResultEmail;
