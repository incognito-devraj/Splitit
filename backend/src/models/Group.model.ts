import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGroup extends Document {
  _id: Types.ObjectId;
  name: string;
  inviteCode: string;
  adminId: Types.ObjectId;
  members: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    inviteCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret['__v'];
        return ret;
      },
    },
  },
);

groupSchema.index({ inviteCode: 1 }, { unique: true });
groupSchema.index({ adminId: 1 });

export const Group = mongoose.model<IGroup>('Group', groupSchema);
