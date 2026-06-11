import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    displayName: {
      type: String,
      trim: true,
      default: ''
    },
    passwordHash: {
      type: String,
      required: true
    },
    cashBalance: {
      type: Number,
      default: 10000
    }
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (_document, returnedObject) => {
    delete returnedObject.passwordHash;
    delete returnedObject.__v;
    return returnedObject;
  }
});

export const User = mongoose.model('User', userSchema);