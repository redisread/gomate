export function TermsClient() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
      {/* Hero 区域 */}
      <div className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700">
        <div className="max-w-3xl mx-auto px-6 py-12">
          {/* 面包屑 */}
          <nav className="text-sm text-stone-400 dark:text-stone-500 mb-6">
            <a href="/" className="hover:text-amber-600 transition-colors">首页</a>
            <span className="mx-2">/</span>
            <span className="text-stone-600 dark:text-stone-400 dark:text-stone-500">服务条款</span>
          </nav>
          <h1 className="text-3xl font-bold text-foreground mb-3">服务条款</h1>
          <p className="text-stone-500 dark:text-stone-400 dark:text-stone-500 mb-2">使用 GoMate 前，请仔细阅读以下条款</p>
          <p className="text-sm text-stone-400 dark:text-stone-500">最后更新：2025年1月1日</p>
        </div>
      </div>

      {/* 正文内容区 */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* 章节1：接受条款 */}
        <section>
          <h2 className="text-lg font-semibold text-amber-700 mb-3 mt-8">1. 接受条款</h2>
          <p className="text-stone-600 dark:text-stone-400 dark:text-stone-500 leading-relaxed">
            通过访问或使用 GoMate 平台，您表示已阅读、理解并同意遵守本服务条款。如您不同意本条款，请停止使用本平台。
          </p>
        </section>

        {/* 章节2：服务描述 */}
        <section>
          <h2 className="text-lg font-semibold text-amber-700 mb-3 mt-8">2. 服务描述</h2>
          <p className="text-stone-600 dark:text-stone-400 dark:text-stone-500 leading-relaxed mb-3">
            GoMate 是一个专注于户外徒步场景的地点组队平台，帮助用户：
          </p>
          <ul className="list-disc list-inside space-y-1 text-stone-600 dark:text-stone-400 dark:text-stone-500">
            <li>发现深圳及周边优质徒步地点</li>
            <li>发布和加入徒步队伍</li>
            <li>与志同道合的户外爱好者建立联系</li>
          </ul>
          <p className="text-stone-600 dark:text-stone-400 dark:text-stone-500 leading-relaxed mt-3">
            我们保留随时修改、暂停或终止服务的权利。
          </p>
        </section>

        {/* 章节3：用户账号 */}
        <section>
          <h2 className="text-lg font-semibold text-amber-700 mb-3 mt-8">3. 用户账号</h2>
          <ul className="list-disc list-inside space-y-1 text-stone-600 dark:text-stone-400 dark:text-stone-500">
            <li>您必须年满 18 周岁方可注册账号</li>
            <li>您有责任保管好账号密码，不得将账号转让给他人</li>
            <li>您需要对账号下的所有活动负责</li>
            <li>如发现账号被盗用，请立即联系我们</li>
          </ul>
        </section>

        {/* 章节4：用户行为准则 */}
        <section>
          <h2 className="text-lg font-semibold text-amber-700 mb-3 mt-8">4. 用户行为准则</h2>
          <p className="text-stone-600 dark:text-stone-400 dark:text-stone-500 leading-relaxed mb-3">使用 GoMate 时，您不得：</p>
          <ul className="list-disc list-inside space-y-1 text-stone-600 dark:text-stone-400 dark:text-stone-500">
            <li>发布虚假、误导性的队伍信息</li>
            <li>骚扰、威胁或伤害其他用户</li>
            <li>发布违法或侵权内容</li>
            <li>使用自动化工具批量操作</li>
            <li>尝试破解或干扰平台正常运行</li>
          </ul>
          <p className="text-stone-600 dark:text-stone-400 dark:text-stone-500 leading-relaxed mt-3">
            违反上述规定，我们有权暂停或永久封禁您的账号。
          </p>
        </section>

        {/* 章节5：内容所有权 */}
        <section>
          <h2 className="text-lg font-semibold text-amber-700 mb-3 mt-8">5. 内容所有权</h2>
          <ul className="list-disc list-inside space-y-1 text-stone-600 dark:text-stone-400 dark:text-stone-500">
            <li>您发布的内容（文字、图片等）归您所有</li>
            <li>通过发布内容，您授予 GoMate 非独家的展示和传播权利</li>
            <li>我们不会将您的内容出售给第三方</li>
          </ul>
        </section>

        {/* 章节6：户外活动免责声明 */}
        <section>
          <h2 className="text-lg font-semibold text-amber-700 mb-3 mt-8">6. 户外活动免责声明</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-stone-600 dark:text-stone-400 dark:text-stone-500 leading-relaxed font-medium mb-3">重要提示：</p>
            <ul className="list-disc list-inside space-y-1 text-stone-600 dark:text-stone-400 dark:text-stone-500">
              <li>徒步等户外活动存在固有风险，GoMate 仅提供组队信息平台</li>
              <li>参与活动的风险由参与者自行承担</li>
              <li>我们强烈建议您在参与活动前评估自身体能，准备充足装备</li>
              <li>GoMate 不对因参与活动导致的人身伤害或财产损失承担责任</li>
            </ul>
          </div>
        </section>

        {/* 章节7：服务变更与终止 */}
        <section>
          <h2 className="text-lg font-semibold text-amber-700 mb-3 mt-8">7. 服务变更与终止</h2>
          <ul className="list-disc list-inside space-y-1 text-stone-600 dark:text-stone-400 dark:text-stone-500">
            <li>我们可能随时更新本服务条款，更新后将在平台公告</li>
            <li>继续使用平台即表示您接受新条款</li>
            <li>我们保留因违规行为终止用户账号的权利</li>
          </ul>
        </section>

        {/* 章节8：联系我们 */}
        <section>
          <h2 className="text-lg font-semibold text-amber-700 mb-3 mt-8">8. 联系我们</h2>
          <p className="text-stone-600 dark:text-stone-400 dark:text-stone-500 leading-relaxed">
            如对本服务条款有任何疑问，请联系：
          </p>
          <p className="text-stone-600 dark:text-stone-400 dark:text-stone-500 mt-2">
            邮箱：<a href="mailto:hello@gomate.live" className="text-amber-600 hover:underline">hello@gomate.live</a>
          </p>
        </section>
      </div>
    </div>
  );
}
