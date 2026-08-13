import type { Database } from '@shared/db/types';
import { nowIso } from '@shared/lib/date';
import { createId } from '@shared/lib/id';

import type { ExerciseCommentEntry } from '../model/types';

type CommentRow = {
  id: string;
  exercise_id: string;
  text: string;
  created_at: string;
};

const toComment = (row: CommentRow): ExerciseCommentEntry => ({
  id: row.id,
  exerciseId: row.exercise_id,
  text: row.text,
  createdAt: row.created_at,
});

export class ExerciseCommentRepository {
  constructor(private readonly db: Database) {}

  async list(exerciseId: string): Promise<ExerciseCommentEntry[]> {
    const rows = await this.db.getAll<CommentRow>(
      `SELECT id, exercise_id, text, created_at
       FROM exercise_comment_entries
       WHERE exercise_id = ?
       ORDER BY created_at DESC, rowid DESC`,
      [exerciseId],
    );
    return rows.map(toComment);
  }

  async getCurrent(exerciseId: string): Promise<ExerciseCommentEntry | null> {
    const row = await this.db.getFirst<CommentRow>(
      `SELECT id, exercise_id, text, created_at
       FROM exercise_comment_entries
       WHERE exercise_id = ?
       ORDER BY created_at DESC, rowid DESC
       LIMIT 1`,
      [exerciseId],
    );
    return row ? toComment(row) : null;
  }

  async save(exerciseId: string, text: string): Promise<ExerciseCommentEntry | null> {
    const normalizedText = text.trim();
    const current = await this.getCurrent(exerciseId);
    if ((current?.text ?? '') === normalizedText) {
      return null;
    }
    const entry: ExerciseCommentEntry = {
      id: createId(),
      exerciseId,
      text: normalizedText,
      createdAt: nowIso(),
    };
    await this.insert(entry);
    return entry;
  }

  async import(entries: ExerciseCommentEntry[]): Promise<number> {
    let imported = 0;
    await this.db.transaction(async () => {
      for (const entry of entries) {
        const existing = await this.db.getFirst<{ id: string }>(
          'SELECT id FROM exercise_comment_entries WHERE id = ?',
          [entry.id],
        );
        if (!existing) {
          await this.insert(entry);
          imported += 1;
        }
      }
    });
    return imported;
  }

  async listAll(): Promise<ExerciseCommentEntry[]> {
    const rows = await this.db.getAll<CommentRow>(
      `SELECT id, exercise_id, text, created_at
       FROM exercise_comment_entries
       ORDER BY created_at ASC`,
    );
    return rows.map(toComment);
  }

  private async insert(entry: ExerciseCommentEntry): Promise<void> {
    await this.db.execute(
      `INSERT INTO exercise_comment_entries (id, exercise_id, text, created_at)
       VALUES (?, ?, ?, ?)`,
      [entry.id, entry.exerciseId, entry.text, entry.createdAt],
    );
  }
}
