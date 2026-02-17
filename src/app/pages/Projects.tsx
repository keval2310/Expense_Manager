import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Pencil, Trash2, Search, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export const Projects: React.FC = () => {
  const { session, isAdmin } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  
  // Pagination & Search
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
    if (session) {
      fetchProjects();
    }
  }, [session, page]); // Re-fetch on page change

  // Debounce search
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
      console.error('Failed to fetch projects:', error);
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
         // Assuming backend returns relative path, prepend API_URL or serve as static
         // server.js serves /uploads static folder.
         // fileUrl is like /uploads/filename.ext
         // We can store the full URL or relative. Let's store relative and adding base URL when displaying if needed.
         // Actually, let's store the full API URL for simplicity if needed, or just relative.
         // For now storing relative path returned by server.
         const fullUrl = `http://localhost:3001${data.fileUrl}`;
         setFormData(prev => ({ ...prev, ProjectLogo: fullUrl }));
         toast.success('File uploaded successfully');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        UserID: 1, // Will be ignored/overridden by backend using token user
        ProjectEndDate: formData.ProjectEndDate || null
      };

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
      toast.success('Project deleted successfully');
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
    setFormData({
      ProjectName: '',
      ProjectDetail: '',
      Description: '',
      ProjectStartDate: format(new Date(), 'yyyy-MM-dd'),
      ProjectEndDate: '',
      ProjectLogo: '',
      IsActive: true
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your active projects</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Edit' : 'Add'} Project</DialogTitle>
              <DialogDescription>
                {editingProject ? 'Update' : 'Create a new'} project record
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  value={formData.ProjectName}
                  onChange={(e) => setFormData({ ...formData, ProjectName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="detail">Project Detail</Label>
                <Input
                  id="detail"
                  value={formData.ProjectDetail}
                  onChange={(e) => setFormData({ ...formData, ProjectDetail: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.Description}
                  onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.ProjectStartDate}
                    onChange={(e) => setFormData({ ...formData, ProjectStartDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.ProjectEndDate}
                    onChange={(e) => setFormData({ ...formData, ProjectEndDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Project Logo</Label>
                <div className="flex gap-2 items-center">
                   <Input
                     id="file"
                     type="file"
                     accept="image/*"
                     onChange={handleFileUpload}
                     disabled={uploading}
                   />
                   {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
                </div>
                {formData.ProjectLogo && (
                  <div className="mt-2">
                    <img src={formData.ProjectLogo} alt="Preview" className="h-16 w-16 object-cover rounded" />
                  </div>
                )}
                <Input
                  id="logoUrl"
                  placeholder="Or enter URL directly"
                  value={formData.ProjectLogo}
                  onChange={(e) => setFormData({ ...formData, ProjectLogo: e.target.value })}
                  className="mt-2"
                />
              </div>

              <Button type="submit" className="w-full" disabled={uploading}>
                {editingProject ? 'Update' : 'Create'} Project
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No projects found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Logo</TableHead>
                    {isAdmin && <TableHead>User</TableHead>}
                    <TableHead>Project Name</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.ProjectID}>
                      <TableCell>
                        {project.ProjectLogo ? (
                          <img src={project.ProjectLogo} alt="Logo" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">NA</div>
                        )}
                      </TableCell>
                      {isAdmin && <TableCell>{project.user_name || '-'}</TableCell>}
                      <TableCell className="font-medium">{project.ProjectName}</TableCell>
                      <TableCell className="max-w-xs truncate">{project.ProjectDetail}</TableCell>
                      <TableCell>
                        {project.ProjectStartDate ? format(new Date(project.ProjectStartDate), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {project.ProjectEndDate ? format(new Date(project.ProjectEndDate), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${project.IsActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {project.IsActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(project)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(project.ProjectID)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end px-4 py-4 space-x-2 border-t dark:border-gray-700">
               <div className="text-sm text-gray-500 dark:text-gray-400 mr-4">
                  Page {page} of {Math.max(1, totalPages)}
               </div>
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => setPage(p => Math.max(1, p - 1))}
                 disabled={page === 1}
               >
                 <ChevronLeft className="w-4 h-4" />
               </Button>
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                 disabled={page >= totalPages || totalPages === 0}
               >
                 <ChevronRight className="w-4 h-4" />
               </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
