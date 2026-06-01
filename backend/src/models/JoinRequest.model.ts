import mongoose, { Document, Schema, Types } from 'mongoose';

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';
export type MemberType = 'permanent' | 'occasional'; // occasional = guest who splits sometimes

export interface IJoinRequest extends Document {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  userId: Types.ObjectId;
  memberType: MemberType;
  status: JoinRequestStatus;
  message: string;
  resolvedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const joinRequestSchema = new Schema<IJoinRequest>(
  {
    groupId:    { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    userId:     { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    memberType: { type: String, enum: ['permanent', 'occasional'], default: 'permanent' },
    status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    message:    { type: String, trim: true, maxlength: 200, default: '' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
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

joinRequestSchema.index({ groupId: 1, status: 1 });
joinRequestSchema.index({ userId: 1 });
// Prevent duplicate pending requests at the database level.
joinRequestSchema.index(
  { groupId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  },
);

export const JoinRequest = mongoose.model<IJoinRequest>('JoinRequest', joinRequestSchema);
