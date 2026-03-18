// ============================================
// Database Types - Auto-generated from schema
// ============================================

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

// Enums
export type UserRole = 'admin' | 'accountant' | 'team_leader' | 'account_manager' | 'creator' | 'designer' | 'client' | 'videographer' | 'editor' | 'photographer' | 'moderator'
export type Department = 'photography' | 'content'
export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'cancelled'
export type TaskStatus = 'new' | 'in_progress' | 'review' | 'client_review' | 'client_revision' | 'revision' | 'approved' | 'rejected' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskType = 'video' | 'photo' | 'editing' | 'content' | 'general'
export type WorkflowStage = 'filming' | 'filming_done' | 'editing' | 'editing_done' | 'final_review' | 'shooting' | 'shooting_done' | 'delivered' | 'none'
export type ScheduleStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type MessageType = 'text' | 'image' | 'file'
export type TransactionType = 'income' | 'expense'
export type RequestType = 'new_task' | 'modification'
export type RequestStatus = 'pending_approval' | 'approved' | 'rejected'
export type MissingItemsStatus = 'pending' | 'resolved' | 'not_applicable'
export type ScheduleType = 'reels' | 'post'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type AdvanceRecipientType = 'employee' | 'owner'

export type ScheduleLink = {
    url: string
    comment: string
}

// ============================================
// Table Types
// ============================================

export type User = {
    id: string
    email: string
    name: string | null
    phone: string | null
    role: UserRole
    department: Department | null
    avatar_url: string | null
    is_active: boolean
    created_at: string
}

export type Client = {
    id: string
    user_id: string | null
    name: string
    email: string | null
    phone: string | null
    notes: string | null
    created_at: string
}

export type ClientAssignment = {
    id: string
    client_id: string
    user_id: string
    assigned_by: string
    created_at: string
}

export type ClientAssignmentWithRelations = ClientAssignment & {
    client?: Client | null
    user?: Pick<User, 'id' | 'name' | 'email' | 'role' | 'avatar_url' | 'department'> | null
    assigner?: Pick<User, 'id' | 'name' | 'role'> | null
}

export type Project = {
    id: string
    client_id: string | null
    name: string
    description: string | null
    status: ProjectStatus
    department: Department | null
    budget: number | null
    start_date: string | null
    end_date: string | null
    created_by: string | null
    created_at: string
}

export type Task = {
    id: string
    project_id: string | null
    title: string
    description: string | null
    status: TaskStatus
    priority: TaskPriority
    department: Department | null
    task_type: TaskType
    workflow_stage: WorkflowStage
    assigned_to: string | null
    created_by: string | null
    editor_id: string | null
    deadline: string | null
    client_feedback: string | null
    company_name: string | null
    location: string | null
    scheduled_date: string | null
    scheduled_time: string | null
    request_type: RequestType | null
    request_status: RequestStatus | null
    rejection_reason: string | null
    original_task_id: string | null
    client_id: string | null
    created_at: string
    updated_at: string
}

export type Attachment = {
    id: string
    task_id: string | null
    file_url: string
    file_name: string | null
    file_type: string | null
    file_size: number | null
    is_final: boolean
    uploaded_by: string | null
    created_at: string
}

export type Comment = {
    id: string
    task_id: string | null
    user_id: string | null
    content: string
    created_at: string
}

export type Treasury = {
    id: string
    current_balance: number
    updated_at: string
}

export type PaymentMethod = 'cash' | 'transfer' | 'check'

export type Advance = {
    id: string
    recipient_id: string | null
    recipient_type: AdvanceRecipientType
    recipient_name: string
    amount: number
    notes: string | null
    transaction_id: string | null
    created_by: string | null
    created_at: string
}

export type AdvanceRecipient = {
    id: string
    name: string
    recipient_type: AdvanceRecipientType
    created_by: string | null
    created_at: string
}

export type AdvanceWithApproval = Pick<Advance, 'id' | 'amount' | 'notes' | 'transaction_id' | 'created_at'> & {
    transaction: { id: string; is_approved: boolean } | null
}

export type AdvanceRecipientWithAdvances = AdvanceRecipient & {
    advances: AdvanceWithApproval[]
}

export type Transaction = {
    id: string
    type: TransactionType
    payment_method: PaymentMethod
    amount: number
    description: string | null
    category: string | null
    sub_category: string | null
    receipt_url: string | null
    client_id: string | null
    project_id: string | null
    client_account_id: string | null
    transaction_date: string | null
    is_approved: boolean
    approved_by: string | null
    approved_at: string | null
    visible_to_client: boolean
    affects_treasury: boolean
    notes: string | null
    created_by: string | null
    created_at: string
    client?: { id: string; name: string; email: string | null; user?: { name: string } | null } | null
}

export type TreasuryLog = {
    id: string
    transaction_id: string | null
    action: 'create' | 'update' | 'delete' | 'approve' | 'reject'
    performed_by: string
    client_id: string | null
    client_name: string | null
    amount: number | null
    transaction_type: 'income' | 'expense' | null
    category: string | null
    description: string | null
    changes: Json | null
    created_at: string
}

export type Package = {
    id: string
    name: string
    name_ar: string | null
    price: number
    duration_days: number
    description: string | null
    description_ar: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export type ClientAccount = {
    id: string
    client_id: string
    package_id: string | null
    package_name: string | null
    package_name_ar: string | null
    package_price: number | null
    package_description: string | null
    package_description_ar: string | null
    package_duration_days: number | null
    remaining_balance: number
    start_date: string
    end_date: string | null
    is_active: boolean
    created_by: string | null
    created_at: string
    updated_at: string
}

// Extended Types with Relations
export type ClientAccountWithRelations = ClientAccount & {
    client?: Client
    package?: Package
    transactions?: Transaction[]
}

export type NotificationType =
    | 'task'
    | 'schedule'
    | 'treasury'
    | 'advance'
    | 'user'
    | 'client'
    | 'project'
    | 'client_account'
    | 'package'
    | 'chat'
    | 'general'

export type Notification = {
    id: string
    user_id: string | null
    title: string
    message: string | null
    link: string | null
    is_read: boolean
    created_at: string
    notification_type: NotificationType
    entity_id: string | null
}

export type SiteSetting = {
    id: string
    key: string
    value: Json
    type: string | null
    updated_at: string
}

export type Page = {
    id: string
    slug: string
    title_en: string | null
    title_ar: string | null
    content_en: Json | null
    content_ar: Json | null
    is_published: boolean
    updated_at: string
}

export type TeamMember = {
    id: string
    name_en: string
    name_ar: string | null
    position_en: string | null
    position_ar: string | null
    bio_en: string | null
    bio_ar: string | null
    photo_url: string | null
    display_order: number
    is_active: boolean
    created_at: string
}

export type PortfolioItem = {
    id: string
    title_en: string
    title_ar: string | null
    description_en: string | null
    description_ar: string | null
    images: Json
    category: string | null
    is_featured: boolean
    created_at: string
}

export type ActivityLog = {
    id: string
    user_id: string | null
    action: string
    details: Json | null
    ip_address: string | null
    created_at: string
}

export type StorageSettings = {
    id: string
    auto_delete_months: number
    last_cleanup: string | null
}

export type ContactMessage = {
    id: string
    name: string
    email: string
    phone: string | null
    message: string
    is_read: boolean
    created_at: string
}

// ============================================
// New Tables - v2 Department System
// ============================================

export type Schedule = {
    id: string
    department: Department
    team_leader_id: string
    client_id: string | null
    project_id: string | null
    task_id: string | null
    assigned_members: string[]
    company_name: string
    title: string
    description: string | null
    scheduled_date: string
    start_time: string
    end_time: string | null
    location: string | null
    status: ScheduleStatus
    notes: string | null
    missing_items: string | null
    missing_items_status: MissingItemsStatus
    schedule_type: ScheduleType
    created_by: string | null
    approval_status: ApprovalStatus
    manager_notes: string | null
    links: ScheduleLink[]
    images: string[]
    created_at: string
    updated_at: string
}

export type Conversation = {
    id: string
    project_id: string | null
    department: Department | null
    created_at: string
    updated_at: string
    last_message_at: string
}

export type ConversationParticipant = {
    id: string
    conversation_id: string
    user_id: string
    last_read_at: string | null
    joined_at: string
}

export type Message = {
    id: string
    conversation_id: string
    sender_id: string
    content: string | null
    message_type: MessageType
    file_url: string | null
    file_name: string | null
    is_read: boolean
    created_at: string
}

// ============================================
// Database Schema Type (for Supabase Client)
// ============================================
export interface Database {
    public: {
        Tables: {
            users: {
                Row: User
                Insert: Omit<User, 'id' | 'created_at'> & { id?: string; created_at?: string }
                Update: Partial<Omit<User, 'id'>>
                Relationships: []
            }
            clients: {
                Row: Client
                Insert: Omit<Client, 'id' | 'created_at'> & { id?: string; created_at?: string }
                Update: Partial<Omit<Client, 'id'>>
                Relationships: []
            }
            projects: {
                Row: Project
                Insert: Omit<Project, 'id' | 'created_at'> & { id?: string; created_at?: string }
                Update: Partial<Omit<Project, 'id'>>
                Relationships: []
            }
            tasks: {
                Row: Task
                Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
                Update: Partial<Omit<Task, 'id'>>
                Relationships: []
            }
            attachments: {
                Row: Attachment
                Insert: Omit<Attachment, 'id' | 'created_at'> & { id?: string; created_at?: string }
                Update: Partial<Omit<Attachment, 'id'>>
                Relationships: []
            }
            comments: {
                Row: Comment
                Insert: Omit<Comment, 'id' | 'created_at'> & { id?: string; created_at?: string }
                Update: Partial<Omit<Comment, 'id'>>
                Relationships: []
            }
            treasury: {
                Row: Treasury
                Insert: Omit<Treasury, 'id' | 'updated_at'> & { id?: string; updated_at?: string }
                Update: Partial<Omit<Treasury, 'id'>>
                Relationships: []
            }
            transactions: {
                Row: Transaction
                Insert: {
                    id?: string
                    type: TransactionType
                    payment_method?: PaymentMethod
                    amount: number
                    description?: string | null
                    category?: string | null
                    sub_category?: string | null
                    receipt_url?: string | null
                    client_id?: string | null
                    project_id?: string | null
                    client_account_id?: string | null
                    transaction_date?: string | null
                    is_approved?: boolean
                    approved_by?: string | null
                    approved_at?: string | null
                    visible_to_client?: boolean
                    affects_treasury?: boolean
                    notes?: string | null
                    created_by?: string | null
                    created_at?: string
                }
                Update: Partial<Omit<Transaction, 'id'>>
                Relationships: []
            }
            notifications: {
                Row: Notification
                Insert: {
                    id?: string
                    user_id?: string | null
                    title: string
                    message?: string | null
                    link?: string | null
                    is_read?: boolean
                    created_at?: string
                }
                Update: Partial<Omit<Notification, 'id'>>
                Relationships: []
            }
            site_settings: {
                Row: SiteSetting
                Insert: Omit<SiteSetting, 'id' | 'updated_at'> & { id?: string; updated_at?: string }
                Update: Partial<Omit<SiteSetting, 'id'>>
                Relationships: []
            }
            pages: {
                Row: Page
                Insert: Omit<Page, 'id' | 'updated_at'> & { id?: string; updated_at?: string }
                Update: Partial<Omit<Page, 'id'>>
                Relationships: []
            }
            team_members: {
                Row: TeamMember
                Insert: Omit<TeamMember, 'id' | 'created_at'> & { id?: string; created_at?: string }
                Update: Partial<Omit<TeamMember, 'id'>>
                Relationships: []
            }
            portfolio: {
                Row: PortfolioItem
                Insert: Omit<PortfolioItem, 'id' | 'created_at'> & { id?: string; created_at?: string }
                Update: Partial<Omit<PortfolioItem, 'id'>>
                Relationships: []
            }
            activity_log: {
                Row: ActivityLog
                Insert: {
                    id?: string
                    user_id?: string | null
                    action: string
                    details?: Json | null
                    ip_address?: string | null
                    created_at?: string
                }
                Update: Partial<Omit<ActivityLog, 'id'>>
                Relationships: []
            }
            storage_settings: {
                Row: StorageSettings
                Insert: Omit<StorageSettings, 'id'> & { id?: string }
                Update: Partial<Omit<StorageSettings, 'id'>>
                Relationships: []
            }
            schedules: {
                Row: Schedule
                Insert: Omit<Schedule, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
                Update: Partial<Omit<Schedule, 'id'>>
                Relationships: []
            }
            conversations: {
                Row: Conversation
                Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at' | 'last_message_at'> & { id?: string; created_at?: string; updated_at?: string; last_message_at?: string }
                Update: Partial<Omit<Conversation, 'id'>>
                Relationships: []
            }
            conversation_participants: {
                Row: ConversationParticipant
                Insert: Omit<ConversationParticipant, 'id' | 'joined_at' | 'last_read_at'> & { id?: string; joined_at?: string; last_read_at?: string | null }
                Update: Partial<Omit<ConversationParticipant, 'id'>>
                Relationships: []
            }
            messages: {
                Row: Message
                Insert: Omit<Message, 'id' | 'created_at' | 'is_read' | 'file_url' | 'file_name'> & { id?: string; created_at?: string; is_read?: boolean; file_url?: string | null; file_name?: string | null }
                Update: Partial<Omit<Message, 'id'>>
                Relationships: []
            }
            treasury_logs: {
                Row: TreasuryLog
                Insert: Omit<TreasuryLog, 'id' | 'created_at'> & { id?: string; created_at?: string }
                Update: Partial<Omit<TreasuryLog, 'id'>>
                Relationships: []
            }
            packages: {
                Row: Package
                Insert: Omit<Package, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
                Update: Partial<Omit<Package, 'id'>>
                Relationships: []
            }
            client_accounts: {
                Row: ClientAccount
                Insert: Omit<ClientAccount, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
                Update: Partial<Omit<ClientAccount, 'id'>>
                Relationships: []
            }
            advances: {
                Row: Advance
                Insert: {
                    id?: string
                    recipient_id?: string | null
                    recipient_type?: AdvanceRecipientType
                    recipient_name: string
                    amount: number
                    notes?: string | null
                    transaction_id?: string | null
                    created_by?: string | null
                    created_at?: string
                }
                Update: Partial<Omit<Advance, 'id'>>
                Relationships: []
            }
            advance_recipients: {
                Row: AdvanceRecipient
                Insert: Omit<AdvanceRecipient, 'id' | 'created_at'> & { id?: string; created_at?: string }
                Update: Partial<Omit<AdvanceRecipient, 'id'>>
                Relationships: []
            }
            client_assignments: {
                Row: ClientAssignment
                Insert: Omit<ClientAssignment, 'id' | 'created_at'> & { id?: string; created_at?: string }
                Update: Partial<Omit<ClientAssignment, 'id'>>
                Relationships: []
            }
            contact_messages: {
                Row: ContactMessage
                Insert: Omit<ContactMessage, 'id' | 'created_at' | 'is_read'> & { id?: string; created_at?: string; is_read?: boolean }
                Update: Partial<Omit<ContactMessage, 'id'>>
                Relationships: []
            }
        }
        Enums: {
            user_role: UserRole
            department: Department
            project_status: ProjectStatus
            task_status: TaskStatus
            task_priority: TaskPriority
            task_type: TaskType
            workflow_stage: WorkflowStage
            schedule_status: ScheduleStatus
            message_type: MessageType
            transaction_type: TransactionType
            request_type: RequestType
            request_status: RequestStatus
            advance_recipient_type: AdvanceRecipientType
        }
        // Required by Supabase SDK v2 GenericSchema constraint
        Views: Record<string, never>
        Functions: Record<string, never>
    }
}
