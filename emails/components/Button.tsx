import { Button as EmailButton } from "@react-email/components";
import * as React from "react";

interface ButtonProps {
  href: string;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ href, children }) => {
  return (
    <EmailButton href={href} style={button}>
      {children}
    </EmailButton>
  );
};

const button = {
  display: "inline-block",
  backgroundColor: "#000",
  color: "#fff",
  textDecoration: "none",
  padding: "14px 32px",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "500",
  textAlign: "center" as const,
};

export default Button;
