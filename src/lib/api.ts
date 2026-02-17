const API_URL = 'http://localhost:3001/api';

const generateId = () => crypto.randomUUID();

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
}

class ApiService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Try to parse error message from JSON body
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.statusText}`);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('API Error')) throw e; // Rethrow if it's the error we just created
        throw new Error(`API Error: ${response.statusText}`);
      }
    }

    return response.json();
  }

  // Auth (Week 7)
  async login(data: any): Promise<AuthResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async register(data: any): Promise<AuthResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(accessToken: string) {
    return this.request('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  // File Upload (Week 9)
  async uploadFile(accessToken: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    return response.json();
  }

  // Categories
  async getCategories(accessToken: string) {
    const data = await this.request('/categories', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return { categories: data.categories || [] };
  }

  async createCategory(accessToken: string, data: any) {
    const response = await this.request('/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    return { ...data, id: response.id };
  }

  async updateCategory(accessToken: string, id: string, data: any) {
    await this.request(`/categories/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    return { ...data, id };
  }

  async deleteCategory(accessToken: string, id: string) {
    await this.request(`/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return { success: true };
  }

  // Subcategories
  async getSubcategories(accessToken: string) {
    const data = await this.request('/subcategories', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return { subcategories: data.subcategories || [] };
  }

  async createSubcategory(accessToken: string, data: any) {
    const response = await this.request('/subcategories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    return { ...data, id: response.id };
  }

  async updateSubcategory(accessToken: string, id: string, data: any) {
    await this.request(`/subcategories/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    return { ...data, id };
  }

  async deleteSubcategory(accessToken: string, id: string) {
    await this.request(`/subcategories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return { success: true };
  }


  // Projects (Updated for Pagination Week 9)
  async getProjects(accessToken: string, params: { page?: number; limit?: number; search?: string } = {}) {
    const query = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 10).toString(),
      search: params.search || ''
    }).toString();

    const data = await this.request(`/projects?${query}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return { projects: data.projects || [], total: data.total };
  }

  async createProject(accessToken: string, data: any) {
    const response = await this.request('/projects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    return { ...data, ProjectID: response.id };
  }

  async updateProject(accessToken: string, id: number | string, data: any) {
    await this.request(`/projects/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    return { ...data, ProjectID: id };
  }

  async deleteProject(accessToken: string, id: number | string) {
    await this.request(`/projects/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return { success: true };
  }

  // Expenses (Updated for Pagination)
  async getExpenses(accessToken: string, params: { page?: number; limit?: number; search?: string } = {}) {
    const query = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 10).toString(),
      search: params.search || ''
    }).toString();

    const data = await this.request(`/expenses?${query}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return { expenses: data.expenses || [], total: data.total };
  }

  async createExpense(accessToken: string, data: any) {
    const response = await this.request('/expenses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    return { ...data, id: response.id };
  }

  async updateExpense(accessToken: string, id: string, data: any) {
    await this.request(`/expenses/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        date: data.date,
        amount: data.amount,
        remarks: data.remarks,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        projectId: data.projectId
      }),
    });
    return { ...data, id };
  }

  async deleteExpense(accessToken: string, id: string) {
    await this.request(`/expenses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return { success: true };
  }

  // Incomes (Updated for Pagination)
  async getIncomes(accessToken: string, params: { page?: number; limit?: number } = {}) {
    const query = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 10).toString(),
    }).toString();

    const data = await this.request(`/incomes?${query}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return { incomes: data.incomes || [], total: data.total };
  }

  async createIncome(accessToken: string, data: any) {
    const response = await this.request('/incomes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    return { ...data, id: response.id };
  }

  async updateIncome(accessToken: string, id: string, data: any) {
    await this.request(`/incomes/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    return { ...data, id };
  }

  async deleteIncome(accessToken: string, id: string) {
    await this.request(`/incomes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return { success: true };
  }

  // Analytics
  async getDashboardStats(accessToken: string) {
    return this.request('/dashboard-stats', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  async getCategoryBreakdown(accessToken: string, type: 'expense' | 'income') {
    return this.request(`/category-breakdown?type=${type}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  async getMonthlyTrends(accessToken: string, months: number = 12) {
    return this.request('/monthly-trends', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  async getProjectBreakdown(accessToken: string) {
    return this.request('/project-breakdown', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  async updateProfile(accessToken: string, data: { name: string; email: string }) {
    return this.request('/users/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
  }

  async updatePassword(accessToken: string, data: { current: string; new: string }) {
    return this.request('/users/password', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ currentPassword: data.current, newPassword: data.new }),
    });
  }

  // Users
  async getUsers(accessToken: string) {
    const data = await this.request('/users', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return { users: data.users || [] };
  }
}

export const api = new ApiService();
