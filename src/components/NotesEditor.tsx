"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { HiOutlinePlus, HiOutlineArrowLeft, HiOutlinePencilSquare } from "react-icons/hi2";
import remarkGfm from "remark-gfm";

interface NoteData {
  _id: string;
  title: string;
  content: string;
}

export function NotesEditor({ folderId }: { folderId: string }) {
  const queryClient = useQueryClient();
  const [selectedNote, setSelectedNote] = useState<NoteData | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: notes, isLoading } = useQuery({
    queryKey: ["notes", folderId],
    queryFn: () => fetch(`/api/folders/${folderId}/notes`).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      fetch(`/api/folders/${folderId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", folderId] });
      setNewNoteTitle("");
      setShowCreate(false);
    },
  });

  if (selectedNote) {
    return (
      <NoteDetail
        note={selectedNote}
        folderId={folderId}
        onBack={() => setSelectedNote(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {showCreate ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl bg-white p-4 shadow-sm border border-[#E5E7EB]"
        >
          <input
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
            placeholder="Note title"
            className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3"
            autoFocus
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => createMutation.mutate(newNoteTitle.trim() || "Untitled")}
              disabled={createMutation.isPending}
              className="rounded-xl bg-[#4F46E5] px-4 py-2 text-white font-medium"
            >
              Create
            </button>
            <button onClick={() => { setShowCreate(false); setNewNoteTitle(""); }} className="rounded-xl border px-4 py-2">
              Cancel
            </button>
          </div>
        </motion.div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E5E7EB] py-4 text-[#6B7280]"
        >
          <HiOutlinePlus className="h-5 w-5" />
          New note
        </button>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-[#E5E7EB]" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(notes ?? []).map((n: NoteData) => (
            <motion.button
              key={n._id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedNote(n)}
              className="flex w-full items-start gap-3 rounded-xl bg-white p-4 text-left shadow-sm border border-[#E5E7EB]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-amber-600">
                <HiOutlinePencilSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-[#111827] block truncate">{n.title}</span>
                <span className="text-sm text-[#6B7280] line-clamp-2">
                  {n.content?.slice(0, 80) || "Empty note"}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteDetail({ note, folderId, onBack }: { note: NoteData; folderId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [preview, setPreview] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (body: { title?: string; content?: string }) =>
      fetch(`/api/notes/${note._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", folderId] });
    },
  });

  const debouncedSave = useCallback(() => {
    updateMutation.mutate({ title, content });
  }, [title, content]);

  useEffect(() => {
    const t = setTimeout(debouncedSave, 800);
    return () => clearTimeout(t);
  }, [title, content, debouncedSave]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#4F46E5]">
        <HiOutlineArrowLeft className="h-4 w-4" />
        Back
      </button>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-xl font-semibold text-[#111827] bg-transparent border-b border-transparent focus:border-[#E5E7EB] focus:outline-none pb-2"
        placeholder="Title"
      />
      <div className="flex gap-2">
        <button
          onClick={() => setPreview(false)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!preview ? "bg-[#4F46E5] text-white" : "bg-[#F3F4F6] text-[#6B7280]"}`}
        >
          Edit
        </button>
        <button
          onClick={() => setPreview(true)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${preview ? "bg-[#4F46E5] text-white" : "bg-[#F3F4F6] text-[#6B7280]"}`}
        >
          Preview
        </button>
      </div>
      {preview ? (
        <div className="prose prose-sm max-w-none rounded-xl border border-[#E5E7EB] bg-white p-4 min-h-[200px]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*No content*"}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing... (Markdown supported)"
          className="w-full min-h-[300px] rounded-xl border border-[#E5E7EB] p-4 text-[#111827] placeholder-[#9CA3AF] resize-y"
        />
      )}
      <span className="text-xs text-[#6B7280]">Autosaved</span>
    </motion.div>
  );
}
