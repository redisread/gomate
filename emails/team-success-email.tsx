import { Heading, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { Button } from "./components/Button";

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
        队伍组建成功！
      </Heading>
      <Text style={{ ...text, textAlign: "center" }}>
        恭喜 {memberName}！
        <br />
        您的队伍 <strong>{teamTitle}</strong> 已成功组建。
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
          <strong>成员数：</strong>
          {memberCount} 人
        </Text>
      </Section>
      <Section style={nextStepsBox}>
        <Text style={nextStepsTitle}>
          <strong>下一步：</strong>
        </Text>
        <Text style={nextStepsText}>1. 在队伍页面查看所有成员信息</Text>
        <Text style={nextStepsText}>2. 通过内置聊天功能协调行程</Text>
        <Text style={nextStepsText}>3. 准备出发，享受旅程！</Text>
      </Section>
      <Section style={buttonContainer}>
        <Button href={teamUrl}>进入队伍</Button>
      </Section>
      <Text style={{ ...footer, textAlign: "center" }}>
        祝您旅途愉快，收获美好回忆！
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
