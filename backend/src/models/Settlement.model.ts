import mongoose, { Document, Schema, Types } from 'mongoose';

export type SettlementStatus = 'pending' | 'approved' | 'rejected';

export interface ISettlement extends Document {
  _id: Types.ObjectId;
  fromUser: Types.ObjectId;
  toUser: Types.ObjectId;
  amount: number;
  groupId: Types.ObjectId;
  status: SettlementStatus;
  note: string;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const settlementSchema = new Schema<ISettlement>(
  {
    fromUser:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUser:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount:     { type: Number, required: true, min: [0.01, 'Amount must be > 0'] },
    groupId:    { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    note:       { type: String, trim: true, maxlength: 300, default: '' },
    resolvedAt: { type: Date, default: null },
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

settlementSchema.index({ groupId: 1, createdAt: -1 });
settlementSchema.index({ fromUser: 1 });
settlementSchema.index({ toUser: 1 });
settlementSchema.index({ status: 1 });

export const Settlement = mongoose.model<ISettlement>('Settlement', settlementSchema);
