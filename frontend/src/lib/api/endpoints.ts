import { api } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiUser {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  role: "admin" | "member";
  groupId: string | null;
}

export interface ApiGroup {
  _id: string;
  name: string;
  description: string;
  inviteCode: string;
  adminId: string | ApiUser;
  members: ApiUser[];
  isPublic: boolean;
}

export interface ApiGuestParticipant {
  _id: string;
  name: string;
}

export interface ApiExpense {
  _id: string;
  title: string;
  category: string;
  amount: number;
  paidBy: ApiUser;
  sharedWith: ApiUser[];
  guestParticipants: ApiGuestParticipant[];
  splitAmount: number;
  totalParticipants: number;
  notes: string;
  groupId: string;
  createdAt: string;
}

export interface ApiBalance {
  userId: string;
  name: string;
  avatar: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export interface ApiSettlement {
  _id: string;
  fromUser: ApiUser;
  toUser: ApiUser;
  amount: number;
  status: "pending" | "approved" | "rejected";
  note: string;
  createdAt: string;
}

export interface ApiSummary {
  groupId: string;
  groupName: string;
  totalExpenses: number;
  totalAmount: number;
  balances: ApiBalance[];
  summary: { userId: string; name: string; action: string; amount: number }[];
  whatsappText: string;
}

export interface DebtEdge {
  from: string; fromName: string;
  to: string;   toName: string;
  amount: number;
}

export interface ApiJoinRequest {
  _id: string;
  groupId: string;
  userId: ApiUser;
  memberType: "permanent" | "occasional";
  status: "pending" | "approved" | "rejected";
  message: string;
  createdAt: string;
}

export interface ApiDiscoverGroup {
  _id: string;
  name: string;
  description: string;
  memberCount: number;
  createdAt: string;
  myRequestStatus: "none" | "pending" | "approved" | "rejected";
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  googleLogin: (idToken: string) =>
    api.post<{ success: true; data: { user: ApiUser; accessToken: string; refreshToken: string } }>(
      "/auth/google", { idToken }
    ),
  logout: (refreshToken: string) =>
    api.post("/auth/logout", { refreshToken }),
  me: () =>
    api.get<{ success: true; data: ApiUser }>("/auth/me"),
};

// ─── Groups ───────────────────────────────────────────────────────────────────

export const groupApi = {
  create: (name: string, description?: string) =>
    api.post<{ success: true; data: { group: ApiGroup; user: ApiUser } }>("/groups/create", { name, description }),
  join: (inviteCode: string) =>
    api.post<{ success: true; data: { group: ApiGroup; user: ApiUser } }>("/groups/join", { inviteCode }),
  current: () =>
    api.get<{ success: true; data: ApiGroup }>("/groups/current"),
  members: () =>
    api.get<{ success: true; data: ApiUser[] }>("/groups/members"),
  leave: () =>
    api.post("/groups/leave"),
  removeMember: (id: string) =>
    api.delete(`/groups/member/${id}`),
  transferAdmin: (newAdminId: string) =>
    api.post("/groups/transfer-admin", { newAdminId }),
  regenerateCode: () =>
    api.post<{ success: true; data: { inviteCode: string } }>("/groups/invite/regenerate"),
  updateSettings: (body: { name?: string; description?: string; isPublic?: boolean }) =>
    api.patch<{ success: true; data: ApiGroup }>("/groups/settings", body),
  discover: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<{ success: true; data: { groups: ApiDiscoverGroup[]; total: number } }>("/groups/discover", { params }),
};

// ─── Join Requests ────────────────────────────────────────────────────────────

export const joinRequestApi = {
  request: (inviteCode: string, memberType: "permanent" | "occasional" = "permanent", message = "") =>
    api.post<{ success: true; data: { request: ApiJoinRequest; groupName: string } }>(
      "/join-requests", { inviteCode, memberType, message }
    ),
  requestById: (groupId: string, memberType: "permanent" | "occasional" = "permanent", message = "") =>
    api.post<{ success: true; data: { request: ApiJoinRequest; groupName: string } }>(
      `/join-requests/by-group/${groupId}`, { memberType, message }
    ),
  cancelById: (groupId: string) =>
    api.delete(`/join-requests/by-group/${groupId}`),
  status: (inviteCode: string) =>
    api.get<{ success: true; data: { group: { name: string; _id: string }; request: ApiJoinRequest | null } }>(
      `/join-requests/status?inviteCode=${inviteCode}`
    ),
  pending: () =>
    api.get<{ success: true; data: ApiJoinRequest[] }>("/join-requests/pending"),
  approve: (id: string) =>
    api.post(`/join-requests/${id}/approve`),
  reject: (id: string) =>
    api.post(`/join-requests/${id}/reject`),
};

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const expenseApi = {
  create: (body: {
    title?: string;
    category: string;
    amount: number;
    sharedWith: string[];
    guestNames?: string[];
    notes?: string;
  }) =>
    api.post<{ success: true; data: ApiExpense }>("/expenses", body),
  list: (params?: { category?: string; page?: number; limit?: number }) =>
    api.get<{ success: true; data: ApiExpense[]; pagination: { total: number; page: number; totalPages: number; hasNext: boolean } }>(
      "/expenses", { params }
    ),
  get: (id: string) =>
    api.get<{ success: true; data: ApiExpense }>(`/expenses/${id}`),
  update: (id: string, body: Partial<{ title: string; category: string; amount: number; sharedWith: string[]; guestNames: string[] }>) =>
    api.put<{ success: true; data: ApiExpense }>(`/expenses/${id}`, body),
  delete: (id: string) =>
    api.delete(`/expenses/${id}`),
  guests: () =>
    api.get<{ success: true; data: ApiGuestParticipant[] }>("/expenses/guests"),
};

// ─── Balances ─────────────────────────────────────────────────────────────────

export const balanceApi = {
  all: () =>
    api.get<{ success: true; data: ApiBalance[] }>("/balances"),
  simplified: () =>
    api.get<{ success: true; data: DebtEdge[] }>("/balances/simplified"),
};

// ─── Settlements ──────────────────────────────────────────────────────────────

export const settlementApi = {
  request: (toUserId: string, amount: number, note?: string) =>
    api.post<{ success: true; data: ApiSettlement }>("/settlements/request", { toUserId, amount, note }),
  approve: (id: string) =>
    api.post(`/settlements/${id}/approve`),
  reject: (id: string) =>
    api.post(`/settlements/${id}/reject`),
  list: () =>
    api.get<{ success: true; data: ApiSettlement[] }>("/settlements"),
};

// ─── Summary ──────────────────────────────────────────────────────────────────

export const summaryApi = {
  get: () =>
    api.get<{ success: true; data: ApiSummary }>("/summary"),
  category: () =>
    api.get<{ success: true; data: { category: string; total: number; count: number }[] }>("/summary/category"),
  monthly: (year: number, month: number) =>
    api.get<{ success: true; data: { totalAmount: number; totalExpenses: number; byCategory: Record<string, number> } }>(
      `/summary/monthly?year=${year}&month=${month}`
    ),
};
