import { Heading, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { Button } from "./components/Button";
import { copy } from "@/lib/copy";

interface TeamSuccessEmailProps {
  memberName: string;
  locationName: string;
  teamTitle: string;
  teamUrl: string;
  memberCount: number;
}

export const TeamSuccessEmail: React.FC<TeamSuccessEmailProps> = ({
  memberName,
  locationName,
  teamTitle,
  teamUrl,
  memberCount,
}) => {
  return (
    <EmailLayout preview={`队伍组建成功！ - ${teamTitle}`}>
      <Section style={iconContainer}>
        <Text style={celebrationIcon}>🎉</Text>
      </Section>
      <Heading style={{ ...heading, textAlign: "center" }}>
        {copy.email.teamSuccessTitle}
      </Heading>
      <Text style={{ ...text, textAlign: "center" }}>
        {copy.email.teamSuccessBody.replace('{memberName}', memberName)}
        <br />
        {copy.email.teamSuccessBody2.replace('{teamTitle}', teamTitle)}
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
        <Text style={infoItem}>
          <strong>{copy.email.membersCount}</strong>
          {memberCount} {copy.common.people}
        </Text>
      </Section>
      <Section style={nextStepsBox}>
        <Text style={nextStepsTitle}>
          <strong>{copy.email.nextSteps}</strong>
        </Text>
        <Text style={nextStepsText}>{copy.email.nextStep1}</Text>
        <Text style={nextStepsText}>{copy.email.nextStep2}</Text>
        <Text style={nextStepsText}>{copy.email.nextStep3}</Text>
      </Section>
      <Section style={buttonContainer}>
        <Button href={teamUrl}>{copy.email.enterTeam}</Button>
      </Section>
      <Text style={{ ...footer, textAlign: "center" }}>
        {copy.email.bestWishes}
      </Text>
    </EmailLayout>
  );
};

const iconContainer = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const celebrationIcon = {
  display: "inline-block",
  width: "64px",
  height: "64px",
  backgroundColor: "#8b5cf6",
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

const nextStepsBox = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const nextStepsTitle = {
  color: "#166534",
  fontSize: "14px",
  margin: "0 0 12px",
};

const nextStepsText = {
  color: "#166534",
  fontSize: "14px",
  lineHeight: "1.6",
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

export default TeamSuccessEmail;
