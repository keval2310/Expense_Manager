import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

export const Users: React.FC = () => {
  const { session, isAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session && isAdmin) {
      fetchUsers();
    }
  }, [session, isAdmin]);

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers(session.access_token);
      setUsers(data.users || []);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };


  const handleRoleChange = async (userId: string, newRole: string) => {
      try {
          const userToUpdate = users.find(u => u.id === userId);
          if(!userToUpdate) return;
          
          await api.updateUser(session.access_token, userId, { ...userToUpdate, role: newRole });
          toast.success('User role updated');
          fetchUsers();
      } catch (error) {
          toast.error('Failed to update role');
      }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-500">Access denied. Admin only.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-64">Loading users...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">Manage system users and permissions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-blue-600 text-white">
                    {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{user.name}</CardTitle>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize mb-2">
                  {user.role}
                </Badge>
                {/* Role Switcher */}
                <Select
                    defaultValue={user.role}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                >
                    <SelectTrigger className="w-[100px] h-8 text-xs">
                        <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UsersIcon className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No users found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
