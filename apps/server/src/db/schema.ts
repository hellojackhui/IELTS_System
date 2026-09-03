import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const progress = sqliteTable(
  'progress',
  {
    userId: text('user_id').notNull(),
    wordId: text('word_id').notNull(),
    ease: real('ease').notNull(),
    interval: integer('interval').notNull(),
    repetitions: integer('repetitions').notNull(),
    due: integer('due').notNull(),
    lastReviewed: integer('last_reviewed'),
    correctCount: integer('correct_count').notNull(),
    wrongCount: integer('wrong_count').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.wordId] }) }),
);
