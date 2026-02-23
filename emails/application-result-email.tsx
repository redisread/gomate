import { Heading, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { Button } from "./components/Button";
import { copy } from "@/lib/copy";

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
      <EmailLayout preview={copy.email.applicationApprovedPreview}>
        <Section style={iconContainer}>
          <Text style={successIcon}>✓</Text>
        </Section>
        <Heading style={{ ...heading, textAlign: "center" }}>
          {copy.email.applicationApproved}
        </Heading>
        <Text style={{ ...text, textAlign: "center" }}>
          {copy.email.applicationApprovedBody.replace('{applicantName}', applicantName)}
          <br />
          {copy.email.applicationApprovedBody2.replace('{locationName}', locationName)}。
        </Text>
        <Section style={infoBox}>
          <Text style={infoItem}>
            <strong>{copy.email.team}</strong>
            {teamTitle}
          </Text>
          <Text style={infoItem}>
            <strong>{copy.email.location}</strong>
            {locationName}
          </Text>
        </Section>
        <Section style={buttonContainer}>
          <Button href={teamUrl}>{copy.email.viewTeam}</Button>
        </Section>
        <Text style={{ ...footer, textAlign: "center" }}>{copy.email.enjoyTravel}</Text>
      </EmailLayout>
    );
  }

  return (
    <EmailLayout preview={copy.email.applicationRejectedPreview}>
      <Section style={iconContainer}>
        <Text style={rejectIcon}>✕</Text>
      </Section>
      <Heading style={{ ...heading, textAlign: "center" }}>
        {copy.email.applicationRejected}
      </Heading>
      <Text style={{ ...text, textAlign: "center" }}>
        {copy.email.applicationRejectedBody.replace('{applicantName}', applicantName)}
        <br />
        {copy.email.applicationRejectedBody2.replace('{locationName}', locationName)} {copy.email.applicationRejectedBody3}。
      </Text>
      <Section style={infoBox}>
        <Text style={infoItem}>
          <strong>{copy.email.team}</strong>
          {teamTitle}
        </Text>
        <Text style={infoItem}>
          <strong>{copy.email.location}</strong>
          {locationName}
        </Text>
      </Section>
      {rejectionReason && (
        <Section style={rejectionBox}>
          <Text style={rejectionText}>
            <strong>{copy.email.reason}：</strong>
            {rejectionReason}
          </Text>
        </Section>
      )}
      <Section style={buttonContainer}>
        <Button href={exploreUrl}>{copy.email.exploreOtherTeams}</Button>
      </Section>
      <Text style={{ ...footer, textAlign: "center" }}>
        {copy.email.dontGiveUp}
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
