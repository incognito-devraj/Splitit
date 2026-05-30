import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * GuestParticipant — a named person who participates in an expense
 * but does NOT have an account. They exist only within expense records.
 *
 * Architecture choice: separate collection (not embedded) so we can:
 * - Query "all guests ever added" for autocomplete
 * - Reference them from multiple expenses without duplication
 * - Keep Expense.sharedWith clean (ObjectId refs)
 *
 * Each guest is scoped to a group so names don't leak across groups.
 */
export interface IGuestParticipant extends Document {
  _id: Types.ObjectId;
  name: string;
  groupId: Types.ObjectId;
  createdBy: Types.ObjectId; // user who first added this guest
  createdAt: Date;
  updatedAt: Date;
}

const guestSchema = new Schema<IGuestParticipant>(
  {
    name:      { type: String, required: true, trim: true, maxlength: 100 },
    groupId:   { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User',  required: true },
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

// Unique guest name per group (case-insensitive handled at service layer)
guestSchema.index({ groupId: 1, name: 1 });
guestSchema.index({ groupId: 1 });

export const GuestParticipant = mongoose.model<IGuestParticipant>('GuestParticipant', guestSchema);
