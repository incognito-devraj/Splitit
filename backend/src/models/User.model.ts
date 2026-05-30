import mongoose, { Document, Schema, Types } from 'mongoose';

export type UserRole = 'admin' | 'member';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  avatar: string;
  googleId: string;
  role: UserRole;
  groupId: Types.ObjectId | null;
  groupIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    avatar: { type: String, default: '' },
    googleId: { type: String, required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
    groupIds: [{ type: Schema.Types.ObjectId, ref: 'Group', default: [] }],
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret['googleId'];
        delete ret['__v'];
        ret['activeGroupId'] = ret['groupId'] ?? null;
        return ret;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true });
userSchema.index({ groupId: 1 });
userSchema.index({ groupIds: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
