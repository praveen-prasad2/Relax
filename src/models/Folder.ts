import mongoose from "mongoose";

const FolderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

FolderSchema.index({ userId: 1 });

export default mongoose.models.Folder || mongoose.model("Folder", FolderSchema);
