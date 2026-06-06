import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth, API } from '@/contexts/AuthContext';
import { Settings, Save, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

/**
 * Group settings dialog
 * Allows admin to edit group name/description and delete group
 */
export default function GroupSettings({ groupId, groupName = '', groupDescription = '', isAdmin = false, onGroupUpdated, onGroupDeleted }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: groupName,
    description: groupDescription,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleNameChange = (e) => {
    const name = e.target.value.slice(0, 255);
    setFormData(prev => ({ ...prev, name }));
  };

  const handleDescriptionChange = (e) => {
    const desc = e.target.value.slice(0, 1000);
    setFormData(prev => ({ ...prev, description: desc }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setSaving(true);
    try {
      await axios.put(
        `${API}/groups/${groupId}`,
        {
          name: formData.name.trim(),
          description: formData.description.trim(),
        },
        { withCredentials: true }
      );
      toast.success('Group updated successfully');
      onGroupUpdated?.(formData);
      setOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/groups/${groupId}`, {
        withCredentials: true,
      });
      toast.success('Group deleted successfully');
      setDeleteConfirmOpen(false);
      setOpen(false);
      onGroupDeleted?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setDeleting(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="p-2 h-auto"
        title="Group Settings"
      >
        <Settings className="w-5 h-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Group Settings</DialogTitle>
            <DialogDescription>
              Manage your group name, description, and other settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Group Name
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="Group name"
                maxLength={255}
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.name.length}/255 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={handleDescriptionChange}
                placeholder="What is this group about?"
                maxLength={1000}
                disabled={saving}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/1000 characters
              </p>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-red-200 dark:border-red-900">
              <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" />
                Danger Zone
              </h4>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={saving || deleting}
                className="w-full flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Group
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                This will permanently delete the group and all messages. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !formData.name.trim() ||
                (formData.name === groupName && formData.description === groupDescription)
              }
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? This action cannot be undone. All messages and member associations will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? 'Deleting...' : 'Delete Group'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
