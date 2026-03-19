import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';
import { User, Mail, Lock, Shield } from 'lucide-react';

export const Profile: React.FC = () => {
  const { session, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  useEffect(() => {
    if (session && user) {
      setProfileForm({ name: user.name || '', email: user.email || '' });
    }
  }, [session, user]);

  const getInitials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateProfile(session.access_token, profileForm);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.updatePassword(session.access_token, { current: passwordForm.current, new: passwordForm.new });
      toast.success('Password updated successfully');
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your account and security preferences</p>
      </div>

      {/* User card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarFallback className="bg-[#1d6aef] text-white text-lg font-bold">
              {user ? getInitials(user.name) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{user?.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Shield className="w-3 h-3 text-[#1d6aef]" />
              <span className="text-xs font-medium text-[#1d6aef] capitalize">{user?.role?.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg h-auto mb-4 w-fit">
          <TabsTrigger value="general" className="rounded-md text-sm py-1.5 px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all">
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-md text-sm py-1.5 px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all">
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-0">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 bg-[#e8f0fe] dark:bg-blue-900/20 rounded-md flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-[#1d6aef]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Personal Information</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Update your name and email address</p>
              </div>
            </div>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium text-gray-600 dark:text-gray-400">Full Name</Label>
                <Input id="name" value={profileForm.name}
                  onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-gray-600 dark:text-gray-400">Email Address</Label>
                <Input id="email" type="email" value={profileForm.email}
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg" required />
              </div>
              <div className="flex justify-end pt-1">
                <button type="submit" disabled={loading}
                  className="px-5 py-2 text-sm font-medium bg-[#1d6aef] text-white rounded-lg hover:bg-[#1558cc] disabled:opacity-60 transition-colors">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 bg-amber-50 dark:bg-amber-900/20 rounded-md flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Change Password</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Keep your account secure with a strong password</p>
              </div>
            </div>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current" className="text-xs font-medium text-gray-600 dark:text-gray-400">Current Password</Label>
                <Input id="current" type="password" value={passwordForm.current}
                  onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new" className="text-xs font-medium text-gray-600 dark:text-gray-400">New Password</Label>
                <Input id="new" type="password" value={passwordForm.new}
                  onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                  className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-xs font-medium text-gray-600 dark:text-gray-400">Confirm New Password</Label>
                <Input id="confirm" type="password" value={passwordForm.confirm}
                  onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg" required />
              </div>
              <div className="flex justify-end pt-1">
                <button type="submit" disabled={loading}
                  className="px-5 py-2 text-sm font-medium bg-[#1d6aef] text-white rounded-lg hover:bg-[#1558cc] disabled:opacity-60 transition-colors">
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
