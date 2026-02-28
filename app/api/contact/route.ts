import { NextRequest, NextResponse } from "next/server";
import { sendContactFormEmail } from "@/lib/email/resend";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/**
 * 联系表单 API
 * POST /api/contact
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContactFormData;
    const { name, email, subject, message } = body;

    // 验证必填字段
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "请填写所有必填字段" },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "请输入有效的邮箱地址" },
        { status: 400 }
      );
    }

    // 验证字段长度
    if (name.length > 100) {
      return NextResponse.json(
        { error: "姓名长度不能超过 100 个字符" },
        { status: 400 }
      );
    }

    if (subject.length > 200) {
      return NextResponse.json(
        { error: "主题长度不能超过 200 个字符" },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "建议内容不能超过 5000 个字符" },
        { status: 400 }
      );
    }

    // 发送邮件
    const result = await sendContactFormEmail({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
    });

    if (!result.success) {
      console.error("Failed to send contact email:", result.error);
      return NextResponse.json(
        { error: "发送失败，请稍后重试" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "您的建议已成功提交，我们会尽快查看并回复。",
    });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { error: "服务器错误，请稍后重试" },
      { status: 500 }
    );
  }
}