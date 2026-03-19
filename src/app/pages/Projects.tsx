import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export const Projects: React.FC = () => {
  const { session, isAdmin } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    ProjectName: '',
    ProjectDetail: '',
    Description: '',
    ProjectStartDate: format(new Date(), 'yyyy-MM-dd'),
    ProjectEndDate: '',
    ProjectLogo: '',
    IsActive: true
  });

  useEffect(() => {
    if (session) fetchProjects();
  }, [session, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (session) fetchProjects();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects(session.access_token, { page, limit, search: searchTerm });
      setProjects(data.projects || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const data = await api.uploadFile(session.access_token, file);
      if (data.fileUrl) {
        const API_BASE = window.location.origin.replace(':5173', ':3001');
        setFormData(prev => ({ ...prev, ProjectLogo: `${API_BASE}${data.fileUrl}` }));
        toast.success('Logo uploaded');
      }
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSubmit = { ...formData, UserID: 1, ProjectEndDate: formData.ProjectEndDate || null };
      if (editingProject) {
        await api.updateProject(session.access_token, editingProject.ProjectID, dataToSubmit);
        toast.success('Project updated successfully');
      } else {
        await api.createProject(session.access_token, dataToSubmit);
        toast.success('Project created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchProjects();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save project');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.deleteProject(session.access_token, id);
      toast.success('Project deleted');
      fetchProjects();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete project');
    }
  };

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setFormData({
      ProjectName: project.ProjectName,
      ProjectDetail: project.ProjectDetail || '',
      Description: project.Description || '',
      ProjectStartDate: project.ProjectStartDate ? new Date(project.ProjectStartDate).toISOString().split('T')[0] : '',
      ProjectEndDate: project.ProjectEndDate ? new Date(project.ProjectEndDate).toISOString().split('T')[0] : '',
      ProjectLogo: project.ProjectLogo || '',
      IsActive: project.IsActive
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProject(null);
    setFormData({ ProjectName: '', ProjectDetail: '', Description: '', ProjectStartDate: format(new Date(), 'yyyy-MM-dd'), ProjectEndDate: '', ProjectLogo: '', IsActive: true });
  };

  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage and track your projects</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-1.5 px-4 py-2 bg-[#1d6aef] text-white text-sm font-medium rounded-lg hover:bg-[#1558cc] transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              Add Project
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl">
            <DialogHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
              <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                {editingProject ? 'Edit Project' : 'Add New Project'}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                {editingProject ? 'Update the project details.' : 'Fill in the details to create a new project.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Project Name <span className="text-red-500">*</span></Label>
                <Input value={formData.ProjectName} onChange={(e) => setFormData({ ...formData, ProjectName: e.target.value })}
                  placeholder="Enter project name" className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg" required />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Project Detail <span className="text-gray-400">(optional)</span></Label>
                <Input value={formData.ProjectDetail} onChange={(e) => setFormData({ ...formData, ProjectDetail: e.target.value })}
                  placeholder="Brief detail" className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description <span className="text-gray-400">(optional)</span></Label>
                <Textarea value={formData.Description} onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                  placeholder="Full description..." className="text-sm border-gray-200 dark:border-gray-700 rounded-lg resize-none" rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Start Date</Label>
                  <Input type="date" value={formData.ProjectStartDate} onChange={(e) => setFormData({ ...formData, ProjectStartDate: e.target.value })}
                    className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">End Date <span className="text-gray-400">(optional)</span></Label>
                  <Input type="date" value={formData.ProjectEndDate} onChange={(e) => setFormData({ ...formData, ProjectEndDate: e.target.value })}
                    className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Project Logo</Label>
                <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading}
                  className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg" />
                {uploading && <p className="text-xs text-blue-500">Uploading...</p>}
                {formData.ProjectLogo && (
                  <img src={formData.ProjectLogo} alt="Preview" className="h-12 w-12 object-cover rounded-lg mt-2 border border-gray-200" />
                )}
                <Input placeholder="Or paste logo URL" value={formData.ProjectLogo}
                  onChange={(e) => setFormData({ ...formData, ProjectLogo: e.target.value })}
                  className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg mt-2" />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input type="checkbox" id="isActive" checked={formData.IsActive}
                  onChange={(e) => setFormData({ ...formData, IsActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#1d6aef] focus:ring-[#1d6aef]" />
                <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">Mark as Active</label>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setDialogOpen(false); resetForm(); }}
                  className="flex-1 h-9 text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={uploading}
                  className="flex-1 h-9 text-sm font-medium bg-[#1d6aef] text-white rounded-lg hover:bg-[#1558cc] disabled:opacity-60 transition-colors">
                  {editingProject ? 'Update' : 'Create'} Project
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Search projects..." value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full h-8 pl-9 pr-3 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d6aef]/20 focus:border-[#1d6aef] transition-colors" />
          </div>
          {total > 0 && <span className="text-xs text-gray-500 flex-shrink-0">Showing {startItem}–{endItem} of {total}</span>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#1d6aef] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading projects...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No projects found</p>
              <p className="text-xs text-gray-400 mt-0.5">Create your first project to get started</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Project</th>
                    {isAdmin && <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">User</th>}
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Detail</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Duration</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {projects.map((project) => (
                    <tr key={project.ProjectID} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {project.ProjectLogo ? (
                            <img src={project.ProjectLogo} alt="Logo"
                              className="w-8 h-8 rounded-lg object-cover border border-gray-100 dark:border-gray-800 flex-shrink-0"
                              onError={(e: any) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                              <FolderKanban className="w-4 h-4 text-[#1d6aef] dark:text-blue-400" />
                            </div>
                          )}
                          <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">{project.ProjectName}</span>
                        </div>
                      </td>
                      {isAdmin && <td className="px-5 py-3.5 text-[13px] text-gray-500 dark:text-gray-400">{project.user_name || '-'}</td>}
                      <td className="px-5 py-3.5 max-w-[200px]">
                        <span className="text-[13px] text-gray-500 dark:text-gray-400 truncate block">{project.ProjectDetail || <span className="text-gray-300 dark:text-gray-600">—</span>}</span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {project.ProjectStartDate ? format(new Date(project.ProjectStartDate), 'MMM dd, yyyy') : '—'}
                        {project.ProjectEndDate && <> → {format(new Date(project.ProjectEndDate), 'MMM dd, yyyy')}</>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          project.IsActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                        }`}>
                          {project.IsActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 rounded-md text-gray-400 hover:text-[#1d6aef] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" onClick={() => handleEdit(project)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={() => handleDelete(project.ProjectID)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <span className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {Math.max(1, totalPages)}</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || totalPages === 0}
                  className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
