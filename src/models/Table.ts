import mongoose from "mongoose";

const TableSchema = new mongoose.Schema(
  {
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    columns: { type: [String], default: [] },
    rows: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

TableSchema.index({ folderId: 1 });
TableSchema.index({ userId: 1 });

export default mongoose.models.Table || mongoose.model("Table", TableSchema);
