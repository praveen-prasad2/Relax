import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema(
  {
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    content: { type: String, default: "" },
  },
  { timestamps: true }
);

NoteSchema.index({ folderId: 1 });
NoteSchema.index({ userId: 1 });
NoteSchema.index({ title: "text", content: "text" });

export default mongoose.models.Note || mongoose.model("Note", NoteSchema);
