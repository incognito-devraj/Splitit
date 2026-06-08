import mongoose, { Document, Schema, Types } from 'mongoose';

export const CATEGORIES = [
  'food', 'grocery', 'electricity', 'wifi',
  'rent', 'gas', 'maid', 'water', 'lend', 'treat',
  'transport', 'tuition', 'waterbill', 'gasbill', 'other',
] as const;

export type ExpenseCategory = typeof CATEGORIES[number];

export interface IExpense extends Document {
  _id: Types.ObjectId;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paidBy: Types.ObjectId;
  sharedWith: Types.ObjectId[];
  guestParticipants: Types.ObjectId[];
  splitAmount: number;
  totalParticipants: number;
  notes: string;
  groupId: Types.ObjectId;
  isEdited: boolean;          // true once the expense has been updated
  isDeleted: boolean;         // soft-delete flag
  deletedAt: Date | null;     // when it was soft-deleted
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    title:    { type: String, trim: true, maxlength: 200, default: '' },
    category: { type: String, enum: CATEGORIES, required: true },
    amount:   { type: Number, required: true, min: [0.01, 'Amount must be > 0'] },
    paidBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: {
        validator: function (this: IExpense, a: Types.ObjectId[]) {
          // At least 1 participant total (member or guest)
          return a.length + (this.guestParticipants?.length ?? 0) >= 1;
        },
        message: 'Expense must have at least 1 participant',
      },
    },
    guestParticipants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'GuestParticipant' }],
      default: [],
    },
    splitAmount:      { type: Number, required: true, min: 0 },
    totalParticipants:{ type: Number, required: true, min: 1 },
    notes:    { type: String, trim: true, maxlength: 500, default: '' },
    groupId:  { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret['__v'];
        // Normalise soft-delete fields so they're always present in API responses
        if (ret['isDeleted'] === undefined) ret['isDeleted'] = false;
        if (ret['deletedAt'] === undefined) ret['deletedAt'] = null;
        return ret;
      },
    },
  },
);

expenseSchema.index({ groupId: 1, createdAt: -1 });
expenseSchema.index({ groupId: 1, category: 1 });
expenseSchema.index({ paidBy: 1 });

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
