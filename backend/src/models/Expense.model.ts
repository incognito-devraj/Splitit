import mongoose, { Document, Schema, Types } from 'mongoose';

export const CATEGORIES = [
  'food', 'grocery', 'electricity', 'wifi',
  'rent', 'gas', 'maid', 'water', 'other',
] as const;

export type ExpenseCategory = typeof CATEGORIES[number];

export interface IExpense extends Document {
  _id: Types.ObjectId;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paidBy: Types.ObjectId;
  sharedWith: Types.ObjectId[];
  splitAmount: number;
  notes: string;
  groupId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    title: { type: String, trim: true, maxlength: 200, default: '' },
    category: { type: String, enum: CATEGORIES, required: true },
    amount: { type: Number, required: true, min: [0.01, 'Amount must be > 0'] },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: { validator: (a: Types.ObjectId[]) => a.length >= 1, message: 'sharedWith must have at least 1 member' },
    },
    splitAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
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

expenseSchema.index({ groupId: 1, createdAt: -1 });
expenseSchema.index({ groupId: 1, category: 1 });
expenseSchema.index({ paidBy: 1 });

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
