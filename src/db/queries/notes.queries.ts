import { eq, like, desc } from "drizzle-orm";
import { getDb } from "../client.js";
import { notes } from "../schema.js";

export function createNote(note: typeof notes.$inferInsert) {
  return getDb()
    .insert(notes)
    .values({ ...note, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .returning()
    .get();
}

export function updateNote(noteId: number, content: string) {
  return getDb()
    .update(notes)
    .set({ content, updatedAt: new Date().toISOString() })
    .where(eq(notes.id, noteId));
}

export function getNotesByCategory(category: string, limit = 10) {
  return getDb()
    .select()
    .from(notes)
    .where(eq(notes.category, category))
    .orderBy(desc(notes.createdAt))
    .limit(limit)
    .all();
}

export function searchNotes(query: string, limit = 10) {
  return getDb()
    .select()
    .from(notes)
    .where(like(notes.content, `%${query}%`))
    .orderBy(desc(notes.createdAt))
    .limit(limit)
    .all();
}
