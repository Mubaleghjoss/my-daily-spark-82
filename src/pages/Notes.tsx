import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, GripVertical, Pencil, Trash2, StickyNote, Clock, CheckCircle2, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Note {
  id: string;
  title: string;
  content: string | null;
  status: 'todo' | 'in_progress' | 'done';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

type NoteStatus = 'todo' | 'in_progress' | 'done';

const statusConfig = {
  todo: {
    label: 'To Do',
    icon: StickyNote,
    color: 'bg-yellow-500/10 border-yellow-500/30',
    headerColor: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    color: 'bg-blue-500/10 border-blue-500/30',
    headerColor: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  },
  done: {
    label: 'Done',
    icon: CheckCircle2,
    color: 'bg-green-500/10 border-green-500/30',
    headerColor: 'bg-green-500/20 text-green-700 dark:text-green-400',
  },
};

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [draggedNote, setDraggedNote] = useState<Note | null>(null);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setNotes((data || []) as Note[]);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Gagal memuat catatan');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!user || !newNote.title.trim()) return;

    try {
      const maxOrder = Math.max(...notes.filter(n => n.status === 'todo').map(n => n.sort_order), -1);
      
      const { error } = await supabase.from('notes').insert({
        user_id: user.id,
        title: newNote.title,
        content: newNote.content || null,
        status: 'todo',
        sort_order: maxOrder + 1,
      });

      if (error) throw error;
      toast.success('Catatan berhasil ditambahkan');
      setNewNote({ title: '', content: '' });
      setShowAddNote(false);
      fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Gagal menambahkan catatan');
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: editingNote.title,
          content: editingNote.content,
        })
        .eq('id', editingNote.id);

      if (error) throw error;
      toast.success('Catatan berhasil diperbarui');
      setEditingNote(null);
      fetchNotes();
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Gagal memperbarui catatan');
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Catatan berhasil dihapus');
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Gagal menghapus catatan');
    }
  };

  const handleDragStart = (e: React.DragEvent, note: Note) => {
    setDraggedNote(note);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: NoteStatus) => {
    e.preventDefault();
    if (!draggedNote || draggedNote.status === targetStatus) {
      setDraggedNote(null);
      return;
    }

    try {
      const maxOrder = Math.max(...notes.filter(n => n.status === targetStatus).map(n => n.sort_order), -1);
      
      const { error } = await supabase
        .from('notes')
        .update({ status: targetStatus, sort_order: maxOrder + 1 })
        .eq('id', draggedNote.id);

      if (error) throw error;
      
      setNotes(prev => prev.map(n => 
        n.id === draggedNote.id ? { ...n, status: targetStatus, sort_order: maxOrder + 1 } : n
      ));
      
      toast.success(`Catatan dipindahkan ke ${statusConfig[targetStatus].label}`);
    } catch (error) {
      console.error('Error updating note status:', error);
      toast.error('Gagal memperbarui status');
    }
    
    setDraggedNote(null);
  };

  const getNotesByStatus = (status: NoteStatus) => 
    notes.filter(note => note.status === status).sort((a, b) => a.sort_order - b.sort_order);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Catatan</h1>
            <p className="text-muted-foreground">Kelola catatan pekerjaan & rapat</p>
          </div>
          
          <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Catatan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Catatan Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Judul catatan"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                />
                <Textarea
                  placeholder="Isi catatan (opsional)"
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  rows={4}
                />
                <Button onClick={handleAddNote} className="w-full">
                  Simpan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(statusConfig) as NoteStatus[]).map((status) => {
            const config = statusConfig[status];
            const StatusIcon = config.icon;
            const statusNotes = getNotesByStatus(status);

            return (
              <div
                key={status}
                className={`rounded-xl border-2 ${config.color} min-h-[400px] transition-all ${
                  draggedNote && draggedNote.status !== status ? 'ring-2 ring-primary/50' : ''
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header */}
                <div className={`px-4 py-3 rounded-t-lg ${config.headerColor} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <StatusIcon className="w-4 h-4" />
                    <span className="font-semibold">{config.label}</span>
                  </div>
                  <span className="text-sm font-medium bg-background/50 px-2 py-0.5 rounded-full">
                    {statusNotes.length}
                  </span>
                </div>

                {/* Notes List */}
                <div className="p-3 space-y-3">
                  {statusNotes.map((note) => (
                    <Card
                      key={note.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, note)}
                      onClick={() => setViewingNote(note)}
                      className={`cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-primary/50 ${
                        draggedNote?.id === note.id ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{note.title}</h4>
                            {note.content && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {note.content}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(note.updated_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                            </p>
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingNote(note)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {statusNotes.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Tidak ada catatan
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Note Dialog */}
      <Dialog open={!!viewingNote} onOpenChange={() => setViewingNote(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              Detail Catatan
            </DialogTitle>
          </DialogHeader>
          {viewingNote && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Judul</label>
                <h3 className="text-lg font-semibold mt-1">{viewingNote.title}</h3>
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deskripsi</label>
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                  {viewingNote.content || <span className="italic text-muted-foreground">Tidak ada deskripsi</span>}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Dibuat: {format(new Date(viewingNote.created_at), 'dd MMMM yyyy, HH:mm', { locale: id })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Diperbarui: {format(new Date(viewingNote.updated_at), 'dd MMMM yyyy, HH:mm', { locale: id })}</span>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setViewingNote(null);
                    setEditingNote(viewingNote);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => {
                    handleDeleteNote(viewingNote.id);
                    setViewingNote(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Catatan</DialogTitle>
          </DialogHeader>
          {editingNote && (
            <div className="space-y-4">
              <Input
                placeholder="Judul catatan"
                value={editingNote.title}
                onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
              />
              <Textarea
                placeholder="Isi catatan"
                value={editingNote.content || ''}
                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                rows={4}
              />
              <Button onClick={handleUpdateNote} className="w-full">
                Simpan Perubahan
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
