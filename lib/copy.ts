/**
 * GoMate 中文文案统一管理
 *
 * 所有用户可见的中文字符串的唯一来源（Single Source of Truth）。
 * 按功能域（feature）组织，最多 2 层嵌套。
 *
 * 使用方式：
 *   import { copy } from "@/lib/copy";
 *   <button>{copy.auth.loginBtn}</button>
 *
 * 规范：
 * - 键命名：camelCase，语义化
 * - 枚举文案统一放在 copy.enums，与数据库枚举值对应
 * - 动态文案（如「共 5 个结果」）在组件内用模板字符串拼接，文案变量只管静态部分
 * - `as const` 确保类型推断精确
 */

export const copy = {
  // ─── 通用 ─────────────────────────────────────────────────────────────────
  common: {
    loading: "加载中...",
    back: "返回",
    backHome: "返回首页",
    backLogin: "返回登录",
    backProfile: "返回个人资料",
    backTeams: "返回队伍列表",
    cancel: "取消",
    submit: "提交",
    save: "保存",
    saving: "保存中...",
    edit: "编辑",
    confirm: "确认",
    create: "创建",
    delete: "删除",
    search: "搜索",
    filter: "筛选",
    clearAll: "清除全部",
    viewAll: "查看全部",
    viewDetail: "查看详情",
    noData: "暂无数据",
    uploadingImg: "上传中...",
    unknown: "未知",
    person: "人",
    searchPlaceholder: "搜索地点、路线或队伍...",
  },

  // ─── 导航栏 ───────────────────────────────────────────────────────────────
  nav: {
    home: "首页",
    locations: "探索地点",
    teams: "找队伍",
    about: "关于我们",
    createTeam: "发布队伍",
    login: "登录",
    register: "注册",
    profile: "个人资料",
    myTeams: "我的队伍",
    logout: "退出登录",
  },

  // ─── 页脚 ─────────────────────────────────────────────────────────────────
  footer: {
    tagline: "极简「地点组队」平台，让每一次户外探索都有志同道合的伙伴同行。",
    product: "产品",
    about: "关于",
    privacy: "隐私政策",
    terms: "服务条款",
    copyright: "GoMate 版权所有",
  },

  // ─── Hero 首屏 ────────────────────────────────────────────────────────────
  hero: {
    badge: "探索自然 · 连接伙伴",
    titleLine1: "find trails",
    titleLine2: "find company",
    description:
      "在山野与海岸间，用脚步丈量世界，与同频的人一起出发。",
    exploreBtn: "探索地点",
    createTeamBtn: "发布队伍",
    loginRegisterBtn: "登录 / 注册",
    statRoutes: "精选路线",
    statPlayers: "活跃玩家",
    statSafety: "安全出行",
  },

  // ─── 认证（登录 / 注册 / 忘记密码 / 重置密码）────────────────────────────
  auth: {
    // 字段标签
    email: "邮箱",
    password: "密码",
    newPassword: "新密码",
    confirmPassword: "确认密码",
    nickname: "昵称",

    // 占位符
    emailPlaceholder: "your@email.com",
    passwordPlaceholder: "请输入密码",
    newPasswordPlaceholder: "请输入新密码（至少6位）",
    confirmPasswordPlaceholder: "请再次输入新密码",
    nicknamePlaceholder: "请输入昵称",
    reenterPassword: "再次输入密码",

    // 登录页
    loginTitle: "欢迎回来",
    loginSubtitle: "登录 GoMate，开始你的户外之旅",
    loginBtn: "登录",
    loginBtnLoading: "登录中...",
    forgotPassword: "忘记密码？",
    noAccount: "还没有账号？",
    loginNow: "立即登录",
    loginFailed: "登录失败",
    loginError: "邮箱或密码错误",
    loginErrorRetry: "登录失败，请稍后重试",

    // 注册页
    registerTitle: "创建账号",
    registerSubtitle: "加入 GoMate，发现更多户外伙伴",
    registerBtn: "注册",
    registerBtnLoading: "注册中...",
    hasAccount: "已有账号？",
    registerNow: "立即注册",
    registerFailed: "注册失败",
    registerSuccess: "注册成功！",
    registerSuccessRedirect: "正在跳转到首页...",
    emailTaken: "该邮箱已被注册",
    registerErrorRetry: "注册失败，请稍后重试",

    // 忘记密码页
    forgotPasswordTitle: "忘记密码",
    forgotPasswordSubtitle: "输入您的邮箱，我们将发送重置密码链接",
    sendResetLink: "发送重置链接",
    sendingResetLink: "发送中...",
    emailSent: "邮件已发送",
    emailSentDesc: "请检查您的邮箱，点击邮件中的链接重置密码",
    noEmailTip: "如果没有收到邮件，请检查垃圾邮件文件夹",
    sendFailed: "发送重置邮件失败",
    rateLimitClearBtn: "清除限制（开发测试用）",
    rateLimitClearing: "清除中...",
    enterEmailFirst: "请先输入邮箱",

    // 重置密码页
    resetPasswordTitle: "重置密码",
    resetPasswordSubtitle: "设置您的新密码",
    resetPasswordBtn: "重置密码",
    resetPasswordBtnLoading: "重置中...",
    resetSuccess: "密码重置成功",
    resetSuccessDesc: "请使用新密码登录",
    goLogin: "去登录",
    invalidResetLink: "无效的重置链接，请重新申请",
    resetFailed: "重置密码失败",

    // 校验错误
    passwordTooShort: "密码长度至少为6位",
    passwordMismatch: "两次输入的密码不一致",
    nicknameTooShort: "昵称至少为2个字符",
    nicknameRange: "2-20个字符",
  },

  // ─── 地点 ─────────────────────────────────────────────────────────────────
  locations: {
    pageTitle: "探索徒步地点",
    pageSubtitle:
      "深圳及周边精选徒步路线，从城市公园到山野海岸，找到适合你的户外目的地",
    locationIntro: "地点介绍",
    defaultCity: "深圳",
    viewDetail: "查看详情",

    // CTA section
    ctaTitle: "没找到心仪的地点？",
    ctaDesc: "联系我们推荐新的徒步路线，或者创建自己的队伍",
    ctaBtn: "联系我们",
  },

  // ─── 队伍 ─────────────────────────────────────────────────────────────────
  teams: {
    // 列表页
    pageTitle: "探索队伍",
    pageSubtitle: "发现志同道合的户外伙伴，一起探索深圳的山野",
    searchPlaceholder: "搜索队伍名称、描述或地点...",
    totalCount: "个队伍", // 「共 N 个队伍」，N 在组件内拼接
    noResults: "没有找到匹配的队伍",
    noResultsTip: "尝试调整筛选条件或搜索关键词",
    clearFilters: "清除筛选",
    otherTeamsAtLocation: "该地点的其他队伍",

    // 创建页
    createTitle: "发布队伍",
    createSubtitle:
      "创建一个新的徒步队伍，邀请志同道合的伙伴一起探索山野",
    createBtn: "发布队伍",
    createBtnLoading: "发布中...",
    createTip:
      "提示：发布队伍后，其他用户可以申请加入。请确保填写的信息准确，并在活动开始前及时与队员沟通集合细节。",

    // 表单字段
    formLabel: {
      name: "队伍标题",
      location: "徒步地点",
      date: "活动日期",
      meetTime: "集合时间",
      duration: "预计时长",
      maxSize: "最大人数",
      description: "队伍描述",
      requirements: "加入要求",
    },
    formPlaceholder: {
      name: "例如：七娘山挑战队 - 周六登顶看海",
      location: "请选择徒步地点",
      duration: "例如：6-8小时",
      maxSize: "例如：6",
      description: "描述一下这次行程的具体安排、难度、风景特色等...",
      requirements: "例如：有徒步经验",
    },

    // 详情页
    detailTitle: "队伍信息",
    notFound: "队伍不存在",
    loadFailed: "获取队伍详情失败",
    safetyTips: "安全提示",
    safetyTip1: "请评估自身体能，量力而行",
    safetyTip2: "建议购买户外保险",
    safetyTip3: "遵守领队安排，不擅自离队",
    safetyTip4: "注意天气变化，做好防护",

    // 状态标签（UI 展示用，枚举值映射请用 copy.enums.teamStatus）
    statusRecruiting: "招募中",
    statusFull: "已满员",
    statusEnded: "已结束",

    // 操作
    joinTeam: "申请加入",
    leaveTeam: "退出队伍",
    viewLocationDetail: "查看地点详情",
    leader: "队长",
  },

  // ─── 个人资料 ─────────────────────────────────────────────────────────────
  profile: {
    title: "个人资料",
    editTitle: "编辑个人资料",
    editSubtitle: "更新你的个人信息和户外经验",
    editProfileBtn: "编辑资料",
    logoutBtn: "退出",
    defaultBio: "新人户外爱好者，期待与你一起探索山野。",

    // 字段
    bio: "个人简介",
    bioPlaceholder: "介绍一下你自己，让更多人了解你...",
    bioHint: "简短介绍你的户外经历和兴趣",
    nicknameLabel: "昵称",
    nicknamePlaceholder: "请输入昵称",
    nicknameHint: "2-20个字符",
    levelLabel: "徒步经验等级",
    levelCurrent: "当前",
    emailLabel: "邮箱",
    emailReadonly: "邮箱暂不支持修改",
    changeAvatar: "点击更换头像",
    avatarHint: "支持 JPEG、PNG、GIF、WebP，最大 5MB",
    avatarSelected: "已选择", // 「已选择：filename」，filename 在组件内拼接
    avatarInvalidType: "请选择有效的图片文件 (JPEG, PNG, GIF, WebP)",
    avatarTooLarge: "图片大小不能超过 5MB",
    avatarUploadFailed: "头像上传失败，请重试",
    saveSuccess: "保存成功！",

    // 统计
    hikesCompleted: "次徒步", // 「已完成 N 次徒步」，N 在组件内拼接
    registeredAt: "注册时间",

    // 我创建的队伍
    createdTeams: "我创建的队伍",
    createdTeamsDesc: "你作为领队创建的队伍",
    recentTeams: "最近创建的队伍",
    joinedTeams: "我加入的队伍",
    noTeamsYet: "还没有队伍",
    noTeamsTip: "创建或加入一个队伍，开始你的户外之旅",
    createTeamBtn: "创建队伍",
  },

  // ─── 我的队伍页 ───────────────────────────────────────────────────────────
  myTeams: {
    pageTitle: "我的队伍",
    createBtn: "创建队伍",
    tabCreated: "我创建的",
    tabCreatedShort: "创建的",
    tabJoined: "我加入的",
    tabJoinedShort: "加入的",
    tabHistory: "历史",
    roleLeader: "队长",

    // 空状态
    emptyCreated: "还没有创建队伍",
    emptyCreatedDesc: "作为队长创建队伍，带领伙伴探索山野",
    emptyCreatedBtn: "创建队伍",
    emptyJoined: "还没有加入队伍",
    emptyJoinedDesc: "浏览地点，加入感兴趣的队伍",
    emptyJoinedBtn: "探索地点",
    emptyHistory: "没有历史记录",
    emptyHistoryDesc: "完成的徒步活动会显示在这里",
    emptyHistoryBtn: "去徒步",
  },

  // ─── 筛选面板 ─────────────────────────────────────────────────────────────
  filter: {
    title: "筛选",
    difficulty: "难度",
    duration: "时长",
    region: "区域",
    clearAll: "清除全部",

    // 时长选项
    durationHalfDay: "半日内",
    durationOneDay: "一日",
    durationMultiDay: "多日",

    // 区域选项
    nanshan: "南山区",
    futian: "福田区",
    luohu: "罗湖区",
    dapeng: "大鹏新区",
    pingshan: "坪山区",
  },

  // ─── 联系我们 ─────────────────────────────────────────────────────────────
  contact: {
    pageTitle: "联系我们",
    pageSubtitle: "与我们取得联系",
    pageDesc:
      "无论是产品建议、商务合作，还是加入我们的团队，都欢迎随时联系。我们期待听到您的声音。",

    emailContact: "邮箱联系",
    wechatContact: "微信咨询",
    wechatScanHint: "扫码添加客服微信",

    formTitle: "发送您的建议",
    formSubtitle: "您的反馈是我们改进产品的动力",

    nameLabel: "您的姓名",
    namePlaceholder: "请输入姓名",
    emailLabel: "联系邮箱",
    subjectLabel: "主题",
    subjectPlaceholder: "请简述您的建议主题",
    messageLabel: "详细建议",
    messagePlaceholder: "请详细描述您的建议或反馈...",
    submitBtn: "提交建议",

    successTitle: "感谢您的反馈！",
    successDesc: "我们已经收到您的建议，会尽快查看并回复。",
    continueSubmitBtn: "继续提交",
  },

  // ─── 邮件模板 ─────────────────────────────────────────────────────────────
  email: {
    // 重置密码邮件
    resetSubject: "重置您的密码",
    resetGreeting: "您好",
    resetBody: "我们收到了您重置密码的请求。点击下方按钮设置新密码：",
    resetBtn: "重置密码",
    resetLinkFallback: "如果按钮无法点击，请复制以下链接到浏览器地址栏：",
    resetSecurity:
      "安全提示：此链接将在 1 小时后失效。如果您没有请求重置密码，请忽略此邮件。",
    resetAutoSent: "此邮件由系统自动发送，请勿回复。",

    // 欢迎邮件
    welcomeSubject: "欢迎加入！",
    welcomeBody: "感谢您注册！我们很高兴您能加入我们的户外社区。",
    welcomeFeature1: "发现深圳周边最佳徒步路线",
    welcomeFeature2: "与志同道合的伙伴组队同行",
    welcomeFeature3: "记录每一次精彩的户外之旅",
    welcomeBtn: "开始探索",

    // 验证邮件
    verificationPreview: "验证您的邮箱地址 - GoMate",
    verificationTitle: "验证您的邮箱",
    verificationBody: "您好 {name}，感谢您注册 GoMate！请点击下方按钮验证您的邮箱地址：",
    verifyEmail: "验证邮箱",
    copyLinkToBrowser: "或者复制以下链接到浏览器：",
    linkExpires: "此链接将在 24 小时后过期。如果您没有注册 GoMate，请忽略此邮件。",

    // 队伍申请邮件
    applicationPreview: "{applicantName} 申请加入您的队伍",
    newApplication: "新的组队申请",
    applicationBody: "您好 {teamOwnerName}，{applicantName} 申请加入您在 {locationName} 的队伍。",
    applicant: "申请人",
    applicationBody2: "申请加入您在 {locationName} 的队伍",
    viewApplication: "查看申请",
    processPrompt: "请及时处理申请，申请人正在等待您的回复。",

    // 申请结果邮件
    applicationApprovedPreview: "您的申请已通过",
    applicationApproved: "申请已通过！",
    applicationApprovedBody: "恭喜 {applicantName}！",
    applicationApprovedBody2: "您已成功加入 {locationName} 的队伍。",
    viewTeam: "查看队伍",
    enjoyTravel: "祝您旅途愉快！",

    applicationRejectedPreview: "您的申请未通过",
    applicationRejected: "申请未通过",
    applicationRejectedBody: "您好 {applicantName}，",
    applicationRejectedBody2: "很抱歉，您申请加入 {locationName} 队伍的请求未被通过。",
    applicationRejectedBody3: "队伍的请求未被通过",
    reason: "原因",
    exploreOtherTeams: "探索其他队伍",
    dontGiveUp: "不要灰心，还有很多其他精彩的队伍等着您！",

    // 队伍成功邮件
    teamSuccessTitle: "队伍组建成功！",
    teamSuccessBody: "恭喜 {memberName}！",
    teamSuccessBody2: "您的队伍 {teamTitle} 已成功组建。",
    team: "队伍",
    location: "地点",
    membersCount: "成员数",
    nextSteps: "下一步",
    nextStep1: "1. 在队伍页面查看所有成员信息",
    nextStep2: "2. 通过内置聊天功能协调行程",
    nextStep3: "3. 准备出发，享受旅程！",
    enterTeam: "进入队伍",
    bestWishes: "祝您旅途愉快，收获美好回忆！",
    checkInbox: "请检查您的邮箱，点击邮件中的链接重置密码",
    checkJunkFolder: "如果没有收到邮件，请检查垃圾邮件文件夹",
    sendResetLink: "发送重置链接",
    teamSuccessPreview: "队伍组建成功！",
  },

  // ─── 错误与提示消息 ───────────────────────────────────────────────────────
  errors: {
    // 认证
    loginRequired: "请先登录",
    sessionExpired: "登录已过期，请重新登录",
    noPermission: "无权限操作",

    // 队伍
    teamNotFound: "队伍不存在",
    teamNotRecruiting: "队伍不在招募中",
    teamFull: "队伍已满员",
    alreadyMember: "您已申请加入或已是成员",
    joinFailed: "申请加入失败",
    leaveFailed: "退出队伍失败",
    teamLoadFailed: "获取队伍列表失败",
    reviewFailed: "审核失败",
    createTeamFailed: "创建队伍失败",
    missingTeamId: "缺少队伍ID",
    teamNotAccepting: "该队伍当前不接受新成员",
    alreadyMemberDirect: "你已经是该队伍的成员",
    alreadyApplied: "你已经提交了申请，请等待审核",
    leaderCannotLeave: "队长无法直接离开队伍，请先转让队长权限或解散队伍",
    onlyLeaderCanReview: "只有队长可以审核成员",
    teamAlreadyFull: "队伍已满，无法批准新成员",
    applicationNotFound: "未找到该成员的申请",

    // 地点
    locationLoadFailed: "加载地点列表失败",

    // 用户
    unknownUser: "未知用户",
    userTeamLoadFailed: "获取用户加入的队伍失败",

    // 忘记密码
    emailEmpty: "邮箱地址不能为空",
    emailInvalid: "邮箱格式不正确",
    dbNotConfigured: "数据库未配置",
    resetEmailSentAnon: "如果该邮箱已注册，我们将发送重置密码链接",
    resetEmailSent: "重置密码链接已发送到您的邮箱",
    resetEmailFailed: "发送重置邮件失败，请稍后重试",

    // 表单校验
    teamTitleTooShort: "标题至少2个字符",
    teamTitleTooLong: "标题最多100个字符",
    teamDescTooLong: "描述最多1000个字符",
    teamReqsTooLong: "要求最多500个字符",
  },

  // ─── 操作成功消息 ─────────────────────────────────────────────────────────
  success: {
    applied: "申请已提交，等待队长审核",
    reapplied: "重新申请已提交",
    left: "已退出队伍",
    approved: "已通过申请",
    rejected: "已拒绝申请",
    added: "已成功加入",
    leftTeam: "已成功离开队伍",
    dissolved: "队伍已解散",
    resetSuccess: "密码重置成功",
    emailSent: "邮件已发送",
    emailSentClear: "速率限制已清除，请重新发送",
  },

  // ─── API 错误消息 ─────────────────────────────────────────────────────────
  api: {
    networkError: "网络错误",
    failed: "操作失败",
    locationNotFound: "地点不存在",
    notAuthorized: "请先登录",
    sessionExpired: "登录已过期，请重新登录",
    sendEmailFailed: "发送邮件失败",
    resetLinkInvalid: "无效的重置链接，请重新申请",
    resetFailed: "重置密码失败",
    userNotFound: "用户不存在",
    userNotFoundWithId: "User not found with ID",
  },

  // ─── 枚举标签（与数据库枚举值一一对应）──────────────────────────────────
  enums: {
    difficulty: {
      easy: "简单",
      moderate: "中等",
      hard: "困难",
      extreme: "极难",
      expert: "极难",
    },
    teamStatus: {
      recruiting: "招募中",
      full: "已满员",
      ongoing: "进行中",
      completed: "已完成",
      cancelled: "已取消",
      open: "招募中",
      closed: "已结束",
    },
    memberStatus: {
      pending: "待审核",
      approved: "已通过",
      rejected: "已拒绝",
    },
    level: {
      beginner: "初级",
      intermediate: "中级",
      advanced: "高级",
      expert: "资深",
    },
    leaderLevel: {
      beginner: "初级领队",
      intermediate: "中级领队",
      advanced: "高级领队",
      expert: "资深领队",
    },
    levelDesc: {
      beginner: "刚开始徒步之旅",
      intermediate: "有一定徒步经验",
      advanced: "经验丰富的徒步者",
      expert: "资深户外专家",
    },
    levelTitle: {
      beginner: "初级徒步者",
      intermediate: "中级徒步者",
      advanced: "高级徒步者",
      expert: "资深徒步者",
    },
  },
} as const;
