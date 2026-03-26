/// GoMate App 全局文案常量
///
/// 设计原则：温暖、陪伴、简洁。
/// 每一句话都像一个同行的伙伴在说话，而不是一台机器在执行指令。
///
/// 支持国际化扩展（ARB 格式预留注释）
/// 使用方式：AppStrings.xxx
// ignore_for_file: constant_identifier_names
abstract class AppStrings {
  AppStrings._();

  // ─────────────────────────────────────────────
  // App 基础
  // ─────────────────────────────────────────────

  static const String appName = 'GoMate';

  static const String appTagline = '找到你的同行伙伴';

  // ─────────────────────────────────────────────
  // Auth — 登录 / 注册
  // ─────────────────────────────────────────────

  static const String authWelcomeBack = '欢迎回来';

  static const String authWelcomeBackSubtitle = '继续探索深圳的山野路线';

  static const String authCreateAccount = '加入 GoMate';

  static const String authCreateAccountSubtitle = '找到志同道合的徒步伙伴';

  static const String authEmailPlaceholder = '邮箱地址';

  static const String authPasswordPlaceholder = '密码';

  static const String authConfirmPasswordPlaceholder = '确认密码';

  static const String authNamePlaceholder = '你的昵称';

  static const String authLoginBtn = '登录';

  static const String authSignupBtn = '注册';

  static const String authNoAccount = '还没账号？';

  static const String authSignupLink = '注册';

  static const String authHasAccount = '已有账号？';

  static const String authLoginLink = '登录';

  static const String authForgotPassword = '忘记密码';

  static const String authLogout = '退出登录';

  static const String authLogoutConfirm = '确定要退出吗？';

  // 错误提示
  static const String authEmailError = '请输入有效的邮箱地址';

  static const String authPasswordTooShort = '密码至少需要 8 位';

  static const String authPasswordMismatch = '两次输入的密码不一致';

  static const String authEmailTaken = '该邮箱已被注册，直接登录？';

  static const String authWrongCredentials = '邮箱或密码不正确';

  static const String authAccountNotFound = '该账号不存在，去注册一个？';

  // ─────────────────────────────────────────────
  // 首页
  // ─────────────────────────────────────────────

  static const String homeSearchHint = '搜索地点、路线或队伍…';

  static const String homeSectionLocations = '热门地点';

  static const String homeSectionTeams = '招募中队伍';

  static const String homeSeeAll = '查看全部';

  static const String homeEmptyTitle = '暂时没有数据';

  static const String homeEmptyHint = '下拉刷新试试看';

  // ─────────────────────────────────────────────
  // 地点
  // ─────────────────────────────────────────────

  static const String locationsTitle = '探索地点';

  static const String locationsSearchHint = '搜索地点名称…';

  static const String locationsFilterAll = '全部';

  static const String locationsEmptyTitle = '暂无地点';

  static const String locationsEmptyHint = '换个筛选条件试试';

  // 地点详情
  static const String locationIntroTitle = '地点介绍';

  static const String locationRoutesTitle = '路线选择';

  static const String locationFindTeamBtn = '在此地找队伍';

  static const String locationFavoriteAdd = '收藏成功';

  static const String locationFavoriteRemove = '已取消收藏';

  // 路线数据标签
  static const String routeDistance = '距离';

  static const String routeDuration = '时长';

  static const String routeElevation = '爬升';

  static const String routeDistanceUnit = '公里';

  static const String routeDurationUnit = '分钟';

  static const String routeElevationUnit = '米';

  // ─────────────────────────────────────────────
  // 队伍
  // ─────────────────────────────────────────────

  static const String teamsTitle = '找队伍';

  static const String teamsFilterAll = '全部';

  static const String teamsSearchHint = '搜索队伍…';

  static const String teamsEmptyTitle = '暂无队伍';

  static const String teamsEmptyHint = '成为第一个发起组队的人？';

  static const String teamsCreateBtn = '发起组队';

  static const String teamsMemberCount = '人';

  // 队伍详情
  static const String teamJoinBtn = '申请加入';

  static const String teamJoinPendingBtn = '等待审核中';

  static const String teamLeaveBtn = '退出队伍';

  static const String teamCancelBtn = '取消队伍';

  static const String teamManageBtn = '管理队伍';

  static const String teamShareBtn = '分享';

  static const String teamInfoTitle = '队伍信息';

  static const String teamMembersTitle = '队伍成员';

  static const String teamOrganizerLabel = '队长';

  static const String teamMemberLabel = '成员';

  // 加入 / 退出确认
  static const String teamJoinConfirmTitle = '申请加入队伍';

  static const String teamJoinConfirmMsg = '申请后需等待队长审核';

  static const String teamJoinConfirmBtn = '确认申请';

  static const String teamLeaveConfirmTitle = '退出队伍';

  static const String teamLeaveConfirmMsg = '退出后需重新申请才能加入';

  static const String teamLeaveConfirmBtn = '确认退出';

  static const String teamCancelConfirmTitle = '取消队伍';

  static const String teamCancelConfirmMsg = '取消后所有成员将收到通知';

  static const String teamCancelConfirmBtn = '确认取消';

  // 队伍状态文案
  static const String teamStatusRecruiting = '招募中';

  static const String teamStatusFull = '名额已满';

  static const String teamStatusFormed = '已组建';

  static const String teamStatusCompleted = '已完成';

  static const String teamStatusCancelled = '已取消';

  // ─────────────────────────────────────────────
  // 创建队伍
  // ─────────────────────────────────────────────

  static const String createTeamTitle = '发起组队';

  static const String createTeamNameLabel = '队伍名称';

  static const String createTeamNamePlaceholder = '给这次活动起个名字';

  static const String createTeamLocationLabel = '出发地点';

  static const String createTeamLocationPlaceholder = '选择徒步地点';

  static const String createTeamDateLabel = '出发日期';

  static const String createTeamDatePlaceholder = '选择日期';

  static const String createTeamMaxMembersLabel = '人数上限';

  static const String createTeamDescLabel = '队伍说明';

  static const String createTeamDescPlaceholder = '说说这次活动的安排、要求…';

  static const String createTeamIconLabel = '队伍图标';

  static const String createTeamSubmitBtn = '发起组队';

  static const String createTeamSuccess = '队伍创建成功，快去招募伙伴吧！';

  // ─────────────────────────────────────────────
  // 我的队伍
  // ─────────────────────────────────────────────

  static const String myTeamsTitle = '我的队伍';

  static const String myTeamsTabAll = '全部';

  static const String myTeamsTabOrganized = '我发起的';

  static const String myTeamsTabJoined = '我参与的';

  static const String myTeamsEmptyTitle = '还没有队伍';

  static const String myTeamsEmptyHint = '去找一支队伍，或者自己发起一个？';

  static const String myTeamsCreateBtn = '发起组队';

  static const String myTeamsExploreBtn = '浏览队伍';

  // ─────────────────────────────────────────────
  // 队伍管理
  // ─────────────────────────────────────────────

  static const String teamManageTitle = '管理队伍';

  static const String teamManageMembersTitle = '成员管理';

  static const String teamManagePendingTitle = '待审核申请';

  static const String teamManageApproveBtn = '通过';

  static const String teamManageRejectBtn = '拒绝';

  static const String teamManageRemoveBtn = '移出队伍';

  static const String teamManageNoPending = '暂无待审核申请';

  static const String teamManageApproveSuccess = '已通过申请';

  static const String teamManageRejectSuccess = '已拒绝申请';

  static const String teamManageRemoveSuccess = '已移出队伍';

  static const String teamManageCompleteBtn = '标记为已完成';

  static const String teamManageCompleteConfirm = '确认这次活动已完成？';

  // ─────────────────────────────────────────────
  // 个人资料
  // ─────────────────────────────────────────────

  static const String profileTitle = '个人资料';

  static const String profileEditBtn = '编辑资料';

  static const String profileEditTitle = '编辑资料';

  static const String profileNicknamePlaceholder = '昵称';

  static const String profileBioPlaceholder = '介绍一下自己（可选）';

  static const String profileAvatarHint = '点击更换头像';

  static const String profileEmailLabel = '邮箱';

  static const String profileJoinDate = '加入于 {date}';

  static const String profileLevelLabel = '户外等级';

  static const String profileTeamsOrganized = '发起';

  static const String profileTeamsJoined = '参与';

  static const String profileSaveBtn = '保存';

  static const String profileSaveSuccess = '资料已更新';

  static const String profileFavoritesTitle = '我的收藏';

  static const String profileFavoritesEmpty = '还没有收藏的地点';

  // 户外等级文案
  static const String levelBeginner = '新手探索者';

  static const String levelIntermediate = '进阶徒步者';

  static const String levelAdvanced = '资深山野客';

  static const String levelExpert = '顶尖探险家';

  // ─────────────────────────────────────────────
  // 难度等级
  // ─────────────────────────────────────────────

  static const String difficultyEasy = '入门';

  static const String difficultyModerate = '进阶';

  static const String difficultyHard = '挑战';

  static const String difficultyExpert = '专家';

  // ─────────────────────────────────────────────
  // 通用 UI
  // ─────────────────────────────────────────────

  static const String loading = '加载中…';

  static const String retry = '重试';

  static const String refresh = '刷新';

  static const String back = '返回';

  static const String close = '关闭';

  static const String confirm = '确认';

  static const String cancel = '取消';

  static const String save = '保存';

  static const String delete = '删除';

  static const String edit = '编辑';

  static const String share = '分享';

  static const String search = '搜索';

  static const String searchPlaceholder = '搜索…';

  static const String seeAll = '查看全部';

  static const String noData = '暂无数据';

  static const String unknown = '未知';

  // ─────────────────────────────────────────────
  // 错误与成功
  // ─────────────────────────────────────────────

  static const String errorOfflineTitle = '网络连接失败';

  static const String errorOfflineHint = '检查网络后重试';

  static const String errorOfflineBtn = '重新连接';

  static const String errorRequestFailed = '请求失败，请稍后重试';

  static const String errorTimeout = '请求超时，请稍后重试';

  static const String errorServer = '服务器暂时不可用，请稍后再试';

  static const String errorUnknown = '出了点问题，请重试';

  static const String successJoinTeam = '申请已提交，等待队长审核';

  static const String successLeaveTeam = '已成功退出队伍';

  static const String successCreateTeam = '队伍创建成功！';

  static const String successCancelTeam = '队伍已取消';

  static const String successFavorite = '已收藏';

  static const String successUnfavorite = '已取消收藏';

  static const String successProfileSaved = '资料已保存';

  // 删除确认
  static const String confirmDeleteTitle = '确认删除';

  static const String confirmDeleteMsg = '删除后无法恢复，确认吗？';

  static const String confirmDeleteBtn = '删除';

  static const String confirmCancelBtn = '取消';

  // ─────────────────────────────────────────────
  // 反馈建议
  // ─────────────────────────────────────────────

  static const String feedbackTitle = '反馈建议';

  static const String feedbackSubtitle = '帮助我们做得更好';

  static const String feedbackTabSuggestion = '功能建议';

  static const String feedbackTabBug = '问题反馈';

  static const String feedbackNameLabel = '您的姓名';

  static const String feedbackEmailLabel = '联系邮箱';

  static const String feedbackContentLabel = '详细描述';

  static const String feedbackContentPlaceholderSuggestion = '请详细描述您的建议...';

  static const String feedbackContentPlaceholderBug = '请描述您遇到的问题...';

  static const String feedbackDeviceLabel = '设备类型';

  static const String feedbackDevicePlaceholder = '例如：iPhone 15 Pro';

  static const String feedbackBrowserLabel = '浏览器';

  static const String feedbackBrowserPlaceholder = '例如：Chrome 120';

  static const String feedbackStepsLabel = '复现步骤';

  static const String feedbackStepsPlaceholder = '请描述如何重现这个问题...';

  static const String feedbackPageUrlLabel = '问题页面';

  static const String feedbackSubmitBtn = '提交反馈';

  static const String feedbackSubmitting = '提交中...';

  static const String feedbackSuccessTitle = '感谢您的反馈！';

  static const String feedbackSuccessDesc = '我们会认真查看每一条反馈';

  static const String feedbackError = '提交失败，请稍后重试';
}
