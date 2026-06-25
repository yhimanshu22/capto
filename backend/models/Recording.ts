import mongoose, { Schema, Document } from 'mongoose';

export interface IRecording extends Document {
  title: string;
  duration: number;
  fileName: string;
  size: number;
  userId?: string;
  createdAt: Date;
}

const RecordingSchema: Schema = new Schema({
  title: { type: String, default: 'Untitled Recording' },
  duration: { type: Number, default: 0 },
  fileName: { type: String, required: true },
  size: { type: Number, required: true },
  userId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Transform _id to id for frontend compatibility
RecordingSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

export default mongoose.model<IRecording>('Recording', RecordingSchema);
