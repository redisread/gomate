/**
 * 隐私政策页面组件
 */

const sections = [
  {
    title: "1. 信息收集",
    content: "我们收集以下类型的信息：",
    items: [
      "账号信息：注册时提供的邮箱地址、用户名、密码（加密存储）",
      "个人资料：您主动填写的昵称、个人简介、徒步等级",
      "使用数据：您创建的队伍、参与的活动、收藏的地点等",
    ],
  },
  {
    title: "2. 信息使用",
    content: "我们使用收集的信息用于：",
    items: [
      "提供和改善 GoMate 平台服务",
      "发送账号相关通知（如密码重置邮件）",
      "分析平台使用情况以优化用户体验",
      "保障平台安全，防止欺诈行为",
    ],
  },
  {
    title: "3. 信息保护",
    content: "我们采取以下措施保护您的信息：",
    items: [
      "所有数据传输使用 HTTPS 加密",
      "密码经过 bcrypt 加密存储，我们无法查看您的明文密码",
      "定期进行安全审计",
      "严格限制员工对用户数据的访问权限",
    ],
  },
  {
    title: "4. Cookie 使用",
    content: "我们使用 Cookie 和类似技术来：",
    items: [
      "保持您的登录状态",
      "记住您的偏好设置",
      "分析网站流量（使用匿名数据）",
    ],
    footer:
      "您可以通过浏览器设置禁用 Cookie，但这可能影响部分功能的正常使用。",
  },
  {
    title: "5. 第三方服务",
    content: "我们使用以下第三方服务：",
    items: [
      "Cloudflare：提供 CDN 和安全防护",
      "Resend：用于发送系统邮件",
    ],
    footer:
      "这些服务提供商有各自的隐私政策，我们建议您了解相关内容。",
  },
  {
    title: "6. 您的权利",
    content: "您拥有以下权利：",
    items: [
      "查看：您可以在个人中心查看我们持有的您的信息",
      "修改：您可以随时编辑您的个人资料",
      "删除：您可以联系我们删除您的账号和相关数据",
      "导出：如需导出您的数据，请联系我们",
    ],
  },
  {
    title: "7. 联系我们",
    content: "如对本隐私政策有任何疑问，请联系：",
    items: ["邮箱：hello@gomate.live"],
  },
];

export function PrivacyClient() {
  return (
    <div className="bg-stone-50 min-h-screen">
      {/* Hero 区域 */}
      <div className="bg-stone-50 border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* 面包屑 */}
          <nav className="text-sm text-stone-400 mb-4">
            <a href="/" className="hover:text-amber-600 transition-colors">
              首页
            </a>
            <span className="mx-2">/</span>
            <span className="text-stone-600">隐私政策</span>
          </nav>

          <h1 className="text-3xl font-bold text-stone-800 mb-2">隐私政策</h1>
          <p className="text-stone-500 mb-1">
            我们重视您的隐私，本政策说明我们如何收集和使用您的信息
          </p>
          <p className="text-sm text-stone-400">最后更新：2025年1月1日</p>
        </div>
      </div>

      {/* 正文内容区 */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-semibold text-amber-700 mb-3 mt-8">
              {section.title}
            </h2>
            <p className="text-stone-600 leading-relaxed mb-2">
              {section.content}
            </p>
            <ul className="list-disc list-inside space-y-1 text-stone-600">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {section.footer && (
              <p className="text-stone-600 leading-relaxed mt-2">
                {section.footer}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
