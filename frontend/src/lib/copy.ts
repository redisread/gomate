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
    current: "当前",
    searchPlaceholder: "搜索地点、活动或队伍...",
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
    myFavorites: "我的收藏",
    logout: "退出登录",
    admin: "管理后台",
    explore: "开始探索",
  },

  // ─── 页脚 ─────────────────────────────────────────────────────────────────
  footer: {
    tagline: "找到同行的人。",
    product: "产品",
    productLocations: "探索地点",
    productTeams: "找队伍",
    productGuides: "路线攻略",
    productSafety: "安全保障",
    company: "公司",
    companyAbout: "关于我们",
    companyCareers: "加入团队",
    companyContact: "联系我们",
    companyPartners: "合作伙伴",
    support: "支持",
    supportHelp: "帮助中心",
    supportSafety: "安全指南",
    supportGuidelines: "社区规范",
    supportPrivacy: "隐私政策",
    about: "关于",
    privacy: "隐私政策",
    terms: "服务条款",
    copyright: "GoMate 版权所有",
  },

  // ─── Hero 首屏 ────────────────────────────────────────────────────────────
  hero: {
    badge: "探索城市 · 连接伙伴",
    titleLine1: "发现趣处",
    titleLine2: "组队同行",
    description:
      "极简「地点组队」平台，找到同行的人，出发就不远。",
    exploreBtn: "探索地点",
    findTeamBtn: "找队伍",
    createTeamBtn: "发布队伍",
    loginRegisterBtn: "登录 / 注册",
    statRoutes: "精选地点",
    statRoutesDesc: "吃饭、喝咖啡、旅行，都有好去处",
    statPlayers: "结构化组队",
    statPlayersDesc: "组队从未如此简单",
    statSafety: "极简体验",
    statSafetyDesc: "找到人，出发就不远",
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
    loginSubtitle: "登录 GoMate，找到志同道合的伙伴",
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
    registerSubtitle: "加入 GoMate，发现更多有趣的伙伴",
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
    pageTitle: "探索地点",
    pageSubtitle:
      "咖啡馆、公园、山野、海岸，找到适合你的下一个目的地",
    locationIntro: "地点介绍",
    defaultCity: "全部",
    viewDetail: "查看详情",

    // 路线信息卡片
    routeInfo: "路线信息",
    routeTags: "路线标签",
    facilities: "配套设施",
    estimatedTime: "预计用时",
    routeLength: "路线长度",
    totalElevation: "累计爬升",
    bestSeason: "最佳季节",
    facilityParking: "停车场",
    facilityRestroom: "洗手间",
    facilityWater: "补给点",
    facilityFood: "餐饮",

    // CTA section
    ctaTitle: "没找到心仪的地点？",
    ctaDesc: "联系我们推荐新的地点，或者创建自己的队伍",
    ctaBtn: "联系我们",

    // 路线指南
    routeGuideOverview: "路线概览",
    waypoints: "途经点",
    tips: "温馨提示",
    safetyNotice: "安全须知",

    // 图片导航
    prevImage: "上一张图片",
    nextImage: "下一张图片",

    // 坐标提示
    coordinatesHint: "通过地址搜索自动获取坐标",

    // 城市筛选
    allCities: "全部城市",
    cityFilter: "按城市筛选",

    // 视觉升级文案
    heroTagline: "咖啡馆、citywalk、短途旅行……找个人一起去",
    searchPlaceholder: "咖啡馆、展览、桌游吧、山野……你想去哪？",
    tagsLabel: "探索标签",
    resultCount: "个地方等你探索",
    clearFilter: "清除筛选",
    emptyTitle: "暂时没有找到相关地点",
    emptyDesc: "试试放宽条件，也许有更多意想不到的好地方等着你",
    emptyBtn: "重新探索",
    ctaHeroBadge: "咖啡 · 探店 · 户外 · 更多",

    // 角色快速入口
    roleCafe: "咖啡探店",
    roleCafeDesc: "精品咖啡馆 · 下午茶打卡",
    roleCitywalk: "City Walk",
    roleCitywalkDesc: "街头漫游 · 市集展览",
    roleOutdoor: "户外出行",
    roleOutdoorDesc: "短途旅行 · 山野徒步",
    roleNight: "夜间活动",
    roleNightDesc: "桌游 · 夜市 · 酒吧",

    // 难度快筛
    difficultyFilter: "难度",
    allDifficulty: "全部难度",

    // 地点详情页
    detailWaiting: "有人在等你同行",
    detailNoTeamsDesc: "还没有队伍出发，要不要你来召集第一批伙伴？",
    detailNoTeamsBtn: "我来召集伙伴",
    detailParticipate: "我要去这里",
    detailCreateTeam: "召集伙伴出发",
    detailBrowseTeams: "看看有没有合适的队伍",
    detailSeasonsLabel: "最适合去的时节",
    detailShareBtn: "分享给好友",
    difficultyLabel: "难度",
    teamsWaitingDesc: "支队伍正在等待伙伴", // 「N 支队伍正在等待伙伴」，N 在组件内拼接
    relatedTitle: "其他推荐地点",

    // 导航
    navigateTooltip: "在高德地图中导航",
    navigateBtn: "导航",

    // 打卡点（POI）
    poiSection: "打卡点",
    poiEmpty: "暂无打卡点信息",
    poiLoading: "加载打卡点中...",
    poiRoleTypes: {
      waypoint: "途经点",
      checkpoint: "打卡点",
      viewpoint: "观景点",
      facility: "设施",
      poi: "兴趣点",
    },
  },

  // ─── 队伍 ─────────────────────────────────────────────────────────────────
  teams: {
    // 列表页
    pageTitle: "找到你的同行伙伴",
    pageSubtitle: "不孤单，总有人和你去同一个地方",
    pageBadge: "等你一起",
    searchPlaceholder: "咖啡馆？公园？山野？或者输入任意关键词",
    totalCount: "支队伍向你敞开，随时可以出发", // 「N 支队伍向你敞开，随时可以出发」，N 在组件内拼接
    noResults: "还没有人发起这类活动，要不要你来开头？",
    noResultsTip: "改变筛选条件，或者干脆自己发起一支",
    clearFilters: "清除筛选",
    otherTeamsAtLocation: "该地点的其他队伍",

    // 队伍列表组件
    openTeamsTitle: "正在等你的队伍",
    openTeamsSubtitle: "有 {count} 支队伍正在等待伙伴", // 动态数值
    fullTeamsTitle: "已满员",
    leaderLabel: "领队:",
    leaderTripCountSuffix: "次带队", // 「N 次带队」
    personCountSuffix: "人", // 「N 人」
    emptyOpenTeamsTitle: "这条路还没人走，要不要你来开头？",
    emptyOpenTeamsDesc: "改变筛选条件，或者干脆自己发起一支",
    teamCountSuffix: "支队伍", // 「N 支队伍」
    openTeamCountSuffix: "支队伍在等你", // 「N 支队伍在等你」

    // 队伍头部组件
    backToLocation: "返回地点",
    shareLabel: "分享",
    departureSuffix: "出发", // 「{time} 出发」
    estimatedPrefix: "预计", // 「预计{duration}」

    // 领队卡片组件
    leaderInfoTitle: "领队信息",
    copyWechatHint: "复制微信号，添加领队为好友",
    contactLeader: "联系领队",

    // 路线相关
    freeRouteTitle: "路线灵活，边走边定",
    freeRouteDesc: "这支队伍的路线还没确定，大家可以在组建后一起商量最合适的走法",

    // 成员与领队章节标题
    membersSectionTitle: "一起出发的伙伴",
    leaderSectionTitle: "这次的领队",

    // 成员列表组件
    teamMembersTitle: "队伍成员",
    requestingLeaveBadge: "申请退出",
    approveLeaveDesc: "确定批准 {name} 的退出申请？批准后该成员将退出队伍。",
    rejectLeaveDesc: "确定拒绝 {name} 的退出申请？拒绝后该成员将继续留在队伍中。",
    removeMemberDesc: "{name} 将被移出队伍，移除后该成员需要重新申请才能加入。",

    // 创建页
    createTitle: "发布队伍",
    createSubtitle:
      "创建一个新的队伍，邀请志同道合的伙伴一起出发",
    createBtn: "发布队伍",
    createBtnLoading: "发布中...",
    createTip:
      "提示：发布队伍后，其他用户可以申请加入。请确保填写的信息准确，并在活动开始前及时与队员沟通集合细节。",

    // 创建页验证和提示
    routeRequired: "请选择一条路线，或取消勾选\"关联具体路线\"",
    wechatRequiredTitle: "请填写微信号",
    wechatRequiredDesc: "创建队伍前需要在个人资料中填写微信号，以便队友联系您。",
    loading: "加载中...",
    noRouteAvailable: "该地点暂无可用路线，请取消勾选\"关联具体路线\"或联系管理员添加路线信息。",
    dateImmutableTip: "提示：活动日期创建后不可修改，但集合时间可在编辑时调整",

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
      name: "例如：周六下午茶探店 · 五道口打卡",
      location: "请选择目的地",
      duration: "请输入预计小时数，如 6",
      maxSize: "例如：6",
      description: "描述一下这次行程的具体安排、难度、风景特色等...",
      requirements: "例如：有徒步经验",
    },

    // 详情页
    introTitle: "队伍介绍",
    progressLabel: "进度",
    dateLabel: "日期",
    meetTimeLabel: "集合",
    membersCountLabel: "人数",
    detailTitle: "队伍信息",
    notFound: "队伍不存在",
    loadFailed: "获取队伍详情失败",
    safetyTips: "出行提示",
    safetyTip1: "提前确认集合地点和时间，准时出现是对伙伴的尊重",
    safetyTip2: "有任何临时变动请提前告知队长，保持沟通畅通",
    safetyTip3: "尊重他人，保持友好，共同维护良好的队伍氛围",
    safetyTip4: "如有户外活动，关注天气并做好相应准备",

    // 申请审核
    reviewTitle: "待审核申请",
    reviewEmpty: "暂无待审核申请",
    reviewEmptyDesc: "有新成员申请加入时会显示在这里",
    approveLeaveFailed: "批准退出申请失败",
    rejectLeaveFailed: "拒绝退出申请失败",
    approveBtn: "批准",
    rejectBtn: "拒绝",
    approving: "批准中...",
    rejecting: "拒绝中...",
    approveConfirm: "确定批准该成员加入队伍？",
    rejectConfirm: "确定拒绝该成员的申请？",
    applicationCount: "个待审核申请",
    appliedAt: "申请时间",
    noBio: "暂无简介",

    // 状态标签（UI 展示用，枚举值映射请用 copy.enums.teamStatus）
    statusRecruiting: "招募中",
    statusFull: "已满员",
    statusEnded: "已结束",
    statusFormed: "已组建",
    statusCancelled: "已取消",
    statusExpiredNotFormed: "活动已过期，队伍未组建成功",

    // 成员状态描述
    memberJoinedDesc: "他们正在等待和你一起出发",

    // 操作
    joinTeam: "申请加入",
    viewLocationDetail: "查看地点详情",
    leader: "队长",

    // 报名人数状态
    registrationStatus: "已有 {current} 位伙伴，还差 {remaining} 人就出发",
    spotsRemaining: "还差 {remaining} 个伙伴",
    spotsRemainingOne: "就差你一个了",
    teamFull: "满员，准备出发",
    spotsDesc: "还差 {remaining} 位伙伴就可以出发",
    spotsOneLeft: "就差你一个，出发！",

    // 组建队伍
    formTeam: "组建队伍",
    formTeamUnderfilled: "不满人数组建",
    formTeamConfirm: "确定组建队伍？",
    formTeamUnderfilledConfirm: "当前人数未满，确定以不满人数组建队伍？",
    formTeamWarning: "组建后队员退出需要队长审批",
    formTeamSuccess: "队伍组建成功",
    formTeamFailed: "组建失败",

    // 申请退出
    requestLeave: "申请退出",
    requestLeaveConfirm: "确定申请退出队伍？队长审批后才能退出",
    requestLeaveSuccess: "退出申请已提交",
    requestLeaveFailed: "申请退出失败",
    leavePending: "退出审批中",
    leaveRequestTitle: "退出申请",
    approveLeave: "批准退出",
    rejectLeaveRequest: "拒绝申请",
    cannotLeaveDirectly: "队伍已组建，需向队长申请退出",

    pendingDesc: "申请已发出，队长确认后会通知你",

    // 申请状态
    statusPending: "申请审核中",
    statusApproved: "已加入队伍",
    statusRejected: "申请被拒绝",
    reapply: "重新申请",

    // 取消申请
    cancelApplication: "取消申请",
    cancelApplicationConfirm: "确定要取消申请吗？",
    cancelApplicationDesc: "取消后可以重新申请加入该队伍",
    cancelApplicationSuccess: "申请已取消",
    cancelApplicationFailed: "取消申请失败",

    // 退出队伍
    leaveTeam: "退出队伍",
    leaveTeamConfirm: "确定要退出队伍吗？",
    leaveTeamWarning: "退出后需要重新申请才能加入",
    leaveTeamSuccess: "已退出队伍",
    leaveTeamFailed: "退出队伍失败",

    // 申请留言占位符
    joinPlaceholder: "和队长打个招呼，介绍一下自己...",
    joinPlaceholderDesktop: "向队长介绍一下自己（可选）",

    // 队长相关
    youAreLeader: "你是队长",
    youAreLeaderDesc: "你发起了这支队伍，带领大家出发吧",
    manageTeam: "管理队伍",
    wechatRequiredBtn: "请先填写微信号",
    fillWechatBtn: "去填写",

    // 移除成员
    removeMember: "移除",
    removeMemberConfirm: "确定要将该成员移出队伍吗？",
    removeMemberSuccess: "已将该成员移出队伍",
    removeMemberFailed: "移除成员失败",
    cannotRemoveSelf: "不能移除自己",
    cannotRemoveLeader: "不能移除队长",

    // 领队联系方式
    contactAfterJoin: "加入队伍后可查看领队联系方式",
    viewContact: "查看联系方式",

    // 编辑队伍
    editTitle: "编辑队伍",
    editSubtitle: "更新队伍信息",
    editBtn: "编辑队伍",
    editBtnLoading: "保存中...",
    editSuccess: "队伍信息已更新",
    editFailed: "更新队伍失败",
    notLeader: "只有队长可以编辑队伍信息",

    // CTA 区域
    ctaTitle: "找不到合适的，那就自己组一支",
    ctaDesc: "发布你的计划，让和你一样有趣的人找到你",
    ctaBtn: "我来发布队伍",

    // 删除队伍
    deleteTeam: "删除队伍",
    deleteTeamConfirm: "确定要删除该队伍吗？删除后队伍将标记为已取消，无法恢复。",
    deleteTeamSuccess: "队伍已删除",
    deleteTeamFailed: "删除队伍失败",
    onlyLeaderCanDelete: "只有队长可以删除队伍",

    // 取消队伍
    cancelTeam: "取消队伍",
    cancelTeamConfirm: "确定要取消该队伍吗？取消后无法恢复，已申请的成员将无法加入。",
    cancelTeamSuccess: "队伍已取消",
    cancelTeamFailed: "取消队伍失败",
  },

  // ─── 个人资料 ─────────────────────────────────────────────────────────────
  profile: {
    title: "个人资料",
    editTitle: "编辑个人资料",
    editSubtitle: "更新你的个人信息和兴趣偏好",
    editProfileBtn: "编辑资料",
    logoutBtn: "退出",
    defaultBio: "热爱探索，期待与你一起发现有趣的地方。",
    backProfile: "返回个人资料",

    // 字段
    usernameLabel: "用户名",
    usernamePlaceholder: "请输入用户名",
    usernameHint: "用于认证和系统标识",
    nicknameLabel: "昵称",
    nicknamePlaceholder: "请输入昵称（为空则显示用户名）",
    nicknameHint: "用于展示的昵称，可以随时修改",
    bio: "个人简介",
    bioPlaceholder: "介绍一下你自己，让更多人了解你...",
    bioHint: "简短介绍你的兴趣爱好和玩法偏好",
    levelLabel: "活跃等级",
    levelCurrent: "当前",
    emailLabel: "邮箱",
    emailReadonly: "邮箱暂不支持修改",
    wechat: "微信号",
    wechatPlaceholder: "请输入微信号",
    wechatHint: "方便队友联系你（加入队伍时需要填写）",
    genderLabel: "性别",
    genderHint: "可选填写，用于更好的匹配队友",
    birthdayLabel: "生日",
    birthdayHint: "可选填写，用于计算年龄段",
    changeAvatar: "点击更换头像",
    avatarHint: "支持 JPEG、PNG、GIF、WebP，最大 5MB",
    avatarSelected: "已选择", // 「已选择：filename」，filename 在组件内拼接
    avatarInvalidType: "请选择有效的图片文件 (JPEG, PNG, GIF, WebP)",
    avatarTooLarge: "图片大小不能超过 5MB",
    avatarUploadFailed: "头像上传失败，请重试",
    saveSuccess: "保存成功！",
    experiencePlaceholder: "例如：喜欢探店、爬山、城市骑行，周末常出没",
    experienceHint: "简单描述你的兴趣和活动偏好",

    // 统计
    hikesCompleted: "次活动", // 「已完成 N 次活动」，N 在组件内拼接
    ageSuffix: "岁", // 年龄后缀，如「25岁」
    registeredAt: "注册时间",

    // 我创建的队伍
    createdTeams: "我创建的队伍",
    createdTeamsDesc: "你作为领队创建的队伍",
    recentTeams: "最近创建的队伍",
    joinedTeams: "我加入的队伍",
    joinedTeamsDesc: "你作为成员参与的队伍",
    recentJoinedTeams: "最近加入的队伍",
    noTeamsYet: "还没有队伍",
    noTeamsTip: "创建或加入一个队伍，开始你的探索之旅",
    createTeamBtn: "创建队伍",

    // 其他
    levelTitleSuffix: "探索者",
    member: "成员",
    equipment: "常用装备",
    experience: "活动经历",

    // 重构新增文案
    loadingHint: "正在加载你的足迹...",
    bannerAlt: "个人主页封面",
    statsTitle: "我的足迹",
    noTeamsTitle: "还没有参与过活动",
    noTeamsDesc: "创建或加入一支队伍，开始记录属于你的精彩故事",
    memberCount: "人",
    createdTeamsSectionTitle: "我发起的队伍",
    joinedTeamsSectionTitle: "我加入的队伍",
    viewMyTeams: "查看全部",
    statSublabelTeams: "支队伍",

    // 等级标题（LEVEL_CONFIG.title）
    levelTitle: {
      beginner: "新手探索者",
      intermediate: "进阶探索者",
      advanced: "资深玩家",
      expert: "专家级探险家",
    },

    // 编辑页新增
    editWarmSubtitle: "完善你的信息，让伙伴更了解你",
    sectionAvatar: "我的头像",
    sectionBasicInfo: "基本信息",
    sectionOutdoorInfo: "活动偏好",
    sectionContact: "联系方式",
    sectionAccount: "账号信息",
    avatarSupportHint: "点击更换头像 · 支持 JPG、PNG、WebP，最大 5MB",
    avatarCancelFile: "取消选择",
    wechatFieldHint: "填写微信号，队友可以联系你",
    experienceLabel: "活动经历",
    savedSuccess: "已保存",
    bioCountWarning: "字数即将达到上限",
  },

  // ─── 我的队伍页 ───────────────────────────────────────────────────────────
  myTeams: {
    pageTitle: "我的队伍",
    createBtn: "创建队伍",
    tabCreated: "我创建的",
    tabCreatedShort: "创建的",
    tabJoined: "我加入的",
    tabJoinedShort: "加入的",
    tabApplications: "申请记录",
    tabApplicationsShort: "申请",
    tabPending: "待审批",
    tabPendingShort: "审批",
    tabHistory: "历史",
    roleLeader: "队长",
    backBtn: "返回",

    // 状态标签
    statusRecruiting: "招募中",
    statusFull: "已满员",
    statusFormed: "已组建",
    statusCompleted: "已完成",
    statusCancelled: "已取消",

    // 申请状态
    appStatusPending: "待审核",
    appStatusApproved: "已通过",
    appStatusRejected: "已拒绝",

    // 要求标签
    requirementsMore: "+{count}",

    // 等级标签
    levelBeginner: "新手",
    levelIntermediate: "进阶",
    levelAdvanced: "资深",
    levelExpert: "专家",

    // 时间格式化
    minutesAgo: "分钟前",
    hoursAgo: "小时前",
    daysAgo: "天前",
    minutesAgoTemplate: "{count}分钟前",
    hoursAgoTemplate: "{count}小时前",
    daysAgoTemplate: "{count}天前",

    // 待审批相关
    pendingReview: "待审核",
    applyToJoin: "申请加入",
    applyTime: "申请时间",
    noBio: "暂无简介",
    teamLeader: "队长",

    // 分组标题
    activeTeams: "活跃队伍",
    noActiveTeams: "暂无活跃队伍，去创建一个新的队伍吧！",
    archivedTeams: "已归档",
    completedCount: "已完成",
    cancelledCount: "已取消",

    // 申请人详情弹窗
    applicantDetailTitle: "申请人详情",
    applicantDetailDesc: "查看申请人的详细信息和申请详情",
    personalBio: "个人简介",
    applyTeamTitle: "申请加入的队伍",
    teamName: "队伍名称",
    rejectBtn: "拒绝",
    approveBtn: "通过",
    rejectConfirmTitle: "确认拒绝申请？",
    rejectConfirmDesc: "拒绝后，该申请人将不能加入此队伍。此操作不可撤销。",
    cancelBtn: "取消",
    confirmRejectBtn: "确认拒绝",

    // 空状态
    emptyCreated: "还没有创建队伍",
    emptyCreatedDesc: "作为队长创建队伍，带领伙伴一起出发",
    emptyCreatedBtn: "创建队伍",
    emptyJoined: "还没有加入队伍",
    emptyJoinedDesc: "浏览地点，加入感兴趣的队伍",
    emptyJoinedBtn: "探索地点",
    emptyApplications: "没有申请记录",
    emptyApplicationsDesc: "浏览队伍，申请加入感兴趣的队伍",
    emptyApplicationsBtn: "探索队伍",
    emptyPending: "没有待审批申请",
    emptyPendingDesc: "作为队长，有人申请加入你的队伍时会显示在这里",
    emptyPendingBtn: "查看队伍",
    emptyHistory: "没有历史记录",
    emptyHistoryDesc: "完成的活动会显示在这里",
    emptyHistoryBtn: "去探索",
  },

  // ─── 收藏 ─────────────────────────────────────────────────────────────────
  favorites: {
    pageTitle: "我的收藏",
    pageSubtitle: "你收藏的地点",
    addSuccess: "已收藏",
    removeSuccess: "已取消收藏",
    addFailed: "收藏失败，请重试",
    removeFailed: "取消收藏失败，请重试",
    loginRequired: "登录后才能收藏",
    emptyTitle: "还没有收藏",
    emptyDesc: "探索地点，收藏你感兴趣的地方",
    emptyBtn: "探索地点",
    locationCount: "个地点",
    backBtn: "返回",
  },

  // ─── 筛选面板 ─────────────────────────────────────────────────────────────
  filter: {
    title: "筛选",
    difficulty: "难度",
    duration: "时长",
    region: "区域",
    city: "城市",
    clearAll: "清除全部",
    reset: "重置",
    viewResults: "查看结果",

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
      "无论是产品建议、商务合作，都欢迎随时联系。我们期待听到您的声音。",

    emailContact: "邮箱联系",
    wechatContact: "微信咨询",
    wechatScanHint: "扫码添加客服微信",

    formTitle: "发送您的建议",
    formSubtitle: "您的反馈是我们改进产品的动力",

    nameLabel: "您的姓名",
    namePlaceholder: "请输入姓名",
    emailLabel: "联系邮箱",
    emailPlaceholder: "your@email.com",
    subjectLabel: "主题",
    subjectPlaceholder: "请简述您的建议主题",
    messageLabel: "详细建议",
    messagePlaceholder: "请详细描述您的建议或反馈...",
    submitBtn: "提交建议",
    submitting: "提交中...",

    successTitle: "感谢您的反馈！",
    successDesc: "我们已经收到您的建议，会尽快查看并回复。",
    continueSubmitBtn: "继续提交",

    submitError: "提交失败，请稍后重试",
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
    welcomeFeature1: "发现各地精选目的地，探店、山野、公园一网打尽",
    welcomeFeature2: "与志同道合的伙伴组队同行",
    welcomeFeature3: "记录每一次精彩的出行故事",
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
    autoSendFooter: "此邮件由 GoMate 自动发送，请勿回复。",
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
    teamCancelled: "该队伍已取消",
    alreadyMemberDirect: "你已经是该队伍的成员",
    alreadyApplied: "你已经提交了申请，请等待审核",
    leaderCannotLeave: "队长无法直接离开队伍，请先转让队长权限或解散队伍",
    onlyLeaderCanReview: "只有队长可以审核成员",
    teamAlreadyFull: "队伍已满，无法批准新成员",
    applicationNotFound: "未找到该成员的申请",
    notMember: "你不是该队伍的成员",
    cannotCancelApplication: "无法取消申请",

    // 地点
    locationLoadFailed: "加载地点列表失败",

    // 用户
    unknownUser: "未知用户",
    userTeamLoadFailed: "获取用户加入的队伍失败",

    // 忘记密码
    emailEmpty: "邮箱地址不能为空",
    emailInvalid: "邮箱格式不正确",
    dbNotConfigured: "数据库未配置",
    emailNotRegistered: "该邮箱未注册，请先注册账号",
    resetEmailSentAnon: "如果该邮箱已注册，我们将发送重置密码链接",
    resetEmailSent: "重置密码链接已发送到您的邮箱",
    resetEmailFailed: "发送重置邮件失败，请稍后重试",

    // 表单校验
    teamTitleTooShort: "标题至少2个字符",
    teamTitleTooLong: "标题最多100个字符",
    teamDescTooLong: "描述最多1000个字符",
    teamReqsTooLong: "要求最多500个字符",
    wechatRequired: "请先在个人资料中填写微信号，以便队友联系您",
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
    applicationCancelled: "申请已取消",
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

  // ─── 分享 ─────────────────────────────────────────────────────────────────
  share: {
    title: "分享队伍",
    locationTitle: "分享地点",
    linkCopied: "链接已复制到剪贴板",
    copyLink: "复制链接",
    shareVia: "通过应用分享",
    inviteText: "邀请你加入这支队伍",
    locationInviteText: "推荐你一个好去处",
    tabLink: "链接",
    tabQRCode: "二维码",
    shareLinkLabel: "分享链接",
    scanToJoin: "扫描二维码加入队伍",
    scanToViewLocation: "扫描二维码查看地点详情",
    downloadQRCode: "下载二维码",
    posterDownloaded: "海报已生成并下载",
    generatePosterFailed: "生成海报失败，请重试",
    noAddress: "暂无地址信息",
  },

  // ─── 管理后台 ─────────────────────────────────────────────────────────────
  admin: {
    // 导航
    navLocations: "地点管理",
    navUsers: "用户管理",
    navSettings: "系统设置",
    adminBadge: "管理后台",
    backToFrontend: "返回前台",

    // 地点管理页面
    locationsTitle: "地点管理",
    locationsDesc: "管理所有地点信息",
    addLocation: "新增地点",
    editLocation: "编辑地点",
    createLocation: "新增地点",

    // 表格列头
    colName: "名称",
    colCity: "城市",
    colDifficulty: "难度",
    colDuration: "时长",
    colDistance: "距离",
    colCreatedAt: "创建时间",
    colUpdatedAt: "更新时间",
    colActions: "操作",

    // 空状态
    noLocations: "暂无地点数据",

    // 表单标签
    formName: "名称",
    formNameRequired: "名称 *",
    formSlug: "Slug（留空自动生成）",
    formSubtitle: "副标题",
    formDescription: "描述",
    formDescriptionRequired: "描述 *",
    formDifficulty: "难度",
    formDifficultyRequired: "难度 *",
    formDuration: "时长",
    formDurationRequired: "时长 *",
    formDistance: "距离",
    formDistanceRequired: "距离 *",
    formElevation: "海拔",
    formBestSeason: "最佳季节（逗号分隔）",
    formCity: "城市",
    formAdcode: "行政区划代码",
    formCoverImage: "封面图片",
    formCoverImageRequired: "封面图片 *",
    formImages: "图片列表",
    formTags: "地点标签",
    formAddress: "地址",
    formCoordinates: "坐标",
    addTagPlaceholder: "输入标签名称，回车添加",
    noTagsSelected: "暂无标签",
    formRouteDesc: "路线描述",
    formTips: "徒步贴士",

    // 表单占位符
    placeholderSlug: "如: wutong-mountain",
    placeholderSubtitle: "如: 深圳第二高峰",
    placeholderDuration: "如: 4-5小时",
    placeholderDistance: "如: 8.5公里",
    placeholderElevation: "如: 869米",
    placeholderBestSeason: "如: 春季, 秋季",
    placeholderSelectCity: "选择城市",
    placeholderAdcode: "自动填充",
    placeholderTags: "如: 海景, 山峰, 摄影",
    placeholderCoordinates: '{"lat": 22.5, "lng": 114.1}',
    placeholderUploadCover: "点击上传封面图片",

    // 季节选项
    seasons: {
      spring: "春季",
      summer: "夏季",
      autumn: "秋季",
      winter: "冬季",
    },

    // 按钮
    cancel: "取消",
    saving: "保存中...",
    save: "保存",

    // 删除对话框
    deleteConfirmTitle: "确认删除",
    deleteConfirmDesc: "确定要删除地点「{name}」吗？此操作不可撤销。",
    delete: "删除",

    // 错误消息
    loadLocationsFailed: "加载地点列表失败:",
    getLocationDetailFailed: "获取地点详情失败:",
    submitFailed: "提交失败:",
    operationFailed: "操作失败",
    operationFailedRetry: "操作失败，请重试",
    deleteFailed: "删除失败:",
    deleteFailedRetry: "删除失败，请重试",

    // 封面图上传
    coverImageDrag: "拖拽图片到此处",
    coverImageOr: "或",
    coverImageClickUpload: "点击上传",
    coverImagePasteUrl: "粘贴图片 URL",
    coverImageUrlPlaceholder: "https://...",
    coverImageConfirmUrl: "确认",
    coverImageUploading: "上传中...",
    coverImageTooLarge: "图片不能超过 5MB",
    coverImageInvalidType: "请选择图片格式文件",
    coverImageUploadFailed: "上传失败，请重试",
    coverImageReplaceBtn: "更换封面",
    coverImageDeleteBtn: "删除",
    coverImageAiHint: "建议使用 16:9 比例的高清图片",

    // 季节选择
    seasonSpring: "春季",
    seasonSummer: "夏季",
    seasonAutumn: "秋季",
    seasonWinter: "冬季",
    seasonSpringMonths: "3-5月",
    seasonSummerMonths: "6-8月",
    seasonAutumnMonths: "9-11月",
    seasonWinterMonths: "12-2月",
    seasonSelectHint: "可多选，选择最适合游览的季节",

    // 进度指示
    progressStep1: "基本信息",
    progressStep2: "位置信息",
    progressStep3: "封面与季节",
    progressStep4: "完成",
    progressComplete: "已完成",
    progressIncomplete: "未完成",

    // 草稿与保存
    draftSaved: "草稿已自动保存",
    draftSavedAgo: "前",
    draftRestorePrompt: "检测到未完成的草稿，是否恢复？",
    draftRestoreBtn: "恢复草稿",
    draftDiscardBtn: "放弃草稿",
    unsavedChanges: "有未保存的更改",
    discardChanges: "放弃更改",
    saveChanges: "保存更改",
    justNow: "刚刚",
    minutesAgo: "分钟前",
    hoursAgo: "小时前",

    // 城市搜索
    citySearchPlaceholder: "搜索城市...",
    cityHotCities: "热门城市",
    cityNoResults: "未找到匹配城市",

    // 字段校验
    validationNameRequired: "地点名称不能为空",
    validationNameTooLong: "地点名称不能超过 50 字",
    validationDescRequired: "详细描述不能为空",
    validationDescTooShort: "描述至少需要 10 个字",
    validationCityRequired: "请选择所在城市",
    validationCoverRequired: "请上传封面图片",
    validationLatInvalid: "纬度范围为 -90 到 90",
    validationLngInvalid: "经度范围为 -180 到 180",

    // 坐标帮助
    coordinatesHelp: "不知道坐标？可在高德地图/百度地图右键复制坐标",
    latLabel: "纬度 (Lat)",
    lngLabel: "经度 (Lng)",
  },

  // ─── UI 组件 ──────────────────────────────────────────────────────────────
  ui: {
    // 图片上传组件
    upload: {
      hint: "点击上传图片",
      uploading: "上传中...",
      maxSize: "最大 {size}MB",
      invalidType: "不支持的文件格式",
      fileTooLarge: "文件太大，最大 {size}MB",
      uploadFailed: "上传失败",
      preview: "预览",
      maxImagesReached: "最多只能上传 {max} 张图片",
      supportedFormats: "仅支持 JPG、PNG、GIF、WebP 格式",
      fileSizeExceeded: "文件 {name} 超过 {size}MB",
      addImage: "添加图片",
      uploadedCount: "已上传 {current}/{max} 张",
      dragToSort: "拖拽可排序，最大 {size}MB/张",
      imageAlt: "图片 {index}",
    },
    // 要求选择器
    requirementSelector: {
      presetLabel: "常用标签（点击快速添加）",
      customLabel: "或自定义添加",
      placeholder: "输入其他要求...",
      selectedLabel: "已选择",
    },
    // 标签选择器
    tagSelector: {
      presetLabel: "可选标签（点击选择）",
      customLabel: "新建标签",
      selectedLabel: "已选标签",
      placeholder: "输入标签名称",
    },
  },

  // ─── 枚举标签（与数据库枚举值一一对应）──────────────────────────────────
  enums: {
    difficulty: {
      easy: "🌿 轻松",
      moderate: "⛰ 适中",
      hard: "🧗 挑战",
      expert: "🏔 专家",
    },
    teamStatus: {
      recruiting: "等你一起",
      full: "名额告急，可关注",
      formed: "整装待发",
      ongoing: "进行中",
      completed: "圆满归来",
      cancelled: "已取消",
      open: "等你一起",
      closed: "已结束",
    },
    memberStatus: {
      pending: "待审核",
      approved: "已通过",
      rejected: "已拒绝",
      leave_pending: "退出申请中",
    },
    level: {
      beginner: "新人",
      intermediate: "探索者",
      advanced: "资深玩家",
      expert: "传奇达人",
    },
    leaderLevel: {
      beginner: "新人领队",
      intermediate: "探索者领队",
      advanced: "资深玩家领队",
      expert: "传奇达人领队",
    },
    levelDesc: {
      beginner: "刚开始探索之旅",
      intermediate: "有一定活动经验",
      advanced: "经验丰富的玩家",
      expert: "资深活动达人",
    },
    levelTitle: {
      beginner: "新人",
      intermediate: "探索者",
      advanced: "资深玩家",
      expert: "传奇达人",
    },
    gender: {
      male: "男",
      female: "女",
      other: "其他",
    },
  },
} as const;
