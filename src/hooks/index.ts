
export { useUsers, useUser, useCurrentUser, useUpdateUser, useDeleteUser, useMyDepartmentLeader, useTeamMembers } from './use-users'
export { useCurrentRole, useIsAccountantOrAdmin } from './use-current-role'
export {
    usePackages,
    usePackage,
    useCreatePackage,
    useUpdatePackage,
    useDeletePackage,
    useTogglePackageStatus
} from './use-packages'
export {
    useClientAccounts,
    useClientAccount,
    useClientAccountsByClientId,
    useMyClientAccounts,
    useCreateClientAccount,
    useUpdateClientAccount,
    useToggleClientAccountStatus
} from './use-client-accounts'
export {
    useTreasuryLogs,
    useTransactionLogs,
    useRecentTreasuryActivity,
    useTreasuryActivityStats
} from './use-treasury-logs'
export {
    // Query keys
    taskKeys,
    // Task lists
    useTasks,
    useTasksKanban,
    useMyTasks,
    useTodayMyTasks,
    useRevisionsTasks,
    useTasksForClientReview,
    // Single task
    useTaskDetails,
    // Task mutations
    useCreateTask,
    useUpdateTask,
    useUpdateTaskStatus,
    useAssignTask,
    useReturnTask,
    useDeleteTask,
    // Comments
    useTaskComments,
    useAddComment,
    useDeleteComment,
    // Attachments
    useTaskAttachments,
    useAddAttachment,
    useDeleteAttachment,
    useMarkAttachmentFinal,
    // Admin
    useAdminTasks,
    useAdminTasksStats,
    useAdminTasksExport,
    // Photography department
    usePhotographyTasks,
    useEditorTasks,
    useAdvanceWorkflowStage,
    useCreatePhotographyTask,
    useMarkTaskComplete,
    useDeliverToClient,
    // Client request review (TL)
    usePendingRequests,
    useApproveClientRequest,
    useRejectClientRequest,
    // Forward & client tasks
    useForwardTask,
    useClientTasks,
    useClientTasksStats,
} from './use-tasks'
export {
    useTreasury,
    useTransactions,
    useTransactionSummary,
    useCreateTransaction,
    useUpdateTransaction,
    useApproveTransaction,
    useDeleteTransaction,
    usePaymentMethodSummary,
} from './use-treasury'
export {
    useRealtimeSubscription,
    useNotificationsRealtime,
    useTasksRealtime,
    useSchedulesRealtime,
    useClientAccountsRealtimeSync,
    useTreasuryRealtimeSync
} from './use-realtime'
export {
    useSiteSettings,
    useUpdateSiteSetting,
    usePages,
    usePage,
    useUpdatePage,
    useCreatePage,
    useDeletePage,
    useCMSTeamMembers,
    useCreateTeamMember,
    useUpdateTeamMember,
    useDeleteTeamMember,
    usePortfolio,
    useCreatePortfolioItem,
    useDeletePortfolioItem,
    useStorageSettings,
    useUpdateStorageSettings,
    useActivityLog,
    useLogActivity,
    useUpdateMultipleSiteSettings,
} from './use-cms'
export {
    useClientProfile,
    useClientProjects,
    useClientProjectDetails,
    useApproveTask,
    useRejectTask,
    useClientRevisionsTasks,
    useClientRequests,
    useClientRequestDetail,
    useCreateClientRequest,
    useClientRequestCounts,
} from './use-client-portal'
// Client hooks
export {
    clientKeys,
    useClients,
    useClient,
    useUpdateClient,
    useDeleteClient,
} from './use-clients'
// Client assignment hooks
export {
    clientAssignmentKeys,
    useMyAssignedClients,
    useTeamClientAssignments,
    useAssignClient,
    useUnassignClient,
    useSyncClientAssignments,
} from './use-client-assignments'
// Project hooks
export {
    projectKeys,
    useProjects,
    useProject,
    useCreateProject,
    useUpdateProject,
    useDeleteProject,
} from './use-projects'
// Schedule hooks
export {
    scheduleKeys,
    useSchedules,
    useCalendarSchedules,
    useMySchedules,
    useTodayAssignedSchedules,
    useClientSchedules,
    useContentSchedules,
    useScheduleDetail,
    useCreateSchedule,
    useUpdateSchedule,
    useDeleteSchedule,
    useUpdateScheduleStatus,
    useUpdateScheduleApproval,
    useUpdateMissingItems,
} from './use-schedule'
// Chat hooks
export {
    chatKeys,
    useConversations,
    useMessages,
    useSendMessage,
    useCreateConversation,
    useMarkMessagesRead,
    useUnreadCount,
    useChatRealtime,
    useTypingIndicator,
    useFindOrCreateConversation,
} from './use-chat'

// Auth hooks
export { useLogout } from './use-logout'

// Advances hooks
export {
    useAdvances,
    useCreateAdvance,
    useDeleteAdvance,
    useApproveAdvance,
    useAdvanceRecipients,
    useCreateAdvanceRecipient,
    useDeleteAdvanceRecipient,
} from './use-advances'

// Team activity hooks
export { useTeamActivityLog } from './use-team-logs'

// Utility hooks
export { usePagination } from './use-pagination'
export { useDebounce } from './use-debounce'
export { useThrottle } from './use-throttle'
export { useAuthDashboardLink } from './use-auth-dashboard-link'
export { useDeviceCapabilities } from './use-device-capabilities'
