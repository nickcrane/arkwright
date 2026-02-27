import * as notesDb from "../../db/queries/notes.queries.js";
import type { ToolDefinition } from "../../agent/types.js";

export const notesTools: ToolDefinition[] = [
  {
    name: "notes_write",
    description: "Save a note to persistent storage. Use this to remember decisions, observations, and important information.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["supplier", "pricing", "customer", "strategy", "issue", "general"],
          description: "Note category",
        },
        title: { type: "string", description: "Short descriptive title" },
        content: { type: "string", description: "Full note content" },
        relatedEntityType: {
          type: "string",
          enum: ["order", "product", "customer"],
          description: "Type of related entity (optional)",
        },
        relatedEntityId: {
          type: "string",
          description: "ID of the related entity (optional)",
        },
      },
      required: ["category", "title", "content"],
    },
    execute: async (input) =>
      notesDb.createNote({
        category: input.category as string,
        title: input.title as string,
        content: input.content as string,
        relatedEntityType: input.relatedEntityType as string | undefined,
        relatedEntityId: input.relatedEntityId as string | undefined,
      }),
  },
  {
    name: "notes_read",
    description: "Read notes by category or search query. Use this to recall past decisions and context.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["supplier", "pricing", "customer", "strategy", "issue", "general"],
          description: "Filter by category",
        },
        search: { type: "string", description: "Search notes content" },
        limit: { type: "number", description: "Max notes to return (default 10)" },
      },
    },
    execute: async (input) => {
      if (input.search) {
        return notesDb.searchNotes(
          input.search as string,
          (input.limit as number) || 10
        );
      }
      if (input.category) {
        return notesDb.getNotesByCategory(
          input.category as string,
          (input.limit as number) || 10
        );
      }
      return notesDb.getNotesByCategory("general", (input.limit as number) || 10);
    },
  },
  {
    name: "notes_update",
    description: "Update an existing note's content",
    input_schema: {
      type: "object",
      properties: {
        noteId: { type: "number", description: "The note ID to update" },
        content: { type: "string", description: "New content" },
      },
      required: ["noteId", "content"],
    },
    execute: async (input) =>
      notesDb.updateNote(input.noteId as number, input.content as string),
  },
];
