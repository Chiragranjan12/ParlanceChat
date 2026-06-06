import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth, API } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { Crown, Trash2, Plus, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import UserAvatar from '@/components/UserAvatar';

/**
 * Group members sidebar panel
 * Shows all members with their roles and allows admin to manage them
 */
export default function GroupMembers({ groupId, currentUserRole = 'member', onMembersChange }) {
  const { user } = useAuth();
  const { onlineUsers } = useChat();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // Load members
  useEffect(() => {
    const loadMembers = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API}/groups/${groupId}/members`, {
          withCredentials: true,
        });
        setMembers(data || []);
      } catch (err) {
        toast.error('Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    if (groupId) {
      loadMembers();
      // Refresh every 30 seconds
      const interval = setInterval(loadMembers, 30000);
      return () => clearInterval(interval);
    }
  }, [groupId]);

  // Load users for adding member dialog
  useEffect(() => {
    if (addMemberOpen) {
      const loadUsers = async () => {
        try {
          const { data } = await axios.get(`${API}/users/search?q=`, {
            withCredentials: true,
          });
          // Filter out current members
          const currentMemberIds = members.map(m => m.userId);
          setAllUsers((data || []).filter(u => !currentMemberIds.includes(u.id)));
        } catch (err) {
          // Silently fail
        }
      };
      loadUsers();
    }
  }, [addMemberOpen, members]);

  const handleRemoveMember = async () => {
    if (!removingMemberId) return;

    try {
      await axios.delete(`${API}/groups/${groupId}/members/${removingMemberId}`, {
        withCredentials: true,
      });
      setMembers(m => m.filter(member => member.userId !== removingMemberId));
      toast.success('Member removed');
      setRemovingMemberId(null);
      onMembersChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
      setRemovingMemberId(null);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error('Select a member to add');
      return;
    }

    setAddingMember(true);
    try {
      await axios.post(
        `${API}/groups/${groupId}/members`,
        { userId: selectedUserId },
        { withCredentials: true }
      );
      toast.success('Member added successfully');
      setSelectedUserId('');
      setAddMemberOpen(false);
      
      // Reload members
      const { data } = await axios.get(`${API}/groups/${groupId}/members`, {
        withCredentials: true,
      });
      setMembers(data || []);
      onMembersChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="w-5 h-5 animate-spin text-gray-500" />
      </div>
    );
  }

  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Members ({members.length})
        </h3>
        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAddMemberOpen(true)}
            className="p-1 h-auto"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto">
        {members.map(member => (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
          >
            <div className="relative">
              <UserAvatar user={{ avatarUrl: member.avatarUrl, username: member.username }} size="sm" />
              {member.isOnline && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white dark:border-gray-800" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {member.displayName || member.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">@{member.username}</p>
            </div>

            {/* Admin Badge */}
            {member.role === 'admin' && (
              <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" title="Group Admin" />
            )}

            {/* Remove Button (Admin Only) */}
            {isAdmin && member.userId !== user?.id && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRemovingMemberId(member.userId)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto text-red-500 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}

            {/* Current User Label */}
            {member.userId === user?.id && (
              <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                You
              </span>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <div className="flex items-center justify-center h-20 text-gray-500">
            No members yet
          </div>
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member to Group</DialogTitle>
            <DialogDescription>
              Select a user to add to this group
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select User</label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Choose a user...</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.displayName || u.username} (@{u.username})
                  </option>
                ))}
              </select>
            </div>

            {allUsers.length === 0 && (
              <p className="text-sm text-gray-500">
                All users are already members of this group
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setAddMemberOpen(false)}
              disabled={addingMember}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={!selectedUserId || addingMember}
            >
              {addingMember ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removingMemberId} onOpenChange={() => setRemovingMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the group? They will no longer see messages or be part of this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-red-500 hover:bg-red-600">
              Remove
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
