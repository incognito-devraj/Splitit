import mongoose, { Document, Schema, Types } from 'mongoose';

export type AuditAction = 'created' | 'updated' | 'deleted';

export interface IExpenseAudit extends Document {
  _id: Types.ObjectId;
  expenseId: Types.ObjectId;
  groupId: Types.ObjectId;
  action: AuditAction;
  editedBy: Types.ObjectId;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown>;
  createdAt: Date;
}

const auditSchema = new Schema<IExpenseAudit>(
  {
    expenseId: { type: Schema.Types.ObjectId, ref: 'Expense', required: true },
    groupId:   { type: Schema.Types.ObjectId, ref: 'Group',   required: true },
    action:    { type: String, enum: ['created', 'updated', 'deleted'], required: true },
    editedBy:  { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    oldData:   { type: Schema.Types.Mixed, default: null },
    newData:   { type: Schema.Types.Mixed, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret['__v'];
        return ret;
      },
    },
  },
);

auditSchema.index({ expenseId: 1, createdAt: -1 });
auditSchema.index({ groupId: 1 });

export const ExpenseAudit = mongoose.model<IExpenseAudit>('ExpenseAudit', auditSchema);
